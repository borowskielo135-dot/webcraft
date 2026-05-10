// js/panel.js
import {
  onAuth,
  login,
  register,
  loginWithGoogle,
  logout,
  getUserData,
} from "./auth.js";
import {
  getClientOrders,
  getAllOrders,
  setOfficialPrice,
  acceptPrice,
  rejectPrice,
  setStatus,
  markDelivered,
  STATUSES,
} from "./orders.js";

let currentUser = null;
let currentRole = null;
let allOrdersCache = [];

const TYPE_MAP = {
  landing: "Landing Page",
  firmowa: "Strona Firmowa",
  sklep: "Sklep Internetowy",
  redesign: "Redesign",
  aplikacja: "Aplikacja Webowa",
};

// ═══════════════════════════════════════
// AUTH STATE
// ═══════════════════════════════════════
onAuth(async (user) => {
  if (!user) {
    show("authScreen");
    hide("panelScreen");
    return;
  }
  currentUser = user;
  const data = await getUserData(user.uid);
  currentRole = data?.role || "client";

  hide("authScreen");
  show("panelScreen");
  document.getElementById("userGreet").textContent =
    `Cześć, ${user.displayName || user.email} 👋`;

  if (currentRole === "admin") {
    show("adminPanel");
    hide("clientPanel");
    loadAdminOrders();
  } else {
    show("clientPanel");
    hide("adminPanel");
    loadClientOrders();
  }
});

// ═══════════════════════════════════════
// AUTH ACTIONS
// ═══════════════════════════════════════
window.switchTab = (tab) => {
  document.getElementById("loginForm").style.display =
    tab === "login" ? "block" : "none";
  document.getElementById("registerForm").style.display =
    tab === "register" ? "block" : "none";
  document
    .querySelectorAll(".auth-tab")
    .forEach((b, i) =>
      b.classList.toggle("active", tab === "login" ? i === 0 : i === 1),
    );
};

window.doLogin = async () => {
  const email = val("l-email"),
    pass = val("l-pass");
  if (!email || !pass) return setErr("loginErr", "Wypełnij wszystkie pola.");
  try {
    await login(email, pass);
  } catch (e) {
    setErr("loginErr", friendlyError(e.code));
  }
};

window.doRegister = async () => {
  const name = val("r-name");
  const email = val("r-email");
  const pass = val("r-pass");
  if (!name || !email || !pass)
    return setErr("registerErr", "Wypełnij wszystkie pola.");
  if (pass.length < 6)
    return setErr("registerErr", "Hasło musi mieć min. 6 znaków.");
  try {
    await register(name, email, pass);
  } catch (e) {
    setErr("registerErr", friendlyError(e.code));
  }
};

window.doGoogle = async () => {
  try {
    await loginWithGoogle();
  } catch (e) {
    setErr("loginErr", "Błąd logowania Google. Spróbuj ponownie.");
  }
};

window.doLogout = async () => {
  await logout();
};

// ═══════════════════════════════════════
// CLIENT PANEL
// ═══════════════════════════════════════
async function loadClientOrders() {
  const container = document.getElementById("clientOrders");
  container.innerHTML = `<div class="loading-spinner">Ładowanie zamówień...</div>`;
  const orders = await getClientOrders(currentUser.uid);

  if (!orders.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div style="font-size:3rem">📋</div>
        <h3>Brak zamówień</h3>
        <p>Nie masz jeszcze żadnych zamówień.<br>Wróć na stronę główną i wypełnij formularz wyceny!</p>
        <a href="index.html">
          <button class="btn-primary" style="margin-top:20px">Wyceń projekt →</button>
        </a>
      </div>`;
    return;
  }
  container.innerHTML = orders.map(clientOrderCard).join("");
}

function clientOrderCard(o) {
  const st = STATUSES[o.status] || STATUSES.PENDING;
  const date = tsToDate(o.createdAt);

  let action = "";

  if (o.status === "PRICED" && o.officialPrice) {
    action = `
      <div class="price-reveal">
        <div class="price-reveal-label">💰 Oficjalna wycena od WebCraft</div>
        <div class="price-reveal-amount">${o.officialPrice}</div>
        ${o.clientNote ? `<p class="price-note">${o.clientNote}</p>` : ""}
        <div class="price-actions">
          <button class="btn-accept" onclick="doAccept('${o.id}')">
            ✅ Akceptuję — przejdź do płatności
          </button>
          <button class="btn-reject" onclick="doReject('${o.id}')">
            ❌ Odrzucam ofertę
          </button>
        </div>
      </div>`;
  }

  if (o.status === "PAYMENT") {
    action = `
      <div class="payment-block">
        <p>💳 Zaakceptowałeś wycenę: <strong>${o.officialPrice}</strong></p>
        <p style="color:rgba(240,240,240,.5);font-size:.85rem;margin-top:6px">
          Płatność zostanie wkrótce aktywowana. Skontaktujemy się z Tobą.
        </p>
        <button class="btn-primary" style="margin-top:12px;opacity:.5;cursor:not-allowed" disabled>
          Przejdź do płatności (wkrótce)
        </button>
      </div>`;
  }

  if (o.status === "DELIVERED") {
    action = `
      <div class="delivered-block">
        <p>🎉 Twoja strona jest gotowa!</p>
        ${
          o.deliveredUrl
            ? `<a href="${o.deliveredUrl}" target="_blank">
               <button class="btn-primary" style="margin-top:10px">🌐 Zobacz stronę</button>
             </a>`
            : ""
        }
        ${
          o.deliveredFiles
            ? `<a href="${o.deliveredFiles}" target="_blank">
               <button class="btn-secondary" style="margin-top:8px">📁 Pobierz pliki</button>
             </a>`
            : ""
        }
      </div>`;
  }

  return `
    <div class="order-card">
      <div class="order-card-head">
        <div>
          <div class="order-type">${TYPE_MAP[o.projekt] || o.projekt || "Projekt"}</div>
          <div class="order-industry">${o.branza || "—"}</div>
        </div>
        <div class="order-status"
             style="background:${st.color}22;color:${st.color};border-color:${st.color}44">
          ${st.icon} ${st.label}
        </div>
      </div>
      <div class="order-meta">
        <span>📅 ${date}</span>
        <span>🤖 Wycena AI: <strong>${o.aiQuote || "—"}</strong></span>
        ${
          o.officialPrice && o.status !== "PRICED"
            ? `<span>💰 Twoja cena: <strong>${o.officialPrice}</strong></span>`
            : ""
        }
      </div>
      <div class="order-progress">${progressBar(o.status)}</div>
      ${action}
    </div>`;
}

function progressBar(status) {
  const steps = ["PENDING", "PRICED", "PAYMENT", "ACCEPTED", "DELIVERED"];
  const idx = steps.indexOf(status);
  return `<div class="progress-steps">
    ${steps
      .map((s, i) => {
        const st = STATUSES[s];
        const done = i < idx && status !== "REJECTED";
        const active = i === idx;
        return `
        <div class="progress-step ${done ? "done" : ""} ${active ? "active" : ""}">
          <div class="progress-dot">${done ? "✓" : st.icon}</div>
          <div class="progress-label">${st.label}</div>
        </div>
        ${i < steps.length - 1 ? '<div class="progress-line"></div>' : ""}`;
      })
      .join("")}
  </div>`;
}

window.doAccept = async (id) => {
  if (!confirm("Czy na pewno akceptujesz ofertę?")) return;
  await acceptPrice(id);
  loadClientOrders();
};

window.doReject = async (id) => {
  if (!confirm("Czy na pewno chcesz odrzucić tę ofertę?")) return;
  await rejectPrice(id);
  loadClientOrders();
};

// ═══════════════════════════════════════
// ADMIN PANEL
// ═══════════════════════════════════════
async function loadAdminOrders(filter = "ALL") {
  document.getElementById("adminOrders").innerHTML =
    `<div class="loading-spinner">Ładowanie zamówień...</div>`;
  allOrdersCache = await getAllOrders();
  renderAdminStats(allOrdersCache);
  renderAdminOrders(filter);
}

function renderAdminStats(orders) {
  const counts = {};
  Object.keys(STATUSES).forEach((k) => (counts[k] = 0));
  orders.forEach((o) => {
    if (counts[o.status] !== undefined) counts[o.status]++;
  });
  document.getElementById("adminStats").innerHTML = Object.entries(STATUSES)
    .map(
      ([k, s]) => `
      <div class="admin-stat-card">
        <div class="admin-stat-num" style="color:${s.color}">${counts[k]}</div>
        <div class="admin-stat-label">${s.icon} ${s.label}</div>
      </div>`,
    )
    .join("");
}

function renderAdminOrders(filter) {
  const list =
    filter === "ALL"
      ? allOrdersCache
      : allOrdersCache.filter((o) => o.status === filter);

  const container = document.getElementById("adminOrders");
  if (!list.length) {
    container.innerHTML = `<div class="empty-state"><p>Brak zamówień w tej kategorii.</p></div>`;
    return;
  }
  container.innerHTML = list.map(adminOrderCard).join("");
}

window.filterOrders = (filter, btn) => {
  document
    .querySelectorAll(".filter-btn")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  renderAdminOrders(filter);
};

function adminOrderCard(o) {
  const st = STATUSES[o.status] || STATUSES.PENDING;
  const date = tsToDate(o.createdAt);
  return `
    <div class="order-card admin-order-card" onclick="openAdminOrder('${o.id}')">
      <div class="order-card-head">
        <div>
          <div class="order-type">${TYPE_MAP[o.projekt] || o.projekt || "Projekt"}</div>
          <div class="order-industry">
            👤 ${o.userName || "Gość"} · ${o.userEmail || "—"}
          </div>
        </div>
        <div class="order-status"
             style="background:${st.color}22;color:${st.color};border-color:${st.color}44">
          ${st.icon} ${st.label}
        </div>
      </div>
      <div class="order-meta">
        <span>📅 ${date}</span>
        <span>🤖 AI: <strong>${o.aiQuote || "—"}</strong></span>
        ${o.officialPrice ? `<span>💰 Twoja cena: <strong>${o.officialPrice}</strong></span>` : ""}
        <span style="color:rgba(240,240,240,.35)">Branża: ${o.branza || "—"}</span>
      </div>
      <div class="admin-card-footer">
        <span style="font-size:.78rem;color:rgba(240,240,240,.3)">Kliknij aby zarządzać →</span>
      </div>
    </div>`;
}

window.openAdminOrder = (id) => {
  const o = allOrdersCache.find((x) => x.id === id);
  if (!o) return;
  const st = STATUSES[o.status] || STATUSES.PENDING;

  document.getElementById("orderModalContent").innerHTML = `
    <button class="modal-close" onclick="closeOrderModal()">✕</button>
    <h2>${TYPE_MAP[o.projekt] || "Zamówienie"}</h2>
    <p class="modal-sub">ID: ${o.id}</p>

    <div class="modal-section">
      <h4>👤 Klient</h4>
      <p>${o.userName || "—"} · ${o.userEmail || "—"}</p>
    </div>

    <div class="modal-section">
      <h4>📋 Szczegóły</h4>
      <p>Branża: <strong>${o.branza || "—"}</strong></p>
      <p>Funkcje: <strong>${o.features || "—"}</strong></p>
      ${o.opis ? `<p>Opis: ${o.opis}</p>` : ""}
      <p>Wycena AI: <strong>${o.aiQuote || "—"}</strong></p>
    </div>

    <div class="modal-section">
      <h4>📊 Status: <span style="color:${st.color}">${st.icon} ${st.label}</span></h4>
      <div class="form-group" style="margin-top:12px">
        <label>Zmień status</label>
        <select id="m-status" onchange="previewStatus(this.value)">
          ${Object.entries(STATUSES)
            .map(
              ([k, s]) =>
                `<option value="${k}" ${o.status === k ? "selected" : ""}>${s.icon} ${s.label}</option>`,
            )
            .join("")}
        </select>
      </div>
    </div>

    <div class="modal-section">
      <h4>💰 Oficjalna cena dla klienta</h4>
      <div class="form-group">
        <label>Cena (np. "1 200 zł" lub "800–1 500 zł")</label>
        <input type="text" id="m-price" placeholder="np. 1 200 zł" value="${o.officialPrice || ""}"/>
      </div>
      <div class="form-group">
        <label>Notatka dla klienta</label>
        <textarea id="m-note" rows="2"
          placeholder="np. Cena zawiera hosting na rok...">${o.clientNote || ""}</textarea>
      </div>
    </div>

    <div class="modal-section" id="deliveredSection"
         style="${o.status === "ACCEPTED" || o.status === "DELIVERED" ? "" : "display:none"}">
      <h4>✅ Dane dostarczenia</h4>
      <div class="form-group">
        <label>URL gotowej strony</label>
        <input type="text" id="m-url" placeholder="https://klient.pl"
               value="${o.deliveredUrl || ""}"/>
      </div>
      <div class="form-group">
        <label>Link do plików (np. Google Drive)</label>
        <input type="text" id="m-files" placeholder="https://drive.google.com/..."
               value="${o.deliveredFiles || ""}"/>
      </div>
    </div>

    <button class="btn-primary" style="width:100%;margin-top:8px"
            onclick="saveAdminOrder('${o.id}')">
      💾 Zapisz zmiany
    </button>`;

  document.getElementById("orderModal").classList.add("open");
};

window.previewStatus = (val) => {
  const sec = document.getElementById("deliveredSection");
  if (sec)
    sec.style.display =
      val === "ACCEPTED" || val === "DELIVERED" ? "block" : "none";
};

window.saveAdminOrder = async (id) => {
  const price = document.getElementById("m-price")?.value.trim();
  const note = document.getElementById("m-note")?.value.trim();
  const status = document.getElementById("m-status")?.value;
  const url = document.getElementById("m-url")?.value.trim();
  const files = document.getElementById("m-files")?.value.trim();
  try {
    if (price) await setOfficialPrice(id, price, note);
    if (status === "DELIVERED") await markDelivered(id, url || "", files || "");
    else await setStatus(id, status);
    closeOrderModal();
    await loadAdminOrders();
    toast("✅ Zmiany zapisane!");
  } catch (e) {
    toast("❌ Błąd: " + e.message);
  }
};

window.closeOrderModal = (e) => {
  if (e && e.target !== document.getElementById("orderModal")) return;
  document.getElementById("orderModal").classList.remove("open");
};

// ═══════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════
function val(id) {
  return document.getElementById(id)?.value.trim() || "";
}
function show(id) {
  document.getElementById(id).style.display = "";
}
function hide(id) {
  document.getElementById(id).style.display = "none";
}

function setErr(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  setTimeout(() => (el.textContent = ""), 4000);
}

function tsToDate(ts) {
  if (!ts) return "—";
  if (ts.toDate) return ts.toDate().toLocaleDateString("pl-PL");
  return "—";
}

function friendlyError(code) {
  const map = {
    "auth/user-not-found": "Nie znaleziono konta z tym e-mailem.",
    "auth/wrong-password": "Błędne hasło.",
    "auth/invalid-credential": "Błędny e-mail lub hasło.",
    "auth/email-already-in-use": "Ten e-mail jest już zarejestrowany.",
    "auth/weak-password": "Hasło jest za słabe (min. 6 znaków).",
    "auth/invalid-email": "Nieprawidłowy adres e-mail.",
    "auth/too-many-requests": "Za dużo prób. Spróbuj za chwilę.",
  };
  return map[code] || "Wystąpił błąd. Spróbuj ponownie.";
}

function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add("show"), 10);
  setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => t.remove(), 400);
  }, 3000);
}
