// ─── TABS / THISYEAR.JS ──────────────────────────────────────────────────────
// Live snapshot computed from the Inquiries archive (Decision + Email Sent) plus
// the current student load. Lazy — loads only when the tab is opened.

function initThisYearTab() {
  var url = getScriptUrl();
  var body = document.getElementById('thisyearBody');
  if (!body) return;
  if (!url) { body.innerHTML = '<div class="empty-state">Set your Apps Script URL in settings first.</div>'; return; }
  body.innerHTML = '<div class="empty-state">Loading…</div>';
  fetch(url + '?action=getThisYearStats')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d.success) { body.innerHTML = '<div class="empty-state">⚠ ' + (d.message || 'Failed') + '</div>'; return; }
      body.innerHTML = _tyRender(d);
    })
    .catch(function () { body.innerHTML = '<div class="empty-state">❌ Could not load.</div>'; });
}

function _tyChip(label, value, color) {
  return '<div style="flex:1;min-width:92px;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px 12px;text-align:center">' +
    '<div style="font-family:\'Syne\',sans-serif;font-size:24px;font-weight:600;color:' + (color || 'var(--text)') + '">' + value + '</div>' +
    '<div style="font-family:\'DM Mono\',monospace;font-size:9px;letter-spacing:.5px;text-transform:uppercase;color:var(--muted);margin-top:3px">' + label + '</div>' +
  '</div>';
}

function _tyRender(d) {
  var c = d.counts || {};
  var students = (d.students != null) ? d.students : '—';

  var headline =
    '<div style="display:flex;gap:9px;flex-wrap:wrap;margin-bottom:16px">' +
      _tyChip('Applicants', c.applicants || 0) +
      _tyChip('Emailed', c.emailed || 0, 'var(--accent2)') +
      _tyChip('Students now', students, 'var(--green)') +
    '</div>';

  var decisions =
    '<div class="section-label" style="margin-bottom:10px">Decisions</div>' +
    '<div style="display:flex;gap:9px;flex-wrap:wrap">' +
      _tyChip('Open', c.open || 0, 'var(--text)') +
      _tyChip('Yes', c.yes || 0, 'var(--green)') +
      _tyChip('Maybe', c.maybe || 0, '#d9a441') +
      _tyChip('No', c.no || 0, 'var(--accent)') +
      _tyChip('No-reply', c.noreply || 0, 'var(--muted)') +
      _tyChip('Scam', c.scam || 0, 'var(--muted)') +
    '</div>';

  var soon =
    '<div style="margin-top:16px;font-family:\'DM Mono\',monospace;font-size:10px;color:var(--muted);text-align:center">' +
      'New students / quit this year · <span style="opacity:.7">coming soon</span></div>';

  return '<div class="section-label" style="margin-bottom:10px">Since 2026</div>' + headline + decisions + soon;
}
