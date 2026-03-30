import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBcsmX7T1NotMi0T1XZ6b03yI3r7qZYQr8",
    authDomain: "gym-membership-tracker-60626.firebaseapp.com",
    projectId: "gym-membership-tracker-60626",
    storageBucket: "gym-membership-tracker-60626.firebasestorage.app",
    messagingSenderId: "260703319955",
    appId: "1:260703319955:web:78206334baa1fc79725a66"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.getElementById('loginBtn').addEventListener('click', async () => {
    const inputUser = document.getElementById('u').value.trim();
    const inputPass = document.getElementById('p').value.trim();

    if(!inputUser || !inputPass) return alert("Please enter credentials");

    // FIXED: Changed 'user' to 'username' and 'pass' to 'password' to match admin.js
    const q = query(
        collection(db, "gyms"), 
        where("username", "==", inputUser), 
        where("password", "==", inputPass)
    );

    try {
        const snap = await getDocs(q);

        if(!snap.empty) {
            const gymDoc = snap.docs[0];
            const gymData = gymDoc.data();
            
            // Set session data
            localStorage.setItem("activeGymId", gymDoc.id);
            localStorage.setItem("activeGymName", gymData.name);
            
            window.location.href = "index.html";
        } else {
            alert("Invalid Credentials. Please check your username or password.");
        }
    } catch (error) {
        console.error("Login error:", error);
        alert("System error during login.");
    }
});