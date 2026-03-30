import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc, onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
const gymId = localStorage.getItem("activeGymId");

if (!gymId) window.location.href = "login.html";

let allMembers = [];
let currentFilter = 'all';
let selectedId = null;

document.getElementById('displayGymName').innerText = localStorage.getItem("activeGymName") || "GYMFLOW";

// --- LOAD & SYNC ---
function loadMembers() {
    const q = query(collection(db, "members"), where("gymId", "==", gymId));
    onSnapshot(q, (snap) => {
        allMembers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        updateStats();
        updatePlanDropdown();
        render();
    });
}

// --- STATS & REVENUE ---
function updateStats() {
    const curMonth = new Date().toISOString().slice(0, 7);
    const active = allMembers.filter(m => m.status !== 'inactive');
    const paidCount = active.filter(m => m.payments?.includes(curMonth)).length;

    let totalRevenue = 0;
    allMembers.forEach(m => {
        const mFee = parseFloat(m.monthlyFee) || 0;
        const jFee = parseFloat(m.joiningFee) || 0;
        const count = m.payments ? m.payments.length : 0;
        totalRevenue += (count * mFee) + jFee;
    });

    document.getElementById('statTotal').innerText = active.length;
    document.getElementById('statRevenue').innerText = totalRevenue.toLocaleString('en-IN');
    
    const percent = active.length > 0 ? Math.round((paidCount / active.length) * 100) : 0;
    document.getElementById('statPercent').innerText = percent + "%";
    document.getElementById('statBar').style.width = percent + "%";

    if(document.getElementById('countAll')) document.getElementById('countAll').innerText = active.length;
    if(document.getElementById('countUnpaid')) document.getElementById('countUnpaid').innerText = active.length - paidCount;
}

// --- HIGHLIGHTING LOGIC ---
window.setFilter = (f) => {
    currentFilter = f;
    const navAll = document.getElementById('nav-all');
    const navUnpaid = document.getElementById('nav-unpaid');

    if (f === 'all') {
        navAll.classList.add('active-nav');
        navAll.classList.remove('text-slate-500', 'bg-transparent');
        navUnpaid.classList.remove('active-nav');
        navUnpaid.classList.add('text-slate-500', 'bg-transparent');
        document.getElementById('listTitle').innerText = "Active Roster";
    } else {
        navUnpaid.classList.add('active-nav');
        navUnpaid.classList.remove('text-slate-500', 'bg-transparent');
        navAll.classList.remove('active-nav');
        navAll.classList.add('text-slate-500', 'bg-transparent');
        document.getElementById('listTitle').innerText = "Pending Dues";
    }
    render();
};

// --- ADD MEMBER ---
window.addNewMember = async () => {
    const name = document.getElementById('regName').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const plan = document.getElementById('regPlan').value.trim() || "Normal";
    const mFee = document.getElementById('regMonthlyFee').value || 0;
    const jFee = document.getElementById('regJoiningFee').value || 0;

    if(!name || !phone) return alert("Missing Name/Phone");

    await addDoc(collection(db, "members"), {
        name, phone, plan, gymId,
        monthlyFee: parseFloat(mFee),
        joiningFee: parseFloat(jFee),
        status: 'active',
        joinDate: new Date().toISOString().slice(0, 10),
        payments: [new Date().toISOString().slice(0, 7)],
        isInside: false
    });

    // Reset fields
    document.getElementById('regName').value = "";
    document.getElementById('regPhone').value = "";
    document.getElementById('regPlan').value = "";
    document.getElementById('regMonthlyFee').value = "";
    document.getElementById('regJoiningFee').value = "";
    document.getElementById('regSection').classList.add('hidden');
};

// --- RENDER TABLE ---
function render() {
    const tableBody = document.getElementById('memberTableBody');
    const searchVal = document.getElementById('searchBar').value.toLowerCase();
    const curMonth = new Date().toISOString().slice(0, 7);

    const filtered = allMembers.filter(m => {
        const matches = m.name.toLowerCase().includes(searchVal);
        if (currentFilter === 'unpaid') return matches && m.status !== 'inactive' && !m.payments?.includes(curMonth);
        return matches;
    });

    tableBody.innerHTML = filtered.map(m => {
        const isPaid = m.payments?.includes(curMonth);
        const isPaused = m.status === 'inactive';
        return `
        <tr class="border-b border-slate-50 hover:bg-slate-50 transition">
            <td class="p-6">
                <p class="text-sm font-bold text-slate-900">${m.name}</p>
                <span class="text-[8px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-black uppercase">${m.plan || 'Standard'}</span>
            </td>
            <td class="p-6 text-sm text-slate-500">${m.phone}</td>
            <td class="p-6 text-center">
                <span class="px-3 py-1 rounded-full text-[9px] font-black uppercase ${isPaused ? 'bg-slate-100 text-slate-400' : (isPaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}">
                    ${isPaused ? 'Paused' : (isPaid ? 'Paid' : 'Unpaid')}
                </span>
            </td>
            <td class="p-6 text-right">
                <button onclick="openProfile('${m.id}')" class="text-[10px] font-black text-blue-600 uppercase tracking-widest">Manage</button>
            </td>
        </tr>`;
    }).join('');
}

// --- PLAN DROPDOWN ---
function updatePlanDropdown() {
    const planList = document.getElementById('planOptions');
    if (!planList) return;
    const uniquePlans = [...new Set(allMembers.map(m => m.plan).filter(p => p))];
    planList.innerHTML = uniquePlans.map(p => `<option value="${p}">`).join('');
}

// --- PROFILE & PAY ---
window.openProfile = (id) => {
    selectedId = id;
    const m = allMembers.find(x => x.id === id);
    document.getElementById('profName').innerText = m.name;
    const list = document.getElementById('paymentList');
    list.innerHTML = "";
    for(let i=0; i<6; i++) {
        const d = new Date(); d.setMonth(d.getMonth() - i);
        const code = d.toISOString().slice(0, 7);
        const isPaid = m.payments?.includes(code);
        list.innerHTML += `
            <div class="flex justify-between p-4 bg-slate-50 rounded-2xl items-center">
                <span class="text-xs font-bold text-slate-600">${d.toLocaleString('default', {month:'long'})}</span>
                <button onclick="togglePay('${code}')" class="text-[9px] font-black px-5 py-2 rounded-xl text-white ${isPaid ? 'bg-green-500' : 'bg-blue-600'}">
                    ${isPaid ? 'PAID' : 'MARK PAID'}
                </button>
            </div>`;
    }
    document.getElementById('profileModal').classList.remove('hidden');
};

window.togglePay = async (code) => {
    const m = allMembers.find(x => x.id === selectedId);
    let pays = m.payments || [];
    pays = pays.includes(code) ? pays.filter(p => p !== code) : [...pays, code];
    await updateDoc(doc(db, "members", selectedId), { payments: pays });
    openProfile(selectedId);
};

window.deleteMember = async () => { if(confirm("Delete?")) { await deleteDoc(doc(db, "members", selectedId)); closeProfile(); } };
document.getElementById('searchBar').addEventListener('input', render);

loadMembers();