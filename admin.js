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

// --- 1. SESSION CHECK (Run on Page Load) ---
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('isMasterAdmin') === 'true') {
        showDashboard();
    }
});

function showDashboard() {
    document.getElementById('adminAuth').classList.add('hidden');
    document.getElementById('adminDashboard').classList.remove('hidden');
    loadGyms();
}

// --- 2. MASTER AUTH ---
window.checkMasterAuth = () => {
    const u = document.getElementById('masterUser').value;
    const p = document.getElementById('masterPass').value;

    // Direct string comparison as per your logic
    if(u === "sachin" && p === "pundachi@123") {
        localStorage.setItem('isMasterAdmin', 'true'); // Save session
        showDashboard();
    } else {
        alert("Access Denied: Master Credentials Invalid");
    }
};

// --- 3. LOAD GYMS ---
async function loadGyms() {
    const tableBody = document.getElementById('gymTableBody');
    tableBody.innerHTML = `<tr><td colspan="3" class="p-10 text-center animate-pulse text-slate-400">Fetching cloud data...</td></tr>`;

    try {
        const snap = await getDocs(collection(db, "gyms"));
        tableBody.innerHTML = "";

        if (snap.empty) {
            tableBody.innerHTML = `<tr><td colspan="3" class="p-10 text-center text-slate-400 font-medium">No gyms onboarded yet.</td></tr>`;
            return;
        }

        snap.forEach(d => {
            const gym = d.data();
            tableBody.innerHTML += `
            <tr class="hover:bg-slate-50 transition-colors border-b border-slate-50">
                <td class="p-6">
                    <p class="font-bold text-slate-900">${gym.name}</p>
                    <p class="text-[9px] text-blue-500 font-black uppercase tracking-widest">ID: ${d.id.slice(0,8)}</p>
                </td>
                <td class="p-6">
                    <span class="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-600">${gym.username}</span>
                    <span class="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-300 ml-2">••••••</span>
                </td>
                <td class="p-6 text-right">
                    <button onclick="removeGym('${d.id}')" class="text-[10px] font-black text-red-200 hover:text-red-600 uppercase tracking-widest transition">Terminate</button>
                </td>
            </tr>`;
        });
    } catch (e) {
        console.error(e);
        tableBody.innerHTML = `<tr><td colspan="3" class="p-10 text-center text-red-500">Error loading data. Check console.</td></tr>`;
    }
}

// --- 4. ONBOARD GYM ---
window.onboardGym = async () => {
    const name = document.getElementById('newGymName').value.trim();
    const user = document.getElementById('newGymUser').value.trim();
    const pass = document.getElementById('newGymPass').value.trim();

    if(!name || !user || !pass) return alert("Fill all fields");

    const btn = event.target;
    btn.disabled = true;
    btn.innerText = "CREATING...";

    await addDoc(collection(db, "gyms"), {
        name,
        username: user,
        password: pass,
        createdAt: new Date().toISOString()
    });

    // Clear inputs
    document.getElementById('newGymName').value = "";
    document.getElementById('newGymUser').value = "";
    document.getElementById('newGymPass').value = "";
    
    btn.disabled = false;
    btn.innerText = "Create Gym Portal";
    
    loadGyms();
};

// --- 5. REMOVE GYM ---
window.removeGym = async (id) => {
    if(confirm("Are you sure you want to delete this gym? This action is permanent.")) {
        await deleteDoc(doc(db, "gyms", id));
        loadGyms();
    }
};

// --- 6. LOGOUT (Optional but recommended) ---
window.adminLogout = () => {
    localStorage.removeItem('isMasterAdmin');
    location.reload();
};