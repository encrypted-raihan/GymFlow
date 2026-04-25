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

// --- SYNC GYM NAME ---
document.addEventListener('DOMContentLoaded', () => {
    const gymName = localStorage.getItem("activeGymName") || "GymFlow Pro";
    const displayElement = document.getElementById('displayGymName');
    if (displayElement) {
        displayElement.innerText = gymName;
    }
    // Load trainers for the dropdown on page load
    loadTrainerDropdown();
});

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

// --- UTILITY: GET CURRENT MONTH CODE (YYYY-MM) ---
function getCurrentMonthCode() {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
}

// 1. DATA INITIALIZATION
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

// Function to load trainers into the dropdown
async function loadTrainerDropdown() {
    const trainerSelect = document.getElementById('regTrainer');
    if (!trainerSelect) return;

    const activeGymId = localStorage.getItem("activeGymId") || localStorage.getItem("gymId");

    try {
        const q = query(collection(db, "trainers"), where("gymId", "==", activeGymId));
        const snap = await getDocs(q);
        
        trainerSelect.innerHTML = '<option value="None">No Trainer Assigned</option>';
        
        snap.forEach(doc => {
            const trainer = doc.data();
            const option = document.createElement('option');
            option.value = doc.id; 
            option.textContent = trainer.name; 
            trainerSelect.appendChild(option);
        });
    } catch (e) {
        console.error("Error loading trainers:", e);
    }
}

function updateStats() {
    const cur = getCurrentMonthCode();
    const activeMembers = allMembers.filter(m => m.status !== 'inactive');
    const paidMembersThisMonth = activeMembers.filter(m => m.payments?.includes(cur));
    const paidCount = paidMembersThisMonth.length;
    const percent = activeMembers.length > 0 ? Math.round((paidCount / activeMembers.length) * 100) : 0;

    let currentMonthRevenue = 0;
    paidMembersThisMonth.forEach(m => {
        currentMonthRevenue += parseFloat(m.monthlyFee) || 0;
    });

    allMembers.forEach(m => {
        // Compatibility check for joinDate or joinedDate
        const joinData = m.joinDate || m.joinedDate;
        if (joinData) {
            const d = new Date(joinData);
            const code = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
            if (code === cur) {
                currentMonthRevenue += parseFloat(m.joiningFee) || 0;
            }
        }
    });

    document.getElementById('statTotal').innerText = activeMembers.length;
    document.getElementById('statRevenue').innerText = currentMonthRevenue.toLocaleString('en-IN');
    document.getElementById('statPercent').innerText = percent + "%";
    document.getElementById('statBar').style.width = percent + "%";
    document.getElementById('countAll').innerText = activeMembers.length;
    document.getElementById('countUnpaid').innerText = activeMembers.length - paidCount;
}

// 2. MEMBER TABLE
window.render = () => {
    const tbody = document.getElementById('memberTableBody');
    const cur = getCurrentMonthCode();
    const search = document.getElementById('searchBar').value.toLowerCase();
    
    let filtered = allMembers.filter(m => m.name.toLowerCase().includes(search));
    
    if(currentFilter === 'unpaid') {
        filtered = filtered.filter(m => m.status !== 'inactive' && !m.payments?.includes(cur));
    }

    const unpaidList = filtered.filter(m => m.status !== 'inactive' && !m.payments?.includes(cur));
    const settledList = filtered.filter(m => m.status === 'inactive' || m.payments?.includes(cur));
    const sorted = [...unpaidList, ...settledList];

    const totalPages = Math.ceil(sorted.length / rowsPerPage) || 1;
    const items = sorted.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    document.getElementById('currentPageNum').innerText = currentPage;
    document.getElementById('totalPageNum').innerText = totalPages;

    let html = "";
    items.forEach((m, idx) => {
        const isPaid = m.payments?.includes(cur);
        const isPaused = m.status === 'inactive';
        const isDue = !isPaid && !isPaused;

        if(idx === 0 && isDue) {
            html += `<tr class="section-divider"><td colspan="3" class="px-6 py-4 text-[10px] font-black text-red-500 uppercase tracking-[0.2em]">⚠️ Immediate Dues Pending</td></tr>`;
        }
        
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

// 3. LIVE FEED
window.setLiveFilter = (part) => {
    activeLiveFilter = part;
    document.querySelectorAll('.live-f-btn').forEach(btn => {
        const btnText = btn.innerText.toLowerCase();
        const partText = part.toLowerCase();
        const match = btnText === partText;
        btn.className = match ? "live-f-btn px-4 py-2 rounded-xl text-[8px] font-black uppercase bg-slate-900 text-white shadow-sm whitespace-nowrap" : "live-f-btn px-4 py-2 rounded-xl text-[8px] font-black uppercase bg-white border border-slate-100 text-slate-400 whitespace-nowrap";
    });
    renderLive();
};

window.renderLive = () => {
    const grid = document.getElementById('liveMembersGrid');
    const liveNow = allMembers.filter(m => m.isInside === true);

    const filtered = activeLiveFilter === 'all' ? liveNow : liveNow.filter(m => {
        if (!m.activeWorkoutParts || m.activeWorkoutParts.length === 0) return false;
        const filterLower = activeLiveFilter.toLowerCase();
        return m.activeWorkoutParts.some(p => {
            const pLower = p.toLowerCase();
            return pLower.includes(filterLower) || filterLower.includes(pLower);
        });
    });

    document.getElementById('countTraining').innerText = `${liveNow.length} MEMBERS TRAINING NOW`;

    if(filtered.length === 0) {
        grid.innerHTML = `<div class="col-span-full py-12 text-center border-2 border-dashed border-slate-100 rounded-[2rem] text-[10px] text-slate-300 font-bold uppercase tracking-widest">Floor is empty</div>`;
        return;
    }

    grid.innerHTML = filtered.map(m => {
        const parts = m.activeWorkoutParts && m.activeWorkoutParts.length > 0 ? m.activeWorkoutParts : ['General'];
        let timeDisplay = "Just Joined";
        const rawTime = m.sessionStart || m.startTime || m.checkIn || m.lastIn;

        if (rawTime) {
            let startDate = rawTime.seconds ? new Date(rawTime.seconds * 1000) : new Date(rawTime);
            const now = new Date();
            const diffInMs = now.getTime() - startDate.getTime();
            const diffInMins = Math.floor(diffInMs / 60000);
            if (!isNaN(startDate.getTime()) && diffInMins >= 0) {
                if (diffInMins >= 60) {
                    const hrs = Math.floor(diffInMins / 60);
                    const mins = diffInMins % 60;
                    timeDisplay = `${hrs}h ${mins}m ago`;
                } else if (diffInMins === 0) {
                    timeDisplay = "Joined seconds ago";
                } else {
                    timeDisplay = `${diffInMins}m ago`;
                }
            }
        }

        return `
        <div class="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between hover:scale-[1.02] transition-transform">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h4 class="font-black text-slate-900 text-sm tracking-tight">${m.name}</h4>
                    <p class="text-[8px] font-bold text-blue-600 uppercase tracking-tighter mt-1">${timeDisplay}</p>
                </div>
                <div class="bg-green-500 w-2 h-2 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
            </div>
            <div class="flex flex-wrap gap-1.5">
                ${parts.map(p => `<span class="bg-slate-900 text-white text-[7px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest">${p}</span>`).join('')}
            </div>
        </div>`;
    }).join('');
};

// 4. PROFILE MODAL
window.openProfile = (id) => {
    selectedId = id;
    refreshProfileUI();
    document.getElementById('profileModal').classList.remove('hidden');
};

window.closeProfile = () => {
    selectedId = null;
    document.getElementById('profileModal').classList.add('hidden');
};

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
    const curCode = getCurrentMonthCode();
    const isPaid = m.payments?.includes(curCode);

    const whatsappBtnHtml = !isPaid && m.status !== 'inactive' ? `
        <button onclick="sendWhatsAppReminder('${m.phone}', '${m.name}')" class="mt-4 w-full bg-green-600 text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-green-700 transition-colors">
            📲 Send WhatsApp Reminder
        </button>` : '';

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
        ${whatsappBtnHtml}
    </div>`;

    const hist = document.getElementById('historyList');
    hist.innerHTML = "";
    
    // FIX: Compatibility for both joinDate (string) and joinedDate (timestamp)
    let ptr = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const joinData = m.joinDate || m.joinedDate || Date.now();
    const joinDateObj = new Date(joinData);
    
    // Safety fallback if date is invalid
    const validJoinDate = isNaN(joinDateObj.getTime()) ? new Date("2025-01-01") : joinDateObj;
    const limit = new Date(validJoinDate.getFullYear(), validJoinDate.getMonth(), 1);

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

// 5. ACTIONS
window.sendWhatsAppReminder = (phone, name) => {
    const monthName = new Date().toLocaleString('default', { month: 'long' });
    const msg = `ഹലോ ${name}, GymFlow-ൽ നിങ്ങളുടെ ഈ മാസത്തെ (${monthName}) ഫീസ്‌ അടക്കാൻ സമയമായി. ദയവായി ശ്രദ്ധിക്കുമല്ലോ.`;
    window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`, '_blank');
};

window.togglePay = async (code) => {
    const m = allMembers.find(x => x.id === selectedId);
    if (!m) return;
    let p = m.payments || [];
    const isCurrentlyPaid = p.includes(code);
    const [year, month] = code.split('-');
    const dateLabel = new Date(year, parseInt(month) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
    
    const message = isCurrentlyPaid ? `Are you sure you want to undo the payment for ${dateLabel}?` : `Mark ${dateLabel} as Paid for ${m.name}?`;
    
    if (confirm(message)) {
        p = isCurrentlyPaid ? p.filter(x => x !== code) : [...p, code];
        await updateDoc(doc(db, "members", selectedId), { payments: p });
    }
};

window.addNewMember = async () => {
    const name = document.getElementById('regName').value;
    const phone = document.getElementById('regPhone').value;
    const plan = document.getElementById('regPlan').value;
    const trainerId = document.getElementById('regTrainer').value;
    const monthlyFee = parseFloat(document.getElementById('regMonthlyFee').value);
    const joiningFee = parseFloat(document.getElementById('regJoiningFee').value);
    const activeGymId = localStorage.getItem("activeGymId") || localStorage.getItem("gymId");
    
    if (!name || !phone) return alert("Name and Phone are required");

    try {
        await addDoc(collection(db, "members"), {
            gymId: activeGymId,
            name,
            phone,
            plan,
            trainerId,
            monthlyFee,
            joiningFee,
            status: 'active',
            joinDate: new Date().toISOString().slice(0, 10), 
            lastPaymentDate: Date.now()
        });

        alert("Member registered !");
        location.reload();
    } catch (e) {
        console.error(e);
    }
};

window.deleteMember = async () => {
    if(confirm("Delete?")) {
        await deleteDoc(doc(db, "members", selectedId));
        window.closeProfile();
    }
};

// 6. NAVIGATION & SIDEBAR HIGHLIGHTING
window.setFilter = (f) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    currentFilter = f;
    currentPage = 1;
    document.getElementById('listTitle').innerText = f === 'all' ? 'Active Roster' : 'Pending Dues';
    
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

    if (window.innerWidth < 1024 && typeof window.toggleMobileMenu === 'function') {
        window.toggleMobileMenu();
    }
    render();
};

window.changePage = (dir) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const cur = getCurrentMonthCode();
    let filtered = allMembers;
    if(currentFilter === 'unpaid') {
        filtered = allMembers.filter(m => m.status !== 'inactive' && !m.payments?.includes(cur));
    }
    const total = Math.ceil(filtered.length / rowsPerPage);
    if (currentPage + dir > 0 && currentPage + dir <= total) {
        currentPage += dir;
        render();
    }
};

document.getElementById('searchBar').addEventListener('input', () => {
    currentPage = 1;
    render();
});

setInterval(renderLive, 60000);
loadMembers();