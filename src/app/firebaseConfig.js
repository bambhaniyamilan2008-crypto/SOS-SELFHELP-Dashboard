import { initializeApp, getApps, getApp } from "firebase/app";
// 🔥 Naye imports jo database ko fast banayenge
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCbYasoah0sZbOnMa7kE4dSMyAId7i0oM0",
  authDomain: "safehelp-2026.firebaseapp.com",
  projectId: "safehelp-2026",
  storageBucket: "safehelp-2026.firebasestorage.app",
  messagingSenderId: "629905965135",
  appId: "1:629905965135:web:3e9cac98d33baf4ca7aa3a"
};

// Singleton Pattern: Next.js mein multiple connections rokne ke liye
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// 🔥 GOD MODE FIX: Isse bina refresh kiye data makkhan ki tarah chalega
export const db = initializeFirestore(app, { 
  localCache: persistentLocalCache({ 
    tabManager: persistentMultipleTabManager() 
  })
});