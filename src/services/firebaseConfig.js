import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBnUPMteEvp6Maub9AGKpSabchiiX1UDvI",
  authDomain: "shopping-organizer-a8a38.firebaseapp.com",
  projectId: "shopping-organizer-a8a38",
  storageBucket: "shopping-organizer-a8a38.firebasestorage.app",
  messagingSenderId: "347419962355",
  appId: "1:347419962355:web:bf8e27a852e0ede328c086"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
