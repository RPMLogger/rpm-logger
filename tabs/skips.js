// ─── TABS / SKIPS.JS ────────────────────────────────────────────────────────
// Who's skipping, this year. Read-only view over Skip Logs (the source of
// truth) — skips are LOGGED from the Home tab: tap a red lesson day → Skip →
// Student/Teacher. Nothing here writes.
//
// Each student row shows three counts: Student (they cancelled), Teacher (you
// cancelled), Vacation (travel blocks). Tap a row to expand the individual
// skips with date + note. Students with no skips this year are tucked behind a
// "show all" toggle so the list stays about the people who actually skip.

var _skData = null;      // last payload, so expand/collapse needs no refetch
var _skShowZero = false; // include zero-skip students in the list

function initSkipsTab() {
  var section = document.getElementById('skipsBody');
  if (!section) return;
  section.innerHTML = '<div class="empty-state">Loading…</div>';

  var url = getScriptUrl();
  if (!url) { section.innerHTML = '<div class="empty-state">No script URL set</div>'; return; }

  fetch(url + '?action=getSkipsStudents')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.success) {
        section.innerHTML = '<div class="empty-state">Error: ' + _skEsc(data.message || 'unknown') + '</div>';
        return;
      }
      _skData = data;
      _skRender();
    })
    .catch(function() { section.innerHTML = '<div class="empty-state">Connection failed</div>'; });
}

function _skRender() {
  var section = document.getElementById('skipsBody');
  if (!section || !_skData) return;
  section.innerHTML = '';

  var all     = _skData.students || [];
  var totals  = _skData.totals || { student: 0, teacher: 0, vacation: 0 };
  var year    = _skData.year || '';
  var withAny = all.filter(function(s) { return s.total > 0; });
  var zeroCt  = all.length - withAny.length;

  // ── Top bar: year total + refresh ──
  var bar = document.createElement('div');
  bar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px';
  bar.innerHTML =
    "<span style='font-size:11px;color:var(--muted);letter-spacing:0.5px'>" +
      _skEsc(year) + " · " + _skPlural(totals.student + totals.teacher + totals.vacation, 'skip') +
    "</span>";
  var refreshBtn = document.createElement('button');
  refreshBtn.textContent = '⟳ Refresh';
  refreshBtn.style.cssText = 'padding:6px 14px;font-size:12px;background:transparent;color:var(--muted);border:1px solid var(--border);border-radius:4px;cursor:pointer;letter-spacing:0.5px;flex:0 0 auto';
  refreshBtn.onclick = initSkipsTab;
  bar.appendChild(refreshBtn);
  section.appendChild(bar);

  // ── Three totals across the top ──
  var strip = document.createElement('div');
  strip.style.cssText = 'display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap';
  strip.innerHTML =
    _skTotalCard('Student', totals.student,  '#ff7a3c') +
    _skTotalCard('Teacher', totals.teacher,  '#ffb400') +
    _skTotalCard('Vacation', totals.vacation, '#4aa3ff');
  section.appendChild(strip);

  if (!all.length) {
    var empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No students on the Skips sheet';
    section.appendChild(empty);
    return;
  }

  var list = _skShowZero ? all : withAny;

  if (!list.length) {
    var none = document.createElement('div');
    none.className = 'empty-state';
    none.textContent = 'No skips logged in ' + year;
    section.appendChild(none);
  }

  // Most skips first; ties alphabetical.
  list.slice().sort(function(a, b) {
    return (b.total - a.total) || a.name.localeCompare(b.name);
  }).forEach(function(s) {
    section.appendChild(_skStudentCard(s));
  });

  // ── Toggle for the zero-skip students ──
  if (zeroCt > 0) {
    var toggle = document.createElement('button');
    toggle.textContent = _skShowZero
      ? '− Hide ' + _skPlural(zeroCt, 'student') + ' with no skips'
      : '+ Show ' + _skPlural(zeroCt, 'student') + ' with no skips';
    toggle.style.cssText = 'margin-top:6px;padding:7px 14px;font-size:11px;background:transparent;color:var(--muted);border:1px dashed var(--border);border-radius:4px;cursor:pointer;width:100%;letter-spacing:0.5px';
    toggle.onclick = function() { _skShowZero = !_skShowZero; _skRender(); };
    section.appendChild(toggle);
  }
}

function _skTotalCard(label, n, color) {
  return "<div style='flex:1 1 90px;border:1px solid var(--border);border-radius:6px;background:var(--panel);padding:9px 12px'>" +
           "<div style='font-size:19px;font-weight:700;color:" + color + "'>" + (n || 0) + "</div>" +
           "<div style='font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:0.6px;margin-top:1px'>" + label + "</div>" +
         "</div>";
}

function _skStudentCard(s) {
  var card = document.createElement('div');
  card.style.cssText = 'border:1px solid var(--border);border-radius:6px;background:var(--panel);margin-bottom:8px;overflow:hidden';

  var hasSkips = s.total > 0;

  var hdr = document.createElement('div');
  hdr.style.cssText = 'padding:10px 12px;display:flex;justify-content:space-between;align-items:center;gap:10px' +
                      (hasSkips ? ';cursor:pointer' : '');
  hdr.innerHTML =
    "<span style='font-weight:600;font-size:13px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap'>" +
      (hasSkips ? "<span class='sk-caret' style='color:var(--muted);font-size:10px;margin-right:6px;display:inline-block'>▸</span>" : "") +
      _skEsc(s.name) +
    "</span>" +
    "<span style='display:flex;align-items:center;gap:5px;flex:0 0 auto'>" +
      _skChip(s.totalStudent,  '#ff7a3c', 'Student — they cancelled') +
      _skChip(s.totalTeacher,  '#ffb400', 'Teacher — you cancelled') +
      _skChip(s.totalVacation, '#4aa3ff', 'Vacation — travel block') +
    "</span>";
  card.appendChild(hdr);

  if (!hasSkips) return card;

  var body = document.createElement('div');
  body.style.cssText = 'display:none;border-top:1px solid var(--border)';
  (s.skips || []).forEach(function(k) {
    var row = document.createElement('div');
    row.style.cssText = 'padding:8px 12px;border-top:1px solid rgba(255,255,255,0.04);display:flex;justify-content:space-between;align-items:baseline;gap:10px';
    row.innerHTML =
      "<div style='min-width:0'>" +
        "<span style='font-size:12px;font-weight:600'>" + _skEsc(k.date) + "</span>" +
        (k.day ? "<span style='font-size:10px;color:var(--muted);margin-left:6px'>" + _skEsc(k.day) + "</span>" : "") +
        (k.note ? "<div style='font-size:10px;color:var(--muted);margin-top:2px;word-break:break-word'>" + _skEsc(k.note) + "</div>" : "") +
      "</div>" +
      _skWhoBadge(k.who);
    body.appendChild(row);
  });
  card.appendChild(body);

  hdr.onclick = function() {
    var open = body.style.display !== 'none';
    body.style.display = open ? 'none' : 'block';
    var caret = hdr.querySelector('.sk-caret');
    if (caret) caret.textContent = open ? '▸' : '▾';
  };

  return card;
}

// A count chip. Zero counts stay in place but dimmed, so the three columns
// line up down the list instead of jumping around.
function _skChip(n, color, title) {
  var on = Number(n) > 0;
  return "<span title='" + _skEsc(title) + "' style='min-width:22px;text-align:center;font-size:11px;font-weight:700;padding:2px 6px;border-radius:4px;" +
         (on ? "color:" + color + ";background:" + _skFade(color) + ";border:1px solid " + _skFade(color, 0.45)
             : "color:var(--border);background:transparent;border:1px solid transparent") +
         "'>" + (n || 0) + "</span>";
}

function _skWhoBadge(who) {
  var map = {
    'Student':  '#ff7a3c',
    'Teacher':  '#ffb400',
    'Vacation': '#4aa3ff'
  };
  var c = map[who] || 'var(--muted)';
  return "<span style='flex:0 0 auto;font-size:9px;text-transform:uppercase;letter-spacing:0.5px;color:" + c +
         ";border:1px solid " + _skFade(c, 0.4) + ";background:" + _skFade(c) + ";border-radius:3px;padding:2px 6px'>" +
         _skEsc(who) + "</span>";
}

// Hex → rgba at low alpha, for chip backgrounds. Non-hex passes through.
function _skFade(hex, a) {
  a = a || 0.14;
  if (String(hex).charAt(0) !== '#') return 'transparent';
  var r = parseInt(hex.substr(1, 2), 16),
      g = parseInt(hex.substr(3, 2), 16),
      b = parseInt(hex.substr(5, 2), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
}

function _skPlural(n, word) { return n + ' ' + word + (Number(n) === 1 ? '' : 's'); }

function _skEsc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
