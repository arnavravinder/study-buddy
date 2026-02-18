import { auth, db } from "./firebase-config.js";
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
const provider = new GoogleAuthProvider();
let currentUser = null;
let authChecked = false;

const authStatePromise = new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        authChecked = true;
        if (user) {
        }
        resolve(user);
    });
});


export async function checkAuthAndRedirect() {
    await authStatePromise;
    if (!currentUser) {
        return false;
    }
    try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            const userData = userSnap.data();
            if (userData.role) {
                if (userData.role === 'mentee' || userData.role === 'student') {
                    window.location.href = "/mentee/dashboard/";
                } else if (userData.role === 'mentor') {
                    window.location.href = "/mentor/dashboard/";
                }
                return true;
            }
        }
    } catch (error) {
        console.error("Error checking auth:", error);
    }
    return false;
}

export async function handleRoleSelection(role) {
    await authStatePromise;
    if (!currentUser) {
        console.error("No user logged in when selecting role");
        alert("Please log in first.");
        return;
    }
    try {
        const userRef = doc(db, "users", currentUser.uid);
        await setDoc(userRef, {
            role: role,
            updatedAt: serverTimestamp()
        }, { merge: true });
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

export async function logout() {
    try {
        await signOut(auth);
        currentUser = null;
        window.location.href = "/";
    } catch (error) {
        console.error("Error signing out:", error);
    }
}

export function signInWithGoogle() {
    return signInWithPopup(auth, provider)
        .then(async (result) => {
            const user = result.user;
            currentUser = user;
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                const userData = userSnap.data();
                if (userData.role) {

                    if (userData.role === 'mentee' || userData.role === 'student') {
                        window.location.href = "/mentee/dashboard/";
                    } else if (userData.role === 'mentor') {
                        window.location.href = "/mentor/dashboard/";
                    }
                } else {
                    window.location.href = "/onboarding.html";
                }
            } else {
                await setDoc(userRef, {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    createdAt: serverTimestamp(),
                    lastLogin: serverTimestamp()
                });
                window.location.href = "/onboarding.html";
            }
        }).catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            console.error("Error during sign in:", errorCode, errorMessage);
            alert("Login failed: " + errorMessage);
            throw error;
        });
}
