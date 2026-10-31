let currentUser = null;
let selectedKioskItemId = null;
let currentGuestOrderId = null; 

document.addEventListener('DOMContentLoaded', () => {
    const userData = sessionStorage.getItem('currentUser');
    if (!userData) { window.location.href = 'index.html'; return; }
    
    currentUser = JSON.parse(userData);
    document.getElementById('loggedUserName').textContent = currentUser.name;

    const guestBuffetSelect = document.getElementById('guestBuffet');
    if(guestBuffetSelect) {
        guestBuffetSelect.innerHTML = BUFFETS.map(b => `<option value="${b}">بوفيه ${b}</option>`).join('');
    }

    if (currentUser.role === 'employee') {
        document.getElementById('userRoleTitle').textContent = 'موظف - ' + currentUser.dept;
        document.getElementById('guestDescText').textContent = 'طلب الضيافة سيتم إرساله لمدير بوفيهك للموافقة عليه أولاً.';
        document.getElementById('viewKiosk').classList.remove('hidden');
        renderKiosk();
    } else if (currentUser.role === 'buffet') {
        document.getElementById('userRoleTitle').textContent = 'عامل بوفيه (' + currentUser.buffet + ')';
        document.getElementById('viewBuffet').classList.remove('hidden');
        renderBuffetQueue();
    } else if (currentUser.role === 'super_admin' || currentUser.role === 'manager') {
        document.getElementById('userRoleTitle').textContent = currentUser.role === 'super_admin' ? 'مدير عام (Super)' : `مدير بوفيه (${currentUser.buffet})`;
        document.getElementById('guestDescText').textContent = 'لأنك مدير، سيتم إرسال التنبيه للبوفيه فوراً بدون موافقات.';
        document.getElementById('viewKiosk').classList.remove('hidden'); 
        document.getElementById('viewManager').classList.remove('hidden');
        setupManagerUI();
        renderManagerDashboard();
        renderKiosk();
    }
    updateUI();
});

window.addEventListener('storage', () => {
    orders = JSON.parse(localStorage.getItem('buffet_orders_v7')) || [];
    employees = JSON.parse(localStorage.getItem('buffet_emp_v7')) || [];
    updateUI();
});

setInterval(() => {
    if (document.getElementById('guestOrderModal') && !document.getElementById('guestOrderModal').classList.contains('hidden')) return;
    
    orders = JSON.parse(localStorage.getItem('buffet_orders_v7')) || [];
    employees = JSON.parse(localStorage.getItem('buffet_emp_v7')) || [];
    updateUI();
}, 2000);

function updateUI() {
    if(!currentUser) return;
    if (currentUser.role === 'employee' || currentUser.role === 'super_admin' || currentUser.role === 'manager') { renderMyOrders(); renderOrderHistory(); }
    if (currentUser.role === 'buffet') renderBuffetQueue();
    if (currentUser.role === 'super_admin' || currentUser.role === 'manager') {
        renderManagerDashboard();
        if(currentUser.role === 'super_admin') renderUsersList(); 
        renderManagerApprovals();
    }
}

function logout() { sessionStorage.removeItem('currentUser'); window.location.href = 'index.html'; }

/* ================= شاشة الموظف والطلب ================= */
function switchKioskTab(tabName) {
    const tabActive = document.getElementById('tabActive');
    const tabHistory = document.getElementById('tabHistory');
    const contentActive = document.getElementById('kioskActiveContent');
    const contentHistory = document.getElementById('kioskHistoryContent');

    if (tabName === 'active') {
        tabActive.className = "flex-1 py-3.5 text-sm font-black border-b-2 border-orange-500 text-orange-600 bg-white";
        tabHistory.className = "flex-1 py-3.5 text-sm font-black border-b-2 border-transparent text-slate-500 hover:bg-slate-100";
        contentActive.classList.remove('hidden'); contentHistory.classList.add('hidden');
    } else {
        tabHistory.className = "flex-1 py-3.5 text-sm font-black border-b-2 border-orange-500 text-orange-600 bg-white";
        tabActive.className = "flex-1 py-3.5 text-sm font-black border-b-2 border-transparent text-slate-500 hover:bg-slate-100";
        contentHistory.classList.remove('hidden'); contentActive.classList.add('hidden');
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
}

function handleEmployeeOrder(e) {
    e.preventDefault();
    if (!selectedKioskItemId) return alert('برجاء اختيار المشروب أولاً!');
    
    const item = menuItems.find(m => m.id === selectedKioskItemId);
    const newOrder = {
        id: Date.now(),
        employee: currentUser.name,
        dept: currentUser.dept,
        buffet: currentUser.buffet, 
        item: item.name,
        price: item.price,
        sugarVal: document.getElementById('kioskSugar').value,
        milkVal: document.getElementById('kioskMilk').value,
        details: `${document.getElementById('kioskSugar').value} - ${document.getElementById('kioskMilk').value}`,
        notes: document.getElementById('kioskNotes').value.trim(),
        status: 'قيد الانتظار', 
        isGuest: false,
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    };

    orders.unshift(newOrder);
    saveData();
    selectedKioskItemId = null;
    document.getElementById('kioskNotes').value = '';
    switchKioskTab('active');
    updateUI();
}

function sendGuestAlert() {
    const selectedBuffet = document.getElementById('guestBuffet').value;
    let initialStatus = (currentUser.role === 'employee') ? 'بانتظار موافقة المدير' : 'قيد الانتظار';

    const newAlert = {
        id: Date.now(),
        employee: currentUser.name,
        dept: currentUser.dept,
        buffet: selectedBuffet, 
        managerBuffet: currentUser.buffet, 
        item: '🚨 ضيافة (لم يتم التسجيل بعد)',
        price: 0,
        sugarVal: 'بدون سكر',
        milkVal: 'بدون حليب',
        details: `ضيافة مطلوبة في مكتب: ${currentUser.name} (${currentUser.dept})`,
        notes: '',
        status: initialStatus,
        isGuest: true,
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    };
    orders.unshift(newAlert);
    saveData();
    if (initialStatus === 'قيد الانتظار') {
        alert(`تم إرسال طلب الضيافة إلى ${selectedBuffet} مباشرة!`);
    } else {
        alert(`تم رفع الطلب لمدير البوفيه الخاص بك للموافقة عليه.`);
    }
    updateUI();
}

function renderMyOrders() {
    const container = document.getElementById('employeeOrderTracker');
    const myOrders = orders.filter(o => o.employee.includes(currentUser.name) && o.status !== 'تم الاستلام' && o.status !== 'مرفوض');
    
    if (myOrders.length === 0) {
        container.innerHTML = '<div class="text-slate-400 text-sm text-center py-6 font-bold border-2 border-dashed border-slate-200 rounded-2xl">لا توجد طلبات جارية حالياً</div>';
        return;
    }

    container.innerHTML = myOrders.map(o => {
        let isReady = o.status === 'جاهز للاستلام';
        let isWaitingAdmin = o.status === 'بانتظار موافقة المدير';
        let statusColor = isWaitingAdmin ? 'bg-yellow-100 text-yellow-700' : (o.status === 'قيد الانتظار' ? 'bg-slate-100 text-slate-600' : (isReady ? 'bg-emerald-100 text-emerald-700 font-bold' : 'bg-orange-100 text-orange-700 font-bold'));
        let icon = isWaitingAdmin ? 'fa-user-clock' : (o.status === 'قيد الانتظار' ? 'fa-clock' : (isReady ? 'fa-check-circle' : 'fa-fire-burner animate-pulse'));
        
        return `
        <div class="bg-white border ${o.isGuest ? 'border-red-300' : 'border-slate-200'} rounded-2xl p-4 shadow-sm space-y-3">
            <div class="flex justify-between items-center"><span class="font-black ${o.isGuest ? 'text-red-600' : 'text-slate-800'}">${o.isGuest ? 'طلب ضيافة' : o.item}</span><span class="text-xs text-slate-400">${o.time}</span></div>
            <div class="flex items-center justify-center gap-2 p-2 rounded-xl text-xs ${statusColor}"><i class="fas ${icon}"></i> ${o.status}</div>
            ${isReady && !o.isGuest ? `<button onclick="confirmReceipt(${o.id})" class="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-sm">تم الاستلام ✅</button>` : ''}
        </div>`;
    }).join('');
}

function confirmReceipt(id) {
    const order = orders.find(o => o.id === id);
    if (order) { order.status = 'تم الاستلام'; saveData(); updateUI(); }
}

function renderOrderHistory() {
    const container = document.getElementById('employeeOrderHistory');
    const historyOrders = orders.filter(o => o.employee.includes(currentUser.name) && (o.status === 'تم الاستلام' || o.status === 'مرفوض'));
    if (historyOrders.length === 0) { container.innerHTML = '<div class="text-slate-400 text-sm text-center py-6">سجل طلباتك فارغ</div>'; return; }

    container.innerHTML = historyOrders.map(o => `
        <div class="bg-white border ${o.status === 'مرفوض' ? 'border-red-200' : 'border-slate-200'} rounded-xl p-3 flex justify-between items-center mb-2">
            <div class="flex items-center gap-3">
                <div class="${o.status === 'مرفوض' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'} w-8 h-8 rounded-full flex items-center justify-center"><i class="fas ${o.status === 'مرفوض' ? 'fa-times' : 'fa-check'}"></i></div>
                <div class="flex flex-col"><span class="font-bold text-slate-800 text-sm">${o.item} ${o.status === 'مرفوض' ? '(مرفوض)' : ''}</span></div>
            </div>
            <div class="flex flex-col items-end"><span class="text-xs font-bold text-emerald-600">${o.price} ج.م</span><span class="text-[10px] text-slate-400">${o.time}</span></div>
        </div>
    `).join('');
}

/* ================= شاشة البوفيه ونافذة الضيافة ================= */
function renderBuffetQueue() {
    const container = document.getElementById('buffetOrdersContainer');
    const buffetOrders = orders.filter(o => o.buffet === currentUser.buffet && o.status !== 'جاهز للاستلام' && o.status !== 'تم الاستلام' && o.status !== 'بانتظار موافقة المدير' && o.status !== 'مرفوض');

    if (buffetOrders.length === 0) {
        container.innerHTML = '<div class="col-span-full text-center py-12 text-slate-400 font-bold text-lg border-2 border-dashed border-slate-200 rounded-3xl">لا توجد طلبات جديدة ☕</div>';
        return;
    }

    container.innerHTML = buffetOrders.map(o => {
        let isPending = o.status === 'قيد الانتظار';
        if(o.isGuest && o.item.includes('لم يتم التسجيل')) {
            return `
            <div class="bg-red-50 border-2 border-red-500 rounded-3xl p-5 shadow-lg space-y-3 animate-pulse">
                <div class="text-red-700 font-black text-lg"><i class="fas fa-exclamation-triangle"></i> ضيافة وزيارة!</div>
                <div class="text-sm font-bold text-slate-800">لـ: ${o.employee} (${o.dept})</div>
                <div class="text-xs text-red-600 mb-2">${o.details}</div>
                <button onclick="openGuestModal(${o.id})" class="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl text-sm mt-2 shadow-md">تسجيل المشروبات وإنهاء ✅</button>
            </div>`;
        }
        return `
        <div class="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <div><h4 class="font-black text-lg text-slate-800">${o.employee} <span class="text-xs text-slate-500">(${o.dept})</span></h4><div class="text-xs text-slate-500">${o.time}</div></div>
            <div class="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div class="font-black text-slate-800 mb-1">☕ ${o.item}</div>
                <div class="text-xs text-slate-600 font-bold">${o.details}</div>
                ${o.notes ? `<div class="text-xs text-orange-600 mt-2 pt-2 border-t border-slate-200">📝 ملاحظات: ${o.notes}</div>` : ''}
            </div>
            ${isPending ? `<button onclick="updateOrderStatus(${o.id}, 'جاري التحضير')" class="w-full bg-slate-900 text-white font-bold py-3 rounded-xl text-sm">بدء التنفيذ ▶️</button>` : `<button onclick="updateOrderStatus(${o.id}, 'جاهز للاستلام')" class="w-full bg-emerald-500 text-white font-bold py-3 rounded-xl text-sm">تم الانتهاء ✅</button>`}
        </div>`;
    }).join('');
}

function updateOrderStatus(id, newStatus) {
    const order = orders.find(o => o.id === id);
    if (order) { order.status = newStatus; saveData(); updateUI(); }
}

/* === عمليات نافذة الضيافة المنبثقة === */
function openGuestModal(id) {
    currentGuestOrderId = id;
    document.getElementById('guestOrderModal').classList.remove('hidden');
    document.getElementById('guestDrinksContainer').innerHTML = '';
    document.getElementById('guestDrinksContainer').classList.add('hidden');
    document.getElementById('saveGuestOrderBtn').classList.add('hidden');
    document.getElementById('guestDrinkCount').value = 1;
}

function closeGuestModal() {
    currentGuestOrderId = null;
    document.getElementById('guestOrderModal').classList.add('hidden');
}

function generateGuestForms() {
    const count = parseInt(document.getElementById('guestDrinkCount').value);
    if (isNaN(count) || count < 1) return alert('برجاء إدخال عدد صحيح.');

    const container = document.getElementById('guestDrinksContainer');
    container.innerHTML = '';
    const drinkOptions = menuItems.map(m => `<option value="${m.id}">${m.icon} ${m.name} (${m.price} ج)</option>`).join('');

    for (let i = 1; i <= count; i++) {
        container.innerHTML += `
        <div class="p-4 border border-slate-200 rounded-xl bg-white space-y-3 shadow-sm">
            <h4 class="font-black text-slate-800 text-sm mb-2 border-b pb-2 text-orange-600">كوباية رقم ${i}</h4>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                    <label class="block text-xs font-bold text-slate-500 mb-1">المشروب:</label>
                    <select id="guestItem_${i}" class="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-sm font-bold outline-none">${drinkOptions}</select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-500 mb-1">السكر:</label>
                    <select id="guestSugar_${i}" class="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-sm outline-none">
                        <option value="نص معلقة">نص معلقة</option><option value="معلقة">معلقة 1</option><option value="معلقة ونص">معلقة ونص (1.5)</option><option value="معلقتين" selected>معلقتين (مضبوط)</option><option value="معلقتين ونص">معلقتين ونص (2.5)</option><option value="تلت معالق">تلت معالق</option><option value="بدون سكر">بدون سكر (سادة)</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-500 mb-1">الحليب:</label>
                    <select id="guestMilk_${i}" class="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-sm outline-none"><option value="بدون حليب">بدون حليب</option><option value="مع حليب">مع حليب</option></select>
                </div>
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-500 mb-1">ملاحظات الكوباية:</label>
                <input type="text" id="guestNotes_${i}" placeholder="مثال: في كوباية كرتون، أو شاي فتلة..." class="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-sm outline-none">
            </div>
        </div>`;
    }
    container.classList.remove('hidden');
    document.getElementById('saveGuestOrderBtn').classList.remove('hidden');
}

function submitGuestOrder() {
    const count = parseInt(document.getElementById('guestDrinkCount').value);
    const originalOrderIndex = orders.findIndex(o => o.id === currentGuestOrderId);
    if (originalOrderIndex === -1) return;

    const originalOrder = orders[originalOrderIndex];
    let newOrders = [];

    for (let i = 1; i <= count; i++) {
        const itemId = parseInt(document.getElementById(`guestItem_${i}`).value);
        const menuItem = menuItems.find(m => m.id === itemId);
        const sugarVal = document.getElementById(`guestSugar_${i}`).value;
        const milkVal = document.getElementById(`guestMilk_${i}`).value;
        const notesVal = document.getElementById(`guestNotes_${i}`).value.trim();

        newOrders.push({
            id: Date.now() + i, 
            employee: originalOrder.employee + ' (ضيوف)', 
            dept: originalOrder.dept,
            buffet: originalOrder.buffet,
            managerBuffet: originalOrder.managerBuffet,
            item: menuItem.name,
            price: menuItem.price,
            sugarVal: sugarVal,
            milkVal: milkVal,
            details: `ضيافة: ${sugarVal} - ${milkVal}`,
            notes: notesVal,
            status: 'تم الاستلام', 
            isGuest: true,
            time: originalOrder.time
        });
    }

    orders.splice(originalOrderIndex, 1, ...newOrders);
    saveData();
    closeGuestModal();
    updateUI();
}

/* ================= شاشة المدير ================= */
function setupManagerUI() {
    const buffetSelect = document.getElementById('addUBuffet');
    if(buffetSelect) buffetSelect.innerHTML = BUFFETS.map(b => `<option value="${b}">بوفيه ${b}</option>`).join('');
    
    if (currentUser.role === 'manager') {
        // حذف زر التاب والمحتوى تماماً من الـ DOM لمدير البوفيه (منع قاطع)
        const tabUsersBtn = document.getElementById('mgrTabUsers');
        if (tabUsersBtn) tabUsersBtn.remove();
        const usersContent = document.getElementById('managerUsersContent');
        if (usersContent) usersContent.remove();

        document.querySelectorAll('.super-only').forEach(el => el.remove());
        if(buffetSelect) buffetSelect.value = currentUser.buffet;
        const buffetSelectDiv = document.getElementById('buffetSelectDiv');
        if(buffetSelectDiv) buffetSelectDiv.classList.add('hidden');
    }
}

function switchManagerTab(tabName) {
    const tabs = ['Dashboard', 'Approvals', 'Users'];
    tabs.forEach(t => {
        const tabBtn = document.getElementById(`mgrTab${t}`);
        const tabContent = document.getElementById(`manager${t}Content`);
        if(tabBtn) tabBtn.className = "pb-3 text-base sm:text-lg font-black border-b-4 border-transparent text-slate-500 hover:text-slate-800 relative";
        if(tabContent) tabContent.classList.add('hidden');
    });
    
    const activeTab = document.getElementById(`mgrTab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
    const activeContent = document.getElementById(`manager${tabName.charAt(0).toUpperCase() + tabName.slice(1)}Content`);
    
    if(activeTab) activeTab.className = "pb-3 text-base sm:text-lg font-black border-b-4 border-emerald-500 text-emerald-600 relative";
    if(activeContent) activeContent.classList.remove('hidden');
}

function renderManagerDashboard() {
    const filteredOrders = currentUser.role === 'super_admin' ? orders : orders.filter(o => o.buffet === currentUser.buffet || o.managerBuffet === currentUser.buffet);
    
    document.getElementById('mgrStatOrders').textContent = filteredOrders.length;
    document.getElementById('mgrStatCosts').textContent = filteredOrders.reduce((sum, o) => sum + Number(o.price), 0);

    const tbody = document.getElementById('managerOrdersTableBody');
    if (filteredOrders.length === 0) { tbody.innerHTML = '<tr><td colspan="7" class="text-center p-6 text-slate-400 font-bold">لا توجد طلبات مسجلة</td></tr>'; return; }

    tbody.innerHTML = filteredOrders.map(o => `
        <tr class="border-b hover:bg-slate-50">
            <td class="p-3 font-bold">${o.employee} <span class="block text-[10px] text-slate-400">${o.dept}</span></td>
            <td class="p-3">${o.buffet}</td>
            <td class="p-3 font-bold ${o.isGuest ? 'text-red-600' : ''}">${o.item} <span class="block text-[10px] text-slate-400">${o.details}</span></td>
            <td class="p-3 text-xs text-orange-600 font-bold">${o.notes || '-'}</td>
            <td class="p-3 font-bold text-emerald-600">${o.price} ج.م</td><td class="p-3 text-xs">${o.time}</td>
            <td class="p-3"><span class="px-2 py-1 rounded bg-slate-100 text-xs font-bold">${o.status}</span></td>
        </tr>
    `).join('');
}

function renderManagerApprovals() {
    const pendingGuests = orders.filter(o => o.isGuest && o.status === 'بانتظار موافقة المدير' && (currentUser.role === 'super_admin' || o.managerBuffet === currentUser.buffet));
    
    const badge = document.getElementById('approvalBadge');
    if (badge) {
        if (pendingGuests.length > 0) { badge.textContent = pendingGuests.length; badge.classList.remove('hidden'); } 
        else { badge.classList.add('hidden'); }
    }

    const container = document.getElementById('managerApprovalsList');
    if(!container) return;
    
    if (pendingGuests.length === 0) { container.innerHTML = '<div class="col-span-full text-center py-6 text-slate-400 font-bold">لا توجد طلبات ضيافة معلقة.</div>'; return; }

    container.innerHTML = pendingGuests.map(o => `
        <div class="bg-orange-50 border border-orange-200 rounded-2xl p-4 shadow-sm">
            <div class="font-black text-slate-800 text-lg">طلب ضيافة من: ${o.employee} (${o.dept})</div>
            <div class="text-sm text-slate-600 mb-4">البوفيه المطلوب للتنفيذ: <span class="font-bold">${o.buffet}</span></div>
            <div class="flex gap-2">
                <button onclick="approveGuest(${o.id})" class="flex-1 bg-emerald-600 text-white font-bold py-2 rounded-xl text-sm">موافقة ✅</button>
                <button onclick="rejectGuest(${o.id})" class="flex-1 bg-red-600 text-white font-bold py-2 rounded-xl text-sm">رفض ❌</button>
            </div>
        </div>
    `).join('');
}

function approveGuest(id) { const order = orders.find(o => o.id === id); if(order) { order.status = 'قيد الانتظار'; saveData(); updateUI(); } }
function rejectGuest(id) { const order = orders.find(o => o.id === id); if(order) { order.status = 'مرفوض'; saveData(); updateUI(); } }

function handleCreateUser(e) {
    e.preventDefault();
    if(currentUser.role !== 'super_admin') return; 
    const fp = document.getElementById('addUFingerprint').value.trim();
    if(employees.some(emp => emp.fingerprint === fp)) { return alert('هذه البصمة مسجلة مسبقاً!'); }

    const newUser = {
        name: document.getElementById('addUName').value.trim(), dept: document.getElementById('addUDept').value.trim(),
        fingerprint: fp, password: document.getElementById('addUPassword').value,
        role: document.getElementById('addURole').value, buffet: document.getElementById('addUBuffet').value
    };
    employees.push(newUser); saveData(); e.target.reset(); alert('تم إضافة الحساب بنجاح!'); updateUI();
}

function renderUsersList() {
    const list = document.getElementById('managerUsersTableList');
    if(!list || currentUser.role !== 'super_admin') return; 

    list.innerHTML = employees.map(e => {
        let roleAr = e.role === 'super_admin' ? 'مدير عام' : (e.role === 'manager' ? 'مدير بوفيه' : (e.role === 'buffet' ? 'عامل بوفيه' : 'موظف'));
        return `
        <tr class="border-b hover:bg-slate-50">
            <td class="p-3 font-bold">${e.name} <span class="block text-[10px] text-slate-400">${e.dept}</span></td>
            <td class="p-3 text-xs">بصمة: ${e.fingerprint} <br> باسورد: ${e.password}</td>
            <td class="p-3 font-bold text-indigo-600 text-xs">${roleAr}</td><td class="p-3 text-xs">${e.buffet}</td>
            <td class="p-3">${e.fingerprint !== currentUser.fingerprint ? `<button onclick="deleteUser('${e.fingerprint}')" class="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold">حذف</button>` : '-'}</td>
        </tr>`;
    }).join('');
}
function deleteUser(fp) { if(currentUser.role === 'super_admin' && confirm('متأكد من الحذف؟')) { employees = employees.filter(e => e.fingerprint !== fp); saveData(); updateUI(); } }

function exportToExcel() {
    let csvContent = "\uFEFF"; 
    csvContent += "اسم الموظف,الإدارة,البوفيه,المشروب,ملاحظات,كمية السكر (ملاعق),حليب,السعر (ج.م),وقت الطلب,حالة الطلب\n";
    
    const filteredOrders = currentUser.role === 'super_admin' ? orders : orders.filter(o => o.buffet === currentUser.buffet || o.managerBuffet === currentUser.buffet);

    filteredOrders.forEach(o => {
        let sugarNum = 0;
        if(o.sugarVal === 'نص معلقة') sugarNum = 0.5; else if(o.sugarVal === 'معلقة') sugarNum = 1; else if(o.sugarVal === 'معلقة ونص') sugarNum = 1.5; else if(o.sugarVal === 'معلقتين') sugarNum = 2; else if(o.sugarVal === 'معلقتين ونص') sugarNum = 2.5; else if(o.sugarVal === 'تلت معالق') sugarNum = 3; else if(o.sugarVal === 'بدون سكر') sugarNum = 0; else sugarNum = '-';
        let milkText = o.milkVal || '-';
        csvContent += `"${o.employee}","${o.dept}","${o.buffet}","${o.item}","${o.notes || ''}","${sugarNum}","${milkText}","${o.price}","${o.time}","${o.status}"\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `تقرير_حسابات_البوفيه_${new Date().toLocaleDateString('ar-EG').replace(/\//g, '-')}.csv`;
    link.click();
}
