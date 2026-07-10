/**
 * data.js
 * -----------------------------------------------------------------------
 * Statik ma'lumotlar: kategoriyalar, ranglar, fasllar, vaziyatlar
 * hamda birinchi marta ochilganda garderobga qo'shiladigan namuna kiyimlar.
 * -----------------------------------------------------------------------
 */
const CATEGORIES = [
  { id: 'futbolka', name: 'Futbolka', icon: 'ic-shirt' },
  { id: 'koylak', name: "Ko'ylak", icon: 'ic-shirt' },
  { id: 'shim', name: 'Shim', icon: 'ic-shirt' },
  { id: 'jinsi', name: 'Jinsi shim', icon: 'ic-shirt' },
  { id: 'shortik', name: 'Shortik', icon: 'ic-shirt' },
  { id: 'kurtka', name: 'Kurtka', icon: 'ic-shirt' },
  { id: 'kostyum', name: 'Kostyum', icon: 'ic-shirt' },
  { id: 'oyoq-kiyim', name: 'Oyoq kiyim', icon: 'ic-shirt' },
  { id: 'krossovka', name: 'Krossovka', icon: 'ic-shirt' },
  { id: 'kepka', name: 'Kepka', icon: 'ic-shirt' },
  { id: 'soat', name: 'Soat', icon: 'ic-shirt' },
  { id: 'sumka', name: 'Sumka', icon: 'ic-shirt' },
  { id: 'aksessuar', name: 'Aksessuar', icon: 'ic-shirt' }
];

const COLORS = [
  { id: 'oq', name: 'Oq', hex: '#FFFFFF' },
  { id: 'qora', name: 'Qora', hex: '#0F172A' },
  { id: 'kulrang', name: 'Kulrang', hex: '#94A3B8' },
  { id: 'kok', name: "Ko'k", hex: '#2563EB' },
  { id: 'moviy', name: 'Moviy', hex: '#38BDF8' },
  { id: 'yashil', name: 'Yashil', hex: '#22C55E' },
  { id: 'sariq', name: 'Sariq', hex: '#F59E0B' },
  { id: 'qizil', name: 'Qizil', hex: '#EF4444' },
  { id: 'pushti', name: 'Pushti', hex: '#EC4899' },
  { id: 'jigarrang', name: 'Jigarrang', hex: '#92400E' },
  { id: 'binafsha', name: 'Binafsha', hex: '#8B5CF6' },
  { id: 'bej', name: 'Bej', hex: '#E7D9C4' }
];

const SEASONS = [
  { id: 'yoz', name: 'Yoz' },
  { id: 'qish', name: 'Qish' },
  { id: 'bahor-kuz', name: 'Bahor / Kuz' },
  { id: 'barcha-fasl', name: 'Barcha fasllar' }
];

const OCCASIONS = [
  { id: 'issiq', name: 'Issiq havo', emoji: '☀️', seasonPref: ['yoz', 'barcha-fasl'] },
  { id: 'sovuq', name: 'Sovuq havo', emoji: '❄️', seasonPref: ['qish', 'barcha-fasl'] },
  { id: 'ish', name: 'Ish', emoji: '💼', categoryPref: ['koylak', 'shim', 'kostyum', 'oyoq-kiyim'] },
  { id: 'universitet', name: 'Universitet', emoji: '🎓', categoryPref: ['futbolka', 'jinsi', 'krossovka'] },
  { id: 'sport', name: 'Sport', emoji: '⚽', categoryPref: ['shortik', 'futbolka', 'krossovka'] },
  { id: 'sayr', name: 'Sayr', emoji: '🚶', categoryPref: ['jinsi', 'futbolka', 'krossovka', 'kepka'] },
  { id: 'toy', name: "To'y", emoji: '🎉', categoryPref: ['kostyum', 'koylak', 'oyoq-kiyim', 'soat'] },
  { id: 'mehmon', name: 'Mehmon', emoji: '🍽️', categoryPref: ['koylak', 'shim', 'oyoq-kiyim'] },
  { id: 'sayohat', name: 'Sayohat', emoji: '✈️', categoryPref: ['futbolka', 'jinsi', 'kurtka', 'krossovka'] }
];

const CONDITIONS = ['Yangi', 'Yaxshi', 'Eskirgan'];

/** Rasm mavjud bo'lmagan kiyimlar uchun placeholder emoji/gradient random tanlanadi */
const CARD_GRADIENTS = [
  'linear-gradient(160deg,#dbeafe,#bfdbfe)',
  'linear-gradient(160deg,#fef3c7,#fde68a)',
  'linear-gradient(160deg,#dcfce7,#bbf7d0)',
  'linear-gradient(160deg,#fce7f3,#fbcfe8)',
  'linear-gradient(160deg,#ede9fe,#ddd6fe)'
];

/** Demo garderob — birinchi ochilishda foydalanuvchiga bo'sh ekran ko'rsatmaslik uchun */
function getSeedItems() {
  return [
    { name: 'Oq asosiy futbolka', category: 'futbolka', color: 'oq', brand: 'Zara', price: 120000, season: 'barcha-fasl', material: 'Paxta', condition: 'Yaxshi', note: 'Har kungi kiyim uchun qulay.' },
    { name: 'Ko\'k klassik jinsi shim', category: 'jinsi', color: 'kok', brand: 'Levi\'s', price: 320000, season: 'barcha-fasl', material: 'Denim', condition: 'Yangi', note: '' },
    { name: 'Qora charm krossovka', category: 'krossovka', color: 'qora', brand: 'Nike', price: 480000, season: 'barcha-fasl', material: 'Charm', condition: 'Yaxshi', note: '' },
    { name: 'Kulrang trikotaj kastyum', category: 'kostyum', color: 'kulrang', brand: 'Massimo Dutti', price: 950000, season: 'bahor-kuz', material: 'Sherst', condition: 'Yangi', note: 'Rasmiy uchrashuvlar uchun.' },
    { name: 'Yashil parka kurtka', category: 'kurtka', color: 'yashil', brand: 'Uniqlo', price: 560000, season: 'qish', material: 'Poliester', condition: 'Yaxshi', note: '' },
    { name: 'Oq ko\'ylak', category: 'koylak', color: 'oq', brand: 'H&M', price: 210000, season: 'barcha-fasl', material: 'Ipak aralash', condition: 'Yangi', note: '' },
    { name: 'Bej shortik', category: 'shortik', color: 'bej', brand: 'Bershka', price: 150000, season: 'yoz', material: 'Paxta', condition: 'Yaxshi', note: '' },
    { name: 'Qora spor krossovka', category: 'krossovka', color: 'qora', brand: 'Adidas', price: 410000, season: 'barcha-fasl', material: 'Mesh', condition: 'Yaxshi', note: '' },
    { name: 'Sariq kepka', category: 'kepka', color: 'sariq', brand: 'New Era', price: 90000, season: 'yoz', material: 'Paxta', condition: 'Yangi', note: '' },
    { name: 'Qora klassik soat', category: 'soat', color: 'qora', brand: 'Casio', price: 380000, season: 'barcha-fasl', material: 'Metall', condition: 'Yaxshi', note: '' }
  ];
}

/**
 * Yutuqlar (badges) ro'yxati.
 * `check(ctx)` — ctx obyekti { itemsCount, favCount, aiUsage, outfitsCount, wearLogCount, streak }
 * asosida true/false qaytaradi. `progress(ctx)` esa 0-1 oralig'ida taraqqiyot foizini beradi.
 */
const BADGES = [
  {
    id: 'first-item', name: 'Birinchi qadam', icon: 'ic-plus',
    desc: 'Garderobga birinchi kiyimni qo\'shdingiz',
    check: ctx => ctx.itemsCount >= 1, progress: ctx => Math.min(1, ctx.itemsCount / 1)
  },
  {
    id: 'wardrobe-master', name: 'Garderob ustasi', icon: 'ic-shirt',
    desc: '10 tadan ortiq kiyim qo\'shdingiz',
    check: ctx => ctx.itemsCount >= 10, progress: ctx => Math.min(1, ctx.itemsCount / 10)
  },
  {
    id: 'favorite-fan', name: 'Sevimlilar to\'plami', icon: 'ic-heart',
    desc: '5 ta kiyimni sevimliga qo\'shdingiz',
    check: ctx => ctx.favCount >= 5, progress: ctx => Math.min(1, ctx.favCount / 5)
  },
  {
    id: 'ai-friend', name: 'AI bilan do\'st', icon: 'ic-ai',
    desc: 'AI tavsiyadan 5 marta foydalandingiz',
    check: ctx => ctx.aiUsage >= 5, progress: ctx => Math.min(1, ctx.aiUsage / 5)
  },
  {
    id: 'outfit-collector', name: 'Outfit kolleksioneri', icon: 'ic-star',
    desc: '3 ta kombinatsiyani saqladingiz',
    check: ctx => ctx.outfitsCount >= 3, progress: ctx => Math.min(1, ctx.outfitsCount / 3)
  },
  {
    id: 'calendar-keeper', name: 'Kalendar ustasi', icon: 'ic-calendar',
    desc: '7 kunlik kiyinish tarixini yozdingiz',
    check: ctx => ctx.wearLogCount >= 7, progress: ctx => Math.min(1, ctx.wearLogCount / 7)
  },
  {
    id: 'streak-week', name: 'Doimiy foydalanuvchi', icon: 'ic-award',
    desc: '3 kun ketma-ket ilovaga kirdingiz',
    check: ctx => ctx.streak >= 3, progress: ctx => Math.min(1, ctx.streak / 3)
  }
];

/** Kategoriya/rang/fasl id -> nomi tez topish uchun lookup funksiyalari */
function catName(id) { return CATEGORIES.find(c => c.id === id)?.name || id; }
function colorInfo(id) { return COLORS.find(c => c.id === id) || { name: id, hex: '#ccc' }; }
function seasonName(id) { return SEASONS.find(s => s.id === id)?.name || id; }