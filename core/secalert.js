// ─── CORE / SECALERT.JS ─────────────────────────────────────────────────────
// Big warning next to the build number when the Secretary's night run was
// stopped by Google and had to recover (2026-10-11: a stopped run emailed 24
// students fake schedule changes; the Secretary now recovers without emailing
// and raises this). The Secretary writes the row to the Counter sheet's
// "Secretary Alerts" tab; the same alert also goes out by email and text.
// Also (2026-10-12) a new trial with no guest email. Stays until "Got it".
// Add ?secAlertDemo (night run) or ?secAlertDemo=trial to see a sample.

function refreshSecretaryAlert() {
  var box = document.getElementById('secAlert');
  if (!box) return;
  if (/[?&]secAlertDemo=owes/.test(location.search)) {
    _secAlertRender([{ row: 0, night: 'Christian Sakai|8', type: 'owes', student: 'Christian Sakai', trial: 'Dec 1, 6:00 PM' }]);
    return;
  }
  if (/[?&]secAlertDemo=trial/.test(location.search)) {
    _secAlertRender([{ row: 0, night: 'alexkim1', type: 'trial', student: 'Alex Kim', trial: 'Oct 17, 11:00 AM' }]);
    return;
  }
  if (/[?&]secAlertDemo/.test(location.search)) {
    _secAlertRender([{ row: 0, night: '2026-10-12', recovered: 'Oct 12, 7:48 AM' }]);
    return;
  }
  var url = (localStorage.getItem('scriptUrl') || '').trim();
  if (!url) return;
  fetch(url + '?action=getSecretaryAlerts')
    .then(function(r) { return r.json(); })
    .then(function(d) { if (d && d.success) _secAlertRender(d.alerts || []); })
    .catch(function() {});
}

function _secAlertRender(alerts) {
  var box = document.getElementById('secAlert');
  if (!alerts.length) { box.style.display = 'none'; box.innerHTML = ''; return; }
  var a      = alerts[0];
  var more   = alerts.length > 1 ? ' · +' + (alerts.length - 1) + ' more' : '';
  // A new trial with no guest email (2026-10-12): no Trial Information went
  // out. Clears itself once the email is added and the Secretary sends it.
  if (a.type === 'trial') {
    var day = (a.trial || '').split(',')[0];
    box.innerHTML =
      "<span class='sa-head'>⚠ Trial without email · " + (a.student + ', ' + day).toUpperCase() + "</span>" +
      "<span class='sa-text'>No Trial Information was sent" + more +
        ". Add their email as a guest on the event; Secretary sends it within the hour.</span>" +
      "<button class='sa-btn' onclick='_secAlertDismiss(" + a.row + ", \"" + a.night + "\")'>Got it</button>";
    box.style.display = 'flex';
    return;
  }
  // A student owes 3+ blocks (2026-10-12): the Secretary stopped their
  // reminders and leaves it to you.
  if (a.type === 'owes') {
    box.innerHTML =
      "<span class='sa-head'>⚠ " + (a.student || '').toUpperCase() + " owes 3+ blocks</span>" +
      "<span class='sa-text'>Automatic reminders stopped until they pay" + more +
        ". Next lesson " + (a.trial || '') + ".</span>" +
      "<button class='sa-btn' onclick='_secAlertDismiss(" + a.row + ", \"" + a.night.replace(/'/g, '&#39;') + "\")'>Got it</button>";
    box.style.display = 'flex';
    return;
  }
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var p      = a.night.split('-');
  var night  = p.length === 3 ? months[parseInt(p[1], 10) - 1] + ' ' + parseInt(p[2], 10) : a.night;
  box.innerHTML =
    "<span class='sa-head'>⚠ Night run stopped · " + night.toUpperCase() + "</span>" +
    "<span class='sa-text'>Secretary recovered " + a.recovered + more +
      ". Lesson changes made in between were not emailed to students.</span>" +
    "<button class='sa-btn' onclick='_secAlertDismiss(" + a.row + ", \"" + a.night + "\")'>Got it</button>";
  box.style.display = 'flex';
}

function _secAlertDismiss(row, night) {
  var box = document.getElementById('secAlert');
  var btn = box.querySelector('.sa-btn');
  if (!row) { box.style.display = 'none'; return; }   // demo
  var url = (localStorage.getItem('scriptUrl') || '').trim();
  if (btn) { btn.disabled = true; btn.textContent = '…'; }
  fetch(url + '?action=dismissSecretaryAlert&row=' + row + '&night=' + encodeURIComponent(night))
    .then(function(r) { return r.json(); })
    .then(function() { refreshSecretaryAlert(); })
    .catch(function() { if (btn) { btn.disabled = false; btn.textContent = 'Got it'; } });
}

(function() {
  var st = document.createElement('style');
  st.textContent =
    "#secAlert{display:none;align-items:center;gap:14px;flex-wrap:wrap;margin-right:auto;" +
      "padding:12px 16px;border:1px solid var(--accent);border-radius:8px;background:rgba(232,70,58,.12)}" +
    "#secAlert+span{white-space:nowrap}" +
    "#secAlert .sa-head{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:1px;color:var(--accent)}" +
    "#secAlert .sa-text{font-size:12px;color:var(--text)}" +
    "#secAlert .sa-btn{padding:6px 14px;font-size:12px;background:transparent;color:var(--text);" +
      "border:1px solid var(--text);border-radius:4px;cursor:pointer;font-family:inherit}";
  document.head.appendChild(st);
})();
