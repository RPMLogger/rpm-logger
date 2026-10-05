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

function _imClose() { _imOpen = null; _imRoster ? _imRenderCards() : initImportTab(); }

// lessons arrive newest first, dates without a year ("Sep /30"). Walking down
// the list, a month later than the one above it means the year went back one.
function _imRenderStudent(name, lessons) {
  var body = document.getElementById('importBody');
  var total = lessons.length, year = new Date().getFullYear(), prevMon = null;
  var nowMon = new Date().getMonth();
  var rows = [], lastYear = null;
  lessons.forEach(function (l, i) {
    var m = String(l.date || '').replace(/\//g, '').trim().match(/^([A-Za-z]{3})\s*(\d{1,2})$/);
    var mon = m ? MONTHS.indexOf(m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase()) : -1;
    if (mon >= 0) {
      if (prevMon === null) { if (mon > nowMon) year--; }
      else if (mon > prevMon) year--;
      prevMon = mon;
    }
    if (year !== lastYear) { rows.push('<div class="im-year">' + year + '</div>'); lastYear = year; }
    rows.push('<div class="im-row">' +
      '<span class="im-n">' + (total - i) + '</span>' +
      '<span class="im-d">' + inqEsc(m ? m[1] + ' ' + parseInt(m[2], 10) : (l.date || '—')) + '</span>' +
      '<span class="im-s">' + (l.subject ? inqEsc(l.subject) : '<span style="color:var(--muted)">—</span>') + '</span>' +
    '</div>');
  });
  body.innerHTML = _imBack() +
    '<label class="field-label">Student</label>' +
    '<div class="im-head"><span class="inq-name">' + inqEsc(name) + '</span>' +
      '<span class="im-count">' + total + (total === 1 ? ' lesson' : ' lessons') + '</span></div>' +
    '<div class="db-panel im-list">' + (rows.length ? rows.join('') : 'No lessons logged yet') + '</div>';
}
