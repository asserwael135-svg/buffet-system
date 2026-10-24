document.addEventListener('DOMContentLoaded', () => {
    const regBuffet = document.getElementById('regBuffet');
    if (regBuffet) {
        regBuffet.innerHTML = BUFFETS.map(b => `<option value="${b}">بوفيه ${b}</option>`).join('');
    }
});

function handleLogin(e) {
    e.preventDefault();
    const fp = document.getElementById('loginFingerprint').value.trim();
    const pass = document.getElementById('loginPassword').value;
    
    // التحقق من البصمة وكلمة المرور
    const user = employees.find(e => e.fingerprint === fp && e.password === pass);
    
    if (user) {
        sessionStorage.setItem('currentUser', JSON.stringify(user));
        window.location.href = 'home.html'; // التوجيه التلقائي
    } else {
        alert('رقم البصمة أو كلمة المرور غير صحيحة!');
    }
}

function handleSignup(e) {
    e.preventDefault();
    const fingerprint = document.getElementById('regFingerprint').value.trim();
    
    if(employees.some(emp => emp.fingerprint === fingerprint)) {
        return alert('⚠️ رقم البصمة هذا مسجل مسبقاً!');
    }

    const newEmp = { 
        name: document.getElementById('regName').value.trim(), 
        dept: document.getElementById('regDept').value.trim(), 
        fingerprint: fingerprint,
        password: document.getElementById('regPassword').value,
        buffet: document.getElementById('regBuffet').value, 
        role: document.getElementById('regRole').value 
    };
    
    employees.push(newEmp);
    saveData();
    alert('تم إنشاء الحساب بنجاح! سيتم تحويلك لتسجيل الدخول.');
    window.location.href = 'index.html';
}