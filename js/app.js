(function () {
'use strict';
/* ───────── Util ───────── */
const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => [...(r || document).querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rp = n => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
const store = (w) => ({ get(k, d) { try { const v = w.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { w.setItem(k, JSON.stringify(v)); } catch (e) {} }, del(k) { try { w.removeItem(k); } catch (e) {} } });
let LS, SS; try { LS = store(localStorage); SS = store(sessionStorage); } catch (e) { const m = {}; LS = SS = { get: (k, d) => k in m ? m[k] : d, set: (k, v) => { m[k] = v; }, del: k => { delete m[k]; } }; }
/* Jembatan ke backend GAS (REST/JSON) — lihat js/api.js */
const run = (fn, ...a) => ({
  getPublicData: () => GasAPI.get('getPublic'),
  getLanding: id => GasAPI.get('getLanding', { id }),
  adminLogin: (u, p) => GasAPI.post({ action: 'login', username: u, password: p }),
  adminApi: (token, action, data) => GasAPI.post({ action, token, data: data || {} })
}[fn])(...a);
const IDC = { Produk: 'ID_Produk', Kategori: 'ID_Kategori', Banner: 'ID_Banner', Testimoni: 'ID' };
const ur = (a, b) => (Number(a.Urutan) || 0) - (Number(b.Urutan) || 0);
const DEF = { Nama_Toko: 'QAISARA DIGITAL STORE', Tagline: '', Warna_Utama: '#0B1F3A', Warna_Aksen: '#C9A24B', Nomor_WhatsApp: '', Pesan_WA_Default: 'Halo, saya tertarik dengan [NAMA_PRODUK]', Teks_Hero: 'Koleksi Produk Digital Premium', Teks_Footer: '', Jam_Layanan: '' };

const S = { pub: LS.get('qs_pub', null), adm: null, token: SS.get('qs_tok', null), view: 'home', cat: 'all', q: '', sort: 'default', pid: null, gi: 0, sec: 'dash', aq: {}, sl: 0, tm: null, pend: 0 };
const app = $('#app');
const st = () => Object.assign({}, DEF, (S.pub && S.pub.settings) || {});
const P = () => S.pub || { produk: [], kategori: [], banner: [], testimoni: [], settings: {} };

/* ───────── Tema, toast, modal ───────── */
document.documentElement.dataset.theme = LS.get('qs_theme', 'light');
function applyBrand() { const s = st(), r = document.documentElement.style; r.setProperty('--brand', s.Warna_Utama); r.setProperty('--gold', s.Warna_Aksen); r.setProperty('--ratio', s.Rasio_Gambar === '4:3' ? '4 / 3' : '1 / 1'); document.title = s.Nama_Toko; }
function toast(msg, type, ms) { const d = document.createElement('div'); d.className = 'toast ' + (type || ''); d.innerHTML = (type === 'wait' ? '<span class="spin"></span>' : '') + '<span>' + esc(msg) + '</span>'; $('#toasts').appendChild(d); setTimeout(() => d.remove(), ms || (type === 'err' ? 5000 : 2200)); return d; }
function modal(html, onClose) { $('#modal-root').innerHTML = '<div class="ov" data-a="ovx"><div class="mdl" role="dialog" aria-modal="true">' + html + '</div></div>'; S.mc = onClose; const f = $('#modal-root input,#modal-root textarea,#modal-root select'); if (f) setTimeout(() => f.focus(), 30); }
function closeModal() { $('#modal-root').innerHTML = ''; if (S.mc) S.mc(); S.mc = null; }
function ask(msg, okLabel) { return new Promise(res => { modal('<div class="mdl-h"><h3>Konfirmasi</h3></div><div class="mdl-b">' + esc(msg) + '</div><div class="mdl-f"><button class="btn btn-ghost" data-a="x" id="cn">Batal</button><button class="btn btn-danger" id="ok">' + (okLabel || 'Ya, lanjutkan') + '</button></div>'); $('#cn').onclick = () => { closeModal(); res(false); }; $('#ok').onclick = () => { closeModal(); res(true); }; }); }

/* ───────── Komponen umum ───────── */
const img = (u, alt, ic) => u ? '<img src="' + esc(u) + '" alt="' + esc(alt || '') + '" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement(\'div\'),{className:\'ph\',innerHTML:\'<i class=&quot;bi bi-image&quot;></i>\'}))">' : '<div class="ph"><i class="bi bi-' + (ic || 'box-seam') + '"></i></div>';
const katIcon = n => { const k = P().kategori.find(x => x.Nama_Kategori === n); return k ? k.Ikon : 'box-seam'; };
const waNum = () => String(st().Nomor_WhatsApp || '').replace(/\D/g, '');
const waLink = p => 'https://wa.me/' + waNum() + '?text=' + encodeURIComponent(String(st().Pesan_WA_Default).replace('[NAMA_PRODUK]', p ? p.Nama : 'produk Anda'));
const stars = n => '★'.repeat(n) + '☆'.repeat(5 - n);
const disc = p => p.Harga_Coret && Number(p.Harga_Coret) > Number(p.Harga) ? Math.round((1 - p.Harga / p.Harga_Coret) * 100) : 0;
const initials = n => String(n).split(' ').slice(0, 2).map(x => x[0]).join('').toUpperCase();

/* ═════════════ ETALASE PUBLIK ═════════════ */
function filtered() {
  let a = P().produk.slice();
  if (S.cat !== 'all') a = a.filter(p => p.Kategori === S.cat);
  const q = S.q.trim().toLowerCase(); if (q) a = a.filter(p => [p.Nama, p.Deskripsi_Singkat, p.Kategori].join(' ').toLowerCase().includes(q));
  if (S.sort === 'new') a.sort((x, y) => String(y.Tgl_Dibuat).localeCompare(String(x.Tgl_Dibuat)));
  if (S.sort === 'low') a.sort((x, y) => x.Harga - y.Harga);
  if (S.sort === 'high') a.sort((x, y) => y.Harga - x.Harga);
  return a;
}
function card(p) {
  const d = disc(p);
  return '<article class="card pcard"><div class="pimg" data-a="detail" data-id="' + esc(p.ID_Produk) + '">' + img(p.URL_Gambar_Utama, p.Nama, katIcon(p.Kategori)) + (p.Label ? '<span class="badge">' + esc(p.Label) + '</span>' : '') + '</div>' +
    '<div class="pbody"><span class="pcat">' + esc(p.Kategori) + '</span><h3 class="pname" data-a="detail" data-id="' + esc(p.ID_Produk) + '">' + esc(p.Nama) + '</h3><p class="pdesc">' + esc(p.Deskripsi_Singkat) + '</p>' +
    '<div><span class="price">' + rp(p.Harga) + '</span>' + (d ? '<span class="strike">' + rp(p.Harga_Coret) + '</span> <span class="badge green">-' + d + '%</span>' : '') + '</div>' +
    '<div class="pact"><button class="btn btn-ghost" data-a="detail" data-id="' + esc(p.ID_Produk) + '">Lihat Detail</button><a class="btn btn-gold" href="' + esc(p.Link_Lynk) + '" target="_blank" rel="noopener">Beli</a></div></div></article>';
}
function gridHtml() { const a = filtered(); return a.length ? a.map(card).join('') : '<div class="empty"><i class="bi bi-search"></i>Produk tidak ditemukan. Coba kata kunci atau kategori lain.</div>'; }
function header() {
  const s = st();
  return '<header class="hdr"><div class="wrap"><a class="logo" href="#" data-a="home">' + (s.Logo ? '<img src="' + esc(s.Logo) + '" alt="">' : '<i>' + esc(s.Nama_Toko[0] || 'Q') + '</i>') + '<span>' + esc(s.Nama_Toko) + '</span></a>' +
    '<nav><a href="#" data-a="scroll" data-v="beranda">Beranda</a><a href="#" data-a="scroll" data-v="kategori">Kategori</a><a href="#" data-a="scroll" data-v="katalog">Katalog</a><a href="#" data-a="scroll" data-v="testimoni">Testimoni</a></nav><span class="sp"></span>' +
    '<div class="hdr-search"><i class="bi bi-search"></i><input id="hq" type="search" placeholder="Cari template, e-book, aplikasi…" value="' + esc(S.q) + '" data-i="q" aria-label="Cari produk"></div>' +
    '<button class="btn-icon" data-a="theme" aria-label="Ganti tema"><i class="bi bi-circle-half"></i></button><button class="btn-icon" data-a="admin" aria-label="Masuk admin"><i class="bi bi-person"></i></button></div></header>';
}
function hero() {
  const s = st(), bn = P().banner, sl = bn.length ? bn : [{ Judul: s.Teks_Hero, Subjudul: s.Tagline, URL_Gambar: '', Link_Tujuan: '' }];
  return '<section class="hero" id="beranda">' + sl.map((b, i) => '<div class="slide ' + (i === S.sl % sl.length ? 'on' : '') + '">' + (b.URL_Gambar ? '<div class="bg" style="background-image:url(\'' + esc(b.URL_Gambar) + '\')"></div>' : '') +
    '<div class="wrap"><div class="in"><span class="eyebrow">Etalase terpercaya • 100% produk digital</span><h1>' + esc(b.Judul) + '</h1><p>' + esc(b.Subjudul) + '</p><div class="cta"><a href="#" class="btn btn-gold" data-a="scroll" data-v="katalog">Jelajahi Produk <i class="bi bi-arrow-right"></i></a>' +
    (b.Link_Tujuan ? '<a class="btn btn-outline" style="color:#fff" href="' + esc(b.Link_Tujuan) + '" target="_blank" rel="noopener">Lihat Promo</a>' : '') + (waNum() ? '<a class="btn btn-wa" href="' + waLink() + '" target="_blank" rel="noopener"><i class="bi bi-whatsapp"></i> Konsultasi WhatsApp</a>' : '') + '</div></div></div></div>').join('') +
    (sl.length > 1 ? '<div class="dots wrap">' + sl.map((_, i) => '<button data-a="slide" data-i="' + i + '" class="' + (i === S.sl % sl.length ? 'on' : '') + '" aria-label="Slide ' + (i + 1) + '"></button>').join('') + '</div>' : '') + '</section>';
}
function home() {
  const p = P(), fe = p.produk.filter(x => x.Unggulan === 'Ya');
  const cnt = n => p.produk.filter(x => x.Kategori === n).length;
  return hero() +
    '<section class="sec wrap" id="kategori"><div class="chips" role="tablist"><button class="chip ' + (S.cat === 'all' ? 'on' : '') + '" data-a="cat" data-v="all"><i class="bi bi-grid"></i> Semua <small>' + p.produk.length + '</small></button>' +
    p.kategori.map(k => '<button class="chip ' + (S.cat === k.Nama_Kategori ? 'on' : '') + '" data-a="cat" data-v="' + esc(k.Nama_Kategori) + '"><i class="bi bi-' + esc(k.Ikon) + '"></i> ' + esc(k.Nama_Kategori) + ' <small>' + cnt(k.Nama_Kategori) + '</small></button>').join('') + '</div></section>' +
    (fe.length && S.cat === 'all' && !S.q ? '<section class="sec wrap" style="padding-top:.5rem"><div class="sec-h"><div><span class="eyebrow">Unggulan pilihan</span><h2>Produk Digital Terlaris</h2></div></div><div class="grid">' + fe.map(card).join('') + '</div></section>' : '') +
    '<section class="sec wrap" id="katalog"><div class="sec-h"><div><span class="eyebrow">Katalog lengkap</span><h2>Semua Produk Digital</h2></div><span id="cnt" class="pcat"></span></div>' +
    '<div class="toolbar"><input id="cq" type="search" placeholder="Cari nama produk…" value="' + esc(S.q) + '" data-i="q" aria-label="Cari"><select data-c="sort" aria-label="Urutkan"><option value="default">Urutan toko</option><option value="new" ' + (S.sort === 'new' ? 'selected' : '') + '>Terbaru</option><option value="low" ' + (S.sort === 'low' ? 'selected' : '') + '>Harga terendah</option><option value="high" ' + (S.sort === 'high' ? 'selected' : '') + '>Harga tertinggi</option></select></div>' +
    '<div class="grid" id="grid">' + (S.pub ? gridHtml() : '<div class="skel"></div>'.repeat(4)) + '</div></section>' +
    (p.testimoni.length ? '<section class="sec wrap" id="testimoni"><div class="sec-h"><div><span class="eyebrow">Testimoni pelanggan</span><h2>Dipercaya Para Pembeli</h2></div></div><div class="tgrid">' + p.testimoni.slice(0, 6).map(t => '<div class="card tcard"><span class="stars">' + stars(Number(t.Rating) || 5) + '</span><p>“' + esc(t.Isi_Testimoni) + '”</p><div class="who">' + (t.URL_Foto ? '<img class="av" src="' + esc(t.URL_Foto) + '" alt="" referrerpolicy="no-referrer">' : '<span class="av">' + esc(initials(t.Nama_Pelanggan)) + '</span>') + '<div><b>' + esc(t.Nama_Pelanggan) + '</b><small>' + esc(t.Produk_Dibeli) + '</small></div></div></div>').join('') + '</div></section>' : '') +
    '<section class="wrap"><div class="ctab"><div><h2>Butuh bantuan memilih produk?</h2><p>Tim kami siap membantu lewat WhatsApp.</p></div>' + (waNum() ? '<a class="btn btn-wa" href="' + waLink() + '" target="_blank" rel="noopener"><i class="bi bi-whatsapp"></i> Hubungi via WhatsApp</a>' : '') + '</div></section>';
}
function detail() {
  const p = P().produk.find(x => x.ID_Produk === S.pid); if (!p) { S.view = 'home'; return home(); }
  const gal = [p.URL_Gambar_Utama].concat(String(p.URL_Galeri || '').split('|').filter(Boolean)), d = disc(p), ben = String(p.Manfaat || '').split(',').map(x => x.trim()).filter(Boolean);
  const rel = P().produk.filter(x => x.Kategori === p.Kategori && x.ID_Produk !== p.ID_Produk).slice(0, 4);
  return '<div class="wrap"><nav class="crumb"><button data-a="home">Beranda</button> / <button data-a="cat" data-v="' + esc(p.Kategori) + '">' + esc(p.Kategori) + '</button> / <span>' + esc(p.Nama) + '</span></nav>' +
    '<div class="det"><div><div class="gal-main">' + img(gal[S.gi] || gal[0], p.Nama, katIcon(p.Kategori)) + '</div>' + (gal.length > 1 ? '<div class="thumbs">' + gal.map((g, i) => '<button class="' + (i === S.gi ? 'on' : '') + '" data-a="gal" data-i="' + i + '" aria-label="Gambar ' + (i + 1) + '">' + img(g, '') + '</button>').join('') + '</div>' : '') + '</div>' +
    '<div class="dinfo"><span class="badge gold">' + esc(p.Kategori) + '</span> ' + (p.Label ? '<span class="badge">' + esc(p.Label) + '</span>' : '') + '<h1>' + esc(p.Nama) + '</h1><p>' + esc(p.Deskripsi_Singkat) + '</p>' +
    '<div class="pricebox"><span class="price">' + rp(p.Harga) + '</span>' + (d ? '<span class="strike">' + rp(p.Harga_Coret) + '</span> <span class="badge green">Hemat ' + d + '%</span>' : '') + '</div>' +
    (ben.length ? '<ul class="ben">' + ben.map(b => '<li><i class="bi bi-check-circle-fill"></i><span>' + esc(b) + '</span></li>').join('') + '</ul>' : '') +
    '<div class="ctas"><a class="btn btn-gold" href="' + esc(p.Link_Lynk) + '" target="_blank" rel="noopener">BELI SEKARANG DI LYNK.ID <i class="bi bi-box-arrow-up-right"></i></a>' + (waNum() ? '<a class="btn btn-wa" href="' + waLink(p) + '" target="_blank" rel="noopener"><i class="bi bi-whatsapp"></i> Konsultasi WhatsApp</a>' : '') + '</div>' +
    '<p class="note"><i class="bi bi-shield-check"></i> Pembayaran aman diproses oleh Lynk.id. Akses produk dikirim otomatis setelah pembayaran.</p></div></div>' +
    (p.Landing_File ? '<section class="landing-w"><div id="lp"><div class="skel" style="min-height:320px"></div></div></section>' : (p.Deskripsi_Lengkap ? '<div class="desc"><h3>Deskripsi Lengkap</h3>' + esc(p.Deskripsi_Lengkap) + '</div>' : '')) +
    (rel.length ? '<div class="sec-h" style="margin-top:2.5rem"><div><span class="eyebrow">Rekomendasi</span><h2>Produk Terkait</h2></div></div><div class="grid">' + rel.map(card).join('') + '</div>' : '') + '<div style="height:2.5rem"></div></div>' +
    '<div class="mbar"><span class="price">' + rp(p.Harga) + '</span>' + (waNum() ? '<a class="btn btn-wa" href="' + waLink(p) + '" target="_blank" rel="noopener" aria-label="WhatsApp"><i class="bi bi-whatsapp"></i></a>' : '') + '<a class="btn btn-gold" href="' + esc(p.Link_Lynk) + '" target="_blank" rel="noopener">Beli Sekarang</a></div>';
}
function footer() {
  const s = st(), soc = [['Instagram', 'instagram'], ['TikTok', 'tiktok'], ['Facebook', 'facebook'], ['Youtube', 'youtube']].filter(x => s[x[0]]).map(x => '<a href="' + esc(s[x[0]]) + '" target="_blank" rel="noopener" aria-label="' + x[0] + '"><i class="bi bi-' + x[1] + '"></i></a>').join('');
  return '<footer class="ftr"><div class="wrap"><div class="cols"><div><div class="logo">' + (s.Logo ? '<img src="' + esc(s.Logo) + '" alt="" referrerpolicy="no-referrer">' : '<i>' + esc(s.Nama_Toko[0] || 'Q') + '</i>') + '<span>' + esc(s.Nama_Toko) + '</span></div><p style="margin-top:.8rem">' + esc(s.Teks_Footer) + '</p></div>' +
    '<div><h4>Navigasi</h4><a href="#" data-a="scroll" data-v="katalog">Katalog Digital</a><a href="#" data-a="scroll" data-v="testimoni">Testimoni</a><a href="#" data-a="admin">Masuk Admin</a></div><div><h4>Koneksi & Layanan</h4><span>' + esc(s.Jam_Layanan) + '</span><div class="soc">' + soc + '</div></div></div>' +
    '<div class="bot"><span>© ' + new Date().getFullYear() + ' ' + esc(s.Nama_Toko) + '. Hak cipta dilindungi.</span><span>Pembayaran via Lynk.id</span></div></div></footer>';
}
function renderPublic() {
  applyBrand(); clearInterval(S.tm);
  app.className = S.view === 'detail' ? 'has-bar' : '';
  app.innerHTML = header() + (S.view === 'detail' ? detail() : home()) + footer() + (waNum() ? '<a class="fab" href="' + waLink() + '" target="_blank" rel="noopener" aria-label="Chat WhatsApp"><i class="bi bi-whatsapp"></i><span>Bantuan WhatsApp</span></a>' : '');
  const c = $('#cnt'); if (c) c.textContent = filtered().length + ' produk';
  if (S.view === 'detail') loadLanding();
  const n = P().banner.length; if (S.view === 'home' && n > 1) S.tm = setInterval(() => { S.sl = (S.sl + 1) % n; paintSlide(); }, 5500);
}
const LP = {};
function loadLanding() {
  const p = P().produk.find(x => x.ID_Produk === S.pid), box = $('#lp'); if (!p || !p.Landing_File || !box) return;
  const show = html => {
    const f = document.createElement('iframe'); f.id = 'lpf'; f.title = 'Landing page ' + p.Nama; f.setAttribute('sandbox', 'allow-scripts allow-popups allow-popups-to-escape-sandbox'); f.style.height = '600px';
    f.srcdoc = '<base target="_blank">' + html + '<scr' + 'ipt>(function(){function h(){parent.postMessage({qsH:Math.max(document.documentElement.scrollHeight,document.body?document.body.scrollHeight:0)},"*")}addEventListener("load",h);addEventListener("resize",h);try{new ResizeObserver(h).observe(document.documentElement)}catch(e){}setTimeout(h,400)})()</scr' + 'ipt>';
    box.innerHTML = ''; box.appendChild(f);
  };
  if (LP[p.Landing_File]) return show(LP[p.Landing_File]);
  run('getLanding', p.ID_Produk).then(r => { if (!r.success) throw new Error(r.message); LP[p.Landing_File] = r.data; if (S.pid === p.ID_Produk && $('#lp')) show(r.data); })
    .catch(() => { if ($('#lp')) $('#lp').innerHTML = '<div class="desc"><h3>Deskripsi Lengkap</h3>' + esc(p.Deskripsi_Lengkap || 'Landing page belum dapat dimuat.') + '</div>'; });
}
window.addEventListener('message', e => { const f = $('#lpf'); if (f && e.source === f.contentWindow && e.data && e.data.qsH) f.style.height = Math.min(30000, Math.max(300, Math.ceil(e.data.qsH))) + 'px'; });
function paintSlide() { const n = P().banner.length; $$('.slide').forEach((e, i) => e.classList.toggle('on', i === S.sl % n)); $$('.dots button').forEach((e, i) => e.classList.toggle('on', i === S.sl % n)); }
function paintGrid() { const g = $('#grid'); if (g) g.innerHTML = gridHtml(); const c = $('#cnt'); if (c) c.textContent = filtered().length + ' produk'; $$('.chip').forEach(e => e.classList.toggle('on', e.dataset.v === S.cat)); }

/* ═════════════ ADMIN ═════════════ */
const NAV = [['dash', 'Ringkasan', 'speedometer2'], ['Produk', 'Kelola Produk', 'box-seam'], ['Kategori', 'Kategori', 'grid'], ['Banner', 'Banner Promosi', 'megaphone'], ['Testimoni', 'Testimoni', 'chat-quote'], ['set', 'Pengaturan Toko', 'gear'], ['mig', 'Migrasi Data', 'arrow-left-right']];
const ICONS = ['book', 'palette2', 'pencil-square', 'brush', 'camera-video', 'terminal', 'folder2', 'stars', 'box-seam', 'file-earmark-pdf', 'music-note-beamed', 'cart', 'lightning', 'mortarboard', 'briefcase', 'image'];
let Q = Promise.resolve();
function api(action, p) { return run('adminApi', S.token, action, p).then(r => { if (!r.success) { if (r.code === 'AUTH') logout(true); throw new Error(r.message); } return r.data; }); }
const queue = fn => { Q = Q.then(fn, fn); return Q; };

function renderLogin() {
  applyBrand(); clearInterval(S.tm); const s = st();
  app.innerHTML = '<div class="login"><div class="card login-card"><div class="l"><span class="eyebrow" style="color:var(--gold-ink)">Autentikasi terverifikasi</span><h1 style="font-size:38px;margin:.5rem 0">Portal Administrasi</h1><p style="color:var(--muted);margin-bottom:1.5rem">Kelola produk, kategori, banner, testimoni, dan pengaturan ' + esc(s.Nama_Toko) + '.</p>' +
    '<form id="lf" class="form"><div><label class="l" for="lu">Username</label><input id="lu" autocomplete="username" required></div><div><label class="l" for="lp">Kata sandi</label><input id="lp" type="password" autocomplete="current-password" required></div><div id="le" style="color:var(--danger);font-size:13px"></div>' +
    '<button class="btn btn-primary btn-block" id="lb">Masuk ke Dashboard <i class="bi bi-arrow-right"></i></button><button type="button" class="btn btn-ghost btn-block" data-a="home"><i class="bi bi-arrow-left"></i> Kembali ke Etalase</button></form></div>' +
    '<div class="r"><span class="badge gold">Pusat kendali toko digital</span><h2>Kelola toko tanpa coding</h2><ul><li><i class="bi bi-arrow-repeat"></i><span>Sinkron langsung dengan Google Sheets & Drive.</span></li><li><i class="bi bi-bag-check"></i><span>Checkout via Lynk.id dan konsultasi via WhatsApp.</span></li><li><i class="bi bi-shield-lock"></i><span>Sesi diverifikasi di server; sandi di-hash.</span></li></ul></div></div></div>';
}
function renderAdmin() {
  applyBrand(); clearInterval(S.tm); const s = st();
  app.className = '';
  app.innerHTML = '<div class="adm"><aside class="side"><div class="logo serif">' + (s.Logo ? '<img src="' + esc(s.Logo) + '" alt="" referrerpolicy="no-referrer">' : '') + '<span>' + esc(s.Nama_Toko) + '</span></div><nav>' + NAV.map(n => '<button class="nv" data-a="nav" data-v="' + n[0] + '"><i class="bi bi-' + n[2] + '"></i>' + n[1] + '</button>').join('') + '</nav><div class="foot"><button class="nv" data-a="home"><i class="bi bi-shop"></i>Lihat Toko Publik</button><button class="nv" data-a="logout"><i class="bi bi-box-arrow-left"></i>Keluar</button></div></aside>' +
    '<main class="amain"><div class="atop"><b class="serif" style="font-size:18px" id="atitle"></b><span class="sp"></span><span class="badge green" id="syn">● Terhubung</span><button class="btn-icon" data-a="theme" aria-label="Ganti tema"><i class="bi bi-circle-half"></i></button><button class="btn-icon" data-a="home" aria-label="Lihat toko"><i class="bi bi-shop"></i></button></div><div id="sec"></div></main>' +
    '<nav class="bnav">' + NAV.map(n => '<button data-a="nav" data-v="' + n[0] + '"><i class="bi bi-' + n[2] + '"></i><span>' + n[1].split(' ').pop() + '</span></button>').join('') + '<button data-a="logout"><i class="bi bi-box-arrow-left"></i><span>Keluar</span></button></nav></div>';
  renderSec();
}
function renderSec() {
  if (!S.adm) { $('#sec').innerHTML = '<div class="kpis"><div class="skel"></div><div class="skel"></div><div class="skel"></div></div>'; return; }
  $$('.nv,.bnav button').forEach(b => b.classList.toggle('on', b.dataset.v === S.sec));
  const n = NAV.find(x => x[0] === S.sec); $('#atitle').textContent = n ? n[1] : '';
  const f = { dash: secDash, set: secSet, mig: secMig }[S.sec]; $('#sec').innerHTML = f ? f() : secList(S.sec);
}
const ah = (t, d, btn) => '<div class="ah"><div><h1>' + t + '</h1><p>' + d + '</p></div>' + (btn || '') + '</div>';
function secDash() {
  const a = S.adm, on = a.Produk.filter(p => p.Status === 'Aktif').length, off = a.Produk.length - on;
  const k = (l, v, ic) => '<div class="card kpi"><small><i class="bi bi-' + ic + '"></i> ' + l + '</small><b>' + v + '</b></div>';
  return ah('Selamat Datang, Admin', 'Ringkasan toko digital Anda.', '<div style="display:flex;gap:.5rem;flex-wrap:wrap"><button class="btn btn-primary" data-a="new" data-s="Produk"><i class="bi bi-plus-lg"></i> Tambah Produk</button><button class="btn btn-ghost" data-a="nav" data-v="Banner">Kelola Banner</button><button class="btn btn-ghost" data-a="new" data-s="Testimoni">Input Testimoni</button></div>') +
    '<div class="kpis">' + k('Produk Aktif', on, 'box-seam') + k('Produk Nonaktif', off, 'eye-slash') + k('Jumlah Kategori', a.Kategori.length, 'grid') + '</div>' +
    '<h2 style="font-size:22px;margin:1.8rem 0 .8rem">Produk Terbaru</h2><div class="card tbl-w"><table><tbody>' + a.Produk.slice().sort((x, y) => String(y.Tgl_Dibuat).localeCompare(String(x.Tgl_Dibuat))).slice(0, 5).map(p => '<tr><td>' + cellProd(p) + '</td><td class="num">' + rp(p.Harga) + '</td><td>' + (p.Status === 'Aktif' ? '<span class="badge green">Aktif</span>' : '<span class="badge">Nonaktif</span>') + '</td></tr>').join('') + '</tbody></table></div>';
}
const cellProd = p => '<div class="cellp"><div class="t">' + img(p.URL_Gambar_Utama, '', 'box-seam') + '</div><div><b>' + esc(p.Nama) + '</b><small>' + esc(p.Kategori) + '</small></div></div>';
const sw = (s, r) => '<label class="sw"><input type="checkbox" data-c="tg" data-s="' + s + '" data-id="' + esc(r[IDC[s]]) + '" ' + (r.Status === 'Aktif' ? 'checked' : '') + ' aria-label="Aktif"><i></i></label>';
const CFG = {
  Produk: { t: 'Kelola Produk', d: 'Tambah, ubah, dan hapus produk. Perubahan langsung tampil di etalase.', add: 'Tambah Produk', s: r => [r.Nama, r.Kategori, r.Label].join(' '), cols: [['Produk', r => cellProd(r)], ['Harga', r => '<span class="num">' + rp(r.Harga) + '</span>' + (r.Harga_Coret ? '<br><small class="strike" style="margin:0">' + rp(r.Harga_Coret) + '</small>' : '')], ['Label', r => r.Label ? '<span class="badge gold">' + esc(r.Label) + '</span>' : '—'], ['Unggulan', r => r.Unggulan === 'Ya' ? '★' : ''], ['Aktif', r => sw('Produk', r)]] },
  Kategori: { t: 'Kelola Kategori', d: 'Atur nama, ikon, dan urutan kategori etalase.', add: 'Tambah Kategori', up: 1, s: r => r.Nama_Kategori, cols: [['Urut', r => '<span class="badge">' + esc(r.Urutan) + '</span>'], ['Kategori', r => '<div class="cellp"><div class="t"><i class="bi bi-' + esc(r.Ikon) + '"></i></div><b>' + esc(r.Nama_Kategori) + '</b></div>'], ['Produk', r => S.adm.Produk.filter(p => p.Kategori === r.Nama_Kategori).length], ['Aktif', r => sw('Kategori', r)]] },
  Banner: { t: 'Banner Promosi', d: 'Slider promosi di bagian atas etalase.', add: 'Tambah Banner', s: r => r.Judul, cols: [['Banner', r => '<div class="cellp"><div class="t">' + img(r.URL_Gambar, '', 'image') + '</div><div><b>' + esc(r.Judul) + '</b><small>' + esc(r.Subjudul) + '</small></div></div>'], ['Urut', r => esc(r.Urutan)], ['Aktif', r => sw('Banner', r)]] },
  Testimoni: { t: 'Testimoni Pelanggan', d: 'Bukti kepuasan pembeli yang tampil di etalase.', add: 'Tambah Testimoni', s: r => [r.Nama_Pelanggan, r.Produk_Dibeli, r.Isi_Testimoni].join(' '), cols: [['Pelanggan', r => '<div class="cellp"><div class="t">' + (r.URL_Foto ? img(r.URL_Foto, '') : esc(initials(r.Nama_Pelanggan))) + '</div><div><b>' + esc(r.Nama_Pelanggan) + '</b><small>' + esc(r.Produk_Dibeli) + '</small></div></div>'], ['Rating & Ulasan', r => '<span class="stars">' + stars(Number(r.Rating) || 5) + '</span><br><small>' + esc(String(r.Isi_Testimoni).slice(0, 70)) + '…</small>'], ['Aktif', r => sw('Testimoni', r)]] }
};
function rowsHtml(sh) {
  const c = CFG[sh], q = (S.aq[sh] || '').toLowerCase(), all = S.adm[sh], rows = all.filter(r => !q || c.s(r).toLowerCase().includes(q));
  if (!rows.length) return '<tr><td colspan="9" class="empty">Belum ada data. Klik “' + c.add + '”.</td></tr>';
  return rows.map(r => { const id = esc(r[IDC[sh]]); return '<tr>' + c.cols.map(x => '<td>' + x[1](r) + '</td>').join('') + '<td><div class="acts">' + (c.up ? '<button class="btn-icon" data-a="mv" data-d="-1" data-s="' + sh + '" data-id="' + id + '" aria-label="Naik"><i class="bi bi-arrow-up"></i></button><button class="btn-icon" data-a="mv" data-d="1" data-s="' + sh + '" data-id="' + id + '" aria-label="Turun"><i class="bi bi-arrow-down"></i></button>' : '') + '<button class="btn-icon" data-a="edit" data-s="' + sh + '" data-id="' + id + '" aria-label="Ubah"><i class="bi bi-pencil"></i></button><button class="btn-icon" data-a="del" data-s="' + sh + '" data-id="' + id + '" aria-label="Hapus"><i class="bi bi-trash"></i></button></div></td></tr>'; }).join('');
}
function secList(sh) {
  const c = CFG[sh];
  return ah(c.t, c.d, '<button class="btn btn-primary" data-a="new" data-s="' + sh + '"><i class="bi bi-plus-lg"></i> ' + c.add + '</button>') +
    '<div class="toolbar"><input type="search" placeholder="Cari…" data-i="aq" data-s="' + sh + '" value="' + esc(S.aq[sh] || '') + '" aria-label="Cari"><span class="pcat" style="align-self:center">' + S.adm[sh].length + ' data</span></div>' +
    '<div class="card tbl-w"><table><thead><tr>' + c.cols.map(x => '<th>' + x[0] + '</th>').join('') + '<th style="text-align:right">Aksi</th></tr></thead><tbody id="tb">' + rowsHtml(sh) + '</tbody></table></div>';
}

/* ── Form generik ── */
const FORM = {
  Produk: [['Nama', 'Nama Produk', 'text', { req: 1 }], ['Kategori', 'Kategori', 'cat', { req: 1 }], ['Harga', 'Harga Jual (Rp)', 'num', { req: 1, two: 1 }], ['Harga_Coret', 'Harga Coret (opsional)', 'num', { two: 1 }], ['URL_Gambar_Utama', 'Gambar Utama', 'img', { req: 1, f: 'produk' }], ['URL_Galeri', 'Galeri Tambahan', 'gal', { f: 'produk' }], ['Link_Lynk', 'Link Lynk.id (https://…)', 'text', { req: 1 }], ['Deskripsi_Singkat', 'Deskripsi Singkat', 'area'], ['Deskripsi_Lengkap', 'Deskripsi Lengkap', 'area'], ['Manfaat', 'Manfaat (pisahkan koma)', 'area'], ['Landing_File', 'Landing Page (file HTML, opsional)', 'land'], ['Label', 'Label', 'sel', { o: ['', 'Terlaris', 'Baru', 'Promo'], two: 1 }], ['Urutan', 'Urutan Tampil', 'num', { two: 1 }], ['Unggulan', 'Jadikan produk unggulan', 'chk'], ['Status', 'Tampilkan di etalase', 'st']],
  Kategori: [['Nama_Kategori', 'Nama Kategori', 'text', { req: 1 }], ['Ikon', 'Ikon', 'ico'], ['Status', 'Tampilkan di etalase', 'st']],
  Banner: [['Judul', 'Judul', 'text', { req: 1 }], ['Subjudul', 'Subjudul', 'text'], ['URL_Gambar', 'Gambar Banner', 'img', { f: 'banner' }], ['Link_Tujuan', 'Link Tujuan (opsional, https://…)', 'text'], ['Urutan', 'Urutan', 'num'], ['Status', 'Tampilkan', 'st']],
  Testimoni: [['Nama_Pelanggan', 'Nama Pelanggan', 'text', { req: 1 }], ['Produk_Dibeli', 'Produk yang Dibeli', 'prod'], ['Isi_Testimoni', 'Isi Testimoni', 'area', { req: 1 }], ['Rating', 'Rating', 'rate'], ['URL_Foto', 'Foto (opsional)', 'img', { f: 'testimoni' }], ['Status', 'Tampilkan', 'st']]
};
function fld(f, v) {
  const [k, l, t, o] = f, id = 'f_' + k, req = o && o.req ? ' required' : '', L = '<label class="l" for="' + id + '">' + l + (o && o.req ? ' <span class="rq">*</span>' : '') + '</label>';
  const hid = '<input type="hidden" name="' + k + '" id="' + id + '" value="' + esc(v) + '">';
  let h;
  if (t === 'text') h = L + '<input name="' + k + '" id="' + id + '" value="' + esc(v) + '"' + req + '>';
  else if (t === 'num') h = L + '<input type="number" min="0" step="any" name="' + k + '" id="' + id + '" value="' + esc(v) + '"' + req + '>';
  else if (t === 'area') h = L + '<textarea name="' + k + '" id="' + id + '">' + esc(v) + '</textarea>';
  else if (t === 'sel') h = L + '<select name="' + k + '" id="' + id + '">' + o.o.map(x => '<option ' + (x === v ? 'selected' : '') + ' value="' + x + '">' + (x || '— Tanpa label —') + '</option>').join('') + '</select>';
  else if (t === 'cat') h = L + '<select name="' + k + '" id="' + id + '"' + req + '><option value="">Pilih kategori…</option>' + S.adm.Kategori.map(x => '<option ' + (x.Nama_Kategori === v ? 'selected' : '') + '>' + esc(x.Nama_Kategori) + '</option>').join('') + '</select>';
  else if (t === 'prod') h = L + '<input name="' + k + '" id="' + id + '" list="dl_p" value="' + esc(v) + '"><datalist id="dl_p">' + S.adm.Produk.map(x => '<option value="' + esc(x.Nama) + '">').join('') + '</datalist>';
  else if (t === 'chk') h = '<label style="display:flex;gap:.6rem;align-items:center"><input type="checkbox" name="' + k + '" ' + (v === 'Ya' ? 'checked' : '') + ' style="width:20px;height:20px"> ' + l + '</label>';
  else if (t === 'st') h = '<div style="display:flex;justify-content:space-between;align-items:center"><span class="l" style="margin:0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em">' + l + '</span><label class="sw"><input type="checkbox" name="' + k + '" ' + (v !== 'Nonaktif' ? 'checked' : '') + '><i></i></label></div>';
  else if (t === 'img') h = L + hid + '<div class="up"><div class="pv" id="pv_' + k + '">' + (v ? '<img src="' + esc(v) + '" alt="" referrerpolicy="no-referrer">' : '<i class="bi bi-image"></i>') + '</div><div><input type="file" accept="image/jpeg,image/png,image/webp" data-c="up" data-k="' + k + '" data-f="' + o.f + '"><div class="hint">JPG/PNG/WebP, rasio 1:1 atau 4:3 (sesuai Pengaturan). Otomatis dikompres, maks 2 MB.</div></div></div>';
  else if (t === 'gal') h = L + hid + '<div class="gl" id="gl_' + k + '">' + galItems(v) + '</div><input type="file" multiple accept="image/jpeg,image/png,image/webp" data-c="upg" data-k="' + k + '" data-f="' + o.f + '" style="margin-top:.5rem">';
  else if (t === 'land') h = L + hid + '<div class="up" style="display:block"><div id="lst" class="hint" style="margin:0 0 .5rem">' + (v ? '✓ Landing page terpasang' : 'Belum ada landing page') + '</div><input type="file" accept=".html,.htm,text/html" data-c="upl" data-k="' + k + '">' + (v ? ' <button type="button" class="btn btn-ghost btn-sm" data-a="landx">Hapus landing page</button>' : '') + '<div class="hint">Unggah 1 file HTML (maks 1 MB). CSS, JS, dan gambar harus ada di dalam file atau memakai link https. Tampil di halaman produk menggantikan deskripsi lengkap.</div></div>';
  else if (t === 'ico') h = L + hid + '<div class="icons">' + ICONS.map(i => '<button type="button" data-a="ico" data-v="' + i + '" class="' + (i === v ? 'on' : '') + '" aria-label="' + i + '"><i class="bi bi-' + i + '"></i></button>').join('') + '</div>';
  else if (t === 'rate') h = L + hid + '<div class="rate">' + [1, 2, 3, 4, 5].map(i => '<button type="button" data-a="rate" data-v="' + i + '" class="' + (i <= v ? 'on' : '') + '" aria-label="' + i + ' bintang">★</button>').join('') + '</div>';
  return '<div class="' + (o && o.two ? '' : '') + '">' + h + '</div>';
}
const galItems = v => String(v || '').split('|').filter(Boolean).map(u => '<div class="g"><img src="' + esc(u) + '" alt="" referrerpolicy="no-referrer"><button type="button" data-a="gx" data-u="' + esc(u) + '" aria-label="Hapus">✕</button></div>').join('');
function defaults(sh) { return { Produk: { Status: 'Aktif', Unggulan: 'Tidak', Label: '' }, Kategori: { Status: 'Aktif', Ikon: 'box-seam' }, Banner: { Status: 'Aktif' }, Testimoni: { Status: 'Aktif', Rating: 5 } }[sh]; }
function openForm(sh, id) {
  const row = id ? S.adm[sh].find(r => r[IDC[sh]] === id) : defaults(sh), nm = { Produk: 'Produk', Kategori: 'Kategori', Banner: 'Banner', Testimoni: 'Testimoni' }[sh];
  const fs = FORM[sh]; let out = '', i = 0;
  while (i < fs.length) { const f = fs[i], nx = fs[i + 1]; if (f[3] && f[3].two && nx && nx[3] && nx[3].two) { out += '<div class="row two">' + fld(f, row[f[0]] == null ? '' : row[f[0]]) + fld(nx, row[nx[0]] == null ? '' : row[nx[0]]) + '</div>'; i += 2; } else { out += fld(f, row[f[0]] == null ? '' : row[f[0]]); i++; } }
  S.pend = 0;
  modal('<form id="mf" data-s="' + sh + '" data-id="' + esc(id || '') + '" novalidate><div class="mdl-h"><h3>' + (id ? 'Ubah ' : 'Tambah ') + nm + '</h3><button type="button" class="btn-icon" data-a="x" aria-label="Tutup">✕</button></div><div class="mdl-b form">' + out + '</div><div class="mdl-f"><button type="button" class="btn btn-ghost" data-a="x">Batal</button><button class="btn btn-primary" id="sv"><i class="bi bi-cloud-check"></i> Simpan</button></div></form>');
}
function collect(sh) {
  const o = {};
  FORM[sh].forEach(f => { const el = $('#mf [name="' + f[0] + '"]'); if (!el) return; o[f[0]] = f[2] === 'chk' ? (el.checked ? 'Ya' : 'Tidak') : f[2] === 'st' ? (el.checked ? 'Aktif' : 'Nonaktif') : el.value.trim(); });
  return o;
}
function validate(sh, o) {
  for (const f of FORM[sh]) if (f[3] && f[3].req && !o[f[0]]) return f[1] + ' wajib diisi.';
  if (sh === 'Produk') { if (!(Number(o.Harga) > 0)) return 'Harga harus berupa angka positif.'; if (!/^https:\/\/\S+$/i.test(o.Link_Lynk)) return 'Link Lynk.id harus berupa URL valid berawalan https://'; }
  if (o.Link_Tujuan && !/^https:\/\/\S+$/i.test(o.Link_Tujuan)) return 'Link tujuan harus berawalan https://';
  return '';
}

/* ── CRUD optimistik: UI & localStorage berubah seketika, server menyusul di latar ── */
function commit() { derivePub(); LS.set('qs_adm', S.adm); if (S.view === 'admin' && S.adm) { if (S.sec === 'dash' || S.sec === 'set' || S.sec === 'mig') { if (!$('#mf') && !$('#sf')) renderSec(); } else { const tb = $('#tb'); tb ? tb.innerHTML = rowsHtml(S.sec) : renderSec(); } } }
function derivePub() { const a = S.adm, on = r => r.Status === 'Aktif', kat = a.Kategori.filter(on).sort(ur), nm = new Set(kat.map(k => k.Nama_Kategori)); S.pub = { settings: a.Pengaturan, kategori: kat, produk: a.Produk.filter(on).filter(p => nm.has(p.Kategori)).sort(ur), banner: a.Banner.filter(on).sort(ur), testimoni: a.Testimoni.filter(on), ts: Date.now() }; LS.set('qs_pub', S.pub); }
function crud(sh, obj) {
  const idc = IDC[sh], isNew = !obj[idc], tmp = 'tmp-' + Date.now(), l = S.adm[sh], i = isNew ? -1 : l.findIndex(r => r[idc] === obj[idc]), prev = i > -1 ? Object.assign({}, l[i]) : null;
  const row = Object.assign({}, prev || {}, obj); if (isNew) row[idc] = tmp;
  let prevProd = null;
  if (sh === 'Kategori' && prev && prev.Nama_Kategori !== row.Nama_Kategori) { prevProd = JSON.stringify(S.adm.Produk); S.adm.Produk.forEach(p => { if (p.Kategori === prev.Nama_Kategori) p.Kategori = row.Nama_Kategori; }); }
  if (!(Number(row.Urutan) > 0)) row.Urutan = l.length + 1;
  i > -1 ? (l[i] = row) : l.push(row); commit();
  const w = toast('Menyimpan…', 'wait', 8000);
  queue(() => api('save', { sheet: sh, row: obj }).then(saved => {
    const L = S.adm[sh], j = L.findIndex(r => r[idc] === (isNew ? tmp : saved[idc])); if (j > -1) L[j] = saved; w.remove(); toast('Tersimpan ✓', 'ok'); commit();
  }).catch(e => {
    const L = S.adm[sh], j = L.findIndex(r => r[idc] === (isNew ? tmp : obj[idc])); if (prev) { if (j > -1) L[j] = prev; } else if (j > -1) L.splice(j, 1);
    if (prevProd) S.adm.Produk = JSON.parse(prevProd); w.remove(); toast('Gagal: ' + e.message, 'err'); commit();
  }));
}
function remove(sh, id) {
  const idc = IDC[sh], l = S.adm[sh], i = l.findIndex(r => r[idc] === id); if (i < 0) return; const prev = l[i];
  if (sh === 'Kategori' && S.adm.Produk.some(p => p.Kategori === prev.Nama_Kategori)) return toast('Kategori masih dipakai produk. Pindahkan/hapus produknya dulu.', 'err');
  l.splice(i, 1); commit(); const w = toast('Menghapus…', 'wait', 8000);
  queue(() => api('delete', { sheet: sh, id }).then(() => { w.remove(); toast('Terhapus ✓', 'ok'); }).catch(e => { S.adm[sh].splice(Math.min(i, S.adm[sh].length), 0, prev); w.remove(); toast('Gagal: ' + e.message, 'err'); commit(); }));
}
function move(sh, id, d) {
  const l = S.adm[sh].slice().sort(ur), idc = IDC[sh], i = l.findIndex(r => r[idc] === id), j = i + d; if (j < 0 || j >= l.length) return;
  const snap = S.adm[sh].map(r => [r[idc], r.Urutan]); [l[i], l[j]] = [l[j], l[i]]; l.forEach((r, k) => { r.Urutan = k + 1; }); S.adm[sh] = l; commit();
  queue(() => api('reorder', { sheet: sh, ids: l.map(r => r[idc]) }).catch(e => { S.adm[sh].forEach(r => { const s = snap.find(x => x[0] === r[idc]); if (s) r.Urutan = s[1]; }); S.adm[sh].sort(ur); toast('Gagal: ' + e.message, 'err'); commit(); }));
}

/* ── Upload gambar (kompres di klien) ── */
function compress(file, max) {
  return new Promise((res, rej) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return rej(new Error('Hanya JPG, PNG, atau WebP.'));
    const r = new FileReader(); r.onerror = rej; r.onload = () => { const im = new Image(); im.onerror = () => rej(new Error('Gambar tidak terbaca.')); im.onload = () => {
      const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      let m = 'image/webp', d = c.toDataURL(m, .82); if (d.indexOf('data:image/webp') !== 0) { m = 'image/jpeg'; d = c.toDataURL(m, .85); } res({ url: d, mime: m, data: d.split(',')[1] }); }; im.src = r.result; }; r.readAsDataURL(file);
  });
}
function uploadFile(file, folder) { return compress(file, 1200).then(c => { const b = $('#sv'); S.pend++; if (b) b.disabled = true; return { local: c.url, done: api('upload', { data: c.data, mime: c.mime, folder }).finally(() => { S.pend--; const x = $('#sv'); if (x && !S.pend) x.disabled = false; }) }; }); }

/* ── Pengaturan ── */
function secSet() {
  const s = S.adm.Pengaturan, v = k => esc(s[k] || ''), inp = (k, l, ex) => '<div><label class="l" for="s_' + k + '">' + l + '</label><input name="' + k + '" id="s_' + k + '" value="' + v(k) + '" ' + (ex || '') + '></div>';
  return ah('Pengaturan Toko', 'Identitas, WhatsApp, tema, dan keamanan akun.', '<button class="btn btn-ghost" data-a="flush"><i class="bi bi-arrow-clockwise"></i> Bersihkan Cache</button>') +
    '<form id="sf" class="set-grid"><div class="card panel form"><h3>Identitas & Branding</h3>' + inp('Nama_Toko', 'Nama Toko') + inp('Tagline', 'Tagline') + '<div><label class="l">Logo</label><input type="hidden" name="Logo" id="f_Logo" value="' + v('Logo') + '"><div class="up"><div class="pv" id="pv_Logo">' + (s.Logo ? '<img src="' + v('Logo') + '" alt="" referrerpolicy="no-referrer">' : '<i class="bi bi-image"></i>') + '</div><input type="file" accept="image/jpeg,image/png,image/webp" data-c="up" data-k="Logo" data-f="produk"></div></div>' +
    '<div><label class="l" for="s_Teks_Hero">Teks Hero</label><textarea name="Teks_Hero" id="s_Teks_Hero">' + v('Teks_Hero') + '</textarea></div><div><label class="l" for="s_Teks_Footer">Teks Footer</label><textarea name="Teks_Footer" id="s_Teks_Footer">' + v('Teks_Footer') + '</textarea></div>' + inp('Jam_Layanan', 'Jam Layanan') + '</div>' +
    '<div style="display:grid;gap:1.2rem;align-content:start"><div class="card panel form"><h3>WhatsApp & Media Sosial</h3>' + inp('Nomor_WhatsApp', 'Nomor WhatsApp (otomatis jadi 62…)', 'inputmode="tel"') + '<div><label class="l" for="s_Pesan_WA_Default">Pesan WA Default</label><textarea name="Pesan_WA_Default" id="s_Pesan_WA_Default">' + v('Pesan_WA_Default') + '</textarea><div class="hint">Gunakan [NAMA_PRODUK] sebagai placeholder.</div></div>' + inp('Instagram', 'Instagram (https://…)') + inp('TikTok', 'TikTok (https://…)') + inp('Facebook', 'Facebook (https://…)') + inp('Youtube', 'YouTube (https://…)') + '</div>' +
    '<div class="card panel form"><h3>Rasio Gambar Produk</h3><div><label class="l" for="s_Rasio">Bentuk bingkai gambar di etalase</label><select name="Rasio_Gambar" id="s_Rasio"><option value="1:1" ' + (s.Rasio_Gambar !== '4:3' ? 'selected' : '') + '>1:1 — Persegi</option><option value="4:3" ' + (s.Rasio_Gambar === '4:3' ? 'selected' : '') + '>4:3 — Lanskap</option></select><div class="hint">Unggah gambar dengan rasio yang sama agar tampil penuh tanpa terpotong.</div></div></div><div class="card panel form"><h3>Tema Warna</h3><div class="row two"><div><label class="l">Warna Utama</label><input type="color" name="Warna_Utama" value="' + (s.Warna_Utama || '#0B1F3A') + '" style="height:44px;width:100%"></div><div><label class="l">Warna Aksen</label><input type="color" name="Warna_Aksen" value="' + (s.Warna_Aksen || '#C9A24B') + '" style="height:44px;width:100%"></div></div><div style="display:flex;gap:.5rem"><button type="button" class="btn btn-ghost" data-a="preset" data-v="#0B1F3A">Navy & Emas</button><button type="button" class="btn btn-ghost" data-a="preset" data-v="#0D0D0D">Hitam & Emas</button></div></div>' +
    '<button class="btn btn-primary btn-block" id="ssv"><i class="bi bi-cloud-check"></i> Simpan Pengaturan</button></div></form>' +
    '<form id="pf" class="card panel form" style="margin-top:1.2rem;max-width:520px"><h3>Ganti Sandi Admin</h3><div><label class="l">Sandi lama</label><input type="password" id="pw0" autocomplete="current-password" required></div><div><label class="l">Sandi baru (min. 8, huruf + angka)</label><input type="password" id="pw1" autocomplete="new-password" required></div><div><label class="l">Ulangi sandi baru</label><input type="password" id="pw2" autocomplete="new-password" required></div><button class="btn btn-ghost"><i class="bi bi-key"></i> Perbarui Sandi</button></form>';
}
function secMig() {
  return ah('Migrasi Data', 'Impor data dari spreadsheet lama (hanya dibaca, aman diulang, tanpa data ganda).') +
    '<div class="card panel form" style="max-width:760px"><div><label class="l" for="ms">URL / ID spreadsheet lama</label><input id="ms" placeholder="https://docs.google.com/spreadsheets/d/…"><div class="hint">Gunakan akun Google yang sama agar gambar Drive tetap tampil. Header kolom dibaca berdasarkan nama.</div></div>' +
    '<div style="display:flex;gap:1rem;flex-wrap:wrap">' + ['Kategori', 'Produk', 'Banner', 'Testimoni'].map(n => '<label><input type="checkbox" class="msh" value="' + n + '" checked> ' + n + '</label>').join('') + '</div><label><input type="checkbox" id="mo"> Timpa data yang sudah ada (cocokkan nama)</label>' +
    '<div style="display:flex;gap:.6rem;flex-wrap:wrap"><button class="btn btn-ghost" data-a="mig" data-d="1"><i class="bi bi-search"></i> Pindai (Dry-run)</button><button class="btn btn-primary" data-a="mig" data-d="0"><i class="bi bi-play-fill"></i> Jalankan Import</button></div><div id="mr"></div></div>';
}

/* ═════════════ Navigasi & aksi ═════════════ */
function show(v) { S.view = v; window.scrollTo(0, 0); v === 'admin' ? (S.token ? renderAdmin() : (S.view = 'login', renderLogin())) : renderPublic(); }
function logout(silent) { S.token = null; S.adm = null; SS.del('qs_tok'); LS.del('qs_adm'); if (!silent) toast('Anda telah keluar.'); S.view = 'login'; renderLogin(); if (silent) toast('Sesi berakhir. Silakan masuk kembali.', 'err'); }
function loadAdmin() { return api('bootstrap').then(d => { S.adm = d; commit(); if (S.view === 'admin') renderSec(); }).catch(e => { if (S.view === 'admin') toast(e.message, 'err'); }); }
function refreshPublic() { run('getPublicData').then(r => { if (r && r.success && (!S.pub || r.data.ts !== S.pub.ts)) { const typing = document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName); S.pub = r.data; LS.set('qs_pub', S.pub); if (S.view !== 'admin' && S.view !== 'login' && !typing) renderPublic(); } }).catch(e => { if (!S.pub) { toast('Gagal memuat data toko: ' + e.message, 'err', 7000); S.pub = { produk: [], kategori: [], banner: [], testimoni: [], settings: {} }; if (S.view === 'home') renderPublic(); } }); }

const A = {
  home() { S.view = 'home'; S.pid = null; renderPublic(); window.scrollTo(0, 0); },
  admin() { show('admin'); if (S.token && !S.adm) { S.adm = LS.get('qs_adm', null); renderAdmin(); loadAdmin(); } else if (S.token) { renderAdmin(); loadAdmin(); } },
  detail(t) { S.pid = t.dataset.id; S.view = 'detail'; S.gi = 0; renderPublic(); window.scrollTo(0, 0); },
  cat(t) { S.cat = t.dataset.v; if (S.view !== 'home') { S.view = 'home'; renderPublic(); } else paintGrid(); $('#katalog') && $('#katalog').scrollIntoView(); },
  gal(t) { S.gi = +t.dataset.i; renderPublic(); },
  slide(t) { S.sl = +t.dataset.i; paintSlide(); },
  scroll(t) { if (S.view !== 'home') { S.view = 'home'; renderPublic(); } const e = document.getElementById(t.dataset.v); e && e.scrollIntoView({ behavior: 'smooth' }); },
  theme() { const n = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = n; LS.set('qs_theme', n); },
  nav(t) { S.sec = t.dataset.v; renderSec(); window.scrollTo(0, 0); },
  logout() { logout(); },
  x() { closeModal(); }, ovx(t, e) { if (e.target === t) closeModal(); },
  new(t) { S.sec === 'dash' && (S.sec = t.dataset.s, renderSec()); openForm(t.dataset.s); },
  edit(t) { openForm(t.dataset.s, t.dataset.id); },
  del(t) { ask('Hapus data ini? Tindakan tidak dapat dibatalkan.', 'Ya, hapus').then(ok => ok && remove(t.dataset.s, t.dataset.id)); },
  mv(t) { move(t.dataset.s, t.dataset.id, +t.dataset.d); },
  ico(t) { $('#f_Ikon').value = t.dataset.v; $$('.icons button').forEach(b => b.classList.toggle('on', b === t)); },
  rate(t) { $('#f_Rating').value = t.dataset.v; $$('.rate button').forEach(b => b.classList.toggle('on', +b.dataset.v <= +t.dataset.v)); },
  landx() { $('#f_Landing_File').value = ''; $('#lst').textContent = 'Landing page akan dihapus saat disimpan.'; },
  gx(t) { const h = $('#f_URL_Galeri'); h.value = h.value.split('|').filter(u => u !== t.dataset.u).join('|'); $('#gl_URL_Galeri').innerHTML = galItems(h.value); },
  preset(t) { const f = $('#sf'); f.Warna_Utama.value = t.dataset.v; f.Warna_Aksen.value = '#C9A24B'; },
  flush() { api('flush').then(() => toast('Cache dibersihkan ✓', 'ok')).catch(e => toast(e.message, 'err')); },
  mig(t) {
    const dry = t.dataset.d === '1', p = { source: $('#ms').value, sheets: $$('.msh:checked').map(x => x.value), overwrite: $('#mo').checked, dryRun: dry };
    const go = () => { const b = t; b.disabled = true; $('#mr').innerHTML = '<span class="spin" style="border-color:var(--line);border-top-color:var(--brand)"></span> Memproses…';
      api('migrasi', p).then(r => { $('#mr').innerHTML = '<table class="res"><thead><tr><th>Data</th><th>Sumber</th><th>Ditambah</th><th>Diperbarui</th><th>Dilewati</th></tr></thead><tbody>' + Object.keys(r.report).map(k => '<tr><td>' + k + '</td><td>' + r.report[k].source + '</td><td>' + r.report[k].inserted + '</td><td>' + r.report[k].updated + '</td><td>' + r.report[k].skipped + '</td></tr>').join('') + '</tbody></table>' + r.warnings.map(w => '<div class="warn">' + esc(w) + '</div>').join('') + (dry ? '<p class="hint">Dry-run: belum ada data yang ditulis.</p>' : ''); if (!dry) { toast('Migrasi selesai ✓', 'ok'); loadAdmin(); } }).catch(e => { $('#mr').innerHTML = '<div class="warn">' + esc(e.message) + '</div>'; }).finally(() => { b.disabled = false; }); };
    dry ? go() : ask('Jalankan import ke database toko? Data yang ada tidak akan digandakan.', 'Jalankan').then(ok => ok && go());
  }
};
document.addEventListener('click', e => { const t = e.target.closest('[data-a]'); if (!t || !A[t.dataset.a]) return; if (t.tagName === 'A' && t.getAttribute('href') === '#') e.preventDefault(); A[t.dataset.a](t, e); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('.ov')) closeModal(); });
document.addEventListener('input', e => {
  const t = e.target, d = t.dataset.i; if (!d) return;
  if (d === 'q') { S.q = t.value; if (S.view !== 'home') { S.view = 'home'; renderPublic(); const n = $('#cq'); n && n.focus(); } else { paintGrid(); const o = t.id === 'hq' ? $('#cq') : $('#hq'); if (o) o.value = S.q; } }
  if (d === 'aq') { S.aq[t.dataset.s] = t.value; $('#tb').innerHTML = rowsHtml(t.dataset.s); }
});
document.addEventListener('change', e => {
  const t = e.target, c = t.dataset.c; if (!c) return;
  if (c === 'sort') { S.sort = t.value; paintGrid(); }
  if (c === 'tg') { const sh = t.dataset.s, r = S.adm[sh].find(x => x[IDC[sh]] === t.dataset.id); r && crud(sh, Object.assign({}, r, { Status: t.checked ? 'Aktif' : 'Nonaktif' })); }
  if (c === 'up' && t.files[0]) { const k = t.dataset.k; uploadFile(t.files[0], t.dataset.f).then(u => { const pv = $('#pv_' + k); pv.innerHTML = '<img src="' + u.local + '" alt="">'; return u.done.then(r => { $('#f_' + k).value = r.url; toast('Gambar terunggah ✓', 'ok'); }); }).catch(er => toast(er.message, 'err')); }
  if (c === 'upl' && t.files[0]) {
    const f = t.files[0], k = t.dataset.k; if (!/\.html?$/i.test(f.name)) return toast('Pilih file berekstensi .html', 'err'); if (f.size > 1e6) return toast('Ukuran file maksimal 1 MB.', 'err');
    f.text().then(tx => { S.pend++; const b = $('#sv'); if (b) b.disabled = true; $('#lst').textContent = 'Mengunggah…';
      return api('upload', { kind: 'html', text: tx }).then(r => { $('#f_' + k).value = r.id; $('#lst').textContent = '✓ ' + f.name + ' terunggah'; toast('Landing page terunggah ✓', 'ok'); }).finally(() => { S.pend--; const x = $('#sv'); if (x && !S.pend) x.disabled = false; }); }).catch(er => { $('#lst').textContent = 'Gagal mengunggah.'; toast(er.message, 'err'); });
  }
  if (c === 'upg') { const k = t.dataset.k; [...t.files].forEach(f => uploadFile(f, t.dataset.f).then(u => u.done.then(r => { const h = $('#f_' + k); h.value = (h.value ? h.value + '|' : '') + r.url; $('#gl_' + k).innerHTML = galItems(h.value); })).catch(er => toast(er.message, 'err'))); t.value = ''; }
});
document.addEventListener('submit', e => {
  e.preventDefault(); const f = e.target;
  if (f.id === 'lf') { const b = $('#lb'); b.disabled = true; b.innerHTML = '<span class="spin"></span> Memeriksa…'; $('#le').textContent = '';
    run('adminLogin', $('#lu').value, $('#lp').value).then(r => { if (!r.success) throw new Error(r.message); S.token = r.data.token; SS.set('qs_tok', S.token); S.view = 'admin'; S.adm = LS.get('qs_adm', null); renderAdmin(); loadAdmin(); }).catch(er => { $('#le').textContent = er.message; b.disabled = false; b.innerHTML = 'Masuk ke Dashboard'; }); }
  if (f.id === 'mf') { const sh = f.dataset.s, o = collect(sh), er = validate(sh, o); if (er) return toast(er, 'err'); if (S.pend) return toast('Tunggu unggahan gambar selesai…'); if (f.dataset.id) o[IDC[sh]] = f.dataset.id; closeModal(); crud(sh, o); }
  if (f.id === 'sf') { const o = {}; $$('[name]', f).forEach(x => { o[x.name] = x.value.trim(); }); if (!o.Nama_Toko) return toast('Nama toko wajib diisi.', 'err'); if (S.pend) return toast('Tunggu unggahan selesai…');
    const prev = Object.assign({}, S.adm.Pengaturan); Object.assign(S.adm.Pengaturan, o); commit(); applyBrand(); const w = toast('Menyimpan…', 'wait', 8000);
    queue(() => api('settings', { data: o }).then(d => { S.adm.Pengaturan = d; w.remove(); toast('Pengaturan disimpan ✓', 'ok'); commit(); }).catch(er => { S.adm.Pengaturan = prev; w.remove(); toast('Gagal: ' + er.message, 'err'); commit(); })); }
  if (f.id === 'pf') { const a = $('#pw1').value; if (a !== $('#pw2').value) return toast('Ulangi sandi baru tidak sama.', 'err'); api('password', { lama: $('#pw0').value, baru: a }).then(() => { toast('Sandi diperbarui. Masuk kembali.', 'ok'); setTimeout(() => logout(true), 900); }).catch(er => toast(er.message, 'err')); }
});

/* ───────── Boot ───────── */
renderPublic();
refreshPublic();
})();
