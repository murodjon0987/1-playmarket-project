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
    search: '',
    activeCategory: 'all',
    filters: { category: [], color: [], season: [], priceMin: null, priceMax: null },
    detailId: null,
    editingId: null,
    selectedCondition: 'Yangi',
    photoData: null
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
    let items = ItemsRepo.all();
    const { search, activeCategory, filters } = this.state;

    if (activeCategory !== 'all') {
      items = items.filter(it => it.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter(it =>
        it.name.toLowerCase().includes(q) ||
        (it.brand || '').toLowerCase().includes(q) ||
        colorInfo(it.color).name.toLowerCase().includes(q) ||
        catName(it.category).toLowerCase().includes(q)
      );
    }
    if (filters.category.length) items = items.filter(it => filters.category.includes(it.category));
    if (filters.color.length) items = items.filter(it => filters.color.includes(it.color));
    if (filters.season.length) items = items.filter(it => filters.season.includes(it.season));
    if (filters.priceMin != null) items = items.filter(it => (it.price || 0) >= filters.priceMin);
    if (filters.priceMax != null) items = items.filter(it => (it.price || 0) <= filters.priceMax);

    return items;
  },

  render() {
    const grid = document.getElementById('wardrobeGrid');
    const empty = document.getElementById('wardrobeEmpty');
    const items = this.getFilteredItems();

    if (!items.length) {
      grid.innerHTML = '';
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    grid.innerHTML = items.map((it, i) => this.cardTemplate(it, i)).join('');

    grid.querySelectorAll('.item-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.fav-toggle')) return;
        this.openDetail(card.dataset.id);
      });
    });
    grid.querySelectorAll('.fav-toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleFavorite(btn.dataset.id);
      });
    });
  },

  cardTemplate(it, index) {
    const color = colorInfo(it.color);
    const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
    return `
      <article class="item-card" data-id="${it.id}" style="animation-delay:${index * 0.03}s">
        <div class="item-card-img" style="${it.photo ? '' : `background:${gradient}`}">
          ${it.photo
            ? `<img src="${it.photo}" alt="${it.name}">`
            : `<div class="no-img"><svg viewBox="0 0 24 24"><use href="#ic-shirt"/></svg></div>`}
          <button class="fav-toggle ${it.isFavorite ? 'is-fav' : ''}" data-id="${it.id}">
            <svg viewBox="0 0 24 24"><use href="#ic-heart"/></svg>
          </button>
        </div>
        <div class="item-card-body">
          <p class="item-card-name">${it.name}</p>
          <p class="item-card-cat">${catName(it.category)} · ${it.brand || "Brendsiz"}</p>
          <div class="item-card-foot">
            <span class="item-card-price">${it.price ? Number(it.price).toLocaleString('uz-UZ') + " so'm" : 'Narxsiz'}</span>
            <span class="item-card-dot" style="background:${color.hex}"></span>
          </div>
        </div>
      </article>`;
  },

  renderCategoryScroll() {
    const scroll = document.getElementById('categoryScroll');
    const chips = [{ id: 'all', name: 'Barchasi' }, ...CATEGORIES];
    scroll.innerHTML = chips.map(c =>
      `<button class="cat-chip ${c.id === this.state.activeCategory ? 'active' : ''}" data-cat="${c.id}">${c.name}</button>`
    ).join('');
    scroll.querySelectorAll('.cat-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        this.state.activeCategory = btn.dataset.cat;
        scroll.querySelectorAll('.cat-chip').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.render();
      });
    });
  },

  /* ---------------------------------------------------------------------
     QIDIRUV
  --------------------------------------------------------------------- */
  bindSearch() {
    const toggleBtn = document.getElementById('searchToggleBtn');
    const bar = document.getElementById('searchBar');
    const input = document.getElementById('searchInput');
    const clearBtn = document.getElementById('searchClear');

    toggleBtn.addEventListener('click', () => {
      bar.classList.toggle('show');
      if (bar.classList.contains('show')) input.focus();
    });
    input.addEventListener('input', () => {
      this.state.search = input.value;
      clearBtn.hidden = !input.value;
      this.render();
    });
    clearBtn.addEventListener('click', () => {
      input.value = '';
      this.state.search = '';
      clearBtn.hidden = true;
      this.render();
    });
  },

  /* ---------------------------------------------------------------------
     FILTR MODALI
  --------------------------------------------------------------------- */
  bindFilterModal() {
    document.getElementById('filterToggleBtn').addEventListener('click', () => {
      this.renderFilterOptions();
      UI.openModal('filterModal');
    });
    document.querySelector('#filterModal .modal-handle')?.addEventListener('click', () => UI.closeModal('filterModal'));
    document.getElementById('filterModal').addEventListener('click', (e) => {
      if (e.target.id === 'filterModal') UI.closeModal('filterModal');
    });
    document.getElementById('filterReset').addEventListener('click', () => {
      this.state.filters = { category: [], color: [], season: [], priceMin: null, priceMax: null };
      document.getElementById('filterPriceMin').value = '';
      document.getElementById('filterPriceMax').value = '';
      this.renderFilterOptions();
    });
    document.getElementById('filterApply').addEventListener('click', () => {
      this.state.filters.priceMin = document.getElementById('filterPriceMin').value ? Number(document.getElementById('filterPriceMin').value) : null;
      this.state.filters.priceMax = document.getElementById('filterPriceMax').value ? Number(document.getElementById('filterPriceMax').value) : null;
      UI.closeModal('filterModal');
      this.updateFilterBadge();
      this.render();
    });
  },

  renderFilterOptions() {
    const buildChips = (container, options, key) => {
      container.innerHTML = options.map(o => {
        const active = this.state.filters[key].includes(o.id);
        return `<button type="button" class="chip-opt ${active ? 'active' : ''}" data-key="${key}" data-val="${o.id}">${o.name}</button>`;
      }).join('');
    };
    buildChips(document.getElementById('filterCategory'), CATEGORIES, 'category');
    buildChips(document.getElementById('filterColor'), COLORS, 'color');
    buildChips(document.getElementById('filterSeason'), SEASONS, 'season');

    document.querySelectorAll('.chip-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        const { key, val } = btn.dataset;
        const arr = this.state.filters[key];
        const idx = arr.indexOf(val);
        idx === -1 ? arr.push(val) : arr.splice(idx, 1);
        btn.classList.toggle('active');
      });
    });
  },

  updateFilterBadge() {
    const { category, color, season, priceMin, priceMax } = this.state.filters;
    const count = category.length + color.length + season.length + (priceMin ? 1 : 0) + (priceMax ? 1 : 0);
    document.getElementById('filterBadge').hidden = count === 0;
  },

  /* ---------------------------------------------------------------------
     SEVIMLILAR
  --------------------------------------------------------------------- */
  toggleFavorite(id) {
    const item = ItemsRepo.toggleFavorite(id);
    if (item?.isFavorite) UI.toast("Sevimlilarga qo'shildi", 'success');
    this.render();
    this.renderFavorites();
    if (this.state.detailId === id) this.refreshDetailFavIcon(item);
  },

  renderFavorites() {
    const grid = document.getElementById('favoritesGrid');
    const empty = document.getElementById('favoritesEmpty');
    const items = ItemsRepo.all().filter(it => it.isFavorite);
    if (!items.length) {
      grid.innerHTML = '';
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    grid.innerHTML = items.map((it, i) => this.cardTemplate(it, i)).join('');
    grid.querySelectorAll('.item-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.fav-toggle')) return;
        this.openDetail(card.dataset.id);
      });
    });
    grid.querySelectorAll('.fav-toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleFavorite(btn.dataset.id);
      });
    });
  },

  /* ---------------------------------------------------------------------
     TAFSILOTLAR MODALI
  --------------------------------------------------------------------- */
  bindDetailModal() {
    document.getElementById('detailClose').addEventListener('click', () => UI.closeModal('detailModal'));
    document.getElementById('detailModal').addEventListener('click', (e) => {
      if (e.target.id === 'detailModal') UI.closeModal('detailModal');
    });
    document.getElementById('detailFavBtn').addEventListener('click', () => {
      this.toggleFavorite(this.state.detailId);
    });
    document.getElementById('detailEditBtn').addEventListener('click', () => {
      UI.closeModal('detailModal');
      this.startEdit(this.state.detailId);
    });
    document.getElementById('detailDeleteBtn').addEventListener('click', () => {
      const item = ItemsRepo.findById(this.state.detailId);
      UI.confirm({
        title: "Kiyimni o'chirish",
        text: `"${item.name}" butunlay o'chiriladi. Davom etasizmi?`,
        onConfirm: () => {
          ItemsRepo.remove(item.id);
          ActivityRepo.add(`"${item.name}" o'chirildi`, 'ic-trash');
          UI.closeModal('detailModal');
          UI.toast("Kiyim o'chirildi", 'success');
          this.render();
          this.renderFavorites();
          App.renderHome();
        }
      });
    });
  },

  openDetail(id) {
    const it = ItemsRepo.findById(id);
    if (!it) return;
    this.state.detailId = id;
    document.getElementById('detailName').textContent = it.name;
    document.getElementById('detailCategory').textContent = `${catName(it.category)} · ${it.brand || 'Brendsiz'}`;
    document.getElementById('detailNote').textContent = it.note || "Izoh qo'shilmagan.";

    const photoWrap = document.getElementById('detailPhoto');
    photoWrap.innerHTML = it.photo
      ? `<img src="${it.photo}" alt="${it.name}">`
      : `<svg viewBox="0 0 24 24"><use href="#ic-shirt"/></svg>`;

    const color = colorInfo(it.color);
    document.getElementById('detailTags').innerHTML = `
      <span class="detail-tag"><span class="color-swatch" style="background:${color.hex}"></span>${color.name}</span>
      <span class="detail-tag">${seasonName(it.season)}</span>
      <span class="detail-tag">${it.condition}</span>
      ${it.material ? `<span class="detail-tag">${it.material}</span>` : ''}
      ${it.price ? `<span class="detail-tag">${Number(it.price).toLocaleString('uz-UZ')} so'm</span>` : ''}
    `;
    this.refreshDetailFavIcon(it);
    UI.openModal('detailModal');
  },

  refreshDetailFavIcon(item) {
    document.getElementById('detailFavBtn').classList.toggle('is-fav', !!item.isFavorite);
  },

  /* ---------------------------------------------------------------------
     FORMA: KIYIM QO'SHISH / TAHRIRLASH
  --------------------------------------------------------------------- */
  fillFormSelects() {
    UI.fillSelect(document.getElementById('itemCategory'), CATEGORIES);
    UI.fillSelect(document.getElementById('itemColor'), COLORS);
    UI.fillSelect(document.getElementById('itemSeason'), SEASONS);
    // filter va forma uchun ham kerak bo'lgani uchun global qilib qo'yamiz
  },

  resetForm() {
    this.state.editingId = null;
    this.state.selectedCondition = 'Yangi';
    this.state.photoData = null;
    document.getElementById('itemForm').reset();
    document.getElementById('itemId').value = '';
    document.getElementById('photoPreview').hidden = true;
    document.getElementById('photoPlaceholder').style.display = 'flex';
    document.querySelectorAll('#itemConditionSeg .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.value === 'Yangi'));
    document.getElementById('addFormTitle').textContent = "Kiyim qo'shish";
    document.getElementById('itemSaveBtn').textContent = 'Saqlash';
  },

  startEdit(id) {
    const it = ItemsRepo.findById(id);
    if (!it) return;
    this.state.editingId = id;
    this.state.selectedCondition = it.condition;
    this.state.photoData = it.photo || null;

    document.getElementById('itemId').value = id;
    document.getElementById('itemName').value = it.name;
    document.getElementById('itemCategory').value = it.category;
    document.getElementById('itemColor').value = it.color;
    document.getElementById('itemBrand').value = it.brand || '';
    document.getElementById('itemPrice').value = it.price || '';
    document.getElementById('itemSeason').value = it.season;
    document.getElementById('itemMaterial').value = it.material || '';
    document.getElementById('itemNote').value = it.note || '';

    document.querySelectorAll('#itemConditionSeg .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.value === it.condition));

    if (it.photo) {
      document.getElementById('photoPreview').src = it.photo;
      document.getElementById('photoPreview').hidden = false;
      document.getElementById('photoPlaceholder').style.display = 'none';
    }
    document.getElementById('addFormTitle').textContent = 'Kiyimni tahrirlash';
    document.getElementById('itemSaveBtn').textContent = 'O\'zgarishlarni saqlash';
    UI.navigateTo('add');
  },

  bindForm() {
    // Rasm yuklash
    const photoUpload = document.getElementById('photoUpload');
    const photoInput = document.getElementById('photoInput');
    photoUpload.addEventListener('click', () => photoInput.click());
    photoInput.addEventListener('change', () => {
      const file = photoInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        this.state.photoData = reader.result;
        document.getElementById('photoPreview').src = reader.result;
        document.getElementById('photoPreview').hidden = false;
        document.getElementById('photoPlaceholder').style.display = 'none';
      };
      reader.readAsDataURL(file);
    });

    // Holat segmenti
    document.querySelectorAll('#itemConditionSeg .seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#itemConditionSeg .seg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.state.selectedCondition = btn.dataset.value;
      });
    });

    // Forma yuborilishi
    document.getElementById('itemForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveForm();
    });
  },

  saveForm() {
    const name = document.getElementById('itemName').value.trim();
    const category = document.getElementById('itemCategory').value;
    const color = document.getElementById('itemColor').value;
    const brand = document.getElementById('itemBrand').value.trim();
    const price = document.getElementById('itemPrice').value ? Number(document.getElementById('itemPrice').value) : null;
    const season = document.getElementById('itemSeason').value;
    const material = document.getElementById('itemMaterial').value.trim();
    const note = document.getElementById('itemNote').value.trim();

    if (!name) {
      UI.toast('Iltimos, kiyim nomini kiriting', 'error');
      return;
    }

    const payload = {
      name, category, color, brand, price, season, material, note,
      condition: this.state.selectedCondition,
      photo: this.state.photoData
    };

    if (this.state.editingId) {
      ItemsRepo.update(this.state.editingId, payload);
      ActivityRepo.add(`"${name}" tahrirlandi`, 'ic-edit');
      UI.showSuccess('Yangilandi!');
      UI.toast("O'zgarishlar saqlandi", 'success');
    } else {
      ItemsRepo.create(payload);
      ActivityRepo.add(`"${name}" garderobga qo'shildi`, 'ic-plus');
      UI.showSuccess('Saqlandi!');
      UI.toast("Kiyim qo'shildi", 'success');
    }

    this.resetForm();
    UI.navigateTo('wardrobe');
    App.renderHome();
  }
};