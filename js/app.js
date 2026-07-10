/**
 * app.js
 * -----------------------------------------------------------------------
 * Ilovaning kirish nuqtasi: splash ekran, autentifikatsiya holatini
 * tekshirish, bosh sahifa va statistika sahifasini render qilish hamda
 * global navigatsiya/sozlamalar tugmalarini ulash.
 * -----------------------------------------------------------------------
 */
const App = {
  init() {
    UI.initTheme();
    this.seedIfNeeded();
    Auth.init();
    Wardrobe.init();
    CalendarUI.init();
    ContactUI.init();
    DonateUI.init();
    this.bindGlobalNav();
    this.bindSettings();
    UI.initBackToTop();

    // Splash screen — 2 soniyadan so'ng tegishli ekranga o'tish
    setTimeout(() => {
      document.getElementById('splash').style.opacity = '0';
      document.getElementById('splash').style.transition = 'opacity .4s ease';
      setTimeout(() => {
        document.getElementById('splash').style.display = 'none';
        const session = UsersRepo.getSession();
        if (session && UsersRepo.getCurrent()) {
          this.startApp();
        } else {
          document.getElementById('auth').style.display = 'flex';
        }
      }, 400);
    }, 1900);
  },

  /** Birinchi marta ochilganda demo kiyimlarni garderobga qo'shish */
  seedIfNeeded() {
    if (Storage.get(STORAGE_KEYS.SEEDED, false)) return;
    getSeedItems().forEach(seed => ItemsRepo.create(seed));
    Storage.set(STORAGE_KEYS.SEEDED, true);
  },

  /** Muvaffaqiyatli kirishdan so'ng asosiy ilova qobig'ini ko'rsatish */
  startApp() {
    document.getElementById('auth').style.display = 'none';
    document.getElementById('appShell').style.display = 'block';
    const user = UsersRepo.getCurrent();
    if (user) {
      document.getElementById('userNameDisplay').textContent = user.name.split(' ')[0];
      document.getElementById('profileName').textContent = user.name;
      document.getElementById('profileEmail').textContent = user.email;
      document.getElementById('profileAvatar').textContent = user.name.slice(0, 2).toUpperCase();
    }
    UI.navigateTo('home');
    this.mockWeather();
    ProgressRepo.recordLoginAndGetStreak();
  },

  bindGlobalNav() {
    document.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', () => {
        if (el.dataset.nav === 'add' && !Wardrobe.state.editingId) Wardrobe.resetForm();
        UI.navigateTo(el.dataset.nav);
      });
    });
    document.getElementById('logoutBtn').addEventListener('click', () => Auth.logout());
    document.getElementById('notifBtn').addEventListener('click', () => {
      UI.toast("Hozircha yangi bildirishnoma yo'q", 'default');
    });
  },

  /* ---------------------------------------------------------------------
     BOSH SAHIFA
  --------------------------------------------------------------------- */
  renderHome() {
    this.renderGreeting();
    this.renderTodayLook();
    this.renderHomeStats();
    this.renderLatestItems();
    this.renderActivity();
  },

  renderGreeting() {
    const hour = new Date().getHours();
    const greeting = hour < 6 ? 'Xayrli tun' : hour < 12 ? 'Xayrli tong' : hour < 18 ? 'Xayrli kun' : 'Xayrli kech';
    document.getElementById('greetingText').textContent = greeting;

    const days = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
    const months = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
    const now = new Date();
    document.getElementById('todayDate').textContent = `${days[now.getDay()]}, ${now.getDate()}-${months[now.getMonth()]}`;
  },

  /** Haqiqiy ob-havo xizmatisiz, kunlik namuna ko'rsatish (demo rejimi) */
  mockWeather() {
    const samples = [
      { text: '24° · Quyoshli', season: 'yoz' },
      { text: '18° · Bulutli', season: 'bahor-kuz' },
      { text: '2° · Qorli', season: 'qish' },
      { text: '30° · Issiq', season: 'yoz' }
    ];
    const day = new Date().getDate();
    const sample = samples[day % samples.length];
    document.getElementById('weatherText').textContent = sample.text;
    this._weatherSeason = sample.season;
  },

  renderTodayLook() {
    const card = document.getElementById('todayLookCard');
    const items = ItemsRepo.all();
    if (!items.length) {
      card.innerHTML = `
        <div class="tl-empty">
          <svg viewBox="0 0 24 24"><use href="#ic-ai"/></svg>
          <p>Bugungi tavsiya uchun avval garderobingizga kiyim qo'shing.</p>
          <button class="btn btn-primary" data-nav="add">Kiyim qo'shish</button>
        </div>`;
      card.querySelector('[data-nav="add"]')?.addEventListener('click', () => UI.navigateTo('add'));
      return;
    }
    // Kunlik tavsiya uchun "sayr" vaziyatini asosiy stsenariy sifatida ishlatamiz
    const occasion = OCCASIONS.find(o => o.id === 'sayr');
    const exclude = new Set();
    const picks = Object.entries(AIEngine.SLOTS).slice(0, 3).map(([key, slot]) => {
      const it = AIEngine.pickForSlot(slot.categories, occasion, items, exclude, false);
      if (it) exclude.add(it.id);
      return { slot, it };
    });
    const matched = picks.filter(p => p.it).length;
    const percent = matched ? Math.round(40 + (matched / picks.length) * 55) : 0;

    card.innerHTML = `
      <div class="tl-head">
        <span class="tl-occasion">Bugun uchun</span>
        <span class="tl-match">${percent}% mos</span>
      </div>
      <div class="tl-items">
        ${picks.map(p => `
          <div class="tl-item">
            <div class="tl-item-img">
              ${p.it
                ? (p.it.photo ? `<img src="${p.it.photo}" alt="${p.it.name}">` : `<svg viewBox="0 0 24 24"><use href="#ic-shirt"/></svg>`)
                : `<svg viewBox="0 0 24 24" style="opacity:.3"><use href="#ic-shirt"/></svg>`}
            </div>
            <p class="tl-item-name">${p.it ? p.it.name : "Yo'q"}</p>
          </div>`).join('')}
      </div>`;
  },

  renderHomeStats() {
    const items = ItemsRepo.all();
    document.getElementById('statTotal').textContent = items.length;
    document.getElementById('statFav').textContent = items.filter(i => i.isFavorite).length;
  },

  renderLatestItems() {
    const scroll = document.getElementById('latestItemScroll');
    const items = ItemsRepo.all().slice(0, 8);
    if (!items.length) {
      scroll.innerHTML = `<p style="font-size:13px;color:var(--text-3)">Hali kiyim qo'shilmagan.</p>`;
      return;
    }
    scroll.innerHTML = items.map(it => `
      <div class="latest-card" data-id="${it.id}">
        <div class="latest-card-img">
          ${it.photo ? `<img src="${it.photo}" alt="${it.name}">` : `<div class="no-img" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(160deg,#eef2f8,#e2e8f4)"><svg viewBox="0 0 24 24" style="width:22px;height:22px;color:var(--text-3)"><use href="#ic-shirt"/></svg></div>`}
        </div>
        <p class="latest-card-name">${it.name}</p>
        <p class="latest-card-cat">${catName(it.category)}</p>
      </div>
    `).join('');
    scroll.querySelectorAll('.latest-card').forEach(card => {
      card.addEventListener('click', () => Wardrobe.openDetail(card.dataset.id));
    });
  },

  renderActivity() {
    const list = document.getElementById('activityList');
    const activities = ActivityRepo.all();
    if (!activities.length) {
      list.innerHTML = `<li class="activity-item"><span class="activity-text" style="color:var(--text-3)">Hali faoliyat mavjud emas.</span></li>`;
      return;
    }
    list.innerHTML = activities.slice(0, 6).map(a => `
      <li class="activity-item">
        <span class="activity-icon"><svg viewBox="0 0 24 24"><use href="#${a.icon}"/></svg></span>
        <div>
          <p class="activity-text">${a.text}</p>
          <p class="activity-time">${this.timeAgo(a.time)}</p>
        </div>
      </li>
    `).join('');
  },

  timeAgo(timestamp) {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return 'Hozirgina';
    if (diff < 3600) return `${Math.floor(diff / 60)} daqiqa oldin`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} soat oldin`;
    return `${Math.floor(diff / 86400)} kun oldin`;
  },

  /* ---------------------------------------------------------------------
     STATISTIKA
  --------------------------------------------------------------------- */
  renderStats() {
    const items = ItemsRepo.all();
    const summary = document.getElementById('statsSummary');

    const catCounts = {};
    const colorCounts = {};
    items.forEach(it => {
      catCounts[it.category] = (catCounts[it.category] || 0) + 1;
      colorCounts[it.color] = (colorCounts[it.color] || 0) + 1;
    });
    const topColorId = Object.entries(colorCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const mostWorn = [...items].sort((a, b) => (b.wearCount || 0) - (a.wearCount || 0))[0];
    const leastWorn = [...items].sort((a, b) => (a.wearCount || 0) - (b.wearCount || 0))[0];

    summary.innerHTML = `
      <div class="stat-card"><span class="stat-num">${items.length}</span><span class="stat-label">Jami kiyimlar</span></div>
      <div class="stat-card stat-card-accent"><span class="stat-num">${topColorId ? colorInfo(topColorId).name : '—'}</span><span class="stat-label">Eng ko'p rang</span></div>
      <div class="stat-card"><span class="stat-num" style="font-size:15px">${mostWorn ? mostWorn.name : '—'}</span><span class="stat-label">Eng ko'p kiyilgan</span></div>
      <div class="stat-card"><span class="stat-num" style="font-size:15px">${leastWorn ? leastWorn.name : '—'}</span><span class="stat-label">Eng kam kiyilgan</span></div>
    `;

    const catChart = document.getElementById('categoryChart');
    const maxCat = Math.max(1, ...Object.values(catCounts));
    const catEntries = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
    catChart.innerHTML = catEntries.length ? catEntries.map(([id, count]) => `
      <div class="bar-row">
        <span class="bar-row-label">${catName(id)}</span>
        <div class="bar-track"><div class="bar-fill" data-width="${(count / maxCat) * 100}"></div></div>
        <span class="bar-row-num">${count}</span>
      </div>
    `).join('') : `<p style="font-size:13px;color:var(--text-3)">Ma'lumot yo'q.</p>`;

    requestAnimationFrame(() => {
      catChart.querySelectorAll('.bar-fill').forEach(bar => {
        bar.style.width = `${bar.dataset.width}%`;
      });
    });

    const colorChart = document.getElementById('colorChart');
    const colorEntries = Object.entries(colorCounts).sort((a, b) => b[1] - a[1]);
    colorChart.innerHTML = colorEntries.length ? colorEntries.map(([id, count]) => `
      <span class="color-pill"><span class="color-swatch" style="background:${colorInfo(id).hex}"></span>${colorInfo(id).name} · ${count}</span>
    `).join('') : `<p style="font-size:13px;color:var(--text-3)">Ma'lumot yo'q.</p>`;
  },

  /* ---------------------------------------------------------------------
     SOZLAMALAR
  --------------------------------------------------------------------- */
  bindSettings() {
    document.getElementById('themeLight').addEventListener('change', () => UI.applyTheme('light'));
    document.getElementById('themeDark').addEventListener('change', () => UI.applyTheme('dark'));

    document.getElementById('notifToggle').addEventListener('change', (e) => {
      SettingsRepo.set({ notifications: e.target.checked });
      UI.toast(e.target.checked ? 'Bildirishnomalar yoqildi' : 'Bildirishnomalar o\'chirildi');
    });

    document.getElementById('backupBtn').addEventListener('click', () => {
      const data = {
        items: ItemsRepo.all(),
        user: UsersRepo.getCurrent(),
        exportedAt: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'kiyimim-ai-zaxira.json';
      a.click();
      URL.revokeObjectURL(url);
      UI.toast('Zaxira nusxa yuklab olindi', 'success');
    });

    document.getElementById('privacyBtn').addEventListener('click', () => {
      UI.toast("Barcha ma'lumotlaringiz faqat shu qurilmada, brauzeringizda saqlanadi.");
    });
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());