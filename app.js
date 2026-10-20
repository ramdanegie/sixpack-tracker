'use strict';

/* =========================================================
   Sixpack 60 Hari — logika aplikasi.
   Data disimpan otomatis di localStorage. Kalau dibuka sebagai
   Artifact di Claude, data juga disinkronkan ke akun lewat `db`.
   ========================================================= */

const TOTAL = 60;
const KEY = 'sixpack60:v1';
const UI_KEY = 'sixpack60:ui';
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const GROUP_COLOR = { Makan: 'var(--ring-makan)', Gerak: 'var(--ring-gerak)', Pulih: 'var(--ring-pulih)' };
const STATUS = { ok: 'Tercapai', partial: 'Sebagian', miss: 'Tidak tercapai', today: 'Berjalan', future: 'Belum mulai' };
const AKTIVITAS = [
  [1.375, 'Ringan'],
  [1.55, 'Sedang'],
  [1.725, 'Tinggi'],
];

/* ---------- Util ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n, d = 0) => Number(n).toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });
const rupiah = n => 'Rp' + fmt(n);
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const isISO = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const fromISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const daysBetween = (a, b) => Math.round((fromISO(iso(a)) - fromISO(iso(b))) / 864e5);
const dateLong = d => `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
const dateShort = d => `${d.getDate()} ${BULAN[d.getMonth()].slice(0, 3)}`;
const parseNum = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : NaN; };
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

const ICON = {
  today: '<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M8 12.4l2.8 2.8L16.2 9.8"/></svg>',
  jadwal: '<svg class="i" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="3.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  progres: '<svg class="i" viewBox="0 0 24 24"><path d="M4 4.5V19.5H20"/><path d="M7.5 15l3.6-4.2 3 2.6 4.6-6"/></svg>',
  warteg: '<svg class="i" viewBox="0 0 24 24"><path d="M3.5 11.5h17a8.5 8 0 0 1-17 0z"/><path d="M8.5 7.5c0-1.4 1-1.8 1-3.2M12.5 7.5c0-1.4 1-1.8 1-3.2"/><path d="M9 20.5h6"/></svg>',
  profil: '<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="8.2" r="3.7"/><path d="M4.8 20c1.2-3.6 4-5.4 7.2-5.4s6 1.8 7.2 5.4"/></svg>',
  left: '<svg class="i" viewBox="0 0 24 24"><path d="M14.5 5.5L8 12l6.5 6.5"/></svg>',
  right: '<svg class="i" viewBox="0 0 24 24"><path d="M9.5 5.5L16 12l-6.5 6.5"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  trash: '<svg class="i" viewBox="0 0 24 24"><path d="M5 7h14M10 7V5h4v2M7 7l1 12.5h8L17 7"/></svg>',
};

/* ---------- State & penyimpanan ---------- */
function defaultState() {
  return { v: 1, start: iso(new Date()), restDay: 0, pattern: 'warteg3', profile: null, checks: {}, notes: {}, weights: [], updatedAt: 0 };
}

function normalize(s) {
  const d = defaultState();
  if (!s || typeof s !== 'object') return d;
  const p = s.profile;
  const profileOk = p && typeof p === 'object' && +p.tinggi > 0 && +p.berat > 0 && +p.umur > 0;
  return {
    v: 1,
    start: isISO(s.start) ? s.start : d.start,
    restDay: Number.isInteger(s.restDay) && s.restDay >= 0 && s.restDay <= 6 ? s.restDay : 0,
    pattern: PATTERNS.some(pt => pt.id === s.pattern) ? s.pattern : 'warteg3',
    profile: profileOk ? {
      nama: String(p.nama || '').slice(0, 40),
      sex: p.sex === 'P' ? 'P' : 'L',
      umur: +p.umur, tinggi: +p.tinggi, berat: +p.berat,
      aktivitas: +p.aktivitas || 1.55,
    } : null,
    checks: s.checks && typeof s.checks === 'object' ? s.checks : {},
    notes: s.notes && typeof s.notes === 'object' ? s.notes : {},
    weights: Array.isArray(s.weights)
      ? s.weights.filter(w => w && isISO(w.date) && +w.kg > 0).map(w => ({ date: w.date, kg: +w.kg, ...(+w.waist > 0 ? { waist: +w.waist } : {}) }))
        .sort((a, b) => a.date.localeCompare(b.date))
      : [],
    updatedAt: +s.updatedAt || 0,
  };
}

function readJSON(key) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}

let state = normalize(readJSON(KEY));
let ui = { tab: 'today', foodGrade: 'pilih', ...(readJSON(UI_KEY) || {}) };
const localOK = writeJSON(KEY, state);
ui.day = clamp(todayN(), 1, TOTAL);

function saveUI() { writeJSON(UI_KEY, { tab: ui.tab, foodGrade: ui.foodGrade }); }

function commit() {
  state.updatedAt = Date.now();
  const ok = writeJSON(KEY, state);
  if (cloud.ref) { setSync('saving'); scheduleCloud(); } else setSync(ok ? 'local' : 'memory');
}

/* Sinkron ke akun Claude (hanya aktif kalau dibuka sebagai Artifact). */
const cloud = { ref: null, timer: null, busy: false, dirty: false, retried: false };

function parseRemote(d) {
  try { return d && typeof d.json === 'string' ? normalize(JSON.parse(d.json)) : null; } catch { return null; }
}

async function initCloud() {
  const c = window.claude;
  if (!c || typeof c.use !== 'function') return;
  try {
    const [db, user] = await Promise.all([c.use('db'), c.use('user')]);
    if (!db || !user) return;
    const uid = await user.id();
    if (!uid) return;
    const ref = db.doc('data/users/' + uid + '/sixpack60');
    const snap = await ref.get();
    const remote = snap.exists ? parseRemote(snap.data()) : null;
    cloud.ref = ref;
    if (remote && remote.updatedAt > state.updatedAt) {
      state = remote;
      writeJSON(KEY, state);
      ui.day = clamp(todayN(), 1, TOTAL);
      render();
      setSync('cloud');
    } else if (state.updatedAt > (remote ? remote.updatedAt : 0)) {
      await flushCloud();
    } else {
      setSync('cloud');
    }
    ref.onSnapshot(s => {
      if (!s.exists || s.metadata.hasPendingWrites) return;
      const r = parseRemote(s.data());
      if (r && r.updatedAt > state.updatedAt) {
        state = r;
        writeJSON(KEY, state);
        render();
        toast('Data diperbarui dari perangkat lain');
      }
    }, () => {});
  } catch {
    cloud.ref = null;
  }
}

function scheduleCloud() {
  if (!cloud.ref) return;
  clearTimeout(cloud.timer);
  cloud.timer = setTimeout(flushCloud, 1200);
}

async function flushCloud() {
  if (!cloud.ref) return;
  if (cloud.busy) { cloud.dirty = true; return; }
  cloud.busy = true;
  setSync('saving');
  try {
    await cloud.ref.set({ json: JSON.stringify(state), updatedAt: state.updatedAt });
    cloud.retried = false;
    setSync('cloud');
  } catch (e) {
    if (e && e.code === 'unavailable' && !cloud.retried) {
      cloud.retried = true;
      setTimeout(flushCloud, 1500 + Math.random() * 2000);
    } else {
      cloud.ref = null;
    }
    setSync('local');
  } finally {
    cloud.busy = false;
  }
  if (cloud.dirty) { cloud.dirty = false; flushCloud(); }
}

let syncState = localOK ? 'local' : 'memory';
const SYNC_TEXT = {
  local: ['Tersimpan', 'Tersimpan otomatis di browser ini'],
  cloud: ['Tersinkron', 'Tersinkron ke akun Claude kamu'],
  saving: ['Menyimpan…', 'Sedang menyimpan…'],
  memory: ['Tidak tersimpan', 'Browser memblokir penyimpanan. Pakai backup.'],
};
function setSync(s) {
  syncState = s;
  const chip = $('#sync');
  if (chip) { chip.dataset.s = s; chip.lastElementChild.textContent = SYNC_TEXT[s][0]; }
  const row = $('#syncText');
  if (row) row.textContent = SYNC_TEXT[s][1];
}

/* ---------- Rencana per hari ---------- */
function startDate() { return fromISO(state.start); }
function todayN() { return daysBetween(new Date(), fromISO(state.start)) + 1; }
function dateOf(n) { return addDays(startDate(), n - 1); }
function phaseOf(n) { return PHASES.find(p => n >= p.from && n <= p.to) || PHASES[PHASES.length - 1]; }

function planFor(n) {
  const date = dateOf(n);
  const phase = phaseOf(n);
  const idx = (date.getDay() - state.restDay + 6) % 7; // 0 = sehari setelah hari libur
  const key = WEEK_ORDER[idx];
  return { n, date, phase, pi: phase.id - 1, idx, key, session: SESSIONS[key], rest: key === 'rest' };
}

function patternOf(id = state.pattern) { return PATTERNS.find(pt => pt.id === id) || PATTERNS[0]; }

function itemsFor(plan) {
  const three = patternOf().meals === 3;
  return CHECK_ITEMS.filter(i => (!i.absOnly || plan.session.abs) && (!i.only3 || three));
}

function scoreFor(n) {
  const plan = planFor(n);
  const items = itemsFor(plan);
  const done = state.checks[n] || {};
  const groups = {};
  let count = 0;
  for (const it of items) {
    const g = groups[it.group] || (groups[it.group] = { done: 0, total: 0 });
    g.total++;
    if (done[it.id]) { g.done++; count++; }
  }
  return { done: count, total: items.length, pct: items.length ? count / items.length : 0, groups };
}

function statusFor(n, t = todayN()) {
  if (n > t) return 'future';
  const { pct } = scoreFor(n);
  if (pct >= 0.8) return 'ok';
  if (n === t) return 'today';
  return pct >= 0.5 ? 'partial' : 'miss';
}

/* ---------- Hitungan tubuh ---------- */
function currentWeight() {
  const w = state.weights;
  return w.length ? w[w.length - 1].kg : state.profile ? state.profile.berat : null;
}
function bodyFat(bmi, umur, male) { return clamp(1.2 * bmi + 0.23 * umur - 10.8 * (male ? 1 : 0) - 5.4, 4, 60); }
function bmiCategory(b) { return b < 18.5 ? 'Kurus' : b <= 25 ? 'Normal' : b <= 27 ? 'Gemuk' : 'Obesitas'; }

function metrics() {
  const p = state.profile;
  if (!p) return null;
  const male = p.sex !== 'P';
  const h = p.tinggi / 100;
  const w = currentWeight();
  const bmi = w / (h * h);
  const bmr = 10 * w + 6.25 * p.tinggi - 5 * p.umur + (male ? 5 : -161);
  const tdee = bmr * p.aktivitas;
  const kcal = Math.round(Math.max(tdee * 0.8, bmr, male ? 1500 : 1200) / 50) * 50;
  const protein = Math.round(1.6 * Math.min(w, 25 * h * h) / 5) * 5;
  const water = Math.min(4, Math.round((w * 0.035 + 0.5) * 10) / 10);
  const bf = bodyFat(bmi, p.umur, male);
  const bfTarget = male ? 11 : 18;
  const sixpackKg = w * (1 - bf / 100) / (1 - bfTarget / 100);
  // Laju turun realistis dihitung dari berat awal: 0,5–0,8% berat badan per minggu.
  const w0 = p.berat;
  const bf0 = bodyFat(w0 / (h * h), p.umur, male);
  const rate = bf0 > (male ? 25 : 32) ? 0.008 : bf0 > (male ? 18 : 25) ? 0.007 : 0.005;
  const loss60 = w0 * rate * TOTAL / 7;
  return { male, w, bmi, bmr, tdee, kcal, protein, water, bf, bfTarget, sixpackKg, w0, rate, loss60, goal60: w0 - loss60 };
}

/* ---------- Menu ---------- */
function foodName(id) { return FOODS[id].name; }
function shortName(id) { return FOODS[id].name.replace(/\s*\(.*?\)/g, ''); }
function mealLine(list) { return list.map(([id, q]) => shortName(id) + (q > 1 ? ' ×' + q : '')).join(', '); }
function sumFoods(list) {
  return list.reduce((a, [id, q]) => {
    const f = FOODS[id];
    a.kcal += f.kcal * q; a.p += f.p * q; a.price += f.price * q;
    return a;
  }, { kcal: 0, p: 0, price: 0 });
}
const countEggs = items => items.reduce((a, [id, q]) => a + (id.startsWith('telur_') ? q : 0), 0);
function menuItems(dm) { return dm.slots.flatMap(s => dm.meals[s.id]); }

// Target harian; tanpa profil dipakai contoh 110 g protein / 2.000 kkal.
function targets() {
  const m = metrics();
  return m ? { protein: m.protein, kcal: m.kcal, real: true } : { protein: 110, kcal: 2000, real: false };
}

// Menu satu hari untuk pola tertentu. Pola 2× menambah telur rebus sampai target protein tercapai.
function buildMenu(pid, idx, t) {
  const pat = patternOf(pid);
  if (pat.meals === 3) {
    const menu = MENUS[idx % MENUS.length];
    return { pat, name: menu.name, slots: MEAL_SLOTS, meals: menu.meals };
  }
  const list = MENUS2[pat.id];
  const base = list[idx % list.length];
  const baseP = sumFoods([...base.meals.siang, ...base.meals.malam]).p;
  const eggs = clamp(Math.ceil((t.protein - baseP) / FOODS.telur_rebus.p), pat.minEggs, pat.maxEggs);
  const e1 = Math.ceil(eggs / 2);
  const withEggs = (items, n) => (n ? [...items, ['telur_rebus', n]] : items);
  return { pat, name: base.name, slots: MEAL_SLOTS_2, meals: { siang: withEggs(base.meals.siang, e1), malam: withEggs(base.meals.malam, eggs - e1) } };
}

function adjustFor(base, t, pat) {
  const tips = [];
  let k = base.kcal, p = base.p, price = 0, eggs = 0;
  if (t.protein - p > 4 && pat.meals === 3) {
    eggs = Math.min(3, Math.ceil((t.protein - p) / 6));
    tips.push([`Tambah telur rebus ×${eggs} di camilan`, `+${eggs * 6} g protein`]);
    k += eggs * 75; p += eggs * 6; price += eggs * FOODS.telur_rebus.price;
  }
  if (t.protein - p > 4) {
    tips.push(['Tambah tempe goreng 2 ptg', '+10 g protein']);
    k += 160; p += 10; price += FOODS.tempe_goreng.price;
  }
  const gap = t.kcal - k;
  if (gap >= 100) {
    const halves = Math.min(4, Math.round(gap / 130));
    const where = pat.meals === 3 ? ['di makan malam', '(siang & malam)'] : ['di makan kedua', '(dibagi 2 kali makan)'];
    tips.push([halves === 1 ? `Tambah nasi ½ porsi ${where[0]}` : `Tambah nasi ½ porsi ×${halves} ${where[1]}`, `+${halves * 130} kkal`]);
    k += halves * 130; price += halves * FOODS.nasi_half.price;
  } else if (gap <= -100) {
    const cuts = pat.meals === 3 ? [
      ['Nasi siang cukup ½ porsi', 130, 1500],
      ['Makan malam tanpa nasi, tambah 1 sayur', 100, 0],
      ['Lewati pisang/ubi, ganti timun atau jeruk', 70, 2000],
    ] : [
      ['Nasi makan kedua cukup ½ porsi', 130, 1000],
      ['Nasi makan pertama cukup ½ porsi', 130, 1000],
      ['Makan kedua tanpa nasi, tambah sayur', 100, 0],
    ];
    for (const [text, kcal, save] of cuts) {
      if (k - t.kcal < 65) break;
      tips.push([text, `−${kcal} kkal`]);
      k -= kcal; price -= save;
    }
  }
  return { tips, kcal: k, p, price, eggs };
}

// Rata-rata harian satu pola (setelah porsi disesuaikan) untuk perbandingan.
function patternStats(pid, t) {
  const pat = patternOf(pid);
  const n = pat.meals === 3 ? MENUS.length : MENUS2[pid].length;
  let k = 0, p = 0, price = 0, eggs = 0;
  for (let i = 0; i < n; i++) {
    const dm = buildMenu(pid, i, t);
    const items = menuItems(dm);
    const base = sumFoods(items);
    const a = adjustFor(base, t, pat);
    k += a.kcal; p += a.p; price += base.price + a.price; eggs += countEggs(items) + a.eggs;
  }
  return { kcal: Math.round(k / n / 10) * 10, p: Math.round(p / n), price: Math.round(price / n / 500) * 500, eggs: Math.round(eggs / n) };
}

/* ---------- Teks checklist ---------- */
function checkText(id, plan, m, dm) {
  const { phase, pi, session } = plan;
  const two = dm.pat.meals === 2;
  switch (id) {
    case 'pagi': return ['Sarapan sesuai menu', mealLine(dm.meals.pagi)];
    case 'siang': return [two ? 'Makan pertama sesuai menu' : 'Makan siang warteg', mealLine(dm.meals.siang)];
    case 'malam': return [two ? 'Makan kedua sebelum 19.30' : 'Makan malam sebelum 19.30', mealLine(dm.meals.malam)];
    case 'protein': {
      const eggs = countEggs(menuItems(dm));
      const sub = two ? `Termasuk ${eggs} telur rebus` : m ? 'Lauk hewani + tempe/tahu tiap makan' : 'Isi profil supaya target gram dihitung';
      return [m ? `Protein ≥ ${m.protein} g` : 'Protein cukup', sub];
    }
    case 'bersih': return ['Bebas gorengan & minuman manis', 'Tanpa gorengan tepung, kerupuk, es teh manis'];
    case 'latihan': return plan.rest
      ? ['Jalan santai + stretching', CARDIO.walk[pi]]
      : [`Latihan ${session.name}`, session.focus + (session.cardio ? ' + kardio' : '')];
    case 'abs': return ['Sirkuit perut', ABS[pi].rounds];
    case 'langkah': return [`Jalan ${fmt(phase.steps)} langkah`, 'Cek di aplikasi kesehatan HP'];
    case 'air': return [`Minum air ${m ? fmt(m.water, 1) : '2,5–3'} liter`, `± ${m ? Math.round(m.water / 0.25) : 11} gelas belimbing`];
    case 'tidur': return ['Tidur 7–8 jam', 'Kurang tidur bikin lapar dan lemak susah turun'];
    default: return [id, ''];
  }
}

/* ---------- SVG ---------- */
function ringsSVG(score) {
  const order = ['Makan', 'Gerak', 'Pulih'];
  const size = 132, sw = 15;
  let r = size / 2 - sw / 2, out = '';
  for (const g of order) {
    const grp = score.groups[g] || { done: 0, total: 1 };
    const pct = grp.total ? grp.done / grp.total : 0;
    const C = 2 * Math.PI * r;
    out += `<circle class="ring-track" cx="66" cy="66" r="${r}" style="stroke:${GROUP_COLOR[g]}"/>`;
    out += `<circle class="ring-arc" data-g="${g}" data-c="${C.toFixed(2)}" cx="66" cy="66" r="${r}" transform="rotate(-90 66 66)"
      style="stroke:${GROUP_COLOR[g]};stroke-dasharray:${(C * pct).toFixed(2)} ${C.toFixed(2)};opacity:${pct > 0 ? 1 : 0}"/>`;
    r -= sw + 2;
  }
  return `<svg viewBox="0 0 132 132" role="img" aria-label="Cincin progres: makan, gerak, pulih">${out}</svg>`;
}

function miniRing(n, pct) {
  const C = 2 * Math.PI * 15;
  return `<svg class="mini" viewBox="0 0 36 36" aria-hidden="true"><circle class="core" cx="18" cy="18" r="13"/><circle class="trk" cx="18" cy="18" r="15"/>${pct > 0 ? `<circle class="arc" cx="18" cy="18" r="15" transform="rotate(-90 18 18)" stroke-dasharray="${(C * pct).toFixed(1)} ${C.toFixed(1)}"/>` : ''}<text x="18" y="18.5">${n}</text></svg>`;
}

/* ---------- View: Hari Ini ---------- */
function viewToday() {
  const n = ui.day;
  const t = todayN();
  const plan = planFor(n);
  const m = metrics();
  const t0 = targets();
  const dm = buildMenu(state.pattern, plan.idx, t0);
  const score = scoreFor(n);
  const st = statusFor(n, t);
  const locked = n > t;
  const checks = state.checks[n] || {};
  const programPct = clamp(t, 0, TOTAL) / TOTAL;

  let notice = '';
  if (!state.profile) {
    notice = `<div class="notice glass"><p><b>Isi berat & tinggi badan dulu.</b> Target kalori, protein, dan air akan dihitung otomatis.</p><button class="btn small" data-tab="profil">Isi</button></div>`;
  } else if (t < 1) {
    notice = `<div class="notice glass"><p>Program mulai <b>${dateLong(startDate())}</b>. Ini pratinjau hari pertama.</p></div>`;
  } else if (t > TOTAL) {
    notice = `<div class="notice glass"><p><b>60 hari selesai.</b> Cek rekapnya di Jadwal dan Progres.</p><button class="btn small" data-tab="jadwal">Rekap</button></div>`;
  }

  const groups = {};
  for (const it of itemsFor(plan)) (groups[it.group] = groups[it.group] || []).push(it);
  const checklist = Object.entries(groups).map(([g, items]) => {
    const gs = score.groups[g];
    return `<div class="group-label" style="--c:${GROUP_COLOR[g]}"><span><i></i>${g}</span><span data-gcount="${g}">${gs.done}/${gs.total}</span></div>` +
      items.map(it => {
        const [title, sub] = checkText(it.id, plan, m, dm);
        return `<label class="row check-row${locked ? ' locked' : ''}" style="--c:${GROUP_COLOR[g]}">
          <input type="checkbox" data-check="${it.id}"${checks[it.id] ? ' checked' : ''}${locked ? ' disabled' : ''}>
          <span class="tick" aria-hidden="true">${ICON.check}</span>
          <span class="row-text"><span class="row-title">${esc(title)}</span><span class="row-sub">${esc(sub)}</span></span>
        </label>`;
      }).join('');
  }).join('');

  const legend = ['Makan', 'Gerak', 'Pulih'].map(g => {
    const gs = score.groups[g] || { done: 0, total: 0 };
    return `<span style="--c:${GROUP_COLOR[g]}"><i></i>${g} <b data-glegend="${g}">${gs.done}/${gs.total}</b></span>`;
  }).join('');

  const isToday = n === clamp(t, 1, TOTAL);
  const hero = `
    <section class="hero glass" id="hero" aria-label="Ringkasan hari ${n}">
      <div class="hero-top">
        <div class="rings" id="rings">${ringsSVG(score)}</div>
        <div class="hero-text">
          <span class="eyebrow">Fase ${plan.phase.id} · ${plan.phase.name}</span>
          <span class="dayno">${n}<small>/${TOTAL}</small></span>
          <span class="date">${dateLong(plan.date)}</span>
          <span class="pill st-${st}" id="dayStatus">${STATUS[st]} · <span id="dayScore">${score.done}/${score.total}</span></span>
        </div>
      </div>
      <div class="legend">${legend}</div>
      <div>
        <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${TOTAL}" aria-valuenow="${clamp(t, 0, TOTAL)}"><b style="width:${(programPct * 100).toFixed(1)}%"></b></div>
        <div class="bar-cap"><span>Program hari ke-${clamp(t, 0, TOTAL)}</span><span>${t < 1 ? `mulai ${dateShort(startDate())}` : t > TOTAL ? 'selesai' : `${TOTAL - t} hari lagi`}</span></div>
      </div>
      <div class="hero-nav">
        <button class="icon-btn" data-act="prev" aria-label="Hari sebelumnya"${n <= 1 ? ' disabled' : ''}>${ICON.left}</button>
        ${isToday ? `<span class="tip" style="text-align:center">Geser kartu atau tap panah</span>` : `<button class="btn tinted small" data-act="goToday">Kembali ke hari ini</button>`}
        <button class="icon-btn" data-act="next" aria-label="Hari berikutnya"${n >= TOTAL ? ' disabled' : ''}>${ICON.right}</button>
      </div>
    </section>`;

  const checklistSection = `
    <section class="section">
      <div class="section-head"><h2 class="section-title">Checklist</h2><span class="section-meta">${locked ? 'Bisa dicentang saat harinya tiba' : 'Tercapai kalau ≥ 80%'}</span></div>
      <div class="list glass">${checklist}</div>
    </section>`;

  const base = sumFoods(menuItems(dm));
  const eggCount = countEggs(menuItems(dm));
  const meals = dm.slots.map(slot => `
    <div class="meal">
      <div class="meal-head"><span class="meal-name">${slot.label}</span><span class="meal-time">${slot.time}</span></div>
      <ul class="food-list">${dm.meals[slot.id].map(([id, q]) => {
        const f = FOODS[id];
        return `<li class="food"><span class="food-name">${esc(f.name)}${q > 1 ? ` <span class="qty">×${q}</span>` : ''}</span><span class="food-meta">${fmt(f.kcal * q)} kkal · ${fmt(f.p * q)} g protein</span><span class="price">${rupiah(f.price * q)}</span></li>`;
      }).join('')}</ul>
    </div>`).join('');

  let adjust;
  if (m) {
    const a = adjustFor(base, t0, dm.pat);
    adjust = `<div class="adjust">
      <span class="adjust-title">Sesuaikan untuk targetmu · ${fmt(m.kcal)} kkal, ${m.protein} g protein</span>
      ${a.tips.length ? `<ul>${a.tips.map(([x, d]) => `<li><span>${esc(x)}</span><span>${d}</span></li>`).join('')}</ul>
      <span class="result">Hasilnya ± ${fmt(a.kcal)} kkal · ${fmt(a.p)} g protein</span>` : `<span class="result">Porsi menu ini sudah pas dengan targetmu.</span>`}
    </div>`;
  } else {
    adjust = `<p class="tip">${dm.pat.meals === 2 ? 'Jumlah telur memakai contoh target 110 g protein. ' : ''}Isi profil supaya porsi nasi dan lauk disesuaikan dengan targetmu.</p>`;
  }
  if (eggCount > 6) {
    adjust += `<p class="tip">${eggCount} telur ≈ ${fmt(eggCount * 186)} mg kolesterol. Kebanyakan orang sehat tetap aman, tapi cek kolesterol darah sebelum dan sesudah 60 hari.</p>`;
  }

  const menuSection = `
    <section class="section">
      <div class="section-head"><h2 class="section-title">Menu ${dm.pat.meals === 3 ? 'warteg' : 'hari ini'}</h2><button class="link-btn" type="button" data-tab="warteg">${esc(dm.pat.short)} · ${esc(dm.name)} ›</button></div>
      <div class="card glass">
        ${meals}
        <div class="totals">
          <div><span>Kalori</span><b>${fmt(base.kcal)}</b></div>
          <div><span>Protein</span><b>${fmt(base.p)} g</b></div>
          <div><span>Biaya</span><b>${rupiah(base.price)}</b></div>
        </div>
        ${adjust}
      </div>
    </section>`;

  const workoutSection = `
    <section class="section">
      <div class="section-head"><h2 class="section-title">Latihan</h2><span class="section-meta">${esc(plan.session.name)}</span></div>
      <div class="card glass">${workoutBody(plan)}</div>
    </section>`;

  const weightToday = state.weights.find(w => w.date === iso(plan.date));
  const notesSection = `
    <section class="section">
      <div class="section-head"><h2 class="section-title">Catatan</h2></div>
      <div class="card glass">
        ${locked ? '' : `<form class="inline-form" data-form="quickWeight">
          <label class="stack"><span>Berat badan ${n === t ? 'hari ini' : 'hari ini (H' + n + ')'}</span>
            <span class="unit-wrap"><input class="field-input" id="qkg" name="kg" inputmode="decimal" autocomplete="off" placeholder="cth. 72,5" value="${weightToday ? fmt(weightToday.kg, 1) : ''}"><span class="unit">kg</span></span>
          </label>
          <button class="btn" type="submit">Simpan</button>
        </form>
        <p class="error" id="qerr"></p>`}
        <label class="stack"><span>Catatan hari ${n}</span>
          <textarea class="field-input" id="note" data-note placeholder="Lapar jam berapa? Beban naik? Ada cheat?">${esc(state.notes[n] || '')}</textarea>
        </label>
      </div>
    </section>`;

  return `
    <div class="title-row"><div><h1 class="large-title">Hari Ini</h1><p class="subtitle">${state.profile && state.profile.nama ? 'Semangat, ' + esc(state.profile.nama) + '.' : 'Target sixpack 60 hari'}</p></div></div>
    ${notice}
    <div class="split">
      <div class="col">${hero}${checklistSection}</div>
      <div class="col">${menuSection}${workoutSection}${notesSection}</div>
    </div>`;
}

function workoutBody(plan) {
  const { session, pi, phase } = plan;
  let html = `<div class="workout-focus"><span class="pill">${esc(session.focus)}</span><span class="pill">Fase ${phase.id}</span></div>`;
  if (plan.rest) {
    html += `<div class="sub-card"><h3>Pemulihan aktif</h3><p>${CARDIO.walk[pi]}. Otot tumbuh saat istirahat, bukan saat latihan.</p></div>
      <div class="chips">${['Stretch paha depan', 'Stretch hamstring', 'Cat-cow', 'Child pose', 'Stretch dada di pintu'].map(x => `<span class="chip">${x}</span>`).join('')}</div>`;
    return html;
  }
  if (session.exercises.length) {
    if (session.circuit) html += `<p class="tip">Sirkuit <b>${session.circuit[pi]}</b>. Lakukan semua gerakan berurutan tanpa jeda, istirahat 60–90 dtk tiap putaran.</p>`;
    html += `<ol class="ex-list">${session.exercises.map(e => `
      <li class="ex"><span class="ex-name">${esc(e.n)}</span><span class="ex-rx">${esc(e.rx[pi])}</span>${e.alt ? `<span class="ex-alt">Alternatif: ${esc(e.alt)}</span>` : '<span class="ex-alt">&nbsp;</span>'}</li>`).join('')}</ol>`;
    if (!session.circuit) html += `<p class="tip">Istirahat 60–90 dtk antar set. Kalau semua repetisi terasa ringan, naikkan beban 2,5 kg minggu depan.</p>`;
  }
  if (session.abs) {
    html += `<div class="sub-card"><h3>Sirkuit perut <span>${ABS[pi].rounds}</span></h3><div class="chips">${ABS[pi].moves.map(x => `<span class="chip">${esc(x)}</span>`).join('')}</div></div>`;
  }
  if (session.cardio) {
    html += `<div class="sub-card"><h3>Kardio</h3><p>${esc(CARDIO[session.cardio][pi])}</p></div>`;
  }
  return html;
}

/* ---------- View: Jadwal ---------- */
function viewJadwal() {
  const t = todayN();
  const last = clamp(t, 0, TOTAL);
  let ok = 0, pctSum = 0, counted = 0;
  for (let n = 1; n <= last; n++) {
    if (statusFor(n, t) === 'ok') ok++;
    if (n < t) { pctSum += scoreFor(n).pct; counted++; }
  }
  let streak = 0;
  let n = last;
  if (n >= 1 && statusFor(n, t) !== 'ok') n--;
  for (; n >= 1 && statusFor(n, t) === 'ok'; n--) streak++;
  const avg = counted ? Math.round(pctSum / counted * 100) : (last >= 1 ? Math.round(scoreFor(last).pct * 100) : 0);

  const stats = `
    <div class="stats">
      <div class="stat glass"><span class="stat-label">Hari tercapai</span><span class="stat-value">${ok}<small>/${last}</small></span></div>
      <div class="stat glass"><span class="stat-label">Streak</span><span class="stat-value">${streak}<small>hari</small></span></div>
      <div class="stat glass"><span class="stat-label">Rata-rata checklist</span><span class="stat-value">${avg}<small>%</small></span></div>
      <div class="stat glass"><span class="stat-label">Sisa</span><span class="stat-value">${clamp(TOTAL - Math.max(t, 0), 0, TOTAL)}<small>hari</small></span></div>
    </div>`;

  const key = `<div class="key">
    <span style="--c:var(--green)"><i></i>Tercapai ≥80%</span>
    <span style="--c:var(--orange)"><i></i>Sebagian 50–79%</span>
    <span style="--c:var(--red)"><i></i>Tidak tercapai</span>
    <span style="--c:var(--blue)"><i></i>Hari ini</span>
  </div>`;

  const blocks = PHASES.map(ph => {
    const cells = [];
    for (let d = ph.from; d <= ph.to; d++) {
      const p = planFor(d);
      const st = statusFor(d, t);
      const pct = st === 'future' ? 0 : scoreFor(d).pct;
      cells.push(`<button class="day-cell st-${st}${d === t ? ' is-today' : ''}${d === ui.day && d !== t ? ' is-sel' : ''}" data-day="${d}"
        aria-label="Hari ${d}, ${HARI[p.date.getDay()]} ${dateShort(p.date)}, ${p.session.name}, ${STATUS[st]}">
        <span class="dc-wd">${HARI[p.date.getDay()].slice(0, 3)}</span>${miniRing(d, pct)}<span class="dc-code">${p.session.code}</span></button>`);
    }
    return `<section class="phase-block glass">
      <div class="phase-head"><h3>Fase ${ph.id} · ${ph.name} <span>Hari ${ph.from}–${ph.to} · ${dateShort(dateOf(ph.from))}–${dateShort(dateOf(ph.to))}</span></h3><p>${ph.goal}</p></div>
      <div class="day-grid">${cells.join('')}</div>
    </section>`;
  }).join('');

  const codes = WEEK_ORDER.map(k => `<span><b>${SESSIONS[k].code}</b>&nbsp;${SESSIONS[k].name}</span>`).join('');

  return `
    <div class="title-row"><div><h1 class="large-title">Jadwal</h1><p class="subtitle">${dateShort(startDate())} – ${dateShort(dateOf(TOTAL))} ${dateOf(TOTAL).getFullYear()} · libur tiap ${HARI[state.restDay]}</p></div></div>
    ${stats}
    ${key}
    ${blocks}
    <p class="footnote key">${codes}</p>`;
}

/* ---------- View: Progres ---------- */
function viewProgres() {
  const m = metrics();
  const ws = state.weights;
  const first = ws[0], lastW = ws[ws.length - 1];
  const delta = first && lastW ? lastW.kg - first.kg : 0;
  const h = state.profile ? state.profile.tinggi : null;

  const stats = `
    <div class="stats">
      <div class="stat glass"><span class="stat-label">Berat awal</span><span class="stat-value">${first ? fmt(first.kg, 1) : '–'}<small>kg</small></span><span class="stat-sub">${first ? dateShort(fromISO(first.date)) : 'belum ada'}</span></div>
      <div class="stat glass"><span class="stat-label">Sekarang</span><span class="stat-value">${lastW ? fmt(lastW.kg, 1) : '–'}<small>kg</small></span><span class="stat-sub">${lastW ? dateShort(fromISO(lastW.date)) : 'belum ada'}</span></div>
      <div class="stat glass"><span class="stat-label">Perubahan</span><span class="stat-value ${delta < 0 ? 'good' : delta > 0 ? 'bad' : ''}">${ws.length > 1 ? (delta > 0 ? '+' : delta < 0 ? '−' : '') + fmt(Math.abs(delta), 1) : '0'}<small>kg</small></span><span class="stat-sub">${ws.length} kali timbang</span></div>
      <div class="stat glass"><span class="stat-label">BMI</span><span class="stat-value">${m ? fmt(m.bmi, 1) : '–'}</span><span class="stat-sub">${m ? bmiCategory(m.bmi) + ' · tinggi ' + fmt(h) + ' cm' : 'isi tinggi badan'}</span></div>
    </div>`;

  const chart = `
    <section class="section">
      <div class="section-head"><h2 class="section-title">Grafik berat</h2><span class="section-meta">Hari 1–60</span></div>
      <div class="card glass">
        <div class="chart-host" id="chart"></div>
        <div class="chart-key"><span><i></i>Berat kamu</span>${m ? '<span><i class="dash"></i>Target realistis</span>' : ''}</div>
      </div>
    </section>`;

  let target = '';
  if (m) {
    const lastWaist = [...ws].reverse().find(w => w.waist);
    const whtr = lastWaist ? lastWaist.waist / state.profile.tinggi : null;
    const reached = m.bf <= m.bfTarget + 0.5;
    const moreWeeks = Math.max(0, Math.ceil((m.goal60 - m.sixpackKg) / (m.goal60 * 0.006)));
    target = `
      <section class="section">
        <div class="section-head"><h2 class="section-title">Target</h2><span class="section-meta">perkiraan</span></div>
        <div class="list glass">
          <div class="row"><span class="row-text"><span class="row-title">Target 60 hari</span><span class="row-sub">Turun ±${fmt(m.rate * 100, 1)}% berat badan per minggu</span></span><span class="row-value"><b>${fmt(m.goal60, 1)} kg</b><br>−${fmt(m.loss60, 1)} kg</span></div>
          <div class="row"><span class="row-text"><span class="row-title">Perut mulai terlihat</span><span class="row-sub">Saat lemak tubuh ±${m.bfTarget}%</span></span><span class="row-value"><b>${reached ? 'sekarang' : '± ' + fmt(m.sixpackKg, 1) + ' kg'}</b></span></div>
          <div class="row"><span class="row-text"><span class="row-title">Lemak tubuh sekarang</span><span class="row-sub">Dihitung dari BMI & umur, bisa meleset ±5%</span></span><span class="row-value"><b>± ${fmt(m.bf, 0)}%</b></span></div>
          ${whtr ? `<div class="row"><span class="row-text"><span class="row-title">Rasio pinggang / tinggi</span><span class="row-sub">Lingkar perut ${fmt(lastWaist.waist, 1)} cm · sixpack biasanya &lt; 0,45</span></span><span class="row-value"><b>${fmt(whtr, 2)}</b></span></div>` : ''}
        </div>
        <p class="footnote">${reached
          ? 'Lemak tubuhmu sudah di kisaran sixpack. Fokus ke sirkuit perut dengan beban dan jaga protein.'
          : moreWeeks > 0
            ? `Dari target 60 hari, perlu sekitar ${moreWeeks} minggu lagi dengan pola yang sama sampai perut benar-benar terlihat. 60 hari ini membawa kamu sebagian besar jalan.`
            : 'Kalau konsisten, garis perut kemungkinan sudah mulai terlihat di akhir 60 hari.'}</p>
      </section>`;
  }

  const form = `
    <section class="section">
      <div class="section-head"><h2 class="section-title">Catat berat</h2><span class="section-meta">pagi, sebelum makan</span></div>
      <form class="card glass" data-form="weight">
        <div class="grid-form">
          <label class="stack full"><span>Tanggal</span><input class="field-input" type="date" id="wdate" name="date" value="${iso(new Date())}" required></label>
          <label class="stack"><span>Berat (kg)</span><input class="field-input" id="wkg" name="kg" inputmode="decimal" autocomplete="off" placeholder="72,5" required></label>
          <label class="stack"><span>Lingkar perut (cm)</span><input class="field-input" id="wwaist" name="waist" inputmode="decimal" autocomplete="off" placeholder="opsional"></label>
        </div>
        <p class="error" id="werr"></p>
        <button class="btn block" type="submit">Simpan berat</button>
      </form>
    </section>`;

  const history = ws.length ? `
    <section class="section">
      <div class="section-head"><h2 class="section-title">Riwayat</h2></div>
      <div class="list glass">${[...ws].reverse().map(w => {
        const d = daysBetween(fromISO(w.date), startDate()) + 1;
        return `<div class="row"><span class="row-text"><span class="row-title">${fmt(w.kg, 1)} kg${w.waist ? ` <span class="row-sub">· perut ${fmt(w.waist, 1)} cm</span>` : ''}</span><span class="row-sub">${dateLong(fromISO(w.date))}${d >= 1 && d <= TOTAL ? ' · hari ' + d : ''}</span></span>
          <button class="icon-btn" data-act="delWeight" data-date="${w.date}" aria-label="Hapus data ${dateShort(fromISO(w.date))}" style="color:var(--red-ink)">${ICON.trash}</button></div>`;
      }).join('')}</div>
    </section>` : '';

  return `
    <div class="title-row"><div><h1 class="large-title">Progres</h1><p class="subtitle">Timbang minimal seminggu sekali, jam yang sama</p></div></div>
    ${stats}
    <div class="split"><div class="col">${chart}${target}</div><div class="col">${form}${history}</div></div>`;
}

function niceStep(raw) {
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
}

function drawChart() {
  const host = $('#chart');
  if (!host) return;
  const m = metrics();
  const start = startDate();
  const pts = state.weights
    .map(w => ({ x: daysBetween(fromISO(w.date), start) + 1, y: w.kg }))
    .filter(p => p.x <= TOTAL)
    .map(p => ({ x: Math.max(1, p.x), y: p.y }));
  if (!pts.length && !m) {
    host.innerHTML = '<p class="chart-empty">Catat berat pertamamu untuk melihat grafik.</p>';
    return;
  }
  const W = Math.max(280, Math.round(host.clientWidth || 320));
  const H = W < 480 ? 210 : 250;
  const L = 38, R = 12, T = 22, B = 24;
  const ys = pts.map(p => p.y);
  if (m) ys.push(m.w0, m.goal60);
  let lo = Math.min(...ys), hi = Math.max(...ys);
  const padY = Math.max(0.8, (hi - lo) * 0.15);
  lo -= padY; hi += padY;
  const step = niceStep((hi - lo) / 4);
  lo = Math.floor(lo / step) * step;
  hi = Math.ceil(hi / step) * step;
  const sx = x => L + (x - 1) / (TOTAL - 1) * (W - L - R);
  const sy = y => T + (hi - y) / (hi - lo) * (H - T - B);
  const dec = step < 1 ? 1 : 0;

  let g = '';
  for (let v = lo; v <= hi + 1e-9; v += step) {
    const y = sy(v).toFixed(1);
    g += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y}" y2="${y}"/><text class="ylab" x="${L - 8}" y="${y}">${fmt(v, dec)}</text>`;
  }
  for (const d of [1, 15, 30, 45, 60]) g += `<text class="xlab" x="${sx(d).toFixed(1)}" y="${H - 4}">H${d}</text>`;
  const t = todayN();
  if (t >= 1 && t <= TOTAL) g += `<line class="now" x1="${sx(t).toFixed(1)}" x2="${sx(t).toFixed(1)}" y1="${T}" y2="${H - B}"/>`;
  if (m) {
    g += `<line class="target" x1="${sx(1)}" y1="${sy(m.w0).toFixed(1)}" x2="${sx(TOTAL).toFixed(1)}" y2="${sy(m.goal60).toFixed(1)}"/>`;
    g += `<text class="tlab" x="${W - R}" y="${(sy(m.goal60) + 16).toFixed(1)}">target ${fmt(m.goal60, 1)}</text>`;
  }
  if (pts.length) {
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(' ');
    const lp = pts[pts.length - 1];
    g += `<defs><linearGradient id="wfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--blue);stop-opacity:.28"/><stop offset="1" style="stop-color:var(--blue);stop-opacity:0"/></linearGradient></defs>`;
    if (pts.length > 1) g += `<path d="${line} L${sx(lp.x).toFixed(1)} ${H - B} L${sx(pts[0].x).toFixed(1)} ${H - B} Z" fill="url(#wfill)"/>`;
    g += `<path class="line" d="${line}"/>`;
    pts.forEach((p, i) => {
      const lastPt = i === pts.length - 1;
      g += `<circle class="${lastPt ? 'pt-last' : 'pt'}" cx="${sx(p.x).toFixed(1)}" cy="${sy(p.y).toFixed(1)}" r="${lastPt ? 5.5 : 3.5}"/>`;
    });
    const lx = sx(lp.x);
    const anchor = lx > W - 60 ? 'end' : lx < L + 40 ? 'start' : 'middle';
    g += `<text class="plab" x="${lx.toFixed(1)}" y="${(sy(lp.y) - 12).toFixed(1)}" text-anchor="${anchor}">${fmt(lp.y, 1)} kg</text>`;
  }
  host.innerHTML = `<svg class="chart" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafik berat badan selama 60 hari">${g}</svg>`;
}

/* ---------- View: Warteg ---------- */
function viewWarteg() {
  const grades = [['pilih', 'Andalan', 'var(--green)'], ['sesekali', 'Sesekali', 'var(--orange)'], ['hindari', 'Hindari', 'var(--red)']];
  if (!grades.some(g => g[0] === ui.foodGrade)) ui.foodGrade = 'pilih';
  const color = grades.find(g => g[0] === ui.foodGrade)[2];
  const foods = Object.values(FOODS).filter(f => f.grade === ui.foodGrade);
  const cats = [...new Set(foods.map(f => f.cat))];
  const list = cats.map(cat => `<div class="group-label"><span>${cat}</span></div>` + foods.filter(f => f.cat === cat).map(f => {
    const value = f.price > 0 && f.p >= 5 ? ` · ${fmt(f.p / (f.price / 1000), 1)} g protein per Rp1.000` : '';
    return `<div class="row food-row" style="--c:${color}"><span class="grade-dot"></span><span class="row-text"><span class="row-title">${esc(f.name)}</span><span class="row-sub">${fmt(f.kcal)} kkal · ${fmt(f.p)} g protein${value}${f.tip ? '<br>' + esc(f.tip) : ''}</span></span>${f.price ? `<span class="price">${rupiah(f.price)}</span>` : ''}</div>`;
  }).join('')).join('');

  const t0 = targets();
  const cur = patternOf();
  const stats = PATTERNS.map(pt => [pt, patternStats(pt.id, t0)]);
  const allMet = stats.every(([, st]) => st.p >= t0.protein - 4);
  const patterns = stats.map(([pt, st]) => {
    const met = st.p >= t0.protein - 4;
    return `<button type="button" class="row pattern-row" role="radio" aria-checked="${pt.id === cur.id}" data-pattern="${pt.id}">
      <span class="radio" aria-hidden="true"></span>
      <span class="row-text"><span class="row-title">${esc(pt.name)}</span><span class="row-sub">${esc(pt.desc)}</span>
        <span class="pattern-stats"><span class="${met ? 'good' : 'warn'}">${st.p} g protein</span><span>${st.eggs} telur</span><span>${fmt(st.kcal)} kkal</span></span></span>
      <span class="price">${rupiah(st.price)}</span>
    </button>`;
  }).join('');

  const days = cur.meals === 3 ? MENUS.length : MENUS2[cur.id].length;
  const rotation = Array.from({ length: days }, (_, i) => {
    const dm = buildMenu(cur.id, i, t0);
    const t = sumFoods(menuItems(dm));
    const sub = cur.meals === 3 ? `Hari ${SESSIONS[WEEK_ORDER[i]].name}` : `${countEggs(menuItems(dm))} telur rebus`;
    return `<div class="row menu-row"><span class="row-text"><span class="row-title">${esc(dm.name)}</span><span class="row-sub">${sub}</span></span><span class="row-value"><b>${fmt(t.kcal)} kkal</b><br>${t.p} g · ${rupiah(t.price)}</span></div>`;
  }).join('');
  const avgPrice = stats.find(([pt]) => pt.id === cur.id)[1].price;

  return `
    <div class="title-row"><div><h1 class="large-title">Warteg</h1><p class="subtitle">Makan murah, protein tinggi, kalori terkontrol</p></div></div>
    <div class="split">
      <div class="col">
        <section class="section">
          <div class="section-head"><h2 class="section-title">Pola makan</h2><span class="section-meta">${t0.real ? `targetmu ${t0.protein} g protein` : 'contoh target 110 g protein'}</span></div>
          <div class="list glass" role="radiogroup" aria-label="Pola makan">${patterns}</div>
          <p class="footnote">Rata-rata per hari setelah porsi disesuaikan. ${allMet ? 'Semua pilihan memenuhi target protein harian.' : 'Angka oranye belum memenuhi target; ikuti saran tambahan lauk di Hari Ini.'} Harga masak sendiri dihitung dari harga bahan di pasar.</p>
        </section>
        <section class="section">
          <div class="section-head"><h2 class="section-title">Cara pesan</h2></div>
          <div class="card glass"><ul class="tips">${WARTEG_TIPS.map(x => `<li><span>${esc(x)}</span></li>`).join('')}</ul></div>
        </section>
        <section class="section">
          <div class="section-head"><h2 class="section-title">${days > 1 ? 'Menu bergilir' : 'Menu harian'}</h2><span class="section-meta">${esc(cur.short)} · ± ${rupiah(avgPrice)}/hari</span></div>
          <div class="list glass">${rotation}</div>
          <p class="footnote">Angka sebelum porsi disesuaikan. Sebulan sekitar ${rupiah(avgPrice * 30)}. Harga perkiraan kota besar, bisa beda di daerahmu.</p>
        </section>
      </div>
      <div class="col">
        <section class="section">
          <div class="section-head"><h2 class="section-title">Daftar lauk</h2></div>
          <div class="segmented" role="group" aria-label="Kategori makanan">${grades.map(([id, label]) => `<button type="button" data-grade="${id}" aria-pressed="${ui.foodGrade === id}">${label}</button>`).join('')}</div>
          <div class="list glass">${list}</div>
        </section>
      </div>
    </div>`;
}

/* ---------- View: Profil ---------- */
function viewProfil() {
  const p = state.profile || {};
  const m = metrics();
  const inArtifact = !!(window.claude && typeof window.claude.use === 'function');
  const standalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;

  const form = `
    <form data-form="profile" novalidate>
      <section class="section">
        <div class="section-head"><h2 class="section-title">Data tubuh</h2></div>
        <div class="list glass">
          <label class="row form-row"><span>Nama panggilan</span><input class="field-input" id="pnama" name="nama" autocomplete="nickname" value="${esc(p.nama || '')}" placeholder="opsional" style="text-align:right"></label>
          <div class="row form-row"><span>Jenis kelamin</span>
            <div class="segmented" role="radiogroup" aria-label="Jenis kelamin">
              <label><input type="radio" name="sex" value="L"${p.sex !== 'P' ? ' checked' : ''}><span>Pria</span></label>
              <label><input type="radio" name="sex" value="P"${p.sex === 'P' ? ' checked' : ''}><span>Wanita</span></label>
            </div>
          </div>
          <label class="row form-row"><span>Umur</span><span class="unit-wrap"><input class="field-input" id="pumur" name="umur" inputmode="numeric" autocomplete="off" value="${p.umur || ''}" placeholder="25"><span class="unit">th</span></span></label>
          <label class="row form-row"><span>Tinggi badan</span><span class="unit-wrap"><input class="field-input" id="ptinggi" name="tinggi" inputmode="decimal" autocomplete="off" value="${p.tinggi ? fmt(p.tinggi, 0) : ''}" placeholder="170"><span class="unit">cm</span></span></label>
          <label class="row form-row"><span>Berat awal</span><span class="unit-wrap"><input class="field-input" id="pberat" name="berat" inputmode="decimal" autocomplete="off" value="${p.berat ? fmt(p.berat, 1) : ''}" placeholder="72,5"><span class="unit">kg</span></span></label>
        </div>
      </section>
      <section class="section" style="margin-top:24px">
        <div class="section-head"><h2 class="section-title">Program</h2></div>
        <div class="list glass">
          <label class="row form-row"><span>Aktivitas</span><span class="select-wrap"><select class="field-input" id="paktivitas" name="aktivitas">${AKTIVITAS.map(([v, l]) => `<option value="${v}"${(p.aktivitas || 1.55) === v ? ' selected' : ''}>${l}</option>`).join('')}</select></span></label>
          <label class="row form-row"><span>Mulai program</span><input class="field-input" type="date" id="pstart" name="start" value="${state.start}"></label>
          <button type="button" class="row form-row link-row" data-tab="warteg"><span>Pola makan</span><span class="row-value">${esc(patternOf().short)} ›</span></button>
          <label class="row form-row"><span>Libur latihan</span><span class="select-wrap"><select class="field-input" id="prest" name="restDay">${HARI.map((h, i) => `<option value="${i}"${state.restDay === i ? ' selected' : ''}>${h}</option>`).join('')}</select></span></label>
        </div>
        <p class="footnote">Aktivitas <b>Sedang</b> = kerja duduk + ikut gym program ini. <b>Tinggi</b> = kerja fisik (kurir, kuli, ojol) + gym. <b>Ringan</b> kalau belum rutin ke gym.</p>
        <p class="footnote">Mengubah tanggal mulai menggeser seluruh jadwal; centang lama tetap ikut nomor harinya.</p>
        <p class="error" id="perr"></p>
        <button class="btn block" type="submit">${state.profile ? 'Simpan perubahan' : 'Simpan & hitung target'}</button>
      </section>
    </form>`;

  const results = m ? `
    <section class="section">
      <div class="section-head"><h2 class="section-title">Target harian</h2><span class="section-meta">dari berat ${fmt(m.w, 1)} kg</span></div>
      <div class="list glass">
        <div class="row"><span class="row-text"><span class="row-title">Kalori</span><span class="row-sub">Defisit ±20% dari kebutuhan</span></span><span class="row-value"><b>${fmt(m.kcal)}</b> kkal</span></div>
        <div class="row"><span class="row-text"><span class="row-title">Protein</span><span class="row-sub">1,6 g per kg berat badan</span></span><span class="row-value"><b>${m.protein}</b> g</span></div>
        <div class="row"><span class="row-text"><span class="row-title">Air putih</span></span><span class="row-value"><b>${fmt(m.water, 1)}</b> liter</span></div>
        <div class="row"><span class="row-text"><span class="row-title">BMI</span><span class="row-sub">Kategori Kemenkes</span></span><span class="row-value"><b>${fmt(m.bmi, 1)}</b> ${bmiCategory(m.bmi)}</span></div>
        <div class="row"><span class="row-text"><span class="row-title">Kebutuhan energi</span><span class="row-sub">BMR ${fmt(Math.round(m.bmr))} kkal × aktivitas</span></span><span class="row-value"><b>${fmt(Math.round(m.tdee / 10) * 10)}</b> kkal</span></div>
      </div>
    </section>` : '';

  const storage = `
    <section class="section">
      <div class="section-head"><h2 class="section-title">Penyimpanan</h2></div>
      <div class="list glass">
        <div class="row"><span class="row-text"><span class="row-title">Status</span><span class="row-sub" id="syncText">${SYNC_TEXT[syncState][1]}</span></span></div>
      </div>
      <div class="btn-row">
        <button class="btn tinted" type="button" data-act="export">Unduh backup</button>
        <button class="btn tinted" type="button" data-act="copy">Salin data</button>
      </div>
      <div class="card glass">
        <details class="disclosure" id="restore">
          <summary>Pulihkan dari backup</summary>
          <div>
            <label class="btn plain block" for="importFile">Pilih file .json</label>
            <input class="sr" type="file" id="importFile" accept=".json,application/json">
            <label class="stack"><span>atau tempel teks backup</span><textarea class="field-input" id="importText" placeholder='{"v":1, ...}'></textarea></label>
            <button class="btn plain" type="button" data-act="importText">Pulihkan dari teks</button>
          </div>
        </details>
      </div>
      <p class="footnote">${inArtifact ? 'Di Claude, data ikut tersinkron ke akunmu jadi bisa dibuka dari HP dan laptop.' : 'Data tersimpan di browser HP ini. Unduh backup sesekali, terutama sebelum ganti HP atau hapus data browser.'}</p>
      ${!inArtifact && !standalone ? '<p class="footnote"><b>Pasang seperti aplikasi:</b> di iPhone buka di Safari → Bagikan → Tambah ke Layar Utama. Di Android: menu Chrome → Tambahkan ke layar utama.</p>' : ''}
    </section>`;

  const reset = `
    <section class="section">
      <button class="btn danger block" type="button" data-act="resetAsk" id="resetAsk">Hapus semua data</button>
      <div class="card glass" id="resetConfirm" hidden>
        <p class="tip"><b>Yakin?</b> Profil, semua centang, catatan, dan riwayat berat akan dihapus dan tidak bisa dikembalikan tanpa backup.</p>
        <div class="btn-row"><button class="btn danger" type="button" data-act="resetYes">Ya, hapus</button><button class="btn plain" type="button" data-act="resetNo">Batal</button></div>
      </div>
      <p class="footnote">Angka di aplikasi ini perkiraan untuk orang dewasa sehat. Kalau punya kondisi medis, konsultasikan dulu dengan dokter.</p>
    </section>`;

  return `
    <div class="title-row"><div><h1 class="large-title">Profil</h1><p class="subtitle">Data ini menentukan target kalori dan protein</p></div></div>
    <div class="split"><div class="col">${form}</div><div class="col">${results}${storage}${reset}</div></div>`;
}

/* ---------- Render ---------- */
const VIEWS = {
  today: ['Hari Ini', viewToday],
  jadwal: ['Jadwal', viewJadwal],
  progres: ['Progres', viewProgres],
  warteg: ['Warteg', viewWarteg],
  profil: ['Profil', viewProfil],
};

function render(animate = false) {
  if (!VIEWS[ui.tab]) ui.tab = 'today';
  const [title, view] = VIEWS[ui.tab];
  const root = $('#view');
  root.innerHTML = view();
  root.classList.toggle('enter', animate);
  $('#navTitle').textContent = title;
  $$('#tabbar [data-tab]').forEach(b => b.setAttribute('aria-current', b.dataset.tab === ui.tab ? 'page' : 'false'));
  if (ui.tab === 'progres') drawChart();
}

function refreshDay() {
  const n = ui.day;
  const score = scoreFor(n);
  const st = statusFor(n);
  $$('#rings .ring-arc').forEach(el => {
    const g = score.groups[el.dataset.g] || { done: 0, total: 1 };
    const pct = g.total ? g.done / g.total : 0;
    const C = +el.dataset.c;
    el.style.strokeDasharray = `${(C * pct).toFixed(2)} ${C.toFixed(2)}`;
    el.style.opacity = pct > 0 ? 1 : 0;
  });
  for (const [g, v] of Object.entries(score.groups)) {
    $$(`[data-gcount="${g}"], [data-glegend="${g}"]`).forEach(el => { el.textContent = `${v.done}/${v.total}`; });
  }
  const pill = $('#dayStatus');
  if (pill) {
    pill.className = `pill st-${st}`;
    pill.firstChild.textContent = `${STATUS[st]} · `;
    $('#dayScore').textContent = `${score.done}/${score.total}`;
  }
}

function goTab(tab) {
  if (!VIEWS[tab]) return;
  ui.tab = tab;
  saveUI();
  render(true);
  window.scrollTo({ top: 0 });
}

function goDay(n) {
  const next = clamp(n, 1, TOTAL);
  if (next === ui.day) return;
  ui.day = next;
  render(true);
}

/* ---------- Aksi ---------- */
let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

function toggleCheck(id, on) {
  const n = ui.day;
  if (n > todayN()) return;
  const c = state.checks[n] || (state.checks[n] = {});
  if (on) c[id] = true; else delete c[id];
  if (!Object.keys(c).length) delete state.checks[n];
  commit();
  refreshDay();
  try { if (on && navigator.vibrate) navigator.vibrate(8); } catch { /* tidak semua HP mendukung */ }
  const s = scoreFor(n);
  if (on && s.done === s.total) toast('Semua target hari ini tercapai!');
}

function saveWeight(date, kgRaw, waistRaw) {
  const kg = parseNum(kgRaw);
  const waist = parseNum(waistRaw);
  if (!isISO(date)) return 'Pilih tanggal dulu.';
  if (!(kg >= 30 && kg <= 250)) return 'Isi berat antara 30 dan 250 kg.';
  if (String(waistRaw || '').trim() && !(waist >= 40 && waist <= 200)) return 'Lingkar perut antara 40 dan 200 cm.';
  const i = state.weights.findIndex(w => w.date === date);
  const entry = { date, kg: Math.round(kg * 10) / 10 };
  const keepWaist = waist >= 40 ? Math.round(waist * 10) / 10 : i >= 0 ? state.weights[i].waist : undefined;
  if (keepWaist) entry.waist = keepWaist;
  if (i >= 0) state.weights[i] = entry; else state.weights.push(entry);
  state.weights.sort((a, b) => a.date.localeCompare(b.date));
  commit();
  return null;
}

function saveProfile(form) {
  const f = new FormData(form);
  const p = {
    nama: String(f.get('nama') || '').trim().slice(0, 40),
    sex: f.get('sex') === 'P' ? 'P' : 'L',
    umur: Math.round(parseNum(f.get('umur'))),
    tinggi: parseNum(f.get('tinggi')),
    berat: Math.round(parseNum(f.get('berat')) * 10) / 10,
    aktivitas: parseNum(f.get('aktivitas')) || 1.55,
  };
  const start = String(f.get('start') || '');
  const errs = [];
  if (!(p.umur >= 13 && p.umur <= 90)) errs.push('Umur 13–90 tahun.');
  if (!(p.tinggi >= 120 && p.tinggi <= 230)) errs.push('Tinggi 120–230 cm.');
  if (!(p.berat >= 30 && p.berat <= 250)) errs.push('Berat 30–250 kg.');
  if (!isISO(start)) errs.push('Isi tanggal mulai program.');
  if (errs.length) { $('#perr').textContent = errs.join(' '); return; }
  const first = !state.profile;
  state.profile = p;
  state.start = start;
  state.restDay = clamp(parseInt(f.get('restDay'), 10) || 0, 0, 6);
  if (!state.weights.length) state.weights.push({ date: start, kg: p.berat });
  commit();
  ui.day = clamp(todayN(), 1, TOTAL);
  render();
  toast(first ? 'Profil tersimpan. Target sudah dihitung.' : 'Profil diperbarui');
}

async function exportBackup() {
  const json = JSON.stringify(state, null, 2);
  const filename = `sixpack60-backup-${iso(new Date())}.json`;
  const c = window.claude;
  if (c && typeof c.use === 'function') {
    const dl = await c.use('downloads').catch(() => null);
    if (!dl) { toast('Unduhan tidak tersedia di sini. Pakai "Salin data".'); return; }
    try { await dl.save({ filename, data: json }); toast('Backup tersimpan'); }
    catch (e) { if (!e || e.code !== 'declined') toast('Gagal mengunduh. Pakai "Salin data".'); }
    return;
  }
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast('Backup diunduh');
}

function copyData() {
  const json = JSON.stringify(state);
  const fallback = () => {
    const box = $('#restore');
    const ta = $('#importText');
    if (box) box.open = true;
    if (ta) { ta.value = json; ta.focus(); ta.select(); }
    toast('Teks backup ditampilkan, salin manual');
  };
  try {
    navigator.clipboard.writeText(json).then(() => toast('Data disalin. Simpan di catatan HP.'), fallback);
  } catch { fallback(); }
}

function importJSON(text) {
  let data;
  try { data = JSON.parse(text); } catch { toast('Format backup tidak dikenali'); return; }
  if (!data || typeof data !== 'object' || !('checks' in data || 'weights' in data || 'profile' in data)) {
    toast('Ini bukan backup Sixpack 60');
    return;
  }
  state = normalize(data);
  commit();
  ui.day = clamp(todayN(), 1, TOTAL);
  render();
  toast('Data dipulihkan');
}

/* ---------- Event ---------- */
document.addEventListener('click', e => {
  const tabBtn = e.target.closest('[data-tab]');
  if (tabBtn) { goTab(tabBtn.dataset.tab); return; }
  const dayBtn = e.target.closest('[data-day]');
  if (dayBtn) { ui.day = +dayBtn.dataset.day; goTab('today'); return; }
  const patBtn = e.target.closest('[data-pattern]');
  if (patBtn) {
    state.pattern = patBtn.dataset.pattern;
    commit();
    render();
    toast('Pola makan: ' + patternOf().short);
    return;
  }
  const gradeBtn = e.target.closest('[data-grade]');
  if (gradeBtn) { ui.foodGrade = gradeBtn.dataset.grade; saveUI(); render(); return; }
  const act = e.target.closest('[data-act]');
  if (!act) return;
  switch (act.dataset.act) {
    case 'prev': goDay(ui.day - 1); break;
    case 'next': goDay(ui.day + 1); break;
    case 'goToday': goDay(todayN()); break;
    case 'delWeight':
      state.weights = state.weights.filter(w => w.date !== act.dataset.date);
      commit(); render(); toast('Data berat dihapus');
      break;
    case 'export': exportBackup(); break;
    case 'copy': copyData(); break;
    case 'importText': importJSON($('#importText').value); break;
    case 'resetAsk': $('#resetConfirm').hidden = false; $('#resetAsk').hidden = true; break;
    case 'resetNo': $('#resetConfirm').hidden = true; $('#resetAsk').hidden = false; break;
    case 'resetYes':
      state = defaultState();
      commit();
      ui.day = 1;
      goTab('today');
      toast('Semua data dihapus');
      break;
  }
});

document.addEventListener('change', e => {
  const el = e.target;
  if (el.matches('[data-check]')) { toggleCheck(el.dataset.check, el.checked); return; }
  if (el.id === 'importFile' && el.files && el.files[0]) {
    const reader = new FileReader();
    reader.onload = () => importJSON(String(reader.result));
    reader.onerror = () => toast('File tidak bisa dibaca');
    reader.readAsText(el.files[0]);
    el.value = '';
  }
});

const saveNote = debounce((n, text) => {
  const v = text.trim();
  if (v) state.notes[n] = text.slice(0, 2000); else delete state.notes[n];
  commit();
}, 600);

document.addEventListener('input', e => {
  if (e.target.matches('[data-note]')) saveNote(ui.day, e.target.value);
});

document.addEventListener('submit', e => {
  const form = e.target.closest('[data-form]');
  if (!form) return;
  e.preventDefault();
  switch (form.dataset.form) {
    case 'profile': saveProfile(form); break;
    case 'quickWeight': {
      const err = saveWeight(iso(dateOf(ui.day)), $('#qkg').value, '');
      if (err) { $('#qerr').textContent = err; return; }
      $('#qerr').textContent = '';
      $('#qkg').blur();
      toast('Berat tersimpan');
      break;
    }
    case 'weight': {
      const err = saveWeight($('#wdate').value, $('#wkg').value, $('#wwaist').value);
      if (err) { $('#werr').textContent = err; return; }
      render();
      toast('Berat tersimpan');
      break;
    }
  }
});

// Geser kartu hari untuk pindah hari
let touch = null;
document.addEventListener('touchstart', e => {
  if (!e.target.closest('#hero') || e.touches.length !== 1) { touch = null; return; }
  touch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}, { passive: true });
document.addEventListener('touchend', e => {
  if (!touch) return;
  const dx = e.changedTouches[0].clientX - touch.x;
  const dy = e.changedTouches[0].clientY - touch.y;
  touch = null;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) goDay(ui.day + (dx < 0 ? 1 : -1));
}, { passive: true });

const navbar = $('#navbar');
const onScroll = () => navbar.classList.toggle('scrolled', window.scrollY > 24);
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', debounce(() => { if (ui.tab === 'progres') drawChart(); }, 150));

// Ganti hari otomatis kalau aplikasi dibiarkan terbuka sampai lewat tengah malam
let lastToday = todayN();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  const t = todayN();
  if (t !== lastToday) {
    if (ui.day === clamp(lastToday, 1, TOTAL)) ui.day = clamp(t, 1, TOTAL);
    lastToday = t;
    render();
  }
});

/* ---------- Mulai ---------- */
$('#tabbar').innerHTML = Object.entries(VIEWS).map(([id, [label]]) => `<button class="tab" type="button" data-tab="${id}">${ICON[id]}<span>${label}</span></button>`).join('');
setSync(syncState);
render();
onScroll();
initCloud();
