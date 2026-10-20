/*
 * Data program Sixpack 60 Hari.
 * Angka kalori (kkal), protein (gram) dan harga (Rp) adalah perkiraan per porsi warteg.
 * Harga beda tiap daerah — ubah di sini kalau perlu.
 */

// grade: 'pilih' = andalan, 'sesekali' = boleh tapi jangan tiap hari, 'hindari' = skip selama program
const FOODS = {
  // Karbo
  nasi_full:   { name: 'Nasi putih 1 porsi',            kcal: 260, p: 5,  price: 4000,  cat: 'Karbo',  grade: 'pilih' },
  nasi_half:   { name: 'Nasi putih ½ porsi',            kcal: 130, p: 3,  price: 2500,  cat: 'Karbo',  grade: 'pilih' },
  ubi_rebus:   { name: 'Ubi / singkong rebus',          kcal: 130, p: 1,  price: 2500,  cat: 'Karbo',  grade: 'pilih' },
  pisang:      { name: 'Pisang 1 buah',                 kcal: 100, p: 1,  price: 2000,  cat: 'Buah',   grade: 'pilih' },

  // Lauk hewani
  telur_rebus: { name: 'Telur rebus',                   kcal: 75,  p: 6,  price: 2000,  cat: 'Lauk hewani', grade: 'pilih', tip: 'Rebus 10 butir sekaligus untuk 2–3 hari.' },
  telur_balado:{ name: 'Telur balado',                  kcal: 110, p: 6,  price: 4000,  cat: 'Lauk hewani', grade: 'pilih' },
  ayam_bakar:  { name: 'Ayam bakar dada (buang kulit)', kcal: 200, p: 30, price: 12000, cat: 'Lauk hewani', grade: 'pilih' },
  tongkol:     { name: 'Ikan tongkol balado',           kcal: 160, p: 20, price: 7000,  cat: 'Lauk hewani', grade: 'pilih' },
  kembung:     { name: 'Ikan kembung bakar / goreng',   kcal: 170, p: 21, price: 9000,  cat: 'Lauk hewani', grade: 'pilih' },
  ati_ampela:  { name: 'Ati ampela bumbu',              kcal: 140, p: 17, price: 5000,  cat: 'Lauk hewani', grade: 'pilih' },
  ayam_goreng: { name: 'Ayam goreng tanpa tepung (buang kulit)', kcal: 230, p: 24, price: 11000, cat: 'Lauk hewani', grade: 'sesekali' },
  lele:        { name: 'Lele goreng',                   kcal: 230, p: 18, price: 8000,  cat: 'Lauk hewani', grade: 'sesekali' },
  telur_dadar: { name: 'Telur dadar',                   kcal: 150, p: 7,  price: 4000,  cat: 'Lauk hewani', grade: 'sesekali' },

  // Lauk nabati
  tempe_goreng:{ name: 'Tempe goreng tanpa tepung (2 ptg)', kcal: 160, p: 10, price: 3000, cat: 'Lauk nabati', grade: 'pilih' },
  tahu_bacem:  { name: 'Tahu bacem 1 ptg',              kcal: 90,  p: 6,  price: 2000,  cat: 'Lauk nabati', grade: 'pilih' },
  pepes_tahu:  { name: 'Pepes tahu',                    kcal: 90,  p: 7,  price: 3500,  cat: 'Lauk nabati', grade: 'pilih' },
  tempe_orek:  { name: 'Tempe orek (manis, berminyak)', kcal: 150, p: 8,  price: 3000,  cat: 'Lauk nabati', grade: 'sesekali' },

  // Sayur
  bayam:       { name: 'Sayur bayam bening',            kcal: 30,  p: 2,  price: 2500,  cat: 'Sayur',  grade: 'pilih' },
  sayur_asem:  { name: 'Sayur asem',                    kcal: 60,  p: 2,  price: 2500,  cat: 'Sayur',  grade: 'pilih' },
  sop:         { name: 'Sayur sop',                     kcal: 50,  p: 2,  price: 2500,  cat: 'Sayur',  grade: 'pilih' },
  kangkung:    { name: 'Tumis kangkung',                kcal: 80,  p: 3,  price: 2500,  cat: 'Sayur',  grade: 'pilih' },
  labu_siam:   { name: 'Sayur labu siam',               kcal: 60,  p: 2,  price: 2500,  cat: 'Sayur',  grade: 'pilih' },
  toge:        { name: 'Tumis toge / buncis',           kcal: 70,  p: 3,  price: 2500,  cat: 'Sayur',  grade: 'pilih' },
  capcay:      { name: 'Capcay',                        kcal: 90,  p: 4,  price: 4000,  cat: 'Sayur',  grade: 'pilih' },
  lalapan:     { name: 'Lalapan + sambal',              kcal: 20,  p: 1,  price: 1000,  cat: 'Sayur',  grade: 'pilih' },
  terong:      { name: 'Terong balado (minyak banyak)', kcal: 150, p: 2,  price: 3000,  cat: 'Sayur',  grade: 'sesekali' },
  lodeh:       { name: 'Sayur lodeh (santan)',          kcal: 120, p: 3,  price: 2500,  cat: 'Sayur',  grade: 'sesekali' },

  // Hindari
  gorengan:    { name: 'Gorengan tepung (bakwan, mendoan)', kcal: 140, p: 3, price: 1500, cat: 'Lain-lain', grade: 'hindari' },
  kerupuk:     { name: 'Kerupuk',                       kcal: 60,  p: 1,  price: 1000,  cat: 'Lain-lain', grade: 'hindari' },
  es_teh:      { name: 'Es teh manis',                  kcal: 120, p: 0,  price: 4000,  cat: 'Minuman',   grade: 'hindari', tip: 'Ganti es teh tawar / air putih.' },
  mie_goreng:  { name: 'Mie / bihun goreng',            kcal: 250, p: 5,  price: 4000,  cat: 'Karbo',     grade: 'hindari' },
  ayam_tepung: { name: 'Ayam goreng tepung / kremes',   kcal: 330, p: 22, price: 13000, cat: 'Lauk hewani', grade: 'hindari' },
  perkedel:    { name: 'Perkedel kentang',              kcal: 120, p: 2,  price: 2500,  cat: 'Lain-lain', grade: 'hindari' },
  kuah_santan: { name: 'Siraman kuah santan / rendang', kcal: 150, p: 1,  price: 0,     cat: 'Lain-lain', grade: 'hindari' },
};

const MEAL_SLOTS = [
  { id: 'pagi',  label: 'Sarapan',        time: '06.30–08.00' },
  { id: 'siang', label: 'Makan siang',    time: '12.00–13.00' },
  { id: 'snack', label: 'Camilan / pasca-latihan', time: '15.00–17.00' },
  { id: 'malam', label: 'Makan malam',    time: 'sebelum 19.30' },
];

// 7 menu bergilir. Tiap baris: [id makanan, jumlah porsi].
const MENUS = [
  { name: 'Ayam Bakar', meals: {
    pagi:  [['telur_rebus', 2], ['pisang', 1]],
    siang: [['nasi_full', 1], ['ayam_bakar', 1], ['tempe_goreng', 1], ['sayur_asem', 1]],
    snack: [['telur_rebus', 1], ['tahu_bacem', 1]],
    malam: [['nasi_half', 1], ['tongkol', 1], ['tempe_goreng', 1], ['bayam', 1]],
  }},
  { name: 'Telur & Tempe', meals: {
    pagi:  [['nasi_half', 1], ['telur_rebus', 2], ['sop', 1]],
    siang: [['nasi_full', 1], ['telur_balado', 1], ['tempe_goreng', 1], ['tahu_bacem', 1], ['kangkung', 1]],
    snack: [['tempe_goreng', 1], ['pisang', 1]],
    malam: [['nasi_half', 1], ['ati_ampela', 1], ['tahu_bacem', 1], ['labu_siam', 1]],
  }},
  { name: 'Ikan Kembung', meals: {
    pagi:  [['telur_rebus', 2], ['ubi_rebus', 1]],
    siang: [['nasi_full', 1], ['kembung', 1], ['tempe_goreng', 1], ['sayur_asem', 1]],
    snack: [['telur_rebus', 2], ['pisang', 1]],
    malam: [['nasi_half', 1], ['tongkol', 1], ['pepes_tahu', 1], ['capcay', 1]],
  }},
  { name: 'Tongkol', meals: {
    pagi:  [['nasi_half', 1], ['telur_balado', 1], ['tempe_goreng', 1], ['bayam', 1]],
    siang: [['nasi_full', 1], ['tongkol', 1], ['tempe_goreng', 1], ['sop', 1]],
    snack: [['telur_rebus', 2]],
    malam: [['nasi_half', 1], ['ati_ampela', 1], ['tahu_bacem', 1], ['toge', 1]],
  }},
  { name: 'Ayam & Capcay', meals: {
    pagi:  [['telur_rebus', 2], ['pisang', 1]],
    siang: [['nasi_full', 1], ['ayam_bakar', 1], ['tahu_bacem', 1], ['capcay', 1]],
    snack: [['tempe_goreng', 1]],
    malam: [['nasi_half', 1], ['tongkol', 1], ['pepes_tahu', 1], ['kangkung', 1]],
  }},
  { name: 'Ati Ampela', meals: {
    pagi:  [['nasi_half', 1], ['telur_rebus', 2], ['labu_siam', 1]],
    siang: [['nasi_full', 1], ['ati_ampela', 1], ['tempe_goreng', 1], ['sayur_asem', 1]],
    snack: [['tempe_goreng', 1], ['pisang', 1]],
    malam: [['nasi_half', 1], ['tongkol', 1], ['tahu_bacem', 2], ['bayam', 1]],
  }},
  { name: 'Ikan & Lalapan', meals: {
    pagi:  [['telur_rebus', 2], ['ubi_rebus', 1]],
    siang: [['nasi_full', 1], ['kembung', 1], ['tempe_goreng', 1], ['lalapan', 1], ['sop', 1]],
    snack: [['telur_rebus', 2]],
    malam: [['nasi_half', 1], ['ayam_bakar', 1], ['toge', 1]],
  }},
];

const WARTEG_TIPS = [
  'Pesan “nasinya setengah aja, Bu” untuk makan malam.',
  'Pola aman: 1 lauk hewani + 1 lauk tempe/tahu + 1–2 sayur.',
  'Pilih lauk bakar, rebus, pepes, atau balado. Hindari yang berbalut tepung.',
  'Minta kuah santan dan siraman rendang tidak dituang ke nasi.',
  'Buang kulit ayam. Lemaknya paling banyak di situ.',
  'Minum air putih atau es teh tawar. Satu es teh manis ≈ 3 sendok gula.',
  'Tolak kerupuk dan gorengan di meja. Satu bakwan ≈ 140 kkal.',
  'Rebus telur sendiri sekali banyak. Protein termurah, ±Rp2.000 per butir.',
];

const PHASES = [
  { id: 1, name: 'Fondasi',     from: 1,  to: 21, steps: 7000,
    goal: 'Biasakan pola makan warteg yang bersih dan kuasai teknik gerakan. Beban ringan-sedang, sisakan 2–3 repetisi.' },
  { id: 2, name: 'Bakar Lemak', from: 22, to: 42, steps: 8500,
    goal: 'Volume naik ke 4 set, kardio HIIT mulai masuk. Jaga protein tetap tinggi supaya otot tidak ikut hilang.' },
  { id: 3, name: 'Definisi',    from: 43, to: 60, steps: 10000,
    goal: 'Beban lebih berat dengan repetisi lebih sedikit, sirkuit perut 4 putaran, 10.000 langkah tiap hari.' },
];

// rx = takaran per fase [fase 1, fase 2, fase 3]
const SESSIONS = {
  upperA: { code: 'UA', name: 'Upper A · Dorong', focus: 'Dada, bahu, trisep', abs: true, cardio: 'liss', exercises: [
    { n: 'Dumbbell bench press',        alt: 'Push-up',            rx: ['3 × 10–12', '4 × 8–10', '4 × 6–8'] },
    { n: 'Dumbbell shoulder press',     alt: 'Pike push-up',       rx: ['3 × 10–12', '4 × 8–10', '4 × 6–8'] },
    { n: 'Incline dumbbell press',      alt: 'Decline push-up',    rx: ['3 × 10–12', '3 × 10',    '4 × 8'] },
    { n: 'Lateral raise',               alt: 'Botol air',          rx: ['3 × 12–15', '3 × 12–15', '4 × 12–15'] },
    { n: 'Triceps pushdown (kabel)',    alt: 'Bench dip',          rx: ['3 × 12',    '3 × 12',    '3 × 10–12'] },
  ]},
  lowerA: { code: 'LA', name: 'Lower A · Squat', focus: 'Paha depan, glutes', abs: false, cardio: 'liss', exercises: [
    { n: 'Squat (barbell / goblet)',    alt: 'Bodyweight squat',   rx: ['3 × 10',    '4 × 8',     '4 × 6–8'] },
    { n: 'Romanian deadlift',           alt: 'Good morning',       rx: ['3 × 10',    '4 × 8–10',  '4 × 8'] },
    { n: 'Leg press',                   alt: 'Step-up',            rx: ['3 × 12',    '3 × 12',    '3 × 10'] },
    { n: 'Walking lunge',               alt: null,                 rx: ['2 × 10/kaki', '3 × 10/kaki', '3 × 12/kaki'] },
    { n: 'Standing calf raise',         alt: null,                 rx: ['3 × 15',    '3 × 15',    '4 × 15'] },
  ]},
  cardioCore: { code: 'KC', name: 'Kardio & Core', focus: 'Bakar lemak, perut', abs: true, cardio: 'hiit', exercises: [] },
  upperB: { code: 'UB', name: 'Upper B · Tarik', focus: 'Punggung, bisep', abs: true, cardio: 'liss', exercises: [
    { n: 'Lat pulldown',                alt: 'Assisted pull-up',   rx: ['3 × 10–12', '4 × 8–10', '4 × 6–8'] },
    { n: 'Seated cable row',            alt: 'Dumbbell row',       rx: ['3 × 10–12', '4 × 8–10', '4 × 8'] },
    { n: 'One-arm dumbbell row',        alt: null,                 rx: ['3 × 10/sisi', '3 × 10/sisi', '3 × 8/sisi'] },
    { n: 'Face pull',                   alt: 'Band pull-apart',    rx: ['3 × 15',    '3 × 15',    '3 × 15'] },
    { n: 'Dumbbell curl',               alt: 'Hammer curl',        rx: ['3 × 12',    '3 × 10–12', '3 × 10'] },
  ]},
  lowerB: { code: 'LB', name: 'Lower B · Hinge', focus: 'Hamstring, glutes, core', abs: false, cardio: 'liss', exercises: [
    { n: 'Hip thrust',                  alt: 'Glute bridge',       rx: ['3 × 10–12', '4 × 8–10', '4 × 8'] },
    { n: 'Bulgarian split squat',       alt: 'Reverse lunge',      rx: ['3 × 10/kaki', '3 × 10/kaki', '4 × 8/kaki'] },
    { n: 'Lying leg curl',              alt: 'Hamstring slider',   rx: ['3 × 12',    '3 × 12',    '3 × 10'] },
    { n: 'Leg extension',               alt: null,                 rx: ['3 × 12',    '3 × 12',    '3 × 12'] },
    { n: 'Plank',                       alt: null,                 rx: ['3 × 30 dtk', '3 × 45 dtk', '3 × 60 dtk'] },
  ]},
  fullBody: { code: 'FB', name: 'Full Body Sirkuit', focus: 'Kondisi, bakar kalori', abs: true, cardio: null, circuit: ['3 putaran', '4 putaran', '5 putaran'], exercises: [
    { n: 'Goblet squat',                alt: null,                 rx: ['12', '12', '15'] },
    { n: 'Push-up',                     alt: 'Push-up lutut',      rx: ['10', '12', '15'] },
    { n: 'Dumbbell row',                alt: null,                 rx: ['12/sisi', '12/sisi', '12/sisi'] },
    { n: 'Dumbbell swing',              alt: 'Kettlebell swing',   rx: ['15', '15', '20'] },
    { n: 'Mountain climber',            alt: null,                 rx: ['30 dtk', '40 dtk', '45 dtk'] },
  ]},
  rest: { code: '—', name: 'Istirahat Aktif', focus: 'Pemulihan', abs: false, cardio: 'walk', exercises: [] },
};

// Urutan sesi dalam seminggu, dimulai sehari setelah hari libur.
const WEEK_ORDER = ['upperA', 'lowerA', 'cardioCore', 'upperB', 'lowerB', 'fullBody', 'rest'];

const CARDIO = {
  liss: ['Jalan incline treadmill 15 menit (incline 8–10%, 5 km/jam)',
         'Jalan incline treadmill 20 menit (incline 10%, 5 km/jam)',
         'Jalan incline treadmill 25 menit (incline 10–12%, 5,5 km/jam)'],
  hiit: ['Kardio santai 30 menit: sepeda statis atau jalan cepat',
         'HIIT sepeda statis: 10 × (30 dtk cepat + 60 dtk santai), lalu jalan 10 menit',
         'HIIT sepeda/treadmill: 12 × (30 dtk cepat + 45 dtk santai), lalu jalan 10 menit'],
  walk: ['Jalan santai 30–45 menit + stretching 10 menit',
         'Jalan santai 30–45 menit + stretching 10 menit',
         'Jalan santai 45 menit + stretching 10 menit'],
};

const ABS = [
  { rounds: '3 putaran · istirahat 60 dtk', moves: ['Crunch 15', 'Lying leg raise 12', 'Dead bug 10/sisi', 'Plank 30 dtk'] },
  { rounds: '3 putaran · istirahat 45 dtk', moves: ['Cable crunch 15', 'Hanging knee raise 12', 'Russian twist 20', 'Bicycle crunch 20', 'Plank 45 dtk'] },
  { rounds: '4 putaran · istirahat 30 dtk', moves: ['Hanging leg raise 10–12', 'Cable crunch 15', 'Ab wheel rollout 8–10', 'Side plank 30 dtk/sisi', 'Mountain climber 30 dtk'] },
];

// Checklist harian. Label dinamis diisi di app.js.
const CHECK_ITEMS = [
  { id: 'pagi',    group: 'Makan' },
  { id: 'siang',   group: 'Makan' },
  { id: 'malam',   group: 'Makan' },
  { id: 'protein', group: 'Makan' },
  { id: 'bersih',  group: 'Makan' },
  { id: 'latihan', group: 'Gerak' },
  { id: 'abs',     group: 'Gerak', absOnly: true },
  { id: 'langkah', group: 'Gerak' },
  { id: 'air',     group: 'Pulih' },
  { id: 'tidur',   group: 'Pulih' },
];
