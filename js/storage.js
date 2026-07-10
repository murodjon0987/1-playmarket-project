/**
 * storage.js
 * -----------------------------------------------------------------------
 * Kiyimim AI uchun localStorage ustidan yupqa (thin) wrapper.
 * Barcha ma'lumotlar shu modul orqali o'qiladi va yoziladi, shunda
 * boshqa modullar localStorage API'sini bevosita bilishi shart emas.
 * -----------------------------------------------------------------------
 */
const STORAGE_KEYS = {
  USERS: 'kiyimim_users',
  SESSION: 'kiyimim_session',
  ITEMS: 'kiyimim_items',
  SETTINGS: 'kiyimim_settings',
  ACTIVITY: 'kiyimim_activity',
  SEEDED: 'kiyimim_seeded',
  OUTFITS: 'kiyimim_outfits',
  WEAR_LOG: 'kiyimim_wear_log',
  AI_USAGE: 'kiyimim_ai_usage',
  LOGIN_DATES: 'kiyimim_login_dates',
  CONTACT_MESSAGES: 'kiyimim_contact_messages'
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
  uid(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  }
};

/* ==========================================================================
   Generic CRUD — kiyimlar (items) uchun
   ========================================================================== */
const ItemsRepo = {
  all() {
    return Storage.get(STORAGE_KEYS.ITEMS, []);
  },
  save(list) {
    return Storage.set(STORAGE_KEYS.ITEMS, list);
  },
  findById(id) {
    return this.all().find(it => it.id === id) || null;
  },
  create(item) {
    const list = this.all();
    const newItem = {
      id: Storage.uid('item'),
      createdAt: Date.now(),
      wearCount: 0,
      isFavorite: false,
      ...item
    };
    list.unshift(newItem);
    this.save(list);
    return newItem;
  },
  update(id, patch) {
    const list = this.all();
    const idx = list.findIndex(it => it.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...patch, updatedAt: Date.now() };
    this.save(list);
    return list[idx];
  },
  remove(id) {
    const list = this.all().filter(it => it.id !== id);
    this.save(list);
  },
  toggleFavorite(id) {
    const item = this.findById(id);
    if (!item) return null;
    return this.update(id, { isFavorite: !item.isFavorite });
  }
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
    return this.all().find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  },
  create(user) {
    const list = this.all();
    const newUser = { id: Storage.uid('user'), createdAt: Date.now(), ...user };
    list.push(newUser);
    this.save(list);
    return newUser;
  },
  getSession() {
    return Storage.get(STORAGE_KEYS.SESSION, null);
  },
  setSession(userId, remember) {
    Storage.set(STORAGE_KEYS.SESSION, { userId, remember, loginAt: Date.now() });
  },
  clearSession() {
    Storage.remove(STORAGE_KEYS.SESSION);
  },
  getCurrent() {
    const session = this.getSession();
    if (!session) return null;
    return this.all().find(u => u.id === session.userId) || null;
  }
};

/* ==========================================================================
   Faoliyat jurnali (activity log) — "So'nggi faoliyat" bo'limi uchun
   ========================================================================== */
const ActivityRepo = {
  all() {
    return Storage.get(STORAGE_KEYS.ACTIVITY, []);
  },
  add(text, icon = 'ic-shirt') {
    const list = this.all();
    list.unshift({ id: Storage.uid('act'), text, icon, time: Date.now() });
    Storage.set(STORAGE_KEYS.ACTIVITY, list.slice(0, 15));
  }
};

/* ==========================================================================
   Saqlangan kombinatsiyalar (Outfitlar)
   ========================================================================== */
const OutfitsRepo = {
  all() {
    return Storage.get(STORAGE_KEYS.OUTFITS, []);
  },
  save(list) {
    return Storage.set(STORAGE_KEYS.OUTFITS, list);
  },
  create(outfit) {
    const list = this.all();
    const newOutfit = { id: Storage.uid('outfit'), createdAt: Date.now(), ...outfit };
    list.unshift(newOutfit);
    this.save(list);
    return newOutfit;
  },
  findById(id) {
    return this.all().find(o => o.id === id) || null;
  },
  remove(id) {
    this.save(this.all().filter(o => o.id !== id));
  }
};

/* ==========================================================================
   Kiyim kalendari (kunlik "nima kiydim" jurnali)
   ========================================================================== */
const WearLogRepo = {
  all() {
    return Storage.get(STORAGE_KEYS.WEAR_LOG, []);
  },
  save(list) {
    return Storage.set(STORAGE_KEYS.WEAR_LOG, list);
  },
  /** YYYY-MM-DD formatidagi sana uchun yozuvni topish */
  findByDate(dateStr) {
    return this.all().find(l => l.date === dateStr) || null;
  },
  /** Sanaga kiyimlar ro'yxatini saqlash (mavjud bo'lsa yangilaydi) */
  setForDate(dateStr, itemIds, outfitId = null) {
    const list = this.all();
    const idx = list.findIndex(l => l.date === dateStr);
    const entry = { id: idx > -1 ? list[idx].id : Storage.uid('wear'), date: dateStr, itemIds, outfitId, loggedAt: Date.now() };
    if (idx > -1) list[idx] = entry; else list.push(entry);
    this.save(list);
    // Har bir kiyimning "necha marta kiyilgan" hisobini yangilash
    itemIds.forEach(id => {
      const item = ItemsRepo.findById(id);
      if (item) ItemsRepo.update(id, { wearCount: (item.wearCount || 0) + 1 });
    });
    return entry;
  },
  removeByDate(dateStr) {
    this.save(this.all().filter(l => l.date !== dateStr));
  }
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
  }
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
    list.unshift({ id: Storage.uid('msg'), createdAt: Date.now(), ...message });
    Storage.set(STORAGE_KEYS.CONTACT_MESSAGES, list);
  }
};

/* ==========================================================================
   Sozlamalar
   ========================================================================== */
const SettingsRepo = {
  get() {
    return Storage.get(STORAGE_KEYS.SETTINGS, { theme: 'light', notifications: true });
  },
  set(patch) {
    const current = this.get();
    Storage.set(STORAGE_KEYS.SETTINGS, { ...current, ...patch });
  }
};