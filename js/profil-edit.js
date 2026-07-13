/**
 * profile-edit.js
 * -----------------------------------------------------------------------
 * "Profilni tahrirlash" oynasi: foydalanuvchi o'z ismi, emaili, paroli va
 * profil rasmini xohlagancha o'zgartira oladi. Barcha o'zgarishlar
 * UsersRepo orqali localStorage'ga yoziladi.
 *
 * Agar storage.js ichidagi UsersRepo'da `update` metodi mavjud bo'lmasa
 * (eski versiya), shu yerda xavfsiz fallback qo'shiladi — shunda ilova
 * hali ham to'liq ishlaydi.
 * -----------------------------------------------------------------------
 */
if (
  typeof UsersRepo !== "undefined" &&
  typeof UsersRepo.update !== "function"
) {
  UsersRepo.update = function (id, patch) {
    const users = this.all();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    users[idx] = { ...users[idx], ...patch };
    Storage.set(STORAGE_KEYS.USERS, users);
    return users[idx];
  };
}

const ProfileEditUI = {
  pendingAvatar: undefined, // undefined = o'zgarmagan, null = olib tashlangan, string = yangi rasm

  init() {
    this.bindOpen();
    this.bindClose();
    this.bindPhoto();
    this.bindSubmit();
  },

  bindOpen() {
    const btn = document.getElementById("editProfileBtn");
    if (!btn) return;
    btn.addEventListener("click", () => this.open());
  },

  bindClose() {
    document
      .getElementById("editProfileClose")
      .addEventListener("click", () => this.close());
  },

  open() {
    const user = UsersRepo.getCurrent();
    if (!user) return;

    this.pendingAvatar = undefined;
    document.getElementById("editProfileName").value = user.name || "";
    document.getElementById("editProfileEmail").value = user.email || "";
    document.getElementById("editProfileCurrentPassword").value = "";
    document.getElementById("editProfileNewPassword").value = "";
    this.hideError();

    const preview = document.getElementById("editProfileAvatarPreview");
    const removeBtn = document.getElementById("editProfilePhotoRemove");
    if (user.avatar) {
      preview.innerHTML = `<img src="${user.avatar}" alt="${user.name}">`;
      removeBtn.hidden = false;
    } else {
      preview.textContent = this.initials(user.name);
      removeBtn.hidden = true;
    }

    UI.openModal("editProfileModal");
  },

  close() {
    UI.closeModal("editProfileModal");
  },

  initials(name = "") {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
  },

  bindPhoto() {
    const input = document.getElementById("editProfilePhotoInput");
    const removeBtn = document.getElementById("editProfilePhotoRemove");
    const preview = document.getElementById("editProfileAvatarPreview");

    input.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        UI.toast("Iltimos, rasm faylini tanlang", "error");
        return;
      }
      const dataUrl = await this.readAndResize(file);
      this.pendingAvatar = dataUrl;
      preview.innerHTML = `<img src="${dataUrl}" alt="avatar">`;
      removeBtn.hidden = false;
    });

    removeBtn.addEventListener("click", () => {
      this.pendingAvatar = null;
      input.value = "";
      const name = document.getElementById("editProfileName").value || "FI";
      preview.textContent = this.initials(name);
      removeBtn.hidden = true;
    });
  },

  /** Rasmni 400px gacha kichraytirib, base64 (dataURL) shaklida qaytaradi */
  readAndResize(file) {
    return new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        const MAX = 400;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) {
            height = Math.round((height * MAX) / width);
            width = MAX;
          } else {
            width = Math.round((width * MAX) / height);
            height = MAX;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(objectUrl);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = objectUrl;
    });
  },

  showError(msg) {
    const el = document.getElementById("editProfileError");
    el.textContent = msg;
    el.hidden = false;
  },
  hideError() {
    document.getElementById("editProfileError").hidden = true;
  },

  bindSubmit() {
    document
      .getElementById("editProfileForm")
      .addEventListener("submit", (e) => {
        e.preventDefault();
        this.save();
      });
  },

  async save() {
    this.hideError();
    const user = UsersRepo.getCurrent();
    if (!user) return;

    const name = document.getElementById("editProfileName").value.trim();
    const email = document.getElementById("editProfileEmail").value.trim();
    const currentPassword = document.getElementById(
      "editProfileCurrentPassword",
    ).value;
    const newPassword = document.getElementById("editProfileNewPassword").value;

    if (!name || !email) {
      this.showError("Ism va email to'ldirilishi shart.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      this.showError("Email formati noto'g'ri.");
      return;
    }

    // Email boshqa foydalanuvchida band bo'lsa (o'zinikidan tashqari)
    const existing = UsersRepo.findByEmail(email);
    if (existing && existing.id !== user.id) {
      this.showError("Bu email allaqachon boshqa hisobda ishlatilmoqda.");
      return;
    }

    const patch = { name, email };

    // Parolni o'zgartirish faqat ikkala maydon ham to'ldirilganda
    if (newPassword || currentPassword) {
      if (!currentPassword) {
        this.showError("Yangi parol o'rnatish uchun joriy parolni kiriting.");
        return;
      }
      const storedPassword = user.password;
      const matches =
        typeof PasswordUtils !== "undefined" &&
        /^[a-f0-9]{64}$/i.test(storedPassword)
          ? await PasswordUtils.verifyPassword(currentPassword, storedPassword)
          : currentPassword === storedPassword;
      if (!matches) {
        this.showError("Joriy parol noto'g'ri.");
        return;
      }
      if (newPassword.length < 6) {
        this.showError(
          "Yangi parol kamida 6 ta belgidan iborat bo'lishi kerak.",
        );
        return;
      }
      patch.password =
        typeof PasswordUtils !== "undefined" &&
        /^[a-f0-9]{64}$/i.test(storedPassword)
          ? await PasswordUtils.hash(newPassword)
          : newPassword;
    }

    if (this.pendingAvatar !== undefined) {
      patch.avatar = this.pendingAvatar; // string yoki null
    }

    const updated = UsersRepo.update(user.id, patch);
    if (!updated) {
      this.showError("Profilni yangilashda xatolik yuz berdi.");
      return;
    }

    App.renderProfileHero(updated);
    document.getElementById("userNameDisplay").textContent =
      updated.name.split(" ")[0];

    this.close();
    UI.showSuccess("Profil yangilandi!");
    UI.toast("Profil ma'lumotlari saqlandi", "success");
  },
};
