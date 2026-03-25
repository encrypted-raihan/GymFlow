import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
let currentPage = 1;
const rowsPerPage = 7; 

document.getElementById('displayGymName').innerText = localStorage.getItem("activeGymName");

async function loadMembers() {
    const q = query(collection(db, "members"), where("gymId", "==", gymId));
    const snap = await getDocs(q);
    allMembers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    updateStats();
    render();
}

function updateStats() {
    const curMonth = new Date().toISOString().slice(0, 7);
    const active = allMembers.filter(m => m.status !== 'inactive');
    const paidCount = active.filter(m => m.payments?.includes(curMonth)).length;
    const unpaidCount = active.length - paidCount;
    const percent = active.length > 0 ? Math.round((paidCount / active.length) * 100) : 0;
    const unpaidPercent = active.length > 0 ? Math.round((unpaidCount / active.length) * 100) : 0;

    document.getElementById('statTotal').innerText = active.length;
    document.getElementById('statPercent').innerText = percent + "%";
    document.getElementById('statBar').style.width = percent + "%";

    if(document.getElementById('revPaidBar')) document.getElementById('revPaidBar').style.height = percent + "%";
    if(document.getElementById('revDueBar')) document.getElementById('revDueBar').style.height = unpaidPercent + "%";
    if(document.getElementById('countAll')) document.getElementById('countAll').innerText = active.length;
    if(document.getElementById('countUnpaid')) document.getElementById('countUnpaid').innerText = unpaidCount;
}

window.setFilter = (f) => { 
    currentFilter = f; 
    currentPage = 1; 
    document.getElementById('listTitle').innerText = f === 'all' ? 'Active Roster' : 'Pending Dues';
    render(); 
};

window.changePage = (dir) => {
    currentPage += dir;
    render();
};

function render() {
    const tableBody = document.getElementById('memberTableBody');
    const searchVal = document.getElementById('searchBar').value.toLowerCase();
    const curMonth = new Date().toISOString().slice(0, 7);
    
    // 1. Filter and Sort (Due members always first)
    let filtered = allMembers.filter(m => {
        const matchesSearch = m.name.toLowerCase().includes(searchVal);
        if (currentFilter === 'unpaid') {
            return matchesSearch && m.status !== 'inactive' && !m.payments?.includes(curMonth);
        }
        return matchesSearch;
    });

    // Sort: Due -> Paid -> Paused
    filtered.sort((a, b) => {
        const aPaid = a.payments?.includes(curMonth);
        const bPaid = b.payments?.includes(curMonth);
        if (a.status === 'inactive' && b.status !== 'inactive') return 1;
        if (a.status !== 'inactive' && b.status === 'inactive') return -1;
        return aPaid - bPaid; 
    });

    // 2. Pagination Logic
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
        
        // Determine current group type
        let currentType = isPaused ? 'PAUSED' : (hasPaid ? 'CLEARED' : 'ACTION REQUIRED');
        
        // 3. Inject Group Header if type changes (Restoring the Differentiation)
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
                        <p class="text-sm font-bold text-slate-900 group-hover:text-blue-600">${m.name}</p>
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
        name, phone, gymId, status: 'active',
        joinDate: new Date().toISOString().slice(0, 10),
        payments: [new Date().toISOString().slice(0, 7)] 
    });
    document.getElementById('regSection').classList.add('hidden');
    loadMembers();
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
    await loadMembers();
    openProfile(selectedId);
};

async function toggleStatus(id, current) {
    const newStatus = current === 'inactive' ? 'active' : 'inactive';
    await updateDoc(doc(db, "members", id), { status: newStatus });
    await loadMembers();
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
        loadMembers();
    }
};

document.getElementById('searchBar').addEventListener('input', render);
loadMembers();