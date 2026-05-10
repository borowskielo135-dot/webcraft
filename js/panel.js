// ============================================================
// js/panel.js  —  Firebase COMPAT (nie moduły!)
// Działa razem z firebase-*-compat.js załadowanymi w panel.html
// ============================================================

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCBu3eAWP9Z5LeDIjPJiH-YpS-xHdctaWw",
  authDomain: "sitely-87531.firebaseapp.com",
  projectId: "sitely-87531",
  storageBucket: "sitely-87531.firebasestorage.app",
  messagingSenderId: "585148571318",
  appId: "1:585148571318:web:335b2c11a672b64b8ad017",
};

const ADMIN_EMAIL = "borowskielo135@gmail.com";

// Inicjalizacja Firebase
firebase.initializeApp(FIREBASE_CONFIG);
const auth = firebase.auth();
const db = firebase.firestore();

// ── Status mapping ──
const STATUSES = {
  PENDING: { label: "Wycena w toku", color: "#f59e0b", icon: "⏳" },
  PRICED: { label: "Czeka na akceptację", color: "#a855f7", icon: "💰" },
  PAYMENT: { label: "Oczekuje na płatność", color: "#f97316", icon: "💳" },
  ACCEPTED: { label: "W realizacji", color: "#3b82f6", icon: "🔨" },
  DELIVERED: { label: "Dostarczone", color: "#22c55e", icon: "✅" },
  REJECTED: { label: "Odrzucone", color: "#ef4444", icon: "❌" },
};

const TYPE_MAP = {
  landing: "Landing Page",
  firmowa: "Strona Firmowa",
  sklep: "Sklep Internetowy",
  redesign: "Redesign",
  aplikacja: "Aplikacja Webowa",
};

let currentUser = null;
let currentRole = null;
let allOrdersCache = [];

// ══════════════════════════════════════
// HELPERS
// ══════════════════════════════════════
function $(id) {
  return document.getElementById(id);
}
function show(id) {
  $(id).style.display = "";
}
function hide(id) {
  $(id).style.display = "none";
}
function val(id) {
  const el = $(id);
  return el ? el.value.trim() : "";
}

function setErr(id, msg) {
  const el = $(id);
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
    "auth/popup-closed-by-user": "Okno zostało zamknięte. Spróbuj ponownie.",
    "auth/cancelled-popup-request": "Anulowano. Spróbuj ponownie.",
  };
  return map[code] || "Wystąpił błąd. Spróbuj ponownie.";
}

function toast(msg) {
  let t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add("show"), 10);
  setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => t.remove(), 400);
  }, 3000);
}

// ══════════════════════════════════════
// AUTH STATE
// ══════════════════════════════════════
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    show("authScreen");
    hide("panelScreen");
    // Jeśli URL zawiera #register — przełącz tab
    if (window.location.hash === "#register") switchTab("register");
    return;
  }
  currentUser = user;

  // pobierz rolę z Firestore
  try {
    const snap = await db.collection("users").doc(user.uid).get();
    currentRole = snap.exists ? snap.data().role || "client" : "client";
  } catch (e) {
    currentRole = "client";
  }

  hide("authScreen");
  show("panelScreen");
  $("userGreet").textContent = `Cześć, ${user.displayName || user.email} 👋`;

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

// ══════════════════════════════════════
// AUTH — przyciski
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
    await auth.signInWithEmailAndPassword(email, pass);
  } catch (e) {
    setErr("loginErr", friendlyError(e.code));
  }
});

$("registerBtn").addEventListener("click", async () => {
  const name = val("r-name");
  const email = val("r-email");
  const pass = val("r-pass");
  if (!name || !email || !pass)
    return setErr("registerErr", "Wypełnij wszystkie pola.");
  if (pass.length < 6)
    return setErr("registerErr", "Hasło musi mieć min. 6 znaków.");
  try {
    const cred = await auth.createUserWithEmailAndPassword(email, pass);
    await cred.user.updateProfile({ displayName: name });
    // utwórz dokument użytkownika w Firestore
    await db
      .collection("users")
      .doc(cred.user.uid)
      .set({
        uid: cred.user.uid,
        name,
        email,
        role: email === ADMIN_EMAIL ? "admin" : "client",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
  } catch (e) {
    setErr("registerErr", friendlyError(e.code));
  }
});

$("googleBtn").addEventListener("click", async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const cred = await auth.signInWithPopup(provider);
    const user = cred.user;
    // utwórz dokument jeśli nie istnieje
    const snap = await db.collection("users").doc(user.uid).get();
    if (!snap.exists) {
      await db
        .collection("users")
        .doc(user.uid)
        .set({
          uid: user.uid,
          name: user.displayName || "Użytkownik",
          email: user.email,
          role: user.email === ADMIN_EMAIL ? "admin" : "client",
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
    }
  } catch (e) {
    setErr("loginErr", friendlyError(e.code));
  }
});

$("logoutBtn").addEventListener("click", () => auth.signOut());

// ══════════════════════════════════════
// CLIENT PANEL
// ══════════════════════════════════════
async function loadClientOrders() {
  const container = $("clientOrders");
  container.innerHTML = `<div class="loading-spinner">Ładowanie zamówień...</div>`;
  try {
    const snap = await db
      .collection("orders")
      .where("uid", "==", currentUser.uid)
      .orderBy("createdAt", "desc")
      .get();
    const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

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
    // podepnij przyciski accept/reject
    container.querySelectorAll("[data-accept]").forEach((btn) => {
      btn.addEventListener("click", () => doAccept(btn.dataset.accept));
    });
    container.querySelectorAll("[data-reject]").forEach((btn) => {
      btn.addEventListener("click", () => doReject(btn.dataset.reject));
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
          <button class="btn-accept" data-accept="${o.id}">✅ Akceptuję — przejdź do płatności</button>
          <button class="btn-reject" data-reject="${o.id}">❌ Odrzucam ofertę</button>
        </div>
      </div>`;
  }
  if (o.status === "PAYMENT") {
    action = `
      <div class="payment-block">
        <p>💳 Zaakceptowałeś wycenę: <strong>${o.officialPrice}</strong></p>
        <p style="color:rgba(240,240,240,.5);font-size:.85rem;margin-top:6px">Płatność zostanie wkrótce aktywowana. Skontaktujemy się z Tobą.</p>
        <button class="btn-primary" style="margin-top:12px;opacity:.5;cursor:not-allowed" disabled>Przejdź do płatności (wkrótce)</button>
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
        ${o.officialPrice && o.status !== "PRICED" ? `<span>💰 Twoja cena: <strong>${o.officialPrice}</strong></span>` : ""}
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
  if (!confirm("Czy na pewno akceptujesz ofertę?")) return;
  await db.collection("orders").doc(id).update({
    status: "PAYMENT",
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  loadClientOrders();
}
async function doReject(id) {
  if (!confirm("Czy na pewno chcesz odrzucić tę ofertę?")) return;
  await db.collection("orders").doc(id).update({
    status: "REJECTED",
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  loadClientOrders();
}

// ══════════════════════════════════════
// ADMIN PANEL
// ══════════════════════════════════════
async function loadAdminOrders(filter) {
  filter = filter || "ALL";
  $("adminOrders").innerHTML =
    `<div class="loading-spinner">Ładowanie zamówień...</div>`;
  try {
    const snap = await db
      .collection("orders")
      .orderBy("createdAt", "desc")
      .get();
    allOrdersCache = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderAdminStats(allOrdersCache);
    renderAdminOrders(filter);
  } catch (e) {
    $("adminOrders").innerHTML =
      `<div class="empty-state"><p>Błąd: ${e.message}</p></div>`;
  }
}

function renderAdminStats(orders) {
  const counts = {};
  Object.keys(STATUSES).forEach((k) => (counts[k] = 0));
  orders.forEach((o) => {
    if (counts[o.status] !== undefined) counts[o.status]++;
  });
  $("adminStats").innerHTML = Object.entries(STATUSES)
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

// filter buttons
document.querySelectorAll(".filter-btn").forEach((btn) => {
  btn.addEventListener("click", function () {
    document
      .querySelectorAll(".filter-btn")
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
  const o = allOrdersCache.find((x) => x.id === id);
  if (!o) return;
  const st = STATUSES[o.status] || STATUSES.PENDING;

  $("orderModalContent").innerHTML = `
    <button class="modal-close" id="closeOrderBtn">✕</button>
    <h2>${TYPE_MAP[o.projekt] || "Zamówienie"}</h2>
    <p class="modal-sub">ID: ${o.id}</p>

    <div class="modal-section"><h4>👤 Klient</h4><p>${o.userName || "—"} · ${o.userEmail || "—"}</p></div>

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
      <h4>💰 Oficjalna cena dla klienta</h4>
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
        <input type="text" id="m-url" placeholder="https://klient.pl" value="${o.deliveredUrl || ""}"/>
      </div>
      <div class="form-group">
        <label>Link do plików</label>
        <input type="text" id="m-files" placeholder="https://drive.google.com/..." value="${o.deliveredFiles || ""}"/>
      </div>
    </div>

    <button class="btn-primary" style="width:100%;margin-top:8px" id="saveOrderBtn">💾 Zapisz zmiany</button>`;

  $("orderModal").classList.add("open");

  $("closeOrderBtn").addEventListener("click", closeOrderModal);
  $("m-status").addEventListener("change", function () {
    const sec = $("deliveredSection");
    if (sec)
      sec.style.display =
        this.value === "ACCEPTED" || this.value === "DELIVERED" ? "" : "none";
  });
  $("saveOrderBtn").addEventListener("click", () => saveAdminOrder(o.id));
}

async function saveAdminOrder(id) {
  const price = $("m-price") ? $("m-price").value.trim() : "";
  const note = $("m-note") ? $("m-note").value.trim() : "";
  const status = $("m-status") ? $("m-status").value : "";
  const url = $("m-url") ? $("m-url").value.trim() : "";
  const files = $("m-files") ? $("m-files").value.trim() : "";

  try {
    const update = {
      status,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    if (price) {
      update.officialPrice = price;
      update.clientNote = note;
    }
    if (status === "DELIVERED") {
      update.deliveredUrl = url;
      update.deliveredFiles = files;
    }
    await db.collection("orders").doc(id).update(update);
    // jeśli ustawiamy cenę → zmień status na PRICED
    if (price && status !== "DELIVERED" && status !== "REJECTED") {
      await db
        .collection("orders")
        .doc(id)
        .update({ status: price ? "PRICED" : status });
    }
    closeOrderModal();
    await loadAdminOrders();
    toast("✅ Zmiany zapisane!");
  } catch (e) {
    toast("❌ Błąd: " + e.message);
  }
}

function closeOrderModal() {
  $("orderModal").classList.remove("open");
}
$("orderModal").addEventListener("click", function (e) {
  if (e.target === this) closeOrderModal();
});

// ══════════════════════════════════════
// STYLE dla panelu (inline, żeby nie było brakujących plików)
// ══════════════════════════════════════
const panelStyle = document.createElement("style");
panelStyle.textContent = `
#authScreen{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.auth-box{background:#0d0d12;border:1px solid rgba(124,58,237,.3);border-radius:20px;padding:44px;width:100%;max-width:460px;box-shadow:0 0 60px rgba(124,58,237,.15)}
.auth-logo{font-size:1.8rem;font-weight:800;background:linear-gradient(135deg,#fff,rgba(192,192,192,1));-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:6px;text-align:center}
.auth-logo span{-webkit-text-fill-color:#a855f7}
.auth-sub{text-align:center;font-size:.85rem;color:rgba(240,240,240,.4);margin-bottom:28px}
.auth-tabs{display:flex;border:1px solid rgba(192,192,192,.1);border-radius:10px;overflow:hidden;margin-bottom:24px}
.auth-tab{flex:1;padding:10px;background:transparent;border:none;color:rgba(240,240,240,.45);font-size:.88rem;cursor:pointer;transition:all .3s}
.auth-tab.active{background:rgba(124,58,237,.2);color:#a855f7;font-weight:600}
.auth-error{color:#ef4444;font-size:.82rem;min-height:20px;margin-bottom:8px}
.auth-divider{text-align:center;position:relative;margin:20px 0;color:rgba(240,240,240,.25);font-size:.8rem}
.auth-divider::before,.auth-divider::after{content:"";position:absolute;top:50%;width:42%;height:1px;background:rgba(192,192,192,.1)}
.auth-divider::before{left:0}.auth-divider::after{right:0}
.btn-google{width:100%;padding:12px;border-radius:10px;border:1px solid rgba(192,192,192,.15);background:rgba(192,192,192,.05);color:#f0f0f0;font-size:.9rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;transition:all .3s}
.btn-google:hover{background:rgba(192,192,192,.1);border-color:rgba(192,192,192,.3)}
.panel-nav-right{display:flex;align-items:center;gap:16px;font-size:.88rem;color:rgba(240,240,240,.5)}
.panel-wrap{max-width:960px;margin:0 auto;padding:100px 24px 60px}
.panel-header{margin-bottom:40px}
.panel-header h1{font-size:2rem;font-weight:800;background:linear-gradient(135deg,#fff,rgba(192,192,192,1));-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px}
.admin-badge{display:inline-block;padding:4px 14px;border-radius:99px;background:rgba(124,58,237,.15);border:1px solid rgba(124,58,237,.35);color:#a855f7;font-size:.78rem;font-weight:600;letter-spacing:1px;margin-bottom:12px}
.orders-list{display:flex;flex-direction:column;gap:16px}
.order-card{background:linear-gradient(135deg,rgba(192,192,192,.04),transparent);border:1px solid rgba(192,192,192,.08);border-radius:16px;padding:24px;transition:border-color .3s}
.admin-order-card{cursor:pointer}
.admin-order-card:hover{border-color:rgba(124,58,237,.35)}
.order-card-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;gap:12px}
.order-type{font-size:1.05rem;font-weight:700;margin-bottom:4px}
.order-industry{font-size:.82rem;color:rgba(240,240,240,.45)}
.order-status{padding:5px 12px;border-radius:99px;font-size:.78rem;font-weight:600;border:1px solid;white-space:nowrap}
.order-meta{display:flex;flex-wrap:wrap;gap:16px;font-size:.82rem;color:rgba(240,240,240,.45);margin-bottom:18px}
.order-meta strong{color:rgba(240,240,240,.8)}
.admin-card-footer{border-top:1px solid rgba(192,192,192,.06);padding-top:10px;margin-top:4px}
.order-progress{margin-bottom:16px}
.progress-steps{display:flex;align-items:center;overflow-x:auto;padding-bottom:4px}
.progress-step{display:flex;flex-direction:column;align-items:center;min-width:80px;text-align:center}
.progress-dot{width:32px;height:32px;border-radius:50%;background:rgba(192,192,192,.08);border:1px solid rgba(192,192,192,.15);display:flex;align-items:center;justify-content:center;font-size:.85rem;margin-bottom:6px;transition:all .3s}
.progress-step.done .progress-dot{background:rgba(34,197,94,.15);border-color:#22c55e;color:#22c55e}
.progress-step.active .progress-dot{background:rgba(124,58,237,.2);border-color:#a855f7;box-shadow:0 0 12px rgba(124,58,237,.4)}
.progress-label{font-size:.65rem;color:rgba(240,240,240,.3);line-height:1.3}
.progress-step.active .progress-label{color:#a855f7}
.progress-step.done .progress-label{color:#22c55e}
.progress-line{flex:1;height:1px;background:rgba(192,192,192,.1);min-width:12px;margin-bottom:22px}
.price-reveal{background:linear-gradient(135deg,rgba(124,58,237,.12),rgba(124,58,237,.05));border:1px solid rgba(124,58,237,.3);border-radius:14px;padding:20px;margin-top:8px}
.price-reveal-label{font-size:.72rem;text-transform:uppercase;letter-spacing:2px;color:#a855f7;margin-bottom:6px}
.price-reveal-amount{font-size:2rem;font-weight:900;background:linear-gradient(135deg,#fff,rgba(192,192,192,1));-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px}
.price-note{font-size:.83rem;color:rgba(240,240,240,.5);margin-bottom:16px}
.price-actions{display:flex;gap:10px;flex-wrap:wrap}
.btn-accept{padding:11px 20px;border-radius:9px;border:none;background:#22c55e;color:#fff;font-size:.88rem;font-weight:600;cursor:pointer;transition:all .3s}
.btn-accept:hover{background:#16a34a}
.btn-reject{padding:11px 20px;border-radius:9px;border:1px solid rgba(239,68,68,.35);background:transparent;color:#ef4444;font-size:.88rem;cursor:pointer;transition:all .3s}
.btn-reject:hover{background:rgba(239,68,68,.1)}
.payment-block,.delivered-block{border:1px solid rgba(192,192,192,.1);border-radius:12px;padding:16px;background:rgba(192,192,192,.03);font-size:.9rem;margin-top:8px}
.admin-stats{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:28px}
.admin-stat-card{flex:1;min-width:120px;padding:16px 18px;border:1px solid rgba(192,192,192,.08);border-radius:12px;background:rgba(192,192,192,.03);text-align:center}
.admin-stat-num{font-size:1.8rem;font-weight:800;letter-spacing:-1px}
.admin-stat-label{font-size:.74rem;color:rgba(240,240,240,.4);margin-top:4px}
.admin-filters{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px}
.filter-btn{padding:7px 14px;border-radius:99px;border:1px solid rgba(192,192,192,.12);background:transparent;color:rgba(240,240,240,.5);font-size:.8rem;cursor:pointer;transition:all .25s}
.filter-btn:hover{border-color:rgba(124,58,237,.4);color:#a855f7}
.filter-btn.active{background:rgba(124,58,237,.15);border-color:rgba(124,58,237,.45);color:#a855f7;font-weight:600}
.modal-section{margin:18px 0;padding:16px;border:1px solid rgba(192,192,192,.07);border-radius:12px;background:rgba(192,192,192,.02)}
.modal-section h4{font-size:.82rem;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:rgba(240,240,240,.45);margin-bottom:10px}
.modal-section p{font-size:.88rem;color:rgba(240,240,240,.65);margin-bottom:4px}
.empty-state{text-align:center;padding:60px 20px;color:rgba(240,240,240,.4)}
.empty-state h3{font-size:1.1rem;margin:12px 0 8px;color:rgba(240,240,240,.7)}
.empty-state p{font-size:.88rem;line-height:1.7}
.loading-spinner{text-align:center;padding:40px;color:rgba(240,240,240,.35);font-size:.9rem}
.toast{position:fixed;bottom:30px;left:50%;transform:translateX(-50%) translateY(20px);background:#0d0d12;border:1px solid rgba(124,58,237,.4);border-radius:10px;padding:12px 24px;font-size:.88rem;color:#f0f0f0;box-shadow:0 0 30px rgba(124,58,237,.2);opacity:0;transition:all .3s;z-index:9999;white-space:nowrap}
.toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
@media(max-width:600px){.auth-box{padding:28px 18px}.panel-wrap{padding:90px 14px 40px}.order-card-head{flex-direction:column}.progress-step{min-width:60px}.progress-label{font-size:.58rem}}
`;
document.head.appendChild(panelStyle);
