/* Klien REST untuk backend Google Apps Script.
 * - GET  : data publik (tanpa login)
 * - POST : header WAJIB text/plain agar tidak memicu CORS preflight yang diblok GAS */
(function () {
  'use strict';
  const cfg = () => {
    const u = (window.APP_CONFIG && window.APP_CONFIG.GAS_URL) || '';
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec/.test(u)) throw new Error('GAS_URL belum diisi dengan benar di js/config.js');
    return u;
  };
  async function parse(res) {
    const t = await res.text();
    try { return JSON.parse(t); } catch (e) { throw new Error('Respons server tidak valid. Pastikan deployment GAS: Execute as Me, akses Anyone.'); }
  }
  async function withTimeout(fn, ms) {
    const c = new AbortController(), id = setTimeout(() => c.abort(), ms || 60000);
    try { return await fn(c.signal); }
    catch (e) { throw new Error(e.name === 'AbortError' ? 'Server terlalu lama merespons. Coba lagi.' : (e.message === 'Failed to fetch' ? 'Tidak dapat terhubung ke server. Periksa koneksi & GAS_URL.' : e.message)); }
    finally { clearTimeout(id); }
  }
  window.GasAPI = {
    get(action, params) {
      return withTimeout(async s => { const u = new URL(cfg()); u.searchParams.set('action', action); Object.keys(params || {}).forEach(k => u.searchParams.set(k, params[k])); return parse(await fetch(u.toString(), { signal: s })); });
    },
    post(body) {
      return withTimeout(async s => parse(await fetch(cfg(), { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), signal: s })), 90000);
    }
  };
})();
