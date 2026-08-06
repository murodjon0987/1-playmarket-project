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
    this.bindGlobalNav();
    this.bindSettings();
    UI.initBackToTop();
    this.syncNavHeight();
    this.subscribeToStore();
    OnboardingUI.init();

    // Splash screen — 2 soniyadan so'ng tegishli ekranga o'tish
    setTimeout(() => {
      document.getElementById("splash").style.opacity = "0";
      document.getElementById("splash").style.transition = "opacity .4s ease";
      setTimeout(() => {
        document.getElementById("splash").style.display = "none";
        const session = UsersRepo.getSession();
        if (session && UsersRepo.getCurrent()) {
          this.startApp();
        } else {
          document.getElementById("auth").style.display = "flex";
        }
      }, 400);
    }, 1900);
  },

  /** Ilova endi demo ma'lumotlarsiz, bo'sh garderob bilan boshlanadi.
   *  Eski versiyalarda saqlangan namuna kiyimlar bo'lsa, ularni bir martalik
   *  tozalash orqali olib tashlaymiz (nomi bo'yicha aniqlanadi). */
  seedIfNeeded() {
    if (!Storage.get(STORAGE_KEYS.LEGACY_CLEANED, false)) {
      const legacyNames = new Set([
        "Oq asosiy futbolka",
        "Ko'k klassik jinsi shim",
        "Qora charm krossovka",
        "Kulrang trikotaj kastyum",
        "Yashil parka kurtka",
        "Oq ko'ylak",
        "Bej shortik",
        "Qora spor krossovka",
        "Sariq kepka",
        "Qora klassik soat",
      ]);
      const cleaned = ItemsRepo.all().filter((it) => !legacyNames.has(it.name));
      ItemsRepo.save(cleaned);
      Storage.set(STORAGE_KEYS.LEGACY_CLEANED, true);
    }
    Storage.set(STORAGE_KEYS.SEEDED, true);
  },

  /** Muvaffaqiyatli kirishdan so'ng asosiy ilova qobig'ini ko'rsatish */
  startApp() {
    document.getElementById("auth").style.display = "none";
    document.getElementById("appShell").style.display = "block";
    const user = UsersRepo.getCurrent();
    if (user) {
      document.getElementById("userNameDisplay").textContent =
        user.name.split(" ")[0];
      this.renderProfileHero(user);
    }
    UI.navigateTo("home");
    this.mockWeather();
    CalendarUI.init();
    ContactUI.init();
    DonateUI.init();
    ShareUI.init();
    WishlistUI.init();
    ChatUI.init();
    ProfileEditUI.init();
    ProgressRepo.recordLoginAndGetStreak();
  },

  /** Profil sahifasidagi ism/email/avatarni joriy foydalanuvchi
   *  ma'lumotlariga qarab yangilaydi (rasm bo'lsa — rasm, bo'lmasa — bosh harflar) */
  renderProfileHero(user) {
    document.getElementById("profileName").textContent = user.name;
    document.getElementById("profileEmail").textContent = user.email;
    const initials = user.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
    const avatarEl = document.getElementById("profileAvatar");
    if (user.avatar) {
      avatarEl.innerHTML = `<img src="${user.avatar}" alt="${user.name}">`;
    } else {
      avatarEl.textContent = initials;
    }
  },

  /** Pastki navigatsiya balandligini o'lchab, CSS o'zgaruvchisiga yozadi
   *  (shrift kattalashtirilgan qurilmalarda ham kontent nav ostida qolmasligi uchun) */
  syncNavHeight() {
    const nav = document.querySelector(".bottom-nav");
    if (!nav) return;
    const apply = () => {
      const h = nav.getBoundingClientRect().height;
      if (h > 0)
        document.documentElement.style.setProperty(
          "--nav-h",
          `${Math.ceil(h)}px`,
        );
    };
    apply();
    window.addEventListener("resize", apply);
    if ("ResizeObserver" in window) new ResizeObserver(apply).observe(nav);
  },

  /** Markaziy hodisa oqimi — kiyimlar o'zgarganda faqat joriy ekranga
   *  tegishli qismlarni yangilaydi, har bir modulda alohida chaqirish shart emas */
  subscribeToStore() {
    Store.on("items:changed", () => {
      if (UI.currentView === "home") this.renderHome();
      if (UI.currentView === "wardrobe") Wardrobe.render();
      if (UI.currentView === "favorites") Wardrobe.renderFavorites();
      if (UI.currentView === "stats") this.renderStats();
      // Bosh sahifadagi kartochkalar boshqa ekranda ham eskirmasin
      this.renderHomeStats();
    });
  },

  bindGlobalNav() {
    document.querySelectorAll("[data-nav]").forEach((el) => {
      el.addEventListener("click", () => {
        if (el.dataset.nav === "add" && !Wardrobe.state.editingId)
          Wardrobe.resetForm();
        UI.navigateTo(el.dataset.nav);
      });
    });
    document
      .getElementById("logoutBtn")
      .addEventListener("click", () => Auth.logout());
    document.getElementById("notifBtn").addEventListener("click", () => {
      UI.toast("Hozircha yangi bildirishnoma yo'q", "default");
    });
    document.getElementById("weatherChip").addEventListener("click", () => {
      const mapWrap = document.getElementById("weatherMapWrap");
      if (mapWrap.querySelector("iframe").src) mapWrap.hidden = !mapWrap.hidden;
      else UI.toast("Joylashuv aniqlanmoqda, biroz kuting...", "default");
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
    const greeting =
      hour < 6
        ? "Xayrli tun"
        : hour < 12
          ? "Xayrli tong"
          : hour < 18
            ? "Xayrli kun"
            : "Xayrli kech";
    document.getElementById("greetingText").textContent = greeting;

    const days = [
      "Yakshanba",
      "Dushanba",
      "Seshanba",
      "Chorshanba",
      "Payshanba",
      "Juma",
      "Shanba",
    ];
    const months = [
      "Yanvar",
      "Fevral",
      "Mart",
      "Aprel",
      "May",
      "Iyun",
      "Iyul",
      "Avgust",
      "Sentabr",
      "Oktabr",
      "Noyabr",
      "Dekabr",
    ];
    const now = new Date();
    document.getElementById("todayDate").textContent =
      `${days[now.getDay()]}, ${now.getDate()}-${months[now.getMonth()]}`;

    const streakChip = document.getElementById("streakChip");
    const streak = ProgressRepo.getStreak();
    if (streak >= 2) {
      streakChip.hidden = false;
      streakChip.textContent = `🔥 ${streak} kun ketma-ket`;
    } else {
      streakChip.hidden = true;
    }
  },

  /** Haqiqiy ob-havo — Open-Meteo (kalitsiz, bepul API). Avval brauzer
   *  geolokatsiyasi so'raladi; ruxsat berilmasa yoki xato bo'lsa, IP orqali
   *  taxminiy joylashuv olinadi. Ikkalasi ham ishlamasa — mock qiymat. */
  async mockWeather() {
    const fallback = () => {
      const samples = [
        "24° · Quyoshli",
        "18° · Bulutli",
        "20° · Yomg'irli",
        "30° · Issiq",
      ];
      document.getElementById("weatherText").textContent =
        samples[new Date().getDate() % samples.length];
    };

    const applyWeather = async (latitude, longitude, showMap) => {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`,
        );
        const data = await res.json();
        const temp = Math.round(data.current.temperature_2m);
        const desc = this.weatherCodeToText(data.current.weather_code);
        document.getElementById("weatherText").textContent =
          `${temp}° · ${desc}`;
        if (showMap) {
          const mapWrap = document.getElementById("weatherMapWrap");
          const mapFrame = document.getElementById("weatherMapFrame");
          mapFrame.src = `https://maps.google.com/maps?q=${latitude},${longitude}&z=13&output=embed`;
          mapWrap.hidden = false;
        }
        return true;
      } catch (err) {
        console.error("Ob-havo xatosi:", err);
        return false;
      }
    };

    // IP orqali taxminiy joylashuv (ruxsat so'ramasdan ishlaydi)
    const ipFallback = async () => {
      try {
        const res = await fetch("https://ipapi.co/json/");
        const geo = await res.json();
        if (geo.latitude && geo.longitude) {
          const ok = await applyWeather(geo.latitude, geo.longitude, false);
          if (!ok) fallback();
        } else {
          fallback();
        }
      } catch (err) {
        fallback();
      }
    };

    if (!navigator.geolocation) return ipFallback();
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const ok = await applyWeather(
          pos.coords.latitude,
          pos.coords.longitude,
          true,
        );
        if (!ok) ipFallback();
      },
      () => ipFallback(),
      { timeout: 5000 },
    );
  },

  weatherCodeToText(code) {
    if (code === 0) return "Quyoshli";
    if ([1, 2, 3].includes(code)) return "Bulutli";
    if ([45, 48].includes(code)) return "Tumanli";
    if (code >= 51 && code <= 67) return "Yomg'irli";
    if (code >= 71 && code <= 77) return "Qorli";
    if (code >= 80 && code <= 82) return "Jala";
    if (code >= 95) return "Momaqaldiroq";
    return "O'zgaruvchan";
  },

  renderTodayLook() {
    const card = document.getElementById("todayLookCard");
    const items = ItemsRepo.all();
    if (!items.length) {
      card.innerHTML = `
        <div class="tl-empty">
          <svg viewBox="0 0 24 24"><use href="#ic-ai"/></svg>
          <p>Bugungi tavsiya uchun avval garderobingizga kiyim qo'shing.</p>
          <button class="btn btn-primary" data-nav="add">Kiyim qo'shish</button>
        </div>`;
      card
        .querySelector('[data-nav="add"]')
        ?.addEventListener("click", () => UI.navigateTo("add"));
      return;
    }
    // Kunlik tavsiya uchun "sayr" vaziyatini asosiy stsenariy sifatida ishlatamiz
    const occasion = OCCASIONS.find((o) => o.id === "sayr");
    const exclude = new Set();
    const picks = Object.entries(AIEngine.SLOTS)
      .slice(0, 3)
      .map(([key, slot]) => {
        const it = AIEngine.pickForSlot(
          slot.categories,
          occasion,
          items,
          exclude,
          false,
        );
        if (it) exclude.add(it.id);
        return { slot, it };
      });
    const matched = picks.filter((p) => p.it).length;
    const percent = matched
      ? Math.round(40 + (matched / picks.length) * 55)
      : 0;

    card.innerHTML = `
      <div class="tl-head">
        <span class="tl-occasion">Bugun uchun</span>
        <span class="tl-match">${percent}% mos</span>
      </div>
      <div class="tl-items">
        ${picks
          .map(
            (p) => `
          <div class="tl-item">
            <div class="tl-item-img">
              ${
                p.it
                  ? p.it.photo
                    ? `<img src="${p.it.photo}" alt="${p.it.name}">`
                    : `<svg viewBox="0 0 24 24"><use href="#ic-shirt"/></svg>`
                  : `<svg viewBox="0 0 24 24" style="opacity:.3"><use href="#ic-shirt"/></svg>`
              }
            </div>
            <p class="tl-item-name">${p.it ? p.it.name : "Yo'q"}</p>
          </div>`,
          )
          .join("")}
      </div>`;
  },

  renderHomeStats() {
    const items = ItemsRepo.all();
    document.getElementById("statTotal").textContent = items.length;
    document.getElementById("statFav").textContent = items.filter(
      (i) => i.isFavorite,
    ).length;
  },

  renderLatestItems() {
    const scroll = document.getElementById("latestItemScroll");
    const items = ItemsRepo.all().slice(0, 8);
    if (!items.length) {
      scroll.innerHTML = `<p style="font-size:13px;color:var(--text-3)">Hali kiyim qo'shilmagan.</p>`;
      return;
    }
    scroll.innerHTML = items
      .map(
        (it) => `
      <div class="latest-card" data-id="${it.id}">
        <div class="latest-card-img">
          ${it.photo ? `<img src="${it.photo}" alt="${it.name}">` : `<div class="no-img" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(160deg,#eef2f8,#e2e8f4)"><svg viewBox="0 0 24 24" style="width:22px;height:22px;color:var(--text-3)"><use href="#ic-shirt"/></svg></div>`}
        </div>
        <p class="latest-card-name">${it.name}</p>
        <p class="latest-card-cat">${catName(it.category)}</p>
      </div>
    `,
      )
      .join("");
    scroll.querySelectorAll(".latest-card").forEach((card) => {
      card.addEventListener("click", () =>
        Wardrobe.openDetail(card.dataset.id),
      );
    });
  },

  renderActivity() {
    const list = document.getElementById("activityList");
    const activities = ActivityRepo.all();
    if (!activities.length) {
      list.innerHTML = `<li class="activity-item"><span class="activity-text" style="color:var(--text-3)">Hali faoliyat mavjud emas.</span></li>`;
      return;
    }
    list.innerHTML = activities
      .slice(0, 6)
      .map(
        (a) => `
      <li class="activity-item">
        <span class="activity-icon"><svg viewBox="0 0 24 24"><use href="#${a.icon}"/></svg></span>
        <div>
          <p class="activity-text">${a.text}</p>
          <p class="activity-time">${this.timeAgo(a.time)}</p>
        </div>
      </li>
    `,
      )
      .join("");
  },

  timeAgo(timestamp) {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return "Hozirgina";
    if (diff < 3600) return `${Math.floor(diff / 60)} daqiqa oldin`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} soat oldin`;
    return `${Math.floor(diff / 86400)} kun oldin`;
  },

  /* ---------------------------------------------------------------------
     STATISTIKA
  --------------------------------------------------------------------- */
  renderStats() {
    const items = ItemsRepo.all();
    const summary = document.getElementById("statsSummary");

    const catCounts = {};
    const colorCounts = {};
    items.forEach((it) => {
      catCounts[it.category] = (catCounts[it.category] || 0) + 1;
      colorCounts[it.color] = (colorCounts[it.color] || 0) + 1;
    });
    const topColorId = Object.entries(colorCounts).sort(
      (a, b) => b[1] - a[1],
    )[0]?.[0];
    const mostWorn = [...items].sort(
      (a, b) => (b.wearCount || 0) - (a.wearCount || 0),
    )[0];
    const leastWorn = [...items].sort(
      (a, b) => (a.wearCount || 0) - (b.wearCount || 0),
    )[0];

    summary.innerHTML = `
      <div class="stat-card"><span class="stat-num">${items.length}</span><span class="stat-label">Jami kiyimlar</span></div>
      <div class="stat-card stat-card-accent"><span class="stat-num">${topColorId ? colorInfo(topColorId).name : "—"}</span><span class="stat-label">Eng ko'p rang</span></div>
      <div class="stat-card"><span class="stat-num" style="font-size:15px">${mostWorn ? mostWorn.name : "—"}</span><span class="stat-label">Eng ko'p kiyilgan</span></div>
      <div class="stat-card"><span class="stat-num" style="font-size:15px">${leastWorn ? leastWorn.name : "—"}</span><span class="stat-label">Eng kam kiyilgan</span></div>
    `;

    this.renderCapsuleAnalyzer(items);

    const catChart = document.getElementById("categoryChart");
    const maxCat = Math.max(1, ...Object.values(catCounts));
    const catEntries = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
    catChart.innerHTML = catEntries.length
      ? catEntries
          .map(
            ([id, count]) => `
      <div class="bar-row">
        <span class="bar-row-label">${catName(id)}</span>
        <div class="bar-track"><div class="bar-fill" data-width="${(count / maxCat) * 100}"></div></div>
        <span class="bar-row-num">${count}</span>
      </div>
    `,
          )
          .join("")
      : `<p style="font-size:13px;color:var(--text-3)">Ma'lumot yo'q.</p>`;

    requestAnimationFrame(() => {
      catChart.querySelectorAll(".bar-fill").forEach((bar) => {
        bar.style.width = `${bar.dataset.width}%`;
      });
    });

    const colorChart = document.getElementById("colorChart");
    const colorEntries = Object.entries(colorCounts).sort(
      (a, b) => b[1] - a[1],
    );
    colorChart.innerHTML = colorEntries.length
      ? colorEntries
          .map(
            ([id, count]) => `
      <span class="color-pill"><span class="color-swatch" style="background:${colorInfo(id).hex}"></span>${colorInfo(id).name} · ${count}</span>
    `,
          )
          .join("")
      : `<p style="font-size:13px;color:var(--text-3)">Ma'lumot yo'q.</p>`;
  },

  /** Capsule Wardrobe Analyzer — garderobdagi kiyimlar bilan yasash mumkin
   *  bo'lgan barcha "yuqori + pastki + oyoq kiyim" kombinatsiyalarini hisoblaydi */
  renderCapsuleAnalyzer(items) {
    const tops = items.filter((it) =>
      AIEngine.SLOTS.top.categories.includes(it.category),
    );
    const bottoms = items.filter((it) =>
      AIEngine.SLOTS.bottom.categories.includes(it.category),
    );
    const shoes = items.filter((it) =>
      AIEngine.SLOTS.shoes.categories.includes(it.category),
    );

    const totalCombos = tops.length * bottoms.length * shoes.length;
    document.getElementById("capsuleHero").innerHTML = `
      <span class="capsule-hero-num">${totalCombos}</span>
      <p class="capsule-hero-label">xil kombinatsiya yasash mumkin (${items.length} ta kiyim bilan)</p>
    `;

    const insights = [];

    const combosPerItem = (group1, group2) => group1.length * group2.length;
    let bestItem = null,
      bestCount = 0;
    tops.forEach((it) => {
      const c = combosPerItem(bottoms, shoes);
      if (c > bestCount) {
        bestCount = c;
        bestItem = it;
      }
    });
    bottoms.forEach((it) => {
      const c = combosPerItem(tops, shoes);
      if (c > bestCount) {
        bestCount = c;
        bestItem = it;
      }
    });
    if (bestItem && bestCount > 0) {
      insights.push({
        icon: "ic-star",
        text: `<b>${bestItem.name}</b> eng ko'p qatnashadi — u bilan <b>${bestCount}</b> xil kombinatsiya yasash mumkin.`,
      });
    }

    const gaps = [];
    if (!tops.length) gaps.push("yuqori kiyim (futbolka/ko'ylak)");
    if (!bottoms.length) gaps.push("pastki kiyim (shim/jinsi)");
    if (!shoes.length) gaps.push("oyoq kiyim");
    if (gaps.length) {
      insights.push({
        icon: "ic-gift",
        text: `Garderobingizda <b>${gaps.join(", ")}</b> yetishmayapti — shu turkumdan qo'shsangiz, kombinatsiyalar soni oshadi.`,
      });
    } else if (totalCombos > 0) {
      const weakest = [
        { name: "yuqori kiyim", count: tops.length },
        { name: "pastki kiyim", count: bottoms.length },
        { name: "oyoq kiyim", count: shoes.length },
      ].sort((a, b) => a.count - b.count)[0];
      insights.push({
        icon: "ic-chart",
        text: `Eng kam soni — <b>${weakest.name}</b> (${weakest.count} dona). Shu turkumga 1 ta qo'shsangiz, kombinatsiyalar soni sezilarli ko'payadi.`,
      });
    }

    if (!items.length) {
      insights.push({
        icon: "ic-shirt",
        text: "Tahlil uchun avval garderobingizga kiyim qo'shing.",
      });
    }

    document.getElementById("capsuleInsights").innerHTML = insights
      .map(
        (i) => `
      <div class="capsule-insight-row">
        <span class="capsule-insight-icon"><svg viewBox="0 0 24 24"><use href="#${i.icon}"/></svg></span>
        <p class="capsule-insight-text">${i.text}</p>
      </div>
    `,
      )
      .join("");
  },

  /* ---------------------------------------------------------------------
     SOZLAMALAR
  --------------------------------------------------------------------- */
  bindSettings() {
    document
      .getElementById("themeLight")
      .addEventListener("change", () => UI.applyTheme("light"));
    document
      .getElementById("themeDark")
      .addEventListener("change", () => UI.applyTheme("dark"));

    document.getElementById("notifToggle").addEventListener("change", (e) => {
      SettingsRepo.set({ notifications: e.target.checked });
      UI.toast(
        e.target.checked
          ? "Bildirishnomalar yoqildi"
          : "Bildirishnomalar o'chirildi",
      );
    });

    document.getElementById("backupBtn").addEventListener("click", () => {
      const data = {
        items: ItemsRepo.all(),
        user: UsersRepo.getCurrent(),
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "kiyimim-ai-zaxira.json";
      a.click();
      URL.revokeObjectURL(url);
      UI.toast("Zaxira nusxa yuklab olindi", "success");
    });

    document.getElementById("privacyBtn").addEventListener("click", () => {
      UI.toast(
        "Barcha ma'lumotlaringiz faqat shu qurilmada, brauzeringizda saqlanadi.",
      );
    });
  },
};

document.addEventListener("DOMContentLoaded", () => App.init());
