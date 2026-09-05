/* Interactive timeline: canvas, zoom/pan, search, filters (period, region, category, planet aspects). Data: events.json + aspects.json */
(async function () {
  const cv = document.getElementById('tl'), tip = document.getElementById('tl-tip'), listEl = document.getElementById('tl-list'), status = document.getElementById('tl-status');
  const ctx = cv.getContext('2d'); let W, H, dpr = window.devicePixelRatio || 1;
  const COLORS = { war_onset: '#8f2f2f', leader_entry: '#2f6b4f', leader_exit_regular: '#3a5680', leader_exit_irregular: '#9a6a12', polity_start: '#b5653a', polity_end: '#6b6257' };
  let EV, ASP; try { [EV, ASP] = await Promise.all([loadJSON('events'), loadJSON('aspects')]); } catch (e) { status.innerHTML = '<div class="notice error">לא ניתן לטעון את הנתונים. בדוק חיבור ונסה לרענן.</div>'; return; }
  EV.forEach(e => { e.t = e.y + ((e.m || 7) - 1) / 12 + ((e.d || 15) - 1) / 365; });
  let view = { a: 1400, b: 2030 }; const MIN = -2000, MAX = 2030;
  const f = { q: '', cat: 'all', ds: 'all', rg: 'all', prec: 'all', y0: MIN, y1: MAX, asp: 'none' };
  const $ = id => document.getElementById(id);
  const ASPLABEL = { saturn_pluto: 'שבתאי–פלוטו', jupiter_saturn: 'צדק–שבתאי', uranus_pluto: 'אורנוס–פלוטו', mars_saturn: 'מאדים–שבתאי', saturn_neptune: 'שבתאי–נפטון', saturn_uranus: 'שבתאי–אורנוס' };
  function filtered() {
    const q = f.q.trim().toLowerCase();
    return EV.filter(e => (f.cat === 'all' || e.c === f.cat) && (f.ds === 'all' || e.ds === f.ds) && (f.rg === 'all' || e.rg === f.rg) && (f.prec === 'all' || e.p === f.prec) && e.y >= f.y0 && e.y <= f.y1 && (!q || (e.n + ' ' + e.pl + ' ' + e.ch).toLowerCase().includes(q)));
  }
  function resize() { const r = cv.getBoundingClientRect(); W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); draw(); }
  const x = t => W - ((t - view.a) / (view.b - view.a)) * W; // RTL: earlier on the right
  const tOf = px => view.a + ((W - px) / W) * (view.b - view.a);
  let items = [], hits = [];
  function draw() {
    items = filtered(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#fffdf8'; ctx.fillRect(0, 0, W, H);
    // aspect bands
    if (f.asp !== 'none') { const [p1, p2] = f.asp.split('_'); ctx.fillStyle = 'rgba(181,101,58,.18)'; ASP.filter(a => a.p1 === p1 && a.p2 === p2).forEach(a => { const t = a.year + (a.month - 1) / 12; const px = x(t); if (px > -10 && px < W + 10) { ctx.fillRect(px - 1.5, 30, 3, H - 60); } }); }
    // axis
    const span = view.b - view.a; const step = span > 2500 ? 500 : span > 1200 ? 200 : span > 500 ? 100 : span > 200 ? 50 : span > 80 ? 20 : span > 30 ? 10 : span > 12 ? 5 : 1;
    ctx.strokeStyle = '#d9ccb4'; ctx.fillStyle = '#6b6257'; ctx.font = '12px Heebo, Arial'; ctx.textAlign = 'center';
    for (let y = Math.ceil(view.a / step) * step; y <= view.b; y += step) { const px = x(y); ctx.beginPath(); ctx.moveTo(px, 20); ctx.lineTo(px, H - 20); ctx.stroke(); ctx.fillText(fmtYear(y), px, H - 6); }
    // events: stack by category lanes
    const lanes = ['war_onset', 'leader_entry', 'leader_exit_regular', 'leader_exit_irregular', 'polity_start', 'polity_end']; const laneH = (H - 60) / lanes.length; hits = [];
    const bins = {}; const binW = Math.max(2, span / W * 3);
    items.forEach(e => { const li = lanes.indexOf(e.c); if (li < 0) return; const k = li + ':' + Math.round(e.t / binW); (bins[k] = bins[k] || []).push(e); });
    Object.entries(bins).forEach(([k, arr]) => { const [li, b] = k.split(':').map(Number); const t = b * binW; const px = x(t); if (px < -5 || px > W + 5) return; const y = 30 + li * laneH + laneH / 2; const r = Math.min(laneH / 2 - 2, 3 + Math.sqrt(arr.length) * 2); ctx.beginPath(); ctx.arc(px, y, r, 0, 7); ctx.fillStyle = COLORS[lanes[li]]; ctx.globalAlpha = .75; ctx.fill(); ctx.globalAlpha = 1; hits.push({ px, y, r, arr }); });
    ctx.textAlign = 'right'; ctx.fillStyle = '#1d3a63'; lanes.forEach((l, i) => ctx.fillText({ war_onset: 'מלחמות', leader_entry: 'כניסת מנהיג', leader_exit_regular: 'יציאה סדירה', leader_exit_irregular: 'יציאה בלתי סדירה', polity_start: 'ייסוד ישות', polity_end: 'סיום ישות' }[l], W - 6, 30 + i * laneH + 14));
    status.innerHTML = items.length ? `<span class="tag copper">${items.length.toLocaleString('he')} אירועים בסינון</span> <span class="tag">תצוגה: ${fmtYear(Math.round(view.a))} – ${fmtYear(Math.round(view.b))}</span>` : '<div class="notice empty">אין אירועים שתואמים לסינון. הרחב את הטווח או נקה את החיפוש.</div>';
    renderList();
  }
  function renderList() { const inView = items.filter(e => e.t >= view.a && e.t <= view.b).sort((a, b) => a.t - b.t).slice(0, 200); listEl.innerHTML = inView.map(e => `<li><span class="y">${fmtDate(e)}</span><a href="event.html?id=${encodeURIComponent(e.id)}">${esc(e.n)}</a> <span class="tag">${e.ch}</span>${e.rg ? `<span class="tag">${e.rg}</span>` : ''}<span class="tag">דיוק: ${precHe[e.p]}</span></li>`).join('') || '<li class="small">אין אירועים בתצוגה.</li>'; $('tl-count').textContent = inView.length < items.filter(e => e.t >= view.a && e.t <= view.b).length ? `מוצגים 200 הראשונים בטווח` : ''; }
  // interactions
  let drag = null;
  cv.addEventListener('pointerdown', e => { drag = { px: e.clientX, a: view.a, b: view.b }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => { const r = cv.getBoundingClientRect(); const px = e.clientX - r.left, py = e.clientY - r.top; if (drag) { const dt = (e.clientX - drag.px) / W * (drag.b - drag.a); view.a = Math.max(MIN, drag.a + dt); view.b = Math.min(MAX, drag.b + dt); draw(); return; } const h = hits.find(h => Math.hypot(h.px - px, h.y - py) <= h.r + 3); if (h) { tip.style.display = 'block'; tip.style.left = Math.min(px + 12, W - 330) + 'px'; tip.style.top = (py + 12) + 'px'; tip.innerHTML = h.arr.slice(0, 5).map(e => `${fmtDate(e)} · ${esc(e.n)}`).join('<br>') + (h.arr.length > 5 ? `<br>… ועוד ${h.arr.length - 5}` : ''); } else tip.style.display = 'none'; });
  cv.addEventListener('pointerup', () => drag = null); cv.addEventListener('pointerleave', () => { drag = null; tip.style.display = 'none'; });
  cv.addEventListener('wheel', e => { e.preventDefault(); const r = cv.getBoundingClientRect(); const t = tOf(e.clientX - r.left); const k = e.deltaY > 0 ? 1.2 : 1 / 1.2; zoomAt(t, k); }, { passive: false });
  cv.addEventListener('click', e => { const r = cv.getBoundingClientRect(); const px = e.clientX - r.left, py = e.clientY - r.top; const h = hits.find(h => Math.hypot(h.px - px, h.y - py) <= h.r + 3); if (h && h.arr.length === 1) location.href = 'event.html?id=' + encodeURIComponent(h.arr[0].id); else if (h) { view = { a: h.arr[0].t - 2, b: h.arr[0].t + 2 }; draw(); } });
  function zoomAt(t, k) { const na = t - (t - view.a) * k, nb = t + (view.b - t) * k; if (nb - na < 0.5 || nb - na > MAX - MIN) return; view = { a: Math.max(MIN, na), b: Math.min(MAX, nb) }; draw(); }
  cv.tabIndex = 0; cv.setAttribute('role', 'application'); cv.setAttribute('aria-label', 'ציר זמן אינטראקטיבי. חיצים להזזה, פלוס ומינוס לזום. רשימת האירועים בתצוגה מופיעה מתחת.');
  cv.addEventListener('keydown', e => { const s = (view.b - view.a) * 0.1; if (e.key === 'ArrowLeft') { view.a += s; view.b += s; } else if (e.key === 'ArrowRight') { view.a -= s; view.b -= s; } else if (e.key === '+' || e.key === '=') zoomAt((view.a + view.b) / 2, 1 / 1.3); else if (e.key === '-') zoomAt((view.a + view.b) / 2, 1.3); else return; e.preventDefault(); view.a = Math.max(MIN, view.a); view.b = Math.min(MAX, view.b); draw(); });
  $('zin').onclick = () => zoomAt((view.a + view.b) / 2, 1 / 1.4); $('zout').onclick = () => zoomAt((view.a + view.b) / 2, 1.4); $('zall').onclick = () => { view = { a: MIN, b: MAX }; draw(); };
  ['q', 'cat', 'ds', 'rg', 'prec', 'asp'].forEach(k => $('f-' + k).addEventListener('input', e => { f[k] = e.target.value; draw(); }));
  $('f-y0').addEventListener('change', e => { f.y0 = +e.target.value || MIN; draw(); }); $('f-y1').addEventListener('change', e => { f.y1 = +e.target.value || MAX; draw(); });
  $('goto').addEventListener('click', () => { const y = +$('f-goto').value; if (!isNaN(y)) { view = { a: y - 25, b: y + 25 }; draw(); } });
  // populate region/dataset options from data
  const rgs = [...new Set(EV.map(e => e.rg).filter(Boolean))].sort(); $('f-rg').innerHTML = '<option value="all">כל האזורים (Brecke)</option>' + rgs.map(r => `<option>${r}</option>`).join('');
  const dss = [...new Set(EV.map(e => e.ds))].sort(); $('f-ds').innerHTML = '<option value="all">כל המאגרים</option>' + dss.map(r => `<option value="${r}">${r}</option>`).join('');
  $('f-asp').innerHTML = '<option value="none">ללא סימון תצורות</option>' + Object.entries(ASPLABEL).map(([k, v]) => `<option value="${k}">${v} (היבט קשה מדויק)</option>`).join('');
  window.addEventListener('resize', resize); resize();
  const y = qs('year'); if (y) { view = { a: +y - 10, b: +y + 10 }; draw(); }
})();
