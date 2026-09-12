// ─── TABS / FINANCIAL.JS ─────────────────────────────────────────────────────
// The Financial tab is two links to the Google Sheets (see index.html), plus a
// health note: anything that means the income numbers are wrong or not being
// recorded (a student with no rate, the Accountant stopped or not running, the
// trial price unreadable). Backend: getFinanceHealth (RPM_Rates.gs).
//
// Checked once at portal load so the "!" shows on the tab button without
// opening it, and again whenever the tab is opened.

function initFinancialTab() { refreshFinanceBadge(); }

function refreshFinanceBadge() {
  var url = getScriptUrl();
  if (!url) return;
  fetch(url + '?action=getFinanceHealth')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d || !d.success) { _finRender(['Could not check the finance health: ' + ((d && d.message) || 'no response')]); return; }
      _finRender(d.ok ? [] : (d.problems || []));
    })
    .catch(function () { _finRender(['Could not check the finance health (network).']); });
}

function _finRender(problems) {
  var badge = document.getElementById('finNavBadge');
  var box   = document.getElementById('finHealth');
  var bad   = problems && problems.length;
  if (badge) badge.style.display = bad ? 'inline-block' : 'none';
  if (!box) return;
  if (!bad) { box.innerHTML = ''; return; }
  box.innerHTML =
    '<div style="border:1px solid var(--accent);border-left:3px solid var(--accent);border-radius:10px;' +
      'padding:12px 14px;margin-bottom:16px;background:var(--surface)">' +
      '<div class="section-label" style="color:var(--accent);margin-bottom:6px">! Needs attention</div>' +
      problems.map(function (p) {
        return '<div style="font-family:\'DM Mono\',monospace;font-size:12px;color:var(--text);' +
          'line-height:1.5;margin-bottom:5px">' + _finEsc(p) + '</div>';
      }).join('') +
    '</div>';
}

function _finEsc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
