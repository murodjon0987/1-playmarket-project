/**
 * ai.js
 * -----------------------------------------------------------------------
 * "AI Tavsiya" moduli. Haqiqiy tashqi AI xizmatiga ulanish o'rniga,
 * garderobdagi mavjud kiyimlar asosida oddiy, tushunarli qoidalar bilan
 * ishlaydigan tavsiya mexanizmi (rule-based recommendation engine).
 * -----------------------------------------------------------------------
 */
const AIEngine = {
  selectedOccasion: null,
  lastOccasion: null,
  lastResult: null,
  lastMatchScore: 0,

  SLOTS: {
    top: { label: 'Yuqori kiyim', categories: ['futbolka', 'koylak'] },
    bottom: { label: 'Pastki kiyim', categories: ['shim', 'jinsi', 'shortik'] },
    shoes: { label: 'Oyoq kiyim', categories: ['oyoq-kiyim', 'krossovka'] },
    accessory: { label: 'Aksessuar', categories: ['kepka', 'soat', 'sumka', 'aksessuar', 'kurtka', 'kostyum'] }
  },

  renderOccasions() {
    const grid = document.getElementById('occasionGrid');
    if (grid.dataset.rendered) return; // faqat bir marta chizamiz
    grid.dataset.rendered = '1';
    grid.innerHTML = OCCASIONS.map(o =>
      `<button class="occasion-btn" data-occasion="${o.id}"><span class="oe">${o.emoji}</span>${o.name}</button>`
    ).join('');
    grid.querySelectorAll('.occasion-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        grid.querySelectorAll('.occasion-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedOccasion = btn.dataset.occasion;
        this.generateRecommendation();
      });
    });
    document.getElementById('refreshAiBtn').addEventListener('click', () => this.generateRecommendation(true));
    document.getElementById('saveOutfitBtn').addEventListener('click', () => this.saveCurrentOutfit());
  },

  /** Berilgan slot uchun eng mos kiyimni tanlaydi */
  pickForSlot(slotCategories, occasion, items, exclude, shuffle) {
    let pool = items.filter(it => slotCategories.includes(it.category) && !exclude.has(it.id));
    if (!pool.length) return null;

    // Fasl va vaziyat kategoriyasi bo'yicha ustuvorlik berish
    const scored = pool.map(it => {
      let score = 0;
      if (occasion.seasonPref?.includes(it.season)) score += 2;
      if (occasion.categoryPref?.includes(it.category)) score += 2;
      if (it.isFavorite) score += 1;
      if (it.condition === 'Yangi') score += 0.5;
      return { it, score };
    });
    scored.sort((a, b) => b.score - a.score);

    const topCandidates = shuffle
      ? scored.slice(0, Math.min(3, scored.length))
      : [scored[0]];
    const chosen = topCandidates[Math.floor(Math.random() * topCandidates.length)];
    return chosen ? chosen.it : null;
  },

  generateRecommendation(shuffle = false) {
    const occasion = OCCASIONS.find(o => o.id === this.selectedOccasion);
    if (!occasion) return;

    const items = ItemsRepo.all();
    document.getElementById('aiEmpty').hidden = true;
    document.getElementById('aiResultWrap').hidden = false;

    const exclude = new Set();
    const result = {};
    let filledSlots = 0;

    Object.entries(this.SLOTS).forEach(([key, slot]) => {
      const picked = this.pickForSlot(slot.categories, occasion, items, exclude, shuffle);
      if (picked) {
        exclude.add(picked.id);
        filledSlots++;
      }
      result[key] = picked;
    });

    // Moslik foizini hisoblash: to'lgan slotlar + fasl/vaziyat mosligi asosida
    const totalSlots = Object.keys(this.SLOTS).length;
    let matchScore = Math.round((filledSlots / totalSlots) * 70);
    const bonus = Object.values(result).filter(it => it && (occasion.seasonPref?.includes(it.season) || occasion.categoryPref?.includes(it.category))).length;
    matchScore += bonus * 7;
    matchScore = Math.min(99, Math.max(matchScore, filledSlots ? 45 : 0));
    if (shuffle) matchScore = Math.min(99, matchScore + Math.floor(Math.random() * 6) - 2);

    this.lastOccasion = occasion;
    this.lastResult = result;
    this.lastMatchScore = matchScore;

    this.renderResult(occasion, result, matchScore);

    if (filledSlots === 0) {
      UI.toast("Garderobda mos kiyim topilmadi. Avval kiyim qo'shing.", 'error');
    } else {
      ProgressRepo.incrementAiUsage();
    }
  },

  /** Joriy AI tavsiyasini "Saqlangan outfitlar" bo'limiga saqlaydi */
  saveCurrentOutfit() {
    if (!this.lastOccasion || !this.lastResult) {
      UI.toast('Avval bir vaziyatni tanlang', 'error');
      return;
    }
    const hasAnyItem = Object.values(this.lastResult).some(Boolean);
    if (!hasAnyItem) {
      UI.toast('Saqlash uchun mos kiyim topilmadi', 'error');
      return;
    }
    OutfitsRepo.create({
      occasionId: this.lastOccasion.id,
      occasionName: this.lastOccasion.name,
      occasionEmoji: this.lastOccasion.emoji,
      matchScore: this.lastMatchScore,
      itemIds: {
        top: this.lastResult.top ? this.lastResult.top.id : null,
        bottom: this.lastResult.bottom ? this.lastResult.bottom.id : null,
        shoes: this.lastResult.shoes ? this.lastResult.shoes.id : null,
        accessory: this.lastResult.accessory ? this.lastResult.accessory.id : null
      }
    });
    ActivityRepo.add(`"${this.lastOccasion.name}" uchun outfit saqlandi`, 'ic-star');
    UI.showSuccess('Outfit saqlandi!');
    UI.toast('Outfit "Saqlangan outfitlar" bo\'limiga qo\'shildi', 'success');
  },

  renderResult(occasion, result, matchScore) {
    document.getElementById('aiOccasionTitle').textContent = `${occasion.emoji} ${occasion.name} uchun tavsiya`;
    document.getElementById('aiOccasionDesc').textContent = 'Garderobingizdan tanlangan eng mos kombinatsiya';
    document.getElementById('matchPercent').textContent = `${matchScore}%`;

    const circumference = 2 * Math.PI * 52;
    const ring = document.getElementById('ringFg');
    const offset = circumference - (matchScore / 100) * circumference;
    ring.style.strokeDasharray = circumference;
    // Animatsiya effekti uchun avval to'liq, keyin haqiqiy qiymatga o'tkazamiz
    ring.style.strokeDashoffset = circumference;
    requestAnimationFrame(() => {
      setTimeout(() => { ring.style.strokeDashoffset = offset; }, 60);
    });

    const grid = document.getElementById('aiOutfitGrid');
    grid.innerHTML = Object.entries(this.SLOTS).map(([key, slot]) => {
      const it = result[key];
      return `
        <div class="ai-outfit-slot">
          <div class="ai-outfit-img">
            ${it
              ? (it.photo ? `<img src="${it.photo}" alt="${it.name}">` : `<svg viewBox="0 0 24 24"><use href="#ic-shirt"/></svg>`)
              : `<svg viewBox="0 0 24 24" style="opacity:.3"><use href="#ic-shirt"/></svg>`}
          </div>
          <p class="ai-outfit-label">${slot.label}</p>
          <p class="ai-outfit-name">${it ? it.name : "Yo'q"}</p>
        </div>`;
    }).join('');
  }
};