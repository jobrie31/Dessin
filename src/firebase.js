import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDszjXUvjGd-BdSz8Ff9FTvxnTNlpsbmkU",
  authDomain: "boutique-vetements.firebaseapp.com",
  projectId: "boutique-vetements",
  storageBucket: "boutique-vetements.firebasestorage.app",
  messagingSenderId: "462335281097",
  appId: "1:462335281097:web:2eb644eb81f4eef75dca18",
  measurementId: "G-G8T5JZFJHB",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);