/**
 * enhancements.js
 * Kiyimim AI — Qo'shimcha yaxshilashlar va yangi funksiyalar
 */

const Enhancements = {
  init() {
    this.addImportExport();
    this.enableImageCompression();
    this.enhanceAI();
    this.addOnboarding();
    this.globalErrorHandler();
  },

  /** Rasm siqish (1.5MB dan katta bo'lsa siqadi) */
  enableImageCompression() {
    const originalHandler = Wardrobe.bindForm ? Wardrobe.bindForm : null;
    // photoInput change eventini yaxshilaymiz
    const photoInput = document.getElementById('photoInput');
    if (photoInput) {
      photoInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 1.5 * 1024 * 1024) {
          UI.toast("Rasm siqilmoqda...", "default");
          const compressed = await this.compressImage(file);
          const reader = new FileReader();
          reader.onload = () => {
            Wardrobe.state.photoData = reader.result;
            document.getElementById('photoPreview').src = reader.result;
            document.getElementById('photoPreview').hidden = false;
            document.getElementById('photoPlaceholder').style.display = 'none';
          };
          reader.readAsDataURL(compressed);
        }
      });
    }
  },

  async compressImage(file) {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = (MAX_WIDTH * height) / width;
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
        }, 'image/jpeg', 0.85);
      };
    });
  },

  /** Yaxshiroq AI scoring */
  enhanceAI() {
    const originalPick = AIEngine.pickForSlot;
    AIEngine.pickForSlot = function(slotCategories, occasion, items, exclude, shuffle) {
      let pool = items.filter(it => slotCategories.includes(it.category) && !exclude.has(it.id));
      if (!pool.length) return null;

      const scored = pool.map(it => {
        let score = 0;
        if (occasion.seasonPref?.includes(it.season)) score += 25;
        if (occasion.categoryPref?.includes(it.category)) score += 30;
        if (it.isFavorite) score += 15;
        if (it.condition === 'Yangi') score += 10;

        // Rang mosligi (oddiy)
        if (it.color === 'qora' || it.color === 'oq') score += 8;

        return { it, score };
      });

      scored.sort((a, b) => b.score - a.score);
      return scored[0]?.it || null;
    };
  },

  /** Import / Export yaxshilash */
  addImportExport() {
    const backupBtn = document.getElementById('backupBtn');
    if (backupBtn) {
      backupBtn.textContent = "Zaxira yuklab olish";
      backupBtn.addEventListener('click', () => this.exportData());
    }

    // Import tugmasi qo'shamiz Sozlamalar bo'limiga
    const settingsMa = document.querySelector('#view-settings .view-content');
    if (settingsMa) {
      const importDiv = document.createElement('div');
      importDiv.innerHTML = `
        <button id="importBtn" class="btn btn-secondary" style="margin-top:12px;">
          Zaxiradan tiklash (Import)
        </button>`;
      settingsMa.appendChild(importDiv);

      document.getElementById('importBtn').addEventListener('click', () => this.importData());
    }
  },

  exportData() {
    const data = {
      items: ItemsRepo.all(),
      outfits: OutfitsRepo.all(),
      wearLog: WearLogRepo.all(),
      users: UsersRepo.all(),
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kiyimim-ai-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    UI.toast("Zaxira muvaffaqiyatli yuklandi!", "success");
  },

  importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          if (data.items) ItemsRepo.save(data.items);
          if (data.outfits) OutfitsRepo.save(data.outfits);
          if (data.wearLog) WearLogRepo.save(data.wearLog);
          UI.toast("Ma'lumotlar muvaffaqiyatli tiklandi!", "success");
          location.reload();
        } catch (err) {
          UI.toast("Fayl noto'g'ri yoki buzilgan", "error");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  },

  addOnboarding() {
    if (!localStorage.getItem('kiyimim_onboarded')) {
      setTimeout(() => {
        UI.toast("Xush kelibsiz! Birinchi kiyimingizni qo'shing →", "success");
        localStorage.setItem('kiyimim_onboarded', 'true');
      }, 2500);
    }
  },

  globalErrorHandler() {
    window.addEventListener('error', (e) => {
      console.error("Global xato:", e.error);
      UI.toast("Xatolik yuz berdi. Iltimos, sahifani yangilang.", "error");
    });
  }
};

// App init da chaqiramiz
const originalInit = App.init;
App.init = function() {
  originalInit.call(this);
  Enhancements.init();
};

// ====================== PAROL XAVFSIZLIGI ======================
const PasswordUtils = {
  /** Parolni SHA-256 bilan hash qilish */
  async hash(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  /** Ro'yxatdan o'tish va kirishda ishlatish uchun */
  async registerWithHash(name, email, password) {
    const hashed = await this.hash(password);
    return UsersRepo.create({ name, email, password: hashed }); // endi hash saqlanadi
  },

  async verifyPassword(inputPassword, storedHash) {
    const inputHash = await this.hash(inputPassword);
    return inputHash === storedHash;
  }
};