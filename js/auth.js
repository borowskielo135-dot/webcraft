// js/auth.js
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { auth, db, googleProvider, ADMIN_EMAIL } from "./firebase-config.js";

export function onAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function register(name, email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  await createUserDoc(cred.user, name);
  return cred.user;
}

export async function login(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function loginWithGoogle() {
  const cred = await signInWithPopup(auth, googleProvider);
  const snap = await getDoc(doc(db, "users", cred.user.uid));
  if (!snap.exists()) {
    await createUserDoc(cred.user, cred.user.displayName || "Użytkownik");
  }
  return cred.user;
}

export async function logout() {
  await signOut(auth);
}

export async function getUserData(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

async function createUserDoc(user, name) {
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    name,
    email: user.email,
    role: user.email === ADMIN_EMAIL ? "admin" : "client",
    createdAt: serverTimestamp(),
  });
}

export { auth, ADMIN_EMAIL };
