// Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCIJOFPPjifvF8ePE97aswm06PDMJe0Ju4",
  authDomain: "forex-tournaments-arena.firebaseapp.com",
  projectId: "forex-tournaments-arena",
  storageBucket: "forex-tournaments-arena.appspot.com",
  messagingSenderId: "895363795197",
  appId: "1:895363795197:web:04d948c27271c4b1611694"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firestore
export const db = getFirestore(app);