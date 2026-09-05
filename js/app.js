/* shared helpers: header/footer, data loading, formatting, chart wheel */
(function () {
  const NAV = [
    ['index.html', 'פתיחה'], ['timeline.html', 'ציר זמן'], ['events.html', 'אירועים'], ['leaders.html', 'מנהיגים'],
    ['compare.html', 'השוואה'], ['results.html', 'תוצאות'], ['forecast.html', 'תחזית'], ['method.html', 'שיטה'], ['glossary.html', 'מילון'],
    ['data.html', 'נתונים'], ['book.html', 'הספר'], ['audio.html', 'ספר שמע'], ['about.html', 'על המחבר'], ['changes.html', 'תיקונים וגרסאות']
  ];
  const here = location.pathname.split('/').pop() || 'index.html';
  const header = document.createElement('header'); header.className = 'site';
  header.innerHTML = `<a class="skip" href="#main">דלג לתוכן</a><div class="wrap">
    <a class="brand" href="index.html">שמיים והיסטוריה<small>מחקר, ספר וספר שמע מאת רון קסלר</small></a>
    <button class="menu-btn" aria-expanded="false" aria-controls="mainnav">תפריט</button>
    <nav class="main" id="mainnav" aria-label="ניווט ראשי"><ul>${NAV.map(([h, t]) => `<li><a href="${h}"${h === here ? ' aria-current="page"' : ''}>${t}</a></li>`).join('')}</ul></nav></div>`;
  document.body.prepend(header);
  header.querySelector('.menu-btn').addEventListener('click', e => { const n = header.querySelector('nav.main'); n.classList.toggle('open'); e.currentTarget.setAttribute('aria-expanded', n.classList.contains('open')); });
  const footer = document.createElement('footer'); footer.className = 'site';
  footer.innerHTML = `<div class="wrap">גרסת מחקר <span id="ft-ver">…</span> · חישוב: Swiss Ephemeris, גאוצנטרי, גלגל טרופי · <a href="data.html">רישיונות ומקורות</a> · <a href="changes.html">תיקונים</a> · © רון קסלר</div>`;
  document.body.append(footer);

  const cache = {};
  window.loadJSON = async function (name) {
    if (cache[name]) return cache[name];
    const r = await fetch('data/' + name + '.json');
    if (!r.ok) throw new Error('fetch failed: ' + name + ' ' + r.status);
    cache[name] = await r.json(); return cache[name];
  };
  loadJSON('meta').then(m => { document.getElementById('ft-ver').textContent = m.research_version + ' (' + m.built.slice(0, 10) + ')'; }).catch(() => { document.getElementById('ft-ver').textContent = 'לא נטען'; });

  window.SIGNS = ['טלה', 'שור', 'תאומים', 'סרטן', 'אריה', 'בתולה', 'מאזניים', 'עקרב', 'קשת', 'גדי', 'דלי', 'דגים'];
  window.PLANET_HE = { sun: 'שמש', moon: 'ירח', mercury: 'מרקורי', venus: 'ונוס', mars: 'מאדים', jupiter: 'צדק', saturn: 'שבתאי', uranus: 'אורנוס', neptune: 'נפטון', pluto: 'פלוטו' };
  window.GLYPH = { sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂', jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇' };
  window.fmtLon = function (lon) { const s = Math.floor(lon / 30); const d = lon - s * 30; return `${String(Math.floor(d)).padStart(2, '0')}°${String(Math.floor((d % 1) * 60)).padStart(2, '0')}′ ${SIGNS[s]}`; };
  window.fmtYear = function (y) { return y < 1 ? `${1 - y} לפנה״ס` : `${y}`; };
  window.fmtDate = function (e) { const y = fmtYear(e.y); if (e.p === 'day' && e.m && e.d) return `${e.d}.${e.m}.${y}`; if (e.p === 'month' && e.m) return `${e.m}/${y}`; return y; };
  window.precHe = { day: 'יום', month: 'חודש', year: 'שנה' };
  window.esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  window.sep = (a, b) => { let d = Math.abs((a - b) % 360); return d > 180 ? 360 - d : d; };
  window.hardAspects = function (pos, orb) {
    const keys = Object.keys(pos); const out = [];
    for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
      const s = sep(pos[keys[i]], pos[keys[j]]);
      for (const [ang, nm] of [[0, 'צמידות'], [90, 'ריבוע'], [180, 'ניגוד']]) if (Math.abs(s - ang) <= orb) out.push({ a: keys[i], b: keys[j], nm, dev: Math.abs(s - ang) });
    }
    return out.sort((x, y) => x.dev - y.dev);
  };
  /* SVG chart wheel: positions {planet: lon}. Aries at left (traditional), counter-clockwise. */
  window.drawWheel = function (el, pos, opts) {
    opts = opts || {}; const R = 250, cx = 260, cy = 260; const toXY = (lon, r) => { const a = (180 - lon) * Math.PI / 180; return [cx + r * Math.cos(a), cy - r * Math.sin(a)]; };
    let s = `<svg class="wheel" viewBox="0 0 520 520" role="img" aria-label="${esc(opts.label || 'מפה אסטרולוגית')}">`;
    s += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="#fffdf8" stroke="#0f2747" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="${R - 38}" fill="none" stroke="#b5653a" stroke-width="1.5"/><circle cx="${cx}" cy="${cy}" r="${R - 150}" fill="#f6f0e6" stroke="#d9ccb4"/>`;
    for (let i = 0; i < 12; i++) { const [x1, y1] = toXY(i * 30, R), [x2, y2] = toXY(i * 30, R - 38); s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#0f2747"/>`; const [tx, ty] = toXY(i * 30 + 15, R - 19); s += `<text x="${tx}" y="${ty + 5}" text-anchor="middle" font-size="12" fill="#1d3a63">${SIGNS[i]}</text>`; }
    for (let i = 0; i < 360; i += 5) { const [x1, y1] = toXY(i, R - 38), [x2, y2] = toXY(i, R - (i % 10 ? 44 : 50)); s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#b5653a" stroke-width=".7"/>`; }
    const ks = Object.keys(pos).sort((a, b) => pos[a] - pos[b]); const placed = [];
    for (const k of ks) { let lon = pos[k]; for (const p of placed) if (Math.abs(((lon - p) + 540) % 360 - 180) < 7) lon = p + 7; placed.push(lon); const [x, y] = toXY(lon, R - 78); const [lx, ly] = toXY(pos[k], R - 52); s += `<line x1="${lx}" y1="${ly}" x2="${x}" y2="${y}" stroke="#d9ccb4"/><text x="${x}" y="${y + 7}" text-anchor="middle" font-size="20" fill="#0f2747">${GLYPH[k]}</text><text x="${x}" y="${y + 22}" text-anchor="middle" font-size="9" fill="#6b6257">${Math.floor(pos[k] % 30)}°</text>`; }
    if (opts.aspects !== false) for (const a of hardAspects(pos, opts.orb || 8)) { const [x1, y1] = toXY(pos[a.a], R - 150), [x2, y2] = toXY(pos[a.b], R - 150); s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${a.nm === 'צמידות' ? '#b5653a' : '#8f2f2f'}" stroke-width="1.2" opacity=".8"><title>${PLANET_HE[a.a]} ${a.nm} ${PLANET_HE[a.b]} (סטייה ${a.dev.toFixed(1)}°)</title></line>`; }
    s += '</svg>'; el.innerHTML = s;
  };
  window.qs = k => new URLSearchParams(location.search).get(k);
})();
