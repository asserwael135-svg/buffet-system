const BUFFETS = ['Alex 1', 'Alex 3', 'Alex 5', 'Alex 6', 'Alex 7', 'Alex 8', 'Alex 9', 'Alex 10', 'Alex 11', 'Alex 12', 'Export', 'Land Mark', 'Chap'];

const DEFAULT_SUGAR_OPTIONS = [
    'بدون سكر',
    'نص معلقة',
    'معلقة',
    'معلقة ونص',
    'معلقتين',
    'معلقتين ونص',
    'تلت معالق'
];

let categories = JSON.parse(localStorage.getItem('buffet_categories_v10')) || [
    { id: 1, name: 'مشروبات ساخنة', icon: '☕' },
    { id: 2, name: 'مشروبات باردة وعصائر', icon: '🧃' },
    { id: 3, name: 'مأكولات وسناكس', icon: '🥐' }
];

let employees = JSON.parse(localStorage.getItem('buffet_emp_v10')) || [
    { name: 'المدير العام', dept: 'الإدارة العليا', fingerprint: '000', password: '123', buffet: 'الكل', role: 'super_admin' },
    { name: 'مدير أليكس 1', dept: 'إدارة اليكس', fingerprint: '111', password: '123', buffet: 'Alex 1', role: 'manager' }
];

let menuItems = JSON.parse(localStorage.getItem('buffet_menu_v10')) || [
    { id: 1, name: 'شاي أحمر', category: 'مشروبات ساخنة', price: 10, icon: '☕', hasSugar: true, sugarOptions: [...DEFAULT_SUGAR_OPTIONS], hasMilk: true },
    { id: 2, name: 'قهوة', category: 'مشروبات ساخنة', price: 20, icon: '☕', hasSugar: true, sugarOptions: [...DEFAULT_SUGAR_OPTIONS], hasMilk: false },
    { id: 3, name: 'نسكافيه', category: 'مشروبات ساخنة', price: 25, icon: '🥛', hasSugar: true, sugarOptions: [...DEFAULT_SUGAR_OPTIONS], hasMilk: true },
    { id: 4, name: 'ماء معدني', category: 'مشروبات باردة وعصائر', price: 5, icon: '💧', hasSugar: false, sugarOptions: [], hasMilk: false },
    { id: 5, name: 'كرواسون', category: 'مأكولات وسناكس', price: 30, icon: '🥐', hasSugar: false, sugarOptions: [], hasMilk: false }
];

let orders = JSON.parse(localStorage.getItem('buffet_orders_v10')) || [];

function saveData() {
    localStorage.setItem('buffet_categories_v10', JSON.stringify(categories));
    localStorage.setItem('buffet_emp_v10', JSON.stringify(employees));
    localStorage.setItem('buffet_menu_v10', JSON.stringify(menuItems));
    localStorage.setItem('buffet_orders_v10', JSON.stringify(orders));
}
