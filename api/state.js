// GET /api/state  → ambil semua data
// PUT /api/state  → simpan semua data { state }
// Wajib header x-pin yang cocok dengan APP_PIN. 10 PIN salah dari satu IP = dikunci 15 menit.
import { createHash, timingSafeEqual } from 'node:crypto';
import { db, readState, readUpdatedAt, sanitize, writeState } from './_db.js';

const MAX_FAILS = 10;
const LOCK_MS = 15 * 60 * 1000;
const MAX_BODY = 1024 * 1024;

const sha = v => createHash('sha256').update(String(v)).digest();

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

function clientIp(req) {
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0];
  return String(req.headers['x-real-ip'] || fwd || req.socket?.remoteAddress || 'unknown').trim().slice(0, 64);
}

function givenPin(req) {
  const raw = req.headers['x-pin'];
  if (typeof raw !== 'string' || !raw) return '';
  try { return decodeURIComponent(raw); } catch { return ''; }
}

async function checkPin(c, req) {
  const ip = clientIp(req);
  const now = Date.now();
  const { rows } = await c.execute({ sql: 'SELECT fails, first_at FROM pin_attempts WHERE ip = ?', args: [ip] });
  const row = rows[0];
  const recent = row && now - Number(row.first_at) < LOCK_MS;
  if (recent && Number(row.fails) >= MAX_FAILS) return 'limited';

  const pin = givenPin(req);
  if (pin && timingSafeEqual(sha(pin), sha(process.env.APP_PIN))) {
    if (row) await c.execute({ sql: 'DELETE FROM pin_attempts WHERE ip = ?', args: [ip] });
    return 'ok';
  }
  await c.execute(recent
    ? { sql: 'UPDATE pin_attempts SET fails = fails + 1 WHERE ip = ?', args: [ip] }
    : { sql: 'INSERT INTO pin_attempts (ip, fails, first_at) VALUES (?, 1, ?) ON CONFLICT(ip) DO UPDATE SET fails = 1, first_at = excluded.first_at', args: [ip, now] });
  return 'denied';
}

async function readBody(req) {
  if (req.body !== undefined) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new Error('too_large');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || 'null');
}

export default async function handler(req, res) {
  if (!process.env.TURSO_DATABASE_URL) {
    return send(res, 503, { error: 'not_configured', message: 'Database belum diatur. Isi TURSO_DATABASE_URL dan TURSO_AUTH_TOKEN di Vercel.' });
  }
  if (String(process.env.APP_PIN || '').length < 6) {
    return send(res, 503, { error: 'not_configured', message: 'APP_PIN belum diatur di Vercel atau kurang dari 6 karakter.' });
  }
  if (req.method !== 'GET' && req.method !== 'PUT') {
    res.setHeader('Allow', 'GET, PUT');
    return send(res, 405, { error: 'method_not_allowed' });
  }

  let c;
  try {
    c = await db();
  } catch (err) {
    console.error('db connect', err);
    return send(res, 502, { error: 'db_unavailable', message: 'Database tidak bisa dihubungi.' });
  }

  try {
    const pin = await checkPin(c, req);
    if (pin === 'limited') return send(res, 429, { error: 'too_many_attempts', message: 'Terlalu banyak PIN salah. Coba lagi 15 menit lagi.' });
    if (pin !== 'ok') return send(res, 401, { error: 'bad_pin', message: 'PIN salah.' });

    if (req.method === 'GET') return send(res, 200, { state: await readState(c) });

    let body;
    try { body = await readBody(req); } catch { return send(res, 400, { error: 'bad_json', message: 'Data tidak bisa dibaca.' }); }
    const next = sanitize(body && body.state);
    if (!next) return send(res, 400, { error: 'bad_state', message: 'Format data tidak valid.' });

    const storedAt = await readUpdatedAt(c);
    if (storedAt !== null && storedAt > next.updatedAt) {
      return send(res, 409, { error: 'stale', message: 'Ada data lebih baru dari perangkat lain.', state: await readState(c) });
    }
    await writeState(c, next);
    return send(res, 200, { ok: true, updatedAt: next.updatedAt });
  } catch (err) {
    console.error('state', err);
    return send(res, 500, { error: 'server_error', message: 'Gagal memproses data.' });
  }
}
