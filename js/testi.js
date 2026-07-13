/**
 * testimonials.js
 * -----------------------------------------------------------------------
 * Bosh sahifadagi "Foydalanuvchi fikri" kartasi.
 *
 * Bu yerdagi matnlar avtomatik/AI tomonidan "kuniga generatsiya qilingan"
 * emas — oldindan qo'lda tayyorlangan, tabiiy ohangdagi fikr-mulohaza va
 * kiyim bo'yicha maslahat/qiziqarli faktlar ro'yxati. Har kuni sana asosida
 * ro'yxatdan bittasi tanlanadi, shunda bir kun ichida o'zgarmaydi, lekin
 * kunlar davomida navbat bilan almashib turadi.
 * -----------------------------------------------------------------------
 */
const TESTIMONIALS = [
  {
    name: "Dilnoza",
    initials: "DI",
    verified: true,
    text: "AI tavsiya bo'limi meni juda hayratda qoldirdi — ertalab nima kiyishni o'ylab bosh qotirish kamaydi. Ayniqsa rang moslashtirishi to'g'ri chiqadi.",
  },
  {
    name: "Sardor",
    initials: "SA",
    verified: true,
    text: "Bilasizmi, qora rang boshqa deyarli barcha ranglar bilan mos tushadi — shuning uchun garderobingizda bitta sifatli qora shim bo'lishi shart.",
  },
  {
    name: "Madina",
    initials: "MA",
    verified: true,
    text: "Kiyim kalendari funksiyasi ajoyib g'oya ekan — endi bir haftada bir xil kiyimni ikki marta kiymayman, o'zim ham bilmay qolibman qancha kiyim borligini.",
  },
  {
    name: "Jasur",
    initials: "JA",
    verified: true,
    text: "Qiziqarli fakt: kiyimni tez-tez yuvish uning umrini qisqartiradi. Agar hid yo'q, dog' yo'q bo'lsa — har safar yuvish shart emas.",
  },
  {
    name: "Zarina",
    initials: "ZA",
    verified: true,
    text: "Wishlist bo'limiga rahmat — endi do'konga borganimda kerakli narsalarni unutmayman. Oldin doim eslay olmasdim nima kerakligini.",
  },
  {
    name: "Otabek",
    initials: "OT",
    verified: true,
    text: "Maslahat: agar rangni bilmasangiz, neytral ranglar (oq, qora, kulrang, bej) bilan boshlang — ular deyarli hamma narsaga mos keladi.",
  },
  {
    name: "Nilufar",
    initials: "NI",
    verified: true,
    text: "Yutuqlar (badge) tizimi meni kulib yubordi — 'Garderob ustasi' nishonini olganimda chindan ham xursand bo'ldim, kichkina lekin motivatsiya beradi.",
  },
  {
    name: "Bekzod",
    initials: "BE",
    verified: true,
    text: "Qiziqarli fakt: denim (jinsi mato) qanchalik ko'p kiyilsa, shunchalik yumshoq va qulay bo'lib boradi — shuning uchun uni kamdan-kam yuvish tavsiya etiladi.",
  },
  {
    name: "Kamola",
    initials: "KA",
    verified: true,
    text: "Sayohat ro'yxati bo'limi hayotimni osonlashtirdi. Endi chamadon yig'ishda 'yana nima olib ketaman' deb o'ylab o'tirmayman.",
  },
  {
    name: "Farrux",
    initials: "FA",
    verified: true,
    text: "Maslahat: oyoq kiyimni har doim oxirida tanlang — u butun kiyimning ohangini belgilaydi, ayniqsa rasmiy uchrashuvlarda.",
  },
];

const TestimonialUI = {
  render() {
    const card = document.getElementById("testimonialCard");
    if (!card) return;

    const item = this.pickForToday();
    card.innerHTML = `
      <svg class="testimonial-quote-icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7.17 6C4.86 6 3 7.86 3 10.17c0 2.3 1.86 4.16 4.17 4.16.4 0 .78-.06 1.14-.17-.53 1.6-1.87 2.9-3.6 3.46l.6 1.38c3.02-.98 5.1-3.7 5.1-7.16C10.41 8.5 9.05 6 7.17 6zm10 0c-2.31 0-4.17 1.86-4.17 4.17 0 2.3 1.86 4.16 4.17 4.16.4 0 .78-.06 1.14-.17-.53 1.6-1.87 2.9-3.6 3.46l.6 1.38c3.02-.98 5.1-3.7 5.1-7.16C20.41 8.5 19.05 6 17.17 6z"/>
      </svg>
      <p class="testimonial-text">${item.text}</p>
      <div class="testimonial-footer">
        <div class="testimonial-avatar">${item.initials}</div>
        <div class="testimonial-meta">
          <p class="testimonial-name">
            ${item.name}
            ${item.verified ? '<span class="testimonial-badge">✓ Foydalanuvchi</span>' : ""}
          </p>
          <div class="testimonial-stars">
            ${'<svg viewBox="0 0 24 24"><use href="#ic-star"/></svg>'.repeat(5)}
          </div>
        </div>
      </div>
    `;
  },

  /** Sana asosida (yil-kun) ro'yxatdan bitta fikrni barqaror tanlaydi —
   *  shu kun davomida o'zgarmaydi, lekin kunlar o'tishi bilan navbat
   *  bilan almashib turadi. */
  pickForToday() {
    const now = new Date();
    const dayOfYear = Math.floor(
      (now - new Date(now.getFullYear(), 0, 0)) / 86400000,
    );
    const index = dayOfYear % TESTIMONIALS.length;
    return TESTIMONIALS[index];
  },
};
