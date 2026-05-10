// js/auth.js
// Wymaga: firebase-config.js załadowanego wcześniej

// ── Helpers ──
function authErr(code) {
  const map = {
    "auth/user-not-found": "Nie znaleziono konta z tym e-mailem.",
    "auth/wrong-password": "Błędne hasło.",
    "auth/invalid-credential": "Błędny e-mail lub hasło.",
    "auth/email-already-in-use": "Ten e-mail jest już zarejestrowany.",
    "auth/weak-password": "Hasło musi mieć min. 6 znaków.",
    "auth/invalid-email": "Nieprawidłowy adres e-mail.",
    "auth/too-many-requests": "Za dużo prób. Spróbuj za chwilę.",
    "auth/popup-closed-by-user": "Okno zostało zamknięte. Spróbuj ponownie.",
    "auth/popup-blocked":
      "Przeglądarka zablokowała popup. Zezwól na popupy dla tej strony.",
    "auth/cancelled-popup-request": "Anulowano. Spróbuj ponownie.",
    "auth/network-request-failed": "Brak połączenia z internetem.",
  };
  return map[code] || `Błąd: ${code}`;
}

async function ensureUserDoc(user) {
  const ref = db.collection("users").doc(user.uid);
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set({
      uid: user.uid,
      name: user.displayName || "Użytkownik",
      email: user.email,
      role: user.email === ADMIN_EMAIL ? "admin" : "client",
      banned: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }
}

async function getUserRole(uid) {
  try {
    const snap = await db.collection("users").doc(uid).get();
    return snap.exists ? snap.data().role || "client" : "client";
  } catch {
    return "client";
  }
}

async function isUserBanned(uid) {
  try {
    const snap = await db.collection("users").doc(uid).get();
    return snap.exists ? snap.data().banned === true : false;
  } catch {
    return false;
  }
}

// ── Register ──
async function registerUser(name, email, password) {
  const cred = await auth.createUserWithEmailAndPassword(email, password);
  await cred.user.updateProfile({ displayName: name });
  await ensureUserDoc(cred.user);
  return cred.user;
}

// ── Login ──
async function loginUser(email, password) {
  const cred = await auth.signInWithEmailAndPassword(email, password);
  return cred.user;
}

// ── Google Login — POPUP z fallbackiem na redirect ──
async function loginWithGoogle() {
  try {
    const cred = await auth.signInWithPopup(googleProvider);
    await ensureUserDoc(cred.user);
    return cred.user;
  } catch (err) {
    // Jeśli popup zablokowany → fallback na redirect
    if (
      err.code === "auth/popup-blocked" ||
      err.code === "auth/popup-closed-by-user"
    ) {
      await auth.signInWithRedirect(googleProvider);
      return null; // onAuthStateChanged obsłuży po przekierowaniu
    }
    throw err;
  }
}

// ── Logout ──
async function logoutUser() {
  await auth.signOut();
}
