import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// 1. MASTER AUTH
window.checkMasterAuth = () => {
    const u = document.getElementById('masterUser').value;
    const p = document.getElementById('masterPass').value;

    if(u === "sachin" && p === "pundachi@123") {
        document.getElementById('adminAuth').classList.add('hidden');
        document.getElementById('adminDashboard').classList.remove('hidden');
        loadGyms();
    } else {
        alert("Access Denied: Master Credentials Invalid");
    }
};

// 2. LOAD GYMS (Read)
async function loadGyms() {
    const snap = await getDocs(collection(db, "gyms"));
    const tableBody = document.getElementById('gymTableBody');
    tableBody.innerHTML = "";

    snap.forEach(d => {
        const gym = d.data();
        tableBody.innerHTML += `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="p-6">
                <p class="font-bold text-slate-900">${gym.name}</p>
                <p class="text-[9px] text-blue-500 font-black uppercase tracking-widest">ID: ${d.id.slice(0,8)}</p>
            </td>
            <td class="p-6">
                <span class="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-600">${gym.username}</span>
                <span class="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-400 ml-2">••••••</span>
            </td>
            <td class="p-6 text-right">
                <button onclick="removeGym('${d.id}')" class="text-[10px] font-black text-red-300 hover:text-red-600 uppercase tracking-widest transition">Terminate</button>
            </td>
        </tr>`;
    });
}

// 3. ONBOARD GYM (Create)
window.onboardGym = async () => {
    const name = document.getElementById('newGymName').value;
    const user = document.getElementById('newGymUser').value;
    const pass = document.getElementById('newGymPass').value;

    if(!name || !user || !pass) return alert("Fill all fields");

    await addDoc(collection(db, "gyms"), {
        name,
        username: user,
        password: pass, // In a real app, we'd hash this, but for your internal tool, this works.
        createdAt: new Date().toISOString()
    });

    // Clear inputs
    document.getElementById('newGymName').value = "";
    document.getElementById('newGymUser').value = "";
    document.getElementById('newGymPass').value = "";
    
    loadGyms();
};

// 4. REMOVE GYM (Delete)
window.removeGym = async (id) => {
    if(confirm("Are you sure you want to delete this gym and all its access?")) {
        await deleteDoc(doc(db, "gyms", id));
        loadGyms();
    }
};