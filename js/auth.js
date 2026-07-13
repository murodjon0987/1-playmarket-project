/**
 * auth.js
 * -----------------------------------------------------------------------
 * Oddiy (frontend-only) autentifikatsiya: ro'yxatdan o'tish, kirish va
 * chiqish. Barcha ma'lumotlar faqat localStorage'da saqlanadi — real
 * backend yo'q, shuning uchun parollar oddiy matn holida saqlanadi
 * (demo/o'quv maqsad uchun yetarli).
 * -----------------------------------------------------------------------
 */
const Auth = {
  init() {
    this.bindTabs();
    this.bindForms();
    this.bindPasswordToggles();
  },

  bindPasswordToggles() {
    document.querySelectorAll(".pw-toggle-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const input = document.getElementById(btn.dataset.target);
        const isHidden = input.type === "password";
        input.type = isHidden ? "text" : "password";
        btn
          .querySelector("use")
          .setAttribute("href", isHidden ? "#ic-eye-off" : "#ic-eye");
      });
    });
  },

  bindTabs() {
    const tabs = document.querySelectorAll(".auth-tab");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        document
          .querySelectorAll(".auth-form")
          .forEach((f) => f.classList.remove("active"));
        document
          .getElementById(`${tab.dataset.tab}Form`)
          .classList.add("active");
      });
    });
  },

  bindForms() {
    document.getElementById("loginForm").addEventListener("submit", (e) => {
      e.preventDefault();
      this.login();
    });
    document.getElementById("registerForm").addEventListener("submit", (e) => {
      e.preventDefault();
      this.register();
    });
  },

  register() {
    const name = document.getElementById("regName").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const password = document.getElementById("regPassword").value;

    if (!name || !email || password.length < 6) {
      UI.toast(
        "Iltimos, barcha maydonlarni to'g'ri to'ldiring (parol 6+ belgi)",
        "error",
      );
      return;
    }
    if (UsersRepo.findByEmail(email)) {
      UI.toast("Bu email allaqachon ro'yxatdan o'tgan", "error");
      return;
    }
    const user = UsersRepo.create({ name, email, password });
    UsersRepo.setSession(user.id, true);
    UI.toast(`Xush kelibsiz, ${name}!`, "success");
    document.getElementById("auth").style.display = "none";
    OnboardingUI.show();
  },

  login() {
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const remember = document.getElementById("rememberMe").checked;

    const user = UsersRepo.findByEmail(email);
    if (!user || user.password !== password) {
      UI.toast("Email yoki parol noto'g'ri", "error");
      return;
    }
    UsersRepo.setSession(user.id, remember);
    UI.toast(`Xush kelibsiz, ${user.name}!`, "success");
    App.startApp();
  },

  logout() {
    UI.confirm({
      title: "Chiqishni tasdiqlang",
      text: "Hisobingizdan chiqmoqchimisiz?",
      okLabel: "Chiqish",
      onConfirm: () => {
        UsersRepo.clearSession();
        document.getElementById("appShell").style.display = "none";
        document.getElementById("auth").style.display = "flex";
        UI.toast("Tizimdan chiqdingiz");
      },
    });
  },
};
