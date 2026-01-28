import { auth } from "./firebase-config.js";
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const provider = new GoogleAuthProvider();

export function signInWithGoogle() {
    signInWithPopup(auth, provider)
        .then((result) => {
            // This gives you a Google Access Token. You can use it to access the Google API.
            const credential = GoogleAuthProvider.credentialFromResult(result);
            const token = credential.accessToken;
            // The signed-in user info.
            const user = result.user;
            console.log("User signed in:", user);

            // Redirect to application after successful login
            window.location.href = "/apply/mentee/index.html";
        }).catch((error) => {
            // Handle Errors here.
            const errorCode = error.code;
            const errorMessage = error.message;
            // The email of the user's account used.
            const email = error.customData.email;
            // The AuthCredential type that was used.
            const credential = GoogleAuthProvider.credentialFromError(error);
            console.error("Error during sign in:", errorCode, errorMessage);
            alert("Login failed: " + errorMessage);
        });
}

// Monitor auth state (optional, for persistent login)
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in, see docs for a list of available properties
        // https://firebase.google.com/docs/reference/js/auth.user
        console.log("Auth state changed: User is signed in", user.uid);
        // You might want to auto-redirect here if they are already on the login page
        // but be careful not to create a redirect loop if you use this script on protected pages/login page mixed
        if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
            // window.location.href = "/apply/mentee/index.html";
        }
    } else {
        // User is signed out
        console.log("Auth state changed: User is signed out");
    }
});
