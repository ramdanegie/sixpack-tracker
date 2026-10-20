# Sixpack 60 Hari

Prototipe aplikasi jadwal 60 hari menuju sixpack, mobile-first dengan tampilan kaca ala iOS.

- **Menu warteg murah**: 7 menu bergilir (±Rp45.000/hari) lengkap dengan kalori, protein, dan harga per lauk. Porsi nasi dan lauk otomatis disesuaikan dengan target kalori dan protein kamu.
- **Program gym 3 fase**: Fondasi (hari 1–21), Bakar Lemak (22–42), Definisi (43–60). Split Upper/Lower + sirkuit perut + kardio, 6 hari latihan dan 1 hari istirahat aktif.
- **Checklist harian**: makan, protein, bebas gorengan, latihan, perut, langkah, air, tidur. Hari dianggap *tercapai* kalau ≥ 80% dicentang. Progres tampil sebagai cincin Makan / Gerak / Pulih.
- **Jadwal 60 hari**: kalender per fase dengan status tiap hari (tercapai, sebagian, tidak tercapai), streak, dan rata-rata.
- **Berat & tinggi badan**: hitung BMI (kategori Kemenkes), kebutuhan kalori (Mifflin-St Jeor, defisit ±20%), protein 1,6 g/kg, air, perkiraan lemak tubuh, target realistis 60 hari, dan grafik berat.
- **Tersimpan otomatis** di browser (localStorage). Ada backup `.json` dan pulihkan dari file atau teks.

## Teknologi

HTML + CSS + JavaScript biasa. Tanpa framework, tanpa build, tanpa server.

```
index.html            kerangka halaman
style.css             tema kaca iOS (terang & gelap otomatis)
data.js               data menu warteg, latihan, fase, checklist  ← ubah harga/menu di sini
app.js                logika, perhitungan, penyimpanan
manifest.webmanifest  supaya bisa dipasang di layar utama HP
```

## Cara pakai

**Paling cepat:** buka `index.html` langsung di browser.

**Di HP (disarankan):** aktifkan GitHub Pages: repo → *Settings* → *Pages* → *Deploy from a branch* → pilih branch dan folder `/ (root)`. Buka link-nya di HP, lalu:

- iPhone: Safari → Bagikan → **Tambah ke Layar Utama**
- Android: menu Chrome → **Tambahkan ke layar utama**

Aplikasi akan terbuka layar penuh seperti app biasa.

**Jalankan lokal:**

```bash
python3 -m http.server 8000
# buka http://localhost:8000
```

## Penyimpanan data

Data tersimpan di browser perangkat yang dipakai. Kalau ganti HP atau menghapus data browser, data hilang. Jadi tekan **Profil → Unduh backup** sesekali, dan **Pulihkan dari backup** di perangkat baru.

## Catatan

Angka kalori, protein, dan harga adalah perkiraan per porsi warteg kota besar. Perkiraan lemak tubuh dihitung dari BMI dan bisa meleset ±5%. Untuk orang dewasa sehat; kalau punya kondisi medis, konsultasikan dulu ke dokter.
