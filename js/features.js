/**
 * features.js
 * -----------------------------------------------------------------------
 * Qo'shimcha bo'limlar: Saqlangan outfitlar, Kiyim kalendari,
 * Yutuqlar (badges), Bog'lanish va Loyihani qo'llab-quvvatlash (donat).
 * -----------------------------------------------------------------------
 */

/* ==========================================================================
   SAQLANGAN OUTFITLAR
   ========================================================================== */
const OutfitsUI = {
  render() {
    const grid = document.getElementById('outfitsGrid');
    const empty = document.getElementById('outfitsEmpty');
    const outfits = OutfitsRepo.all();

    if (!outfits.length) {
      grid.innerHTML = '';
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    grid.innerHTML = outfits.map(o => this.cardTemplate(o)).join('');

    grid.querySelectorAll('[data-wear-id]').forEach(btn => {
      btn.addEventListener('click', () => this.wearToday(btn.dataset.wearId));
    });
    grid.querySelectorAll('[data-delete-id]').forEach(btn => {
      btn.addEventListener('click', () => this.remove(btn.dataset.deleteId));
    });
  },

  cardTemplate(o) {
    const slots = ['top', 'bottom', 'shoes', 'accessory'];
    const date = new Date(o.createdAt).toLocaleDateString('uz-UZ');
    return `
      <article class="outfit-card">
        <div class="outfit-card-head">
          <p class="outfit-card-title"><span>${o.occasionEmoji}</span>${o.occasionName}</p>
          <span class="outfit-card-match">${o.matchScore}% mos</span>
        </div>
        <div class="outfit-card-items">
          ${slots.map(key => {
            const itemId = o.itemIds[key];
            const item = itemId ? ItemsRepo.findById(itemId) : null;
            return `<div class="outfit-card-slot">${item
              ? (item.photo ? `<img src="${item.photo}" alt="${item.name}">` : `<svg viewBox="0 0 24 24"><use href="#ic-shirt"/></svg>`)
              : `<svg viewBox="0 0 24 24" style="opacity:.3"><use href="#ic-shirt"/></svg>`}</div>`;
          }).join('')}
        </div>
        <p style="font-size:11px;color:var(--text-3);margin-bottom:10px">${date} sanasida saqlangan</p>
        <div class="outfit-card-foot">
          <button class="btn btn-secondary" data-wear-id="${o.id}">Bugun kiydim</button>
          <button class="btn btn-danger-outline" data-delete-id="${o.id}">O'chirish</button>
        </div>
      </article>`;
  },

  wearToday(id) {
    const outfit = OutfitsRepo.findById(id);
    if (!outfit) return;
    const itemIds = Object.values(outfit.itemIds).filter(Boolean);
    const today = new Date().toISOString().slice(0, 10);
    WearLogRepo.setForDate(today, itemIds, id);
    ActivityRepo.add(`Bugun "${outfit.occasionName}" outfitini kiydingiz`, 'ic-calendar');
    UI.toast('Kalendarga qo\'shildi va kiyilganlar soni yangilandi', 'success');
    App.renderHome();
  },

  remove(id) {
    const outfit = OutfitsRepo.findById(id);
    UI.confirm({
      title: 'Outfitni o\'chirish',
      text: `"${outfit?.occasionName}" kombinatsiyasi o'chiriladi.`,
      onConfirm: () => {
        OutfitsRepo.remove(id);
        UI.toast('Outfit o\'chirildi');
        this.render();
      }
    });
  }
};

/* ==========================================================================
   KIYIM KALENDARI
   ========================================================================== */
const CalendarUI = {
  current: new Date(),
  selected: null,

  init() {
    document.getElementById('calPrevBtn').addEventListener('click', () => this.changeMonth(-1));
    document.getElementById('calNextBtn').addEventListener('click', () => this.changeMonth(1));
  },

  changeMonth(delta) {
    this.current.setMonth(this.current.getMonth() + delta);
    this.render();
  },

  toDateStr(d) {
    return d.toISOString().slice(0, 10);
  },

  render() {
    const months = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
    document.getElementById('calMonthLabel').textContent = `${months[this.current.getMonth()]} ${this.current.getFullYear()}`;

    const year = this.current.getFullYear();
    const month = this.current.getMonth();
    const firstDay = new Date(year, month, 1);
    // Dushanba = 0 bo'lishi uchun siljitish
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = this.toDateStr(new Date());
    const logs = WearLogRepo.all();
    const loggedDates = new Set(logs.map(l => l.date));

    if (!this.selected) this.selected = todayStr;

    const grid = document.getElementById('calendarGrid');
    let html = '';
    for (let i = 0; i < startOffset; i++) html += `<div class="cal-day empty"></div>`;
    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, month, day);
      const dateStr = this.toDateStr(dateObj);
      const classes = ['cal-day'];
      if (dateStr === todayStr) classes.push('today');
      if (dateStr === this.selected) classes.push('selected');
      html += `<button class="${classes.join(' ')}" data-date="${dateStr}">${day}${loggedDates.has(dateStr) ? '<span class="cal-dot"></span>' : ''}</button>`;
    }
    grid.innerHTML = html;
    grid.querySelectorAll('.cal-day:not(.empty)').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selected = btn.dataset.date;
        this.render();
        this.renderDayLog();
      });
    });
    this.renderDayLog();
  },

  renderDayLog() {
    const card = document.getElementById('dayLogCard');
    const log = WearLogRepo.findByDate(this.selected);
    const dateLabel = new Date(this.selected).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' });

    if (log && log.itemIds.length) {
      const items = log.itemIds.map(id => ItemsRepo.findById(id)).filter(Boolean);
      card.innerHTML = `
        <p style="font-size:12.5px;font-weight:700;color:var(--text-2);margin-bottom:10px">${dateLabel}</p>
        <div class="day-log-items">
          ${items.map(it => `<span class="day-log-chip">${it.name}</span>`).join('')}
        </div>
        <div class="detail-actions">
          <button class="btn btn-secondary" id="dayLogEditBtn">Tahrirlash</button>
          <button class="btn btn-danger-outline" id="dayLogDeleteBtn">O'chirish</button>
        </div>`;
      document.getElementById('dayLogEditBtn').addEventListener('click', () => this.openPicker(log.itemIds));
      document.getElementById('dayLogDeleteBtn').addEventListener('click', () => {
        WearLogRepo.removeByDate(this.selected);
        UI.toast('Yozuv o\'chirildi');
        this.render();
      });
    } else {
      card.innerHTML = `
        <p style="font-size:12.5px;font-weight:700;color:var(--text-2);margin-bottom:10px">${dateLabel}</p>
        <p class="day-log-empty">Bu kuni nima kiyganingiz belgilanmagan.</p>
        <button class="btn btn-primary btn-block" id="dayLogAddBtn">Kiyimlarni belgilash</button>`;
      document.getElementById('dayLogAddBtn').addEventListener('click', () => this.openPicker([]));
    }
  },

  openPicker(preselected) {
    const items = ItemsRepo.all();
    if (!items.length) {
      UI.toast("Avval garderobga kiyim qo'shing", 'error');
      return;
    }
    const card = document.getElementById('dayLogCard');
    const selectedSet = new Set(preselected);
    card.innerHTML = `
      <p style="font-size:12.5px;font-weight:700;color:var(--text-2);margin-bottom:10px">Kiygan kiyimlaringizni belgilang</p>
      <div class="item-pick-list">
        ${items.map(it => `
          <label class="item-pick-row ${selectedSet.has(it.id) ? 'checked' : ''}" data-row-id="${it.id}">
            <input type="checkbox" value="${it.id}" ${selectedSet.has(it.id) ? 'checked' : ''}>
            ${it.name}
          </label>`).join('')}
      </div>
      <button class="btn btn-primary btn-block" id="dayLogSaveBtn">Saqlash</button>`;

    card.querySelectorAll('.item-pick-row input').forEach(cb => {
      cb.addEventListener('change', () => {
        cb.closest('.item-pick-row').classList.toggle('checked', cb.checked);
      });
    });
    document.getElementById('dayLogSaveBtn').addEventListener('click', () => {
      const chosen = [...card.querySelectorAll('.item-pick-row input:checked')].map(cb => cb.value);
      WearLogRepo.setForDate(this.selected, chosen);
      ActivityRepo.add(`${new Date(this.selected).toLocaleDateString('uz-UZ')} uchun kiyimlar belgilandi`, 'ic-calendar');
      UI.toast('Kalendar yangilandi', 'success');
      this.render();
      App.renderHome();
    });
  }
};

/* ==========================================================================
   YUTUQLAR (BADGES)
   ========================================================================== */
const BadgesUI = {
  context() {
    return {
      itemsCount: ItemsRepo.all().length,
      favCount: ItemsRepo.all().filter(i => i.isFavorite).length,
      aiUsage: ProgressRepo.getAiUsage(),
      outfitsCount: OutfitsRepo.all().length,
      wearLogCount: WearLogRepo.all().length,
      streak: ProgressRepo.getStreak()
    };
  },

  render() {
    const ctx = this.context();
    const unlockedCount = BADGES.filter(b => b.check(ctx)).length;

    document.getElementById('badgesSummary').innerHTML = `
      <div>
        <span class="badges-summary-num">${unlockedCount}/${BADGES.length}</span>
        <p class="badges-summary-label">Yutuq qo'lga kiritildi</p>
      </div>
      <svg viewBox="0 0 24 24" style="width:36px;height:36px;stroke:var(--primary)"><use href="#ic-award"/></svg>
    `;

    const grid = document.getElementById('badgeGrid');
    grid.innerHTML = BADGES.map(b => {
      const unlocked = b.check(ctx);
      const progress = Math.round(b.progress(ctx) * 100);
      return `
        <div class="badge-card ${unlocked ? '' : 'locked'}">
          <div class="badge-icon"><svg viewBox="0 0 24 24"><use href="#${b.icon}"/></svg></div>
          <p class="badge-name">${b.name}</p>
          <p class="badge-desc">${b.desc}</p>
          <div class="badge-progress"><div class="badge-progress-fill" style="width:${progress}%"></div></div>
        </div>`;
    }).join('');
  }
};

/* ==========================================================================
   BOG'LANISH
   ========================================================================== */
const ContactUI = {
  init() {
    const user = UsersRepo.getCurrent();
    if (user) {
      document.getElementById('contactName').value = user.name;
      document.getElementById('contactEmail').value = user.email;
    }
    document.getElementById('contactForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('contactName').value.trim();
      const email = document.getElementById('contactEmail').value.trim();
      const message = document.getElementById('contactMessage').value.trim();
      if (!name || !email || !message) {
        UI.toast("Iltimos, barcha maydonlarni to'ldiring", 'error');
        return;
      }
      ContactRepo.add({ name, email, message });
      document.getElementById('contactMessage').value = '';
      UI.showSuccess('Yuborildi!');
      UI.toast("Xabaringiz uchun rahmat! Tez orada javob beramiz.", 'success');
    });
  }
};

/* ==========================================================================
   DONAT / QO'LLAB-QUVVATLASH
   ========================================================================== */
const DonateUI = {
  selectedAmount: 25000,

  init() {
    const amountsWrap = document.getElementById('donateAmounts');
    const customInput = document.getElementById('donateCustomAmount');

    amountsWrap.querySelectorAll('.donate-amount-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        amountsWrap.querySelectorAll('.donate-amount-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (btn.dataset.amount === 'custom') {
          customInput.hidden = false;
          customInput.focus();
          this.selectedAmount = Number(customInput.value) || 0;
        } else {
          customInput.hidden = true;
          this.selectedAmount = Number(btn.dataset.amount);
        }
      });
    });
    customInput.addEventListener('input', () => { this.selectedAmount = Number(customInput.value) || 0; });

    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', () => this.copyValue(btn.dataset.copy, btn));
    });

    document.getElementById('donateConfirmBtn').addEventListener('click', () => {
      UI.showSuccess('Rahmat! ❤️');
      UI.toast(`${this.selectedAmount.toLocaleString('uz-UZ')} so'm uchun rahmat — bu demo, real to'lov amalga oshirilmadi`, 'success');
    });
  },

  copyValue(value, btn) {
    const done = () => {
      UI.toast("Rekvizit nusxalandi", 'success');
      btn.classList.add('is-fav');
      setTimeout(() => btn.classList.remove('is-fav'), 800);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(value).then(done).catch(() => this.fallbackCopy(value, done));
    } else {
      this.fallbackCopy(value, done);
    }
  },

  fallbackCopy(value, cb) {
    const ta = document.createElement('textarea');
    ta.value = value;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); cb(); } catch (err) { UI.toast("Nusxalab bo'lmadi", 'error'); }
    ta.remove();
  }
};