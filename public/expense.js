import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, deleteDoc, doc, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. Firebase Configuration (Matches your GymFlow Project)
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

// 2. Identify Current Gym Session
const gymId = localStorage.getItem("activeGymId");
console.log("Current Gym Session ID:", gymId);

if (!gymId) {
    alert("Session expired. Redirecting to login.");
    window.location.href = "login.html";
}

// Helper: Generates "March 2026" style keys
const getMonthKey = () => {
    return new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
};

document.getElementById('currentMonthTitle').innerText = getMonthKey();

// 3. ADD EXPENSE FUNCTION
window.addExpense = async () => {
    const category = document.getElementById('expCategory').value;
    const title = document.getElementById('expTitle').value;
    const amount = parseFloat(document.getElementById('expAmount').value);

    if (!title || isNaN(amount)) {
        alert("Please enter a valid title and amount.");
        return;
    }

    try {
        console.log("Saving expense for:", gymId);
        await addDoc(collection(db, "expenses"), {
            gymId: gymId,
            category: category,
            title: title,
            amount: amount,
            monthKey: getMonthKey(),
            timestamp: Date.now()
        });
        
        // Reset Inputs
        document.getElementById('expTitle').value = "";
        document.getElementById('expAmount').value = "";
        
        console.log("Expense saved successfully!");
        loadFinancials(); // Refresh UI
    } catch (error) {
        console.error("Error saving expense:", error);
        alert("Firebase Error: " + error.message);
    }
};

// 4. LOAD FINANCIALS (Current Month & History)
async function loadFinancials() {
    try {
        // Querying all expenses for this gym
        const q = query(collection(db, "expenses"), where("gymId", "==", gymId));
        const snap = await getDocs(q);
        
        const activeList = document.getElementById('expenseList');
        const archiveList = document.getElementById('archiveList');
        const currentMonth = getMonthKey();
        
        activeList.innerHTML = "";
        archiveList.innerHTML = "";
        
        let monthlyTotal = 0;
        let fixedTotal = 0;
        let salaryTotal = 0;
        let archives = {}; // For history storage

        snap.forEach(d => {
            const data = d.data();
            
            if (data.monthKey === currentMonth) {
                // CURRENT MONTH LOGIC
                monthlyTotal += data.amount;
                if (data.category === 'Rent' || data.category === 'Electricity') fixedTotal += data.amount;
                if (data.category === 'Salary') salaryTotal += data.amount;

                activeList.innerHTML += `
                <div class="glass p-5 rounded-3xl flex justify-between items-center border border-white shadow-sm expense-card mb-3">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-[10px]">
                            ${data.category.substring(0,2).toUpperCase()}
                        </div>
                        <div>
                            <p class="font-bold text-slate-800 text-sm">${data.title}</p>
                            <p class="text-[9px] text-slate-400 font-black uppercase tracking-widest">${data.category}</p>
                        </div>
                    </div>
                    <div class="text-right flex items-center gap-6">
                        <p class="font-black text-slate-900 text-sm">₹${data.amount}</p>
                        <button onclick="deleteEntry('${d.id}')" class="text-slate-300 hover:text-red-500 transition px-2">✕</button>
                    </div>
                </div>`;
            } else {
                // ARCHIVE/HISTORY LOGIC
                if (!archives[data.monthKey]) archives[data.monthKey] = 0;
                archives[data.monthKey] += data.amount;
            }
        });

        // Update Totals on Top Card
        document.getElementById('totalSpend').innerText = `₹${monthlyTotal}`;
        document.getElementById('fixedTotal').innerText = `₹${fixedTotal}`;
        document.getElementById('staffTotal').innerText = `₹${salaryTotal}`;

        // Render Archive Cards
        Object.keys(archives).forEach(month => {
            archiveList.innerHTML += `
            <div class="bg-white p-6 rounded-[2rem] border border-slate-200">
                <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">${month}</p>
                <p class="text-xl font-black text-slate-800">₹${archives[month]}</p>
            </div>`;
        });

    } catch (error) {
        console.error("Error loading financials:", error);
    }
}

// 5. STAFF MANAGEMENT
window.addStaff = async () => {
    const name = document.getElementById('staffName').value;
    if (!name) return;
    try {
        await addDoc(collection(db, "staff"), { gymId, name });
        document.getElementById('staffName').value = "";
        loadStaff();
    } catch (e) { console.error(e); }
};

async function loadStaff() {
    try {
        const q = query(collection(db, "staff"), where("gymId", "==", gymId));
        const snap = await getDocs(q);
        const list = document.getElementById('staffList');
        list.innerHTML = "";
        snap.forEach(d => {
            list.innerHTML += `
            <div class="flex justify-between items-center bg-slate-50/50 p-3 rounded-xl">
                <span class="text-xs font-bold text-slate-700">${d.data().name}</span>
                <button onclick="deleteStaff('${d.id}')" class="text-slate-300 hover:text-red-400 text-[10px] font-bold">REMOVE</button>
            </div>`;
        });
    } catch (e) { console.error(e); }
}

// 6. DELETE OPERATIONS
window.deleteEntry = async (id) => {
    if (confirm("Delete this expense?")) {
        await deleteDoc(doc(db, "expenses", id));
        loadFinancials();
    }
};

window.deleteStaff = async (id) => {
    if (confirm("Remove this staff member?")) {
        await deleteDoc(doc(db, "staff", id));
        loadStaff();
    }
};

// INITIAL LOAD
loadFinancials();
loadStaff();