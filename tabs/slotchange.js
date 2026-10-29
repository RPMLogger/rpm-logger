// ─── TABS / SLOTCHANGE.JS ───────────────────────────────────────────────────
// Slot change (2026-10-28): a student's regular slot changes for good, weekly
// to another spot or weekly <> biweekly. The calendar is changed by hand in
// Google Calendar; this tab is the steps around it, one card each:
//   1 Student · 2 New slot (first lesson on it + Weekly / Biweekly)
//   3 Mute: no Secretary change emails to them until the midnight relabel,
//     their 48h reminder held till then (Counter "Secretary Mute" row)
//   4 Check: the calendar against the new slot, from the first lesson on
//   5 Email: "Your Recurring Slot Has Changed", editable, then Send (keeps a
//     Counter "Slot Changes" row; the Secretary no longer sends this one)
// Backend RPM_SlotChange.gs: getSlotChange, muteSlotStudent, checkSlotChange,
// previewSlotChange, sendSlotChange.

var SLC_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
var SLC_ANCHOR_A = new Date(2026, 8, 14);   // a Week A Monday, as RPM_FixedCal.gs

var _slc = { data: null, name: '', type: 'weekly', date: '', time: '', muted: false, check: null, mail: null, sent: '' };

function initSlotChangeTab() {
  _slcInjectStyle();
  var body = document.getElementById('slcBody');
  if (!body) return;
  if (!_slc.data) body.innerHTML = '<div class="empty-state rpm-loading">Reading 8 weeks of lessons</div>';
  var url = getScriptUrl();
  if (!url) return;
  fetch(url + '?action=getSlotChange')
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (!d.success) { body.innerHTML = '<div class="empty-state">Error: ' + inqEsc(d.message || 'backend not deployed yet') + '</div>'; return; }
      _slc.data = d;
      if (_slc.name) _slc.muted = _slc.muted || d.muted.indexOf(_slc.name) !== -1;
      _slcRender();
    })
    .catch(function() { body.innerHTML = '<div class="empty-state">Connection failed</div>'; });
}

function _slcStudent() {
  var d = _slc.data;
  return d ? d.students.filter(function(s) { return s.name === _slc.name; })[0] : null;
}
function _slcTimeLbl(min) {
  var h = Math.floor(min / 60), m = min % 60;
  return ((h % 12) || 12) + ':' + (m < 10 ? '0' : '') + m + (h < 12 ? ' AM' : ' PM');
}
function _slcSlotLbl(s) {
  return (s.type === 'biweekly' ? 'Biweekly' : 'Weekly') + ' · ' + SLC_DAYS[s.dayIdx] + ' ' + _slcTimeLbl(s.startMin) +
         (s.type === 'biweekly' && s.week ? ' · Week ' + s.week : '');
}
function _slcWeekOf(d) {
  var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - (x.getDay() + 6) % 7);
  var w = Math.round((x - SLC_ANCHOR_A) / (7 * 86400000));
  return ((w % 2) + 2) % 2 === 0 ? 'A' : 'B';
}
// The new slot as { type, dayIdx, startMin, week } or null.
function _slcNew() {
  var d = rpmDtpParse(_slc.date), m = String(_slc.time || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!d || !m) return null;
  return { type: _slc.type, dayIdx: (d.getDay() + 6) % 7, startMin: +m[1] * 60 + +m[2], week: _slc.type === 'biweekly' ? _slcWeekOf(d) : '' };
}
// The slot it changes from: the student's slot that isn't the new one.
function _slcOld() {
  var s = _slcStudent(), n = _slcNew();
  if (!s || !s.slots.length) return null;
  var diff = s.slots.filter(function(x) { return !n || x.type !== n.type || x.dayIdx !== n.dayIdx || x.startMin !== n.startMin; });
  return diff[0] || s.slots[0];
}

// Anything changed above a step clears what came after it.
function _slcReset(from) {
  if (from <= 2) _slc.check = null;
  if (from <= 4) { _slc.mail = null; _slc.sent = ''; }
}

function _slcPick(i) {
  var s = _slc.data.students[i];
  if (!s || s.name === _slc.name) return;
  _slc.name = s.name;
  _slc.muted = _slc.data.muted.indexOf(s.name) !== -1;
  var cur = s.slots[0];
  _slc.type = cur.type;
  _slc.date = ''; _slc.time = cur ? _slcPad(Math.floor(cur.startMin / 60)) + ':' + _slcPad(cur.startMin % 60) : '';
  _slcReset(1);
  _slcRender();
}
function _slcPad(n) { return (n < 10 ? '0' : '') + n; }

function _slcSetType(t) {
  if (_slc.type === t) return;
  _slc.type = t;
  _slcReset(2);
  _slcRender();
}

function _slcRender() {
  var body = document.getElementById('slcBody');
  if (!body || !_slc.data) return;
  var d = _slc.data, s = _slcStudent();
  var html = '<div class="slc-cards">';

  // 1 Student
  html += _slcCard(1, 'Student', '<div class="slc-names">' + d.students.map(function(x, i) {
    var muted = d.muted.indexOf(x.name) !== -1;
    return '<button class="link-btn' + (x.name === _slc.name ? ' lit' : '') + '" onclick="_slcPick(' + i + ')">' + inqEsc(x.name) +
           (muted ? ' <span class="slc-mutetag">muted</span>' : '') + '</button>';
  }).join('') + '</div>' +
  (s ? s.slots.map(function(x) { return _slcRow('Now', _slcSlotLbl(x)); }).join('') : ''), true);

  if (!s) { body.innerHTML = html + _slcRecentHtml() + '</div>'; return; }

  // 2 New slot
  var n = _slcNew(), old = _slcOld();
  var tbtn = function(t, l) { return '<button class="link-btn' + (_slc.type === t ? ' lit' : '') + '" onclick="_slcSetType(\'' + t + '\')">' + l + '</button>'; };
  html += _slcCard(2, 'New slot',
    '<div class="slc-line">' + tbtn('weekly', 'Weekly') + tbtn('biweekly', 'Biweekly') + '</div>' +
    '<div class="slc-line"><span class="slc-lab">First lesson on the new slot</span><span id="slcPick">' +
      rpmDtpHtml('slc', { date: _slc.date, time: _slc.time, min: 'today', onChange: _slcPickChanged }) + '</span></div>' +
    (n ? _slcRow('From', old ? _slcSlotLbl(old) : '—') + _slcRow('To', _slcSlotLbl(n), 'lead') : ''), true);

  // 3 Mute
  var cal = n ? 'https://calendar.google.com/calendar/r/week/' + _slc.date.replace(/-/g, '/') : 'https://calendar.google.com/calendar/r';
  html += _slcCard(3, 'Mute and change the calendar', _slc.muted
    ? _slcRow('Muted', 'until midnight', 'lead') +
      '<div class="slc-note">No Secretary change emails to ' + inqEsc(_slc.name.split(' ')[0]) + ' until the midnight relabel, and their 48-hour reminder is held till then.</div>' +
      '<ol class="slc-steps"><li>In Google Calendar, delete the old lessons from ' + (n ? _slcDateLbl(_slc.date) : 'the first new lesson') + ' on (<em>This and following events</em>).</li>' +
      '<li>Create the new ' + (_slc.type === 'biweekly' ? 'biweekly series on the Biweekly' : 'weekly series on the Weekly') + ' calendar, first lesson ' + (n ? _slcDateLbl(_slc.date) + ' at ' + _slcTimeLbl(n.startMin) : 'on the new slot') + '.</li></ol>' +
      '<div class="slc-acts"><a class="link-btn" href="' + cal + '" target="_blank" rel="noopener">Open Google Calendar</a></div>'
    : '<div class="slc-note">Mutes ' + inqEsc(_slc.name.split(' ')[0]) + ' for the rest of today: no Secretary change emails, 48-hour reminder held. Back to normal after the midnight relabel.</div>' +
      '<div class="slc-acts"><button class="link-btn amber" id="slcMuteBtn" onclick="_slcMute(this)"' + (n ? '' : ' disabled') + '>Mute &amp; start</button><span id="slcMuteMsg"></span></div>', !!n);

  // 4 Check
  var ck = _slc.check;
  html += _slcCard(4, 'Check the calendar',
    (ck ? ck.checks.map(function(c) { return '<div class="slc-ck ' + (c.ok ? 'ok' : 'no') + '"><span>' + (c.ok ? '✓' : '✗') + '</span>' + inqEsc(c.text) + '</div>'; }).join('') +
          (ck.lastOld ? _slcRow('Last old lesson', ck.lastOld) : '') : '<div class="slc-note">After the calendar is changed: reads ' + inqEsc(_slc.name.split(' ')[0]) + '\'s lessons and checks them against the new slot.</div>') +
    '<div class="slc-acts"><button class="link-btn" id="slcCheckBtn" onclick="_slcCheck(this)"' + (n && _slc.muted ? '' : ' disabled') + '>' + (ck ? 'Check again' : 'Check') + '</button><span id="slcCheckMsg"></span></div>',
    !!(n && _slc.muted));

  // 5 Email
  var m = _slc.mail;
  html += _slcCard(5, 'Email', _slc.sent
    ? _slcRow('Sent', inqEsc(_slc.sent), 'lead')
    : m
    ? '<div class="slc-line"><span class="slc-lab">To</span><input class="rpm-field" id="slcTo" value="' + _auEsc(m.to || '') + '"></div>' +
      '<div class="slc-line"><span class="slc-lab">Subject</span><input class="rpm-field" id="slcSubj" value="' + _auEsc(m.subject) + '"></div>' +
      '<textarea class="rpm-field slc-bodytxt" id="slcText" rows="13">' + inqEsc(m.body) + '</textarea>' +
      '<div class="slc-note">Signature and logo are added when it is sent.</div>' +
      '<div class="slc-acts"><button class="link-btn" onclick="_slcPreview(this)">Rewrite</button><button class="link-btn amber" id="slcSendBtn" onclick="_slcSend(this)">' + (ck && !ck.ok ? 'Send anyway' : 'Send') + '</button><span id="slcSendMsg"></span></div>'
    : '<div class="slc-note">Writes "Your Recurring Slot Has Changed" for you to read and edit before it goes.</div>' +
      '<div class="slc-acts"><button class="link-btn" id="slcPrevBtn" onclick="_slcPreview(this)"' + (ck ? '' : ' disabled') + '>Write email</button><span id="slcPrevMsg"></span></div>',
    !!ck);

  body.innerHTML = html + _slcRecentHtml() + '</div>';
}

function _slcCard(n, title, inner, on) {
  return '<div class="inq-dcard ld-card slc-card' + (on ? '' : ' slc-off') + '"><div class="ld-title"><span class="slc-n">' + n + '</span>' + title + '</div>' + inner + '</div>';
}
function _slcRow(l, v, cls) {
  return '<div class="ld-row' + (cls ? ' ' + cls : '') + '"><span class="ld-l">' + l + '</span><span class="ld-v">' + v + '</span></div>';
}
function _slcDateLbl(ymd) {
  var d = rpmDtpParse(ymd);
  return d ? ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()] + ', ' + ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()] + ' ' + d.getDate() : '';
}
function _slcRecentHtml() {
  var r = (_slc.data && _slc.data.recent) || [];
  if (!r.length) return '';
  return '<div class="inq-dcard ld-card slc-card"><div class="ld-title">Recent slot changes</div>' + r.map(function(x) {
    return _slcRow(inqEsc(x.name), inqEsc((x.oldSlot ? x.oldSlot + ' → ' : '') + x.newSlot + ' · ' + x.cal + ' · from ' + x.starting));
  }).join('') + '</div>';
}

// The picker redraws only its own labels; the From / To rows and later steps follow.
function _slcPickChanged() {
  var v = rpmDtpGet('slc');
  if (v.date === _slc.date && v.time === _slc.time) return;
  _slc.date = v.date; _slc.time = v.time;
  _slcReset(2);
  clearTimeout(_slcPickChanged.t);
  _slcPickChanged.t = setTimeout(_slcRender, 350);   // let a held chevron finish first
}

function _slcCall(q) {
  var url = getScriptUrl();
  if (!url) return Promise.reject(new Error('No script URL'));
  return fetch(url + q).then(function(r) { return r.json(); });
}
function _slcParams() {
  return '&name=' + encodeURIComponent(_slc.name) + '&type=' + _slc.type + '&date=' + encodeURIComponent(_slc.date) + '&time=' + encodeURIComponent(_slc.time);
}
function _slcBusy(btn, on) { rpmBusy(btn.closest('.slc-card'), btn, on); }

function _slcMute(btn) {
  _slcBusy(btn, true);
  _slcCall('?action=muteSlotStudent&name=' + encodeURIComponent(_slc.name))
    .then(function(d) {
      _slcBusy(btn, false);
      if (!d.success) { rpmFail('slcMuteMsg', d.message || 'Failed', 'left'); return; }
      _slc.muted = true;
      if (_slc.data.muted.indexOf(_slc.name) === -1) _slc.data.muted.push(_slc.name);
      _slcRender();
    })
    .catch(function() { _slcBusy(btn, false); rpmFail('slcMuteMsg', 'Connection failed', 'left'); });
}

function _slcCheck(btn) {
  _slcBusy(btn, true);
  _slcCall('?action=checkSlotChange' + _slcParams())
    .then(function(d) {
      _slcBusy(btn, false);
      if (!d.success) { rpmFail('slcCheckMsg', d.message || 'Failed', 'left'); return; }
      _slc.check = d;
      _slcReset(4);
      _slcRender();
    })
    .catch(function() { _slcBusy(btn, false); rpmFail('slcCheckMsg', 'Connection failed', 'left'); });
}

function _slcPreview(btn) {
  var old = _slcOld();
  _slcBusy(btn, true);
  _slcCall('?action=previewSlotChange' + _slcParams() +
           (old ? '&oldType=' + old.type + '&oldDay=' + old.dayIdx + '&oldTime=' + old.startMin : ''))
    .then(function(d) {
      _slcBusy(btn, false);
      if (!d.success) { rpmFail(_slc.mail ? 'slcSendMsg' : 'slcPrevMsg', d.message || 'Failed', 'left'); return; }
      _slc.mail = d;
      _slcRender();
    })
    .catch(function() { _slcBusy(btn, false); rpmFail(_slc.mail ? 'slcSendMsg' : 'slcPrevMsg', 'Connection failed', 'left'); });
}

function _slcSend(btn) {
  var m = _slc.mail;
  m.to = document.getElementById('slcTo').value.trim();
  m.subject = document.getElementById('slcSubj').value.trim();
  m.body = document.getElementById('slcText').value;
  _slcBusy(btn, true);
  _slcCall('?action=sendSlotChange&name=' + encodeURIComponent(_slc.name) + '&to=' + encodeURIComponent(m.to) +
           '&subject=' + encodeURIComponent(m.subject) + '&body=' + encodeURIComponent(m.body) +
           '&cal=' + encodeURIComponent(m.cal || '') + '&oldSlot=' + encodeURIComponent(m.oldSlot || '') +
           '&newSlot=' + encodeURIComponent(m.newSlot || '') + '&starting=' + encodeURIComponent(m.starting || ''))
    .then(function(d) {
      _slcBusy(btn, false);
      if (!d.success) { rpmFail('slcSendMsg', d.message || 'Failed', 'left'); return; }
      _slc.sent = m.to;
      if (!d.tickError) {
        _slc.data.recent.unshift({ name: _slc.name, cal: m.cal, oldSlot: m.oldSlot, newSlot: m.newSlot, starting: m.starting });
      }
      _slcRender();
      if (d.tickError) rpmToast('half', 'Sent, not recorded', d.tickError);
    })
    .catch(function() { _slcBusy(btn, false); rpmFail('slcSendMsg', 'Connection failed', 'left'); });
}

function _slcInjectStyle() {
  if (document.getElementById('slcStyle')) return;
  var st = document.createElement('style');
  st.id = 'slcStyle';
  st.textContent =
    ".slc-cards{display:flex;flex-direction:column;gap:16px;max-width:760px}" +
    ".slc-card .ld-title{margin-bottom:16px;display:flex;align-items:baseline;gap:10px}" +
    ".slc-n{color:var(--accent2)}" +
    ".slc-off{opacity:.45}" +
    ".slc-off button,.slc-off a{pointer-events:none}" +
    ".slc-names{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}" +
    ".slc-mutetag{font-size:9px;color:var(--accent2);letter-spacing:.5px}" +
    ".slc-line{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px}" +
    ".slc-line .rpm-field{flex:1 1 260px;width:auto}" +
    ".slc-lab{font-family:'DM Mono',monospace;font-size:11px;color:var(--t-normal);min-width:64px}" +
    ".slc-note{font-family:'DM Mono',monospace;font-size:11px;line-height:1.6;color:var(--muted);margin:4px 0 10px}" +
    ".slc-steps{font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7;color:var(--t-normal);margin:0 0 12px;padding-left:20px}" +
    ".slc-acts{display:flex;align-items:center;gap:8px;margin-top:6px}" +
    ".slc-ck{display:flex;gap:10px;font-family:'DM Mono',monospace;font-size:12px;line-height:1.5;padding:4px 0;color:var(--text)}" +
    ".slc-ck span{flex:none;width:12px}" +
    ".slc-ck.ok span{color:var(--green)}" +
    ".slc-ck.no{color:#ff5a4d}" +
    ".slc-bodytxt{margin-bottom:6px}";
  document.head.appendChild(st);
}
