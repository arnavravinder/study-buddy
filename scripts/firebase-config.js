import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Configuration using the provided keys.
// Note: In a build environment (like Vite/Webpack), these should be accessed via process.env or import.meta.env
// and stored in the .env file.
const firebaseConfig = {
    apiKey: "AIzaSyDd7wzQGIT5fhXPkgbOugDZw_7CgvU2nCE",
    authDomain: "sb-inv.firebaseapp.com",
    projectId: "sb-inv",
    storageBucket: "sb-inv.firebasestorage.app",
    messagingSenderId: "763583057791",
    appId: "1:763583057791:web:d5a5f063302feda541144a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { app, auth };
