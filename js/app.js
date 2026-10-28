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

    // تهيئة شاشات البوفيهات
    const buffetsHTML = BUFFETS.map(b => `<option value="${b}">${b}</option>`).join('');
    if(document.getElementById('visitorBuffetSelect')) document.getElementById('visitorBuffetSelect').innerHTML = buffetsHTML;
    if(document.getElementById('addUBuffet')) document.getElementById('addUBuffet').innerHTML = buffetsHTML;

    // التوجيه حسب الصلاحية
    if (currentUser.role === 'employee') {
        document.getElementById('userRoleTitle').textContent = `موظف (${currentUser.buffet})`;
        document.getElementById('viewKiosk').classList.remove('hidden');
        renderKiosk();
    } else if (currentUser.role === 'buffet') {
        document.getElementById('userRoleTitle').textContent = `عامل بوفيه (${currentUser.buffet})`;
        document.getElementById('viewBuffet').classList.remove('hidden');
        renderBuffetQueue();
    } else if (currentUser.role === 'manager' || currentUser.role === 'super_manager') {
        let isSuper = currentUser.role === 'super_manager';
        document.getElementById('userRoleTitle').textContent = isSuper ? 'المدير العام' : `مدير بوفيه (${currentUser.buffet})`;
        document.getElementById('mgrDashboardSub').textContent = isSuper ? 'النطاق: جميع البوفيهات' : `النطاق: ${currentUser.buffet} فقط`;
        
        if (isSuper) {
            document.getElementById('optSuper').classList.remove('hidden'); // إظهار خيار إضافة مدير عام للمدير العام فقط
        } else {
            // المدير العادي يضيف في بوفيهه فقط
            document.getElementById('addUBuffet').innerHTML = `<option value="${currentUser.buffet}">${currentUser.buffet}</option>`;
        }
        
        document.getElementById('viewManager').classList.remove('hidden');
        renderManagerDashboard();
    }

    // 🌟 السحر هنا: التحديث اللحظي (Real-Time) بين التابات المتعددة بدون Refresh 🌟
    window.addEventListener('storage', (e) => {
        if (e.key === 'buffet_orders_v7' || e.key === 'buffet_emp_v7') {
            orders = JSON.parse(localStorage.getItem('buffet_orders_v7')) || [];
            employees = JSON.parse(localStorage.getItem('buffet_emp_v7')) || [];
            refreshUINow();
        }
    });
    
    // Fallback refresh للمتصفح الحالي لتأكيد السلاسة (كل 2 ثانية)
    setInterval(() => {
        orders = JSON.parse(localStorage.getItem('buffet_orders_v7')) || [];
        refreshUINow();
    }, 2000);
});

function refreshUINow() {
    if (currentUser.role === 'employee') { renderMyOrders(); renderOrderHistory(); }
    if (currentUser.role === 'buffet') renderBuffetQueue();
    if (currentUser.role === 'manager' || currentUser.role === 'super_manager') renderManagerDashboard();
}

function logout() {
    sessionStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

/* ---------------- شاشة الموظف ---------------- */
function switchOrderType(type) {
    const btnDrink = document.getElementById('btnOrderTab');
    const btnVis = document.getElementById('btnVisitorTab');
    const formD = document.getElementById('formDrink');
    const formV = document.getElementById('formVisitor');

    if (type === 'drink') {
        btnDrink.className = "flex-1 py-4 text-sm font-black border-b-4 border-orange-500 text-orange-500 transition-all";
        btnVis.className = "flex-1 py-4 text-sm font-black border-b-4 border-transparent text-slate-400 hover:text-white transition-all";
        formD.classList.remove('hidden');
        formV.classList.add('hidden');
    } else {
        btnVis.className = "flex-1 py-4 text-sm font-black border-b-4 border-red-500 text-red-500 transition-all";
        btnDrink.className = "flex-1 py-4 text-sm font-black border-b-4 border-transparent text-slate-400 hover:text-white transition-all";
        formV.classList.remove('hidden');
        formD.classList.add('hidden');
    }
}

function switchKioskTab(tabName) {
    const tabActive = document.getElementById('tabActive');
    const tabHistory = document.getElementById('tabHistory');
    const contentActive = document.getElementById('kioskActiveContent');
    const contentHistory = document.getElementById('kioskHistoryContent');

    if (tabName === 'active') {
        tabActive.className = "flex-1 py-3 text-sm font-black border-b-2 border-orange-500 text-orange-600 bg-white";
        tabHistory.className = "flex-1 py-3 text-sm font-black border-b-2 border-transparent text-slate-500 hover:bg-slate-100";
        contentActive.classList.remove('hidden');
        contentHistory.classList.add('hidden');
    } else {
        tabHistory.className = "flex-1 py-3 text-sm font-black border-b-2 border-orange-500 text-orange-600 bg-white";
        tabActive.className = "flex-1 py-3 text-sm font-black border-b-2 border-transparent text-slate-500 hover:bg-slate-100";
        contentHistory.classList.remove('hidden');
        contentActive.classList.add('hidden');
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
        card.innerHTML = `<div class="text-3xl mb-1">${item.icon}</div><div class="text-sm text-slate-800 font-bold">${item.name}</div>`;
        grid.appendChild(card);
    });
    renderMyOrders();
    renderOrderHistory();
}

function handleEmployeeOrder(e) {
    e.preventDefault();
    if (!selectedKioskItemId) return alert('برجاء اختيار المشروب أولاً!');
    
    const item = menuItems.find(m => m.id === selectedKioskItemId);
    const notesInput = document.getElementById('kioskNotes').value.trim();
    const orderDetails = `${document.getElementById('kioskSugar').value} | ${document.getElementById('kioskMilk').value}`;
    const finalDetails = notesInput ? `${orderDetails} 📝: ${notesInput}` : orderDetails;

    const newOrder = {
        id: Date.now(),
        employee: currentUser.name,
        buffet: currentUser.buffet, // يذهب لبوفيه المستخدم فقط
        item: item.name,
        price: item.price,
        details: finalDetails,
        type: 'drink',
        status: 'قيد الانتظار', 
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    };

    orders.unshift(newOrder);
    saveData();
    selectedKioskItemId = null;
    document.getElementById('kioskNotes').value = '';
    
    switchKioskTab('active');
    renderKiosk();
}

function handleVisitorOrder(e) {
    e.preventDefault();
    const targetBuffet = document.getElementById('visitorBuffetSelect').value;
    const notes = document.getElementById('visitorNotes').value.trim();
    
    const newOrder = {
        id: Date.now(),
        employee: currentUser.name,
        buffet: targetBuffet, // يذهب للبوفيه المختار فقط
        item: '🚨 طلب زيارة',
        price: 0,
        details: notes ? `يوجد ضيوف - ${notes}` : 'يوجد ضيوف - مطلوب عامل فوراً',
        type: 'alert',
        status: 'قيد الانتظار',
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    };

    orders.unshift(newOrder);
    saveData();
    document.getElementById('visitorNotes').value = '';
    switchKioskTab('active');
    renderKiosk();
    alert('✅ تم إرسال نداء الزيارة للبوفيه المحدد بنجاح!');
}

function renderMyOrders() {
    const container = document.getElementById('employeeOrderTracker');
    const myOrders = orders.filter(o => o.employee === currentUser.name && o.status !== 'تم الاستلام');
    
    if (myOrders.length === 0) {
        container.innerHTML = '<div class="text-slate-400 text-sm text-center py-6 font-bold border-2 border-dashed border-slate-200 rounded-2xl">لا توجد طلبات جارية</div>';
        return;
    }

    container.innerHTML = myOrders.map(o => {
        let isReady = o.status === 'جاهز للاستلام';
        let isAlert = o.type === 'alert';
        let statusColor = o.status === 'قيد الانتظار' ? 'bg-slate-100 text-slate-600' : (isReady ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-400' : 'bg-orange-100 text-orange-700 ring-1 ring-orange-400');
        
        return `
        <div class="bg-white border ${isAlert ? 'border-red-200 bg-red-50' : 'border-slate-200'} rounded-2xl p-4 shadow-sm space-y-3">
            <div class="flex justify-between items-center">
                <span class="font-black ${isAlert ? 'text-red-700' : 'text-slate-800'}">${o.item}</span>
                <span class="text-xs text-slate-500 font-bold">${o.time}</span>
            </div>
            <div class="text-xs text-slate-500 font-bold bg-white/50 p-2 rounded">${o.details}</div>
            <div class="flex items-center justify-center gap-2 p-2 rounded-xl text-xs font-bold ${statusColor}">
                ${o.status}
            </div>
            ${isReady ? 
                `<button onclick="confirmReceipt(${o.id})" class="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-sm shadow-md flex items-center justify-center gap-2 transform hover:-translate-y-0.5">
                    تم الاستلام ✅
                </button>` : ''
            }
        </div>`;
    }).join('');
}

function confirmReceipt(id) {
    const order = orders.find(o => o.id === id);
    if (order) { order.status = 'تم الاستلام'; saveData(); renderKiosk(); }
}

function renderOrderHistory() {
    const container = document.getElementById('employeeOrderHistory');
    const historyOrders = orders.filter(o => o.employee === currentUser.name && o.status === 'تم الاستلام');

    if (historyOrders.length === 0) {
        container.innerHTML = '<div class="text-slate-400 text-sm text-center py-4">سجل طلباتك فارغ</div>';
        return;
    }

    container.innerHTML = historyOrders.map(o => `
        <div class="bg-white border border-slate-200 rounded-xl p-3 flex justify-between items-center hover:shadow-md transition-all">
            <div class="flex items-center gap-2">
                <div class="bg-emerald-50 text-emerald-600 w-8 h-8 rounded-full flex items-center justify-center"><i class="fas fa-check"></i></div>
                <div class="flex flex-col">
                    <span class="font-bold text-slate-800 text-sm">${o.item}</span>
                    <span class="text-[10px] text-slate-500 truncate w-32">${o.details}</span>
                </div>
            </div>
            <div class="flex flex-col items-end">
                <span class="text-xs font-bold text-emerald-600">${o.price} ج</span>
                <span class="text-[10px] text-slate-400">${o.time}</span>
            </div>
        </div>
    `).join('');
}

/* ---------------- شاشة عامل البوفيه ---------------- */
function renderBuffetQueue() {
    const container = document.getElementById('buffetOrdersContainer');
    
    // يرى العامل الطلبات الموجهة لـ "بوفيهه هو فقط" (سواء كانت مشروب عادي أو طلب زيارة اختاروا بوفيهه فيه)
    const buffetOrders = orders.filter(o => o.buffet === currentUser.buffet && o.status !== 'جاهز للاستلام' && o.status !== 'تم الاستلام');

    if (buffetOrders.length === 0) {
        container.innerHTML = '<div class="col-span-full text-center py-12 text-slate-400 font-bold text-lg border-2 border-dashed border-slate-200 rounded-3xl">لا توجد طلبات جديدة ☕</div>';
        return;
    }

    container.innerHTML = buffetOrders.map(o => {
        let isPending = o.status === 'قيد الانتظار';
        let isAlert = o.type === 'alert';
        
        return `
        <div class="${isAlert ? 'bg-red-50 border-red-300 ring-2 ring-red-400 animate-pulse' : 'bg-white border-slate-200'} border rounded-3xl p-5 shadow-sm space-y-4">
            <div class="flex justify-between items-start">
                <div>
                    <h4 class="font-black text-lg ${isAlert ? 'text-red-900' : 'text-slate-800'}">${o.employee}</h4>
                    <div class="text-xs text-slate-500 font-bold">${o.time}</div>
                </div>
                ${isAlert ? '<div class="bg-red-600 text-white px-2 py-1 text-[10px] font-black rounded-lg">زيارة 🚨</div>' : ''}
            </div>
            <div class="bg-white/60 p-3 rounded-2xl border ${isAlert ? 'border-red-200' : 'border-slate-100'}">
                <div class="font-black text-slate-800 mb-1">${isAlert?'':'☕ '} ${o.item}</div>
                <div class="text-xs font-bold text-slate-600">${o.details}</div>
            </div>
            ${isPending ? 
                `<button onclick="updateOrderStatus(${o.id}, 'جاري التحضير')" class="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-sm shadow-md">بدء التنفيذ ▶️</button>` 
                : 
                `<button onclick="updateOrderStatus(${o.id}, 'جاهز للاستلام')" class="w-full ${isAlert ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-500 hover:bg-emerald-600'} text-white font-bold py-3 rounded-xl text-sm shadow-md">تم الانتهاء ✅</button>`
            }
        </div>`;
    }).join('');
}

function updateOrderStatus(id, newStatus) {
    const order = orders.find(o => o.id === id);
    if (order) { order.status = newStatus; saveData(); refreshUINow(); }
}

/* ---------------- شاشة الإدارة وإضافة المستخدمين ---------------- */
function renderManagerDashboard() {
    let isSuper = currentUser.role === 'super_manager';
    // المدير العام يرى الكل، مدير البوفيه يرى بوفيهه فقط
    let viewOrders = isSuper ? orders : orders.filter(o => o.buffet === currentUser.buffet);

    document.getElementById('mgrStatOrders').textContent = viewOrders.length;
    document.getElementById('mgrStatCosts').textContent = viewOrders.reduce((sum, o) => sum + Number(o.price), 0);

    const tbody = document.getElementById('managerOrdersTableBody');
    if (viewOrders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center p-6 text-slate-400 font-bold">لا توجد طلبات مسجلة</td></tr>';
        return;
    }

    tbody.innerHTML = viewOrders.map(o => {
        let statusBadge = o.status === 'تم الاستلام' ? 'bg-emerald-100 text-emerald-700' : (o.status === 'جاهز للاستلام' ? 'bg-teal-100 text-teal-700' : (o.status === 'جاري التحضير' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'));
        return `
        <tr class="border-b border-slate-100 hover:bg-slate-50">
            <td class="p-3 font-bold text-slate-800">${o.employee}</td>
            <td class="p-3 text-slate-600">${o.buffet}</td>
            <td class="p-3 font-bold ${o.type === 'alert' ? 'text-red-600' : 'text-slate-800'}">${o.item}</td>
            <td class="p-3 text-slate-500 text-[10px] max-w-xs">${o.details}</td>
            <td class="p-3 font-bold text-emerald-600">${o.price} ج</td>
            <td class="p-3 text-slate-500 text-xs">${o.time}</td>
            <td class="p-3"><span class="px-2 py-1 rounded-lg text-[10px] font-bold ${statusBadge}">${o.status}</span></td>
        </tr>`;
    }).join('');
}

function handleAddUser(e) {
    e.preventDefault();
    const fp = document.getElementById('addUPrint').value.trim();
    if(employees.some(emp => emp.fingerprint === fp)) {
        return alert('⚠️ رقم البصمة هذا مستخدم مسبقاً!');
    }

    const newUser = {
        name: document.getElementById('addUName').value.trim(),
        dept: 'غير محدد',
        fingerprint: fp,
        password: document.getElementById('addUPass').value,
        role: document.getElementById('addURole').value,
        buffet: document.getElementById('addUBuffet').value
    };

    employees.push(newUser);
    saveData();
    e.target.reset();
    alert(`تم إضافة الحساب بنجاح كـ (${newUser.role}) في بوفيه ${newUser.buffet}`);
}

function exportToExcel() {
    let isSuper = currentUser.role === 'super_manager';
    let viewOrders = isSuper ? orders : orders.filter(o => o.buffet === currentUser.buffet);

    let csvContent = "\uFEFF"; 
    csvContent += "اسم الموظف,البوفيه,الطلب,التفاصيل,السعر,الوقت,الحالة\n";
    viewOrders.forEach(o => {
        csvContent += `"${o.employee}","${o.buffet}","${o.item}","${o.details}","${o.price}","${o.time}","${o.status}"\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `تقرير_${currentUser.buffet}_${Date.now()}.csv`;
    link.click();
}
