import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// These values are meant to be public/client-side — Firestore access is
// controlled by the security rules you set in the console, not by hiding
// this config. See README.md for the rules to paste in.
const firebaseConfig = {
  apiKey: 'AIzaSyCJnV7pHyquA2cMIjVwKKTp7cAIP0RSAT0',
  authDomain: 'unggiemilly.firebaseapp.com',
  projectId: 'unggiemilly',
  storageBucket: 'unggiemilly.firebasestorage.app',
  messagingSenderId: '874341567568',
  appId: '1:874341567568:web:db30a726249f266c855555',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
