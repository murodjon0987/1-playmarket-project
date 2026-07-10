/**
 * auth.js - Toza va xavfsiz versiya (Parol hash bilan)
 */

const Auth = {
  init() {
    this.bindTabs();
    this.bindForms();
  },

  bindTabs() {
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
        document.getElementById(tab.dataset.tab + 'Form').classList.add('active');
      });
    });
  },

  bindForms() {
    document.getElementById('loginForm').addEventListener('submit', e => {
      e.preventDefault();
      this.login();
    });

    document.getElementById('registerForm').addEventListener('submit', e => {
      e.preventDefault();
      this.register();
    });
  },

  // ================== RO'YXATDAN O'TISH ==================
  async register() {
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;

    if (!name || !email || password.length < 6) {
      UI.toast("Barcha maydonlarni to'ldiring (parol kamida 6 ta belgi)", 'error');
      return;
    }
    if (UsersRepo.findByEmail(email)) {
      UI.toast('Bu email allaqachon ro\'yxatdan o\'tgan', 'error');
      return;
    }

    const hashedPassword = await PasswordUtils.hash(password);
    const user = UsersRepo.create({ name, email, password: hashedPassword });

    UsersRepo.setSession(user.id, true);
    UI.toast(`Xush kelibsiz, ${name}!`, 'success');
    App.startApp();
  },

  // ================== KIRISH ==================
  async login() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const remember = document.getElementById('rememberMe').checked;

    const user = UsersRepo.findByEmail(email);
    if (!user || !(await PasswordUtils.verifyPassword(password, user.password))) {
      UI.toast("Email yoki parol noto'g'ri", 'error');
      return;
    }

    UsersRepo.setSession(user.id, remember);
    UI.toast(`Xush kelibsiz, ${user.name}!`, 'success');
    App.startApp();
  },

  logout() {
    UI.confirm({
      title: 'Chiqish',
      text: 'Hisobingizdan chiqmoqchimisiz?',
      onConfirm: () => {
        UsersRepo.clearSession();
        location.reload();
      }
    });
  }
};

// Parol Hash Utils
const PasswordUtils = {
  async hash(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  },

  async verifyPassword(inputPass, storedHash) {
    const inputHash = await this.hash(inputPass);
    return inputHash === storedHash;
  }
};


// ================== PAROL KO'ZCHA (SHOW / HIDE) ==================
function initPasswordToggles() {
  const toggles = document.querySelectorAll('.password-toggle');
  
  toggles.forEach(toggle => {
    toggle.addEventListener('click', function() {
      const input = this.previousElementSibling;
      
      if (input.type === "password") {
        input.type = "text";
        this.textContent = "🙈";
      } else {
        input.type = "password";
        this.textContent = "👁️";
      }
    });
  });
}

// Auth init ga ulash
const originalInit = Auth.init;
Auth.init = function() {
  originalInit.call(this);
  setTimeout(initPasswordToggles, 800); // sahifa yuklangandan keyin
};