const { JSDOM } = require("jsdom");
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

const dom = new JSDOM(html, {
  url: "http://localhost/",
  runScripts: "dangerously",
  resources: "usable",
  pretendToBeVisual: true,
});

dom.window.onerror = (msg, src, line, col, err) => {
  console.error("WINDOW ERROR:", msg, "at", src, line + ":" + col);
  if (err && err.stack) console.error(err.stack);
};

// fetch/geolocation mavjud emas — mock qilamiz, chunki weather/chat chaqiradi
dom.window.fetch = () => Promise.reject(new Error("fetch mocked"));
dom.window.navigator.geolocation = {
  getCurrentPosition: (success, error) => error && error({ code: 1 }),
};

const scripts = [
  "js/storage.js",
  "js/data.js",
  "js/ui.js",
  "js/auth.js",
  "js/wardrobe.js",
  "js/ai.js",
  "js/features.js",
  "js/app.js",
];

(async () => {
  try {
    const combined = scripts
      .map((s) => fs.readFileSync(path.join(__dirname, s), "utf8"))
      .join("\n;\n");
    dom.window.eval(combined);
    console.log("Barcha skriptlar bitta global scope'da yuklandi.");
  } catch (err) {
    console.error("XATO (skriptlarni yuklashda):", err.message);
    console.error(err.stack);
    process.exit(1);
  }

  // DOMContentLoaded ni qo'lda ishga tushiramiz
  try {
    dom.window.document.dispatchEvent(
      new dom.window.Event("DOMContentLoaded", {
        bubbles: true,
        cancelable: true,
      }),
    );
    console.log(
      "DOMContentLoaded yuborildi, App.init() chaqirilishi kerak edi.",
    );
  } catch (err) {
    console.error("DOMContentLoaded ishga tushirishda XATO:", err.message);
    console.error(err.stack);
    process.exit(1);
  }

  setTimeout(() => {
    console.log("--- 2500ms dan keyin holat ---");
    console.log(
      "Splash display:",
      dom.window.document.getElementById("splash").style.display,
    );
    console.log(
      "Auth display:",
      dom.window.document.getElementById("auth").style.display,
    );
    console.log(
      "AppShell display:",
      dom.window.document.getElementById("appShell").style.display,
    );
  }, 2500);
})();
