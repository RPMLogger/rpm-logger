// ─── TABS / IMPORT.JS ───────────────────────────────────────────────────────
// Import (2026-10-04): every lesson a student has logged in Students Import,
// lessons only (no payments, no HW). Student cards first (today's on top,
// then A–Z, the Dropbox cards' look); a card opens the full list, newest
// first, under year headings. Reads only: getStudentRoster (Counter names)
// and getPastLessons (Import rows 12+, B subject, I date).

var _imRoster = null;   // names from the Counter, A–Z
var _imOpen = null;     // name of the open student, or null on the cards

function initImportTab() {
  if (_imOpen) { _imOpenStudent(_imOpen); return; }
  if (_imRoster) { _imRenderCards(); return; }
  var body = document.getElementById('importBody');
  body.innerHTML = '<div class="empty-state rpm-loading">Loading</div>';
  fetch(getScriptUrl() + '?action=getStudentRoster')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d.success) { body.innerHTML = '<div class="empty-state" id="imFail"></div>'; rpmFail('imFail', d.message || 'unknown', 'center'); return; }
      _imRoster = d.students || [];
      _imRenderCards();
    })
    .catch(function () { body.innerHTML = '<div class="empty-state" id="imFail"></div>'; rpmFail('imFail', 'No answer from Google.', 'center'); });
}

function _imKey(n) { return String(n || '').trim().toLowerCase().replace(/\s+/g, ' '); }

function _imRenderCards() {
  var body = document.getElementById('importBody');
  var today = (typeof todayStudents !== 'undefined' && todayStudents) || [];
  var isToday = {};
  today.forEach(function (t) { isToday[_imKey(t.name)] = 1; });
  var names = _imRoster.slice().sort(function (a, b) {
    var ta = isToday[_imKey(a)] ? 0 : 1, tb = isToday[_imKey(b)] ? 0 : 1;
    return ta - tb || a.localeCompare(b);
  });
  body.innerHTML =
    '<div class="db-section">' +
      '<div class="settings-title"><span>Import<span class="win-sub"> · Students</span></span></div>' +
      '<div class="db-cards-head"><label class="field-label">' + names.length + ' students</label></div>' +
      names.map(function (n) {
        return '<div class="db-card im-card' + (isToday[_imKey(n)] ? ' im-today' : '') + '" onclick="_imOpenStudent(' + _auEsc(JSON.stringify(n)) + ')" data-tip="Instant.\nEvery lesson logged for ' + _auEsc(n) + '.">' +
          '<div class="db-card-l"><span class="db-card-n">' + inqEsc(n) + '</span>' +
            (isToday[_imKey(n)] ? '<span class="db-card-s">Today</span>' : '') + '</div>' +
        '</div>';
      }).join('') +
    '</div>';
}

function _imOpenStudent(name) {
  _imOpen = name;
  _imHw = null;
  _imLoadHw(name);
  var body = document.getElementById('importBody');
  body.innerHTML = _imBack() + '<div class="empty-state rpm-loading">Loading</div>';
  window.scrollTo(0, 0);
  fetch(getScriptUrl() + '?action=getPastLessons&count=9999&studentName=' + encodeURIComponent(name))
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (_imOpen !== name) return;
      if (!d.success) { body.innerHTML = _imBack() + '<div class="empty-state" id="imFail"></div>'; rpmFail('imFail', d.message || 'unknown', 'center'); return; }
      _imRenderStudent(name, d.lessons || []);
    })
    .catch(function () {
      if (_imOpen !== name) return;
      body.innerHTML = _imBack() + '<div class="empty-state" id="imFail"></div>'; rpmFail('imFail', 'No answer from Google.', 'center');
    });
}

function _imBack() {
  return '<div style="margin-bottom:22px"><button class="link-btn" onclick="_imClose()" data-tip="Instant.\nBack to the students.">' + ARROW_ICON + '<span>Back</span></button></div>';
}

function _imClose() { _imOpen = null; _imLast = null; _imRoster ? _imRenderCards() : initImportTab(); }

var _imLast = null;   // { name, lessons } of the open student, for re-sorting

// lessons arrive newest first, dates without a year ("Sep /30"). Walking down
// that list, a month later than the one above it means the year went back one.
// Then blocks of 4, 1 2 3 4 inside each, as the sheet lays them out; empty
// slots (the current block's, or a blank row) show dimmed.
function _imRenderStudent(name, lessons) {
  _imLast = { name: name, lessons: lessons };
  var body = document.getElementById('importBody');
  var total = lessons.length, year = new Date().getFullYear(), prevMon = null, nowMon = new Date().getMonth();
  var items = lessons.map(function (l) {
    var m = String(l.date || '').replace(/\//g, '').trim().match(/^([A-Za-z]{3})\s*(\d{1,2})$/);
    var mon = m ? MONTHS.indexOf(m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase()) : -1;
    if (mon >= 0) {
      if (prevMon === null) { if (mon > nowMon) year--; }
      else if (mon > prevMon) year--;
      prevMon = mon;
    }
    return { year: year, row: l.row, n: l.n, date: m ? m[1] + ' ' + parseInt(m[2], 10) : (l.date || '—'), subject: l.subject };
  }).reverse();   // oldest first

  // Blocks are the sheet's own: column M numbers each row 1-4, so a blank row
  // stays an empty slot. Without row numbers (older backend), count
  // lessons in fours instead.
  var blocks = [];
  if (items.length && items[0].row) {
    var byBlock = {}, keys = [];
    items.forEach(function (it) {
      // Column M's 1-4 decides the slot; the row is the fallback.
      var slot = (it.n >= 1 && it.n <= 4) ? it.n - 1 : (it.row - 12) % 4;
      var b = it.row - slot;   // the block's first row
      if (!byBlock[b]) { byBlock[b] = [null, null, null, null]; keys.push(b); }
      byBlock[b][slot] = it;
    });
    blocks = keys.map(function (b) { var a = byBlock[b]; a.year = (a.filter(Boolean)[0] || {}).year; return a; });
  } else {
    for (var i = 0; i < items.length; i += 4) { var c = items.slice(i, i + 4); c.year = c[0].year; blocks.push(c); }
  }
  var order = blocks;   // always oldest first (2026-10-04: the newest lesson sits on top of Last HW)

  var lastYear = null;
  var html = order.map(function (b) {
    var y = b.year, head = '';
    if (y !== lastYear) { head = '<div class="im-year">' + y + '</div>'; lastYear = y; }
    var rows = [0, 1, 2, 3].map(function (k) {
      var l = b[k];
      // 1-4, the lesson, and the date on the right (2026-10-04). No HW
      // column: Last HW under the list covers it (user's call).
      if (!l) return '<div class="im-row im-empty"><span class="im-n">' + (k + 1) + '</span><span class="im-s"></span><span class="im-d">—</span></div>';
      return '<div class="im-row">' +
        '<span class="im-n">' + (k + 1) + '</span>' +
        '<span class="im-s">' + (l.subject ? inqEsc(l.subject) : '<span style="color:var(--muted)">—</span>') + '</span>' +
        '<span class="im-d">' + inqEsc(l.date) + '</span>' +
      '</div>';
    }).join('');
    return head + '<div class="im-block">' + rows + '</div>';
  }).join('');

  body.innerHTML = _imBack() +
    // Window-style (2026-10-04): the title inside the box, the name in red,
    // " · Lessons" in grey.
    '<div class="db-panel im-list" id="imList">' +
      '<div class="settings-title im-title"><span>' + inqEsc(name) + '<span class="win-sub"> · Lessons</span></span></div>' +
      (items.length ?
html
      : 'No lessons logged yet') + '</div>' +
    '<div class="db-dt-gap"><label class="field-label">Last HW</label>' +
      '<div class="db-panel db-files" id="imLastHw">' + _imLastHwHtml() + '</div></div>';
  // A line cut short with "…" shows its full text on hover.
  body.querySelectorAll('.im-row .im-s').forEach(function (el) {
    // On the row: the cell's overflow:hidden would clip its own CSS tooltip.
    if (el.scrollWidth > el.clientWidth + 1) el.parentNode.setAttribute('data-tip', el.textContent);
  });
}

// ── HW (2026-10-04): this student's rows from the HW Tracking sheet ──
// Under the list, the newest HW in full (Last HW): what was given last time.
var _imHw = null;   // { rows: [...] newest first }

function _imLoadHw(name) {
  fetch(getScriptUrl() + '?action=getHwLog&name=' + encodeURIComponent(name))
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (_imOpen !== name || !d.success) return;
      _imHw = { rows: d.rows || [] };
      if (_imLast && _imLast.name === name) _imRenderStudent(name, _imLast.lessons);
    })
    .catch(function () {});
}

function _imLastHwHtml() {
  if (!_imHw) return '<span style="color:var(--muted)">Loading</span>';
  var r = _imHw.rows[0];
  if (!r) return '<span style="color:var(--muted)">No HW logged yet</span>';
  var p = String(r.date).split('-');
  var head = MONTHS[parseInt(p[1], 10) - 1] + ' ' + parseInt(p[2], 10) + (r.lesson ? ' · Lesson ' + r.lesson : '');
  var body = r.hw === 'Sent'
    ? _dbDetailsFilesHtml({ items: r.files.map(function (x) { return { name: x.split('/').pop(), path: x }; }) })
    : '<span class="db-file" style="color:rgba(255,255,255,0.4)">No HW</span>';
  return '<div class="db-hw-head">' + head + '</div>' + body;
}
