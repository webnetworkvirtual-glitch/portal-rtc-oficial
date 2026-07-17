import { initializeApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCEYixPeEh-ecogSResZMtI4-wQrCb_7y0",
  authDomain: "ai-studio-applet-webapp-96b0b.firebaseapp.com",
  projectId: "ai-studio-applet-webapp-96b0b",
  storageBucket: "ai-studio-applet-webapp-96b0b.firebasestorage.app",
  messagingSenderId: "60980299930",
  appId: "1:60980299930:web:b63bda2a9f93bf28bd3723"
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore with the specific databaseId configured for this project
const db = initializeFirestore(app, {}, "ai-studio-reddetransparenc-b7b73843-efcc-473d-bfb7-fdcdbf81c66a");

const auth = getAuth(app);

export { app, db, auth };
