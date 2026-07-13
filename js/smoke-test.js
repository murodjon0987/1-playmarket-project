/**
 * smoke-test.js
 * -----------------------------------------------------------------------
 * Node.js orqali ishga tushiriladigan asosiy "smoke test"lar.
 * Brauzer kerak emas — localStorage global'ini soxta (mock) qilib,
 * asosiy CRUD, validatsiya va AI tanlash mantig'ini tekshiradi.
 * Ishga tushirish: node js/tests/smoke-test.js
 * -----------------------------------------------------------------------
 */
const assert = require("assert");
const path = require("path");
const fs = require("fs");
const vm = require("vm");

// --- Soxta (mock) brauzer muhiti ---
function createLocalStorageMock() {
  let store = {};
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => {
      store[k] = String(v);
    },
    removeItem: (k) => {
      delete store[k];
    },
    clear: () => {
      store = {};
    },
  };
}

const sandbox = {
  localStorage: createLocalStorageMock(),
  console,
  window: {},
  navigator: { geolocation: null },
  document: { addEventListener: () => {} },
};
const context = vm.createContext(sandbox);

function loadScript(relPath) {
  const code = fs.readFileSync(path.join(__dirname, "..", relPath), "utf8");
  // "const X = ..." ni "window.X = ..." ga aylantiramiz, shunda vm kontekstidan
  // tashqarida ham (sandbox.window orqali) ko'rinadi.
  const exposed = code.replace(/^const (\w+) = /gm, "window.$1 = this.$1 = ");
  vm.runInContext(exposed, context, { filename: relPath });
}

loadScript("storage.js");
loadScript("data.js");

const { ItemsRepo, OutfitsRepo, WearLogRepo, ProgressRepo, Validate, Store } =
  sandbox.window;

let passed = 0;
function check(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(`   ${err.message}`);
    process.exitCode = 1;
  }
}

check("ItemsRepo.create yangi kiyim qo'shadi va id beradi", () => {
  const item = ItemsRepo.create({
    name: "Test futbolka",
    category: "futbolka",
    color: "oq",
    season: "yoz",
  });
  assert.ok(item.id);
  assert.strictEqual(item.name, "Test futbolka");
  assert.strictEqual(ItemsRepo.all().length, 1);
});

check("ItemsRepo.update mavjud kiyimni o'zgartiradi", () => {
  const item = ItemsRepo.all()[0];
  const updated = ItemsRepo.update(item.id, { name: "Yangilangan nom" });
  assert.strictEqual(updated.name, "Yangilangan nom");
});

check("ItemsRepo.toggleFavorite sevimli holatini almashtiradi", () => {
  const item = ItemsRepo.all()[0];
  const toggled = ItemsRepo.toggleFavorite(item.id);
  assert.strictEqual(toggled.isFavorite, true);
});

check("ItemsRepo.remove kiyimni o'chiradi", () => {
  const item = ItemsRepo.all()[0];
  ItemsRepo.remove(item.id);
  assert.strictEqual(ItemsRepo.all().length, 0);
});

check("Validate.itemList buzuq yozuvlarni chiqarib tashlaydi", () => {
  const mixed = [
    {
      id: "a1",
      name: "To'g'ri kiyim",
      category: "futbolka",
      color: "oq",
      season: "yoz",
    },
    { id: "", name: "", category: "noldir" }, // yaroqsiz
    null, // yaroqsiz
  ];
  const cleaned = Validate.itemList(mixed);
  assert.strictEqual(cleaned.length, 1);
  assert.strictEqual(cleaned[0].id, "a1");
});

check("Store.emit barcha obunachilarni chaqiradi", () => {
  let called = 0;
  Store.on("test:event", () => {
    called++;
  });
  Store.emit("test:event");
  Store.emit("test:event");
  assert.strictEqual(called, 2);
});

check("OutfitsRepo.create va remove ishlaydi", () => {
  const outfit = OutfitsRepo.create({
    occasionId: "sayr",
    occasionName: "Sayr",
    itemIds: { top: "x" },
  });
  assert.ok(outfit.id);
  assert.strictEqual(OutfitsRepo.all().length, 1);
  OutfitsRepo.remove(outfit.id);
  assert.strictEqual(OutfitsRepo.all().length, 0);
});

check("WearLogRepo.setForDate yozuv yaratadi va wearCount oshiradi", () => {
  const item = ItemsRepo.create({
    name: "Krossovka",
    category: "krossovka",
    color: "qora",
    season: "barcha-fasl",
  });
  const today = new Date().toISOString().slice(0, 10);
  WearLogRepo.setForDate(today, [item.id]);
  const updated = ItemsRepo.findById(item.id);
  assert.strictEqual(updated.wearCount, 1);
  assert.ok(WearLogRepo.findByDate(today));
});

check("ProgressRepo.getStreak bugungi kirishni hisobga oladi", () => {
  ProgressRepo.recordLoginAndGetStreak();
  assert.ok(ProgressRepo.getStreak() >= 1);
});

console.log(`\n${passed} ta test muvaffaqiyatli o'tdi.`);
if (process.exitCode) {
  console.error("Ba'zi testlar muvaffaqiyatsiz tugadi.");
} else {
  console.log("Barcha testlar muvaffaqiyatli. ✅");
}
