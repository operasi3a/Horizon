window.__HZ_APP = 1;

/* HORIZON HQI — app.js (vanilla JS PWA). Backend: Google Apps Script (lihat backend/*.gs) */
(function () {
  const C = window.HORIZON_CONFIG;
  const S = { token: '', user: null, boot: null, view: 'home', mapsReady: false, cache: {}, scope: 'ALL' }; // scope: lingkup aktif untuk role global (Manajemen/SuperAdmin)
  const $ = (sel, root) => (root || document).querySelector(sel);
  const el = (tag, attrs, ...kids) => { const n = document.createElement(tag); Object.entries(attrs || {}).forEach(([k, v]) => { if (k === 'class') n.className = v; else if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else if (k === 'html') n.innerHTML = v; else if (v != null && v !== false) n.setAttribute(k, v); /* v1.7.1: null/false = atribut tidak dipasang (sebelumnya setAttribute('disabled', null) membuat tombol Ya/Cukup/Tidak nonaktif) */ }); kids.flat().forEach(k => k != null && n.append(k.nodeType ? k : document.createTextNode(cleanTxt(k)))); return n; };
  /** v1.7.2: jaring pengaman terakhir — kata "null"/"undefined"/"NaN" yang lolos dari penggabungan string tampil sebagai "–" (laporan Rudy: teks null di Beranda). */
  const cleanTxt = v => String(v).replace(/\b(null|undefined|NaN)\b/g, '–');
  /** v1.10 (audit keamanan): escape HTML untuk teks dari database yang masuk ke innerHTML / tooltip Leaflet (nama zona, vendor, kategori). */
  const esc = v => cleanTxt(v == null ? '' : v).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  // v1.7.3: SUMBER teks "null" di Beranda — replaceChildren(..., null) (mis. kartu tren HQI yang kosong) menyisipkan teks node "null".
  // Semua pemanggilan replaceChildren di aplikasi kini menyaring null/undefined secara terpusat.
  const _rc = Element.prototype.replaceChildren;
  Element.prototype.replaceChildren = function () { return _rc.apply(this, Array.from(arguments).flat().filter(k => k != null)); };
  const ICON = {
    home: '<svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>',
    temuan: '<svg viewBox="0 0 24 24"><path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9Z"/></svg>',
    checklist: '<svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>',
    spot: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
    laporan: '<svg viewBox="0 0 24 24"><path d="M4 19V5M4 19h16M9 19v-6M14 19v-9"/></svg>',
    heatmap: '<svg viewBox="0 0 24 24"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z"/><path d="M9 4v14M15 6v14"/></svg>',
    admin: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>',
    cam: '<svg viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z"/><circle cx="12" cy="13" r="4"/></svg>',
    leaderboard: '<svg viewBox="0 0 24 24"><path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4a3 3 0 0 0 3 3M17 6h3a3 3 0 0 1-3 3"/></svg>',
  };
  const NAV_BY_ROLE = {
    PersonilRekanan: ['home', 'temuan', 'heatmap'], Mandor: ['home', 'temuan', 'heatmap', 'checklist', 'laporan'],
    KaryawanOrganik: ['home', 'temuan', 'heatmap', 'spot', 'checklist', 'leaderboard', 'laporan'], Admin: ['home', 'temuan', 'heatmap', 'spot', 'leaderboard', 'laporan', 'admin'], Manajemen: ['home', 'temuan', 'heatmap', 'laporan'],
    SuperAdmin: ['home', 'temuan', 'heatmap', 'spot', 'checklist', 'leaderboard', 'laporan', 'admin'],   // v1.12: + verifikasi checklist   // v1.5: Admin & SuperAdmin juga bisa spot-check; v1.6: Leaderboard menu sendiri; v1.7: Heatmap menu sendiri (semua role); v1.7.1: Leaderboard hanya Organik/Admin/SuperAdmin
  };
  const NAV_LABEL = { home: 'Beranda', temuan: 'Temuan', checklist: 'Checklist', spot: 'Spot-Check', laporan: 'Laporan', admin: 'Admin', leaderboard: 'Leaderboard', heatmap: 'Heatmap' };

  // ---------------- util UI
  function toast(msg, isErr) { const t = $('#toast'); t.textContent = msg; t.className = 'toast' + (isErr ? ' err' : ''); clearTimeout(t._t); t._t = setTimeout(() => t.classList.add('hidden'), 3200); }
  function modal(node) { const m = $('#modal'); $('#modal-card').replaceChildren(node); m.classList.remove('hidden'); }
  function closeModal() { $('#modal').classList.add('hidden'); if (S._camDone) { const f = S._camDone; S._camDone = null; f(null); } }
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal' && !S._modalLock) closeModal(); });
  // v1.7.1: kesalahan JS yang tidak tertangkap ditampilkan sebagai toast (memudahkan laporan bug dari lapangan), tidak lagi diam di console
  window.addEventListener('error', e => { if (e.message) toast('Kesalahan aplikasi: ' + e.message, true); });
  window.addEventListener('unhandledrejection', e => { const r = e.reason; toast('Kesalahan aplikasi: ' + (r && r.message ? r.message : String(r)), true); });
  const ST_LABEL = { Open: 'Open', InProgress: 'In Progress', MenungguVerifikasi: 'Menunggu Verifikasi', Close: 'Close' };   // v1.19
  const stLabel = st => ST_LABEL[st] || st || '-';
  const fmtDT = iso => iso ? String(iso).replace('T', ' ').slice(0, 16) : '-';
  const fmtMin = m => { m = Math.round(Number(m) || 0); return m >= 60 ? Math.floor(m / 60) + ' jam' + (m % 60 ? ' ' + (m % 60) + 'm' : '') : m + ' menit'; };
  const zonaName = id => (S.boot.zones.find(z => z.id === id) || {}).nama_area || id || '-';
  /** Nilai aman untuk ditampilkan: null/undefined/NaN (mis. dari JSON server) → pengganti, bukan teks "null" (perbaikan v1.7). */
  const nz = (v, d) => v == null || (typeof v === 'number' && isNaN(v)) ? (d === undefined ? '–' : d) : v;
  const vendorName = id => (S.boot.vendors.find(v => v.id === id) || {}).nama || id;
  /** v1.18: waktu lokal HP 'yyyy-MM-ddTHH:mm:ss' (WIB) — dipakai untuk waktu isi antrean offline & tanggal hari ini. */
  const localIso = (d) => { d = d || new Date(); const p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()); };
  const monthStart = () => localIso().slice(0, 8) + '01';
  const today = () => localIso().slice(0, 10);   // v1.18: tanggal lokal (sebelumnya UTC)
  // v1.20: frekuensi checklist zona (1/2/3/7 hari) & blok tetap — cermin zonaFrek_/blokKey_/blokAkhir_ di Hqi.gs (hasil harus sama)
  const zFrek = z => { const n = Number(z && z.frekuensi_hari); return n === 2 || n === 3 || n === 7 ? n : 1; };
  const labelFrek = n => n === 7 ? '1×/minggu' : n > 1 ? '1×/' + n + ' hari' : '1×/hari';
  const tglLokal = t => new Date(String(t).slice(0, 10) + 'T00:00:00');
  const tglPendek = t => tglLokal(t).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
  function blokKey(t, n) { t = String(t).slice(0, 10); if (n === 1) return t; const d = tglLokal(t);
    if (n === 7) { d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return 'W' + localIso(d).slice(0, 10); }
    let k = 0; const x = tglLokal(t.slice(0, 8) + '01'); for (; x <= d; x.setDate(x.getDate() + 1)) if (x.getDay() % 6) k++;
    return t.slice(0, 7) + '-b' + Math.floor((Math.max(1, k) - 1) / n); }
  function blokAkhir(t, n) { const k = blokKey(t, n); let akhir = String(t).slice(0, 10); const d = tglLokal(akhir);
    for (let i = 0; i < 10; i++) { d.setDate(d.getDate() + 1); const s2 = localIso(d).slice(0, 10); if (blokKey(s2, n) !== k) break; if (d.getDay() % 6) akhir = s2; } return akhir; }
  const periodeIni = n => n === 1 ? 'hari ini' : n === 7 ? 'minggu ini' : 'periode ini';
  /** v1.20: teks kepatuhan satu zona dari server (frekuensi, terisi, wajib). */
  const kpTeks = z => z.frekuensi > 1 ? z.terisi + ' / ' + z.wajib + ' blok (' + labelFrek(z.frekuensi) + ')' : nz(z.terisi, z.hari_terisi) + ' / ' + nz(z.wajib, '-') + ' hari';

  // ---------------- storage aman (iframe Apps Script bisa memblokir localStorage di beberapa browser)
  const mem = {}; const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return mem[k] || null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { mem[k] = v; } }, del: k => { try { localStorage.removeItem(k); } catch (e) { delete mem[k]; } } };
  S.token = store.get('hz_token') || ''; S.scope = store.get('hz_scope') || 'ALL';
  // ---------------- API via google.script.run + antrean offline (IndexedDB, best-effort)
  const idb = { db: null, open() { return new Promise(res => { try { const r = indexedDB.open('horizon', 1); r.onupgradeneeded = () => r.result.createObjectStore('queue', { keyPath: 'id', autoIncrement: true }); r.onsuccess = () => { idb.db = r.result; res(); }; r.onerror = () => res(); } catch (e) { res(); } }); },
    add(item) { return new Promise((res, rej) => { try { const tx = idb.db.transaction('queue', 'readwrite'); tx.objectStore('queue').add(item); tx.oncomplete = res; tx.onerror = () => rej(tx.error || new Error('IndexedDB')); tx.onabort = () => rej(tx.error || new Error('IndexedDB')); } catch (e) { rej(e); } }); },
    put(item) { return new Promise(res => { try { const tx = idb.db.transaction('queue', 'readwrite'); tx.objectStore('queue').put(item); tx.oncomplete = res; tx.onerror = res; } catch (e) { res(); } }); },
    all() { return new Promise(res => { const r = idb.db.transaction('queue').objectStore('queue').getAll(); r.onsuccess = () => res(r.result || []); }); },
    del(id) { return new Promise(res => { const tx = idb.db.transaction('queue', 'readwrite'); tx.objectStore('queue').delete(id); tx.oncomplete = res; }); } };
  // v1.18: aksi yang boleh masuk antrean offline (label untuk daftar antrean)
  const OFFLINE_ACTIONS = { createFinding: 'Temuan baru', closeFinding: 'Tutup temuan', submitDailyChecklist: 'Checklist harian', submitSpotCheck: 'Spot-check' };
  const WRITE_ACTIONS = Object.keys(OFFLINE_ACTIONS);
  const newClientId = () => 'h' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);   // kode unik kiriman (anti-dobel di server)
  /**
   * Panggil backend. Dua mode (v1.11.1):
   *  - disajikan Apps Script (HtmlService)  → google.script.run.apiCall
   *  - frontend mandiri (Cloudflare Pages)  → fetch POST text/plain ke C.API_URL (/exec → doPost); text/plain = "simple request" tanpa preflight CORS
   */
  /**
   * v1.17.2 (laporan Rudy: "tidak ada informasi sedang menyimpan, tiba-tiba muncul notif selesai"): indikator proses global.
   *  - setiap panggilan server → bilah tipis bergerak di tepi atas layar
   *  - aksi tulis (simpan/kirim/hapus/verifikasi, termasuk di dalam batch) → pil "Menyimpan perubahan…" di atas + tombol di layar/dialog dikunci
   *    sampai server menjawab (mencegah klik ganda); toast hasil tetap muncul seperti biasa
   */
  const WRITE_RE = /^(request|create|update|upsert|delete|submit|verify|close|start|review|set|import|remove|change|archive)/;
  const BUSY_LABEL = [[/^(submit|create)/, 'Mengirim data…'], [/^(delete|remove)/, 'Menghapus…'], [/^verify/, 'Menyimpan verifikasi…'], [/^import/, 'Mengimpor user…'], [/^archive/, 'Mengarsipkan…']];
  const busy = { n: 0, w: 0, bar: null, pill: null, txt: null };
  function busyWrite(body) { const acts = body.action === 'batch' ? (body.calls || []).map(c => c.action || '') : [body.action || ''];
    const w = acts.find(a => WRITE_RE.test(a)); if (!w) return null; const l = BUSY_LABEL.find(([re]) => re.test(w)); return l ? l[1] : 'Menyimpan perubahan…'; }
  function busyRender() {
    if (!busy.bar) { busy.bar = el('div', { class: 'busy-bar hidden' }); busy.txt = el('span', {}); busy.pill = el('div', { class: 'busy-pill hidden', role: 'status', 'aria-live': 'polite' }, el('span', { class: 'spin' }), busy.txt); document.body.append(busy.bar, busy.pill); }
    busy.bar.classList.toggle('hidden', !busy.n); busy.pill.classList.toggle('hidden', !busy.w); document.body.classList.toggle('saving', busy.w > 0); }
  function callServer(body, opt) {
    const label = busyWrite(body); busy.n++; if (label) { busy.w++; busyRender(); busy.txt.textContent = label; } else busyRender();
    const done = () => { busy.n = Math.max(0, busy.n - 1); if (label) busy.w = Math.max(0, busy.w - 1); busyRender(); };
    return callServerRaw(body, opt).then(j => { done(); return j; }, e => { done(); throw e; });
  }
  /** v1.18: error jaringan (sinyal putus, server tak menjawab, 5xx) diberi e.network = true → aksi tulis masuk antrean offline. */
  const netErr = msg => { const e = new Error(msg); e.network = true; return e; };
  function callServerRaw(body, opt) {
    const bad = () => new Error('Server tidak mengembalikan data yang valid (respons kosong) — coba lagi; bila berulang, laporkan aksi "' + body.action + '"');
    if (window.google && google.script && google.script.run) return new Promise((res, rej) => { const tg = opt && opt.timeout ? setTimeout(() => rej(netErr('Server tidak menjawab (sinyal lemah)')), opt.timeout) : 0; google.script.run.withSuccessHandler(j => { clearTimeout(tg); j && typeof j === 'object' ? res(j) : rej(bad()); }).withFailureHandler(e => { clearTimeout(tg); rej(new Error((e && e.message) || String(e))); }).apiCall(body); });
    if (!C.API_URL) return Promise.reject(new Error('Backend tidak dikonfigurasi (API_URL kosong)'));
    const ac = opt && opt.timeout && window.AbortController ? new AbortController() : null; const tm = ac ? setTimeout(() => ac.abort(), opt.timeout) : 0;
    return fetch(C.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), redirect: 'follow', signal: ac ? ac.signal : undefined })
      .then(r => { if (r.status >= 500) throw netErr('Server sibuk (' + r.status + ')'); if (!r.ok) throw new Error('Server menjawab ' + r.status); return r.json(); })
      .then(j => { clearTimeout(tm); if (j && typeof j === 'object') return j; throw bad(); })
      .catch(e => { clearTimeout(tm); if (e.network) throw e; if (e.name === 'AbortError') throw netErr('Server tidak menjawab (sinyal lemah)'); if (e.name === 'TypeError' || /Failed to fetch|NetworkError|Load failed/i.test(e.message)) throw netErr('Tidak dapat menghubungi server — periksa koneksi internet'); throw e; });
  }
  /** v1.20.2: aksi baca dibatasi waktunya dan dicoba ulang SEKALI bila server diam/sibuk. Hanya aksi di daftar ini — aksi tulis tidak pernah diulang otomatis (bisa tersimpan dua kali). */
  const READ_ACTIONS = ['bootstrap', 'photo', 'photos', 'listFindings', 'listPendingVerification', 'myChecklists', 'myChecklistsToday', 'history', 'checklistCompliance', 'adminRecords', 'listSpotChecks', 'dashboard', 'heatmap', 'report', 'leaderboard', 'listUsers', 'zoneSummary', 'listQuestions', 'listSchedules', 'listPabrik', 'adminLog', 'archiveInfo', 'listAnomali', 'listPekerjaanBesar', 'itemFindings', 'historyItems'];
  const readTimeout = acts => acts.some(a => a === 'photo' || a === 'photos') ? 90000 : 45000;   // foto besar di sinyal lemah butuh lebih lama
  async function callRead(body, acts) {
    const opt = { timeout: readTimeout(acts) };
    try { return await callServer(body, opt); }
    catch (e) { if (!e.network || !navigator.onLine || body.token !== S.token) throw e; await new Promise(r => setTimeout(r, 1500)); return callServer(body, opt); }
  }
  async function api(action, payload, opt) {
    const body = Object.assign({ action, token: S.token }, payload || {});
    if (S.boot && S.boot.isMulti && body.pabrik_id === undefined) body.pabrik_id = S.scope;   // role global / multi-lingkup: kirim lingkup aktif
    const offl = !!idb.db && WRITE_ACTIONS.includes(action);   // v1.18 (O1/O3): kode unik + waktu isi; antrean bila offline atau sinyal putus saat mengirim
    if (offl) { if (!body.client_id) body.client_id = newClientId(); if (!body.waktu_isi) body.waktu_isi = localIso(); }
    if (offl && !navigator.onLine) return queueWrite(body);
    let j; try { j = READ_ACTIONS.includes(action) ? await callRead(body, [action]) : await callServer(body, offl ? { timeout: 90000 } : null); } catch (e) { if (offl && e.network) return queueWrite(body, e.message); throw e; }
    if (!j.ok) { if (/login/i.test(j.error) && !(opt && opt.silent) && body.token === S.token) logout(); throw new Error(j.error); }   // v1.16: jawaban terlambat dari token lama tidak mengeluarkan sesi baru
    return j.data;
  }
  /** v1.16: beberapa aksi dalam SATU panggilan server (Code.gs runBatch_) — tiap panggilan Apps Script ±1,5–3 dtk, jadi menggabungkan = menghemat waktu tunggu.
   *  Hasil: array {ok,data,error} sesuai urutan calls. Lingkup aktif ditambahkan seperti api(). */
  async function apiBatch(calls, opt) {
    const multi = S.boot && S.boot.isMulti, tok = S.token;
    const body = { action: 'batch', token: tok, calls: calls.map(c => multi && c.pabrik_id === undefined ? Object.assign({ pabrik_id: S.scope }, c) : c) };
    const acts = calls.map(c => c.action), j = await (acts.every(a => READ_ACTIONS.includes(a)) ? callRead(body, acts) : callServer(body));   // v1.20.2
    const err = !j.ok ? j.error : ((j.data || []).find(r => !r.ok && /login/i.test(r.error)) || {}).error;
    if (err && /login/i.test(err) && !(opt && opt.silent) && tok === S.token) logout();
    if (!j.ok) throw new Error(j.error);
    return j.data;
  }
  /** v1.16: simpan + bootstrap ulang dalam satu panggilan (sebelumnya dua panggilan berurutan). Mengembalikan data aksi simpan (atau array bila >1 aksi). */
  async function saveAndBoot(writes) {
    if (!navigator.onLine) throw new Error('Tidak ada koneksi internet — perubahan belum tersimpan');
    const r = await apiBatch(writes.concat([{ action: 'bootstrap', pabrik_id: S.scope }]));
    S.pre = {}; const b = r[r.length - 1]; if (b.ok) { S.boot = b.data; saveBoot(); }
    const bad = r.slice(0, -1).find(x => !x.ok); if (bad) throw new Error(bad.error);
    return writes.length === 1 ? r[0].data : r.slice(0, -1).map(x => x.data);
  }
  /** v1.16: satu aksi simpan + bootstrap (argumen sama dengan api()). Offline / backend lama → jalur lama (api lalu bootstrap). */
  async function apiSave(action, payload) {
    try { return await saveAndBoot([Object.assign({ action }, payload || {})]); }
    catch (e) { if (!/Action tidak dikenal: batch/.test(e.message)) throw e; const d = await api(action, payload); S.boot = await api('bootstrap'); saveBoot(); return d; }
  }
  /** v1.16: bootstrap (+ dashboard bila diminta) dalam satu panggilan. dash = {ok,data,error} atau null. */
  async function fetchBoot(withDash, opt) {
    const calls = [{ action: 'bootstrap', pabrik_id: S.scope }]; if (withDash) calls.push({ action: 'dashboard', pabrik_id: S.scope });
    let r; try { r = await apiBatch(calls, opt); }
    catch (e) { if (!/Action tidak dikenal: batch/.test(e.message)) throw e;   // backend lama (frontend Pages lebih baru dari /exec) → panggilan terpisah
      const boot = await api('bootstrap', { pabrik_id: S.scope }, opt); if (!withDash) return { boot, dash: null };
      return { boot, dash: await api('dashboard', { pabrik_id: S.scope }, { silent: true }).then(data => ({ ok: true, data }), err => ({ ok: false, error: err.message })) }; }
    if (!r[0].ok) throw new Error(r[0].error);
    return { boot: r[0].data, dash: r[1] || null };
  }
  /** "Prefetch" data layar (dipakai SEKALI oleh swrView, maks. 15 dtk; dibuang setiap ada simpan) — mis. dashboard yang ikut batch login/bootstrap. */
  function setPre(key, promise) { promise.catch(() => { }); S.pre = S.pre || {}; S.pre[key] = { p: promise, t: Date.now() }; }
  function preDash(dash) { if (dash) setPre('dashboard:' + S.scope, dash.ok ? Promise.resolve(dash.data) : Promise.reject(new Error(dash.error))); }

  // ---------------- v1.16: data tersimpan di perangkat (localStorage) — layar langsung tampil dari data terakhir lalu diperbarui di belakang
  //  - hz_boot: bootstrap terakhir + token pemiliknya; hz_c:<user>:<kunci>: data layar (Beranda, daftar Temuan)
  //  - dihapus saat logout; dipakai hanya bila token masih berumur < TOKEN_MAX_MS (TTL sesi server 6 jam)
  const TOKEN_MAX_MS = 5.8 * 3600 * 1000, LS_PFX = 'hz_c:';
  const saved = {
    key: k => LS_PFX + (S.user ? S.user.id : '-') + ':' + k,
    get(k) { try { const s = localStorage.getItem(saved.key(k)); return s ? JSON.parse(s) : null; } catch (e) { return null; } },
    set(k, v) { const key = saved.key(k); try { const s = JSON.stringify(v); if (s.length > 1500000) throw new Error('besar'); localStorage.setItem(key, s); } catch (e) { try { localStorage.removeItem(key); } catch (e2) { } } },
    clear() { try { Object.keys(localStorage).filter(k => k.indexOf(LS_PFX) === 0 || k === 'hz_boot').forEach(k => localStorage.removeItem(k)); } catch (e) { } },
  };
  function saveBoot() { try { localStorage.setItem('hz_boot', JSON.stringify({ token: S.token, boot: S.boot })); } catch (e) { try { localStorage.removeItem('hz_boot'); } catch (e2) { } } }
  function loadBoot() { try { const at = Number(store.get('hz_tok_at')) || 0; if (!at || Date.now() - at > TOKEN_MAX_MS) return null;
    const o = JSON.parse(localStorage.getItem('hz_boot') || 'null'); return o && o.token === S.token && o.boot && o.boot.user ? o.boot : null; } catch (e) { return null; } }
  /**
   * v1.16: pola "tampilkan yang tersimpan, perbarui di belakang" untuk layar baca. render(data) menggambar ulang c.
   * Data tersimpan → tampil seketika + catatan "memperbarui…"; data baru tiba → disimpan & digambar ulang bila berbeda (posisi gulir dipertahankan).
   * Tidak ada data tersimpan → perilaku lama (Memuat… lalu tampil). Bila pengguna sudah pindah layar, hasil diabaikan.
   */
  async function swrView(c, key, fetcher, render) {
    const seq = S.goSeq, old = saved.get(key);
    const pe = S.pre && S.pre[key]; if (pe) delete S.pre[key]; const pre = pe && Date.now() - pe.t < 15000 ? pe.p : null;
    const note = (txt, spin) => { const n = c.querySelector('.stale-note'); if (n) n.replaceChildren(spin ? el('span', { class: 'spin' }) : null, txt); };
    if (old) { try { render(old); c.prepend(el('p', { class: 'hint stale-note' })); note('Menampilkan data tersimpan · memperbarui…', true); } catch (e) { } }
    let fresh;
    try { fresh = await (pre || fetcher()); }
    catch (e) { if (!old || seq !== S.goSeq) throw e; note('Data tersimpan — gagal memperbarui: ' + e.message); return; }
    saved.set(key, fresh);
    if (seq !== S.goSeq) return;
    if (old && JSON.stringify(old) === JSON.stringify(fresh)) { const n = c.querySelector('.stale-note'); if (n) n.remove(); return; }
    const sc = c.scrollTop; render(fresh); if (old) c.scrollTop = sc;
  }
  // ---------------- v1.18 (O1–O4): antrean offline — data disimpan di HP (IndexedDB) bila tidak ada sinyal / sinyal putus saat mengirim,
  //  dikirim otomatis saat sinyal kembali (event online + coba ulang tiap 60 dtk), memakai kode unik agar tidak dobel di server.
  //  Hanya milik user yang sedang login yang dikirim. Ditolak server (mis. "sudah diisi") → tetap terlihat di daftar antrean sampai dihapus.
  async function queueWrite(body, why) {
    try { await idb.add({ body, t: Date.now(), user: S.user ? S.user.id : '', lastError: why || 'Tidak ada sinyal' }); }
    catch (e) { throw new Error('Tidak ada sinyal dan data gagal disimpan di HP (' + (e && e.message || 'memori penuh?') + ') — coba lagi saat ada sinyal'); }
    updateQueueBadge(); return { queued: true, id: body.client_id };
  }
  async function myQueue() { if (!idb.db || !S.user) return []; return (await idb.all()).filter(it => !it.user || it.user === S.user.id); }
  let flushing = false;
  async function flushQueue(manual) {
    if (flushing || !idb.db || !S.token || !S.user) return; if (!navigator.onLine && !manual) return; flushing = true; let sent = 0, ditolak = 0;
    try { for (const it of await myQueue()) { if (it.rejected && !manual) continue;
        try { const j = await callServer(Object.assign({}, it.body, { token: S.token, dari_antrean: true }), { timeout: 90000 });
          if (j.ok) { await idb.del(it.id); sent++; }
          else if (/sesi|login/i.test(j.error)) { it.lastError = 'Perlu login ulang untuk mengirim'; await idb.put(it); break; }
          else { it.lastError = j.error; it.rejected = true; await idb.put(it); ditolak++; } }
        catch (e) { it.lastError = e.message; await idb.put(it); break; } } }
    finally { flushing = false; }
    await updateQueueBadge();
    if (sent) toast(sent + ' data dari antrean berhasil terkirim');
    if (ditolak) toast(ditolak + ' data antrean ditolak server — buka daftar antrean (ikon panah di atas)', true);
    return sent;
  }
  async function updateQueueBadge() { const b = document.getElementById('btn-queue'); if (!b) return; const n = (await myQueue()).length; b.classList.toggle('hidden', !n); b.querySelector('.badge').textContent = n; S.queueCount = n; }
  async function openQueue() { const items = await myQueue(); const list = el('div', { class: 'list' }); const info = el('p', { class: 'hint' });
    const render = async () => { const its = await myQueue(); info.textContent = its.length ? its.length + ' data tersimpan di HP ini dan belum terkirim. Jangan hapus data situs/browser sebelum semuanya terkirim.' : 'Semua data sudah terkirim.';
      list.replaceChildren(...its.map(it => { const b = it.body || {};
        return el('div', { class: 'card row-card' }, el('div', { class: 'info' }, el('b', {}, (OFFLINE_ACTIONS[b.action] || b.action) + (b.zona_id ? ' · ' + zonaName(b.zona_id) : '')),
          el('span', {}, 'Diisi ' + fmtDT(b.waktu_isi || new Date(it.t).toISOString()) + ' · ' + (it.rejected ? 'Ditolak server: ' : 'Menunggu sinyal') + (it.lastError && it.rejected ? it.lastError : ''))),
          el('button', { class: 'btn sm danger', onclick: async () => { if (!await confirmModal('Hapus data ini dari HP?\nData yang belum terkirim akan hilang.')) { openQueue(); return; } await idb.del(it.id); await updateQueueBadge(); openQueue(); } }, 'Hapus')); })); };
    const send = el('button', { class: 'btn primary', onclick: async () => { send.disabled = true; await flushQueue(true); send.disabled = false; render(); } }, 'Kirim sekarang');
    modal(el('div', { class: 'form' }, el('div', { class: 'section-head' }, el('h3', {}, 'Antrean belum terkirim'), el('a', { class: 'link', onclick: closeModal }, 'Tutup')), info, list, items.length ? send : null)); render(); }
  setInterval(() => { if (S.queueCount) flushQueue(); }, 60000);   // sinyal sering kembali tanpa event "online"
  window.addEventListener('online', () => { $('#offline-bar').classList.add('hidden'); flushQueue(); });
  window.addEventListener('offline', () => $('#offline-bar').classList.remove('hidden'));

  // ---------------- foto: kamera langsung + kompresi + watermark tanggal/jam
  // ---------------- foto: kamera saja, tanpa galeri/explorer (PRD 7.3 & 8; v1.6 → v1.7)
  // Browser MEMBLOKIR getUserMedia di dalam iframe Apps Script (Permissions Policy; dilaporkan luas sejak Feb 2026), sehingga ada tiga jalur:
  //  (1) HP/tablet : <input type=file capture=environment> → langsung membuka aplikasi kamera (Android Chrome & iOS Safari), bukan galeri
  //  (2) laptop/PC di dalam iframe : jendela popup top-level (Kamera.html lewat blob URL, atau CAMERA_RELAY_URL bila diset) — getUserMedia
  //      berjalan di jendela itu, foto dikirim balik lewat postMessage (popupCamera)
  //  (3) halaman tidak dibingkai (mis. uji lokal) : getUserMedia langsung di modal aplikasi (openCamera)
  //  Pemilih file hanya cadangan terakhir, ditawarkan lewat dialog bila jalur di atas gagal (popup diblokir / kamera ditolak).
  // v1.7.1 (keputusan Rudy): HANYA kamera — tidak ada input file/galeri/explorer sama sekali, di HP maupun laptop.
  //  - di dalam iframe Apps Script (produksi): popupCamera() di semua perangkat (jendela/tab baru Kamera.html, getUserMedia di sana)
  //  - tidak dibingkai (uji lokal): openCamera() di modal aplikasi
  //  Bila kamera gagal, hanya ada "Coba lagi" / "Tutup" (tanpa cadangan pilih file).
  const isFramed = () => { try { return window.self !== window.top; } catch (e) { return true; } };
  // v1.7.6: HP/tablet memakai APLIKASI KAMERA BAWAAN lewat <input capture="environment"> — Android Chrome & iOS Safari membuka kamera langsung
  // (bukan galeri). Uji Rudy 17 Sep 2026: jendela kamera web di Safari iPhone ditolak "AbortError" meski origin sudah benar, jadi jalur popup hanya untuk laptop/PC.
  const isPhone = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));   // iPadOS menyamar sebagai Mac
  const nativeCamera = () => new Promise(resolve => {   // dibuat & di-klik di dalam gesture pengguna (syarat browser); resolve(null) bila dibatalkan
    const input = el('input', { type: 'file', accept: 'image/*', capture: 'environment' }); input.style.display = 'none'; document.body.append(input);
    let done = false; const finish = f => { if (done) return; done = true; input.remove(); resolve(f || null); };
    input.addEventListener('change', () => finish(input.files[0]));
    input.addEventListener('cancel', () => finish(null));
    input.click(); });
  function cameraSlot(label, onCapture) {
    const slot = el('div', { class: 'camera-slot', html: ICON.cam + '<span>' + label + '</span>' });
    const setPhoto = dataUrl => { slot.replaceChildren(el('img', { src: dataUrl })); slot.dataset.value = dataUrl; onCapture && onCapture(dataUrl); };
    const shoot = async () => { if (slot.dataset.busy) return;
      if (isPhone()) { const f = await nativeCamera(); if (f) setPhoto(await processPhoto(f)); return; }   // HP: kamera bawaan (watermark tetap ditambahkan processPhoto)
      slot.dataset.busy = '1';
      try {
        let shot = null;
        if (isFramed()) shot = await popupCamera();                          // dibuka sinkron di dalam klik (anti pemblokir popup)
        else if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) shot = await openCamera();
        else throw new Error('Browser tidak mendukung kamera web');
        if (shot) setPhoto(await processPhoto(shot));
      } catch (err) { cameraFailModal(err, shoot); }
      delete slot.dataset.busy; };
    slot.addEventListener('click', shoot);
    return slot;
  }
  /** Dialog bila kamera gagal: jelaskan penyebab + "Coba lagi" (tanpa cadangan galeri/file — foto wajib dari kamera). */
  function cameraFailModal(err, retry) {
    const name = err && (err.name || err.message) || 'tidak diketahui';
    const why = /NotAllowed|Permission|policy|blokir/i.test(name + ' ' + (err && err.message || '')) ? 'Browser menolak/memblokir akses kamera (' + name + '). Izinkan kamera untuk situs ini (ikon gembok di bilah alamat) dan pastikan popup/jendela baru tidak diblokir, lalu coba lagi.'
      : /NotFound|Devices/i.test(name) ? 'Kamera tidak ditemukan di perangkat ini (' + name + ').' : 'Kamera tidak dapat diakses (' + name + ').';
    modal(el('div', { class: 'form' }, el('h3', {}, 'Kamera tidak tersedia'), el('p', { class: 'hint' }, why),
      el('p', { class: 'hint' }, 'Foto wajib diambil langsung dari kamera (tidak ada unggah dari galeri/explorer).'),
      el('div', { class: 'form-row' }, el('button', { class: 'btn', onclick: closeModal }, 'Tutup'), el('button', { class: 'btn primary', onclick: () => { closeModal(); retry(); } }, 'Coba lagi'))));
  }
  /** v1.9.3: ambil GPS lewat jendela top-level (blob URL) bila geolocation diblokir Permissions Policy di dalam iframe; hasil kembali via postMessage. Harus dipanggil dari klik pengguna. */
  function popupGeo() {
    return new Promise((resolve, reject) => {
      const page = '<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Horizon — GPS</title></head>'
        + '<body style="margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:20px;background:#06101f;color:#dbe7ff;font-family:system-ui,Segoe UI,Roboto,sans-serif;text-align:center">'
        + '<h1 style="font-size:16px;margin:0;color:#fff">Horizon — Lokasi GPS</h1><p id="m" style="font-size:13px;line-height:1.5;margin:0;max-width:360px">Mengambil lokasi… Bila browser bertanya, pilih <b>Izinkan</b>.</p>'
        + '<button id="r" style="display:none;border:0;border-radius:12px;padding:12px 18px;font-weight:700;background:#3B82F6;color:#fff">Coba lagi</button><button id="c" style="border:0;border-radius:12px;padding:10px 16px;background:rgba(255,255,255,.12);color:#fff">Batal</button>'
        + '<script>(function(){var m=document.getElementById("m"),r=document.getElementById("r");function send(o){try{if(window.opener)window.opener.postMessage(o,"*");}catch(e){}}'
        + 'function go(){r.style.display="none";m.textContent="Mengambil lokasi… Bila browser bertanya, pilih Izinkan.";if(!navigator.geolocation){m.textContent="Browser tidak mendukung GPS.";send({hz:"geo-error",message:"tidak didukung"});return;}'
        + 'navigator.geolocation.getCurrentPosition(function(p){send({hz:"geo",lat:p.coords.latitude,lng:p.coords.longitude,acc:p.coords.accuracy});m.textContent="Lokasi terkirim ke aplikasi. Jendela ini akan ditutup…";setTimeout(function(){window.close();},400);},'
        + 'function(e){m.textContent="GPS gagal ("+(e.message||("kode "+e.code))+"). Aktifkan Lokasi di HP dan izinkan lokasi untuk situs ini, lalu Coba lagi.";r.style.display="inline-block";},{enableHighAccuracy:true,timeout:20000,maximumAge:0});}'
        + 'r.onclick=go;document.getElementById("c").onclick=function(){send({hz:"geo-cancel"});window.close();};go();})();<\/script></body></html>';
      const url = URL.createObjectURL(new Blob([page], { type: 'text/html' }));
      const win = window.open(url, 'hz-gps', 'popup=yes,width=440,height=340');
      if (!win) return reject(new Error('jendela baru diblokir browser'));
      let done = false;
      const finish = (fn, v) => { if (done) return; done = true; window.removeEventListener('message', onMsg); clearInterval(poll); setTimeout(() => URL.revokeObjectURL(url), 5000); try { if (!win.closed) win.close(); } catch (e) { } fn(v); };
      const onMsg = e => { if (e.source !== win || !e.data || !e.data.hz) return;
        if (e.data.hz === 'geo') finish(resolve, { lat: +e.data.lat, lng: +e.data.lng, acc: +e.data.acc || 0 }); else if (e.data.hz === 'geo-cancel') finish(reject, new Error('dibatalkan')); };
      window.addEventListener('message', onMsg);
      const poll = setInterval(() => { if (win.closed) finish(reject, new Error('jendela ditutup')); }, 600);
    });
  }
  /** Popup kamera untuk laptop/PC di dalam iframe Apps Script (v1.7): Kamera.html dibuka sebagai jendela top-level; foto kembali via postMessage. */
  function popupCamera() {
    return new Promise((resolve, reject) => {
      const tpl = $('#cam-tpl'); const relay = (C.CAMERA_RELAY_URL || '').trim();
      const url = relay || (tpl ? URL.createObjectURL(new Blob([tpl.innerHTML], { type: 'text/html' })) : '');
      if (!url) return reject(new Error('Halaman kamera tidak tersedia'));
      const win = window.open(url, 'hz-kamera', 'popup=yes,width=840,height=760');
      if (!win) return reject(new Error('Popup diblokir browser — izinkan popup untuk situs ini'));
      let done = false;
      const finish = (fn, v) => { if (done) return; done = true; window.removeEventListener('message', onMsg); clearInterval(poll); if (!relay) setTimeout(() => URL.revokeObjectURL(url), 5000); try { if (!win.closed) win.close(); } catch (e) { } fn(v); };
      const onMsg = e => { if (e.source !== win || !e.data || !e.data.hz) return;
        if (e.data.hz === 'photo') finish(resolve, e.data.dataUrl);
        else if (e.data.hz === 'camera-cancel') finish(resolve, null);
        else if (e.data.hz === 'camera-error') { const er = new Error(e.data.message || 'Kamera ditolak'); er.name = e.data.name || 'NotAllowedError'; finish(reject, er); } };
      window.addEventListener('message', onMsg);
      const poll = setInterval(() => { if (win.closed) finish(resolve, null); }, 500);
      toast('Kamera dibuka di jendela baru — ambil foto di sana');
    });
  }
  /** Modal kamera: pratinjau video → "Ambil foto" → Blob JPEG (lalu dikompres + watermark oleh processPhoto). */
  function openCamera() {
    return new Promise((resolve, reject) => {
      let stream = null, facing = 'environment';
      const video = el('video', { autoplay: '', playsinline: '', class: 'cam-video' }); video.muted = true; video.setAttribute('muted', '');
      const msg = el('p', { class: 'hint' }, 'Menyalakan kamera…');
      const shotBtn = el('button', { class: 'btn primary', type: 'button' }, 'Ambil foto'), flipBtn = el('button', { class: 'btn sm', type: 'button' }, 'Ganti kamera');
      const stop = () => { if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; };
      const done = v => { S._camDone = null; stop(); closeModal(); resolve(v); }; S._camDone = done;   // ditutup dari backdrop → resolve(null)
      const start = async () => { stop(); msg.textContent = 'Menyalakan kamera…'; shotBtn.disabled = true;
        try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1600 }, height: { ideal: 1200 } }, audio: false }); video.srcObject = stream; await video.play().catch(() => {}); msg.textContent = 'Arahkan kamera ke objek, lalu tap "Ambil foto". Foto diberi watermark tanggal/jam otomatis.'; shotBtn.disabled = false; }
        catch (e) { S._camDone = null; stop(); closeModal(); reject(e); } };
      shotBtn.addEventListener('click', () => { const cv = document.createElement('canvas'); cv.width = video.videoWidth || 1280; cv.height = video.videoHeight || 960; cv.getContext('2d').drawImage(video, 0, 0, cv.width, cv.height); cv.toBlob(b => done(b), 'image/jpeg', 0.92); });
      flipBtn.addEventListener('click', () => { facing = facing === 'environment' ? 'user' : 'environment'; start(); });
      modal(el('div', { class: 'form' }, el('div', { class: 'section-head' }, el('h3', {}, 'Kamera'), el('a', { class: 'link', onclick: () => done(null) }, 'Batal')), video, msg, el('div', { class: 'form-row' }, flipBtn, shotBtn)));
      start();
    });
  }
  function processPhoto(file) {
    return new Promise((resolve, reject) => { const img = new Image(); const isStr = typeof file === 'string'; const url = isStr ? file : URL.createObjectURL(file);   // file: Blob/File atau data URL (dari popup kamera)
      img.onload = () => { const scale = Math.min(1, C.PHOTO_MAX_SIDE / Math.max(img.width, img.height)); const cv = document.createElement('canvas'); cv.width = Math.round(img.width * scale); cv.height = Math.round(img.height * scale);
        const ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0, cv.width, cv.height);
        // v1.7.1: watermark tegas — pita gelap selebar foto di bawah: "HORIZON HQI" + tanggal/jam (+ nama pengguna), ukuran relatif lebar foto
        const d = new Date(), p2 = n => String(n).padStart(2, '0'); const stamp = p2(d.getDate()) + '/' + p2(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes());
        const fs = Math.max(16, Math.round(cv.width / 26)), pad = Math.round(fs * .6), barH = Math.round(fs * 2.9);
        ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, cv.height - barH, cv.width, barH);
        ctx.fillStyle = '#5EC8FF'; ctx.font = 'bold ' + Math.round(fs * .9) + 'px Inter, Arial, sans-serif'; ctx.textBaseline = 'alphabetic'; ctx.fillText('HORIZON HQI', pad, cv.height - barH + fs * 1.15);
        ctx.fillStyle = '#fff'; ctx.font = 'bold ' + fs + 'px Inter, Arial, sans-serif'; ctx.fillText(stamp + (S.user ? '  ·  ' + S.user.nama : ''), pad, cv.height - fs * .55);
        if (!isStr) URL.revokeObjectURL(url); resolve(cv.toDataURL('image/jpeg', C.PHOTO_QUALITY)); };
      img.onerror = reject; img.src = url; });
  }
  // v1.16: foto dimuat BERKELOMPOK — semua foto yang diminta satu layar dalam ±30 ms digabung ke API.photos (6 per panggilan, paralel),
  //  bukan satu panggilan Apps Script per foto. Hasil disimpan di S.cache.
  //  v1.24 (paket cepat, keputusan Rudy 27 Nov 2026): foto juga DISIMPAN DI HP (IndexedDB 'hz_foto') — isi berkas Drive per id tidak pernah berubah, jadi foto yang
  //  sudah pernah dibuka tampil seketika tanpa panggilan Apps Script. Maks. FOTO_MAX foto (yang paling lama tidak dibuka dibuang); dikosongkan saat logout.
  const FOTO_MAX = 250;
  const fotoDB = (() => { let p = null; const open = () => p || (p = new Promise(res => { try { const r = indexedDB.open('hz_foto', 1); r.onupgradeneeded = () => { r.result.createObjectStore('f'); r.result.createObjectStore('m'); }; r.onsuccess = () => res(r.result); r.onerror = () => res(null); r.onblocked = () => res(null); } catch (e) { res(null); } }));
    const run = (stores, mode, fn) => open().then(db => !db ? null : new Promise(res => { try { const t = db.transaction(stores, mode); let out = null; fn(t, v => { out = v; }); t.oncomplete = () => res(out); t.onerror = t.onabort = () => res(null); } catch (e) { res(null); } }));
    let ditulis = 0;
    const pangkas = () => run(['f', 'm'], 'readwrite', t => { const m = t.objectStore('m'); const ks = m.getAllKeys(), vs = m.getAll(); vs.onsuccess = () => { const a = ks.result.map((k, i) => [k, vs.result[i]]).sort((x, y) => x[1] - y[1]); a.slice(0, Math.max(0, a.length - FOTO_MAX)).forEach(([k]) => { m.delete(k); t.objectStore('f').delete(k); }); }; });
    return {
      get: id => run(['f', 'm'], 'readwrite', (t, set) => { const q = t.objectStore('f').get(id); q.onsuccess = () => { if (q.result) { set(q.result); t.objectStore('m').put(Date.now(), id); } }; }),
      put: (id, d) => run(['f', 'm'], 'readwrite', t => { t.objectStore('f').put(d, id); t.objectStore('m').put(Date.now(), id); }).then(() => { if (++ditulis % 20 === 1) pangkas(); }),
      clear: () => run(['f', 'm'], 'readwrite', t => { t.objectStore('f').clear(); t.objectStore('m').clear(); }) }; })();
  //  v1.25 (keputusan Rudy 27 Nov 2026): tampilan memakai FOTO KECIL (pratinjau Drive, kunci cache 'k:<id>', 20 per panggilan); foto penuh hanya saat diketuk
  //  (lightbox). Diukur 26 Nov: 6 foto penuh = 3,4 MB / 10 dtk. Bila foto penuh sudah ada di HP, itu yang dipakai.
  const photoQ = { wait: {}, timer: 0 };
  function photoData(id, kecil) {
    if (S.cache[id]) return Promise.resolve(S.cache[id]);
    const key = kecil ? 'k:' + id : id; if (S.cache[key]) return Promise.resolve(S.cache[key]);
    if (photoQ.wait[key]) return photoQ.wait[key].p;
    const w = { sent: false, siap: false, fid: id, kecil: !!kecil }; w.p = new Promise((res, rej) => { w.res = res; w.rej = rej; }); photoQ.wait[key] = w;
    const cari = kecil ? fotoDB.get(id).then(d => d || fotoDB.get(key)) : fotoDB.get(id);
    cari.then(d => { if (photoQ.wait[key] !== w) return; if (d) { delete photoQ.wait[key]; S.cache[key] = d; w.res(d); return; } w.siap = true; clearTimeout(photoQ.timer); photoQ.timer = setTimeout(flushPhotos, 30); });
    return w.p;
  }
  function flushPhotos() {
    const keys = Object.keys(photoQ.wait).filter(k => photoQ.wait[k].siap && !photoQ.wait[k].sent); keys.forEach(k => { photoQ.wait[k].sent = true; });
    const done = (key, d, e) => { const w = photoQ.wait[key]; if (!w) return; delete photoQ.wait[key]; if (d) { S.cache[key] = d; fotoDB.put(key, d); w.res(d); } else w.rej(e || new Error('Foto tidak ditemukan')); };
    [true, false].forEach(kecil => { const ks = keys.filter(k => photoQ.wait[k] && photoQ.wait[k].kecil === kecil); const per = kecil ? 20 : 6;
      for (let i = 0; i < ks.length; i += per) { const part = ks.slice(i, i + per); const ids = part.map(k => photoQ.wait[k].fid);
        api('photos', { file_ids: ids, kecil: kecil || undefined }).then(r => part.forEach((k, j) => done(k, r && r[ids[j]]))).catch(e => part.forEach(k => done(k, null, e))); } });
  }
  /** Gambar foto untuk tampilan (versi kecil). data-fid dipakai lightbox untuk memuat foto penuh saat diketuk. */
  async function photoImg(fileId, cls) { const img = el('img', { class: (cls || '') + ' hz-photo', alt: '', 'data-fid': fileId || null }); if (!fileId) return img; try { img.src = await photoData(fileId, true); } catch (e) { } return img; }

  // ---------------- Peta: Leaflet + tile OpenStreetMap / Esri World Imagery (tanpa API key, tanpa billing)
  // Google Maps ditinggalkan (v1.3, 15 Sep 2026): butuh billing account, dan HeatmapLayer/DrawingManager sudah dihapus Google (v3.65).
  const LEAFLET = { js: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js', css: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css' };
  const TILES = {
    satelit: () => L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: 'Tiles &copy; Esri &mdash; Esri, Maxar, Earthstar Geographics, GIS User Community' }),
    jalan: () => L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }),
  };
  S._mapBoxes = [];
  /** Muat pustaka Leaflet (CSS + JS) sekali; gagal muat / timeout → pesan jelas, bisa dicoba lagi saat pindah layar. */
  function loadMaps() {
    if (window.L && S.mapsReady) return Promise.resolve(); if (S._mapsP) return S._mapsP;
    S._mapsP = new Promise((res, rej) => {
      const fail = msg => { S._mapsP = null; rej(new Error(msg)); };
      const timer = setTimeout(() => fail('Pustaka peta tidak merespons dalam 20 detik — periksa koneksi internet lalu buka ulang halaman'), 20000);
      if (!document.querySelector('link[data-hz-leaflet]')) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = LEAFLET.css; l.setAttribute('data-hz-leaflet', '1'); document.head.append(l); }
      const s = document.createElement('script'); s.async = true; s.src = LEAFLET.js;
      s.onload = () => { clearTimeout(timer); S.mapsReady = true; res(); };
      s.onerror = () => { clearTimeout(timer); fail('Pustaka peta (Leaflet) gagal dimuat — periksa koneksi internet atau pemblokir konten di browser'); };
      document.head.append(s);
    });
    return S._mapsP;
  }
  /** Tampilkan pesan kegagalan peta di dalam kotak peta (bukan gagal diam-diam). */
  function mapError(box, msg) { box.replaceChildren(el('div', { class: 'map-err' }, el('b', {}, 'Peta tidak dapat ditampilkan'), el('span', {}, msg))); }
  /** Buat peta Leaflet di kotak `box`: lapisan Satelit (Esri) default + Jalan (OSM), pusat & zoom dari konfigurasi. */
  function newMap(box, opts) {
    const o = Object.assign({ zoomControl: true, layerControl: true }, opts || {});
    const map = L.map(box, { zoomControl: o.zoomControl, attributionControl: true }).setView([+C.MAP_CENTER.lat, +C.MAP_CENTER.lng], C.MAP_ZOOM);
    const base = { 'Satelit': TILES.satelit(), 'Jalan': TILES.jalan() }; base.Satelit.addTo(map);
    if (o.layerControl) L.control.layers(base, null, { position: 'topright' }).addTo(map);
    S._mapBoxes.push(box); return map;
  }
  const ZONE_STYLE = { color: '#5EC8FF', weight: 2, fillColor: '#3B82F6', fillOpacity: .18 };
  const toLL = p => Array.isArray(p) ? [+p[0], +p[1]] : [+(p || {}).lat, +(p || {}).lng];
  const PIN_ICON = () => L.divIcon({ className: 'hz-pin', iconSize: [22, 30], iconAnchor: [11, 30] });
  function drawZones(map, zones, onClick) { return zones.filter(z => Array.isArray(z.polygon) && z.polygon.length >= 3).map(z => { const poly = L.polygon(z.polygon.map(toLL), ZONE_STYLE).addTo(map); if (onClick) poly.on('click', e => onClick(z, e)); return poly; }); }
  /** Point-in-polygon (ray casting) — pengganti google.maps.geometry.poly.containsLocation. */
  function pointInPolygon(pt, poly) { let inside = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const yi = +poly[i].lat, xi = +poly[i].lng, yj = +poly[j].lat, xj = +poly[j].lng; if (((yi > pt.lat) !== (yj > pt.lat)) && (pt.lng < (xj - xi) * (pt.lat - yi) / (yj - yi) + xi)) inside = !inside; } return inside; }
  function zoneAt(ll) { return S.boot.zones.find(z => z.polygon.length > 2 && pointInPolygon({ lat: +ll.lat, lng: +ll.lng }, z.polygon)); }
  /** Zona terdekat dari titik (jarak ke titik sudut polygon) — untuk pin di luar zona. */
  function nearestZone(ll) { let best = null, bd = Infinity; S.boot.zones.forEach(z => z.polygon.forEach(p => { const d = Math.pow(+p.lat - ll.lat, 2) + Math.pow(+p.lng - ll.lng, 2); if (d < bd) { bd = d; best = z; } })); return best; }
  /** Posisikan peta agar seluruh zona terlihat (posisi awal default); false bila belum ada zona. */
  /**
   * v1.23 (keputusan Rudy 26 Nov 2026): bantuan lokasi verifikasi checklist. geoNow = satu pembacaan GPS HP (null bila ditolak/gagal);
   * zonaTengah = titik tengah polygon zona; jarakArah = jarak & arah mata angin dari posisi saya.
   */
  function geoNow(maxAge) { return new Promise(res => { if (!navigator.geolocation) return res(null); navigator.geolocation.getCurrentPosition(p => res({ lat: p.coords.latitude, lng: p.coords.longitude, akurasi: Math.round(p.coords.accuracy) }), () => res(null), { enableHighAccuracy: true, timeout: 10000, maximumAge: maxAge == null ? 30000 : maxAge }); }); }
  function zonaTengah(z) { const p = (z && Array.isArray(z.polygon) ? z.polygon : []).map(toLL).filter(x => isFinite(x[0]) && isFinite(x[1])); if (!p.length) return null; return { lat: p.reduce((a, x) => a + x[0], 0) / p.length, lng: p.reduce((a, x) => a + x[1], 0) / p.length }; }
  function jarakArah(a, b) { const R = 6371000, rad = x => x * Math.PI / 180; const dLa = rad(b.lat - a.lat), dLn = rad(b.lng - a.lng);
    const h = Math.sin(dLa / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLn / 2) ** 2; const m = 2 * R * Math.asin(Math.sqrt(h));
    const brg = (Math.atan2(Math.sin(dLn) * Math.cos(rad(b.lat)), Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(dLn)) * 180 / Math.PI + 360) % 360;
    return { m, arah: ['utara', 'timur laut', 'timur', 'tenggara', 'selatan', 'barat daya', 'barat', 'barat laut'][Math.round(brg / 45) % 8] }; }
  const fmtJarak = m => m < 1000 ? Math.round(m / 10) * 10 + ' m' : (m / 1000).toFixed(1).replace('.', ',') + ' km';
  function fitZones(map, zones) { const pts = []; (zones || S.boot.zones).forEach(z => (Array.isArray(z.polygon) ? z.polygon : []).forEach(p => { const ll = toLL(p); if (isFinite(ll[0]) && isFinite(ll[1])) pts.push(ll); })); if (pts.length < 2) return false; map.fitBounds(L.latLngBounds(pts), { padding: [28, 28], maxZoom: 18 }); return true; }
  /** Heatmap kanvas: gradasi radial per titik, intensitas mengikuti bobot. points = [{lat,lng,w}] */
  function heatLayer(map, points, radius) {
    const cv = L.DomUtil.create('canvas', 'leaflet-zoom-hide'); cv.style.cssText = 'position:absolute;pointer-events:none';
    const Layer = L.Layer.extend({
      onAdd(m) { m.getPanes().overlayPane.appendChild(cv); m.on('moveend zoomend resize', this._draw, this); this._draw(); },
      onRemove(m) { cv.remove(); m.off('moveend zoomend resize', this._draw, this); },
      _draw() { const size = map.getSize(); cv.width = size.x; cv.height = size.y; L.DomUtil.setPosition(cv, map.containerPointToLayerPoint([0, 0]));
        const ctx = cv.getContext('2d'); ctx.clearRect(0, 0, size.x, size.y); const maxW = Math.max(1, ...points.map(p => p.w || 1));
        points.forEach(p => { const px = map.latLngToContainerPoint([p.lat, p.lng]); const a = (p.cool ? 0.3 : 0.45) + 0.5 * ((p.w || 1) / maxW);
          // v1.12.1: p.cool (temuan Close) = biru-hijau redup; selain itu merah-oranye (belum selesai)
          const g = ctx.createRadialGradient(px.x, px.y, 0, px.x, px.y, radius);
          if (p.cool) { g.addColorStop(0, 'rgba(20,184,166,' + (a * .8) + ')'); g.addColorStop(.5, 'rgba(59,130,246,' + (a * .35) + ')'); g.addColorStop(1, 'rgba(59,130,246,0)'); }
          else { g.addColorStop(0, 'rgba(255,60,40,' + a + ')'); g.addColorStop(.5, 'rgba(255,170,0,' + (a * .55) + ')'); g.addColorStop(1, 'rgba(255,220,0,0)'); }
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px.x, px.y, radius, 0, Math.PI * 2); ctx.fill(); }); },
    });
    const inst = new Layer(); inst.addTo(map); return inst;
  }
  /**
   * Mode gambar/edit polygon manual (v1.3, diperbaiki v1.7): tap peta menambah titik (mode gambar); titik (pegangan putih) bisa digeser;
   * pegangan kecil di tengah sisi menyisipkan titik baru; tap pegangan putih menghapus titik (di luar mode gambar, min. 3 titik);
   * `resume()` melanjutkan mode gambar pada polygon yang sudah ada; `load()` memuat polygon tersimpan dan memusatkan peta ke sana.
   */
  function polygonDrawer(map, style) {
    const D = { polygon: null, drawing: false, onDone: null, onChange: null, pts: [], handles: [] }; const cont = map.getContainer(); const st = Object.assign({}, ZONE_STYLE, style || {});
    const changed = () => { D.onChange && D.onChange(D.pts.length); };
    const render = () => { if (!D.polygon) return; D.polygon.setLatLngs(D.pts.map(toLL)); D.handles.forEach(h => h.remove()); D.handles = [];
      D.pts.forEach((p, i) => D.handles.push(L.marker(toLL(p), { draggable: true, icon: L.divIcon({ className: 'hz-vertex', iconSize: [16, 16] }), zIndexOffset: 1000 }).addTo(map)
        .on('drag', e => { const q = e.target.getLatLng(); D.pts[i] = { lat: q.lat, lng: q.lng }; D.polygon.setLatLngs(D.pts.map(toLL)); D.handles.filter(h => h.options.hzMid).forEach(h => h.remove()); })
        .on('dragend', () => { render(); changed(); })
        .on('click', e => { L.DomEvent.stopPropagation(e); if (D.drawing) return; if (D.pts.length <= 3) return toast('Polygon minimal 3 titik — titik tidak dihapus', true); D.pts.splice(i, 1); render(); changed(); toast('Titik dihapus'); })));
      // pegangan tengah sisi (v1.7): tap untuk menyisipkan titik baru — cara menambah titik pada polygon zona yang sudah tersimpan
      if (!D.drawing && D.pts.length >= 3) D.pts.forEach((p, i) => { const q = D.pts[(i + 1) % D.pts.length]; const m = { lat: (p.lat + q.lat) / 2, lng: (p.lng + q.lng) / 2 };
        D.handles.push(L.marker(toLL(m), { hzMid: true, icon: L.divIcon({ className: 'hz-vertex mid', iconSize: [12, 12] }), zIndexOffset: 900 }).addTo(map)
          .on('click', e => { L.DomEvent.stopPropagation(e); D.pts.splice(i + 1, 0, m); render(); changed(); toast('Titik ditambahkan — geser ke posisi yang diinginkan'); })); }); };
    D.count = () => D.pts.length;
    const same = (a, b) => a && b && Math.abs(a.lat - b.lat) < 1e-7 && Math.abs(a.lng - b.lng) < 1e-7;
    const addPt = e => { if (!D.drawing || !e.latlng) return; D.pts.push({ lat: e.latlng.lat, lng: e.latlng.lng }); render(); changed(); };
    map.on('click', addPt);
    map.on('dblclick', () => { if (!D.drawing) return; while (D.pts.length > 1 && same(D.pts[D.pts.length - 1], D.pts[D.pts.length - 2])) D.pts.pop(); render(); D.finish(); }); // dblclick didahului 2 click di titik sama
    const setMode = on => { cont.style.cursor = on ? 'crosshair' : ''; if (on) map.doubleClickZoom.disable(); else map.doubleClickZoom.enable(); };
    D.start = () => { D.clear(); D.polygon = L.polygon([], st).addTo(map); D.drawing = true; setMode(true); };
    D.resume = () => { if (!D.polygon) return D.start(); D.drawing = true; setMode(true); render(); };   // lanjut menambah titik di ujung polygon yang ada
    D.undo = () => { if (D.drawing && D.pts.length) { D.pts.pop(); render(); changed(); } };
    D.finish = () => { if (D.pts.length < 3) { toast('Polygon minimal 3 titik', true); return false; } D.drawing = false; setMode(false); render(); D.onDone && D.onDone(D.polygon); return true; };
    D.clear = () => { if (D.polygon) D.polygon.remove(); D.handles.forEach(h => h.remove()); D.polygon = null; D.pts = []; D.handles = []; D.drawing = false; setMode(false); };
    D.load = path => { D.clear(); D.pts = (Array.isArray(path) ? path : []).map(p => Array.isArray(p) ? { lat: +p[0], lng: +p[1] } : p && typeof p === 'object' ? { lat: +p.lat, lng: +p.lng } : null).filter(p => p && isFinite(p.lat) && isFinite(p.lng)); D.polygon = L.polygon([], st).addTo(map); render();   // v1.7.1: titik rusak/null dibersihkan
      if (D.pts.length >= 2) map.fitBounds(D.polygon.getBounds(), { padding: [36, 36], maxZoom: 19 }); else if (D.pts.length) map.panTo(toLL(D.pts[0])); };
    D.path = () => D.pts.map(p => ({ lat: p.lat, lng: p.lng }));
    return D;
  }

  // ---------------- auth
  async function login() { const id = $('#login-id').value.trim(), pin = $('#login-pin').value; const msg = $('#login-msg'), b = $('#btn-login');
    if (!id || !pin) { msg.textContent = 'Isi ID login dan password'; msg.className = 'hint err'; return; }
    msg.className = 'hint'; msg.replaceChildren(el('span', { class: 'spin' }), 'Memeriksa akun… (server Google kadang butuh 3–10 detik saat pertama dibuka)'); b.disabled = true;
    const slow = setTimeout(() => { if (b.disabled) msg.append(' Masih menunggu jawaban server…'); }, 12000);
    // v1.16: login + bootstrap + dashboard dalam SATU panggilan (sebelumnya tiga panggilan berurutan ±6 dtk)
    try { const j = await callServer({ action: 'login', user_id: id, pin, then: [{ action: 'bootstrap', pabrik_id: S.scope }, { action: 'dashboard', pabrik_id: S.scope }] }); if (!j.ok) throw new Error(j.error);
      S.token = j.data.token; store.set('hz_token', S.token); store.set('hz_tok_at', String(Date.now()));
      const t = j.data.then; if (t && t[0] && t[0].ok) { preDash(t[1]); enterApp(t[0].data); } else await boot();   // backend lama (tanpa "then") → jalur biasa
      msg.textContent = ''; $('#login-pin').value = ''; }
    catch (e) { msg.textContent = e.message; msg.className = 'hint err'; }
    finally { clearTimeout(slow); b.disabled = false; } }
  /**
   * v1.24: "bangunkan" server Apps Script begitu layar login tampil — server yang lama tidak dipakai butuh beberapa detik untuk siap (cold start);
   * jeda itu kini terjadi selagi pengguna mengetik ID & password, bukan saat menekan Masuk. Hanya ping (GET ?action=ping), tanpa data apa pun.
   */
  function bangunkan() { if (!C.API_URL || !navigator.onLine) return; try { fetch(C.API_URL + '?action=ping', { mode: 'no-cors', cache: 'no-store', credentials: 'omit' }).catch(() => { }); } catch (e) { } }
  function logout() { S.token = ''; store.del('hz_token'); store.del('hz_tok_at'); saved.clear(); S.pre = {}; S.cache = {}; fotoDB.clear(); bangunkan();   /* v1.24 */ $('#screen-app').classList.add('hidden'); $('#screen-login').classList.remove('hidden'); }
  /** v1.16: buka aplikasi. Ada bootstrap tersimpan (token sama & belum kedaluwarsa) → tampil SEKETIKA, lalu bootstrap+dashboard diperbarui di belakang (satu panggilan). */
  async function boot() {
    const cached = loadBoot();
    if (cached) { const tok = S.token, p = fetchBoot(true, { silent: true }); S.pre = {}; setPre('dashboard:' + S.scope, p.then(r => { if (!r.dash.ok) throw new Error(r.dash.error); return r.dash.data; }));
      enterApp(cached);
      p.then(r => { if (tok !== S.token) return; const navSig = b => JSON.stringify([b.user, b.isMulti, b.pabrikList, (b.pabrik || []).map(x => x.id)]); const relayout = navSig(r.boot) !== navSig(S.boot);
        S.boot = r.boot; S.user = r.boot.user; saveBoot(); if (relayout) { buildNav(); buildScope(); go(S.view); } if (S.user.mustChange && !cached.user.mustChange) openAccount(true); })
        .catch(e => { if (tok !== S.token) return; if (/login|sesi/i.test(e.message)) { logout(); $('#login-msg').textContent = e.message; } else toast('Gagal memperbarui data: ' + e.message, true); });
      return; }
    try { const r = await fetchBoot(true, { silent: true }); preDash(r.dash); enterApp(r.boot); }
    catch (e) { logout(); $('#login-msg').textContent = e.message; } }
  function enterApp(b) { S.boot = b; S.user = b.user; saveBoot(); $('#screen-login').classList.add('hidden'); $('#screen-app').classList.remove('hidden'); buildNav(); buildScope(); go('home'); updateQueueBadge(); flushQueue(); S._lastRefresh = Date.now();
    if (S.user.mustChange) openAccount(true); }   // v1.10: password default wajib diganti
  const roleLabel = r => ({ PersonilRekanan: 'Personil Rekanan', Mandor: 'Mandor/Koordinator', KaryawanOrganik: 'Karyawan Organik', Admin: 'Admin Pabrik', Manajemen: 'Manajemen', SuperAdmin: 'Super Admin' }[r] || r);
  /** Pemilih lingkup di header untuk role global (Manajemen/SuperAdmin): "Semua lingkup" atau satu pabrik. */
  /** Daftar pabrik yang boleh dilihat user ini (v1.12: role global → semua; multi-lingkup → miliknya). */
  const myPabriks = () => S.boot.pabrikList === 'ALL' ? S.boot.pabrik : S.boot.pabrik.filter(p => (S.boot.pabrikList || []).indexOf(p.id) !== -1);
  const pabNames = id => id === 'ALL' ? 'Semua lingkup' : String(id || '').split(',').filter(Boolean).map(x => (S.boot.pabrik.find(p => p.id === x) || {}).nama || x).join(', ');
  function buildScope() { const old = $('#scope-sel'); if (old) old.remove(); if (!S.boot.isMulti) return;
    const s = el('select', { id: 'scope-sel', class: 'scope-sel', title: 'Lingkup' }, el('option', { value: 'ALL' }, S.boot.isGlobal ? 'Semua lingkup' : 'Semua lingkup saya'), ...myPabriks().map(p => el('option', { value: p.id }, p.nama)));
    s.value = myPabriks().some(p => p.id === S.scope) ? S.scope : 'ALL'; S.scope = s.value;
    s.addEventListener('change', async () => { S.scope = s.value; store.set('hz_scope', S.scope); try { const r = await fetchBoot(S.view === 'home'); S.boot = r.boot; saveBoot(); if (r.dash && r.dash.ok) saved.set('dashboard:' + S.scope, r.dash.data); if (S.view === 'home') preDash(r.dash); } catch (e) { return toast(e.message, true); } go(S.view); });   // v1.16: bootstrap + dashboard satu panggilan
    $('.hdr-actions').prepend(s); }
  const scopeName = () => { if (!S.boot.isMulti) return pabNames(S.user.pabrik_id); return S.scope === 'ALL' ? (S.boot.isGlobal ? 'Semua lingkup' : 'Semua lingkup saya') : pabNames(S.scope); };
  /** Panel admin yang butuh satu pabrik: role global harus memilih lingkup dulu. */
  const needScope = b => { if (S.boot.isMulti && S.scope === 'ALL') { b.replaceChildren(el('p', { class: 'empty' }, 'Pilih satu lingkup pabrik di menu kanan atas untuk mengelola data ini.')); return true; } return false; };
  /** Pertanyaan yang berlaku untuk zona tertentu: "Semua zona" (ALL) + khusus zona itu (PRD 7.10.2b). */
  /** v1.7.1: zona_id pertanyaan = 'ALL' atau daftar id zona dipisah koma ("z1,z3") — satu pertanyaan bisa dipakai banyak zona. */
  const qZones = q => { const s = String(q.zona_id == null ? 'ALL' : q.zona_id).trim(); return !s || s === 'ALL' ? 'ALL' : s === 'NONE' ? [] : s.split(',').map(x => x.trim()).filter(Boolean); };   // 'NONE' = belum dipakai zona mana pun
  const qAppliesTo = (q, zonaId) => { const z = qZones(q); return z === 'ALL' || z.indexOf(zonaId) !== -1; };
  function qFor(zonaId, modul) { const z = S.boot.zones.find(x => x.id === zonaId);   // v1.7.2: hanya pertanyaan pabrik zona itu (role global "Semua lingkup" sempat menumpuk pertanyaan semua pabrik)
    return S.boot.questions.filter(q => (!z || q.pabrik_id === z.pabrik_id) && (q.berlaku_untuk === 'Keduanya' || q.berlaku_untuk === modul) && qAppliesTo(q, zonaId)); }
  /** v1.7.2: peta kecil di form checklist/spot-check — semua zona digambar, zona terpilih disorot; tap zona di peta memilihnya; GPS (bila diizinkan) menandai posisi & menyarankan zona yang benar. */
  function zoneMapPicker(zsel, zones) {
    const box = el('div', { class: 'map map-pick' }); const hint = el('p', { class: 'hint' }, 'Memuat peta zona…'); const wrap = el('div', { class: 'zone-pick' }, box, hint);
    const HOT = { color: '#FFB020', fillColor: '#FF7A1A', fillOpacity: .35, weight: 3 }; let map = null; const polys = {};
    const pick = id => { zsel.value = id; zsel.dispatchEvent(new Event('change')); };
    const paint = () => { Object.keys(polys).forEach(id => { polys[id].setStyle(id === zsel.value ? HOT : ZONE_STYLE); if (id === zsel.value) polys[id].bringToFront(); }); const p = polys[zsel.value]; if (p) map.fitBounds(p.getBounds(), { padding: [26, 26], maxZoom: 19 }); };
    loadMaps().then(() => { map = newMap(box, { layerControl: false });
      zones.forEach(z => { if (!(z.polygon || []).length) return; const p = L.polygon(z.polygon.map(toLL), ZONE_STYLE).addTo(map); p.bindTooltip(esc(z.nama_area), { permanent: true, direction: 'center', className: 'zone-label' }); p.on('click', () => pick(z.id)); polys[z.id] = p; });
      paint(); hint.textContent = 'Zona terpilih disorot oranye — pastikan sesuai lokasi Anda. Tap zona lain di peta untuk memilihnya.';
      if (navigator.geolocation) navigator.geolocation.getCurrentPosition(pos => { const ll = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        L.circleMarker([ll.lat, ll.lng], { radius: 7, color: '#fff', fillColor: '#3B82F6', fillOpacity: 1, weight: 2 }).addTo(map).bindTooltip('Posisi Anda (±' + Math.round(pos.coords.accuracy) + ' m)');
        const at = zones.find(z => (z.polygon || []).length > 2 && pointInPolygon(ll, z.polygon));
        if (at && at.id !== zsel.value) { hint.className = 'hint warn-text'; hint.replaceChildren('GPS menunjukkan Anda berada di zona "' + at.nama_area + '", bukan "' + zonaName(zsel.value) + '". ', el('a', { class: 'link', onclick: () => pick(at.id) }, 'Pakai zona ' + at.nama_area)); }
        else if (at) { hint.className = 'hint'; hint.textContent = 'GPS mengonfirmasi Anda berada di zona "' + at.nama_area + '".'; } }, () => { }, { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }); }).catch(e => mapError(box, e.message));
    zsel.addEventListener('change', () => { if (map) paint(); });
    return wrap;
  }
  function confirmModal(msg) { return new Promise(res => { const done = v => { closeModal(); res(v); }; modal(el('div', { class: 'form' }, el('h3', {}, 'Konfirmasi'), el('p', { class: 'hint', style: 'white-space:pre-line' }, msg), el('div', { class: 'form-row' }, el('button', { class: 'btn', onclick: () => done(false) }, 'Batal'), el('button', { class: 'btn danger', onclick: () => done(true) }, 'Ya, lanjutkan')))); }); }

  // ---------------- nav
  const NAV_SHORT = { spot: 'Spot', leaderboard: 'Ranking' };   // label ringkas untuk navigasi bawah HP (hingga 7 menu)
  function buildNav() { const items = NAV_BY_ROLE[S.user.role] || ['home']; const mk = short => items.map(v => el('div', { class: 'nav-item', 'data-view': v, onclick: () => go(v), html: ICON[v] }, el('p', {}, (short && NAV_SHORT[v]) || NAV_LABEL[v])));
    // blok identitas di panel navigasi (tablet/PC): logo sekunder + nama + role (+ pabrik)
    const pab = S.user.pabrik_id === 'ALL' ? '' : ' · ' + pabNames(S.user.pabrik_id);
    const who = el('div', { class: 'nav-user', title: S.user.nama + ' · ' + roleLabel(S.user.role) + ' — tap untuk akun & ganti password', onclick: openAccount }, el('span', { class: 'logo-mark' }), el('div', { class: 'nav-user-txt' }, el('b', {}, S.user.nama), el('span', {}, roleLabel(S.user.role) + pab)));
    // v1.7: logo Departemen Operasi Pabrik IIIA di bagian bawah panel navigasi (versi putih di mode gelap, berwarna di mode terang — Logo.html)
    const foot = el('div', { class: 'nav-foot', title: 'Departemen Operasi Pabrik III A' }, el('span', { class: 'logo-op', role: 'img', 'aria-label': 'Operasi 3A' }));
    $('#nav-rail').replaceChildren(who, ...mk(false), foot); $('#bottom-nav').replaceChildren(...mk(true)); }
  // ---------------- akun & ganti password (v1.7, semua role) — server: API.changePin (wajib password lama, hash bersalt)
  function openAccount(force) { force = force === true; S._modalLock = force;
    const lama = el('input', { type: 'password', autocomplete: 'current-password', placeholder: 'Password lama' }), baru = el('input', { type: 'password', autocomplete: 'new-password', placeholder: 'Minimal 6 karakter' }), ulang = el('input', { type: 'password', autocomplete: 'new-password', placeholder: 'Ulangi password baru' });
    const btn = el('button', { class: 'btn primary', onclick: async () => { if (baru.value.length < 6) return toast('Password baru minimal 6 karakter', true); if (baru.value !== ulang.value) return toast('Ulangan password tidak sama', true); btn.disabled = true;
      try { await api('changePin', { pin_lama: lama.value, pin_baru: baru.value }); S._modalLock = false; if (S.user) S.user.mustChange = false; closeModal(); toast('Password diganti — pakai password baru saat login berikutnya'); if (force) go('home'); } catch (e) { toast(e.message, true); btn.disabled = false; } } }, 'Simpan password');
    if (force) lama.value = '123456';
    modal(el('div', { class: 'form' }, el('div', { class: 'section-head' }, el('h3', {}, force ? 'Ganti password default' : 'Akun saya'), force ? el('a', { class: 'link', onclick: () => { S._modalLock = false; closeModal(); logout(); } }, 'Keluar') : el('a', { class: 'link', onclick: closeModal }, 'Tutup')),
      force ? el('p', { class: 'hint warn-text' }, 'Akun ini masih memakai password default 123456. Demi keamanan, buat password baru dulu sebelum memakai aplikasi.') : null,
      el('p', { class: 'hint' }, S.user.nama + ' · ' + roleLabel(S.user.role) + ' · ID login: ' + S.user.id),
      el('h3', {}, 'Ganti password'), el('p', { class: 'hint' }, 'Boleh huruf, angka, dan simbol (minimal 6 karakter). Disimpan sebagai hash bersalt — tidak ada yang bisa membaca password Anda, termasuk Admin.'),
      fld('Password lama', lama), fld('Password baru', baru), fld('Ulangi password baru', ulang), btn));
  }
  function go(view, arg) { S.goSeq = (S.goSeq || 0) + 1; S.view = view; S.viewArg = arg || null; document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === view)); const c = $('#content'); c.replaceChildren(el('p', { class: 'empty' }, 'Memuat...')); (VIEWS[view] || VIEWS.home)(c, arg).catch(e => { c.replaceChildren(el('p', { class: 'empty err' }, e.message)); }); }

  const VIEWS = {};
  // ================= BERANDA
  // v1.16: Beranda = swrView (data tersimpan tampil seketika; dashboard hasil batch login/bootstrap dipakai bila ada)
  VIEWS.home = (c) => swrView(c, 'dashboard:' + S.scope, () => api('dashboard', { pabrik_id: S.scope }), d => renderHome(c, d));
  function renderHome(c, d) {
    const g = d.grafik || {};
    const pab = d.pabrik_id === 'ALL' ? 'Semua lingkup' : String(d.pabrik_id || '').indexOf(',') !== -1 ? 'Semua lingkup saya' : pabNames(nz(d.pabrik_id, '-'));
    // v1.7: semua angka lewat nz() — nilai null/NaN dari server tampil "–", bukan teks "null"
    const hqiCards = (d.hqi || []).map(h => { const v = Number(nz(h.hqi_final, 0)); const ring = el('div', { class: 'ring', style: 'background:conic-gradient(var(--aqua) 0turn, var(--signal) ' + (v / 100) + 'turn, rgba(255,255,255,.12) 0turn)' }, el('div', { class: 'ring-value' }, el('b', {}, nz(h.hqi_final)), el('span', {}, 'HQI')));
      return el('div', { class: 'card score-card' }, ring, el('div', {}, el('h3', {}, nz(h.vendor, '-') + ' · ' + nz(h.grade, '-')), el('p', { class: 'hint' }, 'Periode ' + d.periode.mulai + ' s/d ' + d.periode.selesai + (h.catatan ? ' · ' + h.catatan : '')),
        el('div', { class: 'chip-row' }, ...[   /* v1.17: chip skor bisa ditap → popup dasar perhitungan (openScoreDetail) */
          ['temuan', Number(S.boot.config.bobot_temuan) === 0 ? 'Temuan ' + nz((h.jumlah || {}).temuan, 0) + ' (indikator)' : 'Temuan ' + nz(h.skor_temuan)], ['sla', 'SLA ' + nz(h.skor_sla)], ['spotcheck', 'Spot ' + nz(h.skor_spotcheck)], ['checklist', 'Checklist ' + nz(h.skor_checklist)], ['kepatuhan', 'Patuh ' + nz(h.skor_kepatuhan)]]
          .map(([k, label]) => el('button', { type: 'button', class: 'chip chip-btn', title: 'Lihat dasar perhitungan skor', onclick: () => openScoreDetail(h, k, d.periode) }, label))))); });
    const sla = g.sla || { tepat: 0, telat: 0 }, slaTot = sla.tepat + sla.telat, slaPct = slaTot ? Math.round(sla.tepat / slaTot * 100) : null;
    const ck = g.checklist_hari_ini || { terisi: 0, total_zona: 0 }, ckPct = ck.total_zona ? Math.round(ck.terisi / ck.total_zona * 100) : null;
    const stats = el('div', { class: 'stat-grid stat-grid-5' }, stat(nz(d.stat.temuan_open, 0), 'Temuan Open'), stat(fmtMin(d.stat.rata_ttr_menit), 'Rata-rata TTR'), stat(nz(d.stat.spotcheck, 0), 'Spot-Check Bulan Ini'), stat(nz(d.stat.personil_total, 0), 'Personil Rekanan (' + nz(d.stat.zona_aktif, 0) + ' zona)'),
      ringStat(slaPct, 'SLA tepat waktu', slaTot ? sla.tepat + ' dari ' + slaTot + ' temuan Close' : 'Belum ada temuan Close'),
      ringStat(ckPct, 'Checklist periode berjalan', ck.terisi + ' dari ' + ck.total_zona + ' zona terisi (sesuai frekuensi zona)'));
    const st = g.status || { Open: 0, InProgress: 0, Close: 0 };
    const charts = el('div', { class: 'chart-grid' },
      chartCard('Temuan 14 hari terakhir', 'Jumlah temuan Open (dibuat) vs Close (selesai) per hari', chartColumns((g.tren || []).map(t => ({ label: t.tgl.slice(8) + '/' + t.tgl.slice(5, 7), values: [t.dibuka, t.ditutup] })), ['Open', 'Close'])),
      chartCard('Status temuan periode ini', 'Open · In Progress · Menunggu Verifikasi · Close', chartStack([{ label: 'Open', value: st.Open }, { label: 'In Progress', value: st.InProgress }, { label: 'Menunggu Verifikasi', value: st.MenungguVerifikasi || 0 }, { label: 'Close', value: st.Close }])),
      chartCard('Temuan per kategori', 'Periode ' + d.periode.mulai + ' s/d ' + d.periode.selesai, chartHBars((g.kategori || []).map(k => ({ label: k.label, value: k.n })))),
      chartCard('Temuan open per prioritas', 'Yang belum selesai saat ini', chartHBars((g.prioritas_open || []).map(k => ({ label: k.label, value: k.n })))));
    const hqiTrend = g.hqi_tren && g.hqi_tren.length >= 2 && new Set(g.hqi_tren.map(h => h.periode)).size >= 2 ? chartCard('Tren HQI bulanan', 'Per vendor, dari kalkulasi harian (maks. 4 vendor)', chartLines(g.hqi_tren)) : null;
    // v1.7: heatmap pindah ke menu navigasi sendiri (VIEWS.heatmap); Beranda hanya memberi pintasan
    const heatN = (d.heatmap || []).length;
    const kuotaCard = null;   // v1.11.1: kartu progres kuota spot-check dihapus atas permintaan Rudy (aturan kuota minimum tetap berlaku di skor, PRD 7.6)
    c.replaceChildren(el('div', { class: 'greeting' }, el('h2', {}, 'Halo, ' + nz(S.user.nama, '')), el('p', {}, roleLabel(S.user.role) + ' · ' + pab + ' — ' + new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }) + ' · ', el('a', { class: 'link', onclick: openAccount }, 'Akun & password'))),
      verifyCard(d.verifikasi), returnedCard(d.dikembalikan), tindakCard(d.tindak),   /* v1.19; v1.21: + kartu tindak lanjut */
      ...(hqiCards.length ? hqiCards : [el('p', { class: 'empty' }, 'Belum ada vendor terdaftar untuk lingkup ini')]), stats, kuotaCard, charts, hqiTrend,
      el('div', { class: 'card row-card link-card', onclick: () => go('heatmap') }, el('span', { class: 'link-ico', html: ICON.heatmap }), el('div', { class: 'info' }, el('b', {}, 'Heatmap temuan'), el('span', {}, heatN + ' titik temuan bulan ini · peta panas per zona dengan filter periode, kategori, vendor & status')), el('span', { class: 'link' }, 'Buka')),
      el('div', { class: 'section-head' }, el('h3', {}, 'Temuan terbaru'), el('a', { class: 'link', onclick: () => go('temuan') }, 'Lihat semua')), findingList(d.temuan_terbaru || []));
  }
  const stat =(v, l) => el('div', { class: 'card stat-card' }, el('b', {}, v), el('span', {}, l));
  /** v1.19: kartu Beranda "Perlu Anda verifikasi" — penutupan temuan (pelapor/Admin lingkup) + checklist menunggu (Organik/Super Admin). Kosong → tidak tampil. */
  function verifyCard(v) { if (!v || (!v.total_temuan && !v.checklist_menunggu)) return null;
    return el('div', { class: 'card form verify-card' }, el('div', { class: 'section-head' }, el('h3', {}, 'Perlu Anda verifikasi'), el('b', { class: 'verify-count' }, (v.total_temuan || 0) + (v.checklist_menunggu || 0))),
      v.total_temuan ? el('p', { class: 'hint' }, v.total_temuan + ' penutupan temuan menunggu — bandingkan foto before & after, lalu Setujui atau Tolak') : null,
      ...(v.temuan || []).map(f => el('div', { class: 'card row-card link-card', onclick: () => go('temuan', { detail: f }) }, el('div', { class: 'info' }, el('b', {}, f.kategori + ' — ' + zonaName(f.zona_id)),
        el('span', {}, vendorName(f.vendor_id) + ' · Prioritas ' + f.prioritas + ' · diajukan ' + fmtDT(f.diajukan_close_at) + (Number(f.ditolak_close_count) ? ' · pernah ditolak ' + f.ditolak_close_count + '×' : ''))), el('span', { class: 'link' }, 'Periksa'))),
      v.total_temuan > (v.temuan || []).length ? el('a', { class: 'link', onclick: () => go('temuan') }, 'Lihat semua (' + v.total_temuan + ') di menu Temuan › Menunggu Verifikasi') : null,
      v.checklist_menunggu ? el('div', { class: 'card row-card link-card', onclick: () => go('checklist') }, el('div', { class: 'info' }, el('b', {}, v.checklist_menunggu + ' checklist harian menunggu verifikasi'), el('span', {}, (v.checklist_batas ? 'Batas terdekat ' + fmtDT(v.checklist_batas) : 'Wajib hari yang sama') + ' · cross-checklist + foto')), el('span', { class: 'link' }, 'Buka')) : null); }
  /** v1.21 (keputusan Rudy 10 Nov 2026): kartu Beranda "Perlu ditindaklanjuti" — pengganti notifikasi; dihitung server langsung dari data (API.dashboard → tindak), hilang sendiri begitu selesai. */
  function tindakCard(items) { if (!items || !items.length) return null;
    const buka = t => t.ke === 'admin-review' ? go('admin', { tab: 'review' }) : go(t.ke);
    const total = items.filter(t => t.ke).reduce((n, t) => n + Number(t.n || 0), 0);
    return el('div', { class: 'card form verify-card warn' }, el('div', { class: 'section-head' }, el('h3', {}, 'Perlu ditindaklanjuti'), total ? el('b', { class: 'verify-count' }, total) : null),
      ...items.map(t => el('div', { class: 'list' }, el('div', { class: 'card row-card' + (t.ke ? ' link-card' : ''), onclick: t.ke ? () => buka(t) : null }, el('div', { class: 'info' }, el('b', {}, t.judul), el('span', {}, t.ket)), t.ke ? el('span', { class: 'link' }, 'Buka') : null),
        ...(t.rows || []).map(f => el('div', { class: 'card row-card link-card sub', onclick: () => go('temuan', { detail: f }) }, el('div', { class: 'info' }, el('b', {}, f.kategori + ' — ' + zonaName(f.zona_id)),
          el('span', {}, 'Prioritas ' + f.prioritas + ' · ' + (t.kunci === 'tambah_waktu' ? nz(f.kategori_tambah_waktu, 'Alasan') + ': ' + nz(f.alasan_tambah_waktu, '-') : 'dilaporkan ' + fmtDT(f.timestamp_open)))), el('span', { class: 'link' }, 'Periksa')))))); }
  /** v1.21: isian pengajuan tambahan waktu SLA — kategori alasan + keterangan wajib + estimasi selesai (dipakai saat Mulai dan selama In Progress). */
  function tambahWaktuFields() { const kat = sel(S.boot.alasanTambahWaktu || ['Lainnya']), est = el('input', { type: 'datetime-local' }), als = el('textarea', { rows: 2, maxlength: 300, placeholder: 'Wajib — mis. menunggu vacuum truck, dijadwalkan besok pagi' });
    return { box: el('div', { class: 'form' }, fld('Alasan tambahan waktu', kat), fld('Keterangan (wajib)', als), fld('Estimasi selesai', est)),
      cek: () => !est.value ? 'Isi estimasi selesai' : als.value.trim().length < 10 ? 'Tulis keterangan alasan (minimal 10 huruf)' : '', data: () => ({ estimasi_selesai: est.value, kategori: kat.value, alasan: als.value.trim() }) }; }
  /** v1.21: kondisi khusus saat checklist/spot-check — Drain atau Perbaikan equipment (wajib menyebut equipment). Pertanyaan bertanda N/A tidak dinilai. */
  function kondisiCtl(onChange) { const k = sel([{ v: '', t: 'Tidak ada' }, { v: 'Drain', t: 'Sedang drain' }, { v: 'Perbaikan', t: 'Sedang perbaikan equipment' }]), ket = el('input', { maxlength: 200, placeholder: 'mis. Pompa P-101 overhaul' }); const kf = fld('Equipment yang diperbaiki (wajib)', ket); kf.classList.add('hidden');
    k.addEventListener('change', () => { kf.classList.toggle('hidden', k.value !== 'Perbaikan'); onChange(); });
    return { box: el('div', { class: 'form' }, fld('Kondisi khusus di zona ini', k), kf), on: () => !!k.value, cek: () => k.value === 'Perbaikan' && ket.value.trim().length < 3 ? 'Tulis equipment yang sedang diperbaiki' : '',
      data: () => ({ kondisi: k.value, keterangan_kondisi: k.value === 'Perbaikan' ? ket.value.trim() : '', sedang_drain: !!k.value }) }; }
  const kondisiTeks = x => x.sedang_drain !== 'Y' ? '' : x.kondisi_khusus === 'Perbaikan' ? ' · saat perbaikan equipment' + (x.keterangan_kondisi ? ' (' + x.keterangan_kondisi + ')' : '') : ' · saat drain';
  /** v1.19: kartu Beranda Mandor/Personil — penutupan yang ditolak verifikator, perlu dibersihkan ulang. */
  function returnedCard(rows) { if (!rows || !rows.length) return null;
    return el('div', { class: 'card form verify-card warn' }, el('div', { class: 'section-head' }, el('h3', {}, 'Penutupan ditolak — bersihkan ulang'), el('b', { class: 'verify-count' }, rows.length)),
      ...rows.map(f => el('div', { class: 'card row-card link-card', onclick: () => go('temuan', { detail: f }) }, el('div', { class: 'info' }, el('b', {}, f.kategori + ' — ' + zonaName(f.zona_id)),
        el('span', {}, 'Alasan: ' + nz(f.catatan_verifikasi_close, '-') + ' · ditolak ' + f.ditolak_close_count + '×')), el('span', { class: 'link' }, 'Buka')))); }

  // ================= HEATMAP (menu navigasi sendiri, v1.7 — semua role; PRD 7.7). Data: API.heatmap (filter periode/kategori/vendor/status)
  // ================= HEATMAP (v1.7 menu sendiri; v1.13: 3 mode — temuan / checklist rekanan / spot-check organik; titik temuan bisa diklik)
  const scoreCls = s => s == null ? '' : Number(s) >= 85 ? 'ok' : Number(s) >= 60 ? 'warn' : 'danger';
  const SCORE_STYLE = { ok: { color: '#34D399', fillColor: '#10B981' }, warn: { color: '#FBBF24', fillColor: '#F59E0B' }, danger: { color: '#F87171', fillColor: '#EF4444' } };
  VIEWS.heatmap = async (c) => {
    const MODES = [['temuan', 'Temuan'], ['checklist', 'Checklist rekanan'], ['spot', 'Spot-check organik']]; let mode = 'temuan';
    const modeTabs = el('div', { class: 'tabs heat-modes' }, ...MODES.map(([k, t]) => el('button', { class: k === mode ? 'active' : '', 'data-mode': k, onclick: () => { mode = k; modeTabs.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.mode === k)); syncFilters(); load(); } }, t)));
    const preset = sel([{ v: 'bulan', t: 'Bulan ini' }, { v: '30', t: '30 hari terakhir' }, { v: '90', t: '3 bulan terakhir' }, { v: '180', t: '6 bulan terakhir' }, { v: '365', t: '12 bulan terakhir' }]);
    const kat = sel([{ v: '', t: 'Semua kategori' }].concat((S.boot.kategoriTemuan || []).map(k => ({ v: k, t: k }))));
    const vendorSel = sel([{ v: '', t: 'Semua vendor' }].concat(S.boot.vendors.map(v => ({ v: v.id, t: v.nama }))));
    const stSel = sel([{ v: 'Open', t: 'Belum selesai (Open + In Progress)' }, { v: '', t: 'Semua status (Close berwarna biru-hijau)' }, { v: 'Close', t: 'Close saja' }]); stSel.value = 'Open';   // v1.12.1: bawaan = belum selesai
    const ckSel = sel([{ v: '', t: 'Semua status verifikasi' }, { v: 'Menunggu', t: 'Menunggu verifikasi' }, { v: 'Terverifikasi', t: 'Terverifikasi' }, { v: 'TerverifikasiOtomatis', t: 'Terverifikasi otomatis' }, { v: 'Ditolak', t: 'Ditolak' }]);
    const showVendor = !(S.user.role === 'Mandor' || S.user.role === 'PersonilRekanan') && S.boot.vendors.length > 1;
    const fKat = fld('Kategori', kat), fSt = fld('Status', stSel), fCk = fld('Status verifikasi', ckSel), fVend = showVendor ? fld('Vendor', vendorSel) : null;
    const syncFilters = () => { fKat.hidden = mode !== 'temuan'; fSt.hidden = mode !== 'temuan'; fCk.hidden = mode !== 'checklist'; };
    const mapBox = el('div', { class: 'map map-xl' }); const info = el('p', { class: 'hint' }); const rank = el('div', { class: 'list' }); const sum = el('div', { class: 'stat-grid stat-grid-3' }); const rankHead = el('h3', {}, 'Zona terpanas'); const sub = el('p', {}, '');
    // v1.14: polygon zona bisa disembunyikan agar titik panas terlihat jelas (peta tetap memusat ke zona)
    const polyOn = el('input', { type: 'checkbox', checked: '' }); let zoneLayers = []; const applyPoly = () => { zoneLayers.forEach(p => { if (polyOn.checked) { if (!map.hasLayer(p)) p.addTo(map); } else p.remove(); }); }; polyOn.addEventListener('change', applyPoly);
    c.replaceChildren(el('div', { class: 'greeting' }, el('h2', {}, 'Heatmap'), sub), modeTabs,
      el('div', { class: 'card form' }, el('div', { class: 'form-row' }, fld('Periode', preset), fKat), el('div', { class: 'form-row' }, fVend, fSt, fCk), el('label', { class: 'toggle' }, polyOn, 'Tampilkan polygon zona (matikan untuk fokus ke titik panas)')),
      sum, mapBox, info, el('div', { class: 'section-head' }, rankHead), rank);
    syncFilters();
    let map = null, layers = [];
    const range = () => { const end = today(); if (preset.value === 'bulan') return { periode_mulai: end.slice(0, 8) + '01', periode_selesai: end }; const d = new Date(); d.setDate(d.getDate() - Number(preset.value)); return { periode_mulai: d.toISOString().slice(0, 10), periode_selesai: end }; };
    const clearLayers = () => { layers.forEach(l => l.remove()); layers = []; zoneLayers = []; };
    const zonePoly = (z, style, label, cls, onClick) => { const poly = L.polygon(z.polygon.map(toLL), Object.assign({}, ZONE_STYLE, style)); if (polyOn.checked) poly.addTo(map); layers.push(poly); zoneLayers.push(poly); poly.bindTooltip(esc(z.nama_area) + label, { permanent: true, direction: 'center', className: 'zone-label' + (cls ? ' ' + cls : '') }); poly.on('click', onClick); return poly; };
    const load = async () => { info.textContent = 'Memuat data…';
      try { const r = range(); const d = await api('heatmap', Object.assign({ mode, kategori: kat.value, vendor_id: showVendor ? vendorSel.value : '', status: mode === 'temuan' ? stSel.value : mode === 'checklist' ? ckSel.value : '' }, r));
        if (!map) { await loadMaps(); map = newMap(mapBox); } clearLayers();
        const cnt = d.per_zona || {}; const zonesP = S.boot.zones.filter(z => (z.polygon || []).length);
        if (mode === 'temuan') {
          sub.textContent = scopeName() + ' · titik = lokasi temuan (tap titik untuk membuka temuannya) · warna zona makin pekat = makin banyak yang belum selesai';
          const nOf = id => (cnt[id] || {}).n || 0, oOf = id => (cnt[id] || {}).open || 0; const hotOf = id => stSel.value === 'Close' ? nOf(id) : oOf(id);
          const maxC = Math.max(1, ...Object.keys(cnt).map(k => stSel.value === 'Close' ? cnt[k].n : cnt[k].open));
          sum.replaceChildren(stat(nz(d.total, 0), 'Temuan pada periode'), stat(nz(d.open, 0), 'Belum selesai'), stat(zonesP.filter(z => nOf(z.id)).length, 'Zona terdampak'));
          zonesP.forEach(z => { const n = nOf(z.id), o = oOf(z.id), hot = hotOf(z.id);
            const lbl = n ? (stSel.value === 'Close' ? ' · ' + n + ' selesai' : stSel.value === 'Open' ? ' · ' + o + ' belum selesai' : ' · ' + n + ' temuan' + (o ? ', ' + o + ' belum selesai' : ', semua selesai')) : '';
            zonePoly(z, { color: hot ? '#FFB020' : n ? '#2DD4BF' : '#5EC8FF', fillColor: hot ? '#FF7A1A' : n ? '#14B8A6' : '#3B82F6', fillOpacity: hot ? .10 + .45 * (hot / maxC) : n ? .18 : .10, weight: hot ? 2.5 : 2 }, lbl, hot ? 'hot' : n ? 'done' : '', () => openZoneSummary(z)); });
          const pts = (d.titik || []).filter(f => f.lat !== '' && f.lat != null).map(f => ({ lat: +f.lat, lng: +f.lng, w: +f.w || 1, cool: f.status === 'Close', f }));
          if (!fitZones(map, S.boot.zones) && pts.length) map.fitBounds(L.latLngBounds(pts.map(p => [p.lat, p.lng])), { padding: [28, 28], maxZoom: 18 });
          if (pts.length) layers.push(heatLayer(map, pts, 40));
          // v1.13: penanda tak terlihat di atas kanvas panas agar tiap titik bisa diklik → popup temuan
          pts.forEach(p => { const m = L.circleMarker([p.lat, p.lng], { radius: 11, stroke: false, fillColor: '#000', fillOpacity: 0.01, interactive: true, bubblingMouseEvents: false }).addTo(map); m.on('click', () => openFindingPopup(p.f)); m.bindTooltip(esc(p.f.kategori) + ' · ' + esc(p.f.prioritas) + ' · ' + (p.f.status === 'InProgress' ? 'In Progress' : esc(p.f.status)), { direction: 'top', offset: [0, -6] }); layers.push(m); });
          const ranked = zonesP.map(z => ({ z, s: cnt[z.id] || { n: 0, open: 0, bobot: 0 } })).filter(x => x.s.n).sort((a, b) => b.s.bobot - a.s.bobot || b.s.n - a.s.n); rankHead.textContent = 'Zona terpanas';
          rank.replaceChildren(...(ranked.length ? ranked.map((x, i) => el('div', { class: 'card row-card', onclick: () => openZoneSummary(x.z) }, el('div', { class: 'rank' }, i + 1),
            el('div', { class: 'info' }, el('b', {}, x.z.nama_area), el('span', {}, x.s.n + ' temuan · ' + x.s.open + ' belum selesai · bobot prioritas ' + x.s.bobot), el('div', { class: 'bar' }, el('i', { style: 'width:' + Math.round(x.s.n / maxC * 100) + '%' }))))) : [el('p', { class: 'empty' }, 'Tidak ada temuan pada filter ini')]));
          const luar = nOf('-');
          info.textContent = 'Periode ' + d.periode.mulai + ' s/d ' + d.periode.selesai + ' · ' + nz(d.total, 0) + ' temuan · ' + nz(d.open, 0) + ' belum selesai' + (luar ? ' · ' + luar + ' tanpa zona' : '') + (stSel.value === '' ? ' · merah = belum selesai, biru-hijau = sudah Close' : '') + ' · tap titik = buka temuan, tap zona = ringkasan';
        } else {
          const label = mode === 'checklist' ? 'Checklist rekanan' : 'Spot-check organik'; const entri = d.entri || [];
          sub.textContent = scopeName() + ' · ' + label + ' per zona · warna zona = rata-rata skor (hijau ≥ 85, kuning 60–84, merah < 60) · tap zona untuk melihat entrinya';
          sum.replaceChildren(stat(nz(d.total, 0), label + ' pada periode'), stat(d.rata == null ? '–' : d.rata, 'Rata-rata skor'), stat(zonesP.filter(z => cnt[z.id]).length + '/' + zonesP.length, 'Zona dinilai'));
          zonesP.forEach(z => { const s = cnt[z.id]; const cls = s ? scoreCls(s.rata) : ''; const st = s ? SCORE_STYLE[cls] : { color: '#5EC8FF', fillColor: '#3B82F6' };
            zonePoly(z, Object.assign({ fillOpacity: s ? .32 : .08, weight: s ? 2.5 : 2 }, st), s ? ' · ' + s.n + '× · rata ' + s.rata : ' · belum ada', s ? 'score-' + cls : '', () => openEntriesPopup(z, entri.filter(e => e.zona_id === z.id), mode)); });
          fitZones(map, S.boot.zones);
          const ranked = zonesP.map(z => ({ z, s: cnt[z.id] })).filter(x => x.s).sort((a, b) => a.s.rata - b.s.rata || b.s.n - a.s.n); rankHead.textContent = 'Zona dengan skor terendah';
          rank.replaceChildren(...(ranked.length ? ranked.map((x, i) => el('div', { class: 'card row-card', onclick: () => openEntriesPopup(x.z, entri.filter(e => e.zona_id === x.z.id), mode) }, el('div', { class: 'rank' }, i + 1),
            el('div', { class: 'info' }, el('b', {}, x.z.nama_area), el('span', {}, x.s.n + ' ' + (mode === 'checklist' ? 'checklist' : 'spot-check') + ' · rata-rata ' + x.s.rata + ' · terendah ' + x.s.min + ' · terakhir ' + fmtDT(x.s.terakhir)), el('div', { class: 'bar' }, el('i', { class: 'bar-' + scoreCls(x.s.rata), style: 'width:' + Math.round(x.s.rata) + '%' }))), el('span', { class: 'pill ' + scoreCls(x.s.rata) }, x.s.rata))) : [el('p', { class: 'empty' }, 'Tidak ada ' + label.toLowerCase() + ' pada periode ini')]));
          const noZona = zonesP.filter(z => !cnt[z.id]).length;
          info.textContent = 'Periode ' + d.periode.mulai + ' s/d ' + d.periode.selesai + ' · ' + nz(d.total, 0) + ' entri' + (noZona ? ' · ' + noZona + ' zona belum ada ' + (mode === 'checklist' ? 'checklist' : 'spot-check') : '') + ' · tap zona untuk melihat entri, item, dan fotonya';
        }
      } catch (e) { mapError(mapBox, e.message); info.textContent = ''; } };
    [preset, kat, vendorSel, stSel, ckSel].forEach(s => s.addEventListener('change', load)); load();
  };
  /** v1.13: popup satu temuan dari titik heatmap — foto before/after, status, prioritas, SLA, waktu; tombol ke menu Temuan. */
  function openFindingPopup(f) {
    const ba = el('div', { class: 'ba ba-lg' }, el('div', { class: 'before' }), el('div', { class: f.foto_after ? 'after' : '' }));
    photoImg(f.foto_open).then(i => { if (i.src) ba.firstChild.replaceWith(i); }); if (f.foto_after) photoImg(f.foto_after).then(i => { if (i.src) ba.lastChild.replaceWith(i); });
    modal(el('div', { class: 'form zone-sum' }, el('div', { class: 'section-head' }, el('h3', {}, f.kategori + ' · ' + zonaName(f.zona_id)), el('a', { class: 'link', onclick: closeModal }, 'Tutup')), ba,
      el('div', { class: 'chip-row' }, el('span', { class: 'pill ' + f.status }, stLabel(f.status)), el('span', { class: 'chip chip-' + f.prioritas }, 'Prioritas ' + f.prioritas), slaChip(f), f.di_luar_zona === 'Y' ? el('span', { class: 'chip' }, 'pin di luar zona') : null, f.skala_pekerjaan === 'PekerjaanBesar' ? el('span', { class: 'chip' }, 'Pekerjaan Besar') : null),
      el('p', { class: 'hint' }, 'Open ' + fmtDT(f.timestamp_open) + (f.pelapor ? ' oleh ' + f.pelapor : '') + (f.timestamp_inprogress ? ' · In Progress ' + fmtDT(f.timestamp_inprogress) : '') + (f.timestamp_close ? ' · Close ' + fmtDT(f.timestamp_close) : '') + ' · ' + vendorName(f.vendor_id)),
      f.deskripsi ? el('p', { class: 'guide-p' }, f.deskripsi) : null,
      el('button', { class: 'btn', onclick: () => { closeModal(); go('temuan', { detail: f }); } }, 'Buka di menu Temuan')));
  }
  /** v1.13: popup entri checklist rekanan / spot-check organik satu zona — skor, item Ya/Cukup/Tidak, status verifikasi, foto. */
  function openEntriesPopup(z, rows, mode) {
    const label = mode === 'checklist' ? 'Checklist rekanan' : 'Spot-check organik'; const parse = s => { try { return JSON.parse(s || '[]'); } catch (e) { return []; } };
    const cards = rows.map(r => { const items = parse(r.item_checklist); const ph = el('div', { class: 'camera-row' }); [r.foto1, r.foto2, r.foto].filter(Boolean).forEach(id => photoImg(id).then(i => { if (i.src) { i.style.cssText = 'width:48%;border-radius:12px;object-fit:cover;max-height:180px'; ph.append(i); } }));
      return el('div', { class: 'card form' }, el('div', { class: 'section-head' }, el('h3', {}, fmtDT(r.timestamp)), el('span', { class: 'pill ' + scoreCls(r.skor) }, 'Skor ' + nz(r.skor))),
        el('p', { class: 'hint' }, 'Oleh ' + r.oleh + (r.status_verifikasi ? ' · ' + r.status_verifikasi : '') + (r.is_anomali === 'Y' ? ' · ANOMALI' : '') + kondisiTeks(r)),
        items.length ? el('ul', { class: 'guide-ul' }, ...items.map(i => el('li', {}, i.item + ': ', el('b', {}, i.hasil)))) : null, ph); });
    const rata = rows.length ? Math.round(rows.reduce((s, r) => s + (Number(r.skor) || 0), 0) / rows.length * 10) / 10 : null;
    modal(el('div', { class: 'form zone-sum' }, el('div', { class: 'section-head' }, el('h3', {}, label + ' · ' + z.nama_area), el('a', { class: 'link', onclick: closeModal }, 'Tutup')),
      el('p', { class: 'hint' }, rows.length + ' entri pada periode' + (rata != null ? ' · rata-rata ' + rata : '') + ' · ' + vendorName(z.vendor_id)), rows.length ? el('div', { class: 'list' }, ...cards) : el('p', { class: 'empty' }, 'Belum ada ' + label.toLowerCase() + ' di zona ini pada periode terpilih')));
  }
  /** v1.9: popup ringkasan zona (Heatmap) — checklist, spot-check, temuan N hari terakhir (14/30). Data: API.zoneSummary. */
  async function openZoneSummary(z, hari) { hari = hari || 14;
    const head = () => el('div', { class: 'section-head' }, el('h3', {}, z.nama_area), el('a', { class: 'link', onclick: closeModal }, 'Tutup'));
    const box = el('div', { class: 'form zone-sum' }, head(), el('p', { class: 'empty' }, 'Memuat ringkasan…')); modal(box);
    try { const d = await api('zoneSummary', { zona_id: z.id, hari });
      const tgl = iso => fmtDT(iso); const sk = v => v == null ? '–' : v;
      const sw = el('div', { class: 'tabs' }, ...[14, 30].map(h => el('button', { class: h === hari ? 'active' : '', onclick: () => openZoneSummary(z, h) }, h + ' hari terakhir')));
      const listRows = rows => rows.length ? el('div', { class: 'list mini' }, ...rows) : el('p', { class: 'hint' }, 'Tidak ada pada periode ini');
      const chips = (m, cls) => Object.keys(m).map(k => el('span', { class: 'chip' + (cls ? ' chip-' + k : '') }, k + ' ' + m[k]));
      box.replaceChildren(head(),
        el('p', { class: 'hint' }, (d.zona.vendor || '-') + ' · ' + (d.zona.kategori || '-') + ' · ' + nz(d.zona.personil, 0) + ' personil · sejak ' + d.mulai), sw,
        el('div', { class: 'stat-grid stat-grid-3' }, stat(nz(d.temuan.n, 0), 'Temuan (' + nz(d.temuan.open, 0) + ' belum selesai)'), stat(sk(d.spotcheck.rata), 'Rata-rata spot-check (' + nz(d.spotcheck.n, 0) + '×)'), stat(sk(d.checklist.rata), 'Rata-rata checklist (' + nz(d.checklist.n, 0) + '×)')),
        el('h3', {}, 'Temuan'), el('div', { class: 'chip-row' }, ...chips(d.temuan.prioritas, true), ...chips(d.temuan.kategori)),
        listRows(d.temuan.terakhir.map(f => el('div', { class: 'card row-card', onclick: () => { closeModal(); go('temuan', { detail: f }); } }, el('div', { class: 'info' }, el('b', {}, f.kategori + ' · ' + f.prioritas), el('span', {}, tgl(f.timestamp_open) + ' · ' + f.pelapor)), el('span', { class: 'pill ' + f.status }, stLabel(f.status))))),
        el('h3', {}, 'Spot-check'), listRows(d.spotcheck.terakhir.map(s => el('div', { class: 'card row-card' }, el('div', { class: 'info' }, el('b', {}, 'Skor ' + nz(s.skor)), el('span', {}, tgl(s.tgl) + ' · ' + s.oleh))))),
        el('h3', {}, 'Checklist harian'), el('p', { class: 'hint' }, nz(d.checklist.hari_terisi, 0) + ' hari terisi' + (Object.keys(d.checklist.status).length ? ' · ' + Object.keys(d.checklist.status).map(k => k + ' ' + d.checklist.status[k]).join(' · ') : '')),
        listRows(d.checklist.terakhir.map(c => el('div', { class: 'card row-card' }, el('div', { class: 'info' }, el('b', {}, 'Skor ' + nz(c.skor) + (c.anomali ? ' · anomali' : '')), el('span', {}, tgl(c.tgl) + ' · ' + c.oleh)), el('span', { class: 'pill ' + (c.status === 'Ditolak' ? 'Nonaktif' : 'ok') }, c.status || '-')))),
        el('button', { class: 'btn', onclick: () => { closeModal(); go('temuan'); } }, 'Buka daftar temuan'));
    } catch (e) { box.replaceChildren(head(), el('p', { class: 'empty err' }, e.message)); }
  }

  // ---------------- grafik Beranda (SVG inline, tanpa pustaka; palet kategorikal tervalidasi, teks memakai token teks)
  const svg = (tag, attrs, ...kids) => { const n = document.createElementNS('http://www.w3.org/2000/svg', tag); Object.entries(attrs || {}).forEach(([k, v]) => n.setAttribute(k, v)); kids.flat().forEach(k => k != null && n.append(k.nodeType ? k : document.createTextNode(k))); return n; };
  const CAT = i => 'var(--c' + ((i % 5) + 1) + ')';
  let tipEl = null;
  function showTip(evt, html) { if (!tipEl) { tipEl = el('div', { class: 'chart-tip' }); document.body.append(tipEl); } tipEl.innerHTML = html; tipEl.style.display = 'block'; tipEl.style.left = Math.max(4, Math.min(evt.clientX + 12, window.innerWidth - tipEl.offsetWidth - 8)) + 'px'; tipEl.style.top = Math.max(4, evt.clientY - 40) + 'px'; }
  function hideTip() { if (tipEl) tipEl.style.display = 'none'; }
  const hover = (node, html) => { node.addEventListener('mouseenter', e => showTip(e, html)); node.addEventListener('mousemove', e => showTip(e, html)); node.addEventListener('mouseleave', hideTip); node.addEventListener('touchstart', e => { showTip(e.touches[0], html); setTimeout(hideTip, 1800); }, { passive: true }); };
  function chartCard(title, sub, body) { return el('div', { class: 'card chart-card' }, el('h3', {}, title), el('p', { class: 'hint' }, sub), body); }
  function legend(names) { return el('div', { class: 'legend' }, ...names.map((n, i) => el('span', {}, el('i', { style: 'background:' + CAT(i) }), n))); }
  const nice = max => { if (max <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(max))); const f = max / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; };
  function roundTop(x, y, w, h, r) { if (h <= 0) return ''; r = Math.min(r, h, w / 2); return 'M' + x + ' ' + (y + h) + 'V' + (y + r) + 'a' + r + ' ' + r + ' 0 0 1 ' + r + ' -' + r + 'h' + (w - 2 * r) + 'a' + r + ' ' + r + ' 0 0 1 ' + r + ' ' + r + 'V' + (y + h) + 'Z'; }
  function roundRight(x, y, w, h, r) { if (w <= 0) return 'M' + x + ' ' + y + 'h1.5v' + h + 'h-1.5Z'; r = Math.min(r, w, h / 2); return 'M' + x + ' ' + y + 'h' + (w - r) + 'a' + r + ' ' + r + ' 0 0 1 ' + r + ' ' + r + 'v' + (h - 2 * r) + 'a' + r + ' ' + r + ' 0 0 1 -' + r + ' ' + r + 'H' + x + 'Z'; }
  /** Kolom berkelompok (≤2 seri): data = [{label, values:[...]}] */
  function chartColumns(data, series) {
    const W = 420, H = 170, padL = 26, padB = 20, padT = 8; const n = data.length || 1; const max = nice(Math.max(1, ...data.map(d => Math.max(...d.values))));
    const g = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart', role: 'img', 'aria-label': 'Grafik kolom' });
    const plotW = W - padL - 6, plotH = H - padT - padB, band = plotW / n, bw = Math.min(20, (band - 6) / series.length);
    [0, .5, 1].forEach(t => { const y = padT + plotH - t * plotH; g.append(svg('line', { x1: padL, x2: W - 6, y1: y, y2: y, class: 'grid' })); g.append(svg('text', { x: padL - 4, y: y + 3, class: 'tick', 'text-anchor': 'end' }, Math.round(max * t))); });
    data.forEach((d, i) => { const x0 = padL + i * band + (band - bw * series.length - 2 * (series.length - 1)) / 2;
      d.values.forEach((v, s) => { const h = v / max * plotH, x = x0 + s * (bw + 2), y = padT + plotH - h;
        const hit = svg('rect', { x: x0 - 2, y: padT, width: bw * series.length + 2 * series.length, height: plotH, fill: 'transparent' }); hover(hit, '<b>' + esc(d.label) + '</b><br>' + series.map((nm, k) => nm + ': ' + d.values[k]).join('<br>')); g.append(hit);
        if (h > 0) { const r = svg('path', { d: roundTop(x, y, bw, h, 4), fill: CAT(s), class: 'mark' }); hover(r, '<b>' + esc(d.label) + '</b><br>' + series[s] + ': ' + v); g.append(r); } });
      if (i % 2 === 0 || n <= 8) g.append(svg('text', { x: padL + i * band + band / 2, y: H - 6, class: 'tick', 'text-anchor': 'middle' }, d.label)); });
    return el('div', {}, legend(series), g);
  }
  /** Batang horizontal satu seri, label nilai di ujung (tanpa legenda: judul kartu sudah menyebutkan serinya) */
  function chartHBars(data) {
    const W = 420, rowH = 24, padL = 118, H = Math.max(1, data.length) * rowH + 4; const max = Math.max(1, ...data.map(d => d.value)); const g = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart', role: 'img' });
    data.forEach((d, i) => { const y = 2 + i * rowH, w = d.value / max * (W - padL - 40), bh = 16;
      g.append(svg('text', { x: padL - 8, y: y + 13, class: 'tick lbl', 'text-anchor': 'end' }, d.label));
      const r = svg('path', { d: roundRight(padL, y, w, bh, 4), fill: CAT(0), class: 'mark', opacity: d.value ? 1 : .35 }); hover(r, '<b>' + esc(d.label) + '</b><br>' + d.value + ' temuan'); g.append(r);
      g.append(svg('text', { x: padL + w + 6, y: y + 13, class: 'tick val' }, d.value)); });
    return g;
  }
  /** Batang tersusun 100% dengan celah 2px antar segmen + legenda bernilai */
  function chartStack(parts) {
    const tot = parts.reduce((a, p) => a + p.value, 0); const W = 420, H = 28; const g = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart', role: 'img' }); let x = 0;
    if (!tot) g.append(svg('rect', { x: 0, y: 4, width: W, height: 20, rx: 4, class: 'track' }));
    parts.forEach((p, i) => { const w = tot ? p.value / tot * W : 0; if (w > 0) { const gapL = i ? 1 : 0, gapR = i < parts.length - 1 ? 1 : 0;
      const r = svg('rect', { x: x + gapL, y: 4, width: Math.max(0, w - gapL - gapR), height: 20, rx: 4, fill: CAT(i), class: 'mark' }); hover(r, '<b>' + esc(p.label) + '</b><br>' + p.value + ' (' + Math.round(p.value / tot * 100) + '%)'); g.append(r);
      if (w > 44) g.append(svg('text', { x: x + w / 2, y: 18, class: 'inbar', 'text-anchor': 'middle' }, p.value)); } x += w; });
    return el('div', {}, g, legend(parts.map(p => p.label + ' · ' + p.value)));
  }
  /** Garis multi-seri (≤4 vendor), sumbu 0–100: rows = [{periode:'YYYY-MM', vendor, hqi}] */
  function chartLines(rows) {
    const periods = Array.from(new Set(rows.map(r => r.periode))).sort(); const vendors = Array.from(new Set(rows.map(r => r.vendor))).slice(0, 4);
    const W = 420, H = 170, padL = 28, padR = 34, padT = 10, padB = 20, plotW = W - padL - padR, plotH = H - padT - padB;
    const X = i => padL + (periods.length > 1 ? i / (periods.length - 1) * plotW : plotW / 2), Y = v => padT + plotH - v / 100 * plotH;
    const g = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart', role: 'img' });
    [0, 50, 100].forEach(v => { g.append(svg('line', { x1: padL, x2: W - padR, y1: Y(v), y2: Y(v), class: 'grid' })); g.append(svg('text', { x: padL - 4, y: Y(v) + 3, class: 'tick', 'text-anchor': 'end' }, v)); });
    periods.forEach((p, i) => g.append(svg('text', { x: X(i), y: H - 6, class: 'tick', 'text-anchor': 'middle' }, p.slice(5, 7) + '/' + p.slice(2, 4))));
    const ends = [];
    vendors.forEach((v, s) => { const pts = periods.map((p, i) => { const r = rows.find(x => x.periode === p && x.vendor === v); return r ? [X(i), Y(r.hqi), r.hqi] : null; }).filter(Boolean); if (!pts.length) return;
      g.append(svg('path', { d: pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' '), fill: 'none', stroke: CAT(s), 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
      pts.forEach(p => { const c = svg('circle', { cx: p[0], cy: p[1], r: 4.5, fill: CAT(s), class: 'dot' }); hover(c, '<b>' + esc(v) + '</b><br>HQI ' + p[2]); g.append(c); });
      ends.push(pts[pts.length - 1]); });
    // label nilai di ujung garis hanya bila tidak saling bertabrakan (jika rapat, tooltip & legenda yang membawa nilainya)
    const ys = ends.map(e => e[1]).sort((a, b) => a - b); const collide = ys.some((y, i) => i && y - ys[i - 1] < 11);
    if (!collide) ends.forEach(last => g.append(svg('text', { x: last[0] + 8, y: last[1] + 4, class: 'tick val' }, last[2])));
    return el('div', {}, vendors.length > 1 ? legend(vendors) : null, g);   // satu seri: judul kartu sudah menamai serinya
  }
  /** Stat tile dengan meter ring persentase; pct null = belum ada data */
  function ringStat(pct, label, sub) { const v = pct == null ? 0 : pct; const col = pct == null ? 'var(--muted)' : pct >= 80 ? 'var(--ok)' : pct >= 50 ? 'var(--warn)' : 'var(--danger)';
    const tile = el('div', { class: 'card stat-card ring-stat' }, el('div', { class: 'mini-ring', style: 'background:conic-gradient(' + col + ' ' + (v / 100) + 'turn, var(--track) 0turn)' }, el('b', {}, pct == null ? '–' : pct + '%')), el('div', {}, el('span', { class: 'lbl' }, label), el('span', { class: 'sub' }, sub)));
    hover(tile, '<b>' + esc(label) + '</b><br>' + esc(sub)); return tile; }
  function findingList(rows) { if (!rows.length) return el('p', { class: 'empty' }, 'Belum ada temuan'); return el('div', { class: 'list' }, ...rows.map(f => { const ba = el('div', { class: 'ba' }, el('div', { class: 'before' }), el('div', { class: f.foto_after ? 'after' : '' }));
    photoImg(f.foto_open).then(i => { if (i.src) ba.firstChild.replaceWith(i); }); if (f.foto_after) photoImg(f.foto_after).then(i => { if (i.src) ba.lastChild.replaceWith(i); });
    return el('div', { class: 'card row-card', onclick: () => go('temuan', { detail: f }) }, ba, el('div', { class: 'info' }, el('b', {}, f.kategori + ' — ' + zonaName(f.zona_id) + (f.di_luar_zona === 'Y' ? ' (di luar zona)' : '')), el('span', {}, 'Prioritas ' + f.prioritas + ' · target ' + fmtMin(+f.sla_target_menit || slaOf(f.prioritas)) + ' · ' + fmtDT(f.timestamp_open) + (f.skala_pekerjaan === 'PekerjaanBesar' ? ' · Pekerjaan Besar' : '')), slaChip(f)), el('span', { class: 'pill ' + f.status }, stLabel(f.status))); })); }
  /** v1.11: chip hitung mundur target penyelesaian (menit jam kerja efektif dari server: sla_sisa_menit). Di luar jam kerja hitungan berhenti. */
  function slaChip(f) { if (f.sla_sisa_menit == null) return null; const sisa = Number(f.sla_sisa_menit), batas = Number(f.sla_batas_menit) || 1;
    if (f.status === 'Close') return el('span', { class: 'sla-chip ' + (sisa >= 0 ? 'ok' : 'late') }, sisa >= 0 ? 'Selesai tepat waktu (' + fmtMin(f.sla_terpakai_menit) + ')' : 'Selesai terlambat ' + fmtMin(-sisa));
    if (f.status === 'MenungguVerifikasi') return el('span', { class: 'sla-chip ' + (sisa >= 0 ? 'ok' : 'late'), title: 'Jam SLA berhenti saat foto after dikirim' }, 'Menunggu verifikasi · diajukan ' + (sisa >= 0 ? 'tepat waktu' : 'terlambat ' + fmtMin(-sisa)));   // v1.19
    return el('span', { class: 'sla-chip ' + (sisa < 0 ? 'late' : sisa <= batas * .25 ? 'warn' : 'ok'), title: 'Jam kerja efektif; target ' + fmtMin(batas) + ' termasuk toleransi' }, sisa < 0 ? 'Terlambat ' + fmtMin(-sisa) : 'Sisa ' + fmtMin(sisa)); }
  /** Target penyelesaian (menit jam kerja efektif) per prioritas dari konfigurasi bobot aktif (PRD 7.4/7.6). */
  const slaOf = p => Number(({ Mendesak: 'sla_mendesak', Tinggi: 'sla_tinggi', Sedang: 'sla_sedang', Rendah: 'sla_rendah' }[p] ? S.boot.config[{ Mendesak: 'sla_mendesak', Tinggi: 'sla_tinggi', Sedang: 'sla_sedang', Rendah: 'sla_rendah' }[p]] : 0)) || 0;
  const slaLegend = () => el('div', { class: 'card sla-legend' }, el('b', {}, 'Target penyelesaian per prioritas'), el('div', { class: 'chip-row' }, ...['Mendesak', 'Tinggi', 'Sedang', 'Rendah'].map(p => el('span', { class: 'chip chip-' + p }, p + ' ≤ ' + fmtMin(slaOf(p))))), el('span', { class: 'hint' }, 'Dihitung dari jam kerja efektif sejak temuan Open, plus toleransi ' + fmtMin(Number(S.boot.config.buffer_menit || 0))));

  // ================= TEMUAN
  VIEWS.temuan = async (c, arg) => {
    if (arg && arg.detail) return findingDetail(c, arg.detail);
    if (arg && arg.create) return findingForm(c);
    let cur = 'Semua';   // v1.16: daftar Temuan = swrView (tab terpilih bertahan saat data baru tiba)
    return swrView(c, 'listFindings:' + S.scope, () => api('listFindings', {}), rows => {
      const tabs = el('div', { class: 'tabs' }); const listBox = el('div');
      const render = () => { listBox.replaceChildren(findingList(cur === 'Semua' ? rows : rows.filter(r => r.status === cur))); };
      ['Semua', 'Open', 'InProgress', 'MenungguVerifikasi', 'Close'].forEach(t => tabs.append(el('button', { class: t === cur ? 'active' : '', onclick: e => { cur = t; tabs.querySelectorAll('button').forEach(b => b.classList.toggle('active', b === e.target)); render(); } }, t === 'Semua' ? t : stLabel(t))));
      c.replaceChildren(el('div', { class: 'section-head' }, el('h2', {}, 'Temuan'), el('button', { class: 'btn primary sm', onclick: () => go('temuan', { create: true }) }, '+ Lapor temuan')), slaLegend(), tabs, listBox); render(); });
  };
  async function findingForm(c) {
    const form = el('div', { class: 'form' }); let pin = null, gps = { status: 'Gagal' }, zona = null, marker, map, luar = false;
    const zonaInfo = el('p', { class: 'hint' }, 'Tap peta untuk memasang pin lokasi');
    const zonaSel = sel(S.boot.zones.map(z => ({ v: z.id, t: z.nama_area + ' · ' + vendorName(z.vendor_id) }))); const zonaField = fld('Zona penanggung jawab (pin di luar zona terdaftar)', zonaSel); zonaField.hidden = true;
    zonaSel.addEventListener('change', () => { zona = S.boot.zones.find(z => z.id === zonaSel.value) || null; });
    const mapBox = el('div', { class: 'map' }); const gpsBtn = el('button', { class: 'btn sm', type: 'button' }, 'Ambil GPS otomatis');
    const kategori = sel(S.boot.kategoriTemuan), prioritas = sel(S.boot.prioritas.map(p => ({ v: p, t: p + ' — target selesai ≤ ' + fmtMin(slaOf(p)) }))), desk = el('textarea', { rows: 2, placeholder: 'Deskripsi singkat (opsional)' });
    const foto = cameraSlot('Foto temuan (kamera)');
    const btn = el('button', { class: 'btn primary' }, 'Kirim temuan');
    form.append(el('div', { class: 'section-head' }, el('h2', {}, 'Lapor Temuan'), el('a', { class: 'link', onclick: () => go('temuan') }, 'Batal')),
      mapBox, el('div', { style: 'display:flex;gap:8px;align-items:center;flex-wrap:wrap' }, gpsBtn, zonaInfo), zonaField,
      el('div', { class: 'form-row' }, fld('Kategori', kategori), fld('Prioritas (target penyelesaian vendor)', prioritas)), fld('Deskripsi', desk), foto, btn);
    c.replaceChildren(form);
    btn.addEventListener('click', async () => { if (!pin) return toast('Pasang pin lokasi di peta dulu', true); if (!zona) return toast('Pilih zona penanggung jawab', true); if (!foto.dataset.value) return toast('Foto wajib diambil dari kamera', true); btn.disabled = true;
      try { const r1 = await api('createFinding', { zona_id: zona.id, di_luar_zona: luar, kategori: kategori.value, prioritas: prioritas.value, deskripsi: desk.value, pin_lat: pin.lat, pin_lng: pin.lng, gps_lat: gps.lat || '', gps_lng: gps.lng || '', gps_akurasi: gps.akurasi || '', gps_status: gps.status, foto: foto.dataset.value }); toast(r1 && r1.queued ? 'Tersimpan di HP (tanpa sinyal) · dikirim otomatis saat ada sinyal' : 'Temuan terkirim'); go('temuan'); } catch (e) { toast(e.message, true); btn.disabled = false; } });
    try { await loadMaps(); map = newMap(mapBox); } catch (e) { mapError(mapBox, e.message); gpsBtn.disabled = true; zonaInfo.textContent = 'Peta tidak tersedia — pin lokasi tidak bisa dipasang'; zonaInfo.className = 'hint err'; return; }
    drawZones(map, S.boot.zones); fitZones(map, S.boot.zones);
    // Pin di dalam zona → zona & vendor otomatis. Pin di luar semua zona → tetap bisa dikirim: pilih zona penanggung jawab (terdekat disarankan), ditandai "di luar zona" (PRD 7.1).
    const setPin = ll => { pin = { lat: ll.lat, lng: ll.lng }; if (!marker) { marker = L.marker([ll.lat, ll.lng], { draggable: true, icon: PIN_ICON(), title: 'Geser jika perlu' }).addTo(map); marker.on('dragend', e => setPin(e.target.getLatLng())); } else marker.setLatLng([ll.lat, ll.lng]);
      const inside = zoneAt(ll); luar = !inside;
      if (inside) { zona = inside; zonaField.hidden = true; zonaInfo.textContent = 'Zona: ' + zona.nama_area + ' · ' + vendorName(zona.vendor_id); zonaInfo.className = 'hint'; }
      else { const nz = nearestZone(ll); if (nz) zonaSel.value = nz.id; zona = S.boot.zones.find(z => z.id === zonaSel.value) || null; zonaField.hidden = !S.boot.zones.length; zonaInfo.textContent = S.boot.zones.length ? 'Pin di luar zona terdaftar — tetap bisa dikirim; zona terdekat dipilih otomatis, ubah bila perlu. Temuan ditandai "di luar zona".' : 'Belum ada zona terdaftar di lingkup ini — hubungi Admin'; zonaInfo.className = 'hint warn-text'; } };
    map.on('click', e => setPin(e.latlng));
    const tryGps = () => { if (!navigator.geolocation) { gps.status = 'Gagal'; return; } gpsBtn.textContent = 'Mencari GPS...';
      navigator.geolocation.getCurrentPosition(p => okGps(p.coords.latitude, p.coords.longitude, p.coords.accuracy),
        err => { gps = { status: err.code === 1 ? 'Ditolak' : 'Gagal' };
          // v1.9.3: di dalam bingkai (iframe Apps Script / halaman pembungkus) browser memblokir GPS → tawarkan ambil GPS lewat jendela baru (top-level)
          if (err.code === 1 && isFramed()) { gpsBtn.dataset.popup = '1'; gpsBtn.textContent = 'GPS diblokir di dalam bingkai — tap di sini untuk ambil GPS lewat jendela baru'; toast('GPS diblokir browser di dalam bingkai. Tap tombol GPS untuk mengambil lokasi lewat jendela baru, atau pasang pin manual.'); }
          else { gpsBtn.textContent = 'GPS tidak tersedia — tap untuk coba lagi / pasang pin manual'; toast('GPS bermasalah (' + (err.message || 'kode ' + err.code) + '), silakan pasang pin manual di peta'); } }, { enableHighAccuracy: true, timeout: 12000 }); };
    const okGps = (lat, lng, acc) => { gps = { lat: lat, lng: lng, akurasi: Math.round(acc), status: 'Berhasil' }; delete gpsBtn.dataset.popup; gpsBtn.textContent = 'GPS ±' + gps.akurasi + 'm (tap peta untuk koreksi)'; const ll = L.latLng(lat, lng); map.panTo(ll); setPin(ll); };
    gpsBtn.addEventListener('click', () => { if (!gpsBtn.dataset.popup) return tryGps(); gpsBtn.textContent = 'Menunggu GPS dari jendela baru…';
      popupGeo().then(p => okGps(p.lat, p.lng, p.acc)).catch(e => { gpsBtn.textContent = 'GPS gagal (' + e.message + ') — tap untuk coba lagi / pasang pin manual'; toast('GPS gagal: ' + e.message + '. Pasang pin manual di peta.', true); }); });
    tryGps();
  }
  async function findingDetail(c, f) {
    const u = S.user; const box = el('div', { class: 'form' });
    const ba = el('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:8px' });
    const before = el('div', { class: 'card', style: 'padding:6px' }, el('p', { class: 'hint' }, 'Before'), el('div', { class: 'ba', style: 'width:100%;height:150px' }, el('div', { class: 'before' })));
    const after = el('div', { class: 'card', style: 'padding:6px' }, el('p', { class: 'hint' }, 'After'), el('div', { class: 'ba', style: 'width:100%;height:150px' }, el('div', { class: f.foto_after ? 'after' : '' })));
    ba.append(before, after); photoImg(f.foto_open).then(i => i.src && before.querySelector('.ba div').replaceWith(i)); if (f.foto_after) photoImg(f.foto_after).then(i => i.src && after.querySelector('.ba div').replaceWith(i));
    const info = el('div', { class: 'card' }, el('h3', {}, f.kategori + ' — ' + zonaName(f.zona_id)), el('p', { class: 'hint' }, 'Prioritas ' + f.prioritas + ' · Status ' + stLabel(f.status) + (f.is_operational_exception === 'Y' ? ' · Exception operasional' : '') + (f.di_luar_zona === 'Y' ? ' · Pin di luar zona (zona penanggung jawab dipilih pelapor)' : '')),
      el('p', { class: 'hint' }, 'Open: ' + fmtDT(f.timestamp_open) + ' · In Progress: ' + fmtDT(f.timestamp_inprogress) + (f.diajukan_close_at ? ' · Foto after diajukan: ' + fmtDT(f.diajukan_close_at) : '') + ' · Close: ' + fmtDT(f.timestamp_close)),
      Number(f.ditolak_close_count) ? el('p', { class: 'hint warn-text' }, 'Penutupan pernah ditolak ' + f.ditolak_close_count + '× · alasan terakhir: ' + nz(f.catatan_verifikasi_close, '-')) : null,   /* v1.19 */
      el('p', { class: 'hint' }, 'Target SLA: ' + fmtMin(+f.sla_target_menit) + (f.skala_pekerjaan === 'PekerjaanBesar' ? ' · Tambahan waktu ' + nz(f.status_persetujuan_skala, '') + ' (estimasi ' + fmtDT(f.estimasi_selesai_diajukan) + ')' : '') + (Number(f.tambah_waktu_count) ? ' · sudah ' + f.tambah_waktu_count + '× ditambah' : '')),
      f.alasan_tambah_waktu ? el('p', { class: 'hint' }, 'Alasan tambahan waktu: ' + nz(f.kategori_tambah_waktu, '-') + ' — ' + f.alasan_tambah_waktu) : null,   /* v1.21 */
      f.sumber ? el('p', { class: 'hint' }, 'Asal: ' + (f.sumber === 'SpotCheck' ? 'spot-check' : 'verifikasi checklist harian') + ' — dibuat otomatis dari jawaban item') : null,   /* v1.22 */
      f.deskripsi ? el('p', {}, f.deskripsi) : null);
    box.append(el('div', { class: 'section-head' }, el('h2', {}, 'Detail Temuan'), el('a', { class: 'link', onclick: () => go('temuan') }, 'Kembali')), info, ba);
    // aksi per role & status
    if (u.role === 'Mandor' && f.status === 'Open') {
      const pers = el('div', { class: 'list' }); S.boot.personil.forEach(p => pers.append(el('label', { class: 'toggle' }, el('input', { type: 'checkbox', value: p.id }), p.nama)));
      const pb = el('input', { type: 'checkbox' }), tw = tambahWaktuFields(); tw.box.classList.add('hidden'); pb.addEventListener('change', () => tw.box.classList.toggle('hidden', !pb.checked));   /* v1.21 */
      const b = el('button', { class: 'btn primary' }, 'Mulai (In Progress)');
      b.addEventListener('click', async () => { const personil = [...pers.querySelectorAll('input:checked')].map(i => i.value); if (!personil.length) return toast('Pilih minimal 1 personil', true); const salah = pb.checked ? tw.cek() : ''; if (salah) return toast(salah, true); b.disabled = true;
        try { await api('startFinding', Object.assign({ id: f.id, personil, pekerjaan_besar: pb.checked }, pb.checked ? tw.data() : {})); toast('Status: In Progress'); go('temuan'); } catch (e) { toast(e.message, true); b.disabled = false; } });
      box.append(el('div', { class: 'card form' }, el('h3', {}, 'Tugaskan personil'), pers, el('label', { class: 'toggle' }, pb, 'Ajukan tambahan waktu SLA (wajib alasan, butuh persetujuan)'), tw.box, b));
    }
    if ((u.role === 'Mandor' || u.role === 'PersonilRekanan') && f.status === 'InProgress') {
      // v1.19: foto after diverifikasi pelapor/Admin; panduan sudut sama dengan foto before
      const fa = cameraSlot('Foto after (kamera)'); const b = el('button', { class: 'btn primary' }, 'Kirim foto after (minta verifikasi)');
      b.addEventListener('click', async () => { if (!fa.dataset.value) return toast('Foto after wajib', true); b.disabled = true; try { const r1 = await api('closeFinding', { id: f.id, foto: fa.dataset.value }); toast(r1 && r1.queued ? 'Tersimpan di HP (tanpa sinyal) · dikirim otomatis saat ada sinyal' : 'Foto after terkirim — menunggu verifikasi Organik/Admin'); go('temuan'); } catch (e) { toast(e.message, true); b.disabled = false; } });
      box.append(el('div', { class: 'card form' }, el('h3', {}, 'Selesaikan'), Number(f.ditolak_close_count) ? el('p', { class: 'hint warn-text' }, 'Ditolak sebelumnya: ' + nz(f.catatan_verifikasi_close, '-') + ' — bersihkan ulang dulu.') : null,
        el('p', { class: 'hint' }, 'Ambil foto after dari sudut & posisi yang SAMA dengan foto Before di atas, setelah area benar-benar bersih. Temuan baru Close setelah disetujui pelapor (atau Karyawan Organik bila pelapornya rekanan) / Admin lingkup.'), fa, b));
    }
    // v1.21: Mandor mengajukan tambahan waktu selama In Progress — hanya sebelum batas SLA lewat, wajib alasan
    if (u.role === 'Mandor' && f.status === 'InProgress') {
      const kartu = el('div', { class: 'card form' }, el('h3', {}, 'Tambahan waktu SLA'));
      if (f.status_persetujuan_skala === 'Menunggu') kartu.append(el('p', { class: 'hint' }, 'Pengajuan sudah dikirim — menunggu keputusan ' + (f.pelapor_rekanan === 'Y' ? 'Karyawan Organik' : 'pelapor') + ' atau Admin lingkup.'));
      else if (Number(f.sla_sisa_menit) < 0) kartu.append(el('p', { class: 'hint warn-text' }, 'Batas SLA sudah lewat — tambahan waktu hanya bisa diajukan sebelum batas terlewati.'));
      else { const tw = tambahWaktuFields(), bt = el('button', { class: 'btn' }, 'Ajukan tambahan waktu');
        bt.addEventListener('click', async () => { const salah = tw.cek(); if (salah) return toast(salah, true); bt.disabled = true; try { await api('requestExtension', Object.assign({ id: f.id }, tw.data())); toast('Pengajuan terkirim — menunggu persetujuan'); go('temuan'); } catch (e) { toast(e.message, true); bt.disabled = false; } });
        kartu.append(el('p', { class: 'hint' }, 'Bila pekerjaan tidak bisa selesai tepat waktu, ajukan sebelum batas SLA lewat. Target baru berlaku setelah disetujui.' + (f.status_persetujuan_skala === 'Ditolak' ? ' Pengajuan terakhir ditolak.' : '')), tw.box, bt); }
      box.append(kartu);
    }
    // v1.19: verifikasi penutupan — pelapor (bukan rekanan), Admin, Super Admin (server memeriksa lingkup). v1.21: aturan yang sama untuk keputusan tambahan waktu.
    const verifikator = u.role !== 'Mandor' && u.role !== 'PersonilRekanan' && (u.role === 'SuperAdmin' || u.role === 'Admin' || String(f.reporter_id) === String(u.id) || (u.role === 'KaryawanOrganik' && f.pelapor_rekanan === 'Y'));
    const bisaVerif = f.status === 'MenungguVerifikasi' && verifikator;   // v1.20.1: temuan dari rekanan → Organik lingkup (server memeriksa lingkup)
    if (bisaVerif) {
      const alasan = el('textarea', { rows: 2, placeholder: 'Wajib bila menolak — mis. masih ada ceceran di sudut kiri' });
      const kirim = async ok => { if (!ok && alasan.value.trim().length < 3) return toast('Tulis alasan penolakan', true);
        try { await api('verifyClose', { id: f.id, setujui: ok, alasan: alasan.value.trim() }); toast(ok ? 'Disetujui — temuan Close' : 'Ditolak — dikembalikan ke rekanan (In Progress)'); go('temuan'); } catch (e) { toast(e.message, true); } };
      box.append(el('div', { class: 'card form verify-card' }, el('h3', {}, 'Verifikasi penutupan'), el('p', { class: 'hint' }, 'Bandingkan foto Before dan After di atas: apakah area yang SAMA dan sudah benar-benar bersih?'),
        el('p', { class: 'hint' }, 'Diajukan ' + fmtDT(f.diajukan_close_at) + (Number(f.ditolak_close_count) ? ' · pernah ditolak ' + f.ditolak_close_count + '×' : '')),
        fld('Alasan (bila ditolak)', alasan), el('div', { class: 'form-row' }, el('button', { class: 'btn primary', onclick: () => kirim(true) }, 'Setujui (Close)'), el('button', { class: 'btn danger', onclick: () => kirim(false) }, 'Tolak (bersihkan ulang)'))));
    } else if (f.status === 'MenungguVerifikasi') box.append(el('p', { class: 'hint' }, 'Menunggu verifikasi ' + (f.pelapor_rekanan === 'Y' ? 'Karyawan Organik' : 'pelapor') + ' atau Admin lingkup · diajukan ' + fmtDT(f.diajukan_close_at)));
    if (verifikator && f.status_persetujuan_skala === 'Menunggu') {
      box.append(el('div', { class: 'card form verify-card warn' }, el('h3', {}, 'Persetujuan tambahan waktu SLA'), el('p', {}, el('b', {}, nz(f.kategori_tambah_waktu, 'Alasan') + ': '), nz(f.alasan_tambah_waktu, '(tanpa keterangan)')),
        el('p', { class: 'hint' }, 'Estimasi selesai diajukan: ' + fmtDT(f.estimasi_selesai_diajukan) + ' · target sekarang ' + fmtMin(+f.sla_target_menit) + (Number(f.tambah_waktu_count) ? ' · sudah ' + f.tambah_waktu_count + '× ditambah' : '')), el('div', { class: 'form-row' },
        el('button', { class: 'btn primary', onclick: () => review(true) }, 'Setujui'), el('button', { class: 'btn danger', onclick: () => review(false) }, 'Tolak'))));
      async function review(ok) { try { await api('reviewPekerjaanBesar', { id: f.id, setujui: ok }); toast(ok ? 'Disetujui' : 'Ditolak'); go('temuan'); } catch (e) { toast(e.message, true); } }
    }
    /* v1.22.1: hapus temuan yang tidak sesuai langsung dari detail — Super Admin & Admin lingkup; lingkup = pabrik temuan itu (tidak perlu memilih lingkup dulu). Sama dengan Admin › Data: alasan wajib, tercatat di log. */
    if (u.role === 'SuperAdmin' || u.role === 'Admin') {
      const alasan = el('input', { placeholder: 'mis. salah zona / uji coba / foto tidak sesuai / dobel' }); const bh = el('button', { class: 'btn danger' }, 'Hapus temuan ini');
      bh.addEventListener('click', async () => { if (alasan.value.trim().length < 3) return toast('Tulis alasan penghapusan', true); if (!await confirmModal('Hapus permanen temuan ' + f.kategori + ' · ' + zonaName(f.zona_id) + '?\nTidak bisa dibatalkan (foto tetap di Drive); tercatat di log beserta alasan.')) return; bh.disabled = true;
        try { await api('deleteRecord', { tipe: 'temuan', id: f.id, alasan: alasan.value.trim(), pabrik_id: f.pabrik_id }); toast('Temuan dihapus'); go('temuan'); } catch (e) { toast(e.message, true); bh.disabled = false; } });
      box.append(el('details', { class: 'card form' }, el('summary', {}, 'Hapus temuan (tidak sesuai)'), el('p', { class: 'hint' }, 'Untuk temuan salah zona, uji coba, dobel, atau foto tidak sesuai. Skor HQI dihitung ulang otomatis.'), fld('Alasan (wajib)', alasan), bh));
    }
    c.replaceChildren(box);
  }

  // ================= CHECKLIST HARIAN (Mandor) / VERIFIKASI (Organik)
  VIEWS.checklist = async (c, arg) => {
    const verifier = S.user.role === 'KaryawanOrganik' || S.user.role === 'Admin' || S.user.role === 'SuperAdmin'; const tab = (arg && arg.tab) || 'isi';   // v1.17.1: tab Riwayat & Kepatuhan
    const subBar = subTabs('checklist', tab, [['isi', verifier ? 'Verifikasi' : 'Isi checklist'], ['riwayat', 'Riwayat'], ['kepatuhan', 'Kepatuhan']]);
    if (tab === 'riwayat') return historyView(c, 'checklist', subBar);
    if (tab === 'kepatuhan') return complianceView(c, subBar);
    if (verifier) { await verificationQueue(c); c.firstChild.after(subBar); return; }
    // v1.12: daftar checklist vendor 7 hari terakhir → zona yang sudah diisi hari ini dikunci (server juga menolak dobel), rekap hari kerja, catatan akhir pekan
    const dOf = iso => String(iso || '').slice(0, 10); let hist, tanpaSinyal = false;
    try { hist = await api('myChecklists', { hari: 10 }); saved.set('myChecklists', hist); }   /* v1.18 (O2): tanpa sinyal → riwayat tersimpan di HP */
    catch (e) { hist = saved.get('myChecklists'); if (!hist || !e.network) throw e; tanpaSinyal = true; }
    const antre = (await myQueue()).filter(it => it.body && it.body.action === 'submitDailyChecklist' && !it.rejected);   /* v1.18.1: yang ditolak server tidak dihitung "Menunggu terkirim" & tidak mengunci zona (tetap ada di daftar antrean) */
    hist = antre.map(it => ({ id: it.body.client_id, zona_id: it.body.zona_id, timestamp: it.body.waktu_isi, skor: '–', status_verifikasi: 'Menunggu terkirim', oleh: S.user.nama, antrean: true })).concat(hist.filter(h => !antre.some(it => it.body.client_id === h.id)));
    const zones = S.boot.zones; const zOf = id => zones.find(z => z.id === id) || {};   // v1.20: zona dikunci per blok frekuensinya (hari ini / periode / minggu ini)
    const done = hist.filter(x => { const n = zFrek(zOf(x.zona_id)); return blokKey(dOf(x.timestamp), n) === blokKey(today(), n) && (n === 1 || x.status_verifikasi !== 'Ditolak'); });
    const doneZ = id => done.find(x => x.zona_id === id);
    const zsel = sel(zones.map(z => { const n = zFrek(z), d = doneZ(z.id); return { v: z.id, t: z.nama_area + (d ? ' ✓ sudah diisi ' + periodeIni(n) + (n > 1 ? ' (' + tglPendek(dOf(d.timestamp)) + ')' : '') : n > 1 ? ' · ' + labelFrek(n) + ', wajib s/d ' + tglPendek(blokAkhir(today(), n)) : '') }; }));
    Array.from(zsel.options).forEach(o => { if (doneZ(o.value)) o.disabled = true; }); const firstOpen = zones.find(z => !doneZ(z.id)); if (firstOpen) zsel.value = firstOpen.id;
    const wd = new Date().getDay(), weekend = wd === 0 || wd === 6;
    const stPill = x => el('span', { class: 'pill ' + (x.status_verifikasi === 'Ditolak' ? 'Nonaktif' : x.status_verifikasi === 'Menunggu' || x.antrean ? 'Open' : 'ok') }, x.status_verifikasi || '-');
    const recap = zones.map(z => ({ z, n: new Set(hist.filter(x => x.zona_id === z.id && x.status_verifikasi !== 'Ditolak').map(x => dOf(x.timestamp))).size }));
    const todayCard = el('div', { class: 'card form' }, el('div', { class: 'section-head' }, el('h3', {}, 'Checklist periode berjalan'), el('span', { class: 'hint' }, done.length + ' dari ' + zones.length + ' zona')),
      tanpaSinyal ? el('p', { class: 'hint warn-text' }, 'Tanpa sinyal: data zona & pertanyaan dari HP. Checklist yang dikirim disimpan di HP (bisa beberapa zona) dan terkirim otomatis saat ada sinyal.') : null,
      weekend ? el('p', { class: 'hint warn-text' }, 'Hari ini akhir pekan — untuk zona 1×/hari checklist tidak wajib (hari kerja Senin–Jumat). Zona 2/3/7 hari dihitung per blok.') : null,
      done.length ? el('div', { class: 'list' }, ...done.map(x => el('div', { class: 'card row-card' }, el('div', { class: 'info' }, el('b', {}, zonaName(x.zona_id) + ' · skor ' + nz(x.skor)), el('span', {}, fmtDT(x.timestamp) + ' · oleh ' + x.oleh + (x.is_anomali === 'Y' ? ' · anomali' : ''))), stPill(x)))) : el('p', { class: 'hint' }, 'Belum ada zona yang diisi pada periode berjalan.'),
      el('p', { class: 'hint' }, '10 hari terakhir: ' + recap.map(r => r.z.nama_area + ' ' + r.n + ' hari (' + labelFrek(zFrek(r.z)) + ')').join(' · ')));
    // v1.6: Mandor mengisi jumlah personil rekanan per zona (dipakai statistik Beranda & label zona)
    const perInputs = {}; const perCard = el('div', { class: 'card form' }, el('h3', {}, 'Personil rekanan per zona'), el('p', { class: 'hint' }, 'Isi jumlah personil yang bertugas di tiap zona Anda (bisa diubah kapan saja).'),
      ...zones.map(z => { perInputs[z.id] = el('input', { type: 'number', min: 0, value: Number(z.jumlah_personil) || 0 }); return fld(z.nama_area, perInputs[z.id]); }),
      el('button', { class: 'btn sm', onclick: async e => { e.target.disabled = true; try { const w = zones.map(z => ({ z, v: Number(perInputs[z.id].value) || 0 })).filter(x => x.v !== (Number(x.z.jumlah_personil) || 0)).map(x => ({ action: 'setZonePersonil', zona_id: x.z.id, jumlah: x.v })); if (w.length) await saveAndBoot(w); toast('Jumlah personil tersimpan'); }   /* v1.16: semua zona + bootstrap dalam satu panggilan */ catch (err) { toast(err.message, true); } e.target.disabled = false; } }, 'Simpan jumlah personil'));
    const kk = kondisiCtl(() => renderItems()); const items = el('div'); let geo = null; geoNow().then(g => { if (g) geo = g; });   /* v1.23: geotag lokasi foto Mandor */
    const f1 = cameraSlot('Foto 1 (wajib)', () => geoNow(5000).then(g => { if (g) geo = g; })), f2 = cameraSlot('Foto 2 (opsional)');
    const btn = el('button', { class: 'btn primary' }, 'Kirim checklist');
    const renderItems = () => { const qs = qFor(zsel.value, 'ChecklistHarian'); items.replaceChildren(...(qs.length ? qs.map(q => triItem(q, kk.on())) : [el('p', { class: 'empty' }, 'Belum ada pertanyaan untuk zona ini — hubungi Admin')])); };
    zsel.addEventListener('change', renderItems); renderItems();
    c.replaceChildren(el('div', { class: 'greeting' }, el('h2', {}, 'Checklist Harian'), el('p', {}, today() + ' · satu kali per zona per hari kerja (Senin–Jumat)')), todayCard,
      el('div', { class: 'card form' }, fld('Zona', zsel), zoneMapPicker(zsel, zones), kk.box, items),   // v1.7.2: peta zona
      el('div', { class: 'section-head' }, el('h3', {}, 'Bukti foto (langsung dari kamera, ber-watermark)')), el('div', { class: 'camera-row' }, f1, f2), btn,
      el('p', { class: 'hint', style: 'text-align:center' }, 'Setelah dikirim: Menunggu Verifikasi Karyawan Organik (batas hari ini)'), zones.length ? perCard : null); c.firstChild.after(subBar);
    if (zones.length && !firstOpen) { btn.disabled = true; btn.textContent = 'Semua zona sudah diisi hari ini'; }
    btn.addEventListener('click', async () => { if (doneZ(zsel.value)) return toast('Zona ini sudah diisi hari ini — pilih zona lain', true); const answers = readTri(items); if (!answers) return toast('Semua item harus dijawab', true); if (!f1.dataset.value) return toast('Foto 1 wajib', true); const salahK = kk.cek(); if (salahK) return toast(salahK, true); btn.disabled = true;
      try { const r1 = await api('submitDailyChecklist', Object.assign({ zona_id: zsel.value, items: answers, foto1: f1.dataset.value, foto2: f2.dataset.value || '' }, kk.data(), geo ? { gps_lat: geo.lat, gps_lng: geo.lng, gps_akurasi: geo.akurasi } : {})); toast(r1 && r1.queued ? 'Tersimpan di HP (tanpa sinyal) · dikirim otomatis saat ada sinyal' : 'Checklist terkirim'); go('checklist'); } catch (e) { toast(e.message, true); btn.disabled = false; } });
  };
  function triItem(q, drainOn, rk) { const na = drainOn && q.terkait_drain === 'Y'; let ex = null; const tri = el('div', { class: 'tri' }, ...['Ya', 'Cukup', 'Tidak'].map(v => el('button', { type: 'button', disabled: na ? '' : null, onclick: e => { tri.querySelectorAll('button').forEach(b => b.classList.remove('active')); e.target.classList.add('active'); tri.dataset.v = v; if (ex) ex.set(v); } }, v)));
    if (na) tri.dataset.v = 'NA'; const row = el('div', { class: 'check-item' + (na ? ' na' : '') + (rk ? ' has-rk' : ''), 'data-q': q.id }, el('span', {}, q.teks_pertanyaan, na ? el('em', {}, 'N/A — kondisi khusus (drain / perbaikan)') : null), tri);
    if (rk && !na) { ex = rekomBox(q, rk); row.append(ex.box); row._rk = ex; } return row; }
  /**
   * v1.22 (keputusan Rudy 12 Nov 2026): rekomendasi pembersihan dari Organik = temuan. Kotak ini muncul di bawah item spot-check / cross-checklist
   * saat dijawab Tidak (catatan area WAJIB, otomatis jadi temuan) atau Cukup (catatan opsional, jadi temuan hanya bila dicentang).
   * Tiap temuan wajib satu foto sendiri + kategori + prioritas; pin = GPS HP saat memotret (gagal → titik tengah zona, diisi server).
   * rk.ada = { question_id: id temuan } — item yang masih punya temuan terbuka di zona itu tidak membuat temuan baru (tanpa foto).
   */
  function rekomBox(q, rk) { let v = '', gps = null; const lama = () => !!(rk.ada && rk.ada[String(q.id)]);
    const cat = el('textarea', { rows: 2, maxlength: 300, placeholder: 'mis. sudut timur dekat pompa P-101, bawah conveyor' }); const catF = fld('', cat);
    const cek = el('input', { type: 'checkbox' }); const cekL = el('label', { class: 'toggle' }, cek, 'Jadikan temuan (ditindaklanjuti rekanan, ber-SLA)');
    const ambilGps = () => { if (!navigator.geolocation) return; navigator.geolocation.getCurrentPosition(p => { gps = { pin_lat: p.coords.latitude, pin_lng: p.coords.longitude, gps_akurasi: Math.round(p.coords.accuracy) }; }, () => {}, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }); };
    const foto = cameraSlot('Foto temuan (wajib)', ambilGps); const kat = sel(S.boot.kategoriTemuan || ['Lainnya']), pri = sel(S.boot.prioritas.map(p => ({ v: p, t: p + ' — ≤ ' + fmtMin(slaOf(p)) }))); pri.value = 'Sedang';
    const info = el('p', { class: 'hint' }); const det = el('div', { class: 'rk-temuan' }, el('div', { class: 'camera-row' }, foto), fld('Kategori', kat), fld('Prioritas (target selesai)', pri));
    const box = el('div', { class: 'rk hidden' }, catF, cekL, info, det);
    const jadi = () => v === 'Tidak' || (v === 'Cukup' && cek.checked);
    const upd = () => { box.classList.toggle('hidden', v !== 'Tidak' && v !== 'Cukup'); catF.firstChild.textContent = 'Area mana yang perlu dibersihkan?' + (jadi() ? ' (wajib)' : ' (opsional)');
      cekL.classList.toggle('hidden', v !== 'Cukup'); det.classList.toggle('hidden', !jadi() || lama());
      info.textContent = !jadi() ? '' : lama() ? 'Item ini sudah punya temuan yang masih terbuka di zona ini — tidak dibuat temuan baru, cukup tulis catatannya.' : 'Akan dikirim sebagai temuan ke Mandor zona ini — foto ini menjadi foto before.'; info.classList.toggle('hidden', !jadi()); };
    cek.addEventListener('change', upd);
    return { box, set: x => { v = x; upd(); }, refresh: upd,
      cek: () => { if (!jadi()) return ''; if (cat.value.trim().length < 3) return 'Tulis area yang perlu dibersihkan untuk "' + q.teks_pertanyaan + '"'; if (!lama() && !foto.dataset.value) return 'Foto wajib untuk "' + q.teks_pertanyaan + '" (akan menjadi temuan)'; return ''; },
      data: () => { const o = {}; if (v !== 'Tidak' && v !== 'Cukup') return o; if (cat.value.trim()) o.catatan = cat.value.trim(); if (!jadi()) return o; if (v === 'Cukup') o.temuan = true; if (lama()) return o;
        return Object.assign(o, { foto_temuan: foto.dataset.value || '', kategori: kat.value, prioritas: pri.value }, gps || {}); } }; }
  /** v1.22: pesan kesalahan pertama dari kotak rekomendasi di dalam `box` ('' = lengkap). */
  function cekRekom(box) { for (const it of box.querySelectorAll('.check-item')) { const m = it._rk ? it._rk.cek() : ''; if (m) { it.scrollIntoView({ block: 'center', behavior: 'smooth' }); return m; } } return ''; }
  const jmlTemuan = json => { try { return JSON.parse(json || '[]').filter(i => i.temuan_id && i.temuan_lama !== 'Y').length; } catch (e) { return 0; } };
  function readTri(box) { const out = []; for (const it of box.querySelectorAll('.check-item')) { const v = it.querySelector('.tri').dataset.v; if (!v) return null; out.push(Object.assign({ question_id: it.dataset.q, hasil: v }, it._rk ? it._rk.data() : {})); } return out; }
  /** v1.14: verifikasi = cross-checklist — Organik menjawab item yang sama; skor Organik yang dipakai HQI. "Tolak" hanya untuk isian tidak sah. */
  async function verificationQueue(c) {
    const rows = await api('listPendingVerification', {}); const list = el('div', { class: 'list' }); const canVerify = S.user.role === 'KaryawanOrganik' || S.user.role === 'SuperAdmin';
    /* v1.23: posisi saya (sekali) untuk keterangan jarak di tiap kartu; peta per kartu dibuat saat kartu terlihat */
    const kartu = [];
    c.replaceChildren(el('div', { class: 'greeting' }, el('h2', {}, 'Verifikasi Checklist'), el('p', {}, rows.length + ' menunggu · wajib hari yang sama · jawab ulang tiap item (cross-checklist); skor Anda yang dipakai')), rows.length ? list : el('p', { class: 'empty' }, 'Tidak ada antrean'));
    rows.forEach(r => { const items = JSON.parse(r.item_checklist || '[]'); const drainOn = r.sedang_drain === 'Y'; const box = el('div');
      const qOf = it => S.boot.questions.find(q => String(q.id) === String(it.question_id)) || { id: it.question_id, teks_pertanyaan: it.item, terkait_drain: it.hasil === 'NA' ? 'Y' : 'N' };
      const rk = canVerify ? { ada: r.temuan_terbuka || {} } : null;   /* v1.22 */
      box.replaceChildren(...items.map(it => { const row = triItem(qOf(it), drainOn, rk); row.querySelector('span').append(el('em', {}, 'Jawaban Mandor: ' + it.hasil)); return row; }));
      const vf = canVerify ? cameraSlot('Foto verifikasi (wajib)') : null;   // v1.17.6: foto kondisi zona saat verifikasi — wajib, langsung dari kamera (ber-watermark)
      const card = el('div', { class: 'card form' }, el('h3', {}, zonaName(r.zona_id) + ' · skor Mandor ' + nz(r.skor)), el('p', { class: 'hint' }, fmtDT(r.timestamp) + ' · batas ' + fmtDT(r.deadline_verifikasi) + (r.is_anomali === 'Y' ? ' · ANOMALI' : '') + kondisiTeks(r)),
        el('div', { class: 'camera-row', id: 'ph-' + r.id }), canVerify ? el('p', { class: 'hint' }, 'Cross-checklist Anda (jawaban Tidak wajib menyebut area & foto — otomatis jadi temuan untuk rekanan):') : null, canVerify ? box : el('div', { class: 'hint' }, items.map(i => i.item + ': ' + i.hasil).join(' · ')),
        canVerify ? el('p', { class: 'hint' }, 'Foto verifikasi (wajib, dari kamera):') : null, canVerify ? el('div', { class: 'camera-row' }, vf) : null,
        canVerify ? el('div', { class: 'form-row' }, el('button', { class: 'btn primary', onclick: () => verify(r, box, vf) }, 'Simpan verifikasi (pakai skor saya)'), el('button', { class: 'btn danger', onclick: () => tolak(r, vf) }, 'Tolak (isian tidak sah)')) : null);
      const lok = lokasiZona(r); card.querySelector('h3').after(lok.box); list.append(card); kartu.push(lok);
      [r.foto1, r.foto2].filter(Boolean).forEach(id => photoImg(id).then(i => { if (i.src) { i.style.cssText = 'width:48%;border-radius:12px'; card.querySelector('#ph-' + r.id).append(i); } })); });
    if (rows.length) geoNow().then(g => { if (g) kartu.forEach(x => x.setPos(g)); });
    async function verify(r, box, vf) { const answers = readTri(box); if (!answers) return toast('Jawab semua item cross-checklist dulu', true); const salahR = cekRekom(box); if (salahR) return toast(salahR, true); if (!vf || !vf.dataset.value) return toast('Foto verifikasi wajib — tap kotak kamera untuk memotret kondisi zona', true); try { const res = await api('verifyDailyChecklist', { id: r.id, setujui: true, items: answers, foto: vf.dataset.value, rekom: 1 }); const nT = jmlTemuan(res.item_verifikasi); toast('Terverifikasi · skor Mandor ' + nz(r.skor) + ' → skor Anda ' + nz(res.skor) + (res.is_anomali === 'Y' ? ' (selisih besar: ditandai anomali)' : '') + (nT ? ' · ' + nT + ' temuan dibuat' : '')); go('checklist'); } catch (e) { toast(e.message, true); } }
    async function tolak(r, vf) { if (!await confirmModal('Tolak checklist ' + zonaName(r.zona_id) + '?\nGunakan hanya bila isian/foto tidak sah. Entri ditolak tidak dihitung dan tidak menambah kepatuhan.')) return; try { await api('verifyDailyChecklist', { id: r.id, setujui: false, foto: vf && vf.dataset.value ? vf.dataset.value : undefined }); toast('Ditolak'); go('checklist'); } catch (e) { toast(e.message, true); } }
  }

  /**
   * v1.23: kotak lokasi di kartu verifikasi — deskripsi zona, peta mini (polygon zona disorot, pin lokasi foto Mandor bila ada geotag, titik biru posisi saya),
   * keterangan jarak/arah. Peta dibuat saat kartu terlihat (IntersectionObserver) agar antrean panjang tetap ringan.
   * Pin Mandor di luar zona hanya diberi tanda informasi (keputusan Rudy: tidak menolak).
   */
  function lokasiZona(r) { const z = S.boot.zones.find(x => String(x.id) === String(r.zona_id)) || {}; const pusat = zonaTengah(z); const poly = Array.isArray(z.polygon) && z.polygon.length > 2 ? z.polygon : null;
    const mandor = r.gps_lat !== '' && r.gps_lat != null && isFinite(+r.gps_lat) && isFinite(+r.gps_lng) ? { lat: +r.gps_lat, lng: +r.gps_lng } : null; const tujuan = pusat || mandor;
    const ket = el('p', { class: 'hint lok-ket' }); const mapBox = (poly || mandor) ? el('div', { class: 'map map-mini' }) : null; let map = null, dot = null, pos = null;
    const tulis = () => { if (!pos) { ket.textContent = poly ? 'Zona disorot oranye di peta' + (mandor ? ' · pin = lokasi foto Mandor' : '') + '.' : 'Zona ini belum punya batas di peta — hubungi Admin.'; return; }
      if (poly && pointInPolygon(pos, poly)) { ket.textContent = 'Anda berada di zona ini' + (mandor ? ' · pin = lokasi foto Mandor' : '') + '.'; return; }
      if (!tujuan) { ket.textContent = 'Zona ini belum punya batas di peta — hubungi Admin.'; return; } const d = jarakArah(pos, tujuan); ket.textContent = (pusat ? 'Zona ini' : 'Lokasi foto Mandor') + ' ±' + fmtJarak(d.m) + ' arah ' + d.arah + ' dari posisi Anda.' + (poly ? '' : ' Zona ini belum punya batas di peta — arah memakai lokasi foto Mandor.'); };
    const pasangDot = () => { if (!map || !pos) return; if (dot) dot.setLatLng([pos.lat, pos.lng]); else dot = L.circleMarker([pos.lat, pos.lng], { radius: 7, color: '#fff', fillColor: '#3B82F6', fillOpacity: 1, weight: 2 }).addTo(map).bindTooltip('Posisi Anda'); };
    const buat = () => loadMaps().then(() => { if (map) return; map = newMap(mapBox, { layerControl: false }); const b = [];
      if (poly) { const pl = L.polygon(poly.map(toLL), { color: '#FFB020', fillColor: '#FF7A1A', fillOpacity: .35, weight: 3 }).addTo(map); pl.bindTooltip(esc(z.nama_area || ''), { permanent: true, direction: 'center', className: 'zone-label' }); b.push(...poly.map(toLL)); }
      if (mandor) { L.marker([mandor.lat, mandor.lng], { icon: PIN_ICON(), title: 'Lokasi foto Mandor' }).addTo(map).bindTooltip('Lokasi foto Mandor' + (r.gps_akurasi ? ' (±' + r.gps_akurasi + ' m)' : '')); b.push([mandor.lat, mandor.lng]); }
      if (b.length) map.fitBounds(L.latLngBounds(b), { padding: [24, 24], maxZoom: 19 }); pasangDot(); }).catch(e => mapError(mapBox, e.message));
    if (mapBox) { if ('IntersectionObserver' in window) { const io = new IntersectionObserver(en => { if (en.some(x => x.isIntersecting)) { io.disconnect(); buat(); } }, { rootMargin: '200px' }); io.observe(mapBox); } else buat(); }
    tulis();
    const box = el('div', { class: 'lok' }, z.deskripsi ? el('p', { class: 'lok-desk' }, el('b', {}, 'Lokasi: '), z.deskripsi) : null, mapBox, ket,
      r.gps_luar_zona === 'Y' ? el('p', { class: 'hint warn-text' }, 'Catatan: GPS HP Mandor saat mengirim berada di luar batas zona (informasi — GPS di area pabrik bisa meleset).') : null,
      !mandor ? el('p', { class: 'hint' }, 'Lokasi foto Mandor tidak tercatat (GPS HP Mandor mati/ditolak, atau checklist dikirim sebelum v1.23).') : null);
    return { box, setPos: g => { pos = g; tulis(); pasangDot(); } }; }

  // ================= v1.17.1: RIWAYAT (Spot-Check & Checklist) + KEPATUHAN (Checklist) — permintaan Rudy 19 Okt 2026
  /** Bilah tab sub-menu: tab pertama = isi bawaan menu (tanpa arg), tab lain lewat go(view, { tab }). */
  function subTabs(view, cur, tabs) { return el('div', { class: 'tabs' }, ...tabs.map(([k, label]) => el('button', { class: k === cur ? 'active' : '', onclick: () => go(view, k === tabs[0][0] ? null : { tab: k }) }, label))); }
  /** Rentang satu bulan dari input type=month (akhir dibatasi hari ini). */
  function monthRange(v) { const [y, m] = String(v).split('-').map(Number); const last = new Date(y, m, 0).getDate(); const e = v + '-' + String(last).padStart(2, '0'); return { periode_mulai: v + '-01', periode_selesai: e > today() ? today() : e }; }
  const scorePill = (v, label) => el('span', { class: 'pill ' + ({ ok: 'ok', warn: 'Open', danger: 'Nonaktif' }[scoreCls(v)] || '') }, label != null ? label : nz(v));
  const ckPill = x => el('span', { class: 'pill ' + (x.status_verifikasi === 'Ditolak' ? 'Nonaktif' : x.status_verifikasi === 'Menunggu' ? 'Open' : 'ok') }, CK_STATUS[x.status_verifikasi] || x.status_verifikasi || '-');
  async function historyView(c, tipe, bar) {
    const isSpot = tipe === 'spot', isMandor = S.user.role === 'Mandor';
    const bln = el('input', { type: 'month', value: today().slice(0, 7) });
    const zsel = sel([{ v: '', t: 'Semua zona' }].concat(S.boot.zones.map(z => ({ v: z.id, t: z.nama_area + (isMandor ? '' : ' · ' + vendorName(z.vendor_id)) }))));
    const stSel = isSpot ? null : sel([{ v: '', t: 'Semua status' }].concat(Object.keys(CK_STATUS).map(k => ({ v: k, t: CK_STATUS[k] }))));
    const mine = isSpot && S.user.role === 'KaryawanOrganik' ? el('input', { type: 'checkbox' }) : null;
    const info = el('p', { class: 'hint' }); const list = el('div', { class: 'list' }); let seq = 0;
    const load = async () => { if (!bln.value) return; const my = ++seq; list.replaceChildren(el('p', { class: 'empty' }, 'Memuat...')); info.textContent = '';
      try { const r = await api('history', Object.assign({ tipe, ringkas: 1, zona_id: zsel.value || undefined, status: stSel && stSel.value ? stSel.value : undefined, saya: mine && mine.checked ? true : undefined }, monthRange(bln.value))); if (my !== seq) return;
        const sk = r.rows.map(x => Number(x.skor)).filter(x => !isNaN(x)); const avg = sk.length ? r1(sk.reduce((a, b) => a + b, 0) / sk.length) : null;
        info.textContent = r.total + ' entri pada ' + r.periode.mulai + ' s/d ' + r.periode.selesai + (avg != null ? ' · rata-rata skor ' + avg : '') + (r.total > r.rows.length ? ' · menampilkan ' + r.rows.length + ' terbaru' : '');
        list.replaceChildren(...(r.rows.length ? r.rows.map(x => histCard(tipe, x, isMandor)) : [el('p', { class: 'empty' }, 'Belum ada ' + (isSpot ? 'spot-check' : 'checklist') + ' pada periode ini')])); }
      catch (e) { if (my === seq) list.replaceChildren(el('p', { class: 'empty err' }, e.message)); } };
    [bln, zsel, stSel, mine].filter(Boolean).forEach(x => x.addEventListener('change', load));
    c.replaceChildren(el('div', { class: 'greeting' }, el('h2', {}, isSpot ? 'Spot-Check' : 'Checklist Harian'), el('p', {}, 'Riwayat ' + (isSpot ? 'spot-check' : 'checklist harian') + ' per bulan · tap entri untuk melihat jawaban & foto')), bar,
      el('div', { class: 'card form' }, el('div', { class: 'form-row' }, fld('Bulan', bln), fld('Zona', zsel)), stSel ? fld('Status verifikasi', stSel) : null, mine ? el('label', { class: 'toggle' }, mine, 'Hanya spot-check saya') : null), info, list);
    load();
  }
  function histCard(tipe, x, isMandor) { const isSpot = tipe === 'spot'; const verified = !isSpot && (x.status_verifikasi === 'Terverifikasi' || x.status_verifikasi === 'TerverifikasiOtomatis');
    return el('div', { class: 'card row-card link-card', onclick: () => histDetail(tipe, x) },
      el('div', { class: 'info' }, el('b', {}, zonaName(x.zona_id) + (isMandor ? '' : ' · ' + x.vendor)),
        el('span', {}, fmtDT(x.timestamp) + (isSpot ? ' · oleh ' + x.oleh : ' · Mandor ' + x.oleh + ' · skor Mandor ' + nz(x.skor_mandor) + (verified ? ' → verifikasi ' + nz(x.skor) : '')) + (x.is_anomali === 'Y' ? ' · anomali' : '') + (x.sedang_drain === 'Y' ? ' · saat drain' : ''))),
      isSpot ? scorePill(x.skor) : ckPill(x)); }
  function histDetail(tipe, x) { const isSpot = tipe === 'spot';
    if (x.ada_item && x.item_checklist == null) {   /* v1.25: riwayat ringkas — jawaban item diambil saat entri diketuk */
      modal(el('div', { class: 'form' }, el('div', { class: 'section-head' }, el('h3', {}, (isSpot ? 'Spot-check' : 'Checklist') + ' · ' + zonaName(x.zona_id)), el('a', { class: 'link', onclick: closeModal }, 'Tutup')), el('p', { class: 'empty' }, 'Memuat jawaban…')));
      api('historyItems', { tipe, id: x.id }).then(d => { Object.assign(x, d); histDetail(tipe, x); }).catch(e => { toast(e.message, true); closeModal(); }); return; } const parse = s => { try { const a = JSON.parse(s || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
    const items = parse(x.item_checklist), ver = parse(x.item_verifikasi); const vOf = it => (ver.find(v => String(v.question_id) === String(it.question_id)) || {}).hasil;
    const qText = it => it.item || (S.boot.questions.find(q => String(q.id) === String(it.question_id)) || {}).teks_pertanyaan || it.question_id;
    const rkOf = it => isSpot ? it : ver.find(v => String(v.question_id) === String(it.question_id)) || {};   /* v1.22: catatan Organik + penanda temuan */
    const rkNote = it => { const k = rkOf(it); return k.catatan || k.temuan_id ? el('em', {}, (k.catatan ? 'Perlu dibersihkan: ' + k.catatan : '') + (k.temuan_id ? (k.catatan ? ' · ' : '') + (k.temuan_lama === 'Y' ? 'temuan sudah ada' : 'jadi temuan') : '')) : null; };
    const ph = el('div', { class: 'camera-row' }); const phv = el('div', { class: 'camera-row' });   // v1.17.6: foto pemverifikasi terpisah
    modal(el('div', { class: 'form' }, el('div', { class: 'section-head' }, el('h3', {}, (isSpot ? 'Spot-check' : 'Checklist') + ' · ' + zonaName(x.zona_id)), el('a', { class: 'link', onclick: closeModal }, 'Tutup')),
      el('p', { class: 'hint' }, fmtDT(x.timestamp) + ' · ' + x.vendor + ' · ' + (isSpot ? 'oleh ' : 'Mandor ') + x.oleh + kondisiTeks(x) + (!isSpot && x.gps_lat !== '' && x.gps_lat != null ? ' · lokasi foto tercatat' + (x.gps_luar_zona === 'Y' ? ' (di luar batas zona)' : '') : '')),
      isSpot ? el('p', {}, 'Skor ', scorePill(x.skor)) : el('p', {}, 'Skor Mandor ', el('b', {}, nz(x.skor_mandor)), ...(x.verifikator ? [' · skor verifikasi ', el('b', {}, nz(x.skor)), ' oleh ' + x.verifikator + (x.verified_at ? ' (' + fmtDT(x.verified_at) + ')' : '')] : []), ' ', ckPill(x)),
      x.is_anomali === 'Y' ? el('p', { class: 'hint warn-text' }, 'Anomali: selisih skor Mandor vs verifikasi melebihi ambang' + (x.status_review_anomali ? ' · review: ' + x.status_review_anomali : '')) : null,
      items.length ? el('div', { class: 'tbl-wrap' }, el('table', { class: 'tbl' }, el('tr', {}, el('th', {}, 'Item'), el('th', {}, isSpot ? 'Jawaban' : 'Mandor'), isSpot ? null : el('th', {}, 'Verifikasi')),
        ...items.map(it => el('tr', {}, el('td', {}, qText(it), rkNote(it)), el('td', {}, it.hasil === 'NA' ? 'N/A' : it.hasil || '–'), isSpot ? null : el('td', {}, vOf(it) === 'NA' ? 'N/A' : vOf(it) || '–'))))) : el('p', { class: 'hint' }, 'Tanpa rincian item'),
      isSpot ? null : el('p', { class: 'hint' }, 'Foto Mandor:'), ph,
      !isSpot && x.foto_verifikasi ? el('p', { class: 'hint' }, 'Foto verifikasi' + (x.verifikator ? ' oleh ' + x.verifikator : '') + ':') : null, !isSpot && x.foto_verifikasi ? phv : null));
    const put = (box, id) => photoImg(id).then(i => { if (i.src) { i.style.cssText = 'width:48%;border-radius:12px'; box.append(i); } });
    (isSpot ? [x.foto] : [x.foto1, x.foto2]).filter(Boolean).forEach(id => put(ph, id)); if (!isSpot && x.foto_verifikasi) put(phv, x.foto_verifikasi);
  }
  async function complianceView(c, bar) {
    const isMandor = S.user.role === 'Mandor'; const bln = el('input', { type: 'month', value: today().slice(0, 7) }); const box = el('div', { class: 'form' }); let seq = 0;
    const load = async () => { if (!bln.value) return; const my = ++seq; box.replaceChildren(el('p', { class: 'empty' }, 'Memuat...'));
      try { const r = await api('checklistCompliance', monthRange(bln.value)); if (my !== seq) return; const thisMonth = bln.value === today().slice(0, 7);
        const hiCell = z => z.blok_ini ? '✓ ' + (CK_STATUS[z.blok_ini] || z.blok_ini) + (z.frekuensi > 1 && z.blok_ini_tgl ? ' (' + tglPendek(z.blok_ini_tgl) + ')' : '') : z.frekuensi === 1 && r.akhir_pekan ? 'akhir pekan' : 'belum diisi' + (z.frekuensi > 1 && z.blok_akhir ? ' · s/d ' + tglPendek(z.blok_akhir) : '');   /* v1.20 */
        const heads = ['Zona'].concat(isMandor ? [] : ['Vendor'], ['Frekuensi', 'Terisi', 'Kepatuhan'], thisMonth ? ['Periode berjalan'] : []);
        box.replaceChildren(el('p', { class: 'hint' }, 'Periode ' + r.periode.mulai + ' s/d ' + r.periode.selesai + ' · ' + r.hari_kerja + ' hari kerja (Senin–Jumat). Kepatuhan per zona: zona 1×/hari = hari terisi ÷ hari kerja; zona 2/3 hari & mingguan = blok terisi ÷ jumlah blok (tepat 1 checklist per blok). Yang ditolak tidak dihitung; skor vendor = rata-rata zonanya — sama dengan komponen Kepatuhan di HQI.'),
          r.vendor.length ? el('div', { class: 'stat-grid' }, ...r.vendor.map(v => stat(v.skor + '%', (isMandor ? 'Kepatuhan' : v.vendor) + ' · ' + v.zona + ' zona'))) : null,
          r.zona.length ? el('div', { class: 'tbl-wrap' }, el('table', { class: 'tbl' }, el('tr', {}, ...heads.map(h => el('th', {}, h))),
            ...r.zona.slice().sort((a, b) => a.pct - b.pct).map(z => el('tr', {}, el('td', {}, z.nama), isMandor ? null : el('td', {}, z.vendor), el('td', {}, labelFrek(z.frekuensi || 1)), el('td', {}, nz(z.terisi, z.hari_terisi) + ' / ' + nz(z.wajib, '-') + (z.frekuensi > 1 ? ' blok' : ' hari')), el('td', {}, scorePill(z.pct, z.pct + '%')), thisMonth ? el('td', {}, hiCell(z)) : null)))) : el('p', { class: 'empty' }, 'Belum ada zona aktif pada lingkup ini')); }
      catch (e) { if (my === seq) box.replaceChildren(el('p', { class: 'empty err' }, e.message)); } };
    bln.addEventListener('change', load);
    c.replaceChildren(el('div', { class: 'greeting' }, el('h2', {}, 'Checklist Harian'), el('p', {}, 'Kepatuhan pengisian checklist per zona')), bar, el('div', { class: 'card form' }, fld('Bulan', bln), box)); load();
  }

  // ================= SPOT-CHECK (Karyawan Organik)
  VIEWS.spot = async (c, arg) => {
    const tab = (arg && arg.tab) || 'isi'; const subBar = subTabs('spot', tab, [['isi', 'Isi spot-check'], ['riwayat', 'Riwayat']]);   // v1.17.1: tab Riwayat
    if (tab === 'riwayat') return historyView(c, 'spot', subBar);
    const pabOf = z => S.boot.isMulti && S.scope === 'ALL' ? ' · ' + ((S.boot.pabrik.find(p => p.id === z.pabrik_id) || {}).nama || z.pabrik_id) : '';   // v1.7.2: "Semua lingkup" → sebut pabriknya
    const zsel = sel(S.boot.zones.map(z => ({ v: z.id, t: z.nama_area + ' · ' + vendorName(z.vendor_id) + pabOf(z) }))); const kk = kondisiCtl(() => renderItems()); const items = el('div'); const f = cameraSlot('Foto titik (kamera)');
    const rk = { ada: {} }; const adaZ = {};   /* v1.22: item yang sudah punya temuan terbuka per zona (tanpa sinyal → kosong, server tetap menyaring) */
    const renderItems = () => { const qs = qFor(zsel.value, 'SpotCheck'); rk.ada = adaZ[zsel.value] || {}; items.replaceChildren(...(qs.length ? qs.map(q => triItem(q, kk.on(), rk)) : [el('p', { class: 'empty' }, 'Belum ada pertanyaan untuk zona ini — hubungi Admin')])); };
    const muatAda = async () => { const z = zsel.value; if (!z || adaZ[z]) return; try { adaZ[z] = await api('itemFindings', { zona_id: z }) || {}; } catch (e) { return; } if (zsel.value !== z) return; rk.ada = adaZ[z]; items.querySelectorAll('.check-item').forEach(it => it._rk && it._rk.refresh()); };
    zsel.addEventListener('change', () => { renderItems(); muatAda(); }); renderItems(); muatAda();
    const btn = el('button', { class: 'btn primary' }, 'Kirim spot-check');
    c.replaceChildren(el('div', { class: 'greeting' }, el('h2', {}, 'Spot-Check'), el('p', {}, 'Tidak terjadwal — kapan saja saat di lapangan · jawaban Tidak wajib menyebut area & foto, otomatis jadi temuan')), el('div', { class: 'card form' }, fld('Zona', zsel), zoneMapPicker(zsel, S.boot.zones), kk.box, items), el('div', { class: 'section-head' }, el('h3', {}, 'Bukti foto (kamera, ber-watermark)')), el('div', { class: 'camera-row' }, f), btn); c.firstChild.after(subBar);   // v1.7.2: peta zona; slot foto dibungkus .camera-row agar tidak terjepit
    btn.addEventListener('click', async () => { const a = readTri(items); if (!a) return toast('Semua item harus dijawab', true); const salahK = kk.cek() || cekRekom(items); if (salahK) return toast(salahK, true); btn.disabled = true; try { const r1 = await api('submitSpotCheck', Object.assign({ zona_id: zsel.value, items: a, foto: f.dataset.value || '', rekom: 1 }, kk.data())); const nT = r1 && !r1.queued ? jmlTemuan(r1.item_checklist) : 0; toast(r1 && r1.queued ? 'Tersimpan di HP (tanpa sinyal) · dikirim otomatis saat ada sinyal' : 'Spot-check tersimpan' + (nT ? ' · ' + nT + ' temuan dibuat' : '')); go('spot'); } catch (e) { toast(e.message, true); btn.disabled = false; } });
  };

  // ================= LEADERBOARD (internal PKG: Organik, Admin, Manajemen, SuperAdmin) — v1.6 menu sendiri
  // v1.7: filter periode — bulanan, triwulan (3 bulan), semester, tahunan (server menerima rentang tanggal bebas)
  VIEWS.leaderboard = async (c) => {
    const now = new Date(), Y = now.getFullYear(), M = now.getMonth();
    const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const jenis = sel([{ v: 'bulan', t: 'Bulanan' }, { v: 'triwulan', t: 'Triwulan (3 bulan)' }, { v: 'semester', t: 'Semester (6 bulan)' }, { v: 'tahun', t: 'Tahunan' }]);
    const tahun = sel([Y - 2, Y - 1, Y].map(y => ({ v: String(y), t: String(y) }))); tahun.value = String(Y);
    const bulan = sel(BULAN.map((n, i) => ({ v: String(i + 1), t: n }))); bulan.value = String(M + 1);
    const tri = sel([1, 2, 3, 4].map(q => ({ v: String(q), t: 'Triwulan ' + q + ' (' + ['Jan–Mar', 'Apr–Jun', 'Jul–Sep', 'Okt–Des'][q - 1] + ')' }))); tri.value = String(Math.floor(M / 3) + 1);
    const sem = sel([{ v: '1', t: 'Semester 1 (Jan–Jun)' }, { v: '2', t: 'Semester 2 (Jul–Des)' }]); sem.value = M < 6 ? '1' : '2';
    const fB = fld('Bulan', bulan), fT = fld('Triwulan', tri), fS = fld('Semester', sem); const box = el('div'); const title = el('p', { class: 'hint' });
    const range = () => { const y = +tahun.value, j = jenis.value; let m1, m2;
      if (j === 'bulan') m1 = m2 = +bulan.value; else if (j === 'triwulan') { m1 = (+tri.value - 1) * 3 + 1; m2 = m1 + 2; } else if (j === 'semester') { m1 = sem.value === '1' ? 1 : 7; m2 = m1 + 5; } else { m1 = 1; m2 = 12; }
      const p = n => String(n).padStart(2, '0'); return { periode_mulai: y + '-' + p(m1) + '-01', periode_selesai: y + '-' + p(m2) + '-' + p(new Date(y, m2, 0).getDate()) }; };
    const sync = () => { fB.hidden = jenis.value !== 'bulan'; fT.hidden = jenis.value !== 'triwulan'; fS.hidden = jenis.value !== 'semester'; };
    const load = async () => { sync(); const r = range(); title.textContent = 'Periode ' + r.periode_mulai + ' s/d ' + r.periode_selesai; box.replaceChildren(el('p', { class: 'empty' }, 'Memuat...'));
      try { const rows = await api('leaderboard', r);
        box.replaceChildren(rows.length ? el('div', { class: 'list' }, ...rows.map((g, i) => el('div', { class: 'card lb' + (i < 3 ? ' top' + (i + 1) : '') }, el('div', { class: 'rank' }, i + 1), el('div', { class: 'info' }, el('b', {}, g.nama + (g.user_id ? ' (' + g.user_id + ')' : '')), el('span', {}, 'Verifikasi tepat waktu ' + nz(g.verifikasi, 0) + ' · Spot-check ' + nz(g.spotcheck, 0) + ' · Temuan ' + nz(g.temuan, 0))), el('b', { class: 'lb-score' }, nz(g.skor, 0)))))
          : el('p', { class: 'empty' }, 'Belum ada aktivitas Karyawan Organik pada periode ini di lingkup yang dipilih (atau belum ada akun Karyawan Organik aktif — dibuat oleh Super Admin di Admin › User).')); }
      catch (e) { box.replaceChildren(el('p', { class: 'empty err' }, e.message)); } };
    [jenis, tahun, bulan, tri, sem].forEach(s => s.addEventListener('change', load));
    c.replaceChildren(el('div', { class: 'greeting' }, el('h2', {}, 'Leaderboard Karyawan Organik'), el('p', {}, 'Poin = verifikasi checklist manual tepat waktu + spot-check + temuan valid · internal PKG, tidak memengaruhi HQI vendor')),
      el('div', { class: 'card form' }, el('div', { class: 'form-row' }, fld('Jenis periode', jenis), fld('Tahun', tahun)), el('div', { class: 'form-row' }, fB, fT, fS), title), box); load();
  };

  // ================= PANDUAN HQI (semua role; nilai bobot/SLA/ambang diambil dari konfigurasi aktif)
  VIEWS.panduan = async (c) => {
    const cfg = S.boot.config; const pct = k => Number(cfg[k]) + '%';
    const sec = (title, ...kids) => el('div', { class: 'card form guide' }, el('h3', {}, title), ...kids);
    const p = (...t) => el('p', { class: 'guide-p' }, ...t);
    const ul = (...items) => el('ul', { class: 'guide-ul' }, ...items.map(i => el('li', {}, i)));
    const tbl = (head, rows) => el('div', { class: 'tbl-wrap' }, el('table', { class: 'tbl' }, el('tr', {}, ...head.map(h => el('th', {}, h))), ...rows.map(r => el('tr', {}, ...r.map(v => el('td', {}, v))))));
    // ---- contoh perhitungan (angka ilustrasi; target/bobot/toleransi mengikuti konfigurasi aktif)
    const contoh = (...t) => el('div', { class: 'contoh' }, el('b', {}, 'Contoh perhitungan'), el('br'), ...t);
    const kode = t => el('code', {}, t); const r1 = x => Math.round(x * 10) / 10; const w = k => Number(cfg[k]) / 100; const buf = Number(cfg.buffer_menit) || 0;
    const exTemuan = 100 - (1 + 3 + 5 * 1.5);
    const tT = slaOf('Tinggi'), tM = slaOf('Mendesak'), tR = slaOf('Rendah');
    const exSLA = r1(6 / 16 * 100);
    const exSpot = r1((50 + 87.5) / 2);
    const exCk = 75, exKep = 80;
    const exHQI = r1(exTemuan * w('bobot_temuan') + exSLA * w('bobot_sla') + exSpot * w('bobot_spotcheck') + exCk * w('bobot_checklist') + exKep * w('bobot_kepatuhan'));
    const grade = h => h >= 90 ? 'Sangat Baik' : h >= 75 ? 'Baik' : h >= 60 ? 'Perlu Perbaikan' : 'Kritis';
    const noTemuan = Number(cfg.bobot_temuan) === 0, kuotaSpot = Number(cfg.spotcheck_min_per_zona) || 0;   // v1.8: Temuan = indikator; kuota spot-check
    c.replaceChildren(
      el('div', { class: 'section-head' }, el('h2', {}, 'Panduan HQI'), el('a', { class: 'link', onclick: () => go('home') }, 'Kembali')),
      p('HQI (Housekeeping Quality Index) adalah skor 0–100 yang mengukur kualitas housekeeping setiap rekanan per lingkup/pabrik dalam satu periode (bulan berjalan). Skor dihitung otomatis setiap hari dari lima komponen di bawah ini dan menjadi dasar evaluasi kontrak yang objektif dan bisa dipertanggungjawabkan ke kedua pihak.'),
      sec('1. Rumus & bobot komponen',
        tbl(['Komponen', 'Bobot', 'Sumber data'], [['Skor Temuan', pct('bobot_temuan') + (noTemuan ? ' (indikator)' : ''), noTemuan ? 'Jumlah temuan tetap tampil, tidak memotong HQI (sejak 18 Sep 2026)' : 'Temuan insidental (siapa saja)'], ['Skor SLA', pct('bobot_sla'), 'Kecepatan vendor menutup temuan'], ['Skor Spot-Check', pct('bobot_spotcheck'), 'Penilaian independen (Karyawan Organik / Admin)'], ['Skor Checklist Harian', pct('bobot_checklist'), 'Self-report Mandor yang terverifikasi'], ['Skor Kepatuhan Checklist', pct('bobot_kepatuhan'), 'Disiplin mengisi checklist tiap hari kerja']]),
        p('HQI = Σ (skor komponen × bobot). Bobot berlaku global untuk semua lingkup, diatur Admin, total selalu 100%, dan perubahan hanya berlaku ke depan (skor periode lalu tidak berubah). Komponen self-report sengaja berbobot kecil agar skor tidak bisa "digemukkan" sepihak oleh rekanan.'),
        tbl(['HQI', 'Predikat'], [['≥ 90', 'Sangat Baik'], ['75 – 89,9', 'Baik'], ['60 – 74,9', 'Perlu Perbaikan'], ['< 60', 'Kritis']])),
      sec('2. Skor Temuan' + (noTemuan ? ' (indikator, tidak memotong HQI)' : ''),
        noTemuan ? p(el('b', {}, 'Sejak 18 Sep 2026 komponen Temuan berbobot 0%. '), 'Alasannya: jumlah temuan sangat dipengaruhi luas area, proses pabrik, dan jumlah pelapor, sehingga memotong skor rekanan berdasarkan jumlah temuan dinilai tidak adil. Jumlah, kategori, dan lokasi temuan tetap tampil di Beranda, Heatmap, dan Laporan sebagai indikator bagi manajemen; yang dinilai dari temuan adalah kecepatan penanganannya lewat Skor SLA (bagian 3). Rumus di bawah hanya berlaku bila Admin kembali memberi bobot > 0.') : null,
        p('Mulai dari 100, dikurangi bobot prioritas setiap temuan yang dibuat pada periode itu:'),
        tbl(['Prioritas', 'Pengurang', 'Target penyelesaian'], [['Rendah', '1 poin', fmtMin(slaOf('Rendah'))], ['Sedang', '3 poin', fmtMin(slaOf('Sedang'))], ['Tinggi', '5 poin', fmtMin(slaOf('Tinggi'))], ['Mendesak', '10 poin', fmtMin(slaOf('Mendesak'))]]),
        ul('Temuan berulang (kategori & zona sama dalam 30 hari): pengurang ×1,5 untuk pengulangan pertama, ×2 untuk pengulangan berikutnya.', 'Kategori Debu/Residu Proses tidak dikenai pengali berulang (kemunculan berulang dianggap wajar di pabrik kimia).', 'Temuan dalam jendela aktivitas operasional terjadwal (mis. drain) tidak mengurangi skor temuan; hanya dinilai lewat SLA khusus jadwal tersebut.', 'Skor tidak bisa di bawah 0.'),
        contoh('Vendor X bulan ini punya 3 temuan: (a) Sampah, Rendah → 1 poin; (b) Ceceran, Sedang → 3 poin; (c) Genangan, Tinggi, dan ini pengulangan pertama di zona & kategori yang sama dalam 30 hari → 5 × 1,5 = 7,5 poin.', el('br'), 'Total pengurang = 1 + 3 + 7,5 = 11,5 → ', kode('Skor Temuan = 100 − 11,5 = ' + exTemuan))),
      sec('3. Skor SLA (kecepatan penyelesaian)',
        p('Setiap temuan punya target waktu sesuai prioritas (tabel di atas) ditambah toleransi ' + fmtMin(cfg.buffer_menit) + '. Waktu dihitung dari status Open sampai Close, hanya pada jam kerja efektif pabrik (bukan jam kalender), Senin–Jumat — waktu di luar shift serta Sabtu dan Minggu tidak dihitung terlambat.'),
        p('Skor SLA = (Σ bobot prioritas temuan yang selesai tepat waktu ÷ Σ bobot prioritas semua temuan yang dinilai) × 100. Temuan yang masih Open tetapi sudah melewati target dihitung terlambat.'),
        ul('Tambahan waktu: bila pekerjaan tidak bisa selesai tepat waktu, Mandor mengajukan SEBELUM batas SLA lewat dengan alasan wajib; setelah disetujui pelapor (atau Karyawan Organik lingkup bila pelapornya rekanan) / Admin lingkup, target memakai estimasi yang disetujui. Jumlah tambahan waktu tercatat di laporan.', 'Temuan Prioritas Tinggi/Mendesak yang belum ditangani lebih dari 2× target tampil di kartu Beranda Admin & Manajemen (peringatan dini, bukan pengurang skor).', 'Time to Acknowledge (Open → In Progress) hanya metrik dashboard, tidak masuk HQI.'),
        contoh('Tiga temuan yang sama: (a) Rendah, bobot 1, selesai dalam ' + fmtMin(Math.round(tR / 2)) + ' jam kerja → target ' + fmtMin(tR) + ' + ' + fmtMin(buf) + ' → tepat; (b) Sedang, bobot 3, selesai ' + fmtMin(slaOf('Sedang') + buf + 30) + ' → lewat target ' + fmtMin(slaOf('Sedang')) + ' + ' + fmtMin(buf) + ' → terlambat; (c) Tinggi, bobot 5, selesai ' + fmtMin(Math.max(1, tT - 10)) + ' → tepat. (Bila ada temuan Mendesak, targetnya ' + fmtMin(tM) + ', bobot 10.)', el('br'),
          'Bobot tepat waktu = 1 + 5 = 6; bobot seluruh temuan = 1 + 3 + 5 = 9 → ', kode('Skor SLA = 6 ÷ 9 × 100 = ' + r1(6 / 9 * 100)), '. Pada ilustrasi HQI di bawah dipakai kasus lain dengan Skor SLA ' + exSLA + ' (6 dari 16 bobot tepat waktu).')),
      sec('4. Skor Spot-Check',
        p('Karyawan Organik, Admin lingkup, dan Super Admin menilai zona secara insidental (tidak terjadwal) dengan item Ya = 100, Cukup = 50, Tidak = 0. Skor satu spot-check = rata-rata item yang berlaku; skor komponen = rata-rata seluruh spot-check vendor itu dalam periode.'),
        ul('Jawaban Tidak pada spot-check dan verifikasi checklist wajib menyebut area yang perlu dibersihkan + satu foto, dan otomatis menjadi temuan untuk rekanan zona itu (jawaban Cukup hanya bila dicentang "Jadikan temuan"). Bila temuan dari item yang sama di zona itu masih terbuka, tidak dibuat temuan baru.'),
        ul('Item bertanda "N/A saat kondisi khusus" otomatis N/A saat zona sedang drain atau perbaikan equipment, dan tidak ikut dirata-rata.', 'Pertanyaan bisa berbeda per zona (diatur Admin di Survey Builder).',
          kuotaSpot ? 'Kuota minimum (v1.8): ' + kuotaSpot + ' spot-check per zona per bulan (diprorata panjang periode). Bila jumlah spot-check kurang dari kuota, kekurangannya diisi dengan skor Checklist Harian terverifikasi — bukan otomatis 100 — supaya HQI tidak menggelembung hanya karena jarang dikunjungi. Tanpa spot-check maupun checklist terverifikasi → 100.' : 'Bila tidak ada spot-check sama sekali dalam periode, skor dianggap 100 (vendor tidak dirugikan oleh ketiadaan kunjungan).'),
        contoh('Spot-check 1 di Zona A (sedang jendela drain), 4 item: Ya, Cukup, Tidak, dan item genangan = N/A → (100 + 50 + 0) ÷ 3 = 50.', el('br'), 'Spot-check 2 di Zona B, 4 item: Ya, Ya, Cukup, Ya → (100 + 100 + 50 + 100) ÷ 4 = 87,5.', el('br'), kode('Skor Spot-Check = (50 + 87,5) ÷ 2 = ' + exSpot),
          kuotaSpot ? [el('br'), 'Contoh kuota: vendor punya 2 zona, kuota ' + kuotaSpot + ' × 2 = ' + (kuotaSpot * 2) + ' spot-check sebulan, tetapi hanya 2 yang dilakukan (rata-rata ' + exSpot + ') dan checklist terverifikasinya ' + exCk + ' → ', kode('Skor Spot-Check = (' + exSpot + ' × 2 + ' + exCk + ' × ' + (kuotaSpot * 2 - 2) + ') ÷ ' + (kuotaSpot * 2) + ' = ' + r1((exSpot * 2 + exCk * (kuotaSpot * 2 - 2)) / (kuotaSpot * 2)))] : null)),
      sec('5. Skor Checklist Harian & Kepatuhan',
        p('Mandor mengisi checklist tiap zona sesuai frekuensi zona yang diatur Admin (setiap hari kerja, sekali tiap 2 atau 3 hari kerja, atau sekali per minggu — tepat 1 checklist per periode) dengan foto langsung dari kamera (ber-watermark tanggal/jam). Skor item sama seperti spot-check. Hanya entri berstatus Terverifikasi atau Terverifikasi Otomatis yang dihitung; entri Ditolak dikeluarkan. Sejak v1.14 verifikasi berupa cross-checklist: Karyawan Organik menjawab ulang item yang sama, dan skor yang dipakai HQI adalah skor Organik (skor Mandor tetap tersimpan); bila tidak diverifikasi sampai batas waktu, skor Mandor yang dipakai. Vendor yang tidak mengisi checklist sama sekali pada periode mendapat skor 0.'),
        ul('Karyawan Organik wajib memverifikasi pada hari yang sama sebelum batas jam pabrik; lewat batas → otomatis Terverifikasi (vendor tidak dirugikan, kejadian tercatat di log dan tidak memberi poin leaderboard).', 'Validasi silang: bila selisih skor checklist dan spot-check di zona & hari yang sama melebihi ' + cfg.ambang_batas_anomali + ' poin, entri ditandai anomali; jika Admin menyatakan penyimpangan nyata, entri dikeluarkan dari skor.', 'Kepatuhan per zona: zona 1×/hari = hari checklist terisi ÷ hari kerja (Senin–Jumat); zona 2/3 hari & mingguan = periode (blok) yang terisi ÷ jumlah blok pada rentang. Dirata-rata antar zona vendor.'),
        contoh('Mandor mengisi 4 checklist di Zona A bulan ini dengan skor 100, 75, 50, dan 90. Entri 90 ditolak Karyawan Organik (dikeluarkan); entri 50 selisihnya dengan spot-check hari itu 45 poin (> ' + cfg.ambang_batas_anomali + ') dan Admin menyatakan penyimpangan nyata (dikeluarkan). Sisa: 100 dan 75 → ', kode('Skor Checklist = (100 + 75) ÷ 2 = 87,5'), '. Pada ilustrasi HQI di bawah dipakai Skor Checklist ' + exCk + '.', el('br'),
          'Kepatuhan: bulan ini 20 hari kerja (Senin–Jumat). Zona A (1×/hari) terisi 16 hari → 80; Zona B (sekali per minggu) terisi 4 dari 4 minggu → 100 → ', kode('Skor Kepatuhan = (80 + 100) ÷ 2 = 90'), '. Ilustrasi HQI di bawah memakai ' + exKep + '.')),
      sec('5b. Contoh HQI akhir (bobot yang berlaku sekarang)',
        tbl(['Komponen', 'Skor', 'Bobot', 'Kontribusi'], [noTemuan ? ['Temuan', 'indikator', '0%', '0'] : ['Temuan', String(exTemuan), pct('bobot_temuan'), String(r1(exTemuan * w('bobot_temuan')))], ['SLA', String(exSLA), pct('bobot_sla'), String(r1(exSLA * w('bobot_sla')))], ['Spot-Check', String(exSpot), pct('bobot_spotcheck'), String(r1(exSpot * w('bobot_spotcheck')))], ['Checklist Harian', String(exCk), pct('bobot_checklist'), String(r1(exCk * w('bobot_checklist')))], ['Kepatuhan Checklist', String(exKep), pct('bobot_kepatuhan'), String(r1(exKep * w('bobot_kepatuhan')))]]),
        contoh(kode('HQI = ' + (noTemuan ? '' : r1(exTemuan * w('bobot_temuan')) + ' + ') + r1(exSLA * w('bobot_sla')) + ' + ' + r1(exSpot * w('bobot_spotcheck')) + ' + ' + r1(exCk * w('bobot_checklist')) + ' + ' + r1(exKep * w('bobot_kepatuhan')) + ' = ' + exHQI), ' → predikat ', el('b', {}, grade(exHQI)), '. Perhatikan komponen mana yang paling menekan skor: di contoh ini SLA (penyelesaian terlambat) dan spot-check.')),
      sec('6. Alur temuan', tbl(['Status', 'Siapa', 'Yang dilakukan'], [['Open', 'Siapa saja', 'Lapor: foto kamera, pin lokasi (zona terdeteksi otomatis), kategori, prioritas'], ['In Progress', 'Mandor', 'Menunjuk personil pelaksana; opsional mengajukan Pekerjaan Besar'], ['Menunggu Verifikasi', 'Personil / Mandor', 'Mengunggah foto after (sudut sama dengan before); jam SLA berhenti di sini'], ['Close', 'Pelapor / Organik lingkup (bila pelapor rekanan) / Admin lingkup', 'Membandingkan before–after lalu Setujui (Close) atau Tolak dengan alasan (kembali In Progress, tercatat sebagai indikator)']])),
      sec('7. Peran pengguna', ul('Personil Rekanan: melapor & menutup temuan.', 'Mandor/Koordinator: checklist harian, tindak lanjut temuan.', 'Karyawan Organik: spot-check, verifikasi checklist, temuan; ikut leaderboard.', 'Admin (per lingkup): zona, pertanyaan, vendor, user, jadwal, bobot, review anomali; juga bisa spot-check.', 'Manajemen: dashboard & laporan seluruh lingkup.', 'Super Admin: seluruh lingkup, kelola lingkup dan user semua role; juga bisa spot-check.')),
      el('p', { class: 'hint', style: 'text-align:center' }, 'Nilai bobot, target SLA, toleransi, dan ambang anomali di halaman ini diambil dari konfigurasi yang sedang berlaku (Admin › Bobot).'));
  };

  // ================= LAPORAN
  // ================= LAPORAN (v1.11: ekspor Excel & cetak/PDF, opsional dengan foto before/after)
  function loadExcelJS() { if (window.ExcelJS) return Promise.resolve(); return new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js'; s.onload = res; s.onerror = () => rej(new Error('Gagal memuat pustaka Excel (exceljs dari cdnjs) — periksa koneksi')); document.head.append(s); }); }
  /** Ambil foto (data URL) untuk banyak file id sekaligus — 8 per panggilan, memakai cache S.cache. */
  async function fetchPhotos(ids, onProgress) { const need = Array.from(new Set(ids.filter(Boolean))).filter(id => !S.cache[id]); let done = 0;
    const parts = []; for (let i = 0; i < need.length; i += 8) parts.push(need.slice(i, i + 8));
    let next = 0; const worker = async () => { while (next < parts.length) { const part = parts[next++]; const r = await api('photos', { file_ids: part }); part.forEach(id => { if (r[id]) S.cache[id] = r[id]; }); done += part.length; onProgress && onProgress(done, need.length); } };
    await Promise.all([worker(), worker(), worker()]); }   // v1.16: 3 panggilan paralel (sebelumnya berurutan)
  const EXPORT_PHOTO_MAX = 60;   // temuan berfoto per ekspor (120 foto) agar berkas tidak raksasa
  const r1 = x => Math.round(x * 10) / 10;
  const CK_STATUS = { Menunggu: 'Menunggu', Terverifikasi: 'Terverifikasi', TerverifikasiOtomatis: 'Terverifikasi otomatis', Ditolak: 'Ditolak' };
  /**
   * v1.17: tabel tambahan Laporan — spot-check, checklist harian, kepatuhan checklist per zona. Satu sumber untuk layar, PDF, dan Excel.
   * Kepatuhan diambil dari hqi[].rincian.kepatuhan (v1.20: per frekuensi zona — hari terisi ÷ hari kerja, atau blok terisi ÷ jumlah blok).
   */
  function reportTables(r) {
    const sp = r.spotcheck || [], ck = r.checklist || [], lim = r.batas_baris || 500;
    const avgOf = a => a.length ? r1(a.reduce((x, y) => x + y, 0) / a.length) : null;
    const spAvg = avgOf(sp.map(x => Number(x.skor) || 0)), ckDone = ck.filter(x => x.skor_final != null), ckAvg = avgOf(ckDone.map(x => Number(x.skor_final) || 0));
    const kp = []; (r.hqi || []).forEach(h => { const k = (h.rincian || {}).kepatuhan || {};
      (k.zona || []).forEach(z => kp.push([h.vendor, z.nama, kpTeks(z), z.pct + '%']));
      kp.push([h.vendor, 'Skor kepatuhan (rata-rata zona)', '', nz(h.skor_kepatuhan) + '%']); });
    const more = a => a.length >= lim ? ' · menampilkan ' + lim + ' baris pertama' : '';
    return [
      { key: 'spot', title: 'Spot-check', empty: 'Tidak ada spot-check pada periode ini',
        hint: sp.length + ' spot-check' + (spAvg != null ? ' · rata-rata skor ' + spAvg : '') + more(sp),
        heads: ['Tanggal', 'Zona', 'Vendor', 'Oleh', 'Skor', 'Kondisi khusus'],
        rows: sp.map(x => [fmtDT(x.timestamp), zonaName(x.zona_id), x.vendor, x.oleh, nz(x.skor), kondisiTeks(x).replace(/^ · saat /, '')]) },
      { key: 'checklist', title: 'Checklist harian', empty: 'Tidak ada checklist harian pada periode ini',
        hint: ck.length + ' checklist · ' + ckDone.length + ' terverifikasi' + (ckAvg != null ? ' · rata-rata skor verifikasi ' + ckAvg : '') + more(ck),
        heads: ['Tanggal', 'Zona', 'Vendor', 'Mandor', 'Skor Mandor', 'Skor verifikasi', 'Status', 'Verifikator', 'Anomali'],
        rows: ck.map(x => [fmtDT(x.timestamp), zonaName(x.zona_id), x.vendor, x.mandor, nz(x.skor_mandor), x.skor_final == null ? '–' : x.skor_final, CK_STATUS[x.status] || x.status || '–', x.verifikator || '–', x.anomali ? 'Ya' + (x.review_anomali ? ' · ' + x.review_anomali : '') : '']) },
      { key: 'kepatuhan', title: 'Kepatuhan checklist', empty: 'Belum ada zona vendor pada lingkup ini',
        hint: 'Hari checklist terisi (tidak termasuk yang ditolak) dibanding hari kerja Senin–Jumat, per zona; skor = rata-rata zona',
        heads: ['Vendor', 'Zona', 'Hari terisi', 'Kepatuhan'], rows: kp },
    ];
  }
  /**
   * v1.17.1 (keputusan Rudy 19 Okt 2026): Laporan di layar & PDF cukup RINGKASAN per vendor (satu baris per vendor) agar dokumen tidak berlembar-lembar;
   * daftar baris spot-check/checklist lengkap hanya di Excel (reportTables). Angka dari computeHQI().rincian (sama dengan dasar skor HQI).
   */
  function reportSummary(r) {
    return { title: 'Ringkasan spot-check, checklist harian & kepatuhan', heads: ['Vendor', 'Spot-check', 'Checklist harian', 'Kepatuhan checklist'],
      rows: (r.hqi || []).map(h => { const d = h.rincian || {}, sp = d.spotcheck || {}, ck = d.checklist || {}, kp = d.kepatuhan || {}; const zs = (kp.zona || []).slice().sort((a, b) => a.pct - b.pct);
        return [h.vendor,
          nz(sp.n, 0) + (sp.kuota ? ' dari kuota ' + sp.kuota : '') + ' spot-check' + (sp.rata != null ? ' · rata-rata ' + sp.rata : '') + ' · skor ' + nz(h.skor_spotcheck),
          nz(ck.n, 0) + ' masuk · ' + nz(ck.valid, 0) + ' dihitung' + (ck.menunggu ? ' · ' + ck.menunggu + ' menunggu' : '') + (ck.ditolak ? ' · ' + ck.ditolak + ' ditolak' : '') + ' · skor ' + nz(h.skor_checklist),
          nz(h.skor_kepatuhan) + '% · ' + nz(kp.hari_kerja, 0) + ' hari kerja · ' + zs.length + ' zona' + (zs.length > 1 ? ' · terendah ' + zs[0].nama + ' ' + zs[0].pct + '%' : '')]; }) };
  }
  function reportTitle(meta) { return 'Laporan HQI — ' + meta.pabrik + (meta.vendor ? ' · ' + meta.vendor : ''); }
  async function exportReportExcel(r, meta, withPhotos, status) { await loadExcelJS(); const F = 'Arial'; const wb = new ExcelJS.Workbook(); wb.creator = 'Horizon HQI';
    const head = ws => { const row = ws.getRow(ws.rowCount); row.eachCell(cell => { cell.font = { name: F, bold: true, color: { argb: 'FFFFFFFF' } }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3A5F' } }; cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }; }); };
    const w1 = wb.addWorksheet('HQI'); w1.columns = [{ width: 34 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 18 }, { width: 46 }];
    w1.addRow([reportTitle(meta)]); w1.getRow(1).font = { name: F, bold: true, size: 14 }; w1.addRow(['Periode ' + r.periode.mulai + ' s/d ' + r.periode.selesai + ' · dibuat ' + fmtDT(new Date().toISOString()) + ' oleh ' + S.user.nama]); w1.addRow([]);
    w1.addRow(['Vendor', 'Temuan', 'SLA', 'Spot-Check', 'Checklist', 'Kepatuhan', 'HQI', 'Predikat', 'Catatan']); head(w1);
    r.hqi.forEach(x => { const row = w1.addRow([x.vendor, x.skor_temuan, x.skor_sla, x.skor_spotcheck, x.skor_checklist, x.skor_kepatuhan, x.hqi_final, x.grade, x.catatan || '']); row.font = { name: F }; });
    w1.addRow([]); const cfg = S.boot.config; w1.addRow(['Bobot: Temuan ' + cfg.bobot_temuan + '% · SLA ' + cfg.bobot_sla + '% · Spot-Check ' + cfg.bobot_spotcheck + '% · Checklist ' + cfg.bobot_checklist + '% · Kepatuhan ' + cfg.bobot_kepatuhan + '%']).font = { name: F, italic: true };
    { const sm = reportSummary(r); w1.addRow([]); w1.addRow([sm.title]).font = { name: F, bold: true }; w1.addRow(sm.heads); head(w1); sm.rows.forEach(x => { const row = w1.addRow(x); row.font = { name: F }; row.alignment = { wrapText: true, vertical: 'top' }; }); }
    w1.addRow([]); w1.addRow(['Operasi Pabrik III A · Petrokimia Gresik']).font = { name: F, italic: true, color: { argb: 'FF666666' } };
    // v1.17: lembar spot-check, checklist harian, kepatuhan
    reportTables(r).forEach(t => { const ws = wb.addWorksheet(t.title.charAt(0).toUpperCase() + t.title.slice(1)); ws.columns = t.heads.map(h => ({ width: Math.max(12, Math.min(34, h.length + 10)) }));
      ws.addRow([t.hint]).font = { name: F, italic: true }; ws.addRow(t.heads); head(ws);
      t.rows.forEach(x => { ws.addRow(x).font = { name: F }; }); if (!t.rows.length) ws.addRow([t.empty]).font = { name: F, italic: true }; });
    const w2 = wb.addWorksheet('Temuan Selesai'); w2.columns = [{ width: 6 }, { width: 22 }, { width: 28 }, { width: 12 }, { width: 18 }, { width: 18 }, { width: 14 }, { width: 24 }, { width: 24 }];
    w2.addRow(['No', 'Kategori', 'Zona', 'Prioritas', 'Open', 'Close', 'TTR (menit kerja)', 'Foto before', 'Foto after']); head(w2);
    const rows = r.before_after; const nFoto = withPhotos ? Math.min(rows.length, EXPORT_PHOTO_MAX) : 0;
    if (nFoto) await fetchPhotos(rows.slice(0, nFoto).reduce((acc, f) => acc.concat([f.foto_open, f.foto_after]), []), (d, n) => status('Mengambil foto ' + d + ' dari ' + n + '…'));
    rows.forEach((f, i) => { const row = w2.addRow([i + 1, f.kategori, zonaName(f.zona_id), f.prioritas, fmtDT(f.timestamp_open), fmtDT(f.timestamp_close), f.ttr_menit, '', '']); row.font = { name: F }; row.alignment = { vertical: 'middle', wrapText: true };
      if (i < nFoto) { row.height = 96; [[f.foto_open, 7], [f.foto_after, 8]].forEach(([id, col]) => { const du = S.cache[id]; if (!du) return; const m = du.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/); if (!m || m[1] === 'webp') return;
        const img = wb.addImage({ base64: m[2], extension: m[1] === 'png' ? 'png' : 'jpeg' }); w2.addImage(img, { tl: { col: col + 0.05, row: row.number - 1 + 0.05 }, ext: { width: 160, height: 120 } }); }); } });
    if (withPhotos && rows.length > nFoto) w2.addRow(['', 'Catatan: foto hanya disertakan untuk ' + nFoto + ' temuan pertama.']).font = { name: F, italic: true };
    status('Menyusun berkas…'); const buf = await wb.xlsx.writeBuffer(); const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const slug = meta.vendor ? '_' + String(meta.vendor).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') : '';
    const link = el('a', { href: url, download: 'Laporan_HQI_' + meta.pabrikId + slug + '_' + r.periode.mulai + '_' + r.periode.selesai + '.xlsx' }); document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000); }
  /** v1.17: logo versi mode terang (untuk kertas putih) diambil dari CSS Logo.html — --logo-utama (Horizon) & --logo-op (Operasi 3A). */
  function printLogos() { const css = Array.from(document.querySelectorAll('style')).map(s => s.textContent).join('\n');
    const pick = name => { const m = css.match(new RegExp('html\\[data-theme="light"\\]\\{[^}]*--' + name + ':url\\("([^"]+)"\\)')); return m ? m[1] : ''; };
    return { horizon: pick('logo-utama'), op: pick('logo-op') }; }
  const GRADE_COLOR = { 'Sangat Baik': '#059669', 'Baik': '#2563EB', 'Perlu Perbaikan': '#D97706', 'Kritis': '#DC2626' };
  const tglID = iso => { const d = new Date(String(iso).slice(0, 10) + 'T00:00:00'); return isNaN(d) ? String(iso || '-') : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }); };
  const BA_FOTO_MAX = 16, BA_FOTO_PER_HAL = 8;   // v1.17.4: lampiran BA maks. 3 halaman = halaman depan + 2 halaman foto (8 temuan per halaman)
  /**
   * v1.17.3: kartu skor HQI besar untuk cetak/PDF (permintaan Rudy: skor HQI harus menonjol) — angka HQI besar di blok berwarna predikat
   * (Sangat Baik hijau, Baik biru, Perlu Perbaikan oranye, Kritis merah) + batang skor tiap komponen dengan bobotnya.
   */
  function hqiHeroHtml(x, cfg) { const c = GRADE_COLOR[x.grade] || '#1F3A5F';
    return '<div class="hcard" style="--g:' + c + '"><div class="hleft"><div class="hlabel">Skor HQI</div><div class="hnum">' + esc(nz(x.hqi_final)) + '</div><div class="hgrade">' + esc(nz(x.grade, '-')) + '</div></div>'
      + '<div class="hright"><div class="hvendor">' + esc(x.vendor) + '</div>'
      + hqiBasis(x).map(b => '<div class="hrow"><span class="hn">' + esc(b.nama) + ' <i>' + esc(nz(cfg[b.bobot], 0)) + '%</i></span><span class="hbar"><b style="width:' + Math.max(0, Math.min(100, Number(nz(b.skor, 0)) || 0)) + '%"></b></span><span class="hv">' + esc(nz(b.skor)) + '</span></div>').join('')
      + (x.catatan ? '<div class="hnote">' + esc(x.catatan) + '</div>' : '') + '</div></div>'; }
  /** v1.17.4: ringkasan satu baris per komponen HQI untuk halaman depan lampiran BA (jumlah temuan, SLA, spot-check, checklist, kepatuhan). */
  function baRingkasRows(x, nClose) { const d = x.rincian || {}, t = d.temuan || {}, sl = d.sla || {}, sp = d.spotcheck || {}, ck = d.checklist || {}, kp = d.kepatuhan || {};
    const pr = (t.per_prioritas || []).filter(p => p.n).map(p => p.prioritas + ' ' + p.n).join(', '); const zs = kp.zona || [];
    const teks = {
      temuan: nz(t.n, 0) + ' temuan' + (pr ? ' (' + pr + ')' : '') + ' · ' + nClose + ' selesai (Close)' + (t.ditolak_close ? ' · ' + t.ditolak_close + '× penutupan ditolak' : ''),
      sla: nz(sl.n_dinilai, 0) ? nz(sl.tepat, 0) + ' tepat waktu · ' + nz(sl.telat, 0) + ' terlambat' + (sl.open_telat ? ' · ' + sl.open_telat + ' open lewat target' : '') + (sl.tambah_waktu ? ' · ' + sl.tambah_waktu + '× tambahan waktu' : '') : 'Belum ada temuan yang dinilai',
      spotcheck: nz(sp.n, 0) + (sp.kuota ? ' dari kuota ' + sp.kuota : '') + ' spot-check' + (sp.rata != null ? ' · rata-rata ' + sp.rata : '') + (sp.dari_checklist ? ' · ' + sp.dari_checklist + ' diisi skor checklist' : ''),
      checklist: nz(ck.n, 0) + ' masuk · ' + nz(ck.valid, 0) + ' dihitung' + (ck.menunggu ? ' · ' + ck.menunggu + ' menunggu' : '') + (ck.ditolak ? ' · ' + ck.ditolak + ' ditolak' : ''),
      kepatuhan: nz(kp.hari_kerja, 0) + ' hari kerja · ' + (zs.length ? zs.slice(0, 3).map(z => z.nama + ' ' + kpTeks(z) + ' (' + z.pct + '%)').join(', ') + (zs.length > 3 ? ' · +' + (zs.length - 3) + ' zona' : '') : 'belum ada zona'),
    };
    return hqiBasis(x).map(b => [b.nama, b.bobot, teks[b.key] || '', b.skor, hqiContrib(b, S.boot.config)]); }   // v1.17.5: + kontribusi ke HQI
  /**
   * v1.17.3: form Lampiran Berita Acara Pekerjaan — Nomor OK & nama pekerjaan (teks bebas, boleh kosong → titik-titik untuk diisi tangan),
   * diingat per vendor di perangkat (localStorage, kemudahan saja). Hanya untuk laporan satu vendor (kolom tanda tangan Rekanan butuh satu nama).
   * v1.17.4: foto before/after WAJIB (selalu disertakan, tidak mengikuti centang foto) dan dokumen maks. 3 halaman.
   */
  function openBaForm(r, meta, withPhotos, status) {
    if ((r.hqi || []).length !== 1) return toast('Lampiran berita acara dibuat per rekanan — pilih satu vendor di filter lalu tekan Tampilkan', true);
    const h = r.hqi[0]; const key = 'hz_ba:' + (h.vendor_id || meta.vendor); let last = {}; try { last = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch (e) { }
    const ok = el('input', { type: 'text', placeholder: 'mis. 1234/OK/PG/2026', value: last.nomor_ok || '' }); const pk = el('textarea', { rows: 2, placeholder: 'mis. Jasa Kebersihan & Housekeeping Area Pabrik ZA II' }); pk.value = last.pekerjaan || '';
    const btn = el('button', { class: 'btn primary' }, 'Cetak / Simpan PDF lampiran'); const n = (r.before_after || []).length;
    btn.addEventListener('click', () => { const ba = { nomor_ok: ok.value.trim(), pekerjaan: pk.value.trim() }; try { localStorage.setItem(key, JSON.stringify(ba)); } catch (e) { }
      closeModal(); status('Menyiapkan…'); printReport(r, meta, true, status, ba).then(() => status('Selesai.'), err => { status(''); toast(err.message, true); }); });
    modal(el('div', { class: 'form' }, el('div', { class: 'section-head' }, el('h3', {}, 'Lampiran Berita Acara Pekerjaan'), el('a', { class: 'link', onclick: closeModal }, 'Tutup')),
      el('p', { class: 'hint' }, 'Maks. 3 halaman: halaman 1 = Nomor OK, nama pekerjaan, periode, skor HQI, ringkasan komponen, dan tanda tangan Rekanan & PT Petrokimia Gresik; halaman 2–3 = foto before/after temuan selesai. Kolom yang dikosongkan dicetak sebagai titik-titik untuk diisi tangan.'),
      fld('Nomor OK', ok), fld('Nama pekerjaan', pk),
      el('p', { class: 'hint' }, 'Rekanan: ' + h.vendor + ' · Periode ' + tglID(r.periode.mulai) + ' s/d ' + tglID(r.periode.selesai) + ' · foto before/after: ' + (n ? Math.min(n, BA_FOTO_MAX) + ' temuan' + (n > BA_FOTO_MAX ? ' (dari ' + n + ' selesai; prioritas tertinggi & terbaru)' : '') : 'tidak ada temuan selesai')), btn));
    setTimeout(() => (ok.value ? pk : ok).focus(), 50);
  }
  /**
   * Cetak / simpan PDF: halaman laporan dibuka di jendela baru lalu dialog cetak browser (pilih "Simpan sebagai PDF").
   * v1.17: kepala = logo Horizon (kiri) & Operasi 3A (kanan); kaki = "Operasi Pabrik III A" (kiri) & "Petrokimia Gresik" (kanan), berulang tiap halaman.
   * v1.17.3: skor HQI ditonjolkan (hqiHeroHtml); ba = {nomor_ok, pekerjaan} → Lampiran Berita Acara.
   * v1.17.4: @page margin 0 → teks bawaan browser (tanggal/judul di atas, "about:blank" di bawah) tidak tercetak; margin diganti padding sendiri,
   * kaki tengah = waktu unduh. Lampiran BA = halaman depan (skor + ringkasan komponen + tanda tangan) + maks. 2 halaman foto before/after (wajib).
   */
  async function printReport(r, meta, withPhotos, status, ba) { const win = window.open('', '_blank'); if (!win) throw new Error('Jendela baru diblokir browser — izinkan popup untuk situs ini');
    win.document.write('<p style="font-family:Arial">Menyiapkan laporan…</p>'); const rows = r.before_after || [];
    const PR = { Mendesak: 4, Tinggi: 3, Sedang: 2, Rendah: 1 };
    const baRows = ba ? rows.slice().sort((a, b) => (PR[b.prioritas] || 0) - (PR[a.prioritas] || 0) || String(b.timestamp_close).localeCompare(String(a.timestamp_close))).slice(0, BA_FOTO_MAX) : [];
    const nFoto = ba ? 0 : withPhotos ? Math.min(rows.length, EXPORT_PHOTO_MAX) : 0;
    const fotoRows = ba ? baRows : rows.slice(0, nFoto);
    try { if (fotoRows.length) await fetchPhotos(fotoRows.reduce((acc, f) => acc.concat([f.foto_open, f.foto_after]), []), (d, n) => status('Mengambil foto ' + d + ' dari ' + n + '…')); } catch (e) { win.close(); throw e; }
    const cfg = S.boot.config; const img = id => S.cache[id] ? '<img src="' + S.cache[id] + '">' : '<div class="noimg">tanpa foto</div>'; const lg = printLogos();
    const unduh = new Date().toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' WIB';
    const table = (heads, body) => '<table class="data"><tr>' + heads.map(h => '<th>' + esc(h) + '</th>').join('') + '</tr>' + body.map(x => '<tr>' + x.map(v => '<td>' + esc(v) + '</td>').join('') + '</tr>').join('') + '</table>';
    const bobot = '<p class="bobot">Bobot komponen: Temuan ' + esc(cfg.bobot_temuan) + '% · SLA ' + esc(cfg.bobot_sla) + '% · Spot-Check ' + esc(cfg.bobot_spotcheck) + '% · Checklist ' + esc(cfg.bobot_checklist) + '% · Kepatuhan ' + esc(cfg.bobot_kepatuhan) + '% · Predikat: ≥90 Sangat Baik · ≥75 Baik · ≥60 Perlu Perbaikan · <60 Kritis</p>';
    const page = (content, cls) => '<table class="layout' + (cls ? ' ' + cls : '') + '"><thead><tr><td><div class="hdr">' + (lg.horizon ? '<img src="' + lg.horizon + '" alt="Horizon">' : '<b>HORIZON</b>') + (lg.op ? '<img class="op" src="' + lg.op + '" alt="Operasi 3A">' : '') + '</div></td></tr></thead>'
      + '<tfoot><tr><td><div class="fspace"></div></td></tr></tfoot><tbody><tr><td>' + content + '</td></tr></tbody></table>';
    const dots = '<span class="dots">..........................................................</span>';
    let docs;
    if (ba) {
      const x = r.hqi[0];
      const cover = page('<div class="cover"><div class="ctitle">LAMPIRAN BERITA ACARA PEKERJAAN</div><div class="csub">Penilaian Housekeeping Quality Index (HQI)</div>'
        + '<table class="meta"><tr><th>Nomor OK</th><td>:</td><td>' + (ba.nomor_ok ? '<b>' + esc(ba.nomor_ok) + '</b>' : dots) + '</td></tr>'
        + '<tr><th>Nama pekerjaan</th><td>:</td><td>' + (ba.pekerjaan ? esc(ba.pekerjaan) : dots) + '</td></tr>'
        + '<tr><th>Rekanan</th><td>:</td><td>' + esc(x.vendor) + '</td></tr><tr><th>Lokasi</th><td>:</td><td>' + esc(meta.pabrik) + '</td></tr>'
        + '<tr><th>Periode</th><td>:</td><td>' + esc(tglID(r.periode.mulai)) + ' s/d ' + esc(tglID(r.periode.selesai)) + '</td></tr></table>'
        + '<div class="hero">' + hqiHeroHtml(x, cfg) + '</div>'
        + '<div class="rk-title">Ringkasan penilaian</div><table class="data rk"><tr><th>Komponen</th><th>Ringkasan</th><th>Skor</th><th>Bobot</th><th>Kontribusi ke HQI</th></tr>'
        + baRingkasRows(x, rows.length).map(([nama, bk, teks, skor, kon]) => '<tr><td><b>' + esc(nama) + '</b></td><td>' + esc(teks) + '</td><td class="num">' + esc(nz(skor)) + '</td><td class="num">× ' + esc(nz(cfg[bk], 0)) + '%</td><td class="num"><b>' + esc(kon) + '</b></td></tr>').join('')
        + '<tr class="tot"><td colspan="4"><b>Skor HQI</b> (jumlah kontribusi) · ' + esc(nz(x.grade, '-')) + '</td><td class="num"><b>' + esc(nz(x.hqi_final)) + '</b></td></tr></table>'
        + '<p class="cintro">Hasil penilaian Housekeeping Quality Index (HQI) rekanan pada periode tersebut, beserta dokumentasi foto before/after pada halaman berikutnya, merupakan lampiran yang tidak terpisahkan dari Berita Acara Pekerjaan.</p>'
        + '<div class="cplace">Gresik, ' + dots + '</div>'
        + '<div class="sign"><div class="scol"><div class="sh">' + esc(x.vendor) + '</div><div class="sspace"></div><div class="sname">(' + dots + ')</div><div class="sjab">Nama &amp; Jabatan</div></div>'
        + '<div class="scol"><div class="sh">PT Petrokimia Gresik</div><div class="sspace"></div><div class="sname">(' + dots + ')</div><div class="sjab">Nama &amp; Jabatan</div></div></div></div>', 'brk');
      // halaman foto: 8 temuan per halaman (4 baris × 2), maks. 2 halaman → total maks. 3 halaman
      const fig = (id, lab) => '<figure>' + (S.cache[id] ? '<img src="' + S.cache[id] + '">' : '<div class="noimg">tanpa foto</div>') + '<figcaption>' + lab + '</figcaption></figure>';
      const card = (f, i) => '<div class="pcard"><div class="pph">' + fig(f.foto_open, 'Before') + fig(f.foto_after, 'After') + '</div><div class="pcap"><b>' + (i + 1) + '. ' + esc(f.kategori) + ' — ' + esc(zonaName(f.zona_id)) + '</b><br>' + esc(f.prioritas) + ' · selesai ' + esc(fmtDT(f.timestamp_close)) + ' · TTR ' + esc(fmtMin(f.ttr_menit)) + '</div></div>';
      const chunks = []; for (let i = 0; i < baRows.length; i += BA_FOTO_PER_HAL) chunks.push(baRows.slice(i, i + BA_FOTO_PER_HAL));
      const note = rows.length > baRows.length ? ' · menampilkan ' + baRows.length + ' dari ' + rows.length + ' temuan selesai (prioritas tertinggi & terbaru); daftar lengkap di laporan biasa / Excel' : '';
      const photoPages = chunks.length ? chunks.map((ch, pi) => page('<h2 class="ptitle">Dokumentasi temuan selesai (before → after)' + (pi ? ' — lanjutan' : '') + '</h2>'
        + (pi ? '' : '<p class="psub">' + esc(x.vendor) + ' · ' + esc(tglID(r.periode.mulai)) + ' s/d ' + esc(tglID(r.periode.selesai)) + ' · ' + rows.length + ' temuan selesai' + esc(note) + '</p>')
        + '<div class="pgrid">' + ch.map((f, i) => card(f, pi * BA_FOTO_PER_HAL + i)).join('') + '</div>', pi < chunks.length - 1 ? 'brk' : '')).join('')
        : page('<h2 class="ptitle">Dokumentasi temuan selesai (before → after)</h2><p class="psub">Tidak ada temuan yang selesai (Close) pada periode ini.</p>');
      docs = cover + photoPages;
    } else {
      const sm = reportSummary(r);
      docs = page('<h1>' + esc(reportTitle(meta)) + '</h1><p>Periode ' + esc(r.periode.mulai) + ' s/d ' + esc(r.periode.selesai) + ' · dibuat oleh ' + esc(S.user.nama) + '</p>'
        + '<h2>Skor HQI</h2><div class="hero' + (r.hqi.length > 1 ? ' multi' : '') + '">' + r.hqi.map(x => hqiHeroHtml(x, cfg)).join('') + '</div>' + bobot
        + '<h2>' + esc(sm.title) + '</h2>' + table(sm.heads, sm.rows) + '<p>Daftar lengkap spot-check & checklist harian tersedia di ekspor Excel.</p>'
        + '<h2>Temuan selesai (before → after): ' + rows.length + '</h2><table class="data"><tr><th>No</th><th>Kategori / Zona</th><th>Prioritas</th><th>Open → Close</th><th>TTR</th>' + (nFoto ? '<th>Before → After</th>' : '') + '</tr>'
        + rows.map((f, i) => '<tr><td>' + (i + 1) + '</td><td><b>' + esc(f.kategori) + '</b><br>' + esc(zonaName(f.zona_id)) + '</td><td>' + esc(f.prioritas) + '</td><td>' + esc(fmtDT(f.timestamp_open)) + '<br>' + esc(fmtDT(f.timestamp_close)) + '</td><td>' + esc(fmtMin(f.ttr_menit)) + '</td>' + (nFoto ? '<td>' + (i < nFoto ? '<div class="ba">' + img(f.foto_open) + img(f.foto_after) + '</div>' : '') + '</td>' : '') + '</tr>').join('') + '</table>'
        + (withPhotos && rows.length > nFoto ? '<p>Catatan: foto hanya disertakan untuk ' + nFoto + ' temuan pertama.</p>' : ''));
    }
    const html = '<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>' + esc((ba ? 'Lampiran BA ' + (ba.nomor_ok ? ba.nomor_ok + ' — ' : '') : '') + reportTitle(meta)) + ' ' + esc(r.periode.mulai) + ' s/d ' + esc(r.periode.selesai) + '</title><style>'
      + '*{-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:Arial,sans-serif;color:#111;margin:24px;font-size:12px}h1{font-size:18px;margin:0 0 4px}h2{font-size:14px;margin:18px 0 6px}p{margin:2px 0;color:#444}'
      + 'table.data{border-collapse:collapse;width:100%}table.data th,table.data td{border:1px solid #bbb;padding:5px 6px;text-align:left;vertical-align:top}table.data th{background:#1F3A5F;color:#fff}table.data tr{page-break-inside:avoid}'
      + 'table.layout{width:100%;border-collapse:collapse}table.layout>thead>tr>td,table.layout>tfoot>tr>td,table.layout>tbody>tr>td{padding:0;border:0}table.layout.brk{break-after:page;page-break-after:always}'
      + '.hdr{display:flex;justify-content:space-between;align-items:center;gap:16px;border-bottom:2px solid #1F3A5F;padding:0 0 8px;margin-bottom:12px}.hdr img{height:38px;max-width:46%;object-fit:contain}.hdr img.op{height:34px}'
      + '.pfoot{display:flex;justify-content:space-between;gap:10px;font-size:10px;color:#555;border-top:1px solid #bbb;padding-top:4px;margin-top:14px}.pfoot .mid{text-align:center;flex:1}.fspace{height:18mm}'
      // kartu skor HQI (v1.17.3)
      + '.hero{display:grid;grid-template-columns:1fr;gap:10px;margin:8px 0 6px}.hero.multi{grid-template-columns:1fr 1fr}'
      + '.hcard{display:flex;gap:14px;align-items:stretch;border:2px solid var(--g);border-radius:12px;overflow:hidden;page-break-inside:avoid;break-inside:avoid}'
      + '.hleft{background:var(--g);color:#fff;min-width:138px;padding:14px 10px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}'
      + '.hlabel{font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;opacity:.92}.hnum{font-size:48px;font-weight:800;line-height:1.05;margin:2px 0}.hgrade{font-size:14px;font-weight:700;padding:2px 10px;border-radius:99px;background:rgba(255,255,255,.2)}'
      + '.hright{flex:1;padding:10px 12px 10px 0;min-width:0}.hvendor{font-size:15px;font-weight:700;margin-bottom:6px}'
      + '.hrow{display:grid;grid-template-columns:150px 1fr 38px;gap:8px;align-items:center;font-size:11px;margin:3px 0}.hn i{color:#777;font-style:normal}.hero.multi .hrow{grid-template-columns:118px 1fr 34px;font-size:10px}'
      + '.hbar{height:8px;background:#E5E7EB;border-radius:99px;overflow:hidden}.hbar b{display:block;height:100%;background:var(--g)}.hv{text-align:right;font-weight:700}.hnote{font-size:10px;color:#555;margin-top:6px}.bobot{font-size:10.5px;color:#555}'
      // lampiran berita acara: halaman depan (v1.17.3) + ringkasan & halaman foto (v1.17.4)
      + '.cover{padding-top:2px}.ctitle{text-align:center;font-size:19px;font-weight:800;letter-spacing:.04em;color:#1F3A5F}.csub{text-align:center;font-size:12.5px;color:#444;margin:2px 0 12px}'
      + 'table.meta{border-collapse:collapse;margin:0 0 10px;font-size:12.5px}table.meta th{text-align:left;font-weight:600;padding:3px 10px 3px 0;white-space:nowrap;vertical-align:top}table.meta td{padding:3px 6px 3px 0;vertical-align:top}.dots{color:#999;letter-spacing:1px}'
      + '.rk-title{font-weight:700;font-size:12.5px;margin:10px 0 4px;color:#1F3A5F}table.rk{font-size:10.5px}table.rk th,table.rk td{padding:4px 6px}table.rk td.num{text-align:right;white-space:nowrap;width:46px}table.rk th:nth-child(n+3){text-align:right;white-space:nowrap}table.rk tr.tot td{background:#EEF2F7}'
      + '.cintro{margin:10px 0 0;color:#222;line-height:1.45;text-align:justify;font-size:11.5px}.cplace{margin:14px 0 6px;text-align:right}'
      + '.sign{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-top:4px;page-break-inside:avoid;break-inside:avoid}.scol{text-align:center;border:1px solid #CBD5E1;border-radius:10px;padding:10px}.sh{font-weight:700;font-size:13px}.sorg{font-size:11.5px;color:#444;min-height:16px}.sspace{height:78px}.sname{font-size:12px}.sjab{font-size:10.5px;color:#666;margin-top:2px}'
      + '.ptitle{margin:0 0 2px}.psub{font-size:11px;margin-bottom:8px}.pgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}'
      + '.pcard{border:1px solid #CBD5E1;border-radius:8px;padding:6px;break-inside:avoid;page-break-inside:avoid}.pph{display:grid;grid-template-columns:1fr 1fr;gap:5px}'
      + 'figure{margin:0}figure img,figure .noimg{width:100%;height:118px;object-fit:cover;border-radius:4px;display:block;border:1px solid #ddd}figcaption{font-size:9.5px;color:#555;text-align:center;margin-top:1px}.pcap{font-size:10px;line-height:1.35;margin-top:4px}'
      + '.ba{display:flex;gap:6px}.ba img,.noimg{width:150px;height:112px;object-fit:cover;border:1px solid #ccc}.noimg{display:flex;align-items:center;justify-content:center;color:#999;font-size:10px}'
      // v1.17.4: margin halaman 0 → browser tidak mencetak tanggal/judul/"about:blank"; jarak tepi dari padding & ruang kepala/kaki sendiri
      + '@media print{@page{size:A4;margin:0}body{margin:0;padding:0 11mm}table.layout>thead>tr>td{padding-top:9mm!important}.noprint{display:none}.pfoot{position:fixed;left:11mm;right:11mm;bottom:7mm;margin:0;background:#fff}}'
      + '@media screen{.fspace{display:none}table.layout.brk{border-bottom:2px dashed #bbb;margin-bottom:18px}}'
      + '</style></head><body><div class="noprint" style="margin-bottom:10px"><button onclick="window.print()" style="padding:8px 14px;font-weight:bold">Cetak / Simpan sebagai PDF</button></div>'
      + docs + '<div class="pfoot"><span>Operasi Pabrik III A</span><span class="mid">Diunduh ' + esc(unduh) + '</span><span>Petrokimia Gresik</span></div></body></html>';
    win.document.open(); win.document.write(html); win.document.close(); status(''); setTimeout(() => { try { win.focus(); win.print(); } catch (e) { } }, 800); }
  /**
   * v1.17: dasar perhitungan tiap komponen HQI dari computeHQI.rincian — dipakai rincian Laporan dan popup chip skor di Beranda.
   * poin = daftar fakta (null disaring), aturan = ringkasan rumus (selaras Panduan HQI / PRD 7.6).
   */
  function hqiBasis(h) { const cfg = S.boot.config; const d = h.rincian || {}; const t = d.temuan || {}, sl = d.sla || {}, sp = d.spotcheck || {}, ck = d.checklist || {}, kp = d.kepatuhan || {};
    const pr = (t.per_prioritas || []).filter(x => x.n).map(x => x.prioritas + ' ' + x.n).join(', ');
    return [
      { key: 'temuan', nama: 'Temuan' + (Number(cfg.bobot_temuan) === 0 ? ' (indikator)' : ''), skor: h.skor_temuan, bobot: 'bobot_temuan',
        poin: [nz(t.n, 0) + ' temuan pada periode ini' + (pr ? ' (' + pr + ')' : ''), t.exception ? t.exception + ' temuan saat jendela operasional (tidak mengurangi skor)' : null, t.ditolak_close ? 'Penutupan ditolak verifikator: ' + t.ditolak_close + '× pada ' + t.temuan_ditolak + ' temuan (indikator)' : null, t.menunggu_verifikasi ? t.menunggu_verifikasi + ' menunggu verifikasi penutupan' : null, 'Total pengurang ' + nz(t.deduksi, 0) + ' → skor 100 − ' + nz(t.deduksi, 0) + ' (minimal 0)'],
        aturan: '100 dikurangi Σ(bobot prioritas × pengali temuan berulang di zona & kategori yang sama dalam 30 hari). Bobot 0% berarti hanya indikator — tidak memengaruhi HQI.' },
      { key: 'sla', nama: 'SLA', skor: h.skor_sla, bobot: 'bobot_sla',
        poin: [nz(sl.n_dinilai, 0) ? nz(sl.n_dinilai, 0) + ' temuan dinilai' : 'Belum ada temuan yang dinilai → skor 100', nz(sl.tepat, 0) + ' selesai tepat waktu, ' + nz(sl.telat, 0) + ' terlambat', sl.open_telat ? sl.open_telat + ' masih open dan sudah lewat target (dihitung terlambat)' : null, sl.tambah_waktu ? 'Tambahan waktu disetujui: ' + sl.tambah_waktu + '× pada ' + sl.temuan_tambah_waktu + ' temuan (target temuan itu memakai estimasi yang disetujui)' : null,
          nz(sl.bobot_total, 0) ? 'Bobot tepat waktu ' + nz(sl.bobot_tepat, 0) + ' dari ' + nz(sl.bobot_total, 0) + ' → ' + nz(sl.bobot_tepat, 0) + ' ÷ ' + nz(sl.bobot_total, 0) + ' × 100' : null, 'Toleransi (buffer) ' + nz(sl.buffer_menit, 0) + ' menit di atas target'],
        aturan: 'Persentase temuan yang selesai dalam target waktu, berbobot prioritas (Mendesak 10, Tinggi 5, Sedang 3, Rendah 1), dihitung dari jam kerja efektif.' },
      { key: 'spotcheck', nama: 'Spot-Check', skor: h.skor_spotcheck, bobot: 'bobot_spotcheck',
        poin: [nz(sp.n, 0) + ' spot-check' + (sp.rata != null ? ', rata-rata skor ' + sp.rata : ''), sp.kuota ? 'Kuota minimum periode ini: ' + sp.kuota + ' spot-check' : null, sp.dari_checklist ? sp.dari_checklist + ' kekurangan kuota diisi skor checklist terverifikasi' : null, sp.catatan || null],
        aturan: 'Rata-rata skor spot-check Karyawan Organik. Bila jumlahnya di bawah kuota (minimum per zona per bulan), kekurangannya diisi skor checklist terverifikasi.' },
      { key: 'checklist', nama: 'Checklist Harian', skor: h.skor_checklist, bobot: 'bobot_checklist',
        poin: [nz(ck.n, 0) + ' checklist masuk, ' + nz(ck.valid, 0) + ' dihitung', ck.menunggu ? ck.menunggu + ' masih menunggu verifikasi' : null, ck.ditolak ? ck.ditolak + ' ditolak (tidak dihitung)' : null, ck.otomatis ? ck.otomatis + ' terverifikasi otomatis' : null, ck.anomali_dikeluarkan ? ck.anomali_dikeluarkan + ' anomali dikeluarkan' : null, ck.rata_mandor != null ? 'Rata-rata skor versi Mandor ' + ck.rata_mandor : null, !nz(ck.n, 0) ? 'Tidak ada checklist pada periode ini → skor 0' : null],
        aturan: 'Rata-rata skor checklist yang sudah terverifikasi (skor hasil cross-checklist Karyawan Organik). Ditolak dan anomali yang disetujui tidak dihitung.' },
      { key: 'kepatuhan', nama: 'Kepatuhan Checklist', skor: h.skor_kepatuhan, bobot: 'bobot_kepatuhan',
        poin: [nz(kp.hari_kerja, 0) + ' hari kerja (Senin–Jumat) pada periode ini'].concat((kp.zona || []).map(z => z.nama + ': terisi ' + kpTeks(z) + ' → ' + z.pct + '%')).concat((kp.zona || []).length ? [] : ['Vendor belum punya zona aktif → skor 100']),
        aturan: 'Untuk tiap zona vendor: hari checklist terisi ÷ hari kerja × 100, lalu dirata-rata seluruh zona.' },
    ];
  }
  const hqiContrib = (b, cfg) => r1(Number(nz(b.skor, 0)) * Number(cfg[b.bobot]) / 100);
  /** v1.17: popup detail perolehan skor satu komponen (chip skor di kartu HQI Beranda). Chip di bawah popup berpindah antar komponen. */
  function openScoreDetail(h, key, periode) { const cfg = S.boot.config; const all = hqiBasis(h); const b = all.find(x => x.key === key) || all[0];
    modal(el('div', { class: 'form score-detail' },
      el('div', { class: 'section-head' }, el('h3', {}, b.nama + ' · ' + nz(h.vendor, '-')), el('a', { class: 'link', onclick: closeModal }, 'Tutup')),
      el('p', { class: 'hint' }, 'Periode ' + nz((periode || {}).mulai, '-') + ' s/d ' + nz((periode || {}).selesai, '-') + ' · tap komponen lain di bawah untuk berpindah'),
      el('div', { class: 'stat-grid' }, stat(nz(b.skor), 'Skor komponen'), stat(nz(cfg[b.bobot], 0) + '%', 'Bobot'), stat(hqiContrib(b, cfg), 'Kontribusi ke HQI')),
      el('h3', {}, 'Dasar perhitungan'), el('ul', { class: 'score-basis' }, ...b.poin.filter(Boolean).map(p => el('li', {}, p))),
      el('p', { class: 'hint' }, 'Aturan: ' + b.aturan),
      el('div', { class: 'chip-row' }, ...all.map(x => el('button', { type: 'button', class: 'chip chip-btn' + (x.key === b.key ? ' active' : ''), onclick: () => openScoreDetail(h, x.key, periode) }, (x.key === 'temuan' && Number(cfg.bobot_temuan) === 0 ? 'Temuan ' + nz((h.jumlah || {}).temuan, 0) + ' (indikator)' : x.nama + ' ' + nz(x.skor))))),
      el('p', { class: 'hint' }, 'HQI ' + nz(h.hqi_final) + ' = ' + all.map(x => hqiContrib(x, cfg)).join(' + ') + ' → ' + nz(h.grade, '-'))));
  }
  /** v1.15: rincian HQI per vendor — skor, bobot, kontribusi, dan dasar perhitungan tiap komponen (v1.17: dari hqiBasis). */
  function hqiDetailCards(r) { const cfg = S.boot.config;
    return el('div', { class: 'form' }, el('div', { class: 'section-head' }, el('h3', {}, 'Rincian HQI per komponen')), el('p', { class: 'hint' }, 'Bagaimana skor tiap vendor terbentuk pada periode ' + r.periode.mulai + ' s/d ' + r.periode.selesai + ' (bobot yang berlaku sekarang; angka dasar dari data periode). Tap vendor untuk membuka/menutup.'),
      ...r.hqi.map(h => { const open = r.hqi.length === 1; const body = el('div', { class: 'form' }); body.hidden = !open; const all = hqiBasis(h);
        const tbl = el('div', { class: 'tbl-wrap' }, el('table', { class: 'tbl' }, el('tr', {}, ...['Komponen', 'Skor', 'Bobot', 'Kontribusi', 'Dasar perhitungan'].map(x => el('th', {}, x))),
          ...all.map(b => el('tr', {}, el('td', {}, el('b', {}, b.nama)), el('td', {}, nz(b.skor)), el('td', {}, cfg[b.bobot] + '%'), el('td', {}, el('b', {}, hqiContrib(b, cfg))), el('td', { class: 'hint' }, b.poin.filter(Boolean).join(' · '))))));
        body.replaceChildren(tbl, el('p', { class: 'hint' }, 'HQI = ' + all.map(b => hqiContrib(b, cfg)).join(' + ') + ' = ' + nz(h.hqi_final) + ' → ' + nz(h.grade, '-') + (h.catatan ? ' · ' + h.catatan : '')));
        const head = el('div', { class: 'section-head', style: 'cursor:pointer', onclick: () => { body.hidden = !body.hidden; } }, el('h3', {}, h.vendor), el('b', { class: 'lb-score' }, nz(h.hqi_final) + ' · ' + nz(h.grade, '-')));
        return el('div', { class: 'card form' }, head, body); })); }
  VIEWS.laporan = async (c) => {
    const s = el('input', { type: 'date', value: monthStart() }), e = el('input', { type: 'date', value: today() });
    // v1.15: pilih bulan cepat → mengisi rentang tanggal (tetap bisa diubah manual)
    const bln = el('input', { type: 'month', value: today().slice(0, 7) }); bln.addEventListener('change', () => { if (!bln.value) return; const [y, m] = bln.value.split('-').map(Number); s.value = bln.value + '-01'; const last = new Date(y, m, 0).getDate(); const endIso = bln.value + '-' + String(last).padStart(2, '0'); e.value = endIso > today() ? today() : endIso; });
    // v1.17 (permintaan Rudy): filter Pabrik diganti filter Vendor — pabrik laporan mengikuti vendor terpilih;
    // "Semua vendor" butuh satu lingkup (user satu-lingkup otomatis; role global/multi memilih lingkup di kanan atas)
    const isMandor = S.user.role === 'Mandor';
    const vendList = (S.boot.vendors || []).filter(v => !isMandor || String(v.id) === String(S.user.vendor_id));
    const singlePab = !S.boot.isMulti ? String(S.user.pabrik_id || '') : (S.scope !== 'ALL' && String(S.scope).indexOf(',') === -1 ? S.scope : '');
    const manyPab = new Set(vendList.map(v => v.pabrik_id)).size > 1;
    const ven = sel((isMandor ? [] : [{ v: '', t: 'Semua vendor' + (singlePab ? '' : ' (pilih satu lingkup dulu)') }]).concat(vendList.map(v => ({ v: v.id, t: v.nama + (manyPab ? ' · ' + pabNames(v.pabrik_id) : '') + (v.status === 'Nonaktif' ? ' (nonaktif)' : '') }))));
    if (isMandor) ven.disabled = true;
    const out = el('div', { class: 'form' }); const btn = el('button', { class: 'btn primary' }, 'Tampilkan'); let reqSeq = 0; const exportSlot = el('div');   // v1.17.1: kartu Ekspor di bawah filter (permintaan Rudy)   // hanya hasil klik terakhir yang ditampilkan
    c.replaceChildren(el('div', { class: 'greeting' }, el('h2', {}, 'Laporan'), el('p', {}, 'Skor HQI, spot-check, checklist, kepatuhan & temuan before-after per periode · bisa diekspor ke Excel atau dicetak/PDF')), el('div', { class: 'card form' }, el('div', { class: 'form-row' }, fld('Bulan (cepat)', bln), fld('Vendor', ven)), el('div', { class: 'form-row' }, fld('Dari', s), fld('Sampai', e)), btn), exportSlot, out);
    btn.addEventListener('click', async () => {
      const v = vendList.find(x => String(x.id) === String(ven.value)); const pabrikId = v ? v.pabrik_id : singlePab;
      if (!pabrikId) return out.replaceChildren(el('p', { class: 'empty err' }, 'Pilih satu vendor, atau pilih satu lingkup pabrik di menu kanan atas untuk melihat semua vendor.'));
      out.replaceChildren(el('p', { class: 'empty' }, 'Menghitung...')); exportSlot.replaceChildren(); const my = ++reqSeq;
      try { const r = await api('report', { periode_mulai: s.value, periode_selesai: e.value, pabrik_id: pabrikId, vendor_id: v ? v.id : undefined }); if (my !== reqSeq) return;
      const meta = { pabrikId, pabrik: pabNames(pabrikId), vendor: v ? v.nama : '' };
      const tbl = el('table', { class: 'tbl' }, el('tr', {}, ...['Vendor', 'Temuan', 'SLA', 'Spot', 'Checklist', 'Patuh', 'HQI'].map(h => el('th', {}, h))), ...r.hqi.map(h => el('tr', {}, el('td', {}, h.vendor), el('td', {}, h.skor_temuan), el('td', {}, h.skor_sla), el('td', {}, h.skor_spotcheck), el('td', {}, h.skor_checklist), el('td', {}, h.skor_kepatuhan), el('td', {}, el('b', {}, h.hqi_final + ' · ' + h.grade)))));
      const sm = reportSummary(r);   // v1.17.1: ringkasan per vendor (detail baris hanya di Excel)
      const extra = [el('div', { class: 'card form' }, el('div', { class: 'section-head' }, el('h3', {}, sm.title)), el('p', { class: 'hint' }, 'Satu baris per vendor · daftar lengkap ada di ekspor Excel'),
        el('div', { class: 'tbl-wrap' }, el('table', { class: 'tbl' }, el('tr', {}, ...sm.heads.map(x => el('th', {}, x))), ...sm.rows.map(x => el('tr', {}, ...x.map(val => el('td', {}, val)))))))];
      const list = el('div', { class: 'list' }, ...r.before_after.map(f => { const ba = el('div', { class: 'ba', style: 'width:120px;height:80px' }, el('div', { class: 'before' }), el('div', { class: 'after' })); photoImg(f.foto_open).then(i => i.src && ba.firstChild.replaceWith(i)); photoImg(f.foto_after).then(i => i.src && ba.lastChild.replaceWith(i));
        return el('div', { class: 'card row-card' }, ba, el('div', { class: 'info' }, el('b', {}, f.kategori + ' — ' + zonaName(f.zona_id)), el('span', {}, 'Prioritas ' + f.prioritas + ' · TTR ' + fmtMin(f.ttr_menit) + ' · ' + fmtDT(f.timestamp_close)))); }));
      // v1.11: ekspor
      const foto = el('input', { type: 'checkbox' });   /* v1.17.1: bawaan tanpa foto agar PDF ringkas */ const st = el('span', { class: 'hint' }); const status = t => { st.textContent = t; };
      const run = (fn, b2) => async () => { if (b2.disabled) return; b2.disabled = true; status('Menyiapkan…'); try { await fn(r, meta, foto.checked, status); status('Selesai.'); } catch (err) { status(''); toast(err.message, true); } b2.disabled = false; };
      const bx = el('button', { class: 'btn sm' }, 'Ekspor Excel (.xlsx)'), bp = el('button', { class: 'btn sm' }, 'Cetak / Simpan PDF'); bx.addEventListener('click', run(exportReportExcel, bx)); bp.addEventListener('click', run(printReport, bp));
      const bba = el('button', { class: 'btn sm primary', onclick: () => openBaForm(r, meta, foto.checked, status) }, 'Lampiran Berita Acara');   /* v1.17.3 */
      exportSlot.replaceChildren(el('div', { class: 'card form export-card' }, el('div', { class: 'section-head' }, el('h3', {}, 'Ekspor laporan'), st), el('label', { class: 'toggle' }, foto, 'Sertakan foto before/after (maks. ' + EXPORT_PHOTO_MAX + ' temuan; lebih lambat)'), el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' }, bx, bp, bba), el('p', { class: 'hint' }, 'Lampiran Berita Acara = PDF maks. 3 halaman untuk satu vendor: halaman depan (Nomor OK, nama pekerjaan, periode, skor & ringkasan HQI, tanda tangan) + foto before/after temuan selesai (selalu disertakan).')));
      out.replaceChildren(el('div', { class: 'card' }, el('h3', {}, 'Skor HQI ' + r.periode.mulai + ' s/d ' + r.periode.selesai + ' · ' + reportTitle(meta).replace('Laporan HQI — ', '')), tbl), hqiDetailCards(r), ...extra, el('div', { class: 'section-head' }, el('h3', {}, 'Temuan selesai (Before → After): ' + r.before_after.length)), r.before_after.length ? list : el('p', { class: 'empty' }, 'Tidak ada temuan Close pada periode ini')); } catch (err) { if (my === reqSeq) out.replaceChildren(el('p', { class: 'empty err' }, err.message)); } });
  };

  // ================= ADMIN (per pabrik)
  VIEWS.admin = async (c, arg) => {
    const tabs = el('div', { class: 'tabs' }); const body = el('div', { class: 'form' });
    const T = { zona: adminZona, pertanyaan: adminPertanyaan, user: adminUser, vendor: adminVendor, jadwal: adminJadwal, bobot: adminBobot, review: adminReview, log: adminLog };
    T.data = adminData;   // v1.15: Admin & Super Admin — lihat/hapus temuan, checklist, spot-check tidak sesuai
    if (S.user.role === 'SuperAdmin') { T.lingkup = adminLingkup; T.arsip = adminArsip; }   // v1.11: Arsip
    const LABEL = { zona: 'Zona', pertanyaan: 'Pertanyaan', user: 'User', vendor: 'Vendor', jadwal: 'Jadwal', bobot: 'Bobot', review: 'Review', log: 'Log', lingkup: 'Lingkup', arsip: 'Arsip', data: 'Data' };
    const first = (arg && arg.tab && T[arg.tab]) ? arg.tab : (S.user.role === 'SuperAdmin' && S.scope === 'ALL' ? 'lingkup' : (S.boot.isMulti && S.scope === 'ALL' ? 'user' : 'zona'));
    Object.keys(T).forEach(k => tabs.append(el('button', { class: k === first ? 'active' : '', onclick: e => { tabs.querySelectorAll('button').forEach(b => b.classList.toggle('active', b === e.target)); T[k](body); } }, LABEL[k])));
    c.replaceChildren(el('div', { class: 'greeting' }, el('h2', {}, 'Panel Admin'), el('p', {}, 'Lingkup: ' + scopeName() + (S.user.role === 'SuperAdmin' ? ' · Super Admin (seluruh lingkup)' : ''))), tabs, body); T[first](body);
  };
  /**
   * Admin › Zona (PRD 7.10.2). v1.7: editor polygon zona tersimpan (geser/tambah/hapus titik, gambar ulang, lanjut gambar, batalkan),
   * peta otomatis memusat ke polygon yang diedit, dan kartu "Pertanyaan khusus zona ini" agar pertanyaan bisa ditambah dari tab Zona.
   */
  async function adminZona(b) {
    if (needScope(b)) return;
    const zoneQs = zid => S.boot.questions.filter(q => qZones(q) !== 'ALL' && qAppliesTo(q, zid));   // pertanyaan khusus (bukan "Semua zona") yang berlaku di zona ini
    const mapBox = el('div', { class: 'map', style: 'height:340px' }); const nama = el('input', { placeholder: 'Nama area/zona' }), desk = el('input', { placeholder: 'Deskripsi (opsional)' }), vend = sel(S.boot.vendors.map(v => ({ v: v.id, t: v.nama }))), kat = sel(S.boot.kategoriZona), per = el('input', { type: 'number', min: 0, value: 0, placeholder: '0' }), frek = sel([{ v: '1', t: 'Setiap hari kerja (1×/hari)' }, { v: '2', t: 'Sekali tiap 2 hari kerja' }, { v: '3', t: 'Sekali tiap 3 hari kerja' }, { v: '7', t: 'Sekali per minggu' }]);   /* v1.20 */
    let editing = null, drawer = null; const save = el('button', { class: 'btn primary' }, 'Simpan zona'); const drawBtn = el('button', { class: 'btn sm' }, 'Gambar polygon baru'); const finishBtn = el('button', { class: 'btn primary sm' }, 'Selesai gambar'); const undoBtn = el('button', { class: 'btn sm' }, 'Hapus titik terakhir'); const addBtn = el('button', { class: 'btn sm' }, 'Lanjut tambah titik'); const resetBtn = el('button', { class: 'btn sm' }, 'Batalkan perubahan polygon'); const list = el('div', { class: 'list' });
    const HINT_NEW = 'Tap "Gambar polygon baru", lalu tap peta titik demi titik (minimal 3), akhiri dengan "Selesai gambar" atau double-click. Untuk mengubah zona yang sudah ada, tap "Edit" di daftar zona.';
    const HINT_EDIT = 'Mengedit polygon: geser titik putih untuk memindahkannya · tap titik kecil di tengah sisi untuk menambah titik · tap titik putih untuk menghapusnya (min. 3 titik) · "Lanjut tambah titik" menambah titik di ujung · "Gambar ulang polygon" menggambar dari awal untuk zona ini. Akhiri dengan "Simpan zona".';
    const drawHint = el('p', { class: 'hint' }, HINT_NEW); finishBtn.hidden = undoBtn.hidden = addBtn.hidden = resetBtn.hidden = true;
    const editTitle = el('h3', {}, 'Zona baru'); const cancelEdit = el('a', { class: 'link', onclick: () => resetForm() }, 'Batal edit'); cancelEdit.hidden = true;
    const qCard = el('div', { class: 'card form' }); qCard.hidden = true;
    b.replaceChildren(mapBox, el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' }, drawBtn, addBtn, finishBtn, undoBtn, resetBtn), drawHint,
      el('div', { class: 'card form' }, el('div', { class: 'section-head' }, editTitle, cancelEdit), fld('Nama area', nama), fld('Deskripsi', desk), el('div', { class: 'form-row' }, fld('Vendor penanggung jawab', vend), fld('Kategori zona', kat)), el('div', { class: 'form-row' }, fld('Jumlah personil rekanan di zona ini', per), fld('Frekuensi checklist harian', frek)), save),
      qCard, el('div', { class: 'section-head' }, el('h3', {}, 'Daftar zona')), list);
    let map = null; try { await loadMaps(); map = newMap(mapBox); } catch (e) { mapError(mapBox, e.message); drawBtn.disabled = true; drawHint.textContent = 'Peta tidak tersedia — zona tidak bisa digambar/diedit sampai peta aktif.'; drawHint.className = 'hint err'; }
    const setEditUI = () => { const ed = !!editing; editTitle.textContent = ed ? 'Edit zona: ' + editing.nama_area : 'Zona baru'; cancelEdit.hidden = !ed; resetBtn.hidden = !ed; qCard.hidden = !ed;
      drawBtn.textContent = ed ? 'Gambar ulang polygon' : 'Gambar polygon baru'; drawHint.textContent = ed ? HINT_EDIT : HINT_NEW; addBtn.hidden = !(drawer && drawer.polygon && drawer.count() >= 3) || (drawer && drawer.drawing); if (ed) renderQs(); };
    const resetForm = () => { editing = null; nama.value = desk.value = ''; per.value = 0; frek.value = '1'; if (drawer) drawer.clear(); finishBtn.hidden = undoBtn.hidden = true; setEditUI(); };
    if (map) { drawer = polygonDrawer(map, { fillOpacity: .25 }); drawZones(map, S.boot.zones); fitZones(map, S.boot.zones);
      drawer.onDone = () => { finishBtn.hidden = undoBtn.hidden = true; setEditUI(); toast(editing ? 'Polygon diperbarui — tap "Simpan zona" untuk menyimpan' : 'Polygon selesai — lengkapi metadata lalu simpan'); };
      drawBtn.addEventListener('click', () => { if (!editing) { nama.value = desk.value = ''; } drawer.start(); finishBtn.hidden = undoBtn.hidden = false; addBtn.hidden = true; toast('Tap peta titik demi titik, lalu "Selesai gambar"'); });
      addBtn.addEventListener('click', () => { drawer.resume(); finishBtn.hidden = undoBtn.hidden = false; addBtn.hidden = true; toast('Tap peta untuk menambah titik di ujung polygon, lalu "Selesai gambar"'); });
      resetBtn.addEventListener('click', () => { if (!editing) return; drawer.load(editing.polygon); finishBtn.hidden = undoBtn.hidden = true; setEditUI(); toast('Polygon dikembalikan ke yang tersimpan'); });
      finishBtn.addEventListener('click', () => drawer.finish()); undoBtn.addEventListener('click', () => drawer.undo()); }
    const refresh = tab => go('admin', { tab: tab || 'zona' });   // v1.16: bootstrap sudah ikut apiSave
    // ---- v1.7.1: PEMILIH pertanyaan untuk zona yang sedang diedit — memilih dari pertanyaan yang sudah dibuat di Survey Builder
    //      (centang = berlaku di zona ini; pertanyaan "Semua zona" selalu berlaku dan tidak bisa dilepas di sini). Server: upsertQuestion dengan zona_id = daftar id zona.
    const renderQs = () => { const z = editing; if (!z) return; const all = S.boot.questions.slice().sort((a, b) => (qZones(a) === 'ALL' ? 0 : 1) - (qZones(b) === 'ALL' ? 0 : 1) || a.teks_pertanyaan.localeCompare(b.teks_pertanyaan));
      const nAktif = all.filter(q => qAppliesTo(q, z.id)).length;
      const rows = all.map(q => { const zs = qZones(q); const global = zs === 'ALL'; const on = global || zs.indexOf(z.id) !== -1;
        const cb = el('input', { type: 'checkbox', checked: on ? '' : null });
        // v1.7.3: pertanyaan "Semua zona" boleh dilepas dari zona ini → diubah menjadi daftar eksplisit semua zona aktif pabrik kecuali zona ini
        const pabrikZones = (S.boot.zonesAll && S.boot.zonesAll.length ? S.boot.zonesAll : S.boot.zones).filter(x => x.pabrik_id === z.pabrik_id && x.status !== 'Nonaktif').map(x => x.id);
        cb.addEventListener('change', async () => { cb.disabled = true; const next = global ? pabrikZones.filter(id => id !== z.id) : (on ? zs.filter(id => id !== z.id) : zs.concat([z.id]));
          try { await apiSave('upsertQuestion', { question: { id: q.id, zona_id: next } }); toast(cb.checked ? 'Pertanyaan dipakai di zona ' + z.nama_area : 'Pertanyaan dilepas dari zona ' + z.nama_area + (global ? ' (kini berlaku di zona lain saja, bukan "Semua zona")' : '')); renderQs(); renderList(); }
          catch (err) { toast(err.message, true); cb.checked = on; cb.disabled = false; } });
        const lain = global ? 'Semua zona' : zs.filter(id => id !== z.id).map(zonaName).join(', ');
        return el('label', { class: 'check-item pick' + (on ? ' on' : '') }, cb, el('span', {}, q.teks_pertanyaan, el('em', {}, q.berlaku_untuk + (q.terkait_drain === 'Y' ? ' · N/A saat drain/perbaikan' : '') + (lain ? ' · ' + (global ? 'berlaku di semua zona (lepas centang = semua zona kecuali ini)' : 'juga di: ' + lain) : ' · hanya zona ini')))); });
      qCard.replaceChildren(el('div', { class: 'section-head' }, el('h3', {}, 'Pertanyaan untuk zona ini (' + nAktif + ' dari ' + all.length + ')'), el('a', { class: 'link', onclick: () => go('admin', { tab: 'pertanyaan' }) }, 'Survey Builder')),
        el('p', { class: 'hint' }, 'Centang pertanyaan yang berlaku untuk zona "' + z.nama_area + '" (checklist harian & spot-check). Pertanyaan dibuat/diedit di Survey Builder; satu pertanyaan boleh dipakai di banyak zona. Berlaku untuk pengisian berikutnya (non-retroaktif).'),
        all.length ? el('div', { class: 'pick-list' }, ...rows) : el('p', { class: 'empty' }, 'Belum ada pertanyaan aktif — buat dulu di Survey Builder')); };
    const renderList = () => { list.replaceChildren(...(S.boot.zonesAll && S.boot.zonesAll.length ? S.boot.zonesAll : S.boot.zones).map(z => { const aktif = z.status !== 'Nonaktif';
      const edit = focusQ => { try { editing = z; nama.value = z.nama_area || ''; desk.value = z.deskripsi || ''; vend.value = z.vendor_id || ''; kat.value = z.kategori || ''; per.value = Number(z.jumlah_personil) || 0; frek.value = String(zFrek(z)); if (drawer) { finishBtn.hidden = undoBtn.hidden = true; drawer.load(z.polygon || []); } setEditUI();
        (focusQ === true ? qCard : mapBox).scrollIntoView({ behavior: 'smooth', block: 'start' }); if (focusQ !== true) toast('Zona "' + z.nama_area + '" dimuat: ubah polygon di peta dan/atau data di form, lalu "Simpan zona"'); }
        catch (err) { toast('Gagal memuat zona untuk diedit: ' + err.message, true); console.error(err); } };   // v1.7.1: kesalahan ditampilkan, bukan diam
      const tgl = el('button', { class: 'btn sm', onclick: async e => { e.stopPropagation(); try { await apiSave('upsertZone', { zone: { id: z.id, status: aktif ? 'Nonaktif' : 'Aktif' } }); toast(aktif ? 'Zona dinonaktifkan' : 'Zona diaktifkan kembali'); refresh('zona'); } catch (err) { toast(err.message, true); } } }, aktif ? 'Nonaktifkan' : 'Aktifkan');
      const del = el('button', { class: 'btn danger sm', onclick: async e => { e.stopPropagation(); if (!await confirmModal('Hapus zona "' + z.nama_area + '"?\nBila sudah ada temuan/checklist/spot-check di zona ini, zona hanya dinonaktifkan agar histori tetap valid.')) return;
        try { const r = await apiSave('deleteZone', { id: z.id }); toast(r.mode === 'hapus' ? 'Zona dihapus permanen' : 'Zona dinonaktifkan (ada ' + r.terkait + ' data terkait)'); refresh('zona'); } catch (err) { toast(err.message, true); } } }, 'Hapus');
      return el('div', { class: 'card row-card zone-row', onclick: () => edit() }, el('div', { class: 'info' }, el('b', {}, z.nama_area), el('span', {}, vendorName(z.vendor_id) + ' · ' + (z.kategori || '-') + ' · ' + (Number(z.jumlah_personil) || 0) + ' personil · checklist ' + labelFrek(zFrek(z)) + ' · ' + zoneQs(z.id).length + ' pertanyaan khusus zona')), el('span', { class: 'pill ' + (aktif ? 'ok' : 'Nonaktif') }, aktif ? 'Aktif' : 'Nonaktif'),
        el('div', { class: 'row-actions' }, el('button', { class: 'btn sm', onclick: e => { e.stopPropagation(); edit(); } }, 'Edit'), el('button', { class: 'btn sm', onclick: e => { e.stopPropagation(); edit(true); } }, 'Pertanyaan'), tgl, del)); })); };
    renderList();
    save.addEventListener('click', async () => { if (!drawer || !drawer.polygon) return toast('Gambar polygon dulu', true); if (drawer.drawing && !drawer.finish()) return; if (drawer.count() < 3) return toast('Polygon minimal 3 titik', true); if (!nama.value) return toast('Nama area wajib', true); const path = drawer.path();
      try { await apiSave('upsertZone', { zone: { id: editing ? editing.id : undefined, nama_area: nama.value, deskripsi: desk.value, vendor_id: vend.value, kategori: kat.value, polygon: path, jumlah_personil: Number(per.value) || 0, frekuensi_hari: Number(frek.value) || 1 } }); toast(editing ? 'Zona diperbarui' : 'Zona tersimpan'); refresh('zona'); } catch (e) { toast(e.message, true); } });
  }
  /** SuperAdmin: kelola lingkup/pabrik (v1.4) — tambah lingkup baru mis. "Operasi Pabrik IIIA". */
  async function adminLingkup(b) {
    const rows = await api('listPabrik', {}); let editing = null;
    const id = el('input', { placeholder: 'ID singkat (huruf/angka), mis. OP3A' }), nama = el('input', { placeholder: 'Nama lingkup, mis. Operasi Pabrik IIIA' }), jm = el('input', { type: 'time', value: '07:00' }), js = el('input', { type: 'time', value: '16:00' }), dl = el('input', { type: 'time', value: '17:00' }), rem = el('input', { type: 'number', value: 2, min: 0 });
    const save = el('button', { class: 'btn primary' }, 'Simpan lingkup'); const reset = el('a', { class: 'link', onclick: () => { editing = null; id.value = nama.value = ''; id.disabled = false; jm.value = '07:00'; js.value = '16:00'; dl.value = '17:00'; rem.value = 2; } }, 'Lingkup baru');
    b.replaceChildren(el('div', { class: 'card form' }, el('div', { class: 'section-head' }, el('h3', {}, 'Lingkup / Pabrik'), reset), el('p', { class: 'hint' }, 'Lingkup baru otomatis mendapat akun admin-<id> (PIN 123456 — segera ganti) dan 4 pertanyaan checklist default. Setelah dibuat, pilih lingkup itu di menu kanan atas untuk mengisi vendor, zona, dan user.'),
      el('div', { class: 'form-row' }, fld('ID', id), fld('Nama', nama)), el('div', { class: 'form-row' }, fld('Jam kerja mulai', jm), fld('Jam kerja selesai', js)), el('div', { class: 'form-row' }, fld('Deadline verifikasi checklist', dl), fld('Reminder (jam sebelum deadline)', rem)), save),
      el('table', { class: 'tbl' }, el('tr', {}, ...['ID', 'Nama', 'Jam kerja', 'Deadline', 'Akun admin'].map(h => el('th', {}, h))), ...rows.map(p => el('tr', { style: 'cursor:pointer', onclick: () => { editing = p; id.value = p.id; id.disabled = true; nama.value = p.nama; jm.value = hm(p.jam_mulai); js.value = hm(p.jam_selesai); dl.value = hm(p.deadline_verifikasi); rem.value = p.reminder_jam_sebelum; } },
        el('td', {}, p.id), el('td', {}, p.nama), el('td', {}, hm(p.jam_mulai) + '–' + hm(p.jam_selesai)), el('td', {}, hm(p.deadline_verifikasi)), el('td', {}, 'admin-' + String(p.id).toLowerCase())))));
    save.addEventListener('click', async () => { if (!id.value || !nama.value) return toast('ID dan nama wajib', true);
      try { const r = await apiSave('upsertPabrik', { pabrik: { id: id.value, nama: nama.value, jam_mulai: jm.value, jam_selesai: js.value, deadline_verifikasi: dl.value, reminder_jam_sebelum: rem.value } }); toast(r.baru ? 'Lingkup dibuat · akun ' + r.admin_id + ' PIN 123456' : 'Lingkup diperbarui'); buildScope(); go('admin', { tab: 'lingkup' }); } catch (e) { toast(e.message, true); } });
  }
  const hm = v => { const s = String(v || ''); const t = s.indexOf('T') !== -1 ? s.split('T')[1] : s; return t.slice(0, 5); };
  async function adminPertanyaan(b) {
    if (needScope(b)) return;
    const rows = await api('listQuestions', {}); const teks = el('input', { placeholder: 'Teks pertanyaan, mis. "Lantai bebas ceceran?"' }), untuk = sel(['Keduanya', 'ChecklistHarian', 'SpotCheck']), drain = el('input', { type: 'checkbox' }); let editing = null;
    const zonasAll = (S.boot.zonesAll && S.boot.zonesAll.length ? S.boot.zonesAll : S.boot.zones);
    const zonaOpts = [{ v: 'ALL', t: 'Semua zona (umum)' }].concat(zonasAll.map(z => ({ v: z.id, t: z.nama_area + (z.status === 'Nonaktif' ? ' (nonaktif)' : '') })));
    // v1.7.1: berlaku di zona = pilihan ganda (centang "Semua zona" atau beberapa zona sekaligus)
    const zChecks = {}; const allCb = el('input', { type: 'checkbox' }); const syncZ = () => { Object.values(zChecks).forEach(c => c.disabled = allCb.checked); };
    allCb.addEventListener('change', syncZ);
    const zBox = el('div', { class: 'pick-list' }, el('label', { class: 'check-item pick' }, allCb, el('span', {}, 'Semua zona (umum)')), ...zonasAll.map(z => { zChecks[z.id] = el('input', { type: 'checkbox' }); return el('label', { class: 'check-item pick' }, zChecks[z.id], el('span', {}, z.nama_area + (z.status === 'Nonaktif' ? ' (nonaktif)' : ''))); }));
    const setZ = v => { const zs = qZones({ zona_id: v }); allCb.checked = zs === 'ALL'; Object.keys(zChecks).forEach(id => zChecks[id].checked = zs !== 'ALL' && zs.indexOf(id) !== -1); syncZ(); };
    const getZ = () => allCb.checked ? 'ALL' : Object.keys(zChecks).filter(id => zChecks[id].checked);
    const filter = sel([{ v: '', t: 'Tampilkan semua' }].concat(zonaOpts));
    const save = el('button', { class: 'btn primary' }, 'Simpan pertanyaan'); const reset = el('a', { class: 'link', onclick: () => { editing = null; teks.value = ''; untuk.value = 'Keduanya'; drain.checked = false; setZ('ALL'); } }, 'Pertanyaan baru'); setZ('ALL');
    const zLabel = q => { const zs = qZones(q); return zs === 'ALL' ? 'Semua zona' : !zs.length ? 'Tanpa zona' : 'Zona: ' + zs.map(zonaName).join(', '); };
    const list = el('div', { class: 'list' });
    const render = () => { const rs = rows.filter(q => !filter.value || (filter.value === 'ALL' ? qZones(q) === 'ALL' : qAppliesTo(q, filter.value))).sort((a, b) => (qZones(a) === 'ALL' ? 0 : 1) - (qZones(b) === 'ALL' ? 0 : 1) || zLabel(a).localeCompare(zLabel(b)));
      list.replaceChildren(...(rs.length ? rs.map(q => el('div', { class: 'card row-card', onclick: () => { editing = q; teks.value = q.teks_pertanyaan; untuk.value = q.berlaku_untuk; drain.checked = q.terkait_drain === 'Y'; setZ(q.zona_id); teks.scrollIntoView({ behavior: 'smooth', block: 'center' }); } },
        el('div', { class: 'info' }, el('b', {}, q.teks_pertanyaan), el('span', {}, zLabel(q) + ' · ' + q.berlaku_untuk + (q.terkait_drain === 'Y' ? ' · N/A saat drain/perbaikan' : ''))), el('span', { class: 'pill ' + (q.status === 'Aktif' ? 'ok' : 'Nonaktif') }, q.status),
        el('button', { class: 'btn sm', onclick: async e => { e.stopPropagation(); try { await apiSave('upsertQuestion', { question: { id: q.id, terkait_drain: q.terkait_drain === 'Y', status: q.status === 'Aktif' ? 'Nonaktif' : 'Aktif' } }); go('admin', { tab: 'pertanyaan' }); } catch (err) { toast(err.message, true); } } }, q.status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan'),
        el('button', { class: 'btn danger sm', onclick: async e => { e.stopPropagation(); if (!await confirmModal('Hapus pertanyaan "' + q.teks_pertanyaan + '"?\nBila sudah pernah dipakai di checklist/spot-check, pertanyaan hanya dinonaktifkan agar histori tetap valid.')) return;
          try { const r = await apiSave('deleteQuestion', { id: q.id }); toast(r.mode === 'hapus' ? 'Pertanyaan dihapus permanen' : 'Pertanyaan dinonaktifkan (sudah dipakai di ' + r.terkait + ' pengisian)'); go('admin', { tab: 'pertanyaan' }); } catch (err) { toast(err.message, true); } } }, 'Hapus'))) : [el('p', { class: 'empty' }, 'Belum ada pertanyaan')]));   /* v1.9.1: Hapus */ };
    filter.addEventListener('change', render); render();
    b.replaceChildren(el('div', { class: 'card form' }, el('div', { class: 'section-head' }, el('h3', {}, 'Survey Builder'), reset), el('p', { class: 'hint' }, 'Pertanyaan "Semua zona" berlaku di seluruh zona pabrik; pertanyaan khusus hanya muncul di zona yang dicentang (boleh lebih dari satu — v1.7.1; bisa juga dipilih dari tab Zona saat mengedit zona). Perubahan berlaku untuk pengisian berikutnya (non-retroaktif).'),
      fld('Pertanyaan', teks), fld('Berlaku untuk modul', untuk), el('label', { class: 'toggle' }, drain, 'N/A saat kondisi khusus (drain / perbaikan equipment)'), el('div', { class: 'field' }, el('span', {}, 'Berlaku di zona (boleh lebih dari satu)'), zBox), save),
      el('div', { class: 'section-head' }, el('h3', {}, 'Daftar pertanyaan (' + rows.length + ')'), fld('', filter)), list);
    save.addEventListener('click', async () => { if (!teks.value) return toast('Teks pertanyaan wajib', true); const zs = getZ(); if (zs !== 'ALL' && !zs.length) return toast('Pilih minimal satu zona atau centang "Semua zona"', true);
      try { await apiSave('upsertQuestion', { question: { id: editing ? editing.id : undefined, teks_pertanyaan: teks.value, berlaku_untuk: untuk.value, terkait_drain: drain.checked, zona_id: zs } }); toast('Tersimpan'); go('admin', { tab: 'pertanyaan' }); } catch (e) { toast(e.message, true); } });
  }
  async function adminUser(b) {
    const superA = S.user.role === 'SuperAdmin'; if (!superA && needScope(b)) return;
    const rows = await api('listUsers', {}); const nama = el('input', { placeholder: 'Nama' }), idl = el('input', { placeholder: 'ID login (huruf/angka, tanpa spasi)' }), pin = el('input', { placeholder: 'Password (min. 6 karakter; default 123456; kosongkan = tidak diubah)', autocomplete: 'off' }); let editing = null;
    const role = sel(superA ? S.boot.roles.map(r => ({ v: r, t: roleLabel(r) })) : ['Mandor', 'PersonilRekanan']);
    const pab = sel(S.boot.pabrik.map(p => ({ v: p.id, t: p.nama }))); if (superA && S.scope !== 'ALL') pab.value = S.scope;
    // v1.12: Karyawan Organik & Admin boleh punya BANYAK lingkup (kotak centang); Mandor/Personil satu lingkup (ikut vendornya); role global otomatis semua
    const multiRole = r => r === 'KaryawanOrganik' || r === 'Admin'; const pabChecks = {};
    const pabMulti = el('div', { class: 'pick-list' }, ...S.boot.pabrik.map(p => { pabChecks[p.id] = el('input', { type: 'checkbox' }); return el('label', { class: 'check-item pick' }, pabChecks[p.id], el('span', {}, p.nama)); }));
    const curPabrik = () => S.boot.isMulti ? S.scope : S.user.pabrik_id;
    const vend = sel([]); const fillVend = () => { const pid = superA ? pab.value : curPabrik(); vend.replaceChildren(...S.boot.vendors.filter(v => v.pabrik_id === pid).map(v => el('option', { value: v.id }, v.nama))); }; fillVend(); pab.addEventListener('change', fillVend);
    const vendField = fld('Vendor', vend), pabField = fld('Pabrik / lingkup', pab), pabMultiField = el('div', { class: 'field' }, el('span', {}, 'Lingkup (boleh lebih dari satu)'), pabMulti); const isGlobalRole = r => r === 'Manajemen' || r === 'SuperAdmin';
    const syncFields = () => { const r = role.value; vendField.hidden = !(r === 'Mandor' || r === 'PersonilRekanan'); pabField.hidden = !superA || isGlobalRole(r) || multiRole(r); pabMultiField.hidden = !superA || !multiRole(r); }; role.addEventListener('change', syncFields); syncFields();
    const setPabs = v => { const ids = String(v || '').split(',').map(x => x.trim()); Object.keys(pabChecks).forEach(id => pabChecks[id].checked = ids.indexOf(id) !== -1); if (ids[0] && S.boot.pabrik.some(p => p.id === ids[0])) pab.value = ids[0]; };
    const getPab = () => multiRole(role.value) ? Object.keys(pabChecks).filter(id => pabChecks[id].checked).join(',') : pab.value;
    const title = el('h3', {}, superA ? 'Manajemen User (semua role & lingkup)' : 'Manajemen User (Mandor & Personil Rekanan)');
    // v1.10: pencarian user (nama, ID login, role, lingkup, vendor, status) — menyaring baris di klien
    const qIn = el('input', { type: 'search', placeholder: 'Cari nama, ID login, role, lingkup, vendor…', autocomplete: 'off' }); const qInfo = el('span', { class: 'hint' });
    const userSearch = el('div', { class: 'card form user-search' }, el('div', { class: 'section-head' }, el('h3', {}, 'Daftar user'), qInfo), qIn);
    const applySearch = () => { const terms = qIn.value.trim().toLowerCase().split(/\s+/).filter(Boolean); let n = 0; const els = b.querySelectorAll('.user-row');
      els.forEach(r => { const t = r.textContent.toLowerCase(); const ok = terms.every(w => t.indexOf(w) !== -1); r.hidden = !ok; if (ok) n++; }); qInfo.textContent = terms.length ? n + ' dari ' + els.length + ' user' : els.length + ' user'; };
    qIn.addEventListener('input', applySearch);
    // v1.9: impor user kolektif dari Excel/CSV (SheetJS dari cdnjs, dimuat saat dibutuhkan) — server API.importUsers
    const fileIn = el('input', { type: 'file', accept: '.xlsx,.xls,.csv' }); const prev = el('div'); let parsed = []; const impBtn = el('button', { class: 'btn primary sm', disabled: '' }, 'Impor');
    fileIn.addEventListener('change', async () => { const f = fileIn.files[0]; if (!f) return; prev.replaceChildren(el('p', { class: 'empty' }, 'Membaca berkas…')); impBtn.disabled = true;
      try { parsed = await parseUserFile(f); const bad = parsed.filter(r => !r.nama || !r.role).length;
        prev.replaceChildren(el('p', { class: 'hint' }, parsed.length + ' baris terbaca' + (bad ? ' · ' + bad + ' baris tanpa nama/role akan gagal' : '') + '. Periksa pratinjau lalu tekan Impor.'),
          el('table', { class: 'tbl' }, el('tr', {}, ...IMPORT_COLS.map(h => el('th', {}, h))), ...parsed.slice(0, 50).map(r => el('tr', {}, ...IMPORT_COLS.map(k => el('td', {}, k === 'password' ? (r[k] ? '••••••' : '(123456)') : r[k]))))),
          parsed.length > 50 ? el('p', { class: 'hint' }, '… dan ' + (parsed.length - 50) + ' baris lagi') : null); impBtn.disabled = !parsed.length; }
      catch (e) { prev.replaceChildren(el('p', { class: 'empty err' }, e.message)); } });
    impBtn.addEventListener('click', async () => { if (!parsed.length) return; if (!await confirmModal('Impor ' + parsed.length + ' user?\nBaris bermasalah akan dilewati dan dilaporkan; baris lain tetap dibuat.')) return; impBtn.disabled = true; prev.append(el('p', { class: 'empty' }, 'Mengimpor… mohon tunggu (server memproses ±0,5 detik per user)'));
      try { const r = await apiSave('importUsers', { rows: parsed });
        prev.replaceChildren(el('p', { class: 'hint' }, 'Selesai: ' + r.dibuat + ' user dibuat, ' + r.gagal + ' gagal. Sampaikan ID login & password ke tiap user.'),
          el('table', { class: 'tbl' }, el('tr', {}, ...['Baris', 'Nama', 'ID login', 'Role', 'Status'].map(h => el('th', {}, h))), ...r.hasil.map(x => el('tr', {}, el('td', {}, x.baris), el('td', {}, x.nama), el('td', {}, x.id), el('td', {}, x.role), el('td', { class: x.status === 'OK' ? '' : 'warn-text' }, x.status)))));
        parsed = []; fileIn.value = ''; }
      catch (e) { toast(e.message, true); impBtn.disabled = false; } });
    const impCard = el('div', { class: 'card form' }, el('div', { class: 'section-head' }, el('h3', {}, 'Impor user kolektif (Excel/CSV)'), el('a', { class: 'link', onclick: () => downloadUserTemplate().catch(e => toast(e.message, true)) }, 'Unduh template Excel')),
      el('p', { class: 'hint' }, 'Kolom: nama, id_login (opsional), role, pabrik_id, vendor, password (opsional; kosong = 123456). ' + (superA ? 'Super Admin boleh semua role & lingkup.' : 'Admin lingkup: hanya Mandor & Personil Rekanan di ' + scopeName() + ' (kolom pabrik_id diabaikan).') + ' Maks. 200 baris per berkas.'),
      el('div', { class: 'form-row' }, fld('Berkas .xlsx / .csv', fileIn), impBtn), prev);
    const save = el('button', { class: 'btn primary' }, 'Simpan user'); const reset = el('a', { class: 'link', onclick: () => { editing = null; nama.value = idl.value = pin.value = ''; idl.disabled = false; setPabs(S.scope !== 'ALL' ? S.scope : ''); syncFields(); title.textContent = 'User baru'; } }, 'User baru');
    const pabName = pabNames;   // v1.12: daftar lingkup dipisah koma → nama-nama
    // v1.7.3: reset password lewat dialog (antisipasi user lupa/salah password) — server upsertUser → hashPin_(checkPassword_)
    const resetPw = u => { const p1 = el('input', { type: 'password', placeholder: 'Password baru (min. 6 karakter)', autocomplete: 'new-password' }), p2 = el('input', { type: 'password', placeholder: 'Ulangi', autocomplete: 'new-password' });
      const ok = el('button', { class: 'btn primary', onclick: async () => { if (p1.value.length < 6) return toast('Password minimal 6 karakter', true); if (p1.value !== p2.value) return toast('Ulangan password tidak sama', true); ok.disabled = true;
        try { await api('upsertUser', { user: { id: u.id, role: u.role, pabrik_id: u.pabrik_id, vendor_id: u.vendor_id, pin: p1.value } }); closeModal(); toast('Password ' + u.nama + ' direset — sampaikan password baru ke yang bersangkutan'); } catch (err) { toast(err.message, true); ok.disabled = false; } } }, 'Simpan password baru');
      modal(el('div', { class: 'form' }, el('div', { class: 'section-head' }, el('h3', {}, 'Reset password: ' + u.nama), el('a', { class: 'link', onclick: closeModal }, 'Batal')), el('p', { class: 'hint' }, 'ID login ' + u.id + ' · ' + roleLabel(u.role) + '. Password lama tidak diperlukan; user dapat menggantinya lagi lewat "Akun & password".'), fld('Password baru', p1), fld('Ulangi password baru', p2), ok)); };
    b.replaceChildren(el('div', { class: 'card form' }, el('div', { class: 'section-head' }, title, reset), el('div', { class: 'form-row' }, fld('Nama', nama), fld('ID login', idl)), el('div', { class: 'form-row' }, fld('Role', role), pabField), pabMultiField, el('div', { class: 'form-row' }, vendField, fld('Password (reset)', pin)), save), impCard, userSearch,
      el('div', { class: 'list' }, ...rows.map((u, ui) => { const aktif = u.status !== 'Nonaktif'; const dup = rows.findIndex(x => String(x.id) === String(u.id)) !== ui;   /* v1.9.3: baris ganda */
        const edit = () => { editing = u; nama.value = u.nama; idl.value = u.id; idl.disabled = true; role.value = u.role; if (superA && !isGlobalRole(u.role)) { setPabs(u.pabrik_id); fillVend(); } vend.value = u.vendor_id; pin.value = ''; syncFields(); title.textContent = 'Edit user: ' + u.nama; nama.scrollIntoView({ behavior: 'smooth', block: 'center' }); toast('Ubah data lalu "Simpan user"; isi kolom Password hanya bila ingin mereset'); };
        return el('div', { class: 'card row-card user-row', onclick: edit },
          el('div', { class: 'info' }, el('b', {}, u.nama + ' (' + u.id + ')'), el('span', {}, roleLabel(u.role) + ' · ' + pabName(u.pabrik_id) + (u.vendor_id ? ' · ' + vendorName(u.vendor_id) : ''))), el('span', { class: 'pill ' + (dup ? 'Open' : aktif ? 'ok' : 'Nonaktif') }, dup ? 'DUPLIKAT' : aktif ? 'Aktif' : 'Nonaktif'),
          el('div', { class: 'row-actions' }, dup ? el('button', { class: 'btn danger sm', onclick: async e => { e.stopPropagation(); if (!await confirmModal('Hapus baris ganda untuk ID "' + u.id + '"?\nBaris pertama dipertahankan; baris ganda dihapus permanen dari tab Users.')) return; try { const r = await api('removeDuplicateUser', { id: u.id }); toast(r.dihapus + ' baris ganda dihapus'); go('admin', { tab: 'user' }); } catch (err) { toast(err.message, true); } } }, 'Hapus duplikat') : null, el('button', { class: 'btn sm', onclick: e => { e.stopPropagation(); edit(); } }, 'Edit'), el('button', { class: 'btn sm', onclick: e => { e.stopPropagation(); resetPw(u); } }, 'Reset password'),
            u.id !== S.user.id ? el('button', { class: 'btn sm', onclick: async e => { e.stopPropagation(); try { await api('upsertUser', { user: { id: u.id, role: u.role, pabrik_id: u.pabrik_id, vendor_id: u.vendor_id, status: aktif ? 'Nonaktif' : 'Aktif' } }); toast(aktif ? 'User dinonaktifkan' : 'User diaktifkan'); go('admin', { tab: 'user' }); } catch (err) { toast(err.message, true); } } }, aktif ? 'Nonaktifkan' : 'Aktifkan') : null)); })));
    applySearch();
    save.addEventListener('click', async () => { if (!nama.value) return toast('Nama wajib', true); if (superA && multiRole(role.value) && !getPab()) return toast('Pilih minimal satu lingkup', true); if (save.disabled) return; save.disabled = true; setTimeout(() => { save.disabled = false; }, 8000); /* v1.9.3: cegah klik ganda → user ganda */ try { const r = await apiSave('upsertUser', { user: { id: editing ? editing.id : undefined, id_login: idl.value, nama: nama.value, role: role.value, pabrik_id: superA ? getPab() : undefined, vendor_id: vend.value, pin: pin.value } }); toast((editing ? 'User diperbarui' : 'User dibuat') + ' · ID login: ' + r.id + (!editing && !pin.value ? ' · password 123456' : '')); /* v1.9: ID login final ditampilkan (huruf kecil, spasi → "-") */ go('admin', { tab: 'user' }); } catch (e) { toast(e.message, true); } });
  }
  async function adminVendor(b) { if (needScope(b)) return; const nama = el('input', { placeholder: 'Nama rekanan/kontrak' }); const save = el('button', { class: 'btn primary' }, 'Tambah vendor');
    b.replaceChildren(el('div', { class: 'card form' }, el('h3', {}, 'Vendor / Rekanan'), fld('Nama', nama), save), el('div', { class: 'list' }, ...S.boot.vendors.map(v => el('div', { class: 'card row-card' }, el('div', { class: 'info' }, el('b', {}, v.nama), el('span', {}, v.id)), el('span', { class: 'pill ok' }, v.status)))));
    save.addEventListener('click', async () => { try { await apiSave('upsertVendor', { vendor: { nama: nama.value } }); toast('Vendor ditambah'); go('admin', { tab: 'vendor' }); } catch (e) { toast(e.message, true); } }); }
  async function adminJadwal(b) { if (needScope(b)) return; const rows = await api('listSchedules', {}); const zona = sel([{ v: 'ALL', t: 'Semua zona' }].concat(S.boot.zones.map(z => ({ v: z.id, t: z.nama_area })))), jenis = el('input', { value: 'Drain' }), m = el('input', { type: 'datetime-local' }), s = el('input', { type: 'datetime-local' }), sla = el('input', { type: 'number', value: 45 }); const save = el('button', { class: 'btn primary' }, 'Simpan jadwal');
    b.replaceChildren(el('div', { class: 'card form' }, el('h3', {}, 'Kalender Aktivitas Operasional'), el('p', { class: 'hint' }, 'Temuan/checklist dalam jendela ini diperlakukan sebagai exception (SLA khusus, item drain = N/A)'), fld('Zona', zona), fld('Jenis aktivitas', jenis), el('div', { class: 'form-row' }, fld('Mulai', m), fld('Selesai', s)), fld('SLA respons khusus (menit)', sla), save),
      el('table', { class: 'tbl' }, el('tr', {}, ...['Aktivitas', 'Zona', 'Mulai', 'Selesai', 'SLA'].map(h => el('th', {}, h))), ...rows.map(r => el('tr', {}, el('td', {}, r.jenis_aktivitas), el('td', {}, r.zona_id === 'ALL' ? 'Semua' : zonaName(r.zona_id)), el('td', {}, fmtDT(r.waktu_mulai)), el('td', {}, fmtDT(r.waktu_selesai)), el('td', {}, r.sla_respons_menit + 'm')))));
    save.addEventListener('click', async () => { try { await api('upsertSchedule', { schedule: { zona_id: zona.value, jenis_aktivitas: jenis.value, waktu_mulai: m.value, waktu_selesai: s.value, sla_respons_menit: sla.value } }); toast('Jadwal tersimpan'); go('admin', { tab: 'jadwal' }); } catch (e) { toast(e.message, true); } }); }
  /** Admin › Bobot (v1.9.1): tiga kelompok — bobot komponen HQI (dengan total langsung), parameter SLA, parameter lain. Server: updateWeightConfig (total wajib 100). */
  async function adminBobot(b) { const cfg = S.boot.config; const F = {};
    const mk = (k, l, extra) => { F[k] = el('input', Object.assign({ type: 'number', value: cfg[k] == null ? '' : cfg[k], min: 0 }, extra || {})); return fld(l, F[k]); };
    const G1 = [['bobot_temuan', 'Temuan % (0 = hanya indikator)'], ['bobot_sla', 'SLA %'], ['bobot_spotcheck', 'Spot-Check %'], ['bobot_checklist', 'Checklist Harian %'], ['bobot_kepatuhan', 'Kepatuhan Checklist %']];
    const G2 = [['sla_mendesak', 'Target Mendesak (menit)'], ['sla_tinggi', 'Target Tinggi (menit)'], ['sla_sedang', 'Target Sedang (menit)'], ['sla_rendah', 'Target Rendah (menit)'], ['buffer_menit', 'Buffer toleransi (menit)']];
    const G3 = [['ambang_batas_anomali', 'Ambang anomali validasi silang (poin)'], ['spotcheck_min_per_zona', 'Kuota spot-check min. per zona/bulan (0 = nonaktif)']];
    const total = el('div', { class: 'bobot-total' }); const sumB = () => G1.reduce((s, [k]) => s + (Number(F[k].value) || 0), 0);
    const refreshTotal = () => { const t = Math.round(sumB() * 100) / 100; total.className = 'bobot-total' + (t === 100 ? ' ok' : ' err'); total.replaceChildren(el('span', {}, 'Total bobot'), el('b', {}, t + '%'), el('em', {}, t === 100 ? 'sesuai (harus 100%)' : (t < 100 ? 'kurang ' + Math.round((100 - t) * 100) / 100 + '%' : 'lebih ' + Math.round((t - 100) * 100) / 100 + '%'))); };
    const keys = G1.concat(G2, G3); const save = el('button', { class: 'btn primary' }, 'Simpan (berlaku ke depan, global)');
    const card1 = el('div', { class: 'card form' }, el('h3', {}, '1. Bobot komponen HQI'), el('p', { class: 'hint' }, 'Total wajib 100%. Sejak v1.8 (18 Sep 2026) Temuan berbobot 0% = hanya indikator; rumus Temuan aktif kembali bila diberi bobot > 0. Berlaku ke depan (skor periode lalu tidak berubah), global lintas pabrik, tercatat di log.'),
      el('div', { class: 'form-row' }, ...G1.map(([k, l]) => mk(k, l, { max: 100 }))), total);
    const card2 = el('div', { class: 'card form' }, el('h3', {}, '2. Parameter SLA (target penyelesaian per prioritas)'), el('p', { class: 'hint' }, 'Dihitung dalam menit jam kerja efektif sejak temuan Open; buffer toleransi ditambahkan ke tiap target.'), el('div', { class: 'form-row' }, ...G2.map(([k, l]) => mk(k, l))));
    const card3 = el('div', { class: 'card form' }, el('h3', {}, '3. Parameter lain'), el('p', { class: 'hint' }, 'Ambang anomali: selisih skor checklist vs spot-check (0–100) yang memicu review. Kuota spot-check: bila kurang, kekurangan diisi skor checklist terverifikasi (bukan otomatis 100).'), el('div', { class: 'form-row' }, ...G3.map(([k, l]) => mk(k, l))), save);
    G1.forEach(([k]) => F[k].addEventListener('input', refreshTotal)); refreshTotal();
    b.replaceChildren(el('div', { class: 'greeting' }, el('h3', {}, 'Bobot HQI & Parameter'), el('p', {}, 'Berlaku sejak ' + String(cfg.berlaku_mulai || '').slice(0, 10) + (cfg.changed_by ? ' · diubah oleh ' + cfg.changed_by : ''))), card1, card2, card3);
    save.addEventListener('click', async () => { if (Math.round(sumB()) !== 100) return toast('Total bobot komponen HQI harus 100% (sekarang ' + sumB() + '%)', true); const config = {}; keys.forEach(([k]) => config[k] = Number(F[k].value) || 0);
      try { await apiSave('updateWeightConfig', { config }); toast('Konfigurasi tersimpan — berlaku mulai hari ini'); go('admin', { tab: 'bobot' }); } catch (e) { toast(e.message, true); } }); }
  async function adminReview(b) { const [an, pb] = await Promise.all([api('listAnomali', {}), api('listPekerjaanBesar', {})]);   /* v1.16: paralel */
    b.replaceChildren(el('div', { class: 'section-head' }, el('h3', {}, 'Anomali validasi silang (' + an.length + ')')), el('div', { class: 'list' }, ...an.map(c => el('div', { class: 'card form' }, el('b', {}, zonaName(c.zona_id) + ' · skor checklist ' + c.skor), el('span', { class: 'hint' }, fmtDT(c.timestamp)), el('div', { class: 'form-row' }, el('button', { class: 'btn danger sm', onclick: () => rv(c.id, true) }, 'Penyimpangan nyata (keluarkan dari skor)'), el('button', { class: 'btn sm', onclick: () => rv(c.id, false) }, 'Bukan penyimpangan'))))),
      el('div', { class: 'section-head' }, el('h3', {}, 'Pengajuan tambahan waktu SLA (' + pb.length + ')')), findingList(pb));
    async function rv(id, real) { try { await api('reviewAnomali', { id, penyimpangan_nyata: real }); toast('Tersimpan'); go('admin', { tab: 'review' }); } catch (e) { toast(e.message, true); } } }
  /** Admin › Log (v1.11): filter aksi / user / rentang tanggal; klik baris = detail sebelum/sesudah. */
  async function adminLog(b) { const aksi = sel([{ v: '', t: 'Semua aksi' }]), oleh = sel([{ v: '', t: 'Semua user' }]), dari = el('input', { type: 'date' }), sampai = el('input', { type: 'date' }); const box = el('div'); const info = el('span', { class: 'hint' }); let filled = false;
    const pretty = s => { try { return JSON.stringify(JSON.parse(s), null, 2); } catch (e) { return String(s || '-'); } };
    const load = async () => { box.replaceChildren(el('p', { class: 'empty' }, 'Memuat...')); try { let d = await api('adminLog', { limit: 300, aksi: aksi.value, admin_id: oleh.value, dari: dari.value, sampai: sampai.value }); if (Array.isArray(d)) d = { rows: d, total: d.length, aksi: [], admin: [] };
        if (!filled) { filled = true; d.aksi.forEach(x => aksi.append(el('option', { value: x }, x))); d.admin.forEach(x => oleh.append(el('option', { value: x }, x))); }
        info.textContent = d.rows.length + (d.total > d.rows.length ? ' dari ' + d.total : '') + ' entri';
        box.replaceChildren(d.rows.length ? el('table', { class: 'tbl' }, el('tr', {}, ...['Waktu', 'Oleh', 'Aksi', 'Entitas', 'Detail'].map(x => el('th', {}, x))), ...d.rows.map(r => el('tr', { style: 'cursor:pointer', onclick: () => modal(el('div', { class: 'form' }, el('div', { class: 'section-head' }, el('h3', {}, r.aksi + ' · ' + r.entitas), el('a', { class: 'link', onclick: closeModal }, 'Tutup')), el('p', { class: 'hint' }, fmtDT(r.timestamp) + ' · oleh ' + r.admin_id + (r.id_entitas ? ' · id ' + r.id_entitas : '')), el('b', {}, 'Sebelum'), el('pre', { class: 'log-pre' }, pretty(r.detail_sebelum)), el('b', {}, 'Sesudah'), el('pre', { class: 'log-pre' }, pretty(r.detail_sesudah)))) },
          el('td', {}, fmtDT(r.timestamp)), el('td', {}, r.admin_id), el('td', {}, r.aksi), el('td', {}, r.entitas), el('td', {}, String(r.detail_sesudah || '').slice(0, 120))))) : el('p', { class: 'empty' }, 'Tidak ada entri log untuk filter ini')); }
      catch (e) { box.replaceChildren(el('p', { class: 'empty err' }, e.message)); } };
    [aksi, oleh, dari, sampai].forEach(x => x.addEventListener('change', load));
    b.replaceChildren(el('div', { class: 'card form' }, el('div', { class: 'section-head' }, el('h3', {}, 'Log admin'), info), el('div', { class: 'form-row' }, fld('Aksi', aksi), fld('Oleh', oleh)), el('div', { class: 'form-row' }, fld('Dari tanggal', dari), fld('Sampai tanggal', sampai)), el('a', { class: 'link', onclick: () => { aksi.value = oleh.value = dari.value = sampai.value = ''; load(); } }, 'Hapus filter')), box); load(); }
  /** Admin › Data (v1.15, Admin lingkup & Super Admin): daftar temuan / checklist / spot-check per periode & zona, hapus yang tidak sesuai (alasan wajib, tercatat di log). */
  async function adminData(b) { if (needScope(b)) return;
    const tipe = sel([{ v: 'temuan', t: 'Temuan' }, { v: 'checklist', t: 'Checklist rekanan' }, { v: 'spot', t: 'Spot-check organik' }]);
    const preset = sel([{ v: 'bulan', t: 'Bulan ini' }, { v: '30', t: '30 hari terakhir' }, { v: '90', t: '3 bulan terakhir' }]); const zsel = sel([{ v: '', t: 'Semua zona' }].concat(S.boot.zones.map(z => ({ v: z.id, t: z.nama_area })))); const list = el('div', { class: 'list' }); const info = el('span', { class: 'hint' });
    const range = () => { const end = today(); if (preset.value === 'bulan') return { periode_mulai: end.slice(0, 8) + '01', periode_selesai: end }; const d = new Date(); d.setDate(d.getDate() - Number(preset.value)); return { periode_mulai: d.toISOString().slice(0, 10), periode_selesai: end }; };
    const hapus = (r, label) => { const alasan = el('input', { placeholder: 'mis. salah zona / uji coba / foto tidak sesuai / dobel' });
      modal(el('div', { class: 'form' }, el('h3', {}, 'Hapus ' + label + '?'), el('p', { class: 'hint' }, zonaName(r.zona_id) + ' · ' + fmtDT(r.timestamp_open || r.timestamp) + ' · oleh ' + r.oleh + '. Penghapusan permanen (foto tetap di Drive), tercatat di log beserta alasan; skor HQI dihitung ulang pada kalkulasi berikutnya.'), fld('Alasan (wajib)', alasan),
        el('div', { class: 'form-row' }, el('button', { class: 'btn', onclick: closeModal }, 'Batal'), el('button', { class: 'btn danger', onclick: async () => { if (!alasan.value.trim()) return toast('Alasan wajib diisi', true); try { await api('deleteRecord', { tipe: tipe.value, id: r.id, alasan: alasan.value.trim() }); closeModal(); toast(label + ' dihapus'); load(); } catch (err) { toast(err.message, true); } } }, 'Hapus permanen')))); };
    const load = async () => { list.replaceChildren(el('p', { class: 'empty' }, 'Memuat...')); try { const rows = await api('adminRecords', Object.assign({ tipe: tipe.value, zona_id: zsel.value }, range())); const label = tipe.options[tipe.selectedIndex].text; info.textContent = rows.length + ' ' + label.toLowerCase();
        list.replaceChildren(...(rows.length ? rows.map(r => { const ph = el('div', { class: 'ba', style: 'width:76px;height:52px' }, el('div', { class: 'before' })); const fid = r.foto_open || r.foto1 || r.foto; if (fid) photoImg(fid).then(i => { if (i.src) ph.firstChild.replaceWith(i); });
          const t = tipe.value; const main = t === 'temuan' ? r.kategori + ' · ' + zonaName(r.zona_id) : zonaName(r.zona_id) + ' · skor ' + nz(r.skor);
          const sub = t === 'temuan' ? 'Prioritas ' + r.prioritas + ' · ' + fmtDT(r.timestamp_open) + ' · pelapor ' + r.oleh : fmtDT(r.timestamp) + ' · oleh ' + r.oleh + (r.status_verifikasi ? ' · ' + r.status_verifikasi : '') + (r.is_anomali === 'Y' ? ' · ANOMALI' : '');
          const badge = t === 'temuan' ? el('span', { class: 'pill ' + r.status }, stLabel(r.status)) : el('span', { class: 'pill ' + scoreCls(r.skor) }, nz(r.skor));
          const openIt = () => { if (t === 'temuan') openFindingPopup(r); else openEntriesPopup(S.boot.zones.find(z => z.id === r.zona_id) || { nama_area: zonaName(r.zona_id), vendor_id: r.vendor_id }, [Object.assign({}, r, { oleh: r.oleh })], t); };
          return el('div', { class: 'card row-card user-row', onclick: openIt }, ph, el('div', { class: 'info' }, el('b', {}, main), el('span', {}, sub)), badge, el('div', { class: 'row-actions' }, el('button', { class: 'btn danger sm', onclick: e => { e.stopPropagation(); hapus(r, label); } }, 'Hapus'))); }) : [el('p', { class: 'empty' }, 'Tidak ada data pada filter ini')])); }
      catch (e) { list.replaceChildren(el('p', { class: 'empty err' }, e.message)); } };
    [tipe, preset, zsel].forEach(x => x.addEventListener('change', load));
    b.replaceChildren(el('div', { class: 'card form' }, el('div', { class: 'section-head' }, el('h3', {}, 'Data transaksi'), info), el('p', { class: 'hint' }, 'Tap baris untuk melihat detail & foto. Hapus hanya data yang tidak sesuai (salah zona, uji coba, foto tidak sesuai, dobel); alasan wajib dan tercatat di log admin. Skor HQI mengikuti pada kalkulasi berikutnya.'), el('div', { class: 'form-row' }, fld('Jenis data', tipe), fld('Periode', preset)), fld('Zona', zsel)), list); load(); }
  /** Admin › Arsip (v1.11, Super Admin): pindahkan data transaksi tahun yang sudah lewat ke spreadsheet arsip agar DB utama tetap ringan. */
  async function adminArsip(b) { b.replaceChildren(el('p', { class: 'empty' }, 'Menghitung isi database...')); const d = await api('archiveInfo', {}); const years = Object.keys(d.per_tahun).sort();
    const tblRows = years.map(y => { const lewat = y < d.tahun_ini; const n = d.tab.reduce((s, t) => s + (d.per_tahun[y][t] || 0), 0);
      const btn = lewat ? el('button', { class: 'btn danger sm', onclick: async e => { if (!await confirmModal('Arsipkan data tahun ' + y + ' (' + n + ' baris)?\n\n• Temuan Close, checklist, spot-check, dan log tahun ' + y + ' dipindahkan ke spreadsheet "Horizon_Arsip_' + y + '" di folder Drive Horizon HQI.\n• Temuan yang belum Close tetap di aplikasi. Foto tidak dipindah.\n• Setelah diarsipkan, laporan & heatmap untuk tahun ' + y + ' tidak lagi tampil di aplikasi (ringkasan HQI bulanan tetap ada). Data tetap bisa dibuka di berkas arsip.')) return;
          e.target.disabled = true; e.target.textContent = 'Mengarsipkan…'; try { const r = await api('archiveYear', { tahun: y }); toast('Arsip ' + y + ' selesai: ' + d.tab.map(t => t + ' ' + (r[t] || 0)).join(', ')); go('admin', { tab: 'arsip' }); } catch (err) { toast(err.message, true); e.target.disabled = false; e.target.textContent = 'Arsipkan ' + y; } } }, 'Arsipkan ' + y) : el('span', { class: 'hint' }, 'tahun berjalan');
      return el('tr', {}, el('td', {}, el('b', {}, y)), ...d.tab.map(t => el('td', {}, d.per_tahun[y][t] || 0)), el('td', {}, btn)); });
    b.replaceChildren(el('div', { class: 'card form' }, el('h3', {}, 'Arsip data per tahun'), el('p', { class: 'hint' }, 'Makin banyak baris di Google Sheets, makin lambat aplikasi. Arsipkan tahun yang sudah lewat untuk memindahkan data transaksinya ke spreadsheet terpisah. Data master (user, zona, vendor, pertanyaan, bobot) dan ringkasan HQI bulanan tidak diarsipkan.'),
        el('div', { class: 'tbl-wrap' }, el('table', { class: 'tbl' }, el('tr', {}, el('th', {}, 'Tahun'), ...d.tab.map(t => el('th', {}, t)), el('th', {}, '')), ...(tblRows.length ? tblRows : [el('tr', {}, el('td', { colspan: d.tab.length + 2 }, 'Belum ada data transaksi'))]), el('tr', {}, el('td', {}, el('b', {}, 'Total kini')), ...d.tab.map(t => el('td', {}, el('b', {}, d.total[t] || 0))), el('td', {}))))),
      el('div', { class: 'card form' }, el('h3', {}, 'Berkas arsip'), d.arsip.length ? el('div', { class: 'list' }, ...d.arsip.map(f => el('div', { class: 'card row-card' }, el('div', { class: 'info' }, el('b', {}, f.nama), el('span', {}, 'Diubah ' + fmtDT(f.diubah))), el('a', { class: 'link', href: f.url, target: '_blank', rel: 'noopener' }, 'Buka di Sheets')))) : el('p', { class: 'empty' }, 'Belum ada arsip'))); }

  // ================= NOTIFIKASI

  // ---------------- impor user kolektif (v1.9): SheetJS dari cdnjs dimuat saat dibutuhkan; template .xlsx dibuat di klien
  const IMPORT_COLS = ['nama', 'id_login', 'role', 'pabrik_id', 'vendor', 'password'];
  function loadXLSX() { if (window.XLSX) return Promise.resolve(); return new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload = res; s.onerror = () => rej(new Error('Gagal memuat pustaka Excel (SheetJS dari cdnjs) — periksa koneksi')); document.head.append(s); }); }
  async function parseUserFile(file) { await loadXLSX(); const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' }); const ws = wb.Sheets[wb.SheetNames[0]]; if (!ws) throw new Error('Berkas kosong');
    const alias = { 'idlogin': 'id_login', 'id': 'id_login', 'login': 'id_login', 'pabrik': 'pabrik_id', 'lingkup': 'pabrik_id', 'pabrikid': 'pabrik_id', 'vendorid': 'vendor', 'rekanan': 'vendor', 'sandi': 'password', 'katasandi': 'password', 'pin': 'password', 'peran': 'role' };
    const key = k => { const s = String(k).trim().toLowerCase().replace(/[\s_-]+/g, ''); const std = IMPORT_COLS.find(c => c.replace(/_/g, '') === s); return std || alias[s] || null; };
    const raw = XLSX.utils.sheet_to_json(ws, { defval: '' }); if (!raw.length) throw new Error('Tidak ada baris data di sheet pertama');
    return raw.map(r => { const o = {}; IMPORT_COLS.forEach(c => o[c] = ''); Object.keys(r).forEach(k => { const c = key(k); if (c) o[c] = String(r[k]).trim(); }); return o; }).filter(o => Object.values(o).some(v => v)); }
  async function downloadUserTemplate() { await loadXLSX(); const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([IMPORT_COLS, ['Budi Santoso', 'budi.santoso', 'PersonilRekanan', 'ZA2', 'PT Contoh Bersih', ''], ['Siti Aminah', '', 'Mandor', 'ZA2', 'PT Contoh Bersih', 'rahasia1'], ['Andi Wijaya', 'andi.w', 'KaryawanOrganik', 'SASU3A', '', '']]);
    ws['!cols'] = [{ wch: 26 }, { wch: 18 }, { wch: 20 }, { wch: 12 }, { wch: 28 }, { wch: 16 }]; XLSX.utils.book_append_sheet(wb, ws, 'User');
    const ref = XLSX.utils.aoa_to_sheet([['Kolom', 'Keterangan'], ['nama', 'Wajib. Nama lengkap.'], ['id_login', 'Opsional. Huruf/angka; karakter lain jadi "-". Kosong = dibuat dari nama (Budi Santoso → budi-santoso).'], ['role', 'Wajib: PersonilRekanan / Mandor / KaryawanOrganik / Admin / Manajemen / SuperAdmin'], ['pabrik_id', 'Wajib kecuali Manajemen/SuperAdmin: ' + S.boot.pabrik.map(p => p.id + ' (' + p.nama + ')').join(', ') + '. Karyawan Organik/Admin boleh beberapa lingkup dipisah koma, mis. ZA2,SASU3A'], ['vendor', 'Wajib untuk Mandor & PersonilRekanan: nama/ID vendor persis seperti di Admin › Vendor'], ['password', 'Opsional, min. 6 karakter. Kosong = 123456'], [], ['Vendor terdaftar (lingkup aktif)', ''], ...S.boot.vendors.map(v => [v.nama, v.id + ' · ' + v.pabrik_id]), [], ['Contoh di baris 2–4 sheet "User" boleh dihapus/diganti. Maks. 200 baris per berkas.', '']]);
    ref['!cols'] = [{ wch: 34 }, { wch: 90 }]; XLSX.utils.book_append_sheet(wb, ref, 'Petunjuk'); XLSX.writeFile(wb, 'template_import_user_horizon.xlsx'); }

  // ---------------- v1.15: foto membesar saat kursor diarahkan (pratinjau mengambang) dan lightbox layar penuh saat diklik/di-tap
  const peek = el('div', { class: 'photo-peek hidden' }, el('img', { alt: '' })); document.body.append(peek);
  const lightbox = el('div', { class: 'lightbox hidden', onclick: () => lightbox.classList.add('hidden') }, el('img', { alt: '' }), el('span', { class: 'lb-hint' }, 'Tap di mana saja untuk menutup')); document.body.append(lightbox);
  const isPhotoEl = t => t && t.tagName === 'IMG' && t.src && (t.classList.contains('hz-photo') || t.closest('.camera-slot')) && !t.closest('.lightbox') && !t.closest('.photo-peek');
  const movePeek = e => { const W = innerWidth, H = innerHeight; const w = Math.min(520, W * .6), hh = Math.min(420, H * .6); peek.style.width = w + 'px'; peek.style.maxHeight = hh + 'px';
    let x = e.clientX + 18, y = e.clientY - hh / 2; if (x + w > W - 8) x = e.clientX - w - 18; if (x < 8) x = 8; y = Math.max(8, Math.min(y, H - hh - 8)); peek.style.left = x + 'px'; peek.style.top = y + 'px'; };
  document.addEventListener('mouseover', e => { const t = e.target; if (!isPhotoEl(t) || !matchMedia('(hover: hover)').matches) return; peek.firstChild.src = t.src; peek.classList.remove('hidden'); movePeek(e); });
  document.addEventListener('mousemove', e => { if (!peek.classList.contains('hidden')) movePeek(e); });
  document.addEventListener('mouseout', e => { if (isPhotoEl(e.target)) peek.classList.add('hidden'); });
  document.addEventListener('click', e => { const t = e.target; if (!isPhotoEl(t) || t.closest('.camera-slot')) return; e.stopPropagation(); peek.classList.add('hidden'); lightbox.firstChild.src = t.src; const fid = t.dataset.fid; lightbox.dataset.fid = fid || ''; if (fid && !S.cache[fid]) { lightbox.lastChild.textContent = 'Memuat foto penuh…'; photoData(fid).then(d => { if (lightbox.dataset.fid === fid) { lightbox.firstChild.src = d; lightbox.lastChild.textContent = 'Tap di mana saja untuk menutup'; } }).catch(() => { lightbox.lastChild.textContent = 'Tap di mana saja untuk menutup'; }); } else if (fid) lightbox.firstChild.src = S.cache[fid];   /* v1.25: foto penuh saat diketuk */ lightbox.classList.remove('hidden'); }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { lightbox.classList.add('hidden'); peek.classList.add('hidden'); } });

  // ---------------- small helpers
  function sel(opts) { const s = el('select'); opts.forEach(o => s.append(el('option', { value: typeof o === 'string' ? o : o.v }, typeof o === 'string' ? o : o.t))); return s; }
  function fld(label, input) { return el('label', { class: 'field' }, el('span', {}, label), input); }

  // ---------------- theme
  const sunP = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>', moonP = '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>';
  function applyTheme(t) { document.documentElement.setAttribute('data-theme', t); $('#theme-icon').innerHTML = t === 'light' ? moonP : sunP; store.set('hz_theme', t); }
  applyTheme(store.get('hz_theme') || 'dark');
  $('#btn-theme').addEventListener('click', () => applyTheme(document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light'));
  $('#btn-login').addEventListener('click', login); $('#login-pin').addEventListener('keydown', e => e.key === 'Enter' && login());
  { const qb = el('button', { class: 'icon-btn hidden', id: 'btn-queue', title: 'Antrean belum terkirim', onclick: () => openQueue(), html: '<svg viewBox="0 0 24 24"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>' }, el('span', { class: 'badge' }, '0')); $('#btn-logout').before(qb); }   /* v1.18 (O4) */
  $('#btn-logout').addEventListener('click', logout); $('#btn-guide').addEventListener('click', () => go('panduan'));
  // ---------------- v1.10: segarkan otomatis saat aplikasi kembali dari latar belakang atau lama tidak dipakai
  //  - kembali terlihat setelah ≥60 dtk tersembunyi, atau diam ≥5 menit → bootstrap ulang (zona, pertanyaan, bobot, badge) dan render ulang layar
  //    bila aman (Beranda, Heatmap, Leaderboard, daftar Temuan); layar berisi isian (form, kamera, Admin, Laporan, Checklist, Spot-Check) TIDAK dirender ulang
  //  - sesi habis → api() otomatis kembali ke login
  const SAFE_VIEWS = ['home', 'heatmap', 'leaderboard', 'temuan']; let hiddenAt = 0, lastAct = Date.now(), refreshing = false; S._lastRefresh = Date.now();
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, () => { lastAct = Date.now(); }, { passive: true }));
  async function autoRefresh(reason) { if (refreshing || !S.token || !S.user || !navigator.onLine || S.user.mustChange) return; refreshing = true;
    try { const view = S.view; let dash = null;   // v1.16: di Beranda, bootstrap + dashboard dalam satu panggilan
      const r = await fetchBoot(view === 'home'); S.boot = r.boot; dash = r.dash;
      S.user = S.boot.user; saveBoot(); S._lastRefresh = Date.now();
      if (dash && dash.ok) { saved.set('dashboard:' + S.scope, dash.data); if (S.view === 'home') preDash(dash); }
      const modalOpen = !$('#modal').classList.contains('hidden'); const hasForm = !!document.querySelector('#content .camera-slot, #content textarea');
      if (!modalOpen && !hasForm && !S.viewArg && SAFE_VIEWS.indexOf(S.view) !== -1) { const sc = $('#content').scrollTop; go(S.view); setTimeout(() => { $('#content').scrollTop = sc; }, 600); if (reason === 'kembali') toast('Data diperbarui'); } }
    catch (e) { /* offline / sesi habis ditangani api() */ }
    refreshing = false; }
  document.addEventListener('visibilitychange', () => { if (document.hidden) hiddenAt = Date.now(); else if (hiddenAt && Date.now() - hiddenAt >= 60000) { hiddenAt = 0; autoRefresh('kembali'); } });
  window.addEventListener('pageshow', e => { if (e.persisted) autoRefresh('kembali'); });
  window.addEventListener('online', () => autoRefresh('kembali'));
  setInterval(() => { if (!document.hidden && Date.now() - S._lastRefresh >= 300000 && Date.now() - lastAct >= 60000) autoRefresh('diam'); }, 30000);
  idb.open().then(() => { if (!navigator.onLine) $('#offline-bar').classList.remove('hidden'); if (S.token) boot(); else bangunkan(); });
})();

