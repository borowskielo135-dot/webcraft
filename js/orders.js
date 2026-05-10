// js/orders.js
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

export const STATUSES = {
  PENDING: { label: "Wycena w toku", color: "#f59e0b", icon: "⏳" },
  PRICED: { label: "Czeka na akceptację", color: "#a855f7", icon: "💰" },
  PAYMENT: { label: "Oczekuje na płatność", color: "#f97316", icon: "💳" },
  ACCEPTED: { label: "W realizacji", color: "#3b82f6", icon: "🔨" },
  DELIVERED: { label: "Dostarczone", color: "#22c55e", icon: "✅" },
  REJECTED: { label: "Odrzucone", color: "#ef4444", icon: "❌" },
};

export async function createOrder(uid, userName, userEmail, formData, aiQuote) {
  const ref = await addDoc(collection(db, "orders"), {
    uid,
    userName,
    userEmail,
    projekt: formData.projekt,
    branza: formData.branza,
    features: formData.features,
    opis: formData.opis,
    aiQuote,
    officialPrice: null,
    clientNote: "",
    deliveredUrl: "",
    deliveredFiles: "",
    status: "PENDING",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getClientOrders(uid) {
  const q = query(
    collection(db, "orders"),
    where("uid", "==", uid),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getAllOrders() {
  const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function setOfficialPrice(orderId, price, note = "") {
  await updateDoc(doc(db, "orders", orderId), {
    officialPrice: price,
    clientNote: note,
    status: "PRICED",
    updatedAt: serverTimestamp(),
  });
}

export async function acceptPrice(orderId) {
  await updateDoc(doc(db, "orders", orderId), {
    status: "PAYMENT",
    updatedAt: serverTimestamp(),
  });
}

export async function rejectPrice(orderId) {
  await updateDoc(doc(db, "orders", orderId), {
    status: "REJECTED",
    updatedAt: serverTimestamp(),
  });
}

export async function setStatus(orderId, status) {
  await updateDoc(doc(db, "orders", orderId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function markDelivered(orderId, deliveredUrl, deliveredFiles) {
  await updateDoc(doc(db, "orders", orderId), {
    status: "DELIVERED",
    deliveredUrl,
    deliveredFiles,
    updatedAt: serverTimestamp(),
  });
}
