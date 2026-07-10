/**
 * premium.js
 */

const Premium = {
  PLANS: [
    { id: "basic", name: "Bepul", price: 0, duration: "Doimiy", features: ["15 ta kiyim", "Kuniga 3 AI"], isFree: true },
    { id: "monthly", name: "Oylik Premium", price: 15000, duration: "1 oy", features: ["Cheksiz kiyim", "Cheksiz AI", "To'liq statistika"], popular: true },
    { id: "yearly", name: "Yillik Premium", price: 120000, duration: "1 yil", features: ["Barcha imtiyozlar", "2 oy bepul"] }
  ],

  init() {
    this.renderPlans();
  },

  renderPlans() {
    const container = document.getElementById('premiumPlansContainer');
    if (!container) {
      console.error("premiumPlansContainer topilmadi!");
      return;
    }

    container.innerHTML = this.PLANS.map(plan => `
      <div class="premium-plan ${plan.popular ? 'popular' : ''}">
        ${plan.popular ? '<div class="popular-tag">Eng yaxshisi</div>' : ''}
        <h3>${plan.name}</h3>
        <div class="price">
          ${plan.price === 0 ? 'Bepul' : plan.price.toLocaleString('uz-UZ') + ' so\'m'}
          <small>/${plan.duration}</small>
        </div>
        <ul>
          ${plan.features.map(f => `<li>✅ ${f}</li>`).join('')}
        </ul>
        <button class="btn ${plan.isFree ? 'btn-secondary' : 'btn-primary'}" onclick="Premium.buy('${plan.id}')">
          ${plan.isFree ? 'Hozir ishlatish' : 'Obuna sotib olish'}
        </button>
      </div>
    `).join('');
  },

  buy(planId) {
    localStorage.setItem('kiyimim_premium_plan', planId);
    UI.toast("Obuna faollashtirildi! (Demo)", "success");
    setTimeout(() => location.reload(), 1000);
  }
};

window.Premium = Premium;