// Koneksi Turso (SQLite di cloud), skema tabel, dan baca/tulis data aplikasi.
// File berawalan "_" tidak dijadikan endpoint oleh Vercel.
import { createClient } from '@libsql/client';

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS profile (
     id INTEGER PRIMARY KEY CHECK (id = 1),
     nama TEXT, sex TEXT, umur INTEGER, tinggi REAL, berat REAL, aktivitas REAL)`,
  `CREATE TABLE IF NOT EXISTS checks (day INTEGER NOT NULL, item TEXT NOT NULL, PRIMARY KEY (day, item))`,
  `CREATE TABLE IF NOT EXISTS notes (day INTEGER PRIMARY KEY, text TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS weights (date TEXT PRIMARY KEY, kg REAL NOT NULL, waist REAL)`,
  `CREATE TABLE IF NOT EXISTS pin_attempts (ip TEXT PRIMARY KEY, fails INTEGER NOT NULL, first_at INTEGER NOT NULL)`,
];

let client;
let ready;

export function db() {
  if (!client) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  if (!ready) ready = client.batch(SCHEMA, 'write').catch(err => { ready = null; throw err; });
  return ready.then(() => client);
}

const ID = /^[a-z0-9_]{1,24}$/;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const TOTAL_DAYS = 60;

function num(v, lo, hi) {
  const n = Number(v);
  return v !== null && v !== '' && Number.isFinite(n) && n >= lo && n <= hi ? n : null;
}

function dayOf(key) {
  const d = Number(key);
  return Number.isInteger(d) && d >= 1 && d <= TOTAL_DAYS ? d : null;
}

// Bersihkan data dari aplikasi sebelum disimpan. Mengembalikan null kalau bentuknya salah.
export function sanitize(s) {
  if (!s || typeof s !== 'object' || Array.isArray(s) || !ISO.test(s.start)) return null;
  const out = {
    v: 1,
    start: s.start,
    restDay: Number.isInteger(s.restDay) && s.restDay >= 0 && s.restDay <= 6 ? s.restDay : 0,
    pattern: typeof s.pattern === 'string' && ID.test(s.pattern) ? s.pattern : 'warteg3',
    program: typeof s.program === 'string' && ID.test(s.program) ? s.program : 'ppp',
    profile: null,
    checks: {},
    notes: {},
    weights: [],
    updatedAt: Math.floor(num(s.updatedAt, 0, 8.64e15) ?? 0),
  };

  const p = s.profile;
  if (p && typeof p === 'object') {
    const umur = num(p.umur, 10, 100);
    const tinggi = num(p.tinggi, 100, 250);
    const berat = num(p.berat, 20, 400);
    if (umur && tinggi && berat) {
      out.profile = {
        nama: String(p.nama ?? '').slice(0, 40),
        sex: p.sex === 'P' ? 'P' : 'L',
        umur: Math.round(umur),
        tinggi,
        berat,
        aktivitas: num(p.aktivitas, 1, 2.5) ?? 1.55,
      };
    }
  }

  if (s.checks && typeof s.checks === 'object') {
    for (const [key, items] of Object.entries(s.checks)) {
      const day = dayOf(key);
      if (!day || !items || typeof items !== 'object') continue;
      const done = Object.keys(items).filter(k => ID.test(k) && items[k] === true).slice(0, 30);
      if (done.length) out.checks[day] = Object.fromEntries(done.map(k => [k, true]));
    }
  }

  if (s.notes && typeof s.notes === 'object') {
    for (const [key, text] of Object.entries(s.notes)) {
      const day = dayOf(key);
      if (day && typeof text === 'string' && text.trim()) out.notes[day] = text.slice(0, 2000);
    }
  }

  if (Array.isArray(s.weights)) {
    const byDate = new Map();
    for (const w of s.weights.slice(0, 1000)) {
      if (!w || !ISO.test(w.date)) continue;
      const kg = num(w.kg, 20, 400);
      if (!kg) continue;
      const waist = num(w.waist, 30, 250);
      byDate.set(w.date, waist ? { date: w.date, kg, waist } : { date: w.date, kg });
    }
    out.weights = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  }
  return out;
}

export async function readUpdatedAt(c) {
  const { rows } = await c.execute(`SELECT value FROM meta WHERE key = 'updatedAt'`);
  return rows.length ? Number(rows[0].value) : null;
}

export async function readState(c) {
  const [meta, profile, checks, notes, weights] = await c.batch([
    'SELECT key, value FROM meta',
    'SELECT nama, sex, umur, tinggi, berat, aktivitas FROM profile WHERE id = 1',
    'SELECT day, item FROM checks ORDER BY day',
    'SELECT day, text FROM notes ORDER BY day',
    'SELECT date, kg, waist FROM weights ORDER BY date',
  ], 'read');
  const m = Object.fromEntries(meta.rows.map(r => [r.key, r.value]));
  if (!m.start) return null;

  const state = {
    v: 1,
    start: m.start,
    restDay: Number(m.restDay) || 0,
    pattern: m.pattern || 'warteg3',
    program: m.program || 'ppp',
    profile: null,
    checks: {},
    notes: {},
    weights: [],
    updatedAt: Number(m.updatedAt) || 0,
  };
  const p = profile.rows[0];
  if (p) {
    state.profile = { nama: p.nama || '', sex: p.sex, umur: Number(p.umur), tinggi: Number(p.tinggi), berat: Number(p.berat), aktivitas: Number(p.aktivitas) };
  }
  for (const r of checks.rows) (state.checks[r.day] = state.checks[r.day] || {})[r.item] = true;
  for (const r of notes.rows) state.notes[r.day] = r.text;
  state.weights = weights.rows.map(r => (r.waist == null ? { date: r.date, kg: Number(r.kg) } : { date: r.date, kg: Number(r.kg), waist: Number(r.waist) }));
  return state;
}

// INSERT banyak baris sekaligus, dipecah per 200 baris.
function bulkInsert(table, cols, rows) {
  const out = [];
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const marks = chunk.map(() => `(${cols.map(() => '?').join(', ')})`).join(', ');
    out.push({ sql: `INSERT INTO ${table} (${cols.join(', ')}) VALUES ${marks}`, args: chunk.flat() });
  }
  return out;
}

// Ganti seluruh data dengan versi terbaru dalam satu transaksi.
export async function writeState(c, s) {
  const meta = { start: s.start, restDay: s.restDay, pattern: s.pattern, program: s.program, updatedAt: s.updatedAt };
  const stmts = [
    'DELETE FROM checks',
    'DELETE FROM notes',
    'DELETE FROM weights',
    'DELETE FROM profile',
    ...Object.entries(meta).map(([key, value]) => ({
      sql: 'INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      args: [key, String(value)],
    })),
  ];
  if (s.profile) {
    const p = s.profile;
    stmts.push({
      sql: 'INSERT INTO profile (id, nama, sex, umur, tinggi, berat, aktivitas) VALUES (1, ?, ?, ?, ?, ?, ?)',
      args: [p.nama, p.sex, p.umur, p.tinggi, p.berat, p.aktivitas],
    });
  }
  const checkRows = Object.entries(s.checks).flatMap(([day, items]) => Object.keys(items).map(item => [Number(day), item]));
  stmts.push(...bulkInsert('checks', ['day', 'item'], checkRows));
  stmts.push(...bulkInsert('notes', ['day', 'text'], Object.entries(s.notes).map(([day, text]) => [Number(day), text])));
  stmts.push(...bulkInsert('weights', ['date', 'kg', 'waist'], s.weights.map(w => [w.date, w.kg, w.waist ?? null])));
  await c.batch(stmts, 'write');
}
