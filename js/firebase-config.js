// js/firebase-config.js
// Skopiuj swoje dane z Firebase Console → Project Settings → Your apps

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCBu3eAWP9Z5LeDIjPJiH-YpS-xHdctaWw",
  authDomain: "sitely-87531.firebaseapp.com",
  projectId: "sitely-87531",
  storageBucket: "sitely-87531.firebasestorage.app",
  messagingSenderId: "585148571318",
  appId: "1:585148571318:web:335b2c11a672b64b8ad017",
  measurementId: "G-NJLQHRL1T8",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export const ADMIN_EMAIL = "borowskielo135@gmail.com";
