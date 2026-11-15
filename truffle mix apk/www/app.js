'use strict';
/* TruffleMix móvil — biblioteca, playlists, búsqueda en YouTube y reproductor (IFrame API). */

const $ = (s, e = document) => e.querySelector(s);
const $$ = (s, e = document) => [...e.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- iconos ---------- */
const HEART = '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>';
const ICON = {
  play: ['f', '<path d="M8 5v14l11-7z"/>'],
  pause: ['f', '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>'],
  next: ['f', '<path d="M6 5l9 7-9 7zM17 5h2v14h-2z"/>'],
  prev: ['f', '<path d="M18 5l-9 7 9 7zM5 5h2v14H5z"/>'],
  heart: ['f', HEART],
  heart0: ['s', HEART],
  shuffle: ['s', '<path d="M3 7h4c4 0 6 10 10 10h3M3 17h4c1.5 0 2.700-1.200 3.700-2.700M13.300 9.700C14.300 8.200 15.500 7 17 7h3M18 4l3 3-3 3M18 14l3 3-3 3"/>'],
  repeat: ['s', '<path d="M4 11V9a3 3 0 013-3h12M16 3l3 3-3 3M20 13v2a3 3 0 01-3 3H5M8 21l-3-3 3-3"/>'],
  search: ['s', '<circle cx="11" cy="11" r="6.500"/><path d="M16 16l5 5"/>'],
  home: ['s', '<path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"/>'],
  lib: ['s', '<path d="M4 4v16M9 4v16M14 6l6 13"/>'],
  plus: ['s', '<path d="M12 5v14M5 12h14"/>'],
  check: ['s', '<path d="M5 12l5 5 9-10"/>'],
  dots: ['f', '<circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>'],
  down: ['s', '<path d="M6 9l6 6 6-6"/>'],
  back: ['s', '<path d="M15 5l-7 7 7 7"/>'],
  note: ['f', '<path d="M9 17V5l10-2v12" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="7" cy="17" r="3"/><circle cx="17" cy="15" r="3"/>'],
  edit: ['s', '<path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4"/>'],
  trash: ['s', '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>'],
  link: ['s', '<path d="M10 14a4 4 0 005.700 0l3-3a4 4 0 00-5.700-5.700l-1 1M14 10a4 4 0 00-5.700 0l-3 3a4 4 0 005.700 5.700l1-1"/>']
};
const ic = (n, c = '') => { const [t, b] = ICON[n]; return `<svg class="ic ${t === 's' ? 's' : ''} ${c}" viewBox="0 0 24 24" aria-hidden="true">${b}</svg>`; };

/* ---------- datos ---------- */
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin espacio */ } }
};
let lib = store.get('tm.lib', []);
let pls = store.get('tm.pls', []);
if (!pls.find(p => p.id === 'fav')) pls.unshift({ id: 'fav', nombre: 'Favoritos', pistas: [] });
const save = () => { store.set('tm.lib', lib); store.set('tm.pls', pls); };
const T = id => lib.find(t => t.id === id);
const P = id => pls.find(p => p.id === id);
const isFav = id => P('fav').pistas.includes(id);
const plural = n => n === 1 ? '1 canción' : n + ' canciones';
const fmt = s => {
  s = Math.max(0, Math.floor(s || 0));
  const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}`;
};
const thumb = id => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
function ensure(t) {
  let x = T(t.id);
  if (!x) { x = { id: t.id, titulo: t.titulo, artista: t.artista, dur: t.dur || 0 }; lib.push(x); save(); }
  return x;
}

/* ---------- estado ---------- */
let view = { name: 'home', arg: null }, ctxs = {}, ctxN = 0;
let libTab = 'songs', searchQ = '';
const ytCache = {};
let queue = [], qi = -1, cur = null, playing = false, shuffle = false, repeat = 0;
let yt = null, ytReady = false, pendingId = null, seeking = false, errStreak = 0, npOpen = false, toastT = null;

/* ---------- componentes ---------- */
const cov = (id, cls = '') => `<div class="cov ${cls}"><i>${ic('note')}</i><img src="${thumb(id)}" alt="" loading="lazy" onerror="this.remove()"></div>`;
function mosaic(p, cls = '') {
  const ids = p.pistas.filter(T).slice(0, 4);
  const fav = p.id === 'fav';
  if (ids.length >= 4) return `<div class="cov mos ${cls}">${ids.map(i => `<img src="${thumb(i)}" alt="" onerror="this.remove()">`).join('')}</div>`;
  if (ids.length) return cov(ids[0], cls + (fav ? ' fav' : ''));
  return `<div class="cov ${cls} ${fav ? 'fav' : ''}"><i>${ic(fav ? 'heart' : 'note')}</i></div>`;
}
const BUBBLES = [[8, 14, 46], [30, 62, 30], [58, 8, 64], [76, 46, 38], [90, 10, 26], [66, 70, 22]]
  .map(([l, t, s]) => `<i class="bub" style="left:${l}%;top:${t}%;width:${s}px;height:${s}px"></i>`).join('');
function hero(kicker, title, sub, coverHtml = '') {
  return `<section class="hero ${coverHtml ? 'hascov' : ''}"><div class="hbub">${BUBBLES}</div><div class="hill"></div>
    ${coverHtml ? `<div class="hcov">${coverHtml}</div>` : ''}
    <div class="htxt"><small>${kicker}</small><h1>${title}</h1><p>${sub}</p></div></section>`;
}
function ctx(list) { const k = 'c' + (++ctxN); ctxs[k] = list; return k; }
function rows(list, { pid = null, res = false } = {}) {
  const k = ctx(list);
  return '<div class="list">' + list.map((t, i) => `
    <div class="row" data-a="play" data-ctx="${k}" data-i="${i}" data-id="${t.id}">
      ${cov(t.id)}
      <div class="meta"><b class="${cur && cur.id === t.id ? 'on' : ''}">${esc(t.titulo)}</b><span>${esc(t.artista)}${t.dur ? ' · ' + fmt(t.dur) : ''}</span></div>
      ${res
        ? `<button class="ibtn" data-a="add" data-ctx="${k}" data-i="${i}">${ic(T(t.id) ? 'check' : 'plus')}</button>`
        : `<button class="ibtn ${isFav(t.id) ? 'on' : ''}" data-a="fav" data-id="${t.id}">${ic(isFav(t.id) ? 'heart' : 'heart0')}</button>`}
      <button class="ibtn" data-a="more" data-ctx="${k}" data-i="${i}" data-pid="${pid || ''}">${ic('dots')}</button>
    </div>`).join('') + '</div>';
}
const card = p => `<div class="card" data-a="go" data-to="pl/${p.id}">${mosaic(p, 'sq')}<b>${esc(p.nombre)}</b><span>${plural(p.pistas.length)}</span></div>`;
const newCard = () => `<div class="card new" data-a="newpl"><div class="cov sq"><i>${ic('plus')}</i></div><b>Nueva playlist</b><span>Crea la tuya</span></div>`;

/* ---------- vistas ---------- */
const views = {
  home() {
    const h = new Date().getHours();
    const g = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
    let s = hero('TruffleMix', g, 'tu música flotando en el aire');
    s += `<h2>Tus playlists</h2><div class="hscroll">${pls.map(card).join('')}${newCard()}</div>`;
    s += lib.length
      ? `<h2>Añadido recientemente</h2>` + rows(lib.slice(-8).reverse())
      : `<h2>Empieza aquí</h2><p class="hint">Tu biblioteca está vacía. Ve a <b>Buscar</b> para encontrar canciones en YouTube.</p>
         <div class="acts"><button class="gbtn green" data-a="go" data-to="search">${ic('search')} Buscar canciones</button></div>`;
    return s;
  },
  search() {
    return `<div class="sbar glass"><span>${ic('search')}</span>
      <input id="q" type="search" enterkeyhint="search" placeholder="¿Qué quieres escuchar?" autocomplete="off" value="${esc(searchQ)}">
      <button class="gbtn green" id="qgo">Buscar</button></div><div id="sr"></div>`;
  },
  lib() {
    let s = `<h1 class="ttl">Tu biblioteca</h1><div class="chips">
      <button class="chip ${libTab === 'songs' ? 'on' : ''}" data-a="tab" data-tab="songs">Canciones</button>
      <button class="chip ${libTab === 'pls' ? 'on' : ''}" data-a="tab" data-tab="pls">Playlists</button></div>`;
    if (libTab === 'songs') {
      s += `<div class="acts"><button class="gbtn" data-a="addlink">${ic('link')} Añadir enlace de YouTube</button></div>`;
      s += lib.length ? rows(lib.slice().reverse()) : `<p class="hint">Aún no hay canciones. Búscalas en la pestaña <b>Buscar</b>.</p>`;
    } else s += `<div class="grid2">${pls.map(card).join('')}${newCard()}</div>`;
    return s;
  },
  pl(id) {
    const p = P(id);
    if (!p) { location.hash = '#/home'; return ''; }
    const L = p.pistas.map(T).filter(Boolean);
    const dur = L.reduce((a, t) => a + (t.dur || 0), 0);
    return `<button class="back glass" data-a="back">${ic('back')}</button>` +
      hero('Playlist', esc(p.nombre), plural(L.length) + (dur ? ' · ' + Math.round(dur / 60) + ' min' : ''), mosaic(p, 'big')) +
      `<div class="acts"><button class="gbtn green round" data-a="plplay" data-id="${id}">${ic('play')}</button>
       <button class="gbtn" data-a="plshuf" data-id="${id}">${ic('shuffle')} Aleatorio</button>
       ${id !== 'fav' ? `<button class="gbtn gray" data-a="plmore" data-id="${id}">${ic('dots')}</button>` : ''}</div>` +
      (L.length ? rows(L, { pid: id }) : `<p class="hint">Esta playlist está vacía. Busca canciones y añádelas con el menú ⋯.</p>`);
  }
};

function render(keep) {
  const v = $('#view'), y = v.scrollTop;
  ctxs = {};
  v.innerHTML = views[view.name](view.arg);
  if (view.name === 'search') initSearch();
  $$('#tabs [data-to]').forEach(b => b.classList.toggle('on', b.dataset.to === (view.name === 'pl' ? 'lib' : view.name)));
  v.scrollTop = keep ? y : 0;
}
function route() {
  const [n, a] = (location.hash.replace(/^#\/?/, '') || 'home').split('/');
  view = { name: ['home', 'search', 'lib', 'pl'].includes(n) ? n : 'home', arg: a ? decodeURIComponent(a) : null };
  render();
}
function go(p) { if (location.hash === '#/' + p) render(); else location.hash = '#/' + p; }

/* ---------- búsqueda ---------- */
function initSearch() {
  const q = $('#q');
  let t;
  q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { searchQ = q.value.trim(); renderSR(); }, 200); });
  q.addEventListener('keydown', e => { if (e.key === 'Enter') { q.blur(); doYT(); } });
  $('#qgo').onclick = () => { q.blur(); doYT(); };
  renderSR();
  if (!searchQ) q.focus();
}
function renderSR() {
  const box = $('#sr');
  if (!box) return;
  ctxs = {};
  const q = searchQ, ql = q.toLowerCase();
  if (!q) { box.innerHTML = '<p class="hint">Escribe para buscar en tu biblioteca y toca <b>Buscar</b> para traer resultados de YouTube. También puedes pegar un enlace de YouTube.</p>'; return; }
  const loc = lib.filter(t => (t.titulo + ' ' + t.artista).toLowerCase().includes(ql));
  let h = '<h2>En tu biblioteca</h2>' + (loc.length ? rows(loc.slice(0, 8)) : '<p class="hint">Sin coincidencias.</p>');
  h += '<h2>En YouTube</h2>';
  const c = ytCache[ql];
  if (c === 'loading') h += '<p class="hint">Buscando…</p>';
  else if (c && c.err) h += `<p class="hint err">${esc(c.err)}</p>`;
  else if (c) h += c.length ? rows(c, { res: true }) : '<p class="hint">Sin resultados.</p>';
  else h += `<p class="hint">Toca <b>Buscar</b> para buscar «${esc(q)}» en YouTube.</p>`;
  box.innerHTML = h;
  markCur();
}
async function doYT() {
  const q = ($('#q') ? $('#q').value : searchQ).trim();
  if (!q) return;
  searchQ = q;
  const k = q.toLowerCase();
  ytCache[k] = 'loading';
  renderSR();
  try { ytCache[k] = await ytFind(q); }
  catch (e) { ytCache[k] = { err: 'No se pudo buscar: ' + (e.message || e) }; }
  if (view.name === 'search' && searchQ.toLowerCase() === k) renderSR();
}
const ytId = s => { const m = String(s).match(/(?:youtu\.be\/|[?&]v=|shorts\/|embed\/|live\/)([\w-]{11})/); return m ? m[1] : null; };
const parseDur = s => s.split(':').reduce((a, x) => a * 60 + (+x), 0);
async function oembed(id) {
  const r = await fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + id));
  if (!r.ok) throw new Error('enlace no válido o video privado');
  const j = await r.json();
  return { id, titulo: j.title, artista: j.author_name, dur: 0 };
}
async function ytFind(q) {
  const id = ytId(q);
  if (id) return [await oembed(id)];
  try { const r = await ytScrape(q); if (r.length) return r; } catch (e) { /* prueba el respaldo */ }
  return await piped(q);
}
async function ytScrape(q) {
  const r = await fetch('https://www.youtube.com/results?hl=es&sp=EgIQAQ%253D%253D&search_query=' + encodeURIComponent(q),
    { headers: { 'Accept-Language': 'es-419,es;q=0.9', 'Cookie': 'CONSENT=YES+1; SOCS=CAI' } });
  const html = await r.text();
  const m = html.match(/var ytInitialData\s*=\s*(\{[\s\S]*?\});\s*<\/script>/);
  if (!m) throw new Error('formato inesperado');
  const out = [];
  (function walk(o) {
    if (!o || typeof o !== 'object' || out.length >= 15) return;
    if (o.videoRenderer) {
      const v = o.videoRenderer, d = v.lengthText && v.lengthText.simpleText;
      if (v.videoId && d) out.push({
        id: v.videoId, dur: parseDur(d),
        titulo: ((v.title && v.title.runs) || []).map(x => x.text).join('') || 'Sin título',
        artista: (v.ownerText && v.ownerText.runs && v.ownerText.runs[0].text) || 'YouTube'
      });
      return;
    }
    for (const k in o) walk(o[k]);
  })(JSON.parse(m[1]));
  return out;
}
async function piped(q) {
  const r = await fetch('https://pipedapi.kavin.rocks/search?filter=videos&q=' + encodeURIComponent(q));
  if (!r.ok) throw new Error('el buscador no respondió (revisa tu conexión)');
  const j = await r.json();
  return (j.items || []).filter(i => i.url && i.url.includes('v=')).slice(0, 15)
    .map(i => ({ id: i.url.split('v=')[1].slice(0, 11), titulo: i.title, artista: i.uploaderName || 'YouTube', dur: i.duration > 0 ? i.duration : 0 }));
}

/* ---------- playlists / biblioteca ---------- */
async function newPlaylist(con) {
  const n = await askText('Nueva playlist', `Mi playlist #${pls.length}`);
  if (!n) return;
  const p = { id: Math.random().toString(36).slice(2, 10), nombre: n.slice(0, 40), pistas: [] };
  pls.push(p);
  if (con) p.pistas.push(ensure(con).id);
  save();
  go('pl/' + p.id);
}
async function renamePl(id) {
  const p = P(id), n = await askText('Renombrar playlist', p.nombre);
  if (n) { p.nombre = n.slice(0, 40); save(); render(true); }
}
async function deletePl(id) {
  const p = P(id);
  if (await askConfirm(`¿Eliminar «${p.nombre}»? Las canciones se conservan.`)) { pls = pls.filter(x => x.id !== id); save(); go('lib'); }
}
function addToPl(pid, t) {
  const p = P(pid), x = ensure(t);
  if (p.pistas.includes(x.id)) return toast(`Ya está en «${p.nombre}»`);
  p.pistas.push(x.id); save(); toast(`Añadida a «${p.nombre}»`);
  if (view.name === 'pl' && view.arg === pid) render(true);
}
function removeFromPl(pid, t) {
  const p = P(pid); p.pistas = p.pistas.filter(i => i !== t.id); save(); render(true); toast(`Quitada de «${p.nombre}»`);
}
function toggleFav(id, t) {
  const x = T(id) || (t && ensure(t)); if (!x) return;
  const f = P('fav');
  if (f.pistas.includes(id)) f.pistas = f.pistas.filter(i => i !== id);
  else { f.pistas.push(id); toast('Añadida a Favoritos ♥'); }
  save();
  $$(`[data-a="fav"][data-id="${id}"]`).forEach(b => { b.classList.toggle('on', isFav(id)); b.innerHTML = ic(isFav(id) ? 'heart' : 'heart0'); });
  if (view.name === 'pl' && view.arg === 'fav') render(true);
  updatePlayerUI();
}
async function removeTrack(id) {
  if (!(await askConfirm('¿Eliminar esta canción de tu biblioteca y de tus playlists?'))) return;
  lib = lib.filter(t => t.id !== id); pls.forEach(p => { p.pistas = p.pistas.filter(i => i !== id); }); save(); render(true);
}
async function addLink() {
  const u = await askText('Añadir enlace de YouTube', '');
  if (!u) return;
  const id = ytId(u);
  if (!id) return toast('Enlace no válido');
  try { ensure(await oembed(id)); toast('Añadida a tu biblioteca ✔'); render(true); } catch (e) { toast('No se pudo añadir: ' + e.message); }
}

/* ---------- menús y diálogos ---------- */
function openMenu(title, items) {
  const m = $('#menu');
  m.innerHTML = `<div class="mt">${esc(title)}</div>` + items.map((it, i) =>
    `<button class="mi ${it.cls || ''}" data-i="${i}">${it.ico ? ic(it.ico) : ''}<span>${esc(it.label)}</span></button>`).join('');
  m.classList.add('open'); $('#sheetBg').classList.add('open');
  $$('.mi', m).forEach(b => { b.onclick = () => { const it = items[+b.dataset.i]; closeMenu(); if (it.fn) setTimeout(it.fn, 30); }; });
}
function closeMenu() { $('#menu').classList.remove('open'); $('#sheetBg').classList.remove('open'); }
function pickPl(t) {
  openMenu('Añadir a playlist', [{ ico: 'plus', label: 'Nueva playlist…', fn: () => newPlaylist(t) },
    ...pls.map(p => ({ ico: p.id === 'fav' ? 'heart' : 'note', label: p.nombre, fn: () => addToPl(p.id, t) }))]);
}
function trackMenu(t, pid) {
  const f = isFav(t.id);
  const items = [
    { ico: 'play', label: 'Reproducir', fn: () => playList([t], 0) },
    { ico: 'plus', label: 'Añadir a playlist…', fn: () => pickPl(t) },
    { ico: f ? 'heart' : 'heart0', label: f ? 'Quitar de Favoritos' : 'Añadir a Favoritos', fn: () => toggleFav(t.id, t) }];
  if (pid) items.push({ ico: 'trash', label: 'Quitar de esta playlist', fn: () => removeFromPl(pid, t) });
  items.push({ ico: 'link', label: 'Abrir en YouTube', fn: () => window.open('https://www.youtube.com/watch?v=' + t.id, '_blank') });
  if (T(t.id)) items.push({ ico: 'trash', label: 'Eliminar de la biblioteca', cls: 'danger', fn: () => removeTrack(t.id) });
  openMenu(t.titulo, items);
}
function askText(title, initial = '') {
  return new Promise(res => {
    const m = $('#modal');
    m.innerHTML = `<div class="dlg"><h3>${esc(title)}</h3><input id="dIn" maxlength="${initial === '' && /enlace/i.test(title) ? 200 : 40}" value="${esc(initial)}">
      <div class="dbtn"><button class="gbtn gray" id="dNo">Cancelar</button><button class="gbtn green" id="dOk">Aceptar</button></div></div>`;
    m.classList.add('open');
    const i = $('#dIn'), end = v => { m.classList.remove('open'); m.innerHTML = ''; res(v); };
    i.focus(); i.select();
    $('#dOk').onclick = () => end(i.value.trim() || null);
    $('#dNo').onclick = () => end(null);
    i.onkeydown = e => { if (e.key === 'Enter') end(i.value.trim() || null); };
  });
}
function askConfirm(text) {
  return new Promise(res => {
    const m = $('#modal');
    m.innerHTML = `<div class="dlg"><h3>Confirmar</h3><p>${esc(text)}</p>
      <div class="dbtn"><button class="gbtn gray" id="dNo">Cancelar</button><button class="gbtn pink" id="dOk">Sí</button></div></div>`;
    m.classList.add('open');
    const end = v => { m.classList.remove('open'); m.innerHTML = ''; res(v); };
    $('#dOk').onclick = () => end(true); $('#dNo').onclick = () => end(false);
  });
}
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2400);
}

/* ---------- reproductor (YouTube IFrame API) ---------- */
window.onYouTubeIframeAPIReady = () => {
  yt = new YT.Player('yt', {
    width: '100%', height: '100%',
    playerVars: { playsinline: 1, controls: 0, rel: 0, modestbranding: 1, fs: 0, iv_load_policy: 3, origin: location.origin },
    events: {
      onReady: () => { ytReady = true; if (pendingId) { yt.loadVideoById(pendingId); pendingId = null; } },
      onStateChange: e => {
        const s = e.data;
        if (s === 0) return ended();
        playing = s === 1 || s === 3;
        if (s === 1) { errStreak = 0; if (cur && !cur.dur) { cur.dur = Math.round(yt.getDuration()) || 0; save(); } }
        updatePlayerUI();
      },
      onError: e => {
        playing = false; updatePlayerUI();
        toast(`No se pudo reproducir (error ${e.data}). Prueba «Abrir en YouTube».`);
        if (++errStreak <= 3 && queue.length > 1 && e.data !== 153) setTimeout(() => next(), 1400);
      }
    }
  });
};
function loadCur() {
  if (!queue[qi]) return;
  queue[qi] = ensure(queue[qi]); cur = queue[qi];
  updatePlayerUI(); setMedia();
  if (ytReady) yt.loadVideoById(cur.id); else pendingId = cur.id;
}
function playList(list, i) { queue = list.slice(); qi = i; loadCur(); }
function toggle() {
  if (cur && ytReady) { const s = yt.getPlayerState(); if (s === 1 || s === 3) yt.pauseVideo(); else yt.playVideo(); }
  else if (!cur && lib.length) playList(lib.slice().reverse(), 0);
}
function next() {
  if (!queue.length) return;
  if (shuffle && queue.length > 1) { let n; do { n = Math.floor(Math.random() * queue.length); } while (n === qi); qi = n; }
  else qi = (qi + 1) % queue.length;
  loadCur();
}
function prev() {
  if (!queue.length) return;
  if (ytReady && yt.getCurrentTime() > 4) { yt.seekTo(0, true); return; }
  qi = (qi - 1 + queue.length) % queue.length; loadCur();
}
function ended() {
  if (repeat === 2) { yt.seekTo(0, true); yt.playVideo(); return; }
  if (qi >= queue.length - 1 && repeat === 0 && !shuffle) { playing = false; updatePlayerUI(); return; }
  next();
}
function markCur() {
  $$('.row').forEach(r => { const b = $('b', r); if (b) b.classList.toggle('on', !!cur && r.dataset.id === cur.id); });
}
function updatePlayerUI() {
  document.body.classList.toggle('has-mini', !!cur);
  if (cur) {
    $('#mcov').innerHTML = cov(cur.id);
    $('#mT').textContent = $('#npT').textContent = cur.titulo;
    $('#mA').textContent = $('#npA').textContent = cur.artista;
  }
  const f = !!cur && isFav(cur.id);
  ['#mFav', '#npFav'].forEach(s => { const b = $(s); b.innerHTML = ic(f ? 'heart' : 'heart0'); b.classList.toggle('on', f); });
  ['#mPlay', '#npPlay'].forEach(s => { $(s).innerHTML = ic(playing ? 'pause' : 'play'); });
  $('#npShuf').classList.toggle('on', shuffle);
  $('#npRep').classList.toggle('on', repeat > 0);
  $('#npRep').innerHTML = ic('repeat') + (repeat === 2 ? '<sup>1</sup>' : '');
  markCur();
}
function setMedia() {
  if (!('mediaSession' in navigator) || !cur) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({ title: cur.titulo, artist: cur.artista, artwork: [{ src: thumb(cur.id), sizes: '320x180', type: 'image/jpeg' }] });
  } catch (e) { /* sin soporte */ }
}
function showNP() { if (npOpen || !cur) return; npOpen = true; history.pushState({ np: 1 }, ''); $('#np').classList.add('open'); }
function hideNP() { npOpen = false; $('#np').classList.remove('open'); }

/* ---------- acciones (delegación de clics) ---------- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]');
  if (!el) return;
  const d = el.dataset, list = d.ctx ? ctxs[d.ctx] : null, tr = list ? list[+d.i] : null;
  switch (d.a) {
    case 'play': playList(list, +d.i); break;
    case 'fav': toggleFav(d.id); break;
    case 'add': ensure(tr); toast('Añadida a tu biblioteca'); el.innerHTML = ic('check'); break;
    case 'more': trackMenu(tr, d.pid || null); break;
    case 'go': go(d.to); break;
    case 'back': history.length > 1 ? history.back() : go('home'); break;
    case 'newpl': newPlaylist(); break;
    case 'tab': libTab = d.tab; render(); break;
    case 'addlink': addLink(); break;
    case 'plplay': { const L = P(d.id).pistas.map(T).filter(Boolean); if (L.length) playList(L, 0); break; }
    case 'plshuf': { const L = P(d.id).pistas.map(T).filter(Boolean); if (L.length) { shuffle = true; playList(L, Math.floor(Math.random() * L.length)); } break; }
    case 'plmore': openMenu(P(d.id).nombre, [{ ico: 'edit', label: 'Renombrar', fn: () => renamePl(d.id) }, { ico: 'trash', label: 'Eliminar playlist', cls: 'danger', fn: () => deletePl(d.id) }]); break;
    case 'openNP': showNP(); break;
    case 'closeNP': if (npOpen) history.back(); break;
    case 'npMore': if (cur) trackMenu(cur, null); break;
    case 'favcur': if (cur) toggleFav(cur.id); break;
    case 'toggle': toggle(); break;
    case 'next': next(); break;
    case 'prev': prev(); break;
    case 'shuf': shuffle = !shuffle; updatePlayerUI(); toast('Aleatorio ' + (shuffle ? 'activado' : 'desactivado')); break;
    case 'rep': repeat = (repeat + 1) % 3; updatePlayerUI(); toast(['Repetir: no', 'Repetir: todo', 'Repetir: una canción'][repeat]); break;
  }
});

/* ---------- arranque ---------- */
function init() {
  const bg = $('#bg');
  for (let i = 0; i < 9; i++) {
    const s = 24 + Math.random() * 70;
    bg.insertAdjacentHTML('beforeend', `<i class="bub" style="left:${Math.random() * 92}%;top:${Math.random() * 70}%;width:${s}px;height:${s}px;opacity:.7"></i>`);
  }
  $('#tabs').innerHTML = [['home', 'Inicio'], ['search', 'Buscar'], ['lib', 'Biblioteca']]
    .map(([k, l]) => `<button data-a="go" data-to="${k}">${ic(k)}<span>${l}</span></button>`).join('');
  $('#mini').innerHTML = `<div id="mcov" data-a="openNP"></div><div class="meta" data-a="openNP"><b id="mT"></b><span id="mA"></span></div>
    <button class="ibtn" id="mFav" data-a="favcur"></button><button class="ibtn" id="mPlay" data-a="toggle"></button>
    <button class="ibtn" data-a="next">${ic('next')}</button><div id="mbarw"><div id="mbar"></div></div>`;
  $('#np').innerHTML = `<div class="np-top"><button class="ibtn" data-a="closeNP">${ic('down')}</button><span>Reproduciendo</span><button class="ibtn" data-a="npMore">${ic('dots')}</button></div>
    <div id="ytwrap"><div id="yt"></div></div>
    <div class="np-info"><div><span id="npT"></span><span id="npA"></span></div><button class="ibtn" id="npFav" data-a="favcur"></button></div>
    <div><input type="range" id="seek" min="0" max="1000" value="0"><div class="times"><span id="tCur">0:00</span><span id="tTot">0:00</span></div></div>
    <div class="ctrls"><button class="ibtn" id="npShuf" data-a="shuf">${ic('shuffle')}</button><button class="ibtn" data-a="prev">${ic('prev')}</button>
      <button class="gbtn green round big" id="npPlay" data-a="toggle"></button><button class="ibtn" data-a="next">${ic('next')}</button>
      <button class="ibtn" id="npRep" data-a="rep"></button></div>`;
  const seek = $('#seek');
  seek.addEventListener('input', () => {
    seeking = true;
    seek.style.setProperty('--p', seek.value / 10 + '%');
    $('#tCur').textContent = fmt(seek.value / 1000 * ((ytReady && yt.getDuration()) || (cur && cur.dur) || 0));
  });
  seek.addEventListener('change', () => {
    if (ytReady && cur) yt.seekTo(seek.value / 1000 * (yt.getDuration() || cur.dur || 0), true);
    seeking = false;
  });
  $('#sheetBg').onclick = closeMenu;
  setInterval(() => {
    if (!ytReady || !cur || typeof yt.getCurrentTime !== 'function') return;
    const dur = yt.getDuration() || cur.dur || 0, t = yt.getCurrentTime() || 0;
    if (dur) {
      const p = Math.min(t / dur * 100, 100);
      $('#mbar').style.width = p + '%';
      $('#tTot').textContent = fmt(dur);
      if (!seeking) { seek.value = p * 10; seek.style.setProperty('--p', p + '%'); $('#tCur').textContent = fmt(t); }
    }
  }, 500);
  if ('mediaSession' in navigator) {
    [['play', toggle], ['pause', toggle], ['nexttrack', next], ['previoustrack', prev]].forEach(([a, f]) => { try { navigator.mediaSession.setActionHandler(a, f); } catch (e) { /* sin soporte */ } });
  }
  window.addEventListener('hashchange', route);
  window.addEventListener('popstate', () => { if (npOpen) hideNP(); });
  updatePlayerUI();
  route();
}
init();
