/**
 * i18n.js — interfeys tarjimasi (uz/ru/en)
 * -----------------------------------------------------------------------
 * Oddiy, backend'siz tarjima tizimi: har bir matnli element HTML'da
 * data-i18n="kalit" atributiga ega bo'ladi, I18N.apply() shu kalitga mos
 * matnni joriy tilga almashtiradi. Hozircha eng ko'p ko'rinadigan
 * bo'limlar (pastki navigatsiya, bosh sahifa, sozlamalar) qamrab olingan;
 * qolgan matnlar keyingi yangilanishlarda shu tizimga qo'shiladi.
 * -----------------------------------------------------------------------
 */
const I18N_DICT = {
  uz: {
    "nav.home": "Bosh sahifa",
    "nav.wardrobe": "Kiyimlarim",
    "nav.ai": "AI Tavsiya",
    "nav.profile": "Profil",
    "home.todayAi": "Bugungi AI tavsiya",
    "home.all": "Barchasi",
    "home.totalItems": "Jami kiyim",
    "home.favorites": "Sevimlilar",
    "home.latestAdded": "Oxirgi qo'shilgan",
    "home.allItems": "Hammasi",
    "home.quickActions": "Tezkor tugmalar",
    "home.recentActivity": "So'nggi faoliyat",
    "quick.add": "Qo'shish",
    "quick.aiPick": "AI tavsiya",
    "quick.surprise": "Hayratda qoldir",
    "quick.travel": "Sayohat ro'yxati",
    "quick.favorites": "Sevimlilar",
    "quick.stats": "Statistika",
    "settings.title": "Sozlamalar",
    "settings.appearance": "Ko'rinish",
    "settings.lightMode": "Yorug' rejim",
    "settings.darkMode": "Tungi rejim",
    "settings.general": "Umumiy",
    "settings.language": "Til",
    "settings.notifications": "Bildirishnomalar",
    "settings.dailyReminder": "Kunlik eslatma",
    "settings.data": "Ma'lumotlar",
    "settings.backup": "Zaxira nusxa yuklab olish (.json)",
    "settings.pdfExport": "Garderob katalogi (.pdf)",
    "settings.restore": "Zaxiradan tiklash (import)",
    "settings.privacy": "Maxfiylik siyosati",
  },
  ru: {
    "nav.home": "Главная",
    "nav.wardrobe": "Мой гардероб",
    "nav.ai": "AI Совет",
    "nav.profile": "Профиль",
    "home.todayAi": "Совет ИИ на сегодня",
    "home.all": "Все",
    "home.totalItems": "Всего вещей",
    "home.favorites": "Избранное",
    "home.latestAdded": "Недавно добавленные",
    "home.allItems": "Все",
    "home.quickActions": "Быстрые действия",
    "home.recentActivity": "Последние действия",
    "quick.add": "Добавить",
    "quick.aiPick": "AI совет",
    "quick.surprise": "Удиви меня",
    "quick.travel": "Список для поездки",
    "quick.favorites": "Избранное",
    "quick.stats": "Статистика",
    "settings.title": "Настройки",
    "settings.appearance": "Внешний вид",
    "settings.lightMode": "Светлая тема",
    "settings.darkMode": "Тёмная тема",
    "settings.general": "Общее",
    "settings.language": "Язык",
    "settings.notifications": "Уведомления",
    "settings.dailyReminder": "Ежедневное напоминание",
    "settings.data": "Данные",
    "settings.backup": "Скачать резервную копию (.json)",
    "settings.pdfExport": "Каталог гардероба (.pdf)",
    "settings.restore": "Восстановить из копии (импорт)",
    "settings.privacy": "Политика конфиденциальности",
  },
  en: {
    "nav.home": "Home",
    "nav.wardrobe": "My Closet",
    "nav.ai": "AI Pick",
    "nav.profile": "Profile",
    "home.todayAi": "Today's AI pick",
    "home.all": "See all",
    "home.totalItems": "Total items",
    "home.favorites": "Favorites",
    "home.latestAdded": "Recently added",
    "home.allItems": "See all",
    "home.quickActions": "Quick actions",
    "home.recentActivity": "Recent activity",
    "quick.add": "Add",
    "quick.aiPick": "AI pick",
    "quick.surprise": "Surprise me",
    "quick.travel": "Packing list",
    "quick.favorites": "Favorites",
    "quick.stats": "Stats",
    "settings.title": "Settings",
    "settings.appearance": "Appearance",
    "settings.lightMode": "Light mode",
    "settings.darkMode": "Dark mode",
    "settings.general": "General",
    "settings.language": "Language",
    "settings.notifications": "Notifications",
    "settings.dailyReminder": "Daily reminder",
    "settings.data": "Data",
    "settings.backup": "Download backup (.json)",
    "settings.pdfExport": "Wardrobe catalog (.pdf)",
    "settings.restore": "Restore from backup (import)",
    "settings.privacy": "Privacy policy",
  },
};

const I18N = {
  current() {
    return SettingsRepo.get().language || "uz";
  },

  /** Sahifadagi barcha data-i18n elementlarni joriy tilga moslab yangilaydi.
   *  Element ichida <svg> kabi bola elementlar bo'lsa, ularni saqlab qolib
   *  faqat matn qismini almashtiradi (masalan "Barchasi <svg>...</svg>"). */
  apply() {
    const lang = this.current();
    const dict = I18N_DICT[lang] || I18N_DICT.uz;
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.dataset.i18n;
      const text = dict[key];
      if (text === undefined) return;

      const childEls = Array.from(el.childNodes).filter(
        (n) => n.nodeType === Node.ELEMENT_NODE,
      );
      if (childEls.length) {
        // Matn qismini (birinchi text node) almashtiramiz, ichki elementlarni saqlaymiz
        let replaced = false;
        el.childNodes.forEach((n) => {
          if (!replaced && n.nodeType === Node.TEXT_NODE) {
            n.textContent = text + " ";
            replaced = true;
          }
        });
        if (!replaced) el.prepend(document.createTextNode(text + " "));
      } else {
        el.textContent = text;
      }
    });
    document.documentElement.lang = lang;
  },

  init() {
    this.apply();
    Store.on("settings:changed", () => this.apply());
  },
};
