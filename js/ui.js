/**
 * ui.js
 * -----------------------------------------------------------------------
 * Interfeys bilan bog'liq umumiy funksiyalar: sahifalar aro navigatsiya,
 * toast bildirishnomalar, modal oynalar, mavzu (theme) almashtirish va
 * "yuqoriga qaytish" tugmasi.
 * -----------------------------------------------------------------------
 */
const UI = {
  currentView: "home",

  /** "5 daqiqa oldin", "2 soat oldin" kabi nisbiy vaqt matni */
  timeAgo(timestamp) {
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 60) return "hozirgina";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} daqiqa oldin`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} soat oldin`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay} kun oldin`;
    return new Date(timestamp).toLocaleDateString("uz-UZ");
  },

  /** Berilgan nomdagi ekranga (view) o'tish */
  navigateTo(viewName) {
    document
      .querySelectorAll(".view")
      .forEach((v) => v.classList.remove("active"));
    const target = document.getElementById(`view-${viewName}`);
    if (target) target.classList.add("active");

    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.nav === viewName);
    });

    this.currentView = viewName;
    window.scrollTo({
      top: 0,
      behavior: "instant" in window ? "instant" : "auto",
    });

    document
      .querySelector(".bottom-nav")
      .classList.toggle("hide-for-chat", viewName === "chat");

    // Sahifaga kirishda tegishli render funksiyasini chaqirish
    const refreshMap = {
      home: () => App.renderHome(),
      wardrobe: () => Wardrobe.render(),
      favorites: () => Wardrobe.renderFavorites(),
      stats: () => App.renderStats(),
      ai: () => AIEngine.renderOccasions(),
      outfits: () => OutfitsUI.render(),
      calendar: () => CalendarUI.render(),
      badges: () => BadgesUI.render(),
      wishlist: () => WishlistUI.render(),
    };
    if (refreshMap[viewName]) refreshMap[viewName]();
  },

  /** Toast bildirishnoma ko'rsatish: type = 'default' | 'success' | 'error' */
  toast(message, type = "default") {
    const container = document.getElementById("toastContainer");
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    const iconId =
      type === "success"
        ? "ic-check"
        : type === "error"
          ? "ic-close"
          : "ic-bell";
    el.innerHTML = `<svg class="toast-icon" viewBox="0 0 24 24"><use href="#${iconId}"/></svg><span>${message}</span>`;
    container.appendChild(el);
    setTimeout(() => {
      el.classList.add("hide");
      setTimeout(() => el.remove(), 300);
    }, 2600);
  },

  /** Muvaffaqiyat animatsiyasini ko'rsatish (masalan kiyim saqlanganda) */
  showSuccess(text = "Saqlandi!") {
    const overlay = document.getElementById("successOverlay");
    document.getElementById("successText").textContent = text;
    overlay.classList.add("show");
    setTimeout(() => overlay.classList.remove("show"), 1100);
  },

  openModal(id) {
    document.getElementById(id).classList.add("show");
  },
  closeModal(id) {
    document.getElementById(id).classList.remove("show");
  },

  /** Tasdiqlash oynasi (masalan o'chirishdan oldin). onConfirm — callback */
  confirm({ title, text, okLabel = "O'chirish", onConfirm }) {
    document.getElementById("confirmTitle").textContent = title;
    document.getElementById("confirmText").textContent = text;
    const okBtn = document.getElementById("confirmOk");
    const cancelBtn = document.getElementById("confirmCancel");
    okBtn.textContent = okLabel;
    this.openModal("confirmModal");

    const cleanup = () => {
      okBtn.removeEventListener("click", okHandler);
      cancelBtn.removeEventListener("click", cancelHandler);
    };
    const okHandler = () => {
      onConfirm();
      this.closeModal("confirmModal");
      cleanup();
    };
    const cancelHandler = () => {
      this.closeModal("confirmModal");
      cleanup();
    };
    okBtn.addEventListener("click", okHandler);
    cancelBtn.addEventListener("click", cancelHandler);
  },

  /** Mavzu (dark/light) qo'llash va tugmalarni sinxronlash */
  applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    document.getElementById("themeLight").checked = theme === "light";
    document.getElementById("themeDark").checked = theme === "dark";
    SettingsRepo.set({ theme });
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme)
      metaTheme.setAttribute(
        "content",
        theme === "dark" ? "#0B1220" : "#2563EB",
      );
  },

  initTheme() {
    const { theme } = SettingsRepo.get();
    this.applyTheme(theme || "light");
  },

  initBackToTop() {
    const btn = document.getElementById("backToTop");
    document.addEventListener(
      "scroll",
      () => {
        btn.classList.toggle("show", window.scrollY > 400);
      },
      true,
    );
    btn.addEventListener("click", () =>
      window.scrollTo({ top: 0, behavior: "smooth" }),
    );
  },

  /** Ranglar select/chip elementlarini to'ldirish uchun umumiy helper */
  fillSelect(selectEl, options, labelKey = "name", valueKey = "id") {
    selectEl.innerHTML = options
      .map((o) => `<option value="${o[valueKey]}">${o[labelKey]}</option>`)
      .join("");
  },

  /** Tez-tez chaqiriladigan funksiyalarni (masalan qidiruv) kechiktirib
   *  ishga tushiradi — har harf terilganda emas, yozish to'xtagandan keyin */
  debounce(fn, delay = 250) {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },
};