// js/orders.js
// CRUD na kolekcji "orders" — wymaga firebase-config.js

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

// ── Utwórz zamówienie ──
async function createOrder(uid, userName, userEmail, formData, aiQuote) {
  const ref = await db.collection("orders").add({
    uid,
    userName,
    userEmail,
    projekt: formData.projekt,
    branza: formData.branza,
    features: formData.features,
    opis: formData.opis || "",
    aiQuote,
    officialPrice: null,
    clientNote: "",
    deliveredUrl: "",
    deliveredFiles: "",
    status: "PENDING",
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  return ref.id;
}

// ── Pobierz zamówienia klienta ──
async function getClientOrders(uid) {
  const snap = await db
    .collection("orders")
    .where("uid", "==", uid)
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ── Pobierz wszystkie zamówienia (admin) ──
async function getAllOrders() {
  const snap = await db.collection("orders").orderBy("createdAt", "desc").get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ── Pobierz wszystkich użytkowników (admin) ──
async function getAllUsers() {
  const snap = await db.collection("users").orderBy("createdAt", "desc").get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ── Aktualizuj zamówienie ──
async function updateOrder(orderId, data) {
  await db
    .collection("orders")
    .doc(orderId)
    .update({
      ...data,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
}

// ── Usuń zamówienie ──
async function deleteOrder(orderId) {
  await db.collection("orders").doc(orderId).delete();
}

// ── Zbanuj / odbanuj użytkownika ──
async function setBanned(uid, banned) {
  await db.collection("users").doc(uid).update({ banned });
}

// ── Usuń użytkownika (tylko dokument — konto Firebase Auth wymaga Admin SDK) ──
async function deleteUserDoc(uid) {
  await db.collection("users").doc(uid).delete();
}

// ── Helpers ──
function tsToDate(ts) {
  if (!ts) return "—";
  if (ts.toDate)
    return ts
      .toDate()
      .toLocaleDateString("pl-PL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
  return "—";
}
