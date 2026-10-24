let currentUser = null;
let selectedKioskItemId = null;

document.addEventListener('DOMContentLoaded', () => {
    const userData = sessionStorage.getItem('currentUser');
    if (!userData) {
        window.location.href = 'index.html';
        return;
    }
    
    currentUser = JSON.parse(userData);
    document.getElementById('loggedUserName').textContent = currentUser.name;

    if (currentUser.role === 'employee') {
        document.getElementById('userRoleTitle').textContent = 'موظف';
        document.getElementById('viewKiosk').classList.remove('hidden');
        renderKiosk();
    } else if (currentUser.role === 'buffet') {
        document.getElementById('userRoleTitle').textContent = 'عامل بوفيه';
        document.getElementById('viewBuffet').classList.remove('hidden');
        renderBuffetQueue();
    } else if (currentUser.role === 'admin') {
        document.getElementById('userRoleTitle').textContent = 'مدير النظام';
        document.getElementById('viewManager').classList.remove('hidden');
        renderManagerDashboard();
    }

    // تحديث تلقائي كل 3 ثواني
    setInterval(() => {
        orders = JSON.parse(localStorage.getItem('buffet_orders_v5')) || [];
        if (currentUser.role === 'employee') {
            renderMyOrders();
            renderOrderHistory();
        }
        if (currentUser.role === 'buffet') renderBuffetQueue();
        if (currentUser.role === 'admin') renderManagerDashboard();
    }, 3000);
});

function logout() {
    sessionStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

/* ---------------- شاشة الموظف والتنقل بين التبويبات ---------------- */
function switchKioskTab(tabName) {
    const tabActive = document.getElementById('tabActive');
    const tabHistory = document.getElementById('tabHistory');
    const contentActive = document.getElementById('kioskActiveContent');
    const contentHistory = document.getElementById('kioskHistoryContent');

    if (tabName === 'active') {
        tabActive.className = "flex-1 py-3.5 text-sm font-black border-b-2 border-orange-500 text-orange-600 bg-white transition-all";
        tabHistory.className = "flex-1 py-3.5 text-sm font-black border-b-2 border-transparent text-slate-500 hover:bg-slate-100 transition-all";
        contentActive.classList.remove('hidden');
        contentHistory.classList.add('hidden');
        renderMyOrders();
    } else {
        tabHistory.className = "flex-1 py-3.5 text-sm font-black border-b-2 border-orange-500 text-orange-600 bg-white transition-all";
        tabActive.className = "flex-1 py-3.5 text-sm font-black border-b-2 border-transparent text-slate-500 hover:bg-slate-100 transition-all";
        contentHistory.classList.remove('hidden');
        contentActive.classList.add('hidden');
        renderOrderHistory();
    }
}

function renderKiosk() {
    const grid = document.getElementById('kioskItemsGrid');
    grid.innerHTML = '';
    menuItems.forEach(item => {
        const isSelected = selectedKioskItemId === item.id;
        const card = document.createElement('div');
        card.onclick = () => { selectedKioskItemId = item.id; renderKiosk(); };
        card.className = `cursor-pointer p-4 rounded-2xl border text-center transition-all ${
            isSelected ? 'bg-orange-50 border-orange-500 ring-2 ring-orange-200 font-bold shadow-md' : 'bg-white border-slate-200 hover:bg-slate-50'
        }`;
        card.innerHTML = `<div class="text-3xl mb-1">${item.icon}</div><div class="text-sm text-slate-800">${item.name}</div>`;
        grid.appendChild(card);
    });
    renderMyOrders();
    renderOrderHistory();
}

function handleEmployeeOrder(e) {
    e.preventDefault();
    if (!selectedKioskItemId) return alert('برجاء اختيار المشروب أولاً!');
    
    const item = menuItems.find(m => m.id === selectedKioskItemId);
    const newOrder = {
        id: Date.now(),
        employee: currentUser.name,
        buffet: currentUser.buffet,
        item: item.name,
        price: item.price,
        details: `${document.getElementById('kioskSugar').value} - ${document.getElementById('kioskMilk').value}`,
        status: 'قيد الانتظار', 
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    };

    orders.unshift(newOrder);
    saveData();
    selectedKioskItemId = null;
    
    // إعادة التوجيه لتبويبة الطلبات الحالية أوتوماتيكياً
    switchKioskTab('active');
    renderKiosk();
}

/* ---------------- تتبع الطلبات وتأكيد الاستلام ---------------- */
function renderMyOrders() {
    const container = document.getElementById('employeeOrderTracker');
    // إظهار الطلبات التي لم يتم استلامها بعد
    const myOrders = orders.filter(o => o.employee === currentUser.name && o.status !== 'تم الاستلام');
    
    if (myOrders.length === 0) {
        container.innerHTML = '<div class="text-slate-400 text-sm text-center py-8 font-bold border-2 border-dashed border-slate-200 rounded-2xl">لا توجد طلبات جارية حالياً ☕</div>';
        return;
    }

    container.innerHTML = myOrders.map(o => {
        let isReady = o.status === 'جاهز للاستلام';
        let statusColor = o.status === 'قيد الانتظار' ? 'bg-slate-100 text-slate-600' : (isReady ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-400 font-bold' : 'bg-orange-100 text-orange-700 ring-1 ring-orange-400 font-bold');
        let icon = o.status === 'قيد الانتظار' ? 'fa-clock' : (isReady ? 'fa-check-circle' : 'fa-fire-burner animate-pulse');
        
        return `
        <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3 transition-all">
            <div class="flex justify-between items-center">
                <span class="font-black text-slate-800">${o.item}</span>
                <span class="text-xs text-slate-400">${o.time}</span>
            </div>
            <div class="flex items-center justify-center gap-2 p-2 rounded-xl text-xs ${statusColor}">
                <i class="fas ${icon}"></i> ${o.status}
            </div>
            ${isReady ? 
                `<button onclick="confirmReceipt(${o.id})" class="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-md shadow-emerald-500/30 flex items-center justify-center gap-2 transform hover:-translate-y-0.5">
                    <i class="fas fa-hand-holding-heart"></i> تم الاستلام 
                </button>` : ''
            }
        </div>`;
    }).join('');
}

function confirmReceipt(id) {
    const order = orders.find(o => o.id === id);
    if (order) {
        order.status = 'تم الاستلام';
        saveData();
        renderMyOrders();
        renderOrderHistory(); // لتحديث السجل فوراً
    }
}

function renderOrderHistory() {
    const container = document.getElementById('employeeOrderHistory');
    // إظهار الطلبات المكتملة فقط
    const historyOrders = orders.filter(o => o.employee === currentUser.name && o.status === 'تم الاستلام');

    if (historyOrders.length === 0) {
        container.innerHTML = '<div class="text-slate-400 text-sm text-center py-6">سجل طلباتك فارغ حالياً</div>';
        return;
    }

    container.innerHTML = historyOrders.map(o => `
        <div class="bg-white border border-slate-200 rounded-xl p-3 flex justify-between items-center hover:shadow-md transition-all">
            <div class="flex items-center gap-3">
                <div class="bg-emerald-50 text-emerald-600 w-10 h-10 rounded-full flex items-center justify-center text-lg"><i class="fas fa-check"></i></div>
                <div class="flex flex-col">
                    <span class="font-bold text-slate-800 text-sm">${o.item}</span>
                    <span class="text-[10px] text-slate-500">${o.details}</span>
                </div>
            </div>
            <div class="flex flex-col items-end">
                <span class="text-xs font-bold text-emerald-600">${o.price} ج.م</span>
                <span class="text-[10px] text-slate-400">${o.time}</span>
            </div>
        </div>
    `).join('');
}

/* ---------------- شاشة عامل البوفيه ---------------- */
function renderBuffetQueue() {
    const container = document.getElementById('buffetOrdersContainer');
    // لا تُظهر الطلبات المكتملة أو الجاهزة للاستلام عند البوفيه (لتنظيف الشاشة)
    const buffetOrders = orders.filter(o => o.buffet === currentUser.buffet && o.status !== 'جاهز للاستلام' && o.status !== 'تم الاستلام');

    if (buffetOrders.length === 0) {
        container.innerHTML = '<div class="col-span-full text-center py-12 text-slate-400 font-bold text-lg border-2 border-dashed border-slate-200 rounded-3xl">لا توجد طلبات جديدة ☕</div>';
        return;
    }

    container.innerHTML = buffetOrders.map(o => {
        let isPending = o.status === 'قيد الانتظار';
        return `
        <div class="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4 transition-all">
            <div>
                <h4 class="font-black text-lg text-slate-800">${o.employee}</h4>
                <div class="text-xs text-slate-500">${o.time}</div>
            </div>
            <div class="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div class="font-black text-slate-800 mb-1">☕ ${o.item}</div>
                <div class="text-xs text-slate-500">${o.details}</div>
            </div>
            ${isPending ? 
                `<button onclick="updateOrderStatus(${o.id}, 'جاري التحضير')" class="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-md transform hover:-translate-y-0.5">بدء التنفيذ ▶️</button>` 
                : 
                `<button onclick="updateOrderStatus(${o.id}, 'جاهز للاستلام')" class="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-md shadow-emerald-500/30 transform hover:-translate-y-0.5">تم الانتهاء ✅</button>`
            }
        </div>`;
    }).join('');
}

function updateOrderStatus(id, newStatus) {
    const order = orders.find(o => o.id === id);
    if (order) {
        order.status = newStatus;
        saveData();
        if(currentUser.role === 'buffet') renderBuffetQueue();
    }
}

/* ---------------- شاشة المدير والحسابات ---------------- */
function renderManagerDashboard() {
    document.getElementById('mgrStatOrders').textContent = orders.length;
    document.getElementById('mgrStatCosts').textContent = orders.reduce((sum, o) => sum + Number(o.price), 0);

    const tbody = document.getElementById('managerOrdersTableBody');
    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center p-6 text-slate-400 font-bold">لا توجد طلبات مسجلة حتى الآن</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(o => {
        let statusBadge = o.status === 'تم الاستلام' ? 'bg-emerald-100 text-emerald-700' : (o.status === 'جاهز للاستلام' ? 'bg-teal-100 text-teal-700' : (o.status === 'جاري التحضير' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'));
        return `
        <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
            <td class="p-3 font-bold text-slate-800">${o.employee}</td>
            <td class="p-3 text-slate-600">${o.buffet}</td>
            <td class="p-3 font-bold text-slate-800">${o.item}</td>
            <td class="p-3 text-slate-500 text-xs">${o.details}</td>
            <td class="p-3 font-bold text-emerald-600">${o.price} ج.م</td>
            <td class="p-3 text-slate-500 text-xs">${o.time}</td>
            <td class="p-3"><span class="px-2 py-1 rounded-lg text-[10px] font-bold ${statusBadge}">${o.status}</span></td>
        </tr>
        `;
    }).join('');
}

function exportToExcel() {
    let csvContent = "\uFEFF"; 
    csvContent += "اسم الموظف,البوفيه,المشروب,التفاصيل والملاحظات,السعر (ج.م),وقت الطلب,حالة الطلب\n";
    orders.forEach(o => {
        csvContent += `"${o.employee}","${o.buffet}","${o.item}","${o.details}","${o.price}","${o.time}","${o.status}"\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `تقرير_حسابات_البوفيه_${new Date().toLocaleDateString('ar-EG').replace(/\//g, '-')}.csv`;
    link.click();
}