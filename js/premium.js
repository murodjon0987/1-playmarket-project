/**
 * premium.js
 * -----------------------------------------------------------------------
 * Demo "Premium" obuna tizimi. Haqiqiy to'lov tizimiga ulanmaydi — obuna
 * holati faqat qurilmada (localStorage) saqlanadi. Maqsad: bepul rejadagi
 * cheklovlarni (kiyim soni, kunlik AI tavsiya soni) ko'rsatish va
 * Premium'ga o'tganda ularni olib tashlash.
 * -----------------------------------------------------------------------
 */
const PREMIUM_KEY = "kiyimim_premium";
const PREMIUM_LIMITS = {
  FREE_MAX_ITEMS: 30,
  FREE_MAX_AI_PER_DAY: 3,
};
const PREMIUM_PLANS = [
  {
    id: "pro_monthly",
    tier: "Pro",
    label: "Pro — Oylik",
    desc: "Cheksiz kiyim va AI tavsiya",
    price: "12 000 so'm",
    period: "/oy",
    features: [
      "Cheksiz kiyim soni",
      "Cheksiz AI tavsiya",
      "Cheksiz outfit saqlash",
    ],
  },
  {
    id: "pro_yearly",
    tier: "Pro",
    label: "Pro — Yillik",
    desc: "Cheksiz kiyim va AI tavsiya",
    price: "99 000 so'm",
    period: "/yil",
    badge: "2 oy bepul",
    features: [
      "Cheksiz kiyim soni",
      "Cheksiz AI tavsiya",
      "Cheksiz outfit saqlash",
    ],
  },
  {
    id: "max_monthly",
    tier: "Max",
    label: "Max — Oylik",
    desc: "Pro + ustuvor AI va tez qo'llab-quvvatlash",
    price: "29 000 so'm",
    period: "/oy",
    features: [
      "Pro'dagi barcha imkoniyatlar",
      "Ustuvor (tezroq) AI tavsiya",
      "PDF garderob katalogi eksporti",
      "Tezkor qo'llab-quvvatlash",
      "Oltin rangli Max nishoni",
    ],
  },
  {
    id: "max_yearly",
    tier: "Max",
    label: "Max — Yillik",
    desc: "Pro + ustuvor AI va tez qo'llab-quvvatlash",
    price: "249 000 so'm",
    period: "/yil",
    badge: "Eng foydali",
    features: [
      "Pro'dagi barcha imkoniyatlar",
      "Ustuvor (tezroq) AI tavsiya",
      "PDF garderob katalogi eksporti",
      "Tezkor qo'llab-quvvatlash",
      "Oltin rangli Max nishoni",
      "Erta kirish — yangi funksiyalarni birinchi bo'lib sinash",
    ],
  },
];

const PremiumRepo = {
  /** {active:bool, plan:string|null, since:number|null} */
  get() {
    return Storage.get(PREMIUM_KEY, { active: false, plan: null, since: null });
  },
  isActive() {
    return this.get().active === true;
  },
  subscribe(planId) {
    const state = { active: true, plan: planId, since: Date.now() };
    Storage.set(PREMIUM_KEY, state);
    Store.emit("premium:changed", state);
    return state;
  },
  cancel() {
    const state = { active: false, plan: null, since: null };
    Storage.set(PREMIUM_KEY, state);
    Store.emit("premium:changed", state);
    return state;
  },
};

const PremiumUI = {
  init() {
    this.renderBanner();
    this.bindPlansPage();
    Store.on("premium:changed", () => {
      this.renderBanner();
      this.renderPlansPage();
    });
  },

  /** Profil sahifasidagi banner (Premium'ga o'ting / Premium a'zosiz) */
  renderBanner() {
    const title = document.getElementById("premiumBannerTitle");
    const sub = document.getElementById("premiumBannerSub");
    const banner = document.getElementById("premiumBannerBtn");
    if (!title) return;
    if (PremiumRepo.isActive()) {
      banner.classList.add("premium-banner-active");
      title.textContent = "Premium a'zosiz";
      sub.textContent = "Barcha imkoniyatlar ochiq";
    } else {
      banner.classList.remove("premium-banner-active");
      title.textContent = "Premium'ga o'ting";
      sub.textContent = "Cheksiz kiyim, ko'proq AI tavsiya";
    }
  },

  bindPlansPage() {
    document
      .getElementById("premiumSubscribeBtn")
      .addEventListener("click", () => this.handleSubscribeClick());
    document
      .getElementById("premiumCancelBtn")
      .addEventListener("click", () => {
        UI.confirm({
          title: "Obunani bekor qilish",
          text: "Premium imkoniyatlar o'chiriladi. Rostdan ham bekor qilasizmi?",
          okLabel: "Bekor qilish",
          onConfirm: () => {
            PremiumRepo.cancel();
            UI.toast("Obuna bekor qilindi");
          },
        });
      });
    this.renderPlansPage();
  },

  renderPlansPage() {
    const wrap = document.getElementById("premiumPlans");
    const heroTitle = document.getElementById("premiumHeroTitle");
    const heroSub = document.getElementById("premiumHeroSub");
    const subBtn = document.getElementById("premiumSubscribeBtn");
    const cancelBtn = document.getElementById("premiumCancelBtn");
    if (!wrap) return;

    const state = PremiumRepo.get();

    if (state.active) {
      heroTitle.textContent = "Siz Premium a'zosiz";
      heroSub.textContent = "Barcha cheklovlar olib tashlangan";
      const activePlan = PREMIUM_PLANS.find((p) => p.id === state.plan);
      wrap.innerHTML = `<div class="premium-active-card">
        <svg viewBox="0 0 24 24"><use href="#ic-star"/></svg>
        <div>
          <strong>${activePlan ? activePlan.label : "Premium"} reja faol</strong>
          <span>${new Date(state.since).toLocaleDateString("uz-UZ")} sanasidan beri</span>
        </div>
      </div>`;
      subBtn.hidden = true;
      cancelBtn.hidden = false;
      return;
    }

    heroTitle.textContent = "Kiyimim AI Premium";
    heroSub.textContent = "Garderobingizdan maksimal foyda oling";
    subBtn.hidden = false;
    cancelBtn.hidden = true;
    this.selectedPlan = this.selectedPlan || "pro_yearly";

    const basicRow = `
      <div class="premium-plan-basic">
        <strong>Basic — Tekin</strong>
        <span>Joriy reja</span>
      </div>`;

    wrap.innerHTML =
      basicRow +
      PREMIUM_PLANS.map(
        (p) => `
      <button class="premium-plan-card ${p.id === this.selectedPlan ? "active" : ""}" data-plan="${p.id}">
        ${p.badge ? `<span class="premium-plan-badge">${p.badge}</span>` : ""}
        <div class="premium-plan-top">
          <div class="premium-plan-left">
            <span class="premium-plan-label">${p.label}</span>
            <span class="premium-plan-desc">${p.desc}</span>
          </div>
          <span class="premium-plan-price">${p.price}<small>${p.period}</small></span>
          <span class="premium-plan-radio"></span>
        </div>
        <ul class="premium-plan-features">
          ${p.features.map((f) => `<li><svg viewBox="0 0 24 24"><use href="#ic-check"/></svg>${f}</li>`).join("")}
        </ul>
      </button>`,
      ).join("");

    wrap.querySelectorAll("[data-plan]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.selectedPlan = btn.dataset.plan;
        this.renderPlansPage();
      });
    });
  },

  handleSubscribeClick() {
    const plan =
      PREMIUM_PLANS.find((p) => p.id === this.selectedPlan) || PREMIUM_PLANS[1];
    UI.confirm({
      title: "Premium'ga o'tish",
      text: `${plan.label}: ${plan.price}${plan.period}. Bu demo rejim, haqiqiy to'lov olinmaydi.`,
      okLabel: "Tasdiqlash",
      onConfirm: () => {
        PremiumRepo.subscribe(plan.id);
        UI.showSuccess("Premium faollashtirildi!");
        UI.toast("Endi barcha cheklovlar olib tashlandi", "success");
      },
    });
  },

  /** Kiyim qo'shishdan oldin chaqiriladi. true = ruxsat, false = limitga tegdi */
  canAddItem() {
    if (PremiumRepo.isActive()) return true;
    const count = ItemsRepo.all().length;
    if (count >= PREMIUM_LIMITS.FREE_MAX_ITEMS) {
      UI.toast(
        `Bepul rejada eng ko'p ${PREMIUM_LIMITS.FREE_MAX_ITEMS} ta kiyim. Premium'da cheklov yo'q.`,
        "error",
      );
      return false;
    }
    return true;
  },

  /** AI tavsiya olishdan oldin chaqiriladi. true = ruxsat, false = limitga tegdi */
  canUseAiToday() {
    if (PremiumRepo.isActive()) return true;
    const today = new Date().toISOString().slice(0, 10);
    const log = Storage.get("kiyimim_ai_daily", { date: today, count: 0 });
    if (log.date !== today) {
      Storage.set("kiyimim_ai_daily", { date: today, count: 0 });
      return true;
    }
    if (log.count >= PREMIUM_LIMITS.FREE_MAX_AI_PER_DAY) {
      UI.toast(
        `Bepul rejada kuniga ${PREMIUM_LIMITS.FREE_MAX_AI_PER_DAY} ta AI tavsiya. Premium'da cheklov yo'q.`,
        "error",
      );
      return false;
    }
    return true;
  },

  /** AI tavsiyadan foydalanilganda hisobni +1 qiladi */
  logAiUse() {
    if (PremiumRepo.isActive()) return;
    const today = new Date().toISOString().slice(0, 10);
    const log = Storage.get("kiyimim_ai_daily", { date: today, count: 0 });
    const next =
      log.date === today
        ? { date: today, count: log.count + 1 }
        : { date: today, count: 1 };
    Storage.set("kiyimim_ai_daily", next);
  },
};
