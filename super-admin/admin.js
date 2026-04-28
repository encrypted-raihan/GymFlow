import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// --- 1. SESSION CHECK ---
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
    if(u === "sachin" && p === "pundachi@123") {
        localStorage.setItem('isMasterAdmin', 'true');
        showDashboard();
    } else {
        alert("Access Denied: Master Credentials Invalid");
    }
};

// --- 3. LOAD GYMS (Updated with Pause Status) ---
async function loadGyms() {
    const tableBody = document.getElementById('gymTableBody');
    tableBody.innerHTML = `<tr><td colspan="3" class="p-10 text-center animate-pulse text-slate-400 font-bold">REACHING CLOUD...</td></tr>`;

    try {
        const snap = await getDocs(collection(db, "gyms"));
        tableBody.innerHTML = "";

        if (snap.empty) {
            tableBody.innerHTML = `<tr><td colspan="3" class="p-10 text-center text-slate-400 font-medium">No gyms onboarded yet.</td></tr>`;
            return;
        }

        snap.forEach(d => {
            const gym = d.data();
            const isPaused = gym.isPaused || false;
            
            // Logic for Status Badges and Buttons
            const statusLabel = isPaused ? 'PAUSED' : 'ACTIVE';
            const statusColor = isPaused ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600';
            const toggleText = isPaused ? 'Resume' : 'Pause';
            const toggleColor = isPaused ? 'text-emerald-500 hover:text-emerald-700' : 'text-amber-500 hover:text-amber-700';

            tableBody.innerHTML += `
            <tr class="hover:bg-slate-50 transition-colors border-b border-slate-50">
                <td class="p-6">
                    <div class="flex items-center gap-3">
                        <p class="font-bold text-slate-900">${gym.name}</p>
                        <span class="text-[8px] font-black px-2 py-0.5 rounded-full ${statusColor}">${statusLabel}</span>
                    </div>
                    <p class="text-[9px] text-blue-500 font-black uppercase tracking-widest mt-1">ID: ${d.id.slice(0,8)}</p>
                </td>
                <td class="p-6">
                    <span class="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-600">${gym.username}</span>
                    <span class="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-300 ml-2">••••••</span>
                </td>
                <td class="p-6 text-right space-x-4">
                    <button onclick="toggleGymStatus('${d.id}', ${isPaused})" class="text-[10px] font-black uppercase tracking-widest transition ${toggleColor}">
                        ${toggleText}
                    </button>
                    <button onclick="removeGym('${d.id}')" class="text-[10px] font-black text-slate-300 hover:text-rose-600 uppercase tracking-widest transition">
                        Terminate
                    </button>
                </td>
            </tr>`;
        });
    } catch (e) {
        console.error(e);
        tableBody.innerHTML = `<tr><td colspan="3" class="p-10 text-center text-red-500">Sync Error.</td></tr>`;
    }
}

// --- 4. TOGGLE PAUSE STATUS (New) ---
window.toggleGymStatus = async (id, currentStatus) => {
    const action = currentStatus ? "RESUME" : "PAUSE";
    if (!confirm(`Are you sure you want to ${action} this gym's access?`)) return;

    try {
        const gymRef = doc(db, "gyms", id);
        await updateDoc(gymRef, {
            isPaused: !currentStatus
        });
        loadGyms();
    } catch (e) {
        alert("Error updating status.");
    }
};

// --- 5. ONBOARD GYM ---
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
        isPaused: false, // Default to active
        createdAt: new Date().toISOString()
    });

    document.getElementById('newGymName').value = "";
    document.getElementById('newGymUser').value = "";
    document.getElementById('newGymPass').value = "";
    
    btn.disabled = false;
    btn.innerText = "Create Gym Portal";
    loadGyms();
};

// --- 6. REMOVE GYM ---
window.removeGym = async (id) => {
    if(confirm("CRITICAL: Permanent deletion. Continue?")) {
        await deleteDoc(doc(db, "gyms", id));
        loadGyms();
    }
};

window.adminLogout = () => {
    localStorage.removeItem('isMasterAdmin');
    location.reload();
};