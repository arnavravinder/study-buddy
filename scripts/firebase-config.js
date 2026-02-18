import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
const firebaseConfig = {
    apiKey: "AIzaSyDd7wzQGIT5fhXPkgbOugDZw_7CgvU2nCE",
    authDomain: "sb-inv.firebaseapp.com",
    projectId: "sb-inv",
    storageBucket: "sb-inv.firebasestorage.app",
    messagingSenderId: "763583057791",
    appId: "1:763583057791:web:d5a5f063302feda541144a",
    databaseURL: "https://sb-inv-default-rtdb.firebaseio.com"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);
export { app, auth, db, rtdb };
