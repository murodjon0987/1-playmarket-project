/**
 * admin.js
 * -----------------------------------------------------------------------
 * Kiyimim AI — Admin Panel mantig'i.
 * MUHIM: Bu ilova hozircha backendsiz, faqat brauzer localStorage'ida
 * ishlaydi. Shu sababli bu admin panel FAQAT shu qurilma/brauzerdagi
 * ma'lumotlarni ko'rsata oladi — boshqa foydalanuvchilarning real vaqtli
 * ma'lumotlarini emas. Parol tekshiruvi ham frontendda, shuning uchun bu
 * haqiqiy xavfsizlik emas — havolani boshqalarga tarqatmang.
 * -----------------------------------------------------------------------
 */
// Parolning o'zi emas, uning SHA-256 hash'i saqlanadi — kodni ochib ko'rgan
// kishi ham to'g'ridan-to'g'ri parolni o'qiy olmaydi (baribir mutlaq
// xavfsizlik emas, chunki tekshiruv frontendda, lekin ancha yaxshiroq).
const ADMIN_PASSWORD_HASH =
  "murodjon722"; // "kiyimim2026"
const ADMIN_SESSION_KEY = "murodjon722";
const WISHLIST_KEY = "murodjon722";

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
/* Parolni o'zgartirish uchun: brauzer konsolida
   await sha256("yangi_parolingiz")
   ni ishga tushiring va natijani yuqoridagi ADMIN_PASSWORD_HASH ga qo'ying. */

const AdminUI = {
  toast(msg, type = "default") {
    const box = document.getElementById("adminToastContainer");
    const el = document.createElement("div");
    el.className = `admin-toast ${type}`;
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  },

  init() {
    this.bindGate();
    this.bindNav();
    this.bindDangerZone();
    this.bindRawActions();

    if (sessionStorage.getItem(ADMIN_SESSION_KEY) === "1") {
      this.unlock();
    }
  },

  bindGate() {
    const input = document.getElementById("adminPasswordInput");
    const btn = document.getElementById("adminLoginBtn");
    const tryLogin = async () => {
      btn.disabled = true;
      const hash = await sha256(input.value);
      btn.disabled = false;
      if (hash === ADMIN_PASSWORD_HASH) {
        sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
        this.unlock();
      } else {
        document.getElementById("adminGateError").hidden = false;
        input.value = "";
        input.focus();
      }
    };
    btn.addEventListener("click", tryLogin);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") tryLogin();
    });

    document.getElementById("adminLogoutBtn").addEventListener("click", () => {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
      document.getElementById("adminDashboard").hidden = true;
      document.getElementById("adminGate").style.display = "flex";
    });
  },

  unlock() {
    document.getElementById("adminGate").style.display = "none";
    document.getElementById("adminDashboard").hidden = false;
    this.renderAll();
  },

  bindNav() {
    document.querySelectorAll(".admin-nav-btn[data-panel]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .querySelectorAll(".admin-nav-btn[data-panel]")
          .forEach((b) => b.classList.remove("active"));
        document
          .querySelectorAll(".admin-panel")
          .forEach((p) => p.classList.remove("active"));
        btn.classList.add("active");
        document
          .getElementById(`panel-${btn.dataset.panel}`)
          .classList.add("active");
      });
    });
  },

  renderAll() {
    this.renderOverview();
    this.renderUsers();
    this.renderItems();
    this.renderOutfits();
    this.renderWishlist();
    this.renderMessages();
    this.renderRaw();
  },

  /* ---------------------------------------------------------------------
     OVERVIEW
  --------------------------------------------------------------------- */
  renderOverview() {
    const users = UsersRepo.all();
    const items = ItemsRepo.all();
    const outfits = OutfitsRepo.all();
    const wishlist = Storage.get(WISHLIST_KEY, []);
    const messages = ContactRepo.all();
    const aiUsage = ProgressRepo.getAiUsage();

    const stats = [
      { num: users.length, label: "Foydalanuvchilar" },
      { num: items.length, label: "Jami kiyimlar" },
      { num: outfits.length, label: "Saqlangan outfitlar" },
      { num: wishlist.length, label: "Wishlist yozuvlari" },
      { num: messages.length, label: "Bog'lanish xabarlari" },
      { num: aiUsage, label: "AI ishlatilgan soni" },
    ];
    document.getElementById("overviewStats").innerHTML = stats
      .map(
        (s) => `
      <div class="admin-stat-card">
        <span class="admin-stat-num">${s.num}</span>
        <span class="admin-stat-label">${s.label}</span>
      </div>
    `,
      )
      .join("");

    const catCounts = {};
    items.forEach((it) => {
      catCounts[it.category] = (catCounts[it.category] || 0) + 1;
    });
    const max = Math.max(1, ...Object.values(catCounts));
    const entries = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
    const chart = document.getElementById("overviewCatChart");
    chart.innerHTML = entries.length
      ? entries
          .map(
            ([id, count]) => `
      <div class="admin-bar-row">
        <span class="admin-bar-label">${catName(id)}</span>
        <div class="admin-bar-track"><div class="admin-bar-fill" style="width:0"></div></div>
        <span class="admin-bar-num">${count}</span>
      </div>
    `,
          )
          .join("")
      : `<p class="admin-empty">Ma'lumot yo'q.</p>`;
    requestAnimationFrame(() => {
      chart.querySelectorAll(".admin-bar-fill").forEach((bar, i) => {
        bar.style.width = `${(entries[i][1] / max) * 100}%`;
      });
    });

    const activity = ActivityRepo.all().slice(0, 8);
    document.getElementById("overviewActivity").innerHTML = activity.length
      ? activity
          .map(
            (a) =>
              `<li>${a.text} — ${new Date(a.time).toLocaleString("uz-UZ")}</li>`,
          )
          .join("")
      : `<li>Faoliyat yo'q.</li>`;
  },

  /* ---------------------------------------------------------------------
     USERS
  --------------------------------------------------------------------- */
  renderUsers() {
    const users = UsersRepo.all();
    const body = document.getElementById("usersTableBody");
    document.getElementById("usersEmpty").hidden = users.length > 0;
    body.innerHTML = users
      .map(
        (u) => `
      <tr>
        <td>${u.name}</td>
        <td>${u.email}</td>
        <td>${new Date(u.createdAt).toLocaleDateString("uz-UZ")}</td>
        <td style="color:var(--text-3);font-size:11px">${u.id}</td>
      </tr>
    `,
      )
      .join("");
  },

  /* ---------------------------------------------------------------------
     ITEMS
  --------------------------------------------------------------------- */
  renderItems() {
    const items = ItemsRepo.all();
    const body = document.getElementById("itemsTableBody");
    document.getElementById("itemsEmpty").hidden = items.length > 0;
    body.innerHTML = items
      .map(
        (it) => `
      <tr>
        <td>${it.name}</td>
        <td>${catName(it.category)}</td>
        <td>${colorInfo(it.color).name}</td>
        <td>${it.condition}</td>
        <td><span class="admin-tag ${it.laundry === "kirli" ? "admin-tag-dirty" : "admin-tag-clean"}">${it.laundry === "kirli" ? "Kirli" : "Toza"}</span></td>
        <td>${it.wearCount || 0}</td>
        <td>${it.isFavorite ? "❤️" : "—"}</td>
        <td><button class="admin-mini-btn" data-remove-item="${it.id}">O'chirish</button></td>
      </tr>
    `,
      )
      .join("");
    body.querySelectorAll("[data-remove-item]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!confirm("Ushbu kiyimni o'chirishni tasdiqlaysizmi?")) return;
        ItemsRepo.remove(btn.dataset.removeItem);
        this.renderItems();
        this.renderOverview();
        this.toast("Kiyim o'chirildi", "success");
      });
    });
  },

  /* ---------------------------------------------------------------------
     OUTFITS
  --------------------------------------------------------------------- */
  renderOutfits() {
    const outfits = OutfitsRepo.all();
    const body = document.getElementById("outfitsTableBody");
    document.getElementById("outfitsEmpty").hidden = outfits.length > 0;
    body.innerHTML = outfits
      .map(
        (o) => `
      <tr>
        <td>${o.occasionEmoji || ""} ${o.occasionName}</td>
        <td>${o.matchScore}%</td>
        <td>${new Date(o.createdAt).toLocaleDateString("uz-UZ")}</td>
      </tr>
    `,
      )
      .join("");
  },

  /* ---------------------------------------------------------------------
     WISHLIST
  --------------------------------------------------------------------- */
  renderWishlist() {
    const list = Storage.get(WISHLIST_KEY, []);
    const body = document.getElementById("wishlistTableBody");
    document.getElementById("wishlistEmpty").hidden = list.length > 0;
    body.innerHTML = list
      .map(
        (w) => `
      <tr><td>${w.text}</td><td>${new Date(w.createdAt).toLocaleDateString("uz-UZ")}</td></tr>
    `,
      )
      .join("");
  },

  /* ---------------------------------------------------------------------
     MESSAGES
  --------------------------------------------------------------------- */
  renderMessages() {
    const messages = ContactRepo.all();
    const box = document.getElementById("messagesList");
    document.getElementById("messagesEmpty").hidden = messages.length > 0;
    box.innerHTML = messages
      .map(
        (m) => `
      <div class="admin-message-item">
        <div class="admin-message-head"><span>${m.name} · ${m.email}</span><span>${new Date(m.createdAt).toLocaleString("uz-UZ")}</span></div>
        <div class="admin-message-body">${m.message}</div>
      </div>
    `,
      )
      .join("");
  },

  /* ---------------------------------------------------------------------
     RAW JSON
  --------------------------------------------------------------------- */
  collectAllData() {
    const data = {};
    Object.entries(STORAGE_KEYS).forEach(([key, storageKey]) => {
      data[storageKey] = Storage.get(storageKey, null);
    });
    data[WISHLIST_KEY] = Storage.get(WISHLIST_KEY, []);
    return data;
  },

  renderRaw() {
    document.getElementById("rawJsonView").textContent = JSON.stringify(
      this.collectAllData(),
      null,
      2,
    );
  },

  bindRawActions() {
    document.getElementById("rawCopyBtn").addEventListener("click", () => {
      const text = JSON.stringify(this.collectAllData(), null, 2);
      navigator.clipboard
        ?.writeText(text)
        .then(() => this.toast("Nusxalandi", "success"))
        .catch(() => this.toast("Nusxalab bo'lmadi", "error"));
    });
    document.getElementById("rawDownloadBtn").addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(this.collectAllData(), null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kiyimim-ai-admin-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      this.toast("Yuklab olindi", "success");
    });
  },

  /* ---------------------------------------------------------------------
     DANGER ZONE
  --------------------------------------------------------------------- */
  bindDangerZone() {
    document.getElementById("resetAllBtn").addEventListener("click", () => {
      if (
        !confirm(
          "DIQQAT: barcha ma'lumotlar (foydalanuvchilar, kiyimlar, outfitlar, xabarlar) butunlay o'chadi. Davom etasizmi?",
        )
      )
        return;
      Object.values(STORAGE_KEYS).forEach((k) => Storage.remove(k));
      Storage.remove(WISHLIST_KEY);
      this.renderAll();
      this.toast("Barcha ma'lumot tozalandi", "success");
    });

    document.getElementById("resetItemsBtn").addEventListener("click", () => {
      if (!confirm("Barcha kiyimlar o'chadi. Davom etasizmi?")) return;
      Storage.set(STORAGE_KEYS.ITEMS, []);
      this.renderAll();
      this.toast("Kiyimlar tozalandi", "success");
    });
  },
};

document.addEventListener("DOMContentLoaded", () => AdminUI.init());
