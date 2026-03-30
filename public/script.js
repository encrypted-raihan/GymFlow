import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
let activeLiveFilter = 'all';
let currentPage = 1;
const rowsPerPage = 7; 

document.getElementById('displayGymName').innerText = localStorage.getItem("activeGymName");

// --- Real-time Listener ---
function loadMembers() {
    const q = query(collection(db, "members"), where("gymId", "==", gymId));
    
    onSnapshot(q, (snap) => {
        allMembers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        updateStats();
        render();
        renderLiveDashboard();
    }, (error) => {
        console.error("Snapshot error:", error);
    });
}

function updateStats() {
    const curMonth = new Date().toISOString().slice(0, 7);
    const active = allMembers.filter(m => m.status !== 'inactive');
    
    const trainingNowCount = active.filter(m => m.isInside === true).length;
    const paidCount = active.filter(m => m.payments?.includes(curMonth)).length;
    const unpaidCount = active.length - paidCount;
    const percent = active.length > 0 ? Math.round((paidCount / active.length) * 100) : 0;
    const unpaidPercent = active.length > 0 ? Math.round((unpaidCount / active.length) * 100) : 0;

    document.getElementById('statTotal').innerText = active.length;
    document.getElementById('statPercent').innerText = percent + "%";
    document.getElementById('statBar').style.width = percent + "%";

    if(document.getElementById('countTraining')) {
        document.getElementById('countTraining').innerText = trainingNowCount;
    }

    if(document.getElementById('revPaidBar')) document.getElementById('revPaidBar').style.height = percent + "%";
    if(document.getElementById('revDueBar')) document.getElementById('revDueBar').style.height = unpaidPercent + "%";
    
    if(document.getElementById('livePeakBar')) {
        const peakHeight = Math.min(trainingNowCount * 15, 100); 
        document.getElementById('livePeakBar').style.height = peakHeight + "%";
    }

    if(document.getElementById('countAll')) document.getElementById('countAll').innerText = active.length;
    if(document.getElementById('countUnpaid')) document.getElementById('countUnpaid').innerText = unpaidCount;
}

// --- Sidebar Filter (Members/Pending) ---
window.setFilter = (f) => { 
    currentFilter = f; 
    currentPage = 1; 
    document.getElementById('listTitle').innerText = f === 'all' ? 'Active Roster' : 'Pending Dues';

    // Sidebar UI logic
    const container = document.getElementById('sidebarContainer');
    if (container) {
        const buttons = container.querySelectorAll('button');
        buttons.forEach(btn => {
            const isTarget = (f === 'all' && btn.innerText.includes('Members')) || 
                             (f === 'unpaid' && btn.innerText.includes('Pending'));
            
            if (isTarget) {
                btn.classList.add('bg-slate-900', 'text-white', 'shadow-sm');
                btn.classList.remove('text-slate-500', 'bg-transparent');
            } else {
                btn.classList.remove('bg-slate-900', 'text-white', 'shadow-sm');
                btn.classList.add('text-slate-500', 'bg-transparent');
            }
        });
    }
    render(); 
};

// --- Live Dashboard Filter ---
window.setLiveFilter = (f) => {
    activeLiveFilter = f;

    // Live UI logic
    const container = document.getElementById('liveFilterContainer');
    if (container) {
        const buttons = container.querySelectorAll('button');
        buttons.forEach(btn => {
            if (btn.innerText.toLowerCase() === f.toLowerCase()) {
                btn.classList.remove('bg-white', 'text-slate-400', 'border', 'border-slate-100');
                btn.classList.add('bg-slate-900', 'text-white', 'shadow-sm');
            } else {
                btn.classList.add('bg-white', 'text-slate-400', 'border', 'border-slate-100');
                btn.classList.remove('bg-slate-900', 'text-white', 'shadow-sm');
            }
        });
    }
    renderLiveDashboard();
};

function renderLiveDashboard() {
    const container = document.getElementById('liveMembersGrid');
    if(!container) return;

    const liveNow = allMembers.filter(m => m.isInside === true);
    const displayList = activeLiveFilter === 'all' 
        ? liveNow 
        : liveNow.filter(m => m.activeWorkoutParts?.includes(activeLiveFilter));

    if (displayList.length === 0) {
        container.innerHTML = `
            <div class="col-span-full py-10 text-center border-2 border-dashed border-slate-100 rounded-[2.5rem]">
                <p class="text-slate-400 font-medium text-xs italic">No one training ${activeLiveFilter === 'all' ? 'right now' : activeLiveFilter} focus.</p>
            </div>`;
        return;
    }

    container.innerHTML = displayList.map(m => {
        const startTime = m.lastIn ? new Date(m.lastIn) : new Date();
        const diffMins = Math.round((new Date() - startTime) / 60000);

        return `
        <div class="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
            <div class="flex justify-between items-start mb-3">
                <div>
                    <h4 class="font-black text-slate-900 text-xs tracking-tight">${m.name}</h4>
                    <span class="text-[8px] font-bold text-blue-500 uppercase tracking-widest">${diffMins}m in session</span>
                </div>
                <div class="bg-green-500 w-1.5 h-1.5 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]"></div>
            </div>
            <div class="flex flex-wrap gap-1">
                ${(m.activeWorkoutParts || ['General']).map(part => `
                    <span class="bg-blue-50 text-blue-600 text-[7px] font-black px-2 py-0.5 rounded-md uppercase tracking-tighter">
                        ${part}
                    </span>
                `).join('')}
            </div>
        </div>`;
    }).join('');
}

window.changePage = (dir) => {
    currentPage += dir;
    render();
};

function render() {
    const tableBody = document.getElementById('memberTableBody');
    const searchBar = document.getElementById('searchBar');
    const searchVal = searchBar ? searchBar.value.toLowerCase() : "";
    const curMonth = new Date().toISOString().slice(0, 7);
    
    let filtered = allMembers.filter(m => {
        const matchesSearch = m.name.toLowerCase().includes(searchVal);
        if (currentFilter === 'unpaid') {
            return matchesSearch && m.status !== 'inactive' && !m.payments?.includes(curMonth);
        }
        return matchesSearch;
    });

    filtered.sort((a, b) => {
        const aPaid = a.payments?.includes(curMonth);
        const bPaid = b.payments?.includes(curMonth);
        if (a.status === 'inactive' && b.status !== 'inactive') return 1;
        if (a.status !== 'inactive' && b.status === 'inactive') return -1;
        return aPaid - bPaid; 
    });

    const totalPages = Math.ceil(filtered.length / rowsPerPage);
    if (currentPage > totalPages) currentPage = totalPages || 1;
    const start = (currentPage - 1) * rowsPerPage;
    const paginatedItems = filtered.slice(start, start + rowsPerPage);

    document.getElementById('currentPageNum').innerText = currentPage;
    document.getElementById('totalPageNum').innerText = totalPages || 1;
    document.getElementById('prevBtn').disabled = currentPage === 1;
    document.getElementById('nextBtn').disabled = currentPage === totalPages || totalPages === 0;

    tableBody.innerHTML = "";
    let lastType = null;

    paginatedItems.forEach(m => {
        const hasPaid = m.payments?.includes(curMonth);
        const isPaused = m.status === 'inactive';
        const isTrainingNow = m.isInside === true;
        
        let currentType = isPaused ? 'PAUSED' : (hasPaid ? 'CLEARED' : 'ACTION REQUIRED');
        
        if (currentType !== lastType) {
            const bgColor = isPaused ? 'bg-slate-100 text-slate-500' : (hasPaid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700');
            tableBody.innerHTML += `
                <tr class="${bgColor}">
                    <td colspan="4" class="px-6 py-2 text-[9px] font-black uppercase tracking-[0.2em]">
                        ${currentType}
                    </td>
                </tr>`;
            lastType = currentType;
        }

        tableBody.innerHTML += `
        <tr class="transition-colors group border-b border-slate-50">
            <td class="p-6">
                <div class="flex items-center gap-3">
                    <div class="w-2 h-2 rounded-full ${isPaused ? 'bg-slate-300' : (hasPaid ? 'bg-green-500' : 'bg-red-500 animate-pulse')}"></div>
                    <div>
                        <div class="flex items-center gap-2">
                            <p class="text-sm font-bold text-slate-900 group-hover:text-blue-600">${m.name}</p>
                            ${isTrainingNow ? `
                                <span class="flex items-center gap-1.5">
                                    <span class="flex h-1.5 w-1.5 relative">
                                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                        <span class="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                                    </span>
                                    <span class="text-[7px] font-black text-blue-500 uppercase tracking-tighter">
                                        FOCUS: ${(m.activeWorkoutParts || []).join(', ')}
                                    </span>
                                </span>
                            ` : ''}
                        </div>
                        <p class="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Member Since ${m.joinDate?.slice(0,7) || 'N/A'}</p>
                    </div>
                </div>
            </td>
            <td class="p-6 text-sm font-semibold text-slate-500">${m.phone}</td>
            <td class="p-6 text-center">
                <span class="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-tight 
                    ${isPaused ? 'bg-slate-100 text-slate-400' : (hasPaid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}">
                    ${isPaused ? 'Inactive' : (hasPaid ? 'Paid' : 'Unpaid')}
                </span>
            </td>
            <td class="p-6 text-right">
                <button onclick="openProfile('${m.id}')" class="text-[10px] font-black text-blue-600 hover:text-slate-900 uppercase tracking-widest">Manage</button>
            </td>
        </tr>`;
    });
}

window.remindAllPending = () => {
    const curMonth = new Date().toISOString().slice(0, 7);
    const unpaid = allMembers.filter(m => m.status !== 'inactive' && !m.payments?.includes(curMonth));
    if (unpaid.length === 0) return alert("Everything clear!");
    if (confirm(`Open WhatsApp for ${unpaid.length} members?`)) {
        unpaid.forEach((m, i) => {
            setTimeout(() => {
                const msg = `Hi ${m.name}, just a friendly reminder from ${localStorage.getItem("activeGymName")} regarding your dues for ${new Date().toLocaleString('default', {month:'long'})}.`;
                window.open(`https://wa.me/${m.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
            }, i * 1500);
        });
    }
};

window.addNewMember = async () => {
    const name = document.getElementById('regName').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    if(!name || !phone) return alert("Enter details");

    await addDoc(collection(db, "members"), {
        name, 
        phone, 
        gymId, 
        status: 'active',
        joinDate: new Date().toISOString().slice(0, 10),
        payments: [new Date().toISOString().slice(0, 7)],
        isInside: false,
        lastIn: "",
        lastOut: "",
        workoutHistory: [] 
    });
    
    document.getElementById('regSection').classList.add('hidden');
    // loadMembers() is not strictly needed because onSnapshot will detect the new doc automatically
};

window.openProfile = (id) => {
    selectedId = id;
    const m = allMembers.find(x => x.id === id);
    const joinMonth = m.joinDate ? m.joinDate.slice(0, 7) : "2025-01";
    document.getElementById('profName').innerText = m.name;
    document.getElementById('profPhone').innerText = m.phone;
    const badge = document.getElementById('profStatusBadge');
    badge.innerText = m.status === 'inactive' ? "Paused" : "Active";
    badge.className = `inline-block text-[9px] font-black px-4 py-1 rounded-full uppercase mb-4 ${m.status === 'inactive' ? 'bg-slate-100 text-slate-400' : 'bg-green-50 text-green-600'}`;
    const toggleBtn = document.getElementById('statusToggleBtn');
    toggleBtn.innerText = m.status === 'inactive' ? "Resume" : "Pause";
    toggleBtn.onclick = () => toggleStatus(m.id, m.status);
    const list = document.getElementById('paymentList');
    list.innerHTML = "";
    for(let i=0; i<12; i++) {
        const d = new Date(); d.setMonth(d.getMonth() - i);
        const code = d.toISOString().slice(0, 7);
        if (code < joinMonth) break; 
        const isPaid = m.payments?.includes(code);
        list.innerHTML += `<div class="flex justify-between p-4 border border-slate-50 rounded-2xl items-center bg-slate-50/50">
            <span class="text-xs font-bold text-slate-600">${d.toLocaleString('default', {month:'long', year:'numeric'})}</span>
            <button onclick="togglePay('${code}')" class="text-[10px] font-black px-5 py-2 rounded-xl text-white ${isPaid ? 'bg-green-500' : 'bg-blue-600'}">
                ${isPaid ? 'PAID ✓' : 'MARK PAID'}
            </button></div>`;
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

async function toggleStatus(id, current) {
    const newStatus = current === 'inactive' ? 'active' : 'inactive';
    await updateDoc(doc(db, "members", id), { status: newStatus });
    openProfile(id);
}

window.sendSingleReminderFromProfile = () => {
    const m = allMembers.find(x => x.id === selectedId);
    const msg = `Hi ${m.name}, reminder for your subscription at ${localStorage.getItem("activeGymName")}.`;
    window.open(`https://wa.me/${m.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
};

window.deleteMember = async () => {
    if(confirm("Delete?")) {
        await deleteDoc(doc(db, "members", selectedId));
        closeProfile();
    }
};

document.getElementById('searchBar').addEventListener('input', render);
loadMembers();