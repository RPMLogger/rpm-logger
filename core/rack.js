// THE RACK (user, 2026-11-14) — TRIAL ON THE LESSONS TAB ONLY. Look: css/rack.css.
// While Lessons is open: puts body.rk-lessons on, and draws the rack case behind the boxes into #rkLayer:
// a perforated back panel + two rails from the amp head's top to the last box, plus the shadow each unit casts on the back.
// The boxes are never touched: their own corner screws sit on the rails.
// Any other tab: the class comes off and the layer is removed, so the page is exactly as before.
// Redraws when the Lessons tab opens/closes or its content changes, on resize, and once a second (cards opening etc.);
// the layer is only rewritten when something actually moved.
(function () {
  var RAIL = 40, OVER = 6, last = '';

  function lessonsOpen() {
    var p = document.getElementById('tab-import');
    return !!(p && p.classList.contains('active'));
  }
  function ring(e) {   // a box's outer ring (its 0 0 0 Npx shadows)
    var m = getComputedStyle(e).boxShadow.match(/0px 0px 0px [\d.]+px/g) || [];
    return Math.max.apply(null, [0].concat(m.map(function (x) { return parseFloat(x.split(' ')[3]); })));
  }
  function units() {   // every mounted box, in page coordinates (amp head not included: it only sets the top)
    var out = [], y = scrollY, x = scrollX;
    document.querySelectorAll('.container > .home-rack, .container > .alarm-rack, .tab-panel.active, .tab-panel.active .td-wk-box').forEach(function (e) {
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

  function draw() {
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
    var bot = Math.max.apply(null, bs.map(function (b) { return b.b; })) + 20;
    var lx = Math.round(left), rx = Math.round(right - RAIL), w = Math.round(right - left), h = Math.round(bot - top);
    var html = '<div class="rk-back" style="left:' + lx + 'px;top:' + Math.round(top) + 'px;width:' + w + 'px;height:' + h + 'px"></div>';
    all.forEach(function (b) {
      html += '<div class="rk-shade rk-below" style="left:' + (lx + RAIL) + 'px;width:' + (w - 2 * RAIL) + 'px;top:' + Math.round(b.b) + 'px"></div>' +
              '<div class="rk-shade rk-above" style="left:' + (lx + RAIL) + 'px;width:' + (w - 2 * RAIL) + 'px;top:' + Math.round(b.t - 8) + 'px"></div>';
    });
    html += '<div class="rk-rail rk-l" style="left:' + lx + 'px;top:' + Math.round(top) + 'px;height:' + h + 'px"></div>' +
            '<div class="rk-rail rk-r" style="left:' + rx + 'px;top:' + Math.round(top) + 'px;height:' + h + 'px"></div>';
    if (!L) { L = document.createElement('div'); L.id = 'rkLayer'; L.setAttribute('aria-hidden', 'true'); document.body.prepend(L); }
    var ph = document.documentElement.scrollHeight + 'px';
    if (L.style.height !== ph) L.style.height = ph;
    if (html !== last) { L.innerHTML = html; last = html; }
  }

  function start() {
    var p = document.getElementById('tab-import'), body = document.getElementById('importBody');
    if (p) new MutationObserver(draw).observe(p, { attributes: true, attributeFilter: ['class'] });
    if (body) new MutationObserver(draw).observe(body, { childList: true });
    addEventListener('resize', draw);
    setInterval(draw, 1000);
    draw();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
