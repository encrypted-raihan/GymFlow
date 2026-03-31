import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, where, doc, updateDoc, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

if(!gymId) window.location.href = "login.html";

let allMembers = [];
let selectedId = null;
let currentFilter = 'all';
let activeLiveFilter = 'all'; // Initialized
let currentPage = 1;
const rowsPerPage = 7; 

function loadMembers() {
    const q = query(collection(db, "members"), where("gymId", "==", gymId));
    onSnapshot(q, (snap) => {
        allMembers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        updateStats();
        render();
        renderLive();
        if(selectedId) refreshProfileUI();
    });
}

function updateStats() {
    const cur = new Date().toISOString().slice(0, 7);
    const active = allMembers.filter(m => m.status !== 'inactive');
    const paidCount = active.filter(m => m.payments?.includes(cur)).length;
    const percent = active.length > 0 ? Math.round((paidCount / active.length) * 100) : 0;
    
    let rev = 0;
    allMembers.forEach(m => {
        rev += ((m.payments?.length || 0) * (parseFloat(m.monthlyFee) || 0)) + (parseFloat(m.joiningFee) || 0);
    });

    document.getElementById('statTotal').innerText = active.length;
    document.getElementById('statRevenue').innerText = rev.toLocaleString('en-IN');
    document.getElementById('statPercent').innerText = percent + "%";
    document.getElementById('statBar').style.width = percent + "%";
    document.getElementById('countAll').innerText = active.length;
    document.getElementById('countUnpaid').innerText = active.length - paidCount;
}

// MEMBER TABLE WITH HARD SEPARATION
window.render = () => {
    const tbody = document.getElementById('memberTableBody');
    const cur = new Date().toISOString().slice(0, 7);
    const search = document.getElementById('searchBar').value.toLowerCase();
    
    let filtered = allMembers.filter(m => m.name.toLowerCase().includes(search));
    
    if(currentFilter === 'unpaid') {
        filtered = filtered.filter(m => m.status !== 'inactive' && !m.payments?.includes(cur));
    }

    // Split for visual weight
    const unpaidList = filtered.filter(m => m.status !== 'inactive' && !m.payments?.includes(cur));
    const settledList = filtered.filter(m => m.status === 'inactive' || m.payments?.includes(cur));
    const sorted = [...unpaidList, ...settledList];

    const total = Math.ceil(sorted.length / rowsPerPage) || 1;
    const items = sorted.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    document.getElementById('currentPageNum').innerText = currentPage;
    document.getElementById('totalPageNum').innerText = total;

    let html = "";
    items.forEach((m, idx) => {
        const isPaid = m.payments?.includes(cur);
        const isPaused = m.status === 'inactive';
        const isDue = !isPaid && !isPaused;

        // Group Header for Dues
        if(idx === 0 && isDue) {
            html += `<tr class="section-divider"><td colspan="3" class="px-6 py-4 text-[10px] font-black text-red-500 uppercase tracking-[0.2em]">⚠️ Immediate Dues Pending</td></tr>`;
        }
        
        // Group Header for Settled (with spacing)
        const prev = items[idx-1];
        if(prev && (!prev.payments?.includes(cur) && prev.status !== 'inactive') && (isPaid || isPaused)) {
            html += `<tr class="h-8"></tr><tr class="section-divider"><td colspan="3" class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">✅ Settled & Paused Members</td></tr>`;
        }

        html += `
        <tr class="group ${isDue ? 'due-row' : 'settled-row'} transition-all">
            <td class="p-6">
                <div class="flex items-center gap-3">
                    ${isDue ? '<div class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>' : ''}
                    <div>
                        <p class="text-sm font-bold ${isDue ? 'text-slate-900' : 'text-slate-500'}">${m.name}</p>
                        <p class="text-[9px] text-slate-400 font-bold uppercase">${m.plan || 'Normal'}</p>
                    </div>
                </div>
            </td>
            <td class="p-6 text-center">
                <span class="px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest ${isPaused ? 'bg-slate-100 text-slate-400' : (isPaid ? 'bg-green-50 text-green-600' : 'bg-red-600 text-white shadow-lg')}">
                    ${isPaused ? 'Paused' : (isPaid ? 'Paid' : 'Unpaid')}
                </span>
            </td>
            <td class="p-6 text-right">
                <button onclick="openProfile('${m.id}')" class="text-[10px] font-black text-blue-600 uppercase hover:underline">Manage</button>
            </td>
        </tr>`;
    });

    tbody.innerHTML = html || `<tr><td colspan="3" class="p-10 text-center text-slate-400 text-xs italic">No matching members</td></tr>`;
};

// LIVE FEED WITH FILTERS AND TIMER
window.setLiveFilter = (part) => {
    activeLiveFilter = part;
    document.querySelectorAll('.live-f-btn').forEach(btn => {
        const match = btn.innerText.toLowerCase() === part.toLowerCase();
        btn.className = match 
            ? "live-f-btn px-4 py-2 rounded-xl text-[8px] font-black uppercase bg-slate-900 text-white shadow-sm whitespace-nowrap"
            : "live-f-btn px-4 py-2 rounded-xl text-[8px] font-black uppercase bg-white border border-slate-100 text-slate-400 whitespace-nowrap";
    });
    renderLive();
};

window.renderLive = () => {
    const grid = document.getElementById('liveMembersGrid');
    const liveNow = allMembers.filter(m => m.isInside === true);
    
    const filtered = activeLiveFilter === 'all' 
        ? liveNow 
        : liveNow.filter(m => m.activeWorkoutParts?.includes(activeLiveFilter));

    document.getElementById('countTraining').innerText = `${liveNow.length} MEMBERS TRAINING NOW`;

    if(filtered.length === 0) {
        grid.innerHTML = `<div class="col-span-full py-12 text-center border-2 border-dashed border-slate-100 rounded-[2rem] text-[10px] text-slate-300 font-bold uppercase tracking-widest">Floor is empty</div>`;
        return;
    }

    grid.innerHTML = filtered.map(m => {
        const parts = m.activeWorkoutParts && m.activeWorkoutParts.length > 0 ? m.activeWorkoutParts : ['General'];
        
        // TIME ELAPSED LOGIC
        let timeLabel = "Just Joined";
        if(m.sessionStart) {
            const diff = Math.floor((new Date() - new Date(m.sessionStart)) / 60000);
            timeLabel = diff > 0 ? `${diff}m elapsed` : "Just Joined";
        }

        return `
        <div class="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between hover:scale-[1.02] transition-transform">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h4 class="font-black text-slate-900 text-sm tracking-tight">${m.name}</h4>
                    <p class="text-[8px] font-bold text-blue-500 uppercase tracking-tighter mt-1">${timeLabel}</p>
                </div>
                <div class="bg-green-500 w-2 h-2 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
            </div>
            <div class="flex flex-wrap gap-1.5">
                ${parts.map(p => `<span class="bg-slate-900 text-white text-[7px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest">${p}</span>`).join('')}
            </div>
        </div>`;
    }).join('');
};

// PROFILE UI
window.openProfile = (id) => { selectedId = id; refreshProfileUI(); document.getElementById('profileModal').classList.remove('hidden'); };

function refreshProfileUI() {
    const m = allMembers.find(x => x.id === selectedId);
    if(!m) return;
    document.getElementById('profName').innerText = m.name;
    document.getElementById('profPhone').innerText = m.phone;
    
    const badge = document.getElementById('profStatusBadge');
    badge.innerText = m.status === 'inactive' ? "Paused" : "Active";
    badge.className = `inline-block text-[9px] font-black px-3 py-1 rounded-full uppercase mb-4 ${m.status === 'inactive' ? 'bg-slate-100 text-slate-400' : 'bg-green-50 text-green-600'}`;

    const toggleBtn = document.getElementById('statusToggleBtn');
    toggleBtn.innerText = m.status === 'inactive' ? "Resume Member" : "Pause Member";
    toggleBtn.onclick = () => updateDoc(doc(db, "members", m.id), { status: m.status === 'inactive' ? 'active' : 'inactive' });

    const now = new Date();
    const curCode = now.toISOString().slice(0, 7);
    const isPaid = m.payments?.includes(curCode);

    document.getElementById('currentMonthContainer').innerHTML = `
        <div class="p-6 rounded-[2rem] border-2 ${isPaid ? 'border-green-100 bg-green-50/30' : 'border-blue-100 bg-blue-50/30'}">
            <div class="flex justify-between items-center">
                <div>
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Month Status</p>
                    <h4 class="text-lg font-black text-slate-900">${now.toLocaleString('default', { month: 'long', year: 'numeric' })}</h4>
                </div>
                <button onclick="togglePay('${curCode}')" class="px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm ${isPaid ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'}">
                    ${isPaid ? 'Paid ✓' : 'Mark Paid'}
                </button>
            </div>
        </div>`;

    const hist = document.getElementById('historyList');
    hist.innerHTML = "";
    let ptr = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const limit = new Date(m.joinDate || "2025-01-01");

    while (ptr >= limit) {
        const code = ptr.toISOString().slice(0, 7);
        const paid = m.payments?.includes(code);
        hist.innerHTML += `
            <div class="flex justify-between items-center p-3 hover:bg-slate-50 rounded-2xl">
                <span class="text-xs font-bold text-slate-600">${ptr.toLocaleString('default', { month: 'short', year: 'numeric' })}</span>
                <button onclick="togglePay('${code}')" class="text-[9px] font-black uppercase px-4 py-1.5 rounded-xl border ${paid ? 'border-green-200 text-green-600 bg-green-50' : 'border-slate-200 text-slate-400'}">${paid ? 'Paid' : 'Unpaid'}</button>
            </div>`;
        ptr.setMonth(ptr.getMonth() - 1);
    }
}

window.togglePay = async (code) => {
    const m = allMembers.find(x => x.id === selectedId);
    let p = m.payments || [];
    p = p.includes(code) ? p.filter(x => x !== code) : [...p, code];
    await updateDoc(doc(db, "members", selectedId), { payments: p });
};

window.addNewMember = async () => {
    const name = document.getElementById('regName').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    if(!name || !phone) return alert("Required: Name & Phone");
    await addDoc(collection(db, "members"), {
        name, phone, gymId, 
        monthlyFee: parseFloat(document.getElementById('regMonthlyFee').value) || 0,
        joiningFee: parseFloat(document.getElementById('regJoiningFee').value) || 0,
        plan: document.getElementById('regPlan').value || "Normal",
        status: 'active', isInside: false, activeWorkoutParts: [],
        joinDate: new Date().toISOString().slice(0, 10),
        payments: [new Date().toISOString().slice(0, 7)]
    });
    document.getElementById('regSection').classList.add('hidden');
};

window.deleteMember = async () => { if(confirm("Delete?")) { await deleteDoc(doc(db, "members", selectedId)); window.closeProfile(); } };
// FIXED NAVIGATION & SIDEBAR HIGHLIGHTING
window.setFilter = (f) => {
    currentFilter = f;
    currentPage = 1;

    // 1. Update the Main Title
    document.getElementById('listTitle').innerText = f === 'all' ? 'Active Roster' : 'Pending Dues';

    // 2. Sidebar Button Highlighting Logic
    const btnAll = document.getElementById('btnFilterAll');
    const btnUnpaid = document.getElementById('btnFilterUnpaid');

    const activeClass = "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold bg-slate-900 text-white shadow-sm mb-2 transition-all";
    const inactiveClass = "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold text-slate-500 bg-transparent hover:bg-white/50 transition mb-2";

    if (f === 'all') {
        btnAll.className = activeClass;
        btnUnpaid.className = inactiveClass;
    } else {
        btnAll.className = inactiveClass;
        btnUnpaid.className = activeClass;
    }

    // 3. Re-render the table
    render();
};

// 4. Initialization & Listeners
window.changePage = (dir) => { 
    const total = Math.ceil(allMembers.length / rowsPerPage);
    if (currentPage + dir > 0 && currentPage + dir <= total) {
        currentPage += dir; 
        render(); 
    }
};

document.getElementById('searchBar').addEventListener('input', () => { 
    currentPage = 1; 
    render(); 
});

// Sync timer for the Live Feed every 60 seconds
setInterval(renderLive, 60000);

// Initial Load
loadMembers();