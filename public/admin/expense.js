import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

const getMonthKey = () => new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
document.getElementById('currentMonthTitle').innerText = getMonthKey();

// 1. LEDGER LOGIC
window.addExpense = async () => {
    const category = document.getElementById('expCategory').value;
    const title = document.getElementById('expTitle').value;
    const amount = parseFloat(document.getElementById('expAmount').value);

    if (!title || isNaN(amount)) return alert("Fill title and amount");

    try {
        await addDoc(collection(db, "expenses"), {
            gymId, category, title, amount,
            monthKey: getMonthKey(),
            timestamp: Date.now()
        });
        document.getElementById('expTitle').value = "";
        document.getElementById('expAmount').value = "";
        loadFinancials();
    } catch (e) { console.error(e); }
};

async function loadFinancials() {
    try {
        const q = query(collection(db, "expenses"), where("gymId", "==", gymId));
        const snap = await getDocs(q);
        const activeList = document.getElementById('expenseList');
        const archiveList = document.getElementById('archiveList');
        const currentMonth = getMonthKey();
        
        activeList.innerHTML = ""; 
        archiveList.innerHTML = "";
        
        let monthlyTotal = 0, fixedTotal = 0, salaryTotal = 0;
        let archives = {}; // Structure: { "Month Year": { total: 0, categories: { "Category": 0 } } }

        snap.forEach(d => {
            const data = d.data();
            if (data.monthKey === currentMonth) {
                monthlyTotal += data.amount;
                if (data.category === 'Rent' || data.category === 'Electricity') fixedTotal += data.amount;
                if (data.category === 'Salary') salaryTotal += data.amount;

                activeList.innerHTML += `
                <div class="glass p-4 rounded-2xl flex justify-between items-center border border-white shadow-sm mb-2 expense-card">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-[8px] uppercase">
                            ${data.category.substring(0,2)}
                        </div>
                        <div>
                            <p class="font-bold text-slate-800 text-[12px] leading-tight">${data.title}</p>
                            <p class="text-[8px] text-slate-400 font-black uppercase tracking-widest">${data.category}</p>
                        </div>
                    </div>
                    <div class="text-right flex items-center gap-4">
                        <p class="font-black text-slate-900 text-xs">₹${data.amount}</p>
                        <button onclick="deleteEntry('${d.id}')" class="text-slate-300 hover:text-red-500 transition px-1">✕</button>
                    </div>
                </div>`;
            } else {
                // Logic for Detailed History
                if (!archives[data.monthKey]) {
                    archives[data.monthKey] = { total: 0, categories: {} };
                }
                archives[data.monthKey].total += data.amount;
                
                if (!archives[data.monthKey].categories[data.category]) {
                    archives[data.monthKey].categories[data.category] = 0;
                }
                archives[data.monthKey].categories[data.category] += data.amount;
            }
        });

        document.getElementById('totalSpend').innerText = `₹${monthlyTotal}`;
        document.getElementById('fixedTotal').innerText = `₹${fixedTotal}`;
        document.getElementById('staffTotal').innerText = `₹${salaryTotal}`;

        // Render Detailed History Cards
        Object.keys(archives).forEach(month => {
            const monthData = archives[month];
            
            // Generate category breakdown UI
            let categoryHtml = Object.keys(monthData.categories).map(cat => `
                <div class="flex justify-between items-center mt-2 pt-2 border-t border-slate-50">
                    <span class="text-[8px] font-black text-slate-400 uppercase tracking-tighter">${cat}</span>
                    <span class="text-[10px] font-bold text-slate-600">₹${monthData.categories[cat]}</span>
                </div>
            `).join('');

            archiveList.innerHTML += `
            <div class="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <p class="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">${month}</p>
                        <p class="text-xl font-black text-slate-800">₹${monthData.total}</p>
                    </div>
                    <div class="bg-slate-50 px-2 py-1 rounded-lg text-[7px] font-black text-slate-400 uppercase">Archive</div>
                </div>
                <div class="mt-4">
                    ${categoryHtml}
                </div>
            </div>`;
        });
    } catch (e) { console.error(e); }
}

// 2. STAFF & VARIABLE PAYROLL
window.addStaff = async () => {
    const name = document.getElementById('staffName').value;
    const salary = parseFloat(document.getElementById('staffBaseSalary').value);
    if (!name || isNaN(salary)) return alert("Enter valid staff name and salary");

    try {
        await addDoc(collection(db, "staff"), { gymId, name, baseSalary: salary });
        document.getElementById('staffName').value = "";
        document.getElementById('staffBaseSalary').value = "";
        loadStaff();
    } catch (e) { console.error(e); }
};

window.payStaff = async (staffId, name) => {
    const amountInput = document.getElementById(`pay-amt-${staffId}`);
    const amount = parseFloat(amountInput.value);

    if (isNaN(amount) || amount <= 0) return alert("Invalid amount");
    if (!confirm(`Log ₹${amount} salary for ${name}?`)) return;

    try {
        await addDoc(collection(db, "expenses"), {
            gymId, category: "Salary", title: `Salary: ${name}`,
            amount: amount, monthKey: getMonthKey(), timestamp: Date.now()
        });
        loadFinancials();
    } catch (e) { console.error(e); }
};

async function loadStaff() {
    try {
        const q = query(collection(db, "staff"), where("gymId", "==", gymId));
        const snap = await getDocs(q);
        const list = document.getElementById('staffList');
        list.innerHTML = "";

        snap.forEach(d => {
            const s = d.data();
            list.innerHTML += `
            <div class="bg-white/50 p-4 rounded-2xl border border-white shadow-sm mb-3">
                <div class="flex justify-between items-center mb-3">
                    <div>
                        <p class="text-xs font-black text-slate-800">${s.name}</p>
                        <p class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Base: ₹${s.baseSalary}</p>
                    </div>
                    <button onclick="deleteStaff('${d.id}')" class="text-slate-300 hover:text-red-400 text-xs font-bold px-2">✕</button>
                </div>
                <div class="flex gap-2">
                    <input id="pay-amt-${d.id}" type="number" value="${s.baseSalary}" 
                        class="w-24 bg-white border border-slate-100 rounded-lg p-2 text-xs font-black text-blue-600 outline-none">
                    <button onclick="payStaff('${d.id}', '${s.name}')" 
                        class="flex-1 bg-white border border-slate-100 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition shadow-sm">
                        Pay
                    </button>
                </div>
            </div>`;
        });
    } catch (e) { console.error(e); }
}

window.deleteEntry = async (id) => { if (confirm("Delete expense?")) { await deleteDoc(doc(db, "expenses", id)); loadFinancials(); } };
window.deleteStaff = async (id) => { if (confirm("Remove staff?")) { await deleteDoc(doc(db, "staff", id)); loadStaff(); } };

loadFinancials(); loadStaff();