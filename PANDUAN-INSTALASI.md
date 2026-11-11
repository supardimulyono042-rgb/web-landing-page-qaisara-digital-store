# Panduan Instalasi — QAISARA DIGITAL STORE (GAS + GitHub Pages)

Arsitektur: **Frontend** di GitHub Pages → `fetch()` → **Backend** Google Apps Script (JSON) → Google Sheets & Drive.

---

## BAGIAN A — Backend (Google Apps Script)

> Sudah punya proyek Apps Script dari versi sebelumnya? **Pakai proyek yang sama** supaya data produk, gambar, dan akun admin tetap utuh, dan URL `/exec` tidak berubah. (Kalau memulai dari nol, buat proyek baru di https://script.google.com.)

1. Buka proyek Apps Script → buka file `Kode` → **hapus isinya**, tempel seluruh isi `Kode.gs` yang baru.
2. **Hapus** file lama `Index`, `Stylesheet`, dan `JavaScript` (klik ⋮ di samping nama file → Remove). Backend sekarang hanya `Kode.gs`.
3. *(Hanya instalasi baru)* Pilih fungsi `setupAppEnvironment` → ▶ Run → izinkan akses. Sandi admin sementara muncul di Execution Log. **Jangan jalankan lagi** kalau data sudah ada.
4. **Deploy → Manage deployments** → ikon pensil → **Version: New version** → Deploy.
   - Instalasi baru: **Deploy → New deployment → Web app**.
   - Pengaturan wajib: **Execute as: Me** • **Who has access: Anyone**.
5. **Salin URL Web App** yang berakhiran `/exec`.
6. Uji: buka `URL/exec?action=ping` di browser. Harus tampil JSON berisi `"success":true`.

## BAGIAN B — Siapkan frontend

1. Ekstrak `qaisara-frontend.zip`. Folder hasil ekstraksi (isinya `index.html`, `css`, `js`) **adalah folder proyek** — jangan dibungkus folder lain.
2. Buka `js/config.js` dengan Notepad, ganti `ISI_URL_EXEC_ANDA` sehingga seluruh URL = URL `/exec` dari langkah A5. Simpan.

## BAGIAN C — Deploy ke GitHub Pages

Lakukan **satu langkah setiap kali**, dan periksa hasilnya sebelum lanjut.

**C1. Pasang Git** — Windows: https://git-scm.com/download/win (pengaturan default). Buka **PowerShell**, cek:
```
git --version
```

**C2. Akun GitHub** — daftar di https://github.com (username jadi bagian alamat situs: `username.github.io`).

**C3. Identitas Git (sekali saja):**
```
git config --global user.name "Nama Anda"
git config --global user.email "email-akun-github@contoh.com"
```

**C4. Buat repository** — github.com → **+** → **New repository** → nama, mis. `qaisara-store` → **Public** → **jangan centang** README/.gitignore/license → Create.

**C5. Masuk ke folder proyek & cek isinya** — di File Explorer buka folder hasil ekstrak, klik address bar, ketik `powershell`, Enter. Lalu:
```
dir
```
Wajib terlihat `index.html`, folder `css`, dan folder `js`. Kalau yang terlihat justru folder lain (mis. `frontend`), Anda satu level terlalu tinggi — masuk dulu ke dalamnya. **Jangan lanjut sebelum `index.html` terlihat.**

**C6. Push pertama** (satu per satu):
```
git init
git add .
git commit -m "Upload pertama"
git branch -M main
git remote add origin https://github.com/USERNAME/qaisara-store.git
git push -u origin main
```
Ganti `USERNAME` dengan username GitHub Anda. Saat diminta *Password*, tempel **Personal Access Token** (bukan password akun) — layar tampak kosong saat paste, itu normal.

**C7. Buat token** (kalau diminta): https://github.com/settings/tokens → Generate new token (classic) → centang **repo** → Generate → salin `ghp_...` (hanya tampil sekali).

**C8. Aktifkan Pages** — repo → **Settings → Pages** → Source: **Deploy from a branch** → Branch **main** / **(root)** → Save. Tunggu 1–2 menit, alamat tampil: `https://USERNAME.github.io/qaisara-store/`.

## BAGIAN D — Update berikutnya

Setiap mengubah file frontend, dari folder proyek:
```
git add .
git commit -m "Deskripsi perubahan"
git push
```
Muat ulang situs dengan **Ctrl+Shift+R**. Mengubah `Kode.gs` = tempel ulang di Apps Script lalu **Deploy → New version** (URL tetap sama, frontend tak perlu diubah).

## Uji akhir
1. Etalase tampil dengan produk dan logo.
2. Klik Beli → membuka Lynk.id di tab baru; klik WhatsApp → chat berisi nama produk.
3. Footer → Masuk Admin → login → tambah produk → muncul di etalase.
4. Chrome DevTools (F12) → Console/Network: tidak ada error merah.

## Masalah umum
| Gejala | Solusi |
|---|---|
| Situs 404 | `index.html` tidak di root repo. Buka repo di GitHub: harus terlihat `index.html`, `css`, `js` di tingkat paling atas |
| Tanpa styling | Folder `css/` atau `js/` tidak ikut ter-push (jangan pakai "Upload files" di web GitHub) |
| Toast "GAS_URL belum diisi" | Isi `js/config.js`, lalu add/commit/push |
| "Respons server tidak valid" | Deployment GAS belum "Anyone" / belum New version / URL salah |
| "Tidak dapat terhubung" | URL salah atau koneksi bermasalah; uji `…/exec?action=ping` |
| Tampil versi lama | Ctrl+Shift+R atau jendela Incognito |
| `Password authentication is not supported` | Pakai Personal Access Token (C7) |
| Lupa sandi admin | Jalankan `resetAksesAdmin()` dari editor Apps Script, lihat Execution Log |
