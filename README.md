# Sixpack 60 Hari

Prototipe aplikasi jadwal 60 hari menuju sixpack, mobile-first dengan tampilan kaca ala iOS.

- **4 pilihan pola makan**, semuanya memenuhi target protein harian. Jumlah telur dan porsi nasi dihitung otomatis dari berat badanmu:

  | Pola | Isi | Contoh (70 kg) |
  |---|---|---|
  | Warteg 3× + camilan | Menu warteg bergilir: ayam, ikan, telur, tempe, tahu | ±5 telur, ±Rp54.500/hari |
  | 2× makan · Telur saja | Nasi, sayur, telur rebus | ±16 telur, ±Rp41.500/hari |
  | 2× makan · Hemat | Telur + tempe/tahu masak sendiri | ±7 telur, ±Rp33.500/hari |
  | 2× makan · Sedang | Ayam/ikan + tempe/tahu dari warteg | ±6 telur, ±Rp54.500/hari |

  Pilih di tab **Warteg → Pola makan**. Kalau telur lebih dari 6 butir sehari, aplikasi mengingatkan untuk cek kolesterol.
- **Program gym 3 fase**: Fondasi (hari 1–21), Bakar Lemak (22–42), Definisi (43–60). Beban, repetisi, dan kardio naik tiap fase. Pilih program di tab **Jadwal**:
  - **Push/Pull/Push · 3–4×** (bawaan): Push Bahu, Pull Punggung, Push Dada, masing-masing + 1 latihan kaki. Leg day di hari ke-4 opsional; kalau dilewati, ganti jalan 45 menit dan tetap dihitung tercapai. Hari lain kardio & perut.
  - **Upper/Lower · 6×**: 4 hari beban, 1 hari kardio, 1 sirkuit full body.
- **Checklist harian**: makan, protein, bebas gorengan, latihan, perut, langkah, air, tidur. Hari dianggap *tercapai* kalau ≥ 80% dicentang. Progres tampil sebagai cincin Makan / Gerak / Pulih.
- **Jadwal 60 hari**: kalender per fase dengan status tiap hari (tercapai, sebagian, tidak tercapai), streak, dan rata-rata.
- **Berat & tinggi badan**: hitung BMI (kategori Kemenkes), kebutuhan kalori (Mifflin-St Jeor, defisit ±20%), protein 1,6 g/kg, air, perkiraan lemak tubuh, target realistis 60 hari, dan grafik berat.
- **Tersimpan otomatis** di browser, dan kalau dideploy ke Vercel juga ke **database Turso (SQLite)** yang dikunci **PIN**, jadi bisa dibuka dari beberapa HP. Ada backup `.json` dan pulihkan dari file atau teks.

## Teknologi

Tampilan: HTML + CSS + JavaScript biasa, tanpa framework dan tanpa build.
Database (opsional): satu fungsi Vercel (Node.js) + [Turso](https://turso.tech), yaitu SQLite di cloud.

```
index.html            kerangka halaman
style.css             tema kaca iOS (terang & gelap otomatis)
data.js               data menu warteg, latihan, fase, checklist  ← ubah harga/menu di sini
app.js                logika, perhitungan, penyimpanan, sinkron
manifest.webmanifest  supaya bisa dipasang di layar utama HP
api/state.js          GET/PUT /api/state, dikunci PIN (APP_PIN)
api/_db.js            koneksi Turso, tabel SQLite, baca/tulis data
package.json          dependensi @libsql/client
```

## Deploy ke Vercel + database Turso

**1. Deploy aplikasinya**

1. Buka [vercel.com/new](https://vercel.com/new), login dengan GitHub, lalu **Import** repo ini.
2. Framework Preset: **Other**. Build Command dan Output Directory biarkan kosong.
3. Tekan **Deploy**. Setiap push ke branch produksi (default `main`) otomatis ter-deploy ulang.

Sampai di sini aplikasi sudah jalan, data masih tersimpan di HP saja.

**2. Sambungkan database Turso**

- Cara mudah: di project Vercel buka tab **Storage** → **Create Database** / Marketplace → pilih **Turso** → buat database → hubungkan ke project ini. Vercel otomatis menambah `TURSO_DATABASE_URL` dan `TURSO_AUTH_TOKEN`.
- Atau manual dengan [Turso CLI](https://docs.turso.tech/cli/introduction):

  ```bash
  turso db create sixpack60
  turso db show sixpack60 --url      # → TURSO_DATABASE_URL
  turso db tokens create sixpack60   # → TURSO_AUTH_TOKEN
  ```

  lalu isi keduanya di Vercel → **Settings → Environment Variables**.

**3. Buat PIN**

Di Vercel → **Settings → Environment Variables**, tambahkan `APP_PIN` berisi minimal 6 karakter (misalnya 6 angka yang tidak gampang ditebak). Lalu **Deployments → ⋯ → Redeploy** supaya variabelnya terbaca.

**4. Pakai**

Buka link Vercel di HP, masukkan PIN sekali. Tabel dibuat otomatis saat pertama dipakai. Setelah itu data tersinkron ke database dan bisa dibuka dari HP atau laptop lain dengan PIN yang sama.

Keamanan: PIN dicek di server, 10 kali PIN salah dari satu IP dikunci 15 menit. Jangan bagikan link + PIN ke orang lain.

Lihat isi database: dashboard Turso, atau `turso db shell sixpack60 "SELECT * FROM weights"`. Tabelnya: `meta`, `profile`, `checks`, `notes`, `weights`.

## Cara pakai lain

**Tanpa server:** buka `index.html` langsung di browser, atau aktifkan GitHub Pages (repo → *Settings* → *Pages* → *Deploy from a branch*). Data hanya tersimpan di browser.

**Pasang di HP seperti aplikasi:**

- iPhone: Safari → Bagikan → **Tambah ke Layar Utama**
- Android: menu Chrome → **Tambahkan ke layar utama**

**Jalankan lokal dengan database:** `npm install`, lalu `npx vercel dev` dengan `TURSO_DATABASE_URL=file:local.db` dan `APP_PIN` di file `.env`.

## Penyimpanan data

- **Dengan Turso (Vercel):** tersimpan di database dan di HP sebagai cadangan offline. Kalau offline, perubahan dikirim saat online lagi. Kalau dua HP mengubah data, versi yang terakhir disimpan yang dipakai.
- **Tanpa server:** tersimpan di browser perangkat itu saja. Tekan **Profil → Unduh backup** sesekali, dan **Pulihkan dari backup** di perangkat baru.

## Catatan

Angka kalori, protein, dan harga adalah perkiraan per porsi warteg kota besar. Perkiraan lemak tubuh dihitung dari BMI dan bisa meleset ±5%. Untuk orang dewasa sehat; kalau punya kondisi medis, konsultasikan dulu ke dokter.
