/**
 * wardrobe.js
 * -----------------------------------------------------------------------
 * "Kiyimlarim" bo'limi: ro'yxatni render qilish, real-vaqt qidiruv,
 * kategoriya bo'yicha tezkor filtr, kengaytirilgan filtr modali,
 * kiyim qo'shish/tahrirlash formasi va tafsilotlar oynasi.
 * -----------------------------------------------------------------------
 */
const Wardrobe = {
  state: {
    search: "",
    activeCategory: "all",
    filters: { category: [], color: [], season: [] },
    detailId: null,
    editingId: null,
    selectedCondition: "Yangi",
    selectedLaundry: "toza",
    photos: [],
    sortMode: "new",
    bulkMode: false,
    bulkSelected: new Set(),
  },

  init() {
    this.renderCategoryScroll();
    this.fillFormSelects();
    this.bindSearch();
    this.bindFilterModal();
    this.bindForm();
    this.bindDetailModal();
  },

  /* ---------------------------------------------------------------------
     RO'YXATNI RENDER QILISH
  --------------------------------------------------------------------- */
  getFilteredItems() {
    // Oddiy memoizatsiya: agar holat (search/category/filters/sort) va
    // ma'lumotlar oxirgi chaqiruvdan beri o'zgarmagan bo'lsa, qayta hisoblamaymiz.
    const items = ItemsRepo.all();
    const cacheKey = JSON.stringify({
      search: this.state.search,
      cat: this.state.activeCategory,
      filters: this.state.filters,
      sort: this.state.sortMode,
      len: items.length,
      lastUpdated: items[0]?.updatedAt || items[0]?.createdAt || 0,
    });
    if (this._cacheKey === cacheKey && this._cacheResult) {
      return this._cacheResult;
    }

    let filtered = items;
    const { search, activeCategory, filters } = this.state;

    if (activeCategory !== "all") {
      filtered = filtered.filter((it) => it.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(
        (it) =>
          it.name.toLowerCase().includes(q) ||
          (it.brand || "").toLowerCase().includes(q) ||
          colorInfo(it.color).name.toLowerCase().includes(q) ||
          catName(it.category).toLowerCase().includes(q),
      );
    }
    if (filters.category.length)
      filtered = filtered.filter((it) =>
        filters.category.includes(it.category),
      );
    if (filters.color.length)
      filtered = filtered.filter((it) => filters.color.includes(it.color));
    if (filters.season.length)
      filtered = filtered.filter((it) => filters.season.includes(it.season));

    if (this.state.sortMode === "name") {
      filtered = [...filtered].sort((a, b) =>
        a.name.localeCompare(b.name, "uz"),
      );
    } else if (this.state.sortMode === "worn") {
      filtered = [...filtered].sort(
        (a, b) => (b.wearCount || 0) - (a.wearCount || 0),
      );
    } else {
      filtered = [...filtered].sort(
        (a, b) => (b.createdAt || 0) - (a.createdAt || 0),
      );
    }

    this._cacheKey = cacheKey;
    this._cacheResult = filtered;
    return filtered;
  },

  render() {
    const grid = document.getElementById("wardrobeGrid");
    const empty = document.getElementById("wardrobeEmpty");
    const items = this.getFilteredItems();

    if (!items.length) {
      grid.innerHTML = "";
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    grid.innerHTML = items.map((it, i) => this.cardTemplate(it, i)).join("");

    grid.querySelectorAll(".item-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        if (e.target.closest(".fav-toggle")) return;
        if (this.state.bulkMode) {
          this.toggleBulkSelect(card.dataset.id);
          return;
        }
        this.openDetail(card.dataset.id);
      });
    });
    grid.querySelectorAll(".fav-toggle").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleFavorite(btn.dataset.id);
      });
    });
  },

  toggleBulkSelect(id) {
    if (this.state.bulkSelected.has(id)) this.state.bulkSelected.delete(id);
    else this.state.bulkSelected.add(id);
    this.render();
    this.updateBulkBar();
  },

  updateBulkBar() {
    const count = this.state.bulkSelected.size;
    document.getElementById("bulkCount").textContent = `${count} ta tanlandi`;
  },

  bindSortAndBulk() {
    const sortBtn = document.getElementById("sortToggleBtn");
    const sortMenu = document.getElementById("sortMenu");
    sortBtn.addEventListener("click", () => sortMenu.classList.toggle("show"));
    sortMenu.querySelectorAll("[data-sort]").forEach((btn) => {
      btn.addEventListener("click", () => {
        sortMenu
          .querySelectorAll("[data-sort]")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.state.sortMode = btn.dataset.sort;
        this.render();
      });
    });

    const multiBtn = document.getElementById("multiSelectToggleBtn");
    const bulkBar = document.getElementById("bulkBar");
    multiBtn.addEventListener("click", () => {
      this.state.bulkMode = !this.state.bulkMode;
      this.state.bulkSelected.clear();
      multiBtn.classList.toggle("active", this.state.bulkMode);
      bulkBar.hidden = !this.state.bulkMode;
      this.updateBulkBar();
      this.render();
    });

    document.getElementById("bulkDeleteBtn").addEventListener("click", () => {
      const count = this.state.bulkSelected.size;
      if (!count) {
        UI.toast("Hech narsa tanlanmagan", "error");
        return;
      }
      UI.confirm({
        title: `${count} ta kiyimni o'chirish`,
        text: "Bu amalni ortga qaytarib bo'lmaydi.",
        onConfirm: () => {
          this.state.bulkSelected.forEach((id) => ItemsRepo.remove(id));
          UI.toast(`${count} ta kiyim o'chirildi`, "success");
          this.state.bulkSelected.clear();
          this.updateBulkBar();
          this.render();
        },
      });
    });
  },

  cardTemplate(it, index) {
    const color = colorInfo(it.color);
    const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
    const photos =
      it.photos && it.photos.length ? it.photos : it.photo ? [it.photo] : [];
    const cover = photos[0];
    return `
      <article class="item-card" data-id="${it.id}" style="animation-delay:${index * 0.03}s">
        <div class="item-card-img" style="${cover ? "" : `background:${gradient}`}">
          ${
            cover
              ? `<img src="${cover}" alt="${it.name}">`
              : `<div class="no-img"><svg viewBox="0 0 24 24"><use href="#ic-shirt"/></svg></div>`
          }
          ${photos.length > 1 ? `<span class="photo-count-badge">${photos.length} 📷</span>` : ""}
          ${it.laundry === "kirli" ? `<span class="laundry-badge">Kirli</span>` : ""}
          <button class="fav-toggle ${it.isFavorite ? "is-fav" : ""}" data-id="${it.id}">
            <svg viewBox="0 0 24 24"><use href="#ic-heart"/></svg>
          </button>
        </div>
        <div class="item-card-body">
          <p class="item-card-name">${it.name}</p>
          <p class="item-card-cat">${catName(it.category)} · ${it.brand || "Brendsiz"}</p>
          <div class="item-card-foot">
            <span class="item-card-cat-small">${it.material || catName(it.category)}</span>
            <span class="item-card-dot" style="background:${color.hex}"></span>
          </div>
        </div>
      </article>`;
  },

  renderCategoryScroll() {
    const scroll = document.getElementById("categoryScroll");
    const chips = [{ id: "all", name: "Barchasi" }, ...CATEGORIES];
    scroll.innerHTML = chips
      .map(
        (c) =>
          `<button class="cat-chip ${c.id === this.state.activeCategory ? "active" : ""}" data-cat="${c.id}">${c.name}</button>`,
      )
      .join("");
    scroll.querySelectorAll(".cat-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.state.activeCategory = btn.dataset.cat;
        scroll
          .querySelectorAll(".cat-chip")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.render();
      });
    });
  },

  /* ---------------------------------------------------------------------
     QIDIRUV
  --------------------------------------------------------------------- */
  bindSearch() {
    const toggleBtn = document.getElementById("searchToggleBtn");
    const bar = document.getElementById("searchBar");
    const input = document.getElementById("searchInput");
    const clearBtn = document.getElementById("searchClear");

    const debouncedRender = UI.debounce(() => this.render(), 220);

    toggleBtn.addEventListener("click", () => {
      bar.classList.toggle("show");
      if (bar.classList.contains("show")) input.focus();
    });
    input.addEventListener("input", () => {
      this.state.search = input.value;
      clearBtn.hidden = !input.value;
      debouncedRender();
    });
    clearBtn.addEventListener("click", () => {
      input.value = "";
      this.state.search = "";
      clearBtn.hidden = true;
      this.render();
    });
  },

  /* ---------------------------------------------------------------------
     FILTR MODALI
  --------------------------------------------------------------------- */
  bindFilterModal() {
    document.getElementById("filterToggleBtn").addEventListener("click", () => {
      this.renderFilterOptions();
      UI.openModal("filterModal");
    });
    document
      .querySelector("#filterModal .modal-handle")
      ?.addEventListener("click", () => UI.closeModal("filterModal"));
    document.getElementById("filterModal").addEventListener("click", (e) => {
      if (e.target.id === "filterModal") UI.closeModal("filterModal");
    });
    document.getElementById("filterReset").addEventListener("click", () => {
      this.state.filters = { category: [], color: [], season: [] };
      this.renderFilterOptions();
    });
    document.getElementById("filterApply").addEventListener("click", () => {
      UI.closeModal("filterModal");
      this.updateFilterBadge();
      this.render();
    });
  },

  renderFilterOptions() {
    const buildChips = (container, options, key) => {
      container.innerHTML = options
        .map((o) => {
          const active = this.state.filters[key].includes(o.id);
          return `<button type="button" class="chip-opt ${active ? "active" : ""}" data-key="${key}" data-val="${o.id}">${o.name}</button>`;
        })
        .join("");
    };
    buildChips(
      document.getElementById("filterCategory"),
      CATEGORIES,
      "category",
    );
    buildChips(document.getElementById("filterColor"), COLORS, "color");
    buildChips(document.getElementById("filterSeason"), SEASONS, "season");

    document.querySelectorAll(".chip-opt").forEach((btn) => {
      btn.addEventListener("click", () => {
        const { key, val } = btn.dataset;
        const arr = this.state.filters[key];
        const idx = arr.indexOf(val);
        idx === -1 ? arr.push(val) : arr.splice(idx, 1);
        btn.classList.toggle("active");
      });
    });
  },

  updateFilterBadge() {
    const { category, color, season } = this.state.filters;
    const count = category.length + color.length + season.length;
    document.getElementById("filterBadge").hidden = count === 0;
  },

  /* ---------------------------------------------------------------------
     SEVIMLILAR
  --------------------------------------------------------------------- */
  toggleFavorite(id) {
    const item = ItemsRepo.toggleFavorite(id);
    if (item?.isFavorite) UI.toast("Sevimlilarga qo'shildi", "success");
    this.render();
    this.renderFavorites();
    if (this.state.detailId === id) this.refreshDetailFavIcon(item);
  },

  renderFavorites() {
    const grid = document.getElementById("favoritesGrid");
    const empty = document.getElementById("favoritesEmpty");
    const items = ItemsRepo.all().filter((it) => it.isFavorite);
    if (!items.length) {
      grid.innerHTML = "";
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    grid.innerHTML = items.map((it, i) => this.cardTemplate(it, i)).join("");
    grid.querySelectorAll(".item-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        if (e.target.closest(".fav-toggle")) return;
        this.openDetail(card.dataset.id);
      });
    });
    grid.querySelectorAll(".fav-toggle").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleFavorite(btn.dataset.id);
      });
    });
  },

  /* ---------------------------------------------------------------------
     TAFSILOTLAR MODALI
  --------------------------------------------------------------------- */
  bindDetailModal() {
    document
      .getElementById("detailClose")
      .addEventListener("click", () => UI.closeModal("detailModal"));
    document.getElementById("detailModal").addEventListener("click", (e) => {
      if (e.target.id === "detailModal") UI.closeModal("detailModal");
    });
    document.getElementById("detailFavBtn").addEventListener("click", () => {
      this.toggleFavorite(this.state.detailId);
    });
    document.getElementById("detailEditBtn").addEventListener("click", () => {
      UI.closeModal("detailModal");
      this.startEdit(this.state.detailId);
    });
    document.getElementById("detailDeleteBtn").addEventListener("click", () => {
      const item = ItemsRepo.findById(this.state.detailId);
      UI.confirm({
        title: "Kiyimni o'chirish",
        text: `"${item.name}" butunlay o'chiriladi. Davom etasizmi?`,
        onConfirm: () => {
          ItemsRepo.remove(item.id);
          ActivityRepo.add(`"${item.name}" o'chirildi`, "ic-trash");
          UI.closeModal("detailModal");
          UI.toast("Kiyim o'chirildi", "success");
          this.render();
          this.renderFavorites();
        },
      });
    });
  },

  openDetail(id) {
    const it = ItemsRepo.findById(id);
    if (!it) return;
    this.state.detailId = id;
    document.getElementById("detailName").textContent = it.name;
    document.getElementById("detailCategory").textContent =
      `${catName(it.category)} · ${it.brand || "Brendsiz"}`;
    document.getElementById("detailNote").textContent =
      it.note || "Izoh qo'shilmagan.";

    const photos =
      it.photos && it.photos.length ? it.photos : it.photo ? [it.photo] : [];
    const photoWrap = document.getElementById("detailPhoto");
    const dotsWrap = document.getElementById("detailPhotoDots");
    if (photos.length) {
      photoWrap.innerHTML = photos
        .map(
          (p) =>
            `<div class="detail-photo-slide"><img src="${p}" alt="${it.name}"></div>`,
        )
        .join("");
      dotsWrap.innerHTML =
        photos.length > 1
          ? photos
              .map((_, i) => `<span class="${i === 0 ? "active" : ""}"></span>`)
              .join("")
          : "";
      if (photos.length > 1) {
        photoWrap.onscroll = () => {
          const idx = Math.round(photoWrap.scrollLeft / photoWrap.clientWidth);
          dotsWrap
            .querySelectorAll("span")
            .forEach((d, i) => d.classList.toggle("active", i === idx));
        };
      }
    } else {
      photoWrap.innerHTML = `<div class="detail-photo-slide"><svg viewBox="0 0 24 24"><use href="#ic-shirt"/></svg></div>`;
      dotsWrap.innerHTML = "";
    }

    const color = colorInfo(it.color);
    document.getElementById("detailTags").innerHTML = `
      <span class="detail-tag"><span class="color-swatch" style="background:${color.hex}"></span>${color.name}</span>
      <span class="detail-tag">${seasonName(it.season)}</span>
      <span class="detail-tag">${it.condition}</span>
      ${it.material ? `<span class="detail-tag">${it.material}</span>` : ""}
    `;
    this.refreshDetailFavIcon(it);
    this.renderDetailMatches(it);
    UI.openModal("detailModal");
  },

  refreshDetailFavIcon(item) {
    document
      .getElementById("detailFavBtn")
      .classList.toggle("is-fav", !!item.isFavorite);
  },

  /** Rang moslik jadvaliga asosan, ushbu kiyim bilan mos keladigan
   *  boshqa toifadagi (top/bottom/shoes) 4 tagacha kiyimni topib ko'rsatadi */
  renderDetailMatches(item) {
    const section = document.getElementById("detailMatchSection");
    const box = document.getElementById("detailMatchList");
    if (!section || !box || typeof RecommendationEngine === "undefined") {
      if (section) section.hidden = true;
      return;
    }

    const harmony = RecommendationEngine.colorHarmony;
    const matchColors = harmony[item.color] || [];
    const others = ItemsRepo.all().filter(
      (it) => it.id !== item.id && it.category !== item.category,
    );
    const matches = others
      .filter((it) => matchColors.includes(it.color))
      .slice(0, 4);

    if (!matches.length) {
      section.hidden = true;
      return;
    }

    section.hidden = false;
    box.innerHTML = matches
      .map(
        (it) => `
      <div class="detail-match-card" data-open-item="${it.id}">
        <span class="detail-match-thumb">${
          it.photo
            ? `<img src="${it.photo}" alt="">`
            : `<svg viewBox="0 0 24 24"><use href="#ic-shirt"/></svg>`
        }</span>
        <span>${it.name}</span>
      </div>`,
      )
      .join("");

    box.querySelectorAll("[data-open-item]").forEach((card) => {
      card.addEventListener("click", () => {
        this.openDetail(card.dataset.openItem);
      });
    });
  },

  /* ---------------------------------------------------------------------
     FORMA: KIYIM QO'SHISH / TAHRIRLASH
  --------------------------------------------------------------------- */
  fillFormSelects() {
    UI.fillSelect(document.getElementById("itemCategory"), CATEGORIES);
    UI.fillSelect(document.getElementById("itemColor"), COLORS);
    UI.fillSelect(document.getElementById("itemSeason"), SEASONS);
    // filter va forma uchun ham kerak bo'lgani uchun global qilib qo'yamiz
  },

  resetForm() {
    this.state.editingId = null;
    this.state.selectedCondition = "Yangi";
    this.state.selectedLaundry = "toza";
    this.state.photos = [];
    document.getElementById("itemForm").reset();
    document.getElementById("itemId").value = "";
    this.renderPhotoGallery();
    document
      .querySelectorAll("#itemConditionSeg .seg-btn")
      .forEach((b) =>
        b.classList.toggle("active", b.dataset.value === "Yangi"),
      );
    document
      .querySelectorAll("#itemLaundrySeg .seg-btn")
      .forEach((b) => b.classList.toggle("active", b.dataset.value === "toza"));
    document.getElementById("addFormTitle").textContent = "Kiyim qo'shish";
    document.getElementById("itemSaveBtn").textContent = "Saqlash";
  },

  startEdit(id) {
    const it = ItemsRepo.findById(id);
    if (!it) return;
    this.state.editingId = id;
    this.state.selectedCondition = it.condition;
    this.state.selectedLaundry = it.laundry || "toza";
    this.state.photos =
      it.photos && it.photos.length
        ? [...it.photos]
        : it.photo
          ? [it.photo]
          : [];

    document.getElementById("itemId").value = id;
    document.getElementById("itemName").value = it.name;
    document.getElementById("itemCategory").value = it.category;
    document.getElementById("itemColor").value = it.color;
    document.getElementById("itemBrand").value = it.brand || "";
    document.getElementById("itemSeason").value = it.season;
    document.getElementById("itemMaterial").value = it.material || "";
    document.getElementById("itemNote").value = it.note || "";
    this.renderPhotoGallery();

    document
      .querySelectorAll("#itemConditionSeg .seg-btn")
      .forEach((b) =>
        b.classList.toggle("active", b.dataset.value === it.condition),
      );
    document
      .querySelectorAll("#itemLaundrySeg .seg-btn")
      .forEach((b) =>
        b.classList.toggle(
          "active",
          b.dataset.value === (it.laundry || "toza"),
        ),
      );

    document
      .querySelectorAll("#itemConditionSeg .seg-btn")
      .forEach((b) =>
        b.classList.toggle("active", b.dataset.value === it.condition),
      );
    document
      .querySelectorAll("#itemLaundrySeg .seg-btn")
      .forEach((b) =>
        b.classList.toggle(
          "active",
          b.dataset.value === (it.laundry || "toza"),
        ),
      );

    document.getElementById("addFormTitle").textContent = "Kiyimni tahrirlash";
    document.getElementById("itemSaveBtn").textContent =
      "O'zgarishlarni saqlash";
    UI.navigateTo("add");
  },

  /** Rasm gallereyasini (yuklangan rasmlar + "qo'shish" tugmasi) qayta chizadi */
  renderPhotoGallery() {
    const gallery = document.getElementById("photoGallery");
    const addBtnHtml = `
      <div class="photo-thumb photo-thumb-add" id="photoAddBtn">
        <svg viewBox="0 0 24 24"><use href="#ic-camera"/></svg>
        <span>Rasm qo'shish</span>
      </div>`;
    const photosHtml = this.state.photos
      .map(
        (src, i) => `
      <div class="photo-thumb" data-photo-index="${i}">
        <img src="${src}" alt="Rasm ${i + 1}">
        ${i === 0 ? '<span class="photo-thumb-cover">Asosiy</span>' : ""}
        <button type="button" class="photo-thumb-remove" data-remove-photo="${i}">
          <svg viewBox="0 0 24 24"><use href="#ic-close"/></svg>
        </button>
      </div>`,
      )
      .join("");
    gallery.innerHTML =
      photosHtml + (this.state.photos.length < 6 ? addBtnHtml : "");

    const addBtn = document.getElementById("photoAddBtn");
    if (addBtn)
      addBtn.addEventListener("click", () =>
        document.getElementById("photoInput").click(),
      );
    gallery.querySelectorAll("[data-remove-photo]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.state.photos.splice(Number(btn.dataset.removePhoto), 1);
        this.renderPhotoGallery();
      });
    });
  },

  /** Rasmni canvas orqali kichraytirib, localStorage joyini tejaydi
   *  (katta rasmlar saqlash chegarasini tez to'ldirib, xatosiz saqlanmay qolishiga sabab bo'ladi) */
  compressImage(file, maxSize = 900, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > height && width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d").drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  bindForm() {
    // Rasm yuklash — bir nechta fayl birdan tanlash mumkin
    const photoInput = document.getElementById("photoInput");
    photoInput.addEventListener("change", async () => {
      const files = Array.from(photoInput.files).slice(
        0,
        6 - this.state.photos.length,
      );
      for (const file of files) {
        try {
          const compressed = await this.compressImage(file);
          this.state.photos.push(compressed);
          this.renderPhotoGallery();
        } catch (err) {
          console.error("Rasmni yuklashda xato:", err);
          UI.toast("Rasmni yuklab bo'lmadi, boshqasini sinab ko'ring", "error");
        }
      }
      photoInput.value = "";
    });

    // Holat segmenti
    document.querySelectorAll("#itemConditionSeg .seg-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .querySelectorAll("#itemConditionSeg .seg-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.state.selectedCondition = btn.dataset.value;
      });
    });

    // Kirlik holati segmenti
    document.querySelectorAll("#itemLaundrySeg .seg-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .querySelectorAll("#itemLaundrySeg .seg-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.state.selectedLaundry = btn.dataset.value;
      });
    });

    // Forma yuborilishi
    document.getElementById("itemForm").addEventListener("submit", (e) => {
      e.preventDefault();
      this.saveForm();
    });
  },

  saveForm() {
    const name = document.getElementById("itemName").value.trim();
    const category = document.getElementById("itemCategory").value;
    const color = document.getElementById("itemColor").value;
    const brand = document.getElementById("itemBrand").value.trim();
    const season = document.getElementById("itemSeason").value;
    const material = document.getElementById("itemMaterial").value.trim();
    const note = document.getElementById("itemNote").value.trim();

    if (!name) {
      UI.toast("Iltimos, kiyim nomini kiriting", "error");
      return;
    }

    // Yangi kiyim qo'shishda (tahrirlashda emas) bepul reja limitini tekshiramiz
    if (
      !this.state.editingId &&
      typeof PremiumUI !== "undefined" &&
      !PremiumUI.canAddItem()
    ) {
      return;
    }

    const payload = {
      name,
      category,
      color,
      brand,
      season,
      material,
      note,
      condition: this.state.selectedCondition,
      laundry: this.state.selectedLaundry,
      photos: this.state.photos,
      photo: this.state.photos[0] || null,
    };

    if (this.state.editingId) {
      ItemsRepo.update(this.state.editingId, payload);
      ActivityRepo.add(`"${name}" tahrirlandi`, "ic-edit");
      UI.showSuccess("Yangilandi!");
      UI.toast("O'zgarishlar saqlandi", "success");
    } else {
      ItemsRepo.create(payload);
      ActivityRepo.add(`"${name}" garderobga qo'shildi`, "ic-plus");
      UI.showSuccess("Saqlandi!");
      UI.toast("Kiyim qo'shildi", "success");
    }

    this.resetForm();
    UI.navigateTo("wardrobe");
  },
};
