import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBNVTTYIFGVU-uNx_bmamEtLG56rH5PNu4",
  authDomain: "tutrly-b51cd.firebaseapp.com",
  projectId: "tutrly-b51cd",
  storageBucket: "tutrly-b51cd.firebasestorage.app",
  messagingSenderId: "482509823294",
  appId: "1:482509823294:web:fab02458a3ce3ca650606f",
  measurementId: "G-4WK9EXZD8L"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
