let currentUser = null;
let selectedKioskItemId = null;
let selectedKioskCategory = 'ALL';
let currentGuestOrderId = null;

// حالة درجات السكر المؤقتة أثناء الإضافة أو التعديل
let addSugarBuilderState = { all: [...DEFAULT_SUGAR_OPTIONS], selected: [...DEFAULT_SUGAR_OPTIONS] };
let editSugarBuilderState = { all: [...DEFAULT_SUGAR_OPTIONS], selected: [...DEFAULT_SUGAR_OPTIONS] };

const AVAILABLE_EMOJIS = [
    '☕', '🍵', '🥛', '🥤', '🧃', '🧊',
    '💧', '🍋', '🍊', '🍓', '🥭', '🍌',
    '🍫', '🧋', '🧉', '🫖', '🥐', '🥪',
    '🍰', '🍪', '🍩', '🥨', '🧁', '🥗',
    '🍔', '🍕', '🍟', '🌮', '🌯', '🍿',
    '🍦', '🍯', '🥜', '🍎', '🍇', '🍽️'
];

function isImageIcon(icon) {
    return typeof icon === 'string' && icon.startsWith('data:image');
}

function renderIconHtml(icon, imgSizeClass = 'w-6 h-6') {
    if (isImageIcon(icon)) {
        return `<img src="${icon}" alt="icon" class="${imgSizeClass} object-cover rounded-lg inline-block shrink-0">`;
    }
    return `<span class="inline-flex items-center justify-center leading-none">${icon || '🍽️'}</span>`;
}

document.addEventListener('DOMContentLoaded', () => {
    const userData = sessionStorage.getItem('currentUser');
    if (!userData) { window.location.href = 'index.html'; return; }
    
    currentUser = JSON.parse(userData);
    document.getElementById('loggedUserName').textContent = currentUser.name;

    const guestBuffetSelect = document.getElementById('guestBuffet');
    if (guestBuffetSelect) {
        guestBuffetSelect.innerHTML = BUFFETS.map(b => `<option value="${b}">بوفيه ${b}</option>`).join('');
    }

    if (currentUser.role === 'employee') {
        document.getElementById('userRoleTitle').textContent = 'موظف - ' + currentUser.dept;
        const guestSection = document.getElementById('guestRequestSection');
        if (guestSection) guestSection.remove();

        document.getElementById('viewKiosk').classList.remove('hidden');
        renderKiosk();
    } else if (currentUser.role === 'buffet') {
        document.getElementById('userRoleTitle').textContent = 'عامل بوفيه (' + currentUser.buffet + ')';
        document.getElementById('viewBuffet').classList.remove('hidden');
        renderBuffetQueue();
    } else if (currentUser.role === 'super_admin' || currentUser.role === 'manager') {
        document.getElementById('userRoleTitle').textContent = currentUser.role === 'super_admin' ? 'مدير عام (Super)' : `مدير (${currentUser.buffet})`;
        
        const guestSection = document.getElementById('guestRequestSection');
        if (guestSection) guestSection.classList.remove('hidden');
        document.getElementById('guestDescText').textContent = 'سيتم إرسال طلب الضيافة مباشرة إلى البوفيه المختار.';

        document.getElementById('viewKiosk').classList.remove('hidden'); 
        document.getElementById('viewManager').classList.remove('hidden');
        setupManagerUI();
        renderManagerDashboard();
        renderKiosk();
    }
    updateUI();
});

window.addEventListener('storage', () => {
    orders = JSON.parse(localStorage.getItem('buffet_orders_v10')) || [];
    employees = JSON.parse(localStorage.getItem('buffet_emp_v10')) || [];
    menuItems = JSON.parse(localStorage.getItem('buffet_menu_v10')) || [];
    categories = JSON.parse(localStorage.getItem('buffet_categories_v10')) || [];
    updateUI();
});

setInterval(() => {
    const guestModalOpen = document.getElementById('guestOrderModal') && !document.getElementById('guestOrderModal').classList.contains('hidden');
    const editMenuOpen = document.getElementById('editMenuModal') && !document.getElementById('editMenuModal').classList.contains('hidden');
    const editUserOpen = document.getElementById('editUserModal') && !document.getElementById('editUserModal').classList.contains('hidden');
    if (guestModalOpen || editMenuOpen || editUserOpen) return;
    
    orders = JSON.parse(localStorage.getItem('buffet_orders_v10')) || [];
    employees = JSON.parse(localStorage.getItem('buffet_emp_v10')) || [];
    menuItems = JSON.parse(localStorage.getItem('buffet_menu_v10')) || [];
    categories = JSON.parse(localStorage.getItem('buffet_categories_v10')) || [];
    updateUI();
}, 2000);

function updateUI() {
    if (!currentUser) return;
    if (currentUser.role === 'employee' || currentUser.role === 'super_admin' || currentUser.role === 'manager') {
        renderKiosk();
        renderMyOrders();
        renderOrderHistory();
    }
    if (currentUser.role === 'buffet') renderBuffetQueue();
    if (currentUser.role === 'super_admin' || currentUser.role === 'manager') {
        renderManagerDashboard();
        if (currentUser.role === 'super_admin') {
            renderUsersList();
            renderManagerCategories();
            renderManagerMenu();
        }
    }
}

function logout() { sessionStorage.removeItem('currentUser'); window.location.href = 'index.html'; }

/* ================= شاشة الموظف والطلب (مقسمة بالتصنيفات) ================= */
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

function selectKioskCategory(catName) {
    selectedKioskCategory = catName;
    renderKiosk();
}

function buildKioskItemVisual(icon) {
    if (isImageIcon(icon)) {
        return `<div class="w-16 h-16 mx-auto mb-2 rounded-2xl overflow-hidden border border-slate-100 shadow-sm"><img src="${icon}" alt="item" class="w-full h-full object-cover"></div>`;
    }
    return `<div class="text-3xl mb-1">${icon}</div>`;
}

function renderKiosk() {
    const tabsContainer = document.getElementById('kioskCategoryTabs');
    const grid = document.getElementById('kioskItemsGrid');
    if (!grid || !tabsContainer) return;

    // أزرار فلترة التصنيفات
    const allCats = [
        { name: 'ALL', icon: '🍽️', label: 'الكل' },
        ...categories.map(c => ({ name: c.name, icon: c.icon, label: c.name }))
    ];
    tabsContainer.innerHTML = allCats.map(c => {
        const active = selectedKioskCategory === c.name;
        return `
        <button type="button" onclick="selectKioskCategory('${c.name}')" class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all ${active ? 'bg-orange-500 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
            ${renderIconHtml(c.icon, 'w-5 h-5')}
            <span>${c.label}</span>
        </button>`;
    }).join('');

    // تجميع الأصناف تحت التصنيفات
    grid.innerHTML = '';
    const targetCategories = selectedKioskCategory === 'ALL' ? categories : categories.filter(c => c.name === selectedKioskCategory);

    targetCategories.forEach(cat => {
        const catItems = menuItems.filter(m => (m.category || 'مشروبات ساخنة') === cat.name);
        if (catItems.length === 0) return;

        const section = document.createElement('div');
        section.className = 'space-y-2.5';
        section.innerHTML = `<h3 class="font-black text-sm text-slate-700 flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">${renderIconHtml(cat.icon, 'w-6 h-6')} <span>${cat.name}</span> <span class="text-[11px] text-slate-400">(${catItems.length})</span></h3>`;

        const itemsRow = document.createElement('div');
        itemsRow.className = 'grid grid-cols-2 sm:grid-cols-4 gap-3';

        catItems.forEach(item => {
            const isSelected = selectedKioskItemId === item.id;
            const card = document.createElement('div');
            card.onclick = () => { selectedKioskItemId = item.id; renderKiosk(); };
            card.className = `cursor-pointer p-4 rounded-2xl border text-center transition-all flex flex-col justify-center ${
                isSelected ? 'bg-orange-50 border-orange-500 ring-2 ring-orange-200 font-bold shadow-md' : 'bg-white border-slate-200 hover:bg-slate-50'
            }`;
            card.innerHTML = `${buildKioskItemVisual(item.icon)}<div class="text-sm text-slate-800">${item.name}</div><div class="text-[11px] text-slate-400 font-bold mt-0.5">${item.price} ج.م</div>`;
            itemsRow.appendChild(card);
        });

        section.appendChild(itemsRow);
        grid.appendChild(section);
    });

    // أي أصناف بدون تصنيف معروف
    if (selectedKioskCategory === 'ALL') {
        const knownNames = categories.map(c => c.name);
        const uncategorized = menuItems.filter(m => !knownNames.includes(m.category));
        if (uncategorized.length > 0) {
            const section = document.createElement('div');
            section.className = 'space-y-2.5';
            section.innerHTML = `<h3 class="font-black text-sm text-slate-700 bg-slate-50 px-3 py-1.5 rounded-xl">🍽️ أصناف أخرى</h3>`;
            const itemsRow = document.createElement('div');
            itemsRow.className = 'grid grid-cols-2 sm:grid-cols-4 gap-3';
            uncategorized.forEach(item => {
                const isSelected = selectedKioskItemId === item.id;
                const card = document.createElement('div');
                card.onclick = () => { selectedKioskItemId = item.id; renderKiosk(); };
                card.className = `cursor-pointer p-4 rounded-2xl border text-center transition-all flex flex-col justify-center ${
                    isSelected ? 'bg-orange-50 border-orange-500 ring-2 ring-orange-200 font-bold shadow-md' : 'bg-white border-slate-200 hover:bg-slate-50'
                }`;
                card.innerHTML = `${buildKioskItemVisual(item.icon)}<div class="text-sm text-slate-800">${item.name}</div><div class="text-[11px] text-slate-400 font-bold mt-0.5">${item.price} ج.م</div>`;
                itemsRow.appendChild(card);
            });
            section.appendChild(itemsRow);
            grid.appendChild(section);
        }
    }

    // تحديث اختيارات السكر والحليب بناءً على الصنف المختار
    const selectedItem = menuItems.find(m => m.id === selectedKioskItemId);
    const sugarWrap = document.getElementById('kioskSugarWrapper');
    const milkWrap = document.getElementById('kioskMilkWrapper');
    const optionsRow = document.getElementById('kioskOptionsRow');
    const sugarSelect = document.getElementById('kioskSugar');

    if (selectedItem) {
        const allowSugar = selectedItem.hasSugar !== false;
        const allowMilk = selectedItem.hasMilk !== false;

        if (allowSugar && sugarSelect) {
            const opts = (selectedItem.sugarOptions && selectedItem.sugarOptions.length > 0) ? selectedItem.sugarOptions : DEFAULT_SUGAR_OPTIONS;
            const prevVal = sugarSelect.value;
            sugarSelect.innerHTML = opts.map(s => `<option value="${s}" ${s === prevVal ? 'selected' : ''}>${s}</option>`).join('');
            if (!opts.includes(prevVal) && opts.includes('معلقتين')) sugarSelect.value = 'معلقتين';
        }

        sugarWrap.classList.toggle('hidden', !allowSugar);
        milkWrap.classList.toggle('hidden', !allowMilk);
        optionsRow.classList.toggle('hidden', !allowSugar && !allowMilk);
    } else {
        if (sugarSelect && sugarSelect.options.length === 0) {
            sugarSelect.innerHTML = DEFAULT_SUGAR_OPTIONS.map(s => `<option value="${s}" ${s === 'معلقتين' ? 'selected' : ''}>${s}</option>`).join('');
        }
        sugarWrap.classList.remove('hidden');
        milkWrap.classList.remove('hidden');
        optionsRow.classList.remove('hidden');
    }
}

function handleEmployeeOrder(e) {
    e.preventDefault();
    if (!selectedKioskItemId) return alert('برجاء اختيار الصنف أولاً!');
    
    const item = menuItems.find(m => m.id === selectedKioskItemId);
    const allowSugar = item.hasSugar !== false;
    const allowMilk = item.hasMilk !== false;

    const sugarVal = allowSugar ? document.getElementById('kioskSugar').value : 'غير متاح';
    const milkVal = allowMilk ? document.getElementById('kioskMilk').value : 'غير متاح';

    let detailsParts = [];
    if (allowSugar) detailsParts.push(sugarVal);
    if (allowMilk) detailsParts.push(milkVal);
    const detailsText = detailsParts.length > 0 ? detailsParts.join(' - ') : 'بدون إضافات';

    const newOrder = {
        id: Date.now(),
        employee: currentUser.name,
        dept: currentUser.dept,
        buffet: currentUser.buffet,
        category: item.category || 'عام',
        item: item.name,
        price: item.price,
        sugarVal: sugarVal,
        milkVal: milkVal,
        details: detailsText,
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
    if (currentUser.role !== 'super_admin' && currentUser.role !== 'manager') return;

    const selectedBuffet = document.getElementById('guestBuffet').value;
    const newAlert = {
        id: Date.now(),
        employee: currentUser.name,
        dept: currentUser.dept,
        buffet: selectedBuffet, 
        managerBuffet: currentUser.buffet,
        category: 'ضيافة',
        item: '🚨 ضيافة (لم يتم التسجيل بعد)',
        price: 0,
        sugarVal: 'غير متاح',
        milkVal: 'غير متاح',
        details: `ضيافة مطلوبة في مكتب: ${currentUser.name} (${currentUser.dept})`,
        notes: '',
        status: 'قيد الانتظار',
        isGuest: true,
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    };
    orders.unshift(newAlert);
    saveData();
    alert(`تم إرسال طلب الضيافة إلى ${selectedBuffet} مباشرة!`);
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
        let statusColor = o.status === 'قيد الانتظار' ? 'bg-slate-100 text-slate-600' : (isReady ? 'bg-emerald-100 text-emerald-700 font-bold' : 'bg-orange-100 text-orange-700 font-bold');
        let icon = o.status === 'قيد الانتظار' ? 'fa-clock' : (isReady ? 'fa-check-circle' : 'fa-fire-burner animate-pulse');
        
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
        <div class="bg-white border border-slate-200 rounded-xl p-3 flex justify-between items-center mb-2">
            <div class="flex items-center gap-3">
                <div class="bg-emerald-50 text-emerald-600 w-8 h-8 rounded-full flex items-center justify-center"><i class="fas fa-check"></i></div>
                <div class="flex flex-col"><span class="font-bold text-slate-800 text-sm">${o.item}</span></div>
            </div>
            <div class="flex flex-col items-end"><span class="text-xs font-bold text-emerald-600">${o.price} ج.م</span><span class="text-[10px] text-slate-400">${o.time}</span></div>
        </div>
    `).join('');
}

/* ================= شاشة البوفيه ونافذة الضيافة ================= */
function renderBuffetQueue() {
    const container = document.getElementById('buffetOrdersContainer');
    const buffetOrders = orders.filter(o => o.buffet === currentUser.buffet && o.status !== 'جاهز للاستلام' && o.status !== 'تم الاستلام' && o.status !== 'مرفوض');

    if (buffetOrders.length === 0) {
        container.innerHTML = '<div class="col-span-full text-center py-12 text-slate-400 font-bold text-lg border-2 border-dashed border-slate-200 rounded-3xl">لا توجد طلبات جديدة ☕</div>';
        return;
    }

    container.innerHTML = buffetOrders.map(o => {
        let isPending = o.status === 'قيد الانتظار';
        if (o.isGuest && o.item.includes('لم يتم التسجيل')) {
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

function buildCategorizedMenuOptions() {
    let html = '';
    categories.forEach(cat => {
        const catItems = menuItems.filter(m => (m.category || 'مشروبات ساخنة') === cat.name);
        if (catItems.length > 0) {
            const catEmoji = isImageIcon(cat.icon) ? '🖼️' : cat.icon;
            html += `<optgroup label="${catEmoji} ${cat.name}">`;
            html += catItems.map(m => `<option value="${m.id}">${isImageIcon(m.icon) ? '🖼️' : m.icon} ${m.name} (${m.price} ج)</option>`).join('');
            html += `</optgroup>`;
        }
    });
    const knownNames = categories.map(c => c.name);
    const others = menuItems.filter(m => !knownNames.includes(m.category));
    if (others.length > 0) {
        html += `<optgroup label="🍽️ أصناف أخرى">`;
        html += others.map(m => `<option value="${m.id}">${isImageIcon(m.icon) ? '🖼️' : m.icon} ${m.name} (${m.price} ج)</option>`).join('');
        html += `</optgroup>`;
    }
    return html;
}

function generateGuestForms() {
    const count = parseInt(document.getElementById('guestDrinkCount').value);
    if (isNaN(count) || count < 1) return alert('برجاء إدخال عدد صحيح.');

    const container = document.getElementById('guestDrinksContainer');
    container.innerHTML = '';
    const drinkOptions = buildCategorizedMenuOptions();

    for (let i = 1; i <= count; i++) {
        container.innerHTML += `
        <div class="p-4 border border-slate-200 rounded-xl bg-white space-y-3 shadow-sm">
            <h4 class="font-black text-slate-800 text-sm mb-2 border-b pb-2 text-orange-600">صنف رقم ${i}</h4>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                    <label class="block text-xs font-bold text-slate-500 mb-1">الصنف:</label>
                    <select id="guestItem_${i}" onchange="updateGuestItemOptions(${i})" class="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-sm font-bold outline-none">${drinkOptions}</select>
                </div>
                <div id="guestSugarWrap_${i}">
                    <label class="block text-xs font-bold text-slate-500 mb-1">السكر:</label>
                    <select id="guestSugar_${i}" class="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-sm outline-none"></select>
                </div>
                <div id="guestMilkWrap_${i}">
                    <label class="block text-xs font-bold text-slate-500 mb-1">الحليب:</label>
                    <select id="guestMilk_${i}" class="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-sm outline-none"><option value="بدون حليب">بدون حليب</option><option value="مع حليب">مع حليب</option></select>
                </div>
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-500 mb-1">ملاحظات:</label>
                <input type="text" id="guestNotes_${i}" placeholder="مثال: في كوباية كرتون، أو شاي فتلة..." class="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-sm outline-none">
            </div>
        </div>`;
    }
    container.classList.remove('hidden');
    document.getElementById('saveGuestOrderBtn').classList.remove('hidden');

    for (let i = 1; i <= count; i++) {
        updateGuestItemOptions(i);
    }
}

function updateGuestItemOptions(index) {
    const itemId = parseInt(document.getElementById(`guestItem_${index}`).value);
    const item = menuItems.find(m => m.id === itemId);
    if (!item) return;

    const sugarWrap = document.getElementById(`guestSugarWrap_${index}`);
    const sugarSelect = document.getElementById(`guestSugar_${index}`);
    const milkWrap = document.getElementById(`guestMilkWrap_${index}`);

    const allowSugar = item.hasSugar !== false;
    if (allowSugar && sugarSelect) {
        const opts = (item.sugarOptions && item.sugarOptions.length > 0) ? item.sugarOptions : DEFAULT_SUGAR_OPTIONS;
        sugarSelect.innerHTML = opts.map(s => `<option value="${s}" ${s === 'معلقتين' ? 'selected' : ''}>${s}</option>`).join('');
    }
    if (sugarWrap) sugarWrap.classList.toggle('hidden', !allowSugar);
    if (milkWrap) milkWrap.classList.toggle('hidden', item.hasMilk === false);
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
        const allowSugar = menuItem.hasSugar !== false;
        const allowMilk = menuItem.hasMilk !== false;

        const sugarVal = allowSugar ? document.getElementById(`guestSugar_${i}`).value : 'غير متاح';
        const milkVal = allowMilk ? document.getElementById(`guestMilk_${i}`).value : 'غير متاح';
        const notesVal = document.getElementById(`guestNotes_${i}`).value.trim();

        let detailsParts = ['ضيافة'];
        if (allowSugar) detailsParts.push(sugarVal);
        if (allowMilk) detailsParts.push(milkVal);

        newOrders.push({
            id: Date.now() + i, 
            employee: originalOrder.employee + ' (ضيوف)', 
            dept: originalOrder.dept,
            buffet: originalOrder.buffet,
            managerBuffet: originalOrder.managerBuffet,
            category: menuItem.category || 'ضيافة',
            item: menuItem.name,
            price: menuItem.price,
            sugarVal: sugarVal,
            milkVal: milkVal,
            details: detailsParts.join(' - '),
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

/* ================= شاشة المدير وإدارة المنيو والتصنيفات ================= */
function setupManagerUI() {
    const buffetOptions = BUFFETS.map(b => `<option value="${b}">بوفيه ${b}</option>`).join('');
    const addBuffetSelect = document.getElementById('addUBuffet');
    const editBuffetSelect = document.getElementById('editUBuffet');
    if (addBuffetSelect) addBuffetSelect.innerHTML = buffetOptions;
    if (editBuffetSelect) editBuffetSelect.innerHTML = `<option value="الكل">الكل</option>` + buffetOptions;
    
    if (currentUser.role === 'manager') {
        ['mgrTabUsers', 'managerUsersContent', 'mgrTabMenu', 'managerMenuContent'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.remove();
        });
    } else if (currentUser.role === 'super_admin') {
        renderCategoryDropdowns();
        renderManagerCategories();
        renderEmojiPicker('catEmojiPicker', 'newCatIcon', '🍽️');
        renderEmojiPicker('addEmojiPicker', 'addMIcon', '☕');
        resetAddSugarBuilder();
        renderManagerMenu();
    }
}

function switchManagerTab(tabName) {
    const tabs = ['Dashboard', 'Menu', 'Users'];
    tabs.forEach(t => {
        const tabBtn = document.getElementById(`mgrTab${t}`);
        const tabContent = document.getElementById(`manager${t}Content`);
        if (tabBtn) tabBtn.className = "pb-3 text-base sm:text-lg font-black border-b-4 border-transparent text-slate-500 hover:text-slate-800";
        if (tabContent) tabContent.classList.add('hidden');
    });
    
    const key = tabName.charAt(0).toUpperCase() + tabName.slice(1);
    const activeTab = document.getElementById(`mgrTab${key}`);
    const activeContent = document.getElementById(`manager${key}Content`);
    
    if (activeTab) activeTab.className = "pb-3 text-base sm:text-lg font-black border-b-4 border-emerald-500 text-emerald-600";
    if (activeContent) activeContent.classList.remove('hidden');
}

/* === التبديل بين الإيموجي ورفع صورة من الجهاز (للتصنيفات والأصناف) === */
function switchIconInputMode(prefix, mode) {
    const emojiBtn = document.getElementById(`${prefix}ModeEmojiBtn`);
    const imageBtn = document.getElementById(`${prefix}ModeImageBtn`);
    const emojiSec = document.getElementById(`${prefix}EmojiSection`);
    const imageSec = document.getElementById(`${prefix}ImageSection`);
    if (!emojiBtn || !imageBtn || !emojiSec || !imageSec) return;

    const activeCls = prefix === 'cat'
        ? "px-3 py-1.5 rounded-lg text-xs font-black bg-orange-500 text-white transition-all"
        : "py-1.5 rounded-lg text-xs font-black bg-orange-500 text-white transition-all";
    const inactiveCls = prefix === 'cat'
        ? "px-3 py-1.5 rounded-lg text-xs font-black text-slate-600 hover:bg-slate-100 transition-all"
        : "py-1.5 rounded-lg text-xs font-black text-slate-600 hover:bg-white transition-all";

    if (mode === 'emoji') {
        emojiBtn.className = activeCls;
        imageBtn.className = inactiveCls;
        emojiSec.classList.remove('hidden');
        imageSec.classList.add('hidden');
    } else {
        imageBtn.className = activeCls;
        emojiBtn.className = inactiveCls;
        imageSec.classList.remove('hidden');
        emojiSec.classList.add('hidden');
    }
}

function handleIconFileUpload(event, targetInputId, previewContainerId) {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        alert('برجاء اختيار ملف صورة صالح!');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            // تصغير وضغط الصورة تلقائياً لتعمل بسلاسة داخل المتصفح
            const MAX_SIZE = 180;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_SIZE) {
                    height = Math.round((height * MAX_SIZE) / width);
                    width = MAX_SIZE;
                }
            } else {
                if (height > MAX_SIZE) {
                    width = Math.round((width * MAX_SIZE) / height);
                    height = MAX_SIZE;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const compressedDataUrl = canvas.toDataURL('image/webp', 0.85);
            const hiddenInput = document.getElementById(targetInputId);
            const preview = document.getElementById(previewContainerId);

            if (hiddenInput) hiddenInput.value = compressedDataUrl;
            if (preview) {
                preview.innerHTML = `<img src="${compressedDataUrl}" alt="preview" class="w-full h-full object-cover">`;
            }
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

/* === إدارة التصنيفات === */
function renderCategoryDropdowns() {
    const opts = categories.map(c => `<option value="${c.name}">${isImageIcon(c.icon) ? '🖼️' : c.icon} ${c.name}</option>`).join('');
    const addSel = document.getElementById('addMCategory');
    const editSel = document.getElementById('editMCategory');
    if (addSel) addSel.innerHTML = opts;
    if (editSel) editSel.innerHTML = opts;
}

function renderManagerCategories() {
    const container = document.getElementById('managerCategoriesList');
    if (!container || currentUser.role !== 'super_admin') return;

    container.innerHTML = categories.map(c => `
        <div class="flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-black text-slate-700">
            ${renderIconHtml(c.icon, 'w-5 h-5')}
            <span>${c.name}</span>
            ${categories.length > 1 ? `<button type="button" onclick="deleteCategory(${c.id})" class="text-red-500 hover:text-red-700 font-black ml-1" title="حذف التصنيف">&times;</button>` : ''}
        </div>
    `).join('');
}

function handleAddCategory(e) {
    e.preventDefault();
    if (currentUser.role !== 'super_admin') return;

    const name = document.getElementById('newCatName').value.trim();
    const icon = document.getElementById('newCatIcon').value || '🍽️';
    if (!name) return;
    if (categories.some(c => c.name === name)) return alert('هذا التصنيف موجود بالفعل!');

    categories.push({ id: Date.now(), name, icon });
    saveData();

    // إعادة ضبط نموذج التصنيف
    document.getElementById('newCatName').value = '';
    const fileInput = document.getElementById('catImageFile');
    if (fileInput) fileInput.value = '';
    const preview = document.getElementById('catImagePreview');
    if (preview) preview.innerHTML = '🖼️';
    switchIconInputMode('cat', 'emoji');
    renderEmojiPicker('catEmojiPicker', 'newCatIcon', '🍽️');

    renderCategoryDropdowns();
    renderManagerCategories();
    updateUI();
}

function deleteCategory(id) {
    if (currentUser.role !== 'super_admin') return;
    if (categories.length <= 1) return alert('يجب أن يبقى تصنيف واحد على الأقل.');
    const cat = categories.find(c => c.id === id);
    if (!cat) return;

    if (confirm(`حذف تصنيف "${cat.name}"؟ سيتم نقل أي أصناف بداخله إلى التصنيف الأول.`)) {
        categories = categories.filter(c => c.id !== id);
        const fallbackCat = categories[0].name;
        menuItems.forEach(m => {
            if (m.category === cat.name) m.category = fallbackCat;
        });
        saveData();
        renderCategoryDropdowns();
        updateUI();
    }
}

/* === تخصيص درجات السكر لكل مشروب === */
function resetAddSugarBuilder() {
    addSugarBuilderState = { all: [...DEFAULT_SUGAR_OPTIONS], selected: [...DEFAULT_SUGAR_OPTIONS] };
    renderSugarBuilder('add');
}

function toggleSugarBuilder(prefix) {
    const isChecked = document.getElementById(`${prefix}MHasSugar`).checked;
    const wrap = document.getElementById(`${prefix}MSugarOptionsWrap`);
    if (wrap) wrap.classList.toggle('hidden', !isChecked);
}

function renderSugarBuilder(prefix) {
    const state = prefix === 'add' ? addSugarBuilderState : editSugarBuilderState;
    const listEl = document.getElementById(`${prefix}MSugarOptionsList`);
    if (!listEl) return;

    listEl.innerHTML = state.all.map((opt, idx) => {
        const isSelected = state.selected.includes(opt);
        return `
        <button type="button" onclick="toggleSugarOptionChip('${prefix}', ${idx})"
            class="px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${isSelected ? 'bg-orange-500 text-white border-orange-600' : 'bg-white text-slate-500 border-slate-300 line-through'}">
            ${opt}
        </button>`;
    }).join('');
}

function toggleSugarOptionChip(prefix, index) {
    const state = prefix === 'add' ? addSugarBuilderState : editSugarBuilderState;
    const opt = state.all[index];
    if (!opt) return;

    if (state.selected.includes(opt)) {
        if (state.selected.length === 1) return alert('يجب اختيار درجة سكر واحدة على الأقل أو إلغاء تفعيل السكر.');
        state.selected = state.selected.filter(s => s !== opt);
    } else {
        state.selected.push(opt);
    }
    renderSugarBuilder(prefix);
}

function addCustomSugarOption(prefix) {
    const input = document.getElementById(`${prefix}CustomSugarInput`);
    const val = input.value.trim();
    if (!val) return;

    const state = prefix === 'add' ? addSugarBuilderState : editSugarBuilderState;
    if (!state.all.includes(val)) state.all.push(val);
    if (!state.selected.includes(val)) state.selected.push(val);

    input.value = '';
    renderSugarBuilder(prefix);
}

/* === الأيموجي وإدارة الأصناف === */
function renderEmojiPicker(containerId, inputId, selectedEmoji) {
    const container = document.getElementById(containerId);
    const hiddenInput = document.getElementById(inputId);
    if (!container || !hiddenInput) return;

    if (!isImageIcon(selectedEmoji)) {
        hiddenInput.value = selectedEmoji;
    }

    container.innerHTML = AVAILABLE_EMOJIS.map(emoji => {
        const isSelected = emoji === selectedEmoji;
        return `
        <button type="button" onclick="selectEmoji('${containerId}', '${inputId}', '${emoji}')"
            class="text-xl p-1.5 rounded-xl transition-all flex items-center justify-center ${isSelected ? 'bg-orange-500 ring-2 ring-orange-300 scale-110 shadow' : 'bg-white hover:bg-orange-100 border border-slate-200'}">
            ${emoji}
        </button>`;
    }).join('');
}

function selectEmoji(containerId, inputId, emoji) {
    const hiddenInput = document.getElementById(inputId);
    if (hiddenInput) hiddenInput.value = emoji;
    renderEmojiPicker(containerId, inputId, emoji);
}

function handleAddMenuItem(e) {
    e.preventDefault();
    if (currentUser.role !== 'super_admin') return;

    const category = document.getElementById('addMCategory').value;
    const name = document.getElementById('addMName').value.trim();
    const price = Number(document.getElementById('addMPrice').value);
    const icon = document.getElementById('addMIcon').value || '☕';
    const hasSugar = document.getElementById('addMHasSugar').checked;
    const hasMilk = document.getElementById('addMHasMilk').checked;
    const sugarOptions = hasSugar ? [...addSugarBuilderState.selected] : [];

    menuItems.push({
        id: Date.now(),
        category,
        name,
        price,
        icon,
        hasSugar,
        sugarOptions,
        hasMilk
    });

    saveData();
    e.target.reset();
    document.getElementById('addMHasSugar').checked = true;
    document.getElementById('addMHasMilk').checked = true;
    toggleSugarBuilder('add');
    resetAddSugarBuilder();

    const fileInput = document.getElementById('addMImageFile');
    if (fileInput) fileInput.value = '';
    const preview = document.getElementById('addImagePreview');
    if (preview) preview.innerHTML = '🖼️';
    switchIconInputMode('add', 'emoji');
    renderEmojiPicker('addEmojiPicker', 'addMIcon', '☕');

    alert('✅ تم إضافة الصنف الجديد للمنيو بنجاح!');
    updateUI();
}

function renderManagerMenu() {
    const grid = document.getElementById('managerMenuGrid');
    if (!grid || currentUser.role !== 'super_admin') return;

    if (menuItems.length === 0) {
        grid.innerHTML = '<div class="text-center py-6 text-slate-400 font-bold">لا توجد أصناف في المنيو حالياً.</div>';
        return;
    }

    let html = '';
    categories.forEach(cat => {
        const catItems = menuItems.filter(m => (m.category || 'مشروبات ساخنة') === cat.name);
        if (catItems.length === 0) return;

        html += `
        <div class="space-y-3">
            <h4 class="font-black text-base text-slate-800 bg-slate-100 px-4 py-2 rounded-2xl flex items-center justify-between">
                <span class="flex items-center gap-2">${renderIconHtml(cat.icon, 'w-6 h-6')} <span>${cat.name}</span></span>
                <span class="text-xs text-slate-500">${catItems.length} أصناف</span>
            </h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                ${catItems.map(item => renderManagerMenuItemCard(item)).join('')}
            </div>
        </div>`;
    });

    const knownNames = categories.map(c => c.name);
    const others = menuItems.filter(m => !knownNames.includes(m.category));
    if (others.length > 0) {
        html += `
        <div class="space-y-3">
            <h4 class="font-black text-base text-slate-800 bg-slate-100 px-4 py-2 rounded-2xl">🍽️ أصناف أخرى</h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                ${others.map(item => renderManagerMenuItemCard(item)).join('')}
            </div>
        </div>`;
    }

    grid.innerHTML = html;
}

function renderManagerMenuItemCard(item) {
    const allowSugar = item.hasSugar !== false;
    const allowMilk = item.hasMilk !== false;
    const sugarCount = (item.sugarOptions && item.sugarOptions.length > 0) ? item.sugarOptions.length : DEFAULT_SUGAR_OPTIONS.length;

    const visualHtml = isImageIcon(item.icon)
        ? `<img src="${item.icon}" alt="${item.name}" class="w-12 h-12 object-cover rounded-xl border border-slate-200 shadow-sm shrink-0">`
        : `<span class="text-3xl bg-white p-2 rounded-xl border border-slate-200 shadow-sm shrink-0">${item.icon}</span>`;

    return `
    <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between gap-3">
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
                ${visualHtml}
                <div>
                    <h4 class="font-black text-slate-800 text-base">${item.name}</h4>
                    <span class="text-xs font-bold text-emerald-600">${item.price} ج.م</span>
                </div>
            </div>
            <div class="flex gap-1.5">
                <button onclick="openEditMenuModal(${item.id})" class="bg-amber-100 hover:bg-amber-200 text-amber-800 px-2.5 py-1.5 rounded-lg text-xs font-bold" title="تعديل"><i class="fas fa-edit"></i></button>
                <button onclick="deleteMenuItem(${item.id})" class="bg-red-100 hover:bg-red-200 text-red-700 px-2.5 py-1.5 rounded-lg text-xs font-bold" title="حذف"><i class="fas fa-trash"></i></button>
            </div>
        </div>

        <div class="flex gap-2 pt-2 border-t border-slate-200 text-xs font-bold">
            <button onclick="toggleMenuItemOption(${item.id}, 'hasSugar')" class="flex-1 py-1.5 px-2 rounded-lg border transition-all ${allowSugar ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-slate-200 border-slate-300 text-slate-500 line-through'}">
                🍬 سكر: ${allowSugar ? `متاح (${sugarCount})` : 'غير متاح'}
            </button>
            <button onclick="toggleMenuItemOption(${item.id}, 'hasMilk')" class="flex-1 py-1.5 px-2 rounded-lg border transition-all ${allowMilk ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-slate-200 border-slate-300 text-slate-500 line-through'}">
                🥛 حليب: ${allowMilk ? 'متاح' : 'غير متاح'}
            </button>
        </div>
    </div>`;
}

function toggleMenuItemOption(id, field) {
    if (currentUser.role !== 'super_admin') return;
    const item = menuItems.find(m => m.id === id);
    if (!item) return;

    const currentVal = item[field] !== false;
    item[field] = !currentVal;
    if (field === 'hasSugar' && item.hasSugar && (!item.sugarOptions || item.sugarOptions.length === 0)) {
        item.sugarOptions = [...DEFAULT_SUGAR_OPTIONS];
    }
    saveData();
    updateUI();
}

function openEditMenuModal(id) {
    const item = menuItems.find(m => m.id === id);
    if (!item) return;

    renderCategoryDropdowns();
    document.getElementById('editMId').value = item.id;
    document.getElementById('editMCategory').value = item.category || (categories[0] ? categories[0].name : '');
    document.getElementById('editMName').value = item.name;
    document.getElementById('editMPrice').value = item.price;

    const allowSugar = item.hasSugar !== false;
    document.getElementById('editMHasSugar').checked = allowSugar;
    document.getElementById('editMHasMilk').checked = item.hasMilk !== false;

    const itemSugars = (item.sugarOptions && item.sugarOptions.length > 0) ? [...item.sugarOptions] : [...DEFAULT_SUGAR_OPTIONS];
    const combinedAll = Array.from(new Set([...DEFAULT_SUGAR_OPTIONS, ...itemSugars]));
    editSugarBuilderState = { all: combinedAll, selected: itemSugars };
    toggleSugarBuilder('edit');
    renderSugarBuilder('edit');

    const editFileInput = document.getElementById('editMImageFile');
    if (editFileInput) editFileInput.value = '';
    const editPreview = document.getElementById('editImagePreview');

    if (isImageIcon(item.icon)) {
        document.getElementById('editMIcon').value = item.icon;
        if (editPreview) editPreview.innerHTML = `<img src="${item.icon}" alt="preview" class="w-full h-full object-cover">`;
        renderEmojiPicker('editEmojiPicker', 'editMIcon', '☕');
        switchIconInputMode('edit', 'image');
    } else {
        if (editPreview) editPreview.innerHTML = '🖼️';
        renderEmojiPicker('editEmojiPicker', 'editMIcon', item.icon || '☕');
        switchIconInputMode('edit', 'emoji');
    }

    document.getElementById('editMenuModal').classList.remove('hidden');
}

function closeEditMenuModal() {
    document.getElementById('editMenuModal').classList.add('hidden');
}

function saveEditedMenuItem(e) {
    e.preventDefault();
    if (currentUser.role !== 'super_admin') return;

    const id = Number(document.getElementById('editMId').value);
    const item = menuItems.find(m => m.id === id);
    if (!item) return;

    item.category = document.getElementById('editMCategory').value;
    item.name = document.getElementById('editMName').value.trim();
    item.price = Number(document.getElementById('editMPrice').value);
    item.icon = document.getElementById('editMIcon').value || '☕';
    item.hasSugar = document.getElementById('editMHasSugar').checked;
    item.sugarOptions = item.hasSugar ? [...editSugarBuilderState.selected] : [];
    item.hasMilk = document.getElementById('editMHasMilk').checked;

    saveData();
    closeEditMenuModal();
    updateUI();
}

function deleteMenuItem(id) {
    if (currentUser.role !== 'super_admin') return;
    if (confirm('هل أنت متأكد من حذف هذا الصنف من المنيو؟')) {
        menuItems = menuItems.filter(m => m.id !== id);
        if (selectedKioskItemId === id) selectedKioskItemId = null;
        saveData();
        updateUI();
    }
}

/* ================= الإحصائيات وإدارة المستخدمين (إضافة / تعديل / حذف) ================= */
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

function handleCreateUser(e) {
    e.preventDefault();
    if (currentUser.role !== 'super_admin') return; 
    const fp = document.getElementById('addUFingerprint').value.trim();
    if (employees.some(emp => emp.fingerprint === fp)) { return alert('هذه البصمة مسجلة مسبقاً!'); }

    const newUser = {
        name: document.getElementById('addUName').value.trim(),
        dept: document.getElementById('addUDept').value.trim(),
        fingerprint: fp,
        password: document.getElementById('addUPassword').value,
        role: document.getElementById('addURole').value,
        buffet: document.getElementById('addUBuffet').value
    };
    employees.push(newUser);
    saveData();
    e.target.reset();
    alert('تم إضافة الحساب بنجاح!');
    updateUI();
}

function renderUsersList() {
    const list = document.getElementById('managerUsersTableList');
    if (!list || currentUser.role !== 'super_admin') return; 

    list.innerHTML = employees.map(e => {
        let roleAr = e.role === 'super_admin' ? 'مدير عام' : (e.role === 'manager' ? 'مدير' : (e.role === 'buffet' ? 'عامل بوفيه' : 'موظف'));
        return `
        <tr class="border-b hover:bg-slate-50">
            <td class="p-3 font-bold">${e.name} <span class="block text-[10px] text-slate-400">${e.dept}</span></td>
            <td class="p-3 text-xs">بصمة: ${e.fingerprint} <br> باسورد: ${e.password}</td>
            <td class="p-3 font-bold text-indigo-600 text-xs">${roleAr}</td>
            <td class="p-3 text-xs">${e.buffet}</td>
            <td class="p-3 flex items-center gap-1.5">
                <button onclick="openEditUserModal('${e.fingerprint}')" class="bg-amber-100 hover:bg-amber-200 text-amber-800 px-2.5 py-1 rounded text-xs font-bold">تعديل</button>
                ${e.fingerprint !== currentUser.fingerprint ? `<button onclick="deleteUser('${e.fingerprint}')" class="bg-red-100 hover:bg-red-200 text-red-600 px-2.5 py-1 rounded text-xs font-bold">حذف</button>` : ''}
            </td>
        </tr>`;
    }).join('');
}

function openEditUserModal(fp) {
    if (currentUser.role !== 'super_admin') return;
    const emp = employees.find(e => e.fingerprint === fp);
    if (!emp) return;

    document.getElementById('editUOrigFp').value = emp.fingerprint;
    document.getElementById('editUName').value = emp.name;
    document.getElementById('editUDept').value = emp.dept;
    document.getElementById('editUFingerprint').value = emp.fingerprint;
    document.getElementById('editUPassword').value = emp.password;
    document.getElementById('editURole').value = emp.role;
    document.getElementById('editUBuffet').value = emp.buffet;

    document.getElementById('editUserModal').classList.remove('hidden');
}

function closeEditUserModal() {
    document.getElementById('editUserModal').classList.add('hidden');
}

function saveEditedUser(e) {
    e.preventDefault();
    if (currentUser.role !== 'super_admin') return;

    const origFp = document.getElementById('editUOrigFp').value;
    const newFp = document.getElementById('editUFingerprint').value.trim();

    if (newFp !== origFp && employees.some(emp => emp.fingerprint === newFp)) {
        return alert('رقم البصمة الجديد مستخدم بالفعل لحساب آخر!');
    }

    const emp = employees.find(e => e.fingerprint === origFp);
    if (!emp) return;

    emp.name = document.getElementById('editUName').value.trim();
    emp.dept = document.getElementById('editUDept').value.trim();
    emp.fingerprint = newFp;
    emp.password = document.getElementById('editUPassword').value;
    emp.role = document.getElementById('editURole').value;
    emp.buffet = document.getElementById('editUBuffet').value;

    if (currentUser.fingerprint === origFp) {
        currentUser = { ...emp };
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        document.getElementById('loggedUserName').textContent = currentUser.name;
    }

    saveData();
    closeEditUserModal();
    alert('✅ تم تحديث بيانات المستخدم بنجاح!');
    updateUI();
}

function deleteUser(fp) {
    if (currentUser.role === 'super_admin' && confirm('متأكد من الحذف؟')) {
        employees = employees.filter(e => e.fingerprint !== fp);
        saveData();
        updateUI();
    }
}

function exportToExcel() {
    let csvContent = "\uFEFF"; 
    csvContent += "اسم الموظف,الإدارة,البوفيه,التصنيف,الصنف,ملاحظات,كمية السكر (ملاعق),حليب,السعر (ج.م),وقت الطلب,حالة الطلب\n";
    
    const filteredOrders = currentUser.role === 'super_admin' ? orders : orders.filter(o => o.buffet === currentUser.buffet || o.managerBuffet === currentUser.buffet);

    filteredOrders.forEach(o => {
        let sugarVal = o.sugarVal || '-';
        let sugarNum = sugarVal;
        if (sugarVal === 'نص معلقة') sugarNum = 0.5;
        else if (sugarVal === 'معلقة') sugarNum = 1;
        else if (sugarVal === 'معلقة ونص') sugarNum = 1.5;
        else if (sugarVal === 'معلقتين') sugarNum = 2;
        else if (sugarVal === 'معلقتين ونص') sugarNum = 2.5;
        else if (sugarVal === 'تلت معالق') sugarNum = 3;
        else if (sugarVal === 'بدون سكر') sugarNum = 0;
        else if (sugarVal === 'غير متاح') sugarNum = '-';

        let milkText = o.milkVal || '-';
        csvContent += `"${o.employee}","${o.dept}","${o.buffet}","${o.category || 'عام'}","${o.item}","${o.notes || ''}","${sugarNum}","${milkText}","${o.price}","${o.time}","${o.status}"\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `تقرير_حسابات_البوفيه_${new Date().toLocaleDateString('ar-EG').replace(/\//g, '-')}.csv`;
    link.click();
}
