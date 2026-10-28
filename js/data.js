const BUFFETS = ['Alex 1', 'Alex 3', 'Alex 5', 'Alex 6', 'Alex 7', 'Alex 8', 'Alex 9', 'Alex 10', 'Alex 11', 'Alex 12', 'Export', 'Land Mark', 'Chap'];

// إنشاء حساب المدير العام الافتراضي (super_manager)
let employees = JSON.parse(localStorage.getItem('buffet_emp_v7')) || [
    { name: 'المدير العام', dept: 'الإدارة', fingerprint: '000', password: '123', buffet: 'الكل', role: 'super_manager' }
];

let menuItems = JSON.parse(localStorage.getItem('buffet_menu_v7')) || [
    { id: 1, name: 'شاي أحمر', price: 10, icon: '☕' },
    { id: 2, name: 'قهوة مضبوط', price: 20, icon: '☕' },
    { id: 3, name: 'نسكافيه بلبن', price: 25, icon: '🥛' }
];

let orders = JSON.parse(localStorage.getItem('buffet_orders_v7')) || [];

function saveData() {
    localStorage.setItem('buffet_emp_v7', JSON.stringify(employees));
    localStorage.setItem('buffet_menu_v7', JSON.stringify(menuItems));
    localStorage.setItem('buffet_orders_v7', JSON.stringify(orders));
}
