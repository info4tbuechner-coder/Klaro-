import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCO8Ph52ca73VyWua3V-TRjOIuZwovkiMM",
  authDomain: "gen-lang-client-0376710610.firebaseapp.com",
  projectId: "gen-lang-client-0376710610",
  storageBucket: "gen-lang-client-0376710610.firebasestorage.app",
  messagingSenderId: "254662483354",
  appId: "1:254662483354:web:654559946956dade18ee23"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, "ai-studio-klarocodedby8uec-ce8790f9-2247-4b85-9be6-2c0accc9dba1");
