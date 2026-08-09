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
    const grid = document.getElementById("outfitsGrid");
    const empty = document.getElementById("outfitsEmpty");
    const outfits = OutfitsRepo.all();

    if (!outfits.length) {
      grid.innerHTML = "";
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    grid.innerHTML = outfits.map((o) => this.cardTemplate(o)).join("");

    grid.querySelectorAll("[data-wear-id]").forEach((btn) => {
      btn.addEventListener("click", () => this.wearToday(btn.dataset.wearId));
    });
    grid.querySelectorAll("[data-delete-id]").forEach((btn) => {
      btn.addEventListener("click", () => this.remove(btn.dataset.deleteId));
    });
  },

  cardTemplate(o) {
    const slots = ["top", "bottom", "shoes", "accessory"];
    const date = new Date(o.createdAt).toLocaleDateString("uz-UZ");
    return `
      <article class="outfit-card">
        <div class="outfit-card-head">
          <p class="outfit-card-title"><span>${o.occasionEmoji}</span>${o.occasionName}</p>
          <span class="outfit-card-match">${o.matchScore}% mos</span>
        </div>
        <div class="outfit-card-items">
          ${slots
            .map((key) => {
              const itemId = o.itemIds[key];
              const item = itemId ? ItemsRepo.findById(itemId) : null;
              return `<div class="outfit-card-slot">${
                item
                  ? item.photo
                    ? `<img src="${item.photo}" alt="${item.name}">`
                    : `<svg viewBox="0 0 24 24"><use href="#ic-shirt"/></svg>`
                  : `<svg viewBox="0 0 24 24" style="opacity:.3"><use href="#ic-shirt"/></svg>`
              }</div>`;
            })
            .join("")}
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
    ActivityRepo.add(
      `Bugun "${outfit.occasionName}" outfitini kiydingiz`,
      "ic-calendar",
    );
    UI.toast("Kalendarga qo'shildi va kiyilganlar soni yangilandi", "success");
  },

  remove(id) {
    const outfit = OutfitsRepo.findById(id);
    UI.confirm({
      title: "Outfitni o'chirish",
      text: `"${outfit?.occasionName}" kombinatsiyasi o'chiriladi.`,
      onConfirm: () => {
        OutfitsRepo.remove(id);
        UI.toast("Outfit o'chirildi");
        this.render();
      },
    });
  },
};

/* ==========================================================================
   KIYIM KALENDARI
   ========================================================================== */
const CalendarUI = {
  current: new Date(),
  selected: null,

  init() {
    document
      .getElementById("calPrevBtn")
      .addEventListener("click", () => this.changeMonth(-1));
    document
      .getElementById("calNextBtn")
      .addEventListener("click", () => this.changeMonth(1));
  },

  changeMonth(delta) {
    this.current.setMonth(this.current.getMonth() + delta);
    this.render();
  },

  toDateStr(d) {
    return d.toISOString().slice(0, 10);
  },

  render() {
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
    document.getElementById("calMonthLabel").textContent =
      `${months[this.current.getMonth()]} ${this.current.getFullYear()}`;

    const year = this.current.getFullYear();
    const month = this.current.getMonth();
    const firstDay = new Date(year, month, 1);
    // Dushanba = 0 bo'lishi uchun siljitish
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = this.toDateStr(new Date());
    const logs = WearLogRepo.all();
    const loggedDates = new Set(logs.map((l) => l.date));

    if (!this.selected) this.selected = todayStr;

    const grid = document.getElementById("calendarGrid");
    let html = "";
    for (let i = 0; i < startOffset; i++)
      html += `<div class="cal-day empty"></div>`;
    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, month, day);
      const dateStr = this.toDateStr(dateObj);
      const classes = ["cal-day"];
      if (dateStr === todayStr) classes.push("today");
      if (dateStr === this.selected) classes.push("selected");
      html += `<button class="${classes.join(" ")}" data-date="${dateStr}">${day}${loggedDates.has(dateStr) ? '<span class="cal-dot"></span>' : ""}</button>`;
    }
    grid.innerHTML = html;
    grid.querySelectorAll(".cal-day:not(.empty)").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.selected = btn.dataset.date;
        this.render();
        this.renderDayLog();
      });
    });
    this.renderDayLog();
  },

  renderDayLog() {
    const card = document.getElementById("dayLogCard");
    const log = WearLogRepo.findByDate(this.selected);
    const dateLabel = new Date(this.selected).toLocaleDateString("uz-UZ", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    if (log && log.itemIds.length) {
      const items = log.itemIds
        .map((id) => ItemsRepo.findById(id))
        .filter(Boolean);
      card.innerHTML = `
        <p style="font-size:12.5px;font-weight:700;color:var(--text-2);margin-bottom:10px">${dateLabel}</p>
        <div class="day-log-items">
          ${items.map((it) => `<span class="day-log-chip">${it.name}</span>`).join("")}
        </div>
        <div class="detail-actions">
          <button class="btn btn-secondary" id="dayLogEditBtn">Tahrirlash</button>
          <button class="btn btn-danger-outline" id="dayLogDeleteBtn">O'chirish</button>
        </div>`;
      document
        .getElementById("dayLogEditBtn")
        .addEventListener("click", () => this.openPicker(log.itemIds));
      document
        .getElementById("dayLogDeleteBtn")
        .addEventListener("click", () => {
          WearLogRepo.removeByDate(this.selected);
          UI.toast("Yozuv o'chirildi");
          this.render();
        });
    } else {
      card.innerHTML = `
        <p style="font-size:12.5px;font-weight:700;color:var(--text-2);margin-bottom:10px">${dateLabel}</p>
        <p class="day-log-empty">Bu kuni nima kiyganingiz belgilanmagan.</p>
        <button class="btn btn-primary btn-block" id="dayLogAddBtn">Kiyimlarni belgilash</button>`;
      document
        .getElementById("dayLogAddBtn")
        .addEventListener("click", () => this.openPicker([]));
    }
  },

  openPicker(preselected) {
    const items = ItemsRepo.all();
    if (!items.length) {
      UI.toast("Avval garderobga kiyim qo'shing", "error");
      return;
    }
    const card = document.getElementById("dayLogCard");
    const selectedSet = new Set(preselected);
    card.innerHTML = `
      <p style="font-size:12.5px;font-weight:700;color:var(--text-2);margin-bottom:10px">Kiygan kiyimlaringizni belgilang</p>
      <div class="item-pick-list">
        ${items
          .map(
            (it) => `
          <label class="item-pick-row ${selectedSet.has(it.id) ? "checked" : ""}" data-row-id="${it.id}">
            <input type="checkbox" value="${it.id}" ${selectedSet.has(it.id) ? "checked" : ""}>
            ${it.name}
          </label>`,
          )
          .join("")}
      </div>
      <button class="btn btn-primary btn-block" id="dayLogSaveBtn">Saqlash</button>`;

    card.querySelectorAll(".item-pick-row input").forEach((cb) => {
      cb.addEventListener("change", () => {
        cb.closest(".item-pick-row").classList.toggle("checked", cb.checked);
      });
    });
    document.getElementById("dayLogSaveBtn").addEventListener("click", () => {
      const chosen = [
        ...card.querySelectorAll(".item-pick-row input:checked"),
      ].map((cb) => cb.value);
      WearLogRepo.setForDate(this.selected, chosen);
      ActivityRepo.add(
        `${new Date(this.selected).toLocaleDateString("uz-UZ")} uchun kiyimlar belgilandi`,
        "ic-calendar",
      );
      UI.toast("Kalendar yangilandi", "success");
      this.render();
    });
  },
};

/* ==========================================================================
   YUTUQLAR (BADGES)
   ========================================================================== */
const BadgesUI = {
  context() {
    return {
      itemsCount: ItemsRepo.all().length,
      favCount: ItemsRepo.all().filter((i) => i.isFavorite).length,
      aiUsage: ProgressRepo.getAiUsage(),
      outfitsCount: OutfitsRepo.all().length,
      wearLogCount: WearLogRepo.all().length,
      streak: ProgressRepo.getStreak(),
    };
  },

  render() {
    const ctx = this.context();
    const unlockedCount = BADGES.filter((b) => b.check(ctx)).length;

    document.getElementById("badgesSummary").innerHTML = `
      <div>
        <span class="badges-summary-num">${unlockedCount}/${BADGES.length}</span>
        <p class="badges-summary-label">Yutuq qo'lga kiritildi</p>
      </div>
      <svg viewBox="0 0 24 24" style="width:36px;height:36px;stroke:var(--primary)"><use href="#ic-award"/></svg>
    `;

    const grid = document.getElementById("badgeGrid");
    grid.innerHTML = BADGES.map((b) => {
      const unlocked = b.check(ctx);
      const progress = Math.round(b.progress(ctx) * 100);
      return `
        <div class="badge-card ${unlocked ? "" : "locked"}">
          <div class="badge-icon"><svg viewBox="0 0 24 24"><use href="#${b.icon}"/></svg></div>
          <p class="badge-name">${b.name}</p>
          <p class="badge-desc">${b.desc}</p>
          <div class="badge-progress"><div class="badge-progress-fill" style="width:${progress}%"></div></div>
        </div>`;
    }).join("");
  },
};

/* ==========================================================================
   OUTFITNI RASM (PNG) SIFATIDA YUKLAB OLISH
   ========================================================================== */
const ShareUI = {
  init() {
    document
      .getElementById("shareOutfitBtn")
      .addEventListener("click", () => this.exportCard());
  },

  exportCard() {
    if (!AIEngine.lastResult) {
      UI.toast("Avval bir vaziyatni tanlang", "error");
      return;
    }
    const occasion = OCCASIONS.find((o) => o.id === AIEngine.selectedOccasion);
    const canvas = document.createElement("canvas");
    canvas.width = 720;
    canvas.height = 900;
    const ctx = canvas.getContext("2d");

    const grad = ctx.createLinearGradient(0, 0, 720, 900);
    grad.addColorStop(0, "#1D4ED8");
    grad.addColorStop(1, "#0F172A");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 720, 900);

    ctx.fillStyle = "#ffffff";
    ctx.font = "700 30px sans-serif";
    ctx.fillText("Kiyimim AI", 40, 60);
    ctx.font = "800 40px sans-serif";
    ctx.fillText(`${occasion.emoji} ${occasion.name}`, 40, 120);
    ctx.font = "600 22px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,.8)";
    ctx.fillText(`${AIEngine.lastScore}% moslik`, 40, 155);

    const slots = Object.entries(AIEngine.SLOTS);
    const boxSize = 300,
      gap = 24,
      startY = 210;
    slots.forEach(([key, slot], i) => {
      const col = i % 2,
        row = Math.floor(i / 2);
      const x = 40 + col * (boxSize + gap);
      const y = startY + row * (boxSize + gap);
      ctx.fillStyle = "rgba(255,255,255,.12)";
      this.roundRect(ctx, x, y, boxSize, boxSize, 24);
      ctx.fill();
      const it = AIEngine.lastResult[key];
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 20px sans-serif";
      ctx.fillText(slot.label, x + 20, y + 40);
      ctx.font = "600 17px sans-serif";
      ctx.fillStyle = "rgba(255,255,255,.85)";
      this.wrapText(
        ctx,
        it ? it.name : "Yo'q",
        x + 20,
        y + 75,
        boxSize - 40,
        22,
      );
    });

    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kiyimim-ai-${occasion.id}.png`;
      a.click();
      URL.revokeObjectURL(url);
      UI.toast("Outfit rasmi yuklab olindi", "success");
    });
  },

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },

  wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(" ");
    let line = "",
      curY = y;
    words.forEach((word) => {
      const test = line + word + " ";
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, curY);
        line = word + " ";
        curY += lineHeight;
      } else {
        line = test;
      }
    });
    ctx.fillText(line, x, curY);
  },
};

/* ==========================================================================
   AI CHAT (haqiqiy Anthropic API orqali)
   ========================================================================== */
const ChatUI = {
  history: [],

  init() {
    document.getElementById("chatForm").addEventListener("submit", (e) => {
      e.preventDefault();
      this.send();
    });
    this.renderWelcome();
  },

  renderWelcome() {
    const box = document.getElementById("chatMessages");
    if (box.dataset.rendered) return;
    box.dataset.rendered = "1";
    box.innerHTML = `<div class="chat-msg ai">Assalomu alaykum! Men Kiyimim AI yordamchisiman. Kiyinish, kombinatsiya yoki garderobingiz haqida savol bering. (Hozircha demo rejimda ishlayapman — backend ulanganda javoblarim yanada aqlliroq bo'ladi 🙂)</div>`;
  },

  buildWardrobeContext() {
    const items = ItemsRepo.all().filter((it) => it.laundry !== "kirli");
    if (!items.length) return "Foydalanuvchining garderobi hozircha bo'sh.";
    return (
      "Foydalanuvchi garderobidagi kiyimlar: " +
      items
        .map(
          (it) =>
            `${it.name} (${catName(it.category)}, ${colorInfo(it.color).name}, ${seasonName(it.season)})`,
        )
        .join("; ") +
      "."
    );
  },

  appendMessage(text, role) {
    const box = document.getElementById("chatMessages");
    const el = document.createElement("div");
    el.className = `chat-msg ${role}`;
    el.textContent = text;
    box.appendChild(el);
    box.scrollTop = box.scrollHeight;
    return el;
  },

  appendTyping() {
    const box = document.getElementById("chatMessages");
    const el = document.createElement("div");
    el.className = "chat-msg ai typing";
    el.innerHTML = "<span></span><span></span><span></span>";
    box.appendChild(el);
    box.scrollTop = box.scrollHeight;
    return el;
  },

  async send() {
    const input = document.getElementById("chatInput");
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    this.appendMessage(text, "user");
    this.history.push({ role: "user", content: text });
    const typingEl = this.appendTyping();

    // Hozircha backend/API kaliti yo'q, shuning uchun qoidaviy (rule-based)
    // demo javob beramiz. Backend qo'shilgach, shu joyni haqiqiy Anthropic
    // API chaqiruviga almashtirish kifoya (pastdagi callRealApi() metodiga qarang).
    await new Promise((r) => setTimeout(r, 500 + Math.random() * 400));
    const reply = this.generateDemoReply(text);
    typingEl.remove();
    this.appendMessage(reply, "ai");
    this.history.push({ role: "assistant", content: reply });
  },

  /** Qoidaviy demo javob generatori — kalit so'zlarni aniqlab, garderob
   *  ma'lumotlaridan foydalanadi. Bu haqiqiy AI emas, lekin backend
   *  ulanmaguncha ilova ishlab turishi uchun oqilona javob beradi. */
  generateDemoReply(text) {
    const q = text.toLowerCase().trim();
    const items = ItemsRepo.all().filter((it) => it.laundry !== "kirli");

    const pickByCategories = (cats) =>
      items.find((it) => cats.includes(it.category));

    // Salomlashish
    if (
      /^(salom|assalomu alaykum|salomlar|hi|hello|hey|aloo?|halo)\b/.test(q)
    ) {
      return "Va alaykum assalom! Kiyinish bo'yicha nima haqida gaplashamiz — bugungi ob-havoga moslashtirilgan kiyim kerakmi, yoki biror vaziyat (ish, sport, uchrashuv) uchun maslahat kerakmi?";
    }
    // Rahmat / xayrlashish
    if (/rahmat|tashakkur|thanks|rahmatlar/.test(q)) {
      return "Arzimaydi! Yana savol bo'lsa, bemalol yozing 😊";
    }
    if (/xayr|ko'rishguncha|bye/.test(q)) {
      return "Xayr! Kiyim tanlashda omad 👋";
    }
    // Kim san / bot haqida
    if (
      /kimsan|siz kimsiz|nima qila olasan|nima qilasan|yordam bera olasan/.test(
        q,
      )
    ) {
      return "Men Kiyimim AI yordamchisiman — garderobingizga qarab kiyim tanlashda, kombinatsiya tuzishda va ob-havoga mos kiyim tavsiya qilishda yordam beraman.";
    }

    if (!items.length) {
      return "Garderobingiz hozircha bo'sh — avval bir nechta kiyim qo'shsangiz, sizga aniqroq maslahat bera olaman. Hozircha umumiy savollaringizga javob bera olaman 🙂";
    }
    if (/sovuq|qish|izg'irin/.test(q)) {
      const warm = pickByCategories(["kurtka", "kostyum"]) || items[0];
      return `Sovuq havo uchun ${warm.name.toLowerCase()} yaxshi variant bo'ladi. Ustidan issiqroq narsa kiysangiz, muzlab qolmaysiz.`;
    }
    if (/issiq|yoz|jazirama/.test(q)) {
      const light = pickByCategories(["futbolka", "shortik"]) || items[0];
      return `Issiq kunlar uchun ${light.name.toLowerCase()} qulay bo'ladi — yengil va nafas oladigan matodan tanlang.`;
    }
    if (/ish|universitet|rasmiy/.test(q)) {
      const formal =
        pickByCategories(["koylak", "kostyum", "shim"]) || items[0];
      return `Ish yoki universitet uchun ${formal.name.toLowerCase()} mos keladi — sodda va rasmiy ko'rinish beradi.`;
    }
    if (/sport|mashq|yugur/.test(q)) {
      const sport =
        pickByCategories(["shortik", "futbolka", "krossovka"]) || items[0];
      return `Sport uchun ${sport.name.toLowerCase()} qulay bo'ladi — harakatga to'sqinlik qilmaydi.`;
    }
    if (/mos|qanday|kombinatsiya/.test(q)) {
      return "Aniqroq maslahat uchun \"AI Tavsiya\" bo'limidan vaziyatni tanlang — men garderobingizdagi kiyimlarni tahlil qilib, to'liq kombinatsiya tayyorlayman.";
    }
    return "Tushunarli! Aniqroq javob uchun \"AI Tavsiya\" bo'limidan vaziyat (issiq, sovuq, ish va h.k.) tanlashingizni tavsiya qilaman — u yerda men garderobingizga qarab to'liq kombinatsiya tuzib beraman.";
  },

  /** Backend qo'shilgach ishlatiladigan haqiqiy Anthropic API chaqiruvi.
   *  Hozircha send() bu funksiyani chaqirmaydi — API kaliti xavfsiz
   *  backend proxy orqali kelganda, send() ichida shu metodni chaqiring. */
  async callRealApi(text) {
    const systemPrompt = `Sen "Kiyimim AI" ilovasidagi kiyinish bo'yicha maslahatchisan. Faqat o'zbek tilida, qisqa (2-4 jumla), do'stona va foydali javob ber. ${this.buildWardrobeContext()}`;
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system: systemPrompt, messages: this.history }),
    });
    const data = await response.json();
    return (
      (data.content || [])
        .map((b) => b.text || "")
        .join("\n")
        .trim() || "Kechirasiz, javob topilmadi."
    );
  },
};
/* ==========================================================================
   SAYOHAT RO'YXATI
   ========================================================================== */
const TravelUI = {
  init() {
    UI.fillSelect(document.getElementById("travelSeason"), SEASONS);
    document
      .getElementById("travelGenerateBtn")
      .addEventListener("click", () => this.generate());
  },

  generate() {
    const days = Math.max(
      1,
      Math.min(
        30,
        parseInt(document.getElementById("travelDays").value, 10) || 3,
      ),
    );
    const season = document.getElementById("travelSeason").value;
    const items = ItemsRepo.all().filter(
      (it) => it.season === season || it.season === "barcha-fasl",
    );

    // Kiyim toifasi bo'yicha necha dona kerakligini kunlar soniga qarab hisoblaymiz
    const plan = [
      {
        label: "Ustki kiyim (futbolka/ko'ylak)",
        cats: ["futbolka", "koylak"],
        count: Math.min(days, 7),
      },
      {
        label: "Shim/jinsi",
        cats: ["shim", "jinsi", "shortik"],
        count: Math.max(1, Math.ceil(days / 3)),
      },
      {
        label: "Tashqi kiyim (kurtka/kostyum)",
        cats: ["kurtka", "kostyum"],
        count: days > 3 ? 2 : 1,
      },
      {
        label: "Oyoq kiyim",
        cats: ["oyoq-kiyim", "krossovka"],
        count: days > 5 ? 2 : 1,
      },
      {
        label: "Aksessuar",
        cats: ["kepka", "soat", "sumka", "aksessuar"],
        count: 1,
      },
    ];

    const checklist = plan.map((group) => {
      const matched = items.filter((it) => group.cats.includes(it.category));
      const picked = matched.slice(0, group.count);
      return {
        label: group.label,
        need: group.count,
        have: picked,
        missing: group.count - picked.length,
      };
    });

    // Umumiy sayohat buyumlari (kiyimdan tashqari)
    const essentials = [
      "Gigiyena buyumlari",
      "Zaryadlovchi/kabel",
      "Hujjatlar (pasport/bilet)",
      "Dori-darmon (kerak bo'lsa)",
    ];

    this.render(checklist, essentials, days, season);
  },

  render(checklist, essentials, days, seasonId) {
    const box = document.getElementById("travelChecklist");
    const seasonName = SEASONS.find((s) => s.id === seasonId)?.name || seasonId;

    const clothesHtml = checklist
      .map((g) => {
        const itemsHtml = g.have
          .map(
            (it) => `
          <li class="travel-check-item">
            <span class="travel-check-dot done"></span>
            <span>${it.name}</span>
          </li>`,
          )
          .join("");
        const missingHtml =
          g.missing > 0
            ? `<li class="travel-check-item travel-check-missing">
                <span class="travel-check-dot"></span>
                <span>${g.label} yetishmayapti (${g.missing} ta) — garderobga qo'shing</span>
              </li>`
            : "";
        return `
        <div class="travel-check-group">
          <h4>${g.label} <small>(${g.have.length}/${g.need})</small></h4>
          <ul>${itemsHtml || ""}${missingHtml}</ul>
        </div>`;
      })
      .join("");

    const essentialsHtml = essentials
      .map(
        (e) => `
      <li class="travel-check-item">
        <span class="travel-check-dot"></span>
        <span>${e}</span>
      </li>`,
      )
      .join("");

    box.innerHTML = `
      <p class="travel-summary">${days} kunlik, ${seasonName.toLowerCase()} sayohat uchun ro'yxat:</p>
      ${clothesHtml}
      <div class="travel-check-group">
        <h4>Boshqa zarur narsalar</h4>
        <ul>${essentialsHtml}</ul>
      </div>
    `;
  },
};

const NotificationsUI = {
  init() {
    document
      .getElementById("notifModalClose")
      .addEventListener("click", () => this.close());
    document.getElementById("notifModal").addEventListener("click", (e) => {
      if (e.target.id === "notifModal") this.close();
    });
    Store.on("activity:changed", () => this.syncDot());
    this.syncDot();
  },

  syncDot() {
    const dot = document.querySelector("#notifBtn .dot");
    if (!dot) return;
    dot.hidden = ActivityRepo.unreadCount() === 0;
  },

  open() {
    this.render();
    ActivityRepo.markAllRead();
    this.syncDot();
    UI.openModal("notifModal");
  },

  close() {
    UI.closeModal("notifModal");
  },

  render() {
    const list = ActivityRepo.all();
    const box = document.getElementById("notifList");
    document.getElementById("notifEmpty").hidden = list.length > 0;
    box.innerHTML = list
      .map(
        (a) => `
      <li class="notif-item ${a.read ? "" : "notif-item-unread"}">
        <span class="notif-item-icon"><svg viewBox="0 0 24 24"><use href="#${a.icon}"/></svg></span>
        <div class="notif-item-body">
          <p>${a.text}</p>
          <span>${UI.timeAgo(a.time)}</span>
        </div>
      </li>`,
      )
      .join("");
  },
};

/* ==========================================================================
   WISHLIST (KERAK NARSALAR)
   ========================================================================== */
const WishlistUI = {
  KEY: "kiyimim_wishlist",

  all() {
    return Storage.get(this.KEY, []);
  },

  init() {
    document.getElementById("wishlistForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const input = document.getElementById("wishlistInput");
      const text = input.value.trim();
      if (!text) return;
      const list = this.all();
      list.unshift({ id: Storage.uid("wish"), text, createdAt: Date.now() });
      Storage.set(this.KEY, list);
      input.value = "";
      UI.toast("Ro'yxatga qo'shildi", "success");
      this.render();
    });
  },

  render() {
    const list = this.all();
    const listEl = document.getElementById("wishlistList");
    const empty = document.getElementById("wishlistEmpty");
    if (!list.length) {
      listEl.innerHTML = "";
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    listEl.innerHTML = list
      .map(
        (w) => `
      <li class="wishlist-item">
        <span>${w.text}</span>
        <button data-remove="${w.id}"><svg viewBox="0 0 24 24"><use href="#ic-trash"/></svg></button>
      </li>
    `,
      )
      .join("");
    listEl.querySelectorAll("[data-remove]").forEach((btn) => {
      btn.addEventListener("click", () => {
        Storage.set(
          this.KEY,
          this.all().filter((w) => w.id !== btn.dataset.remove),
        );
        this.render();
        UI.toast("O'chirildi");
      });
    });
  },
};

/* ==========================================================================
   ONBOARDING (faqat birinchi ro'yxatdan o'tishda)
   ========================================================================== */
const OnboardingUI = {
  current: 0,
  total: 3,

  init() {
    const dots = document.getElementById("onboardingDots");
    dots.innerHTML = Array.from(
      { length: this.total },
      (_, i) => `<span class="${i === 0 ? "active" : ""}"></span>`,
    ).join("");

    document
      .getElementById("onboardingNextBtn")
      .addEventListener("click", () => this.next());
    document
      .getElementById("onboardingSkipBtn")
      .addEventListener("click", () => this.finish());
  },

  show() {
    this.current = 0;
    document
      .querySelectorAll(".onboarding-slide")
      .forEach((s, i) => s.classList.toggle("active", i === 0));
    document
      .querySelectorAll("#onboardingDots span")
      .forEach((d, i) => d.classList.toggle("active", i === 0));
    document.getElementById("onboardingNextBtn").textContent = "Keyingisi";
    document.getElementById("onboarding").style.display = "flex";
  },

  next() {
    if (this.current >= this.total - 1) {
      this.finish();
      return;
    }
    document
      .querySelector(`.onboarding-slide[data-slide="${this.current}"]`)
      .classList.remove("active");
    document
      .querySelectorAll("#onboardingDots span")
      [this.current].classList.remove("active");
    this.current++;
    document
      .querySelector(`.onboarding-slide[data-slide="${this.current}"]`)
      .classList.add("active");
    document
      .querySelectorAll("#onboardingDots span")
      [this.current].classList.add("active");
    document.getElementById("onboardingNextBtn").textContent =
      this.current === this.total - 1 ? "Boshlash" : "Keyingisi";
  },

  finish() {
    document.getElementById("onboarding").style.display = "none";
    App.startApp();
  },
};

const ContactUI = {
  init() {
    const user = UsersRepo.getCurrent();
    if (user) {
      document.getElementById("contactName").value = user.name;
      document.getElementById("contactEmail").value = user.email;
    }
    document.getElementById("contactForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("contactName").value.trim();
      const email = document.getElementById("contactEmail").value.trim();
      const message = document.getElementById("contactMessage").value.trim();
      if (!name || !email || !message) {
        UI.toast("Iltimos, barcha maydonlarni to'ldiring", "error");
        return;
      }
      ContactRepo.add({ name, email, message });
      document.getElementById("contactMessage").value = "";
      UI.showSuccess("Yuborildi!");
      UI.toast("Xabaringiz uchun rahmat! Tez orada javob beramiz.", "success");
    });
  },
};

/* ==========================================================================
   DONAT / QO'LLAB-QUVVATLASH
   ========================================================================== */
const DonateUI = {
  selectedAmount: 25000,

  init() {
    const amountsWrap = document.getElementById("donateAmounts");
    const customInput = document.getElementById("donateCustomAmount");

    amountsWrap.querySelectorAll(".donate-amount-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        amountsWrap
          .querySelectorAll(".donate-amount-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        if (btn.dataset.amount === "custom") {
          customInput.hidden = false;
          customInput.focus();
          this.selectedAmount = Number(customInput.value) || 0;
        } else {
          customInput.hidden = true;
          this.selectedAmount = Number(btn.dataset.amount);
        }
      });
    });
    customInput.addEventListener("input", () => {
      this.selectedAmount = Number(customInput.value) || 0;
    });

    document.querySelectorAll(".copy-btn").forEach((btn) => {
      btn.addEventListener("click", () =>
        this.copyValue(btn.dataset.copy, btn),
      );
    });

    document
      .getElementById("donateConfirmBtn")
      .addEventListener("click", () => {
        UI.showSuccess("Rahmat! ❤️");
        UI.toast(
          `${this.selectedAmount.toLocaleString("uz-UZ")} so'm uchun rahmat — bu demo, real to'lov amalga oshirilmadi`,
          "success",
        );
      });
  },

  copyValue(value, btn) {
    const done = () => {
      UI.toast("Rekvizit nusxalandi", "success");
      btn.classList.add("is-fav");
      setTimeout(() => btn.classList.remove("is-fav"), 800);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(value)
        .then(done)
        .catch(() => this.fallbackCopy(value, done));
    } else {
      this.fallbackCopy(value, done);
    }
  },

  fallbackCopy(value, cb) {
    const ta = document.createElement("textarea");
    ta.value = value;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      cb();
    } catch (err) {
      UI.toast("Nusxalab bo'lmadi", "error");
    }
    ta.remove();
  },
};
