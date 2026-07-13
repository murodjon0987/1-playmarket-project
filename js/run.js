/**
 * run.js — Kiyimim AI uchun yengil smoke-test yurgizuvchi.
 * -----------------------------------------------------------------------
 * Tashqi kutubxona (Jest/Vitest) talab qilmaydi — brauzer globallarini
 * (localStorage, document) minimal darajada simulyatsiya qilib, asosiy
 * CRUD, validatsiya va AI mantig'ini tekshiradi.
 *
 * Ishga tushirish:  node tests/run.js
 * -----------------------------------------------------------------------
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

/* ---- Minimal localStorage simulyatori ---- */
class FakeStorage {
  constructor() {
    this.data = {};
  }
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this.data, key)
      ? this.data[key]
      : null;
  }
  setItem(key, value) {
    this.data[key] = String(value);
  }
  removeItem(key) {
    delete this.data[key];
  }
}

/* ---- Test sandbox konteksti ---- */
const sandbox = {
  localStorage: new FakeStorage(),
  console,
  window: {},
  Store: undefined, // storage.js ichida e'lon qilinadi
};
sandbox.window = sandbox;
vm.createContext(sandbox);

function loadScript(relPath) {
  const code = fs.readFileSync(path.join(__dirname, "..", relPath), "utf8");
  vm.runInContext(code, sandbox, { filename: relPath });
}

loadScript("js/storage.js");
loadScript("js/data.js");

/* ---- Oddiy test runner ---- */
let passed = 0,
  failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`❌ ${name}`);
    console.log(`   ${err.message}`);
    failed++;
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg || "Assertion failed");
}
function assertEqual(a, b, msg) {
  if (a !== b) throw new Error(msg || `Expected ${b}, got ${a}`);
}

const { ItemsRepo, OutfitsRepo, WearLogRepo, Validate, ProgressRepo } = sandbox;

/* ==========================================================================
   ITEMSREPO — CRUD
   ========================================================================== */
test("ItemsRepo.create — yangi kiyim yaratadi va id beradi", () => {
  const item = ItemsRepo.create({
    name: "Test futbolka",
    category: "futbolka",
    color: "oq",
    season: "yoz",
    condition: "Yangi",
  });
  assert(!!item.id, "id yaratilishi kerak");
  assertEqual(item.name, "Test futbolka");
  assertEqual(ItemsRepo.all().length, 1);
});

test("ItemsRepo.update — mavjud kiyimni yangilaydi", () => {
  const item = ItemsRepo.create({
    name: "Eski nom",
    category: "shim",
    color: "qora",
    season: "qish",
    condition: "Yaxshi",
  });
  const updated = ItemsRepo.update(item.id, { name: "Yangi nom" });
  assertEqual(updated.name, "Yangi nom");
  assertEqual(ItemsRepo.findById(item.id).name, "Yangi nom");
});

test("ItemsRepo.remove — kiyimni o'chiradi", () => {
  const item = ItemsRepo.create({
    name: "O'chiriladigan",
    category: "kepka",
    color: "sariq",
    season: "yoz",
    condition: "Yangi",
  });
  const countBefore = ItemsRepo.all().length;
  ItemsRepo.remove(item.id);
  assertEqual(ItemsRepo.all().length, countBefore - 1);
  assertEqual(ItemsRepo.findById(item.id), null);
});

test("ItemsRepo.toggleFavorite — sevimli holatini almashtiradi", () => {
  const item = ItemsRepo.create({
    name: "Sevimli test",
    category: "krossovka",
    color: "oq",
    season: "barcha-fasl",
    condition: "Yangi",
  });
  assertEqual(item.isFavorite, false);
  const toggled = ItemsRepo.toggleFavorite(item.id);
  assertEqual(toggled.isFavorite, true);
  const toggledBack = ItemsRepo.toggleFavorite(item.id);
  assertEqual(toggledBack.isFavorite, false);
});

/* ==========================================================================
   VALIDATE — buzilgan ma'lumotlarga chidamlilik
   ========================================================================== */
test("Validate.item — noto'g'ri kategoriyali yozuvni rad etadi", () => {
  assertEqual(
    Validate.item({
      id: "x",
      name: "Test",
      category: "NOTOGRI",
      color: "oq",
      season: "yoz",
    }),
    false,
  );
});

test("Validate.item — to'g'ri yozuvni qabul qiladi", () => {
  assertEqual(
    Validate.item({
      id: "x",
      name: "Test",
      category: "futbolka",
      color: "oq",
      season: "yoz",
    }),
    true,
  );
});

test("Validate.itemList — buzilgan yozuvlarni massivdan chiqarib tashlaydi, ilova qulamaydi", () => {
  const mixed = [
    {
      id: "1",
      name: "Yaxshi",
      category: "futbolka",
      color: "oq",
      season: "yoz",
    },
    {
      id: "2",
      name: "Buzilgan",
      category: "MAVJUD_EMAS",
      color: "oq",
      season: "yoz",
    },
    null,
    { id: "4" }, // to'liq emas
  ];
  const cleaned = Validate.itemList(mixed);
  assertEqual(cleaned.length, 1, "faqat 1 ta yaroqli yozuv qolishi kerak");
});

test("ItemsRepo.all — localStorage buzilgan JSON bo'lsa ham xato bermaydi", () => {
  sandbox.localStorage.setItem("kiyimim_items", "{buzilgan json[[[");
  const result = ItemsRepo.all();
  assert(
    Array.isArray(result),
    "buzilgan JSON holatida ham massiv qaytarilishi kerak",
  );
  // Tozalash — keyingi testlarga ta'sir qilmasin
  sandbox.localStorage.setItem("kiyimim_items", "[]");
});

/* ==========================================================================
   OUTFITSREPO / WEARLOGREPO
   ========================================================================== */
test("OutfitsRepo.create — outfit saqlaydi", () => {
  const outfit = OutfitsRepo.create({
    occasionId: "sayr",
    occasionName: "Sayr",
    occasionEmoji: "🚶",
    itemIds: { top: "x" },
    matchScore: 80,
  });
  assert(!!outfit.id);
  assertEqual(OutfitsRepo.findById(outfit.id).matchScore, 80);
});

test("WearLogRepo.setForDate — kunlik yozuvni saqlaydi va wearCount oshiradi", () => {
  const item = ItemsRepo.create({
    name: "Kiyildi",
    category: "jinsi",
    color: "kok",
    season: "barcha-fasl",
    condition: "Yaxshi",
  });
  WearLogRepo.setForDate("2026-01-01", [item.id]);
  const log = WearLogRepo.findByDate("2026-01-01");
  assert(!!log, "yozuv topilishi kerak");
  assertEqual(log.itemIds[0], item.id);
  assertEqual(ItemsRepo.findById(item.id).wearCount, 1);
});

/* ==========================================================================
   PROGRESSREPO — streak hisoblash
   ========================================================================== */
test("ProgressRepo.getStreak — hech qanday login bo'lmasa 0 qaytaradi", () => {
  sandbox.localStorage.removeItem("kiyimim_login_dates");
  assertEqual(ProgressRepo.getStreak(), 0);
});

test("ProgressRepo.recordLoginAndGetStreak — bugungi kirishni belgilaydi", () => {
  sandbox.localStorage.removeItem("kiyimim_login_dates");
  const streak = ProgressRepo.recordLoginAndGetStreak();
  assertEqual(streak, 1, "birinchi kirishda streak 1 bo'lishi kerak");
});

/* ==========================================================================
   NATIJA
   ========================================================================== */
console.log(`\n${passed} ta test o'tdi, ${failed} ta muvaffaqiyatsiz.`);
process.exit(failed > 0 ? 1 : 0);
