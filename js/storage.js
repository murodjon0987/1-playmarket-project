/**
 * storage.js
 * -----------------------------------------------------------------------
 * Kiyimim AI uchun localStorage ustidan yupqa (thin) wrapper.
 * Barcha ma'lumotlar shu modul orqali o'qiladi va yoziladi, shunda
 * boshqa modullar localStorage API'sini bevosita bilishi shart emas.
 * -----------------------------------------------------------------------
 */
/**
 * Store — markazlashgan hodisa (event) tizimi. Har qanday modul ma'lumotni
 * o'zgartirganda Store.emit(eventName) chaqiradi; unga obuna bo'lgan barcha
 * UI qismlari avtomatik yangilanadi. Bu modullarning bir-birini to'g'ridan-to'g'ri
 * chaqirishi ("App.renderHome()" kabi) o'rniga markazlashgan oqim beradi.
 */
const Store = {
  listeners: {},
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  },
  emit(event, payload) {
    (this.listeners[event] || []).forEach((cb) => {
      try {
        cb(payload);
      } catch (err) {
        console.error(`Store obunachisida xato (${event}):`, err);
      }
    });
  },
};

const STORAGE_KEYS = {
  USERS: "kiyimim_users",
  SESSION: "kiyimim_session",
  ITEMS: "kiyimim_items",
  SETTINGS: "kiyimim_settings",
  ACTIVITY: "kiyimim_activity",
  SEEDED: "kiyimim_seeded",
  LEGACY_CLEANED: "kiyimim_legacy_cleaned",
  OUTFITS: "kiyimim_outfits",
  WEAR_LOG: "kiyimim_wear_log",
  AI_USAGE: "kiyimim_ai_usage",
  LOGIN_DATES: "kiyimim_login_dates",
  CONTACT_MESSAGES: "kiyimim_contact_messages",
};

const Storage = {
  /** JSON obyektni xavfsiz o'qish, xato bo'lsa fallback qaytaradi */
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      console.error(`Storage o'qishda xato (${key}):`, err);
      return fallback;
    }
  },

  /** JSON obyektni saqlash */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error(`Storage yozishda xato (${key}):`, err);
      return false;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      console.error(`Storage o'chirishda xato (${key}):`, err);
    }
  },

  /** Unikal ID generatori (vaqt + tasodifiy raqam) */
  uid(prefix = "id") {
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  },
};

/**
 * Validate.js mantig'i shu yerda — Repo qatlamidan chiqadigan har bir
 * ma'lumot to'g'ri "shakl"da bo'lishini kafolatlaydi. Agar localStorage
 * qo'lda o'zgartirilgan yoki buzilgan bo'lsa, ilova qulab tushmasdan,
 * shunchaki noto'g'ri yozuvni e'tiborsiz qoldiradi.
 */
const Validate = {
  isNonEmptyString(v) {
    return typeof v === "string" && v.trim().length > 0;
  },
  /** Kiyim (item) obyekti minimal talablarga javob beradimi */
  item(it) {
    if (!it || typeof it !== "object") return false;
    if (!this.isNonEmptyString(it.id) || !this.isNonEmptyString(it.name))
      return false;
    if (!CATEGORIES.some((c) => c.id === it.category)) return false;
    if (!COLORS.some((c) => c.id === it.color)) return false;
    if (!SEASONS.some((s) => s.id === it.season)) return false;
    return true;
  },
  /** Massivni filtrlab, faqat to'g'ri yozuvlarni qaytaradi (buzilganini log qiladi) */
  itemList(list) {
    if (!Array.isArray(list)) return [];
    const valid = [];
    list.forEach((it) => {
      if (this.item(it)) valid.push(it);
      else console.warn("Yaroqsiz kiyim yozuvi o'tkazib yuborildi:", it);
    });
    return valid;
  },
  outfit(o) {
    return (
      o &&
      typeof o === "object" &&
      this.isNonEmptyString(o.id) &&
      o.itemIds &&
      typeof o.itemIds === "object"
    );
  },
  outfitList(list) {
    if (!Array.isArray(list)) return [];
    return list.filter((o) => this.outfit(o));
  },
  wearLog(l) {
    return (
      l &&
      typeof l === "object" &&
      this.isNonEmptyString(l.date) &&
      Array.isArray(l.itemIds)
    );
  },
  wearLogList(list) {
    if (!Array.isArray(list)) return [];
    return list.filter((l) => this.wearLog(l));
  },
};

/* ==========================================================================
   Generic CRUD — kiyimlar (items) uchun
   ========================================================================== */
const ItemsRepo = {
  all() {
    return Validate.itemList(Storage.get(STORAGE_KEYS.ITEMS, []));
  },
  save(list) {
    return Storage.set(STORAGE_KEYS.ITEMS, list);
  },
  findById(id) {
    return this.all().find((it) => it.id === id) || null;
  },
  create(item) {
    const list = this.all();
    const newItem = {
      id: Storage.uid("item"),
      createdAt: Date.now(),
      wearCount: 0,
      isFavorite: false,
      ...item,
    };
    list.unshift(newItem);
    this.save(list);
    Store.emit("items:changed");
    return newItem;
  },
  update(id, patch) {
    const list = this.all();
    const idx = list.findIndex((it) => it.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...patch, updatedAt: Date.now() };
    this.save(list);
    Store.emit("items:changed");
    return list[idx];
  },
  remove(id) {
    const list = this.all().filter((it) => it.id !== id);
    this.save(list);
    Store.emit("items:changed");
  },
  toggleFavorite(id) {
    const item = this.findById(id);
    if (!item) return null;
    return this.update(id, { isFavorite: !item.isFavorite });
  },
};

/* ==========================================================================
   Foydalanuvchilar / sessiya
   ========================================================================== */
const UsersRepo = {
  all() {
    return Storage.get(STORAGE_KEYS.USERS, []);
  },
  save(list) {
    return Storage.set(STORAGE_KEYS.USERS, list);
  },
  findByEmail(email) {
    return (
      this.all().find((u) => u.email.toLowerCase() === email.toLowerCase()) ||
      null
    );
  },
  create(user) {
    const list = this.all();
    const newUser = { id: Storage.uid("user"), createdAt: Date.now(), ...user };
    list.push(newUser);
    this.save(list);
    return newUser;
  },
  getSession() {
    return Storage.get(STORAGE_KEYS.SESSION, null);
  },
  setSession(userId, remember) {
    Storage.set(STORAGE_KEYS.SESSION, {
      userId,
      remember,
      loginAt: Date.now(),
    });
  },
  clearSession() {
    Storage.remove(STORAGE_KEYS.SESSION);
  },
  getCurrent() {
    const session = this.getSession();
    if (!session) return null;
    return this.all().find((u) => u.id === session.userId) || null;
  },
};

/* ==========================================================================
   Faoliyat jurnali (activity log) — "So'nggi faoliyat" bo'limi uchun
   ========================================================================== */
const ActivityRepo = {
  all() {
    return Storage.get(STORAGE_KEYS.ACTIVITY, []);
  },
  add(text, icon = "ic-shirt") {
    const list = this.all();
    list.unshift({
      id: Storage.uid("act"),
      text,
      icon,
      time: Date.now(),
      read: false,
    });
    Storage.set(STORAGE_KEYS.ACTIVITY, list.slice(0, 15));
    Store.emit("activity:changed");
  },
  unreadCount() {
    return this.all().filter((a) => !a.read).length;
  },
  markAllRead() {
    const list = this.all().map((a) => ({ ...a, read: true }));
    Storage.set(STORAGE_KEYS.ACTIVITY, list);
    Store.emit("activity:changed");
  },
};

/* ==========================================================================
   Saqlangan kombinatsiyalar (Outfitlar)
   ========================================================================== */
const OutfitsRepo = {
  all() {
    return Validate.outfitList(Storage.get(STORAGE_KEYS.OUTFITS, []));
  },
  save(list) {
    return Storage.set(STORAGE_KEYS.OUTFITS, list);
  },
  create(outfit) {
    const list = this.all();
    const newOutfit = {
      id: Storage.uid("outfit"),
      createdAt: Date.now(),
      ...outfit,
    };
    list.unshift(newOutfit);
    this.save(list);
    return newOutfit;
  },
  findById(id) {
    return this.all().find((o) => o.id === id) || null;
  },
  remove(id) {
    this.save(this.all().filter((o) => o.id !== id));
  },
};

/* ==========================================================================
   Kiyim kalendari (kunlik "nima kiydim" jurnali)
   ========================================================================== */
const WearLogRepo = {
  all() {
    return Validate.wearLogList(Storage.get(STORAGE_KEYS.WEAR_LOG, []));
  },
  save(list) {
    return Storage.set(STORAGE_KEYS.WEAR_LOG, list);
  },
  /** YYYY-MM-DD formatidagi sana uchun yozuvni topish */
  findByDate(dateStr) {
    return this.all().find((l) => l.date === dateStr) || null;
  },
  /** Sanaga kiyimlar ro'yxatini saqlash (mavjud bo'lsa yangilaydi) */
  setForDate(dateStr, itemIds, outfitId = null) {
    const list = this.all();
    const idx = list.findIndex((l) => l.date === dateStr);
    const entry = {
      id: idx > -1 ? list[idx].id : Storage.uid("wear"),
      date: dateStr,
      itemIds,
      outfitId,
      loggedAt: Date.now(),
    };
    if (idx > -1) list[idx] = entry;
    else list.push(entry);
    this.save(list);
    // Har bir kiyimning "necha marta kiyilgan" hisobini yangilash
    itemIds.forEach((id) => {
      const item = ItemsRepo.findById(id);
      if (item) ItemsRepo.update(id, { wearCount: (item.wearCount || 0) + 1 });
    });
    return entry;
  },
  removeByDate(dateStr) {
    this.save(this.all().filter((l) => l.date !== dateStr));
  },
};

/* ==========================================================================
   AI foydalanish soni va kirish streak — yutuqlar (badges) uchun
   ========================================================================== */
const ProgressRepo = {
  incrementAiUsage() {
    const count = Storage.get(STORAGE_KEYS.AI_USAGE, 0) + 1;
    Storage.set(STORAGE_KEYS.AI_USAGE, count);
    return count;
  },
  getAiUsage() {
    return Storage.get(STORAGE_KEYS.AI_USAGE, 0);
  },
  /** Har kirishda bugungi sanani belgilaydi, ketma-ket kunlar sonini qaytaradi */
  recordLoginAndGetStreak() {
    const today = new Date().toISOString().slice(0, 10);
    const dates = new Set(Storage.get(STORAGE_KEYS.LOGIN_DATES, []));
    dates.add(today);
    Storage.set(STORAGE_KEYS.LOGIN_DATES, [...dates]);
    return this.getStreak();
  },
  /** Ma'lumotlarni o'zgartirmasdan, joriy ketma-ket kunlar sonini hisoblaydi */
  getStreak() {
    const dates = new Set(Storage.get(STORAGE_KEYS.LOGIN_DATES, []));
    let streak = 0;
    let cursor = new Date();
    while (true) {
      const key = cursor.toISOString().slice(0, 10);
      if (dates.has(key)) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else break;
    }
    return streak;
  },
};

/* ==========================================================================
   Bog'lanish xabarlari (demo — backend yo'q, faqat localStorage)
   ========================================================================== */
const ContactRepo = {
  all() {
    return Storage.get(STORAGE_KEYS.CONTACT_MESSAGES, []);
  },
  add(message) {
    const list = this.all();
    list.unshift({ id: Storage.uid("msg"), createdAt: Date.now(), ...message });
    Storage.set(STORAGE_KEYS.CONTACT_MESSAGES, list);
  },
};

/* ==========================================================================
   Sozlamalar
   ========================================================================== */
const SettingsRepo = {
  get() {
    return Storage.get(STORAGE_KEYS.SETTINGS, {
      theme: "light",
      notifications: true,
    });
  },
  set(patch) {
    const current = this.get();
    const next = { ...current, ...patch };
    Storage.set(STORAGE_KEYS.SETTINGS, next);
    Store.emit("settings:changed", next);
  },
};
