// ─── TRIAL TAB ───────────────────────────────────────────────────────────────
// The entrance of the student lifecycle: book a trial student. Two doors —
//   Door 1  Manual: type First/Middle/Last + email + date + time. The portal
//           creates the RPM - Trial calendar event AND the Students Import tab.
//   Door 2  From calendar: you made the event yourself (email in Guests). The
//           portal lists upcoming RPM - Trial events; tap one to pull it in
//           (creates the Students Import tab). Events already pulled show a ✓.
// Backend: bookTrialManual / getTrialEvents / pullTrialFromCalendar (RPM_Trial.js).

function initTrialTab() {
  var url = getScriptUrl();
  var body = document.getElementById('trialBody');
  if (!url) { body.innerHTML = '<div class="empty-state">Set your Apps Script URL in settings first.</div>'; return; }
  body.innerHTML =
    '<div class="section-label" style="margin-bottom:10px">Accepted — book them in</div>' +
    '<div id="trAccepted"><div class="empty-state">Loading…</div></div>' +
    '<hr class="divider" style="margin:22px 0 16px">' +
    _trManualFormHtml() + '<div id="trStatus"></div>' +
    '<hr class="divider" style="margin:22px 0 16px">' +
    '<div class="section-label" style="margin-bottom:10px">From the calendar</div>' +
    '<div id="trCalList"><div class="empty-state">Loading trial events…</div></div>';
  _trLoadAccepted();
  _trLoadCalendar();
}

// ── Accepted (Yes from Inquiries, not yet booked) ────────────────────────────
function _trLoadAccepted() {
  var url = getScriptUrl();
  var box = document.getElementById('trAccepted');
  if (!box || !url) return;
  fetch(url + '?action=getTrialAccepted')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d.success) { box.innerHTML = '<div class="empty-state">⚠ ' + (d.message || 'Could not load') + '</div>'; return; }
      if (!d.accepted || !d.accepted.length) { box.innerHTML = '<div class="empty-state">No accepted inquiries waiting.</div>'; return; }
      box.innerHTML = d.accepted.map(_trAcceptedCard).join('');
    })
    .catch(function () { box.innerHTML = '<div class="empty-state">❌ Could not load.</div>'; });
}

function _trAcceptedCard(a) {
  // Identical markup to an Inquiries card (same classes, same field renderer),
  // so a student's card doesn't change shape when they cross from Inquiries to
  // Trial. Only the action row differs: Book / send back instead of Yes/No.
  var em = _trEsc(a.email || "");
  return '<div class="inq-dcard accepted">' +
      '<div class="inq-drow"><span class="inq-chan">' + inqEsc(a.channel || "Gmail") + '</span></div>' +
      '<div class="inq-name-line"><span class="inq-name">' + inqEsc(a.name || "\u2014") + '</span></div>' +
      '<div class="inq-fields">' + inqCardFieldsHtml(a) + '</div>' +
      '<div class="inq-acts">' +
        '<button class="db-mini-btn" onclick="_trReopen(\'' + em + '\', this)" ' +
          'title="Send back to Inquiries as undecided">\u2190 Inquiries</button>' +
        '<button class="db-mini-btn" onclick="_trBookAccepted(\'' + _trEsc(a.name || "") + '\',\'' + em + '\')">Book \u2192</button>' +
      '</div>' +
    '</div>';
}

// Send an accepted student back to the Inquiries tab. Clears the Decision cell;
// nothing is deleted, so they reappear there as an open card with every field
// intact. For the ones you said Yes to and then never booked.
function _trReopen(email, btn) {
  var url = getScriptUrl();
  if (!url || !email) return;
  if (btn) { btn.disabled = true; btn.textContent = "Sending back\u2026"; }
  fetch(url + '?action=reopenInquiry&email=' + encodeURIComponent(email))
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d.success) {
        if (btn) { btn.disabled = false; btn.textContent = "\u2190 Inquiries"; }
        _trStatus('\u26a0 ' + (d.message || 'Could not send back.'), 'var(--accent)');
        return;
      }
      _trLoadAccepted();
      _trStatus('Sent back to Inquiries \u2014 waiting there as an open card.', 'var(--accent2)');
    })
    .catch(function () {
      if (btn) { btn.disabled = false; btn.textContent = "\u2190 Inquiries"; }
      _trStatus('\u274c Could not reach the portal.', 'var(--accent)');
    });
}

// Prefill the manual booking form from an accepted card + scroll to it.
function _trBookAccepted(name, email) {
  var parts = (name || '').split(' ');
  var first = parts.shift() || '';
  var last = parts.pop() || '';
  var middle = parts.join(' ');
  function set(id, v) { var el = document.getElementById(id); if (el) el.value = v || ''; }
  set('trFirst', first); set('trMiddle', middle); set('trLast', last); set('trEmail', email);
  var f = document.getElementById('trFirst');
  if (f) { f.scrollIntoView({ behavior: 'smooth', block: 'center' }); f.focus(); }
  _trStatus('Filled in ' + name + ' — pick a date + time, then Book trial.', 'var(--accent2)');
}

// ── Door 1: manual booking form ──────────────────────────────────────────────
function _trManualFormHtml() {
  function inp(id, ph, type) {
    return '<input id="' + id + '" type="' + (type || 'text') + '" placeholder="' + ph + '" ' +
      'style="box-sizing:border-box;background:var(--bg);border:1px solid var(--border);border-radius:8px;' +
      'padding:11px 14px;color:var(--text);font-family:\'DM Mono\',monospace;font-size:14px">';
  }
  return '<div class="section-label" style="margin-bottom:10px">Book a trial</div>' +
    '<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:10px">' +
      '<div style="display:flex;gap:8px">' +
        '<span style="flex:1">' + inp('trFirst', 'First') + '</span>' +
        '<span style="flex:1">' + inp('trMiddle', 'Middle (optional)') + '</span>' +
        '<span style="flex:1">' + inp('trLast', 'Last') + '</span>' +
      '</div>' +
      inp('trEmail', 'student email (goes in calendar Guests)', 'email') +
      '<div style="display:flex;gap:8px">' +
        '<span style="flex:2">' + inp('trDate', '', 'date') + '</span>' +
        '<span style="flex:1">' + inp('trTime', '', 'time') + '</span>' +
      '</div>' +
    '</div>' +
    '<button id="trBookBtn" onclick="_trBook()" ' +
      'style="width:100%;box-sizing:border-box;background:var(--accent);color:#fff;border:none;border-radius:10px;' +
      'padding:13px;font-family:\'Syne\',sans-serif;font-size:15px;font-weight:700;cursor:pointer">＋ Book trial</button>';
}

function _trBook() {
  var url = getScriptUrl();
  var first = _trVal('trFirst'), middle = _trVal('trMiddle'), last = _trVal('trLast');
  var email = _trVal('trEmail'), date = _trVal('trDate'), time = _trVal('trTime');
  if (!first)         { _trStatus('Enter at least a first name.', 'var(--accent)'); return; }
  if (!date || !time) { _trStatus('Pick a date and time.', 'var(--accent)'); return; }
  var btn = document.getElementById('trBookBtn');
  if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; btn.style.cursor = 'wait'; btn.textContent = 'Booking…'; }
  _trStatus('Creating the calendar event + student tab…', 'var(--accent2)');
  var qs = 'action=bookTrialManual' +
    '&first=' + encodeURIComponent(first) + '&middle=' + encodeURIComponent(middle) +
    '&last=' + encodeURIComponent(last) + '&email=' + encodeURIComponent(email) +
    '&date=' + encodeURIComponent(date) + '&time=' + encodeURIComponent(time);
  fetch(url + '?' + qs)
    .then(function (r) { return r.json(); })
    .then(function (d) {
      _trRestoreBook();
      if (!d.success) { _trStatus('⚠ ' + (d.message || 'Failed'), 'var(--accent)'); return; }
      _trStatus('✓ Booked ' + d.name + ' — ' + d.dateLabel + (d.created ? ' · tab created' : ' · tab already existed'), 'var(--green)');
      ['trFirst','trMiddle','trLast','trEmail','trDate','trTime'].forEach(function (id) { var el = document.getElementById(id); if (el) el.value = ''; });
      _trLoadCalendar();
      _trLoadAccepted();
    })
    .catch(function () { _trRestoreBook(); _trStatus('❌ Could not reach the portal.', 'var(--accent)'); });
}

function _trRestoreBook() {
  var btn = document.getElementById('trBookBtn');
  if (btn) { btn.disabled = false; btn.style.opacity = ''; btn.style.cursor = 'pointer'; btn.textContent = '＋ Book trial'; }
}

// ── Door 2: list trial calendar events, pull one in ──────────────────────────
function _trLoadCalendar() {
  var url = getScriptUrl();
  var box = document.getElementById('trCalList');
  if (!box) return;
  fetch(url + '?action=getTrialEvents')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d.success) { box.innerHTML = '<div class="empty-state">⚠ ' + (d.message || 'Could not load') + '</div>'; return; }
      if (!d.events || !d.events.length) { box.innerHTML = '<div class="empty-state">No upcoming trial events on the calendar.</div>'; return; }
      box.innerHTML = d.events.map(_trEventCard).join('');
    })
    .catch(function () { box.innerHTML = '<div class="empty-state">❌ Could not load trial events.</div>'; });
}

function _trEventCard(ev) {
  var nm = _trEsc(ev.name);
  var right = ev.hasTab
    ? '<span style="font-family:\'DM Mono\',monospace;font-size:11px;color:var(--green)">✓ pulled in</span>'
    : '<button class="db-mini-btn" onclick="_trPull(\'' + nm + '\',\'' + _trEsc(ev.email) + '\',this)">Pull in →</button>';
  return '<div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;margin-bottom:8px;' +
    'display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 16px">' +
    '<div style="min-width:0">' +
      '<div style="font-family:\'Syne\',sans-serif;font-size:16px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (ev.name || '(no title)') + '</div>' +
      '<div style="font-family:\'DM Mono\',monospace;font-size:11px;color:var(--muted);margin-top:3px">' +
        ev.dateLabel + (ev.email ? ' · ' + ev.email : ' · no guest email') + '</div>' +
    '</div>' +
    '<div style="flex-shrink:0">' + right + '</div>' +
  '</div>';
}

function _trPull(name, email, btn) {
  var url = getScriptUrl();
  if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; btn.style.cursor = 'wait'; btn.textContent = 'Pulling…'; }
  fetch(url + '?action=pullTrialFromCalendar&name=' + encodeURIComponent(name) + '&email=' + encodeURIComponent(email || ''))
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d.success) { _trStatus('⚠ ' + (d.message || 'Failed'), 'var(--accent)'); if (btn) { btn.disabled = false; btn.style.opacity = ''; btn.style.cursor = 'pointer'; btn.textContent = 'Pull in →'; } return; }
      _trStatus('✓ Pulled in ' + d.name + (d.created ? ' · tab created' : ' · tab already existed'), 'var(--green)');
      _trLoadCalendar();
      _trLoadAccepted();
    })
    .catch(function () { _trStatus('❌ Could not reach the portal.', 'var(--accent)'); if (btn) { btn.disabled = false; btn.style.opacity = ''; btn.style.cursor = 'pointer'; btn.textContent = 'Pull in →'; } });
}

// ── helpers ──────────────────────────────────────────────────────────────────
function _trVal(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
function _trStatus(msg, color) {
  var st = document.getElementById('trStatus');
  if (!st) return;
  st.innerHTML = msg ? '<div style="background:var(--surface2);border:1px solid var(--border);border-left:3px solid ' +
    (color || 'var(--muted)') + ';border-radius:8px;padding:10px 14px;margin-top:10px;' +
    'font-family:\'DM Mono\',monospace;font-size:12px;color:var(--text)">' + msg + '</div>' : '';
}
function _trEsc(s) {
  return (s || '').toString().replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
