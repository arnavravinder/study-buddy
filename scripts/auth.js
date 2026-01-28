import { auth, db } from "./firebase-config.js";
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const provider = new GoogleAuthProvider();
let currentUser = null;

// Function to handle the actual role selection click
export async function handleRoleSelection(role) {
    if (!currentUser) {
        console.error("No user logged in when selecting role");
        return;
    }

    try {
        const userRef = doc(db, "users", currentUser.uid);

        // Update user with selected role
        await setDoc(userRef, {
            role: role,
            updatedAt: serverTimestamp()
        }, { merge: true });

        console.log("Role updated:", role);
        redirectBasedOnRole(role);

    } catch (error) {
        console.error("Error saving role:", error);
        alert("Failed to save role. Please try again.");
    }
}

function redirectBasedOnRole(role) {
    if (role === 'mentee') {
        window.location.href = "/apply/mentee/index.html";
    } else if (role === 'mentor') {
        window.location.href = "/apply/mentor/index.html";
    } else {
        window.location.href = "/apply/mentee/index.html";
    }
}

export function signInWithGoogle() {
    return signInWithPopup(auth, provider)
        .then(async (result) => {
            const user = result.user;
            currentUser = user;
            console.log("User signed in:", user.uid);

            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const userData = userSnap.data();
                if (userData.role) {
                    // User has a role, redirect immediately
                    console.log("User has role:", userData.role);
                    redirectBasedOnRole(userData.role);
                } else {
                    // User exists but has no role (rare, but possible)
                    console.log("User exists but no role. Showing selection.");
                    if (window.showRoleSelection) window.showRoleSelection();
                }
            } else {
                // New User: Save basic info and show role selection
                console.log("New user. Creating doc and showing selection.");
                await setDoc(userRef, {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    createdAt: serverTimestamp(),
                    lastLogin: serverTimestamp()
                });

                // Show role selection UI
                if (window.showRoleSelection) window.showRoleSelection();
            }

        }).catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            console.error("Error during sign in:", errorCode, errorMessage);
            alert("Login failed: " + errorMessage);
            throw error; // Re-throw to handle UI reset
        });
}
