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

    // Querying the gyms collection
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
            
            // 1. CLEAR OLD DATA to ensure a fresh session
            localStorage.clear();

            // 2. SET SESSION DATA
            // activeGymId is used for the dashboard
            localStorage.setItem("activeGymId", gymDoc.id);
            
            // adminGymId is used for payment-logs.html
            localStorage.setItem("adminGymId", gymDoc.id); 

            // Only declare displayName ONCE to avoid SyntaxError
            const displayName = gymData.gymName || gymData.name || "My Gym";
            localStorage.setItem("activeGymName", displayName);
            
            // 3. REDIRECT to the dashboard
            window.location.href = 'admin/dashboard.html';
        } else {
            alert("Invalid Credentials. Please check your username or password.");
        }
    } catch (error) {
        console.error("Login error:", error);
        alert("System error during login.");
    }
});