/**
 * recommendation.js — Yangi aqlli tavsiya tizimi
 */

const RecommendationEngine = {
  init() {
    // Tezkor random outfit tugmasi (home sahifasiga qo'shish mumkin)
    this.addQuickRecommendButton();
  },

  /** Rang mosligi jadvali */
  colorHarmony: {
    'qora': ['oq', 'kulrang', 'kok', 'qizil'],
    'oq': ['qora', 'kulrang', 'bej', 'pushti'],
    'kok': ['oq', 'kulrang', 'yashil'],
    'kulrang': ['qora', 'oq', 'kok'],
    'qizil': ['oq', 'qora', 'kulrang'],
    'yashil': ['oq', 'bej', 'kulrang'],
    'bej': ['oq', 'kulrang', 'jigarrang']
  },

  /** Bugungi kun uchun eng yaxshi tavsiya */
  getTodayBestOutfit() {
    const items = ItemsRepo.all();
    if (items.length < 3) return null;

    let bestScore = 0;
    let bestOutfit = null;

    // Oddiy kombinatsiya tanlash
    for (let i = 0; i < 30; i++) {
      const top = items[Math.floor(Math.random() * items.length)];
      const bottom = items[Math.floor(Math.random() * items.length)];
      const shoes = items[Math.floor(Math.random() * items.length)];

      let score = 0;
      if (top.category === 'futbolka' || top.category === 'koylak') score += 20;
      if (bottom.category === 'jinsi' || bottom.category === 'shim') score += 20;
      if (shoes.category === 'krossovka' || shoes.category === 'oyoq-kiyim') score += 15;

      // Rang mosligi
      if (this.colorHarmony[top.color] && this.colorHarmony[top.color].includes(bottom.color)) score += 25;

      if (score > bestScore) {
        bestScore = score;
        bestOutfit = { top, bottom, shoes, score };
      }
    }

    return bestOutfit;
  },

  /** Tezkor random outfit yaratish */
  generateRandomOutfit() {
    const items = ItemsRepo.all();
    if (items.length === 0) {
      UI.toast("Avval garderobga kiyim qo'shing", "error");
      return;
    }

    const top = items.filter(i => ['futbolka', 'koylak'].includes(i.category))[0] || items[0];
    const bottom = items.filter(i => ['jinsi', 'shim', 'shortik'].includes(i.category))[0] || items[1] || items[0];
    const shoes = items.filter(i => ['krossovka', 'oyoq-kiyim'].includes(i.category))[0] || items[2] || items[0];

    const outfit = {
      occasionName: "Tezkor tanlov",
      occasionEmoji: "⚡",
      matchScore: 75,
      itemIds: {
        top: top.id,
        bottom: bottom.id,
        shoes: shoes.id,
        accessory: null
      }
    };

    OutfitsRepo.create(outfit);
    UI.toast("Yangi random outfit saqlandi!", "success");
    UI.navigateTo('outfits');
  },

  addQuickRecommendButton() {
    // Home sahifasiga qo'shish mumkin (keyinroq)
    console.log("✅ Recommendation Engine ishga tushdi");
  }
};

// App init ga ulash
const oldAppInit = App.init;
App.init = function() {
  oldAppInit.call(this);
  RecommendationEngine.init();
};