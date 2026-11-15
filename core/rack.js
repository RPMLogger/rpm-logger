// THE RACK (user, 2026-11-14; all tabs but Calendar + Fixed schedule since 2026-11-15, NO_RACK). Look: css/rack.css.
// While a rack tab is open: puts body.rk-lessons on, and draws the rack case behind the boxes into #rkLayer:
// a perforated back panel + two rails from the amp head's top to the last box, plus the shadow each unit casts on the back.
// The boxes are never touched: their own corner screws sit on the rails.
// Any other tab: the class comes off and the layer is removed, so the page is exactly as before.
// Redraws when the Lessons tab opens/closes or its content changes, on resize, and once a second (cards opening etc.);
// the layer is only rewritten when something actually moved.
(function () {
  var RAIL = 40, OVER = 6, last = '';

  var NO_RACK = ['calendar', 'fixedcal'];   // every tab has the rack except these two: their grids are wider than the rack (user, 2026-11-15)
  function lessonsOpen() {
    var p = document.querySelector('.tab-panel.active');
    return !!p && NO_RACK.indexOf(p.id.replace('tab-', '')) < 0;
  }
  function ring(e) {   // a box's outer ring (its 0 0 0 Npx shadows)
    var m = getComputedStyle(e).boxShadow.match(/0px 0px 0px [\d.]+px/g) || [];
    return Math.max.apply(null, [0].concat(m.map(function (x) { return parseFloat(x.split(' ')[3]); })));
  }
  // every box type the portal draws (css/styles.css THE BOX rule); the student page uses .im-split sections (user, 2026-11-15)
  function units() {   // every mounted box, in page coordinates (amp head not included: it only sets the top)
    var out = [], y = scrollY, x = scrollX;
    document.querySelectorAll('.container > .home-rack, .container > .alarm-rack, .tab-panel.active, .tab-panel.active .td-wk-box, .tab-panel.active .cr.rpm-rack, .tab-panel.active .im-split > .im-sec-box, .tab-panel.active .im-split > .im-head-card, #importBody > .rpm-loading:first-child, #importBody > .rk-ghost').forEach(function (e) {
      var r = e.getBoundingClientRect(), cs = getComputedStyle(e);
      if (r.height <= 30 || r.width <= 600 || cs.display === 'none' || cs.borderTopWidth === '0px') return;
      var s = ring(e);
      out.push({ l: r.left - s + x, r: r.right + s + x, t: r.top + y, b: r.bottom + y });
    });
    return out;
  }
  function amp() {   // the amp head is drawn by .header::before
    var h = document.querySelector('.header');
    if (!h) return null;
    var r = h.getBoundingClientRect(), s = getComputedStyle(h, '::before');
    return { l: r.left + parseFloat(s.left) + scrollX, r: r.right - parseFloat(s.right) + scrollX,
             t: r.top + parseFloat(s.top) + scrollY, b: r.bottom - parseFloat(s.bottom) + scrollY };
  }

  // Lessons while loading (user, 2026-11-15): remember each box's height when Lessons is shown; while it loads,
  // give the Loading box the first height and add an empty box for each of the others, so nothing jumps.
  // Kept in this browser only (a convenience); the real render replaces it all.
  var HKEY = 'rkLessonsBoxH';
  function lessonsPlaceholders() {
    var ib = document.getElementById('importBody'), p = document.getElementById('tab-import');
    if (!ib || !p || !p.classList.contains('active')) return;
    var real = ib.querySelectorAll(':scope > .im-box');
    if (real.length) {
      var hs = [].map.call(real, function (e) { return e.offsetHeight; });
      if (hs.every(function (h) { return h > 0; })) { try { localStorage.setItem(HKEY, JSON.stringify(hs)); } catch (e) {} }
      return;
    }
    var ld = ib.querySelector(':scope > .rpm-loading:first-child');
    if (!ld || ld.hasAttribute('data-rk-h')) return;
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(HKEY) || 'null'); } catch (e) {}
    if (!Array.isArray(saved) || !saved.length) return;
    ld.setAttribute('data-rk-h', '');
    ld.style.height = saved[0] + 'px';
    saved.slice(1).forEach(function (h) {
      var g = document.createElement('div'); g.className = 'rk-ghost'; g.style.height = h + 'px'; ib.appendChild(g);
    });
  }

  function draw() {
    lessonsPlaceholders();
    var L = document.getElementById('rkLayer');
    if (!lessonsOpen()) {
      document.body.classList.remove('rk-lessons');
      if (L) L.remove();
      last = '';
      return;
    }
    document.body.classList.add('rk-lessons');
    var bs = units(), a = amp();
    if (!bs.length) return;
    var all = a ? bs.concat([a]) : bs;
    var left = Math.min.apply(null, bs.map(function (b) { return b.l; })) - OVER;
    var right = Math.max.apply(null, bs.map(function (b) { return b.r; })) + OVER;
    var top = Math.min.apply(null, all.map(function (b) { return b.t; })) - 5;   // flush with the amp's outer ring
    var ap = document.querySelector('.tab-panel.active');   // tabs with open (unboxed) content too: the rack runs to the bottom of the tab (user, 2026-11-15)
    var bot = Math.max(Math.max.apply(null, bs.map(function (b) { return b.b; })), ap ? ap.getBoundingClientRect().bottom + scrollY : 0) + 20;
    var lx = Math.round(left), rx = Math.round(right - RAIL), w = Math.round(right - left), h = Math.round(bot - top);
    var html = '<div class="rk-back" style="left:' + lx + 'px;top:' + Math.round(top) + 'px;width:' + w + 'px;height:' + h + 'px"></div>';
    all.forEach(function (b) {
      html += '<div class="rk-shade rk-below" style="left:' + (lx + RAIL) + 'px;width:' + (w - 2 * RAIL) + 'px;top:' + Math.round(b.b) + 'px"></div>' +
              '<div class="rk-shade rk-above" style="left:' + (lx + RAIL) + 'px;width:' + (w - 2 * RAIL) + 'px;top:' + Math.round(b.t - 8) + 'px"></div>';
    });
    html += '<div class="rk-rail rk-l" style="left:' + lx + 'px;top:' + Math.round(top) + 'px;height:' + h + 'px"></div>' +
            '<div class="rk-rail rk-r" style="left:' + rx + 'px;top:' + Math.round(top) + 'px;height:' + h + 'px"></div>';
    // the rail holes: exactly two in every gap between units, centred, in the screws' column (user, 2026-11-14)
    var sorted = all.slice().sort(function (p, q) { return p.t - q.t; });
    for (var i = 1; i < sorted.length; i++) {
      var mid = (sorted[i - 1].b + sorted[i].t) / 2;
      [mid - 7.5, mid + 7.5].forEach(function (y) {
        var ty = Math.round(y - 2.25);
        html += '<span class="rk-hole" style="left:' + (lx + 21) + 'px;top:' + ty + 'px"></span>' +
                '<span class="rk-hole" style="left:' + (rx + RAIL - 26) + 'px;top:' + ty + 'px"></span>';
      });
    }
    if (!L) { L = document.createElement('div'); L.id = 'rkLayer'; L.setAttribute('aria-hidden', 'true'); document.body.prepend(L); }
    var ph = document.documentElement.scrollHeight + 'px';
    if (L.style.height !== ph) L.style.height = ph;
    if (html !== last) { L.innerHTML = html; last = html; }
  }

  function start() {
    var body = document.getElementById('importBody');
    document.querySelectorAll('.tab-panel').forEach(function (p) { new MutationObserver(draw).observe(p, { attributes: true, attributeFilter: ['class'] }); });
    if (body) new MutationObserver(draw).observe(body, { childList: true });
    addEventListener('resize', draw);
    setInterval(draw, 1000);
    draw();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
