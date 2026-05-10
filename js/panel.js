// js/panel.js — Panel klienta + Panel admina
// Wymaga: firebase-config.js, auth.js, orders.js załadowanych wcześniej

// ══════════════════════════════════════
// HELPERS
// ══════════════════════════════════════
function $(id) {
  return document.getElementById(id);
}
function show(id) {
  const el = $(id);
  if (el) el.style.display = "";
}
function hide(id) {
  const el = $(id);
  if (el) el.style.display = "none";
}
function val(id) {
  const el = $(id);
  return el ? el.value.trim() : "";
}

function setErr(id, msg) {
  const el = $(id);
  if (!el) return;
  el.textContent = msg;
  setTimeout(() => {
    el.textContent = "";
  }, 4500);
}

function toast(msg, type = "ok") {
  const t = document.createElement("div");
  t.className = "toast" + (type === "err" ? " toast-err" : "");
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add("show"), 10);
  setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => t.remove(), 400);
  }, 3200);
}

function confirm2(msg) {
  return window.confirm(msg);
}

// ══════════════════════════════════════
// AUTH STATE
// ══════════════════════════════════════
let currentUser = null;
let currentRole = null;

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    show("authScreen");
    hide("panelScreen");
    if (window.location.hash === "#register") switchTab("register");
    return;
  }

  const banned = await isUserBanned(user.uid);
  if (banned) {
    auth.signOut();
    alert("Twoje konto zostało zablokowane. Skontaktuj się z administracją.");
    return;
  }

  currentUser = user;
  currentRole = await getUserRole(user.uid);

  hide("authScreen");
  show("panelScreen");
  $("userGreet").textContent = `Cześć, ${user.displayName || user.email} 👋`;

  if (currentRole === "admin") {
    show("adminPanel");
    hide("clientPanel");
    initAdminPanel();
  } else {
    show("clientPanel");
    hide("adminPanel");
    loadClientOrders();
  }
});

// ══════════════════════════════════════
// AUTH BUTTONS
// ══════════════════════════════════════
function switchTab(tab) {
  $("loginForm").style.display = tab === "login" ? "block" : "none";
  $("registerForm").style.display = tab === "register" ? "block" : "none";
  $("tabLogin").classList.toggle("active", tab === "login");
  $("tabRegister").classList.toggle("active", tab === "register");
}

$("tabLogin").addEventListener("click", () => switchTab("login"));
$("tabRegister").addEventListener("click", () => switchTab("register"));

$("loginBtn").addEventListener("click", async () => {
  const email = val("l-email"),
    pass = val("l-pass");
  if (!email || !pass) return setErr("loginErr", "Wypełnij wszystkie pola.");
  try {
    await loginUser(email, pass);
  } catch (e) {
    setErr("loginErr", authErr(e.code));
  }
});

$("registerBtn").addEventListener("click", async () => {
  const name = val("r-name"),
    email = val("r-email"),
    pass = val("r-pass");
  if (!name || !email || !pass)
    return setErr("registerErr", "Wypełnij wszystkie pola.");
  if (pass.length < 6)
    return setErr("registerErr", "Hasło musi mieć min. 6 znaków.");
  try {
    await registerUser(name, email, pass);
  } catch (e) {
    setErr("registerErr", authErr(e.code));
  }
});

$("googleBtn").addEventListener("click", async () => {
  try {
    await loginWithGoogle();
  } catch (e) {
    if (
      e.code !== "auth/popup-closed-by-user" &&
      e.code !== "auth/cancelled-popup-request"
    ) {
      setErr("loginErr", authErr(e.code));
    }
  }
});

$("logoutBtn").addEventListener("click", () => logoutUser());

// ══════════════════════════════════════
// CLIENT PANEL
// ══════════════════════════════════════
async function loadClientOrders() {
  const container = $("clientOrders");
  container.innerHTML = `<div class="loading-spinner">⏳ Ładowanie zamówień...</div>`;
  try {
    const orders = await getClientOrders(currentUser.uid);
    if (!orders.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div style="font-size:3rem">📋</div>
          <h3>Brak zamówień</h3>
          <p>Nie masz jeszcze żadnych zamówień.<br>Wróć na stronę główną i wypełnij formularz wyceny!</p>
          <a href="index.html"><button class="btn-primary" style="margin-top:20px">Wyceń projekt →</button></a>
        </div>`;
      return;
    }
    container.innerHTML = orders.map(clientOrderCard).join("");
    container.querySelectorAll("[data-accept]").forEach((btn) => {
      btn.addEventListener("click", () => doAccept(btn.dataset.accept));
    });
    container.querySelectorAll("[data-reject]").forEach((btn) => {
      btn.addEventListener("click", () => doReject(btn.dataset.reject));
    });
    container.querySelectorAll("[data-pay]").forEach((btn) => {
      btn.addEventListener("click", () =>
        goToPayment(btn.dataset.pay, btn.dataset.price),
      );
    });
  } catch (e) {
    container.innerHTML = `<div class="empty-state"><p>Błąd ładowania: ${e.message}</p></div>`;
  }
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
          <button class="btn-accept" data-accept="${o.id}">✅ Akceptuję wycenę</button>
          <button class="btn-reject" data-reject="${o.id}">❌ Odrzucam ofertę</button>
        </div>
      </div>`;
  }

  if (o.status === "PAYMENT") {
    action = `
      <div class="payment-block">
        <p>✅ Zaakceptowałeś wycenę: <strong>${o.officialPrice}</strong></p>
        <p style="color:rgba(240,240,240,.5);font-size:.85rem;margin-top:4px">Kliknij poniżej, aby przejść do płatności.</p>
        <button class="btn-primary" style="margin-top:12px" data-pay="${o.id}" data-price="${o.officialPrice}">
          💳 Przejdź do płatności
        </button>
      </div>`;
  }

  if (o.status === "DELIVERED") {
    action = `
      <div class="delivered-block">
        <p>🎉 Twoja strona jest gotowa!</p>
        ${o.deliveredUrl ? `<a href="${o.deliveredUrl}"   target="_blank"><button class="btn-primary"   style="margin-top:10px">🌐 Zobacz stronę</button></a>` : ""}
        ${o.deliveredFiles ? `<a href="${o.deliveredFiles}" target="_blank"><button class="btn-secondary" style="margin-top:8px">📁 Pobierz pliki</button></a>` : ""}
      </div>`;
  }

  return `
    <div class="order-card">
      <div class="order-card-head">
        <div>
          <div class="order-type">${TYPE_MAP[o.projekt] || o.projekt || "Projekt"}</div>
          <div class="order-industry">${o.branza || "—"}</div>
        </div>
        <div class="order-status" style="background:${st.color}22;color:${st.color};border-color:${st.color}44">
          ${st.icon} ${st.label}
        </div>
      </div>
      <div class="order-meta">
        <span>📅 ${date}</span>
        <span>🤖 Wycena AI: <strong>${o.aiQuote || "—"}</strong></span>
        ${o.officialPrice && o.status !== "PRICED" ? `<span>💰 Cena: <strong>${o.officialPrice}</strong></span>` : ""}
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

async function doAccept(id) {
  if (!confirm2("Czy na pewno akceptujesz ofertę?")) return;
  await updateOrder(id, { status: "PAYMENT" });
  toast("✅ Oferta zaakceptowana! Przejdź do płatności.");
  loadClientOrders();
}
async function doReject(id) {
  if (!confirm2("Czy na pewno chcesz odrzucić tę ofertę?")) return;
  await updateOrder(id, { status: "REJECTED" });
  toast("Oferta odrzucona.", "err");
  loadClientOrders();
}
function goToPayment(orderId, price) {
  window.location.href = `payment.html?order=${orderId}&price=${encodeURIComponent(price)}`;
}

// ══════════════════════════════════════
// ADMIN PANEL
// ══════════════════════════════════════
let allOrders = [];
let allUsers = [];
let adminTab = "orders"; // "orders" | "users"

function initAdminPanel() {
  renderAdminTabs();
  loadAdminData();
}

function renderAdminTabs() {
  const tabBar = $("adminTabBar");
  if (!tabBar) return;
  tabBar.innerHTML = `
    <button class="filter-btn ${adminTab === "orders" ? "active" : ""}" id="aTabOrders">📋 Zamówienia</button>
    <button class="filter-btn ${adminTab === "users" ? "active" : ""}" id="aTabUsers" >👥 Użytkownicy</button>`;
  $("aTabOrders").addEventListener("click", () => {
    adminTab = "orders";
    loadAdminData();
    renderAdminTabs();
  });
  $("aTabUsers").addEventListener("click", () => {
    adminTab = "users";
    loadAdminData();
    renderAdminTabs();
  });
}

async function loadAdminData() {
  if (adminTab === "orders") await loadAdminOrders();
  else await loadAdminUsers();
}

// ── ORDERS ──
async function loadAdminOrders(filter) {
  filter = filter || "ALL";
  const container = $("adminOrders");
  if (!container) return;
  container.innerHTML = `<div class="loading-spinner">⏳ Ładowanie zamówień...</div>`;

  try {
    allOrders = await getAllOrders();
    renderAdminStats(allOrders);
    renderAdminOrders(filter);
  } catch (e) {
    container.innerHTML = `<div class="empty-state"><p>Błąd: ${e.message}</p></div>`;
  }
}

function renderAdminStats(orders) {
  const counts = {};
  Object.keys(STATUSES).forEach((k) => (counts[k] = 0));
  orders.forEach((o) => {
    if (counts[o.status] !== undefined) counts[o.status]++;
  });

  const revenue = orders
    .filter(
      (o) =>
        o.status === "PAYMENT" ||
        o.status === "ACCEPTED" ||
        o.status === "DELIVERED",
    )
    .reduce((sum, o) => {
      const match = o.officialPrice
        ? o.officialPrice.replace(/\s/g, "").match(/(\d+)/)
        : null;
      return sum + (match ? +match[1] : 0);
    }, 0);

  $("adminStats").innerHTML = `
    <div class="admin-stat-card">
      <div class="admin-stat-num" style="color:#a855f7">${orders.length}</div>
      <div class="admin-stat-label">📋 Wszystkich zamówień</div>
    </div>
    <div class="admin-stat-card">
      <div class="admin-stat-num" style="color:#f59e0b">${counts.PENDING}</div>
      <div class="admin-stat-label">⏳ Do wyceny</div>
    </div>
    <div class="admin-stat-card">
      <div class="admin-stat-num" style="color:#3b82f6">${counts.ACCEPTED}</div>
      <div class="admin-stat-label">🔨 W realizacji</div>
    </div>
    <div class="admin-stat-card">
      <div class="admin-stat-num" style="color:#22c55e">${counts.DELIVERED}</div>
      <div class="admin-stat-label">✅ Dostarczone</div>
    </div>
    <div class="admin-stat-card">
      <div class="admin-stat-num" style="color:#22c55e;font-size:1.3rem">${revenue.toLocaleString("pl-PL")} zł</div>
      <div class="admin-stat-label">💰 Przychód (akceptacje)</div>
    </div>`;
}

function renderAdminOrders(filter) {
  const list =
    filter === "ALL" ? allOrders : allOrders.filter((o) => o.status === filter);

  const container = $("adminOrders");
  if (!list.length) {
    container.innerHTML = `<div class="empty-state"><p>Brak zamówień w tej kategorii.</p></div>`;
    return;
  }
  container.innerHTML = list.map(adminOrderCard).join("");
  container.querySelectorAll("[data-order-id]").forEach((card) => {
    card.addEventListener("click", () => openAdminOrder(card.dataset.orderId));
  });
}

document.querySelectorAll(".filter-btn[data-filter]").forEach((btn) => {
  btn.addEventListener("click", function () {
    document
      .querySelectorAll(".filter-btn[data-filter]")
      .forEach((b) => b.classList.remove("active"));
    this.classList.add("active");
    renderAdminOrders(this.dataset.filter);
  });
});

function adminOrderCard(o) {
  const st = STATUSES[o.status] || STATUSES.PENDING;
  return `
    <div class="order-card admin-order-card" data-order-id="${o.id}">
      <div class="order-card-head">
        <div>
          <div class="order-type">${TYPE_MAP[o.projekt] || o.projekt || "Projekt"}</div>
          <div class="order-industry">👤 ${o.userName || "Gość"} · ${o.userEmail || "—"}</div>
        </div>
        <div class="order-status" style="background:${st.color}22;color:${st.color};border-color:${st.color}44">
          ${st.icon} ${st.label}
        </div>
      </div>
      <div class="order-meta">
        <span>📅 ${tsToDate(o.createdAt)}</span>
        <span>🤖 AI: <strong>${o.aiQuote || "—"}</strong></span>
        ${o.officialPrice ? `<span>💰 <strong>${o.officialPrice}</strong></span>` : ""}
        <span style="color:rgba(240,240,240,.35)">Branża: ${o.branza || "—"}</span>
      </div>
      <div class="admin-card-footer">
        <span style="font-size:.78rem;color:rgba(240,240,240,.3)">Kliknij aby zarządzać →</span>
      </div>
    </div>`;
}

function openAdminOrder(id) {
  const o = allOrders.find((x) => x.id === id);
  if (!o) return;
  const st = STATUSES[o.status] || STATUSES.PENDING;

  $("orderModalContent").innerHTML = `
    <button class="modal-close" id="closeOrderBtn">✕</button>
    <h2>${TYPE_MAP[o.projekt] || "Zamówienie"}</h2>
    <p class="modal-sub">ID: <code style="font-size:.8rem;color:rgba(255,255,255,.4)">${o.id}</code></p>

    <div class="modal-section">
      <h4>👤 Klient</h4>
      <p>${o.userName || "—"}</p>
      <p style="color:rgba(240,240,240,.45)">${o.userEmail || "—"}</p>
    </div>

    <div class="modal-section">
      <h4>📋 Szczegóły zamówienia</h4>
      <p>Rodzaj: <strong>${TYPE_MAP[o.projekt] || o.projekt}</strong></p>
      <p>Branża: <strong>${o.branza || "—"}</strong></p>
      <p>Funkcje: <strong>${o.features || "—"}</strong></p>
      ${o.opis ? `<p style="margin-top:8px;color:rgba(240,240,240,.55)">${o.opis}</p>` : ""}
      <p style="margin-top:8px">Wycena AI: <strong style="color:#a855f7">${o.aiQuote || "—"}</strong></p>
      <p>Data: ${tsToDate(o.createdAt)}</p>
    </div>

    <div class="modal-section">
      <h4>📊 Status: <span style="color:${st.color}">${st.icon} ${st.label}</span></h4>
      <div class="form-group" style="margin-top:12px">
        <label>Zmień status</label>
        <select id="m-status">
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
      <h4>💰 Oficjalna wycena dla klienta</h4>
      <div class="form-group">
        <label>Cena (np. "1 200 zł")</label>
        <input type="text" id="m-price" placeholder="np. 1 200 zł" value="${o.officialPrice || ""}"/>
      </div>
      <div class="form-group">
        <label>Notatka dla klienta</label>
        <textarea id="m-note" rows="2" placeholder="np. Cena zawiera hosting na rok...">${o.clientNote || ""}</textarea>
      </div>
    </div>

    <div class="modal-section" id="deliveredSection"
      style="${o.status === "ACCEPTED" || o.status === "DELIVERED" ? "" : "display:none"}">
      <h4>✅ Dane dostarczenia</h4>
      <div class="form-group">
        <label>URL gotowej strony</label>
        <input type="text" id="m-url"   placeholder="https://klient.pl" value="${o.deliveredUrl || ""}"/>
      </div>
      <div class="form-group">
        <label>Link do plików (Drive, Dropbox…)</label>
        <input type="text" id="m-files" placeholder="https://drive.google.com/..." value="${o.deliveredFiles || ""}"/>
      </div>
    </div>

    <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap">
      <button class="btn-primary" style="flex:1" id="saveOrderBtn">💾 Zapisz zmiany</button>
      <button class="btn-reject"                 id="deleteOrderBtn">🗑 Usuń zamówienie</button>
    </div>`;

  $("orderModal").classList.add("open");

  $("closeOrderBtn").addEventListener("click", closeOrderModal);
  $("deleteOrderBtn").addEventListener("click", () => adminDeleteOrder(o.id));
  $("saveOrderBtn").addEventListener("click", () => saveAdminOrder(o.id));

  $("m-status").addEventListener("change", function () {
    const sec = $("deliveredSection");
    if (sec)
      sec.style.display =
        this.value === "ACCEPTED" || this.value === "DELIVERED" ? "" : "none";
  });
}

async function saveAdminOrder(id) {
  const price = $("m-price") ? $("m-price").value.trim() : "";
  const note = $("m-note") ? $("m-note").value.trim() : "";
  let status = $("m-status") ? $("m-status").value : "";
  const url = $("m-url") ? $("m-url").value.trim() : "";
  const files = $("m-files") ? $("m-files").value.trim() : "";

  try {
    const data = { status };
    if (price) {
      data.officialPrice = price;
      data.clientNote = note;
    }
    if (url) data.deliveredUrl = url;
    if (files) data.deliveredFiles = files;
    // Jeśli admin wpisał cenę i status nie jest końcowy → automatycznie PRICED
    if (
      price &&
      status !== "DELIVERED" &&
      status !== "REJECTED" &&
      status !== "PAYMENT" &&
      status !== "ACCEPTED"
    ) {
      data.status = "PRICED";
    }
    await updateOrder(id, data);
    closeOrderModal();
    await loadAdminOrders();
    toast("✅ Zmiany zapisane!");
  } catch (e) {
    toast("❌ Błąd: " + e.message, "err");
  }
}

async function adminDeleteOrder(id) {
  if (
    !confirm2(
      "Czy na pewno chcesz usunąć to zamówienie? Tego nie można cofnąć.",
    )
  )
    return;
  await deleteOrder(id);
  closeOrderModal();
  await loadAdminOrders();
  toast("🗑 Zamówienie usunięte.");
}

function closeOrderModal() {
  $("orderModal").classList.remove("open");
}
$("orderModal").addEventListener("click", (e) => {
  if (e.target === $("orderModal")) closeOrderModal();
});

// ── USERS ──
async function loadAdminUsers() {
  const container = $("adminOrders"); // ten sam kontener, inne zakładki
  container.innerHTML = `<div class="loading-spinner">⏳ Ładowanie użytkowników...</div>`;
  try {
    allUsers = await getAllUsers();
    renderAdminUsers();
  } catch (e) {
    container.innerHTML = `<div class="empty-state"><p>Błąd: ${e.message}</p></div>`;
  }
}

function renderAdminUsers() {
  const container = $("adminOrders");
  if (!allUsers.length) {
    container.innerHTML = `<div class="empty-state"><p>Brak użytkowników.</p></div>`;
    return;
  }

  container.innerHTML = `
    <div class="admin-stats" style="margin-bottom:20px">
      <div class="admin-stat-card">
        <div class="admin-stat-num" style="color:#a855f7">${allUsers.length}</div>
        <div class="admin-stat-label">👥 Łącznie użytkowników</div>
      </div>
      <div class="admin-stat-card">
        <div class="admin-stat-num" style="color:#ef4444">${allUsers.filter((u) => u.banned).length}</div>
        <div class="admin-stat-label">🚫 Zbanowanych</div>
      </div>
    </div>
    ${allUsers.map(userCard).join("")}`;

  container.querySelectorAll("[data-ban]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleBan(btn.dataset.ban, btn.dataset.banned === "true");
    });
  });
  container.querySelectorAll("[data-del-user]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      adminDeleteUser(btn.dataset.delUser);
    });
  });
}

function userCard(u) {
  const isBanned = u.banned === true;
  const isAdmin = u.role === "admin";
  return `
    <div class="order-card" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
      <div>
        <div style="font-weight:700;font-size:.95rem">${u.name || "—"}
          ${isAdmin ? `<span style="color:#a855f7;font-size:.72rem;margin-left:6px">🛡 ADMIN</span>` : ""}
          ${isBanned ? `<span style="color:#ef4444;font-size:.72rem;margin-left:6px">🚫 ZBANOWANY</span>` : ""}
        </div>
        <div style="font-size:.82rem;color:rgba(240,240,240,.45);margin-top:3px">${u.email || "—"}</div>
        <div style="font-size:.78rem;color:rgba(240,240,240,.3);margin-top:2px">Zarejestrowany: ${tsToDate(u.createdAt)}</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${
          !isAdmin
            ? `
          <button class="filter-btn ${isBanned ? "" : "active"}" data-ban="${u.uid}" data-banned="${isBanned}">
            ${isBanned ? "✅ Odblokuj" : "🚫 Zbanuj"}
          </button>
          <button class="btn-reject" style="padding:7px 14px;font-size:.8rem" data-del-user="${u.uid}">🗑 Usuń</button>
        `
            : ""
        }
      </div>
    </div>`;
}

async function toggleBan(uid, isBanned) {
  const action = isBanned ? "odblokować" : "zbanować";
  if (!confirm2(`Czy na pewno chcesz ${action} tego użytkownika?`)) return;
  await setBanned(uid, !isBanned);
  toast(isBanned ? "✅ Użytkownik odblokowany." : "🚫 Użytkownik zbanowany.");
  await loadAdminUsers();
}

async function adminDeleteUser(uid) {
  if (
    !confirm2(
      "Czy na pewno chcesz usunąć tego użytkownika? Jego zamówienia pozostaną.",
    )
  )
    return;
  await deleteUserDoc(uid);
  toast("🗑 Użytkownik usunięty.");
  await loadAdminUsers();
}
