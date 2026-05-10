// js/firebase-config.js
// Firebase COMPAT — działa bez bundlera (Vercel static / CDN)

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCBu3eAWP9Z5LeDIjPJiH-YpS-xHdctaWw",
  authDomain: "sitely-87531.firebaseapp.com",
  projectId: "sitely-87531",
  storageBucket: "sitely-87531.firebasestorage.app",
  messagingSenderId: "585148571318",
  appId: "1:585148571318:web:335b2c11a672b64b8ad017",
};

// Inicjalizacja tylko raz
if (!firebase.apps.length) {
  firebase.initializeApp(FIREBASE_CONFIG);
}

const auth = firebase.auth();
const db = firebase.firestore();

const ADMIN_EMAIL = "borowskielo135@gmail.com";

// ── Google Provider z wymuszeniem wyboru konta ──
const googleProvider = new firebase.auth.GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
