// ─── RATES TAB ───────────────────────────────────────────────────────────────
// What the website charges, and since when. Read straight from the Website
// Rates Archive, so this page cannot disagree with the sheet.
//
// Read-only on purpose, for now. Entering a raise from here is easy to add, but
// a write feature built on an unproven read is how a wrong price ends up in the
// archive. Watch it show the right numbers first, then we add the form.
//
// Backend: getWebsiteRates (RPM_Rates.gs).

function initRatesTab() {
  var url  = getScriptUrl();
  var body = document.getElementById('ratesBody');
  if (!body) return;
  if (!url) { body.innerHTML = '<div class="empty-state">Set your Apps Script URL in settings first.</div>'; return; }
  body.innerHTML = '<div class="empty-state">Loading…</div>';

  fetch(url + '?action=getWebsiteRates')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d.success) {
        body.innerHTML = '<div class="empty-state">⚠ ' + inqEsc(d.message || d.error || 'Could not load') + '</div>';
        return;
      }
      body.innerHTML = _rtCurrentHtml(d.rates || []) + _rtProblemsHtml(d.problems || []) + _rtHistoryHtml(d.rates || []);
    })
    .catch(function () { body.innerHTML = '<div class="empty-state">❌ Could not load.</div>'; });
}

// The stationary table: the price list as it stands today.
function _rtCurrentHtml(rates) {
  if (!rates.length) return '<div class="empty-state">Nothing in the archive yet.</div>';
  var rows = rates.map(function (r) {
    return '<tr>' +
        '<td style="' + _rtTd() + 'font-family:\'Syne\',sans-serif">' + inqEsc(r.type) + '</td>' +
        '<td style="' + _rtTd() + 'font-family:\'Syne\',sans-serif;font-size:19px;font-weight:600">' +
          (r.rate == null ? '—' : '$' + r.rate) + '</td>' +
        '<td style="' + _rtTd() + 'color:var(--muted)">' + (inqEsc(r.monthly) || '—') + '</td>' +
        '<td style="' + _rtTd() + 'color:var(--muted);font-size:11px">' + (inqEsc(r.from) || '—') + '</td>' +
      '</tr>';
  }).join('');

  return '<div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:14px;overflow-x:auto">' +
      '<table style="width:100%;border-collapse:collapse;font-family:\'DM Mono\',monospace;font-size:13px">' +
        '<tr>' + ['Type', 'Per lesson', 'Monthly shown', 'Since'].map(function (h) {
          return '<th style="text-align:left;padding:0 10px 8px 0;font-size:9px;letter-spacing:1px;' +
                 'text-transform:uppercase;color:var(--muted);font-weight:400">' + h + '</th>';
        }).join('') + '</tr>' +
        rows +
      '</table>' +
    '</div>' +
    '<div style="margin-top:10px;font-family:\'DM Mono\',monospace;font-size:10px;color:var(--muted);text-align:center">' +
      'Change the website, then add the next block in the archive the same day.' +
    '</div>';
}

function _rtTd() {
  return 'padding:9px 10px 9px 0;border-top:1px solid var(--border);';
}

// A half-filled block is worth shouting about: it means a raise was typed in
// but not finished, and until it is, something is being priced off it.
function _rtProblemsHtml(problems) {
  if (!problems.length) return '';
  return '<div style="margin-top:14px;border:1px solid var(--accent);border-radius:10px;padding:12px">' +
      '<div style="font-family:\'DM Mono\',monospace;font-size:10px;letter-spacing:1px;' +
        'text-transform:uppercase;color:var(--accent);margin-bottom:6px">Unfinished in the archive</div>' +
      problems.map(function (p) {
        return '<div style="font-size:12px;color:var(--text);margin-top:3px">' + inqEsc(p) + '</div>';
      }).join('') +
    '</div>';
}

// History only earns space once there is some. With one block per type this
// says nothing the table above has not already said.
function _rtHistoryHtml(rates) {
  var withPast = rates.filter(function (r) { return (r.history || []).length > 1; });
  if (!withPast.length) return '';

  return '<hr class="divider" style="margin:22px 0 14px">' +
    '<div class="section-label" style="margin-bottom:10px">History</div>' +
    withPast.map(function (r) {
      return '<div style="margin-bottom:12px">' +
          '<div style="font-family:\'Syne\',sans-serif;font-size:13px;margin-bottom:4px">' + inqEsc(r.type) + '</div>' +
          r.history.slice().reverse().map(function (h) {
            return '<div style="font-family:\'DM Mono\',monospace;font-size:11px;color:var(--muted);padding:2px 0">' +
                '$' + h.rate + (h.monthly ? ' · ' + inqEsc(h.monthly) : '') +
                ' <span style="opacity:.7">from ' + inqEsc(h.from) + '</span>' +
              '</div>';
          }).join('') +
        '</div>';
    }).join('');
}
