// ─── REVIEWS TAB ─────────────────────────────────────────────────────────────
// Google reviews. Three sections (2026-10-25):
//   Google            the total, the last review, this week's ask.
//   Current students  everyone in the Raise & Review chart without a review,
//                     longest-running first; Ask copies a template and saves
//                     Asked When?. One ask a week (user's pick): once anyone is
//                     asked, every Ask / Nudge dims until the week is up.
//   Ended students    the goodbye review follow-up after Terminate (2026-10-21).
// The Google review cards (2026-10-22) are gone: "I can go to Google to check it".
// Backend: getReviewsOverview / reviewAsked / reviewLeft (RPM_GReviews.js),
// getEndReviews / endReviewAsked / endReviewNudge / endReviewClose (RPM_Ending.js).

var _rvState = {
  list: null,    // getEndReviews answer: { reviews, closed, closeDays }
  ov: null       // getReviewsOverview answer: { total, last, current, reviewed, lastAsk, nextAsk, askDays }
};

// ── Your Google review link ──────────────────────────────────────────────────
// Paste your g.page review link here (the one in your "would love your feedback"
// text cards). It gets baked into the templates below.
var RV_REVIEW_LINK = 'https://g.page/r/CdeK_Lah36oBEBM/review';

// Asks for students still taking lessons (2026-10-25). Best sent right after
// something went well, so A leaves a bracket for what they nailed.
function _rvBuildCurrentTemplates(name) {
  var link = RV_REVIEW_LINK;
  return [
    { label: 'A · After a good lesson',
      text:
        'Hey ' + name + '!\n\n' +
        '[what went well — e.g. "That solo came together so well today."] Really fun to see.\n\n' +
        'Quick favor, only if you have a minute: would you leave me a review on Google? It helps people looking for lessons find me. Here\'s the link:\n' +
        link + '\n\n' +
        'Thanks, see you next week!' },
    { label: 'B · Short & friendly',
      text:
        name + '!\n\n' +
        'Quick favor if you have a minute: a Google review really helps me out. Here\'s the link:\n' +
        link + '\n\n' +
        'Thanks so much, see you at the next lesson!' }
  ];
}

// Three ask-for-review templates in Bilgehan's voice. [brackets] are left for
// him to fill per student (the personal callback). [Name] is auto-filled.
function _rvBuildTemplates(name) {
  var link = RV_REVIEW_LINK;
  return [
    { label: 'A · Warm — you clicked',
      text:
        name + '!\n\n' +
        '[personal callback — e.g. "That video came out so cool, I\'m glad we took it."] It was a fun journey with you, and you can come back anytime if you change your mind.\n\n' +
        'Quick favor — would you leave a review on my Google page? It helps me and other people looking for lessons. Here\'s the link:\n' +
        link + '\n\n' +
        'Stay in touch and keep playing!' },
    { label: 'B · Life got busy',
      text:
        'Hey ' + name + ',\n\n' +
        'Sorry to see you go, man — you do what you have to do. It was a pleasure, and good luck with the guitar and everything else.\n\n' +
        'If you find the time, a quick review would really help — my reviews are getting old and I could use some fresh ones. Google or Yelp, whatever\'s easier. No rush at all.\n\n' +
        'Take care, stay in touch.\nBilgehan..' },
    { label: 'C · Short & friendly',
      text:
        name + '!\n\n' +
        'Thanks for all the lessons — it was a lot of fun. Quick favor if you have a minute: a Google review really helps me out and means a lot. Here\'s the link:\n' +
        link + '\n\n' +
        'Keep playing!' }
  ];
}

// The goodbye nudge: one more ask after the first one got no review.
function _rvBuildNudges(name) {
  return [
    { label: 'Nudge · Gentle reminder',
      text:
        'Hey ' + name + '!\n\n' +
        'Hope you\'re doing well and still playing. Just a gentle reminder about the review, only if you have a minute. It really helps me out:\n' +
        RV_REVIEW_LINK + '\n\n' +
        'Thanks so much, and stay in touch!\nBilgehan' }
  ];
}

// Build editable templates. Textareas hold the raw text directly, so
// apostrophes render normally (no escaping artifacts) and you can edit in place.
// p = id prefix: 'rv<row>' an Ended card, 'rc<row>' a Current card; kind
// 'ask' | 'nudge' names the date a copy saves.
function _rvTemplatesHtml(tpl, p, kind) {
  return tpl.map(function (t, i) {
    return '<div class="en-tpl">' +
      '<div class="en-tpl-top">' +
        '<span class="field-label">' + _rvEscHtml(t.label) + '</span>' +
        '<button class="link-btn" id="' + p + 'CopyBtn-' + i + '" onclick="_rvCopyTemplate(\'' + p + '\', ' + i + ')" ' +
          'data-tip="Instant.\nCopies the text.\nSaves today as the ' + (kind === 'ask' ? 'asked' : 'nudged') + ' date.">Copy</button>' +
      '</div>' +
      '<textarea id="' + p + 'TA-' + i + '" rows="9" class="rpm-field en-tpl-ta">' + _rvEscHtml(t.text) + '</textarea>' +
    '</div>';
  }).join('');
}

// Copy the (possibly edited) textarea text to the clipboard. Falls back to
// execCommand for older WebViews. Flashes the button label so the tap registers.
// A good copy also saves the date (_rvCopied).
function _rvCopyTemplate(p, i) {
  var ta = document.getElementById(p + 'TA-' + i);
  if (!ta) return;
  var text = ta.value;
  var btn = document.getElementById(p + 'CopyBtn-' + i);
  function flash(ok) {
    if (ok) _rvCopied(p);
    if (!btn) return;
    btn.textContent = ok ? 'Copied' : 'Select & copy';
    setTimeout(function () { btn.textContent = 'Copy'; }, 1600);
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function () { flash(true); }, function () { _rvCopyFallback(text, flash); });
  } else {
    _rvCopyFallback(text, flash);
  }
}

function _rvCopyFallback(text, flash) {
  try {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    var ok = document.execCommand('copy');
    document.body.removeChild(ta);
    flash(ok);
  } catch (e) { flash(false); }
}

function initReviewsTab() {
  var url = getScriptUrl();
  var body = document.getElementById('endReviewsBody');
  if (!url) { body.innerHTML = '<div class="empty-state">Set your Apps Script URL in settings first.</div>'; return; }
  body.innerHTML = '<div class="empty-state rpm-loading">Loading</div>';
  _rvLoadOverview(url);
  fetch(url + '?action=getEndReviews')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d.success) { body.innerHTML = '<div class="empty-state">⚠ ' + _rvEscHtml(d.message || 'Could not load reviews') + '</div>'; return; }
      _rvState.list = d;
      _rvRender();
    })
    .catch(function () { body.innerHTML = '<div class="empty-state">❌ Could not connect.</div>'; });
}

// ── Google + Current students ────────────────────────────────────────────────

function _rvLoadOverview(url) {
  var sum = document.getElementById('rvSummaryBody'), cur = document.getElementById('curReviewsBody');
  sum.innerHTML = cur.innerHTML = '<div class="empty-state rpm-loading">Loading</div>';
  fetch(url + '?action=getReviewsOverview')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d.success) { sum.innerHTML = '<div class="empty-state">⚠ ' + _rvEscHtml(d.message || 'Could not load') + '</div>'; cur.innerHTML = ''; return; }
      _rvState.ov = d;
      _rvRenderSummary();
      _rvRenderCurrent();
    })
    .catch(function () { sum.innerHTML = '<div class="empty-state">❌ Could not connect.</div>'; cur.innerHTML = ''; });
}

// Next ask locked? The overview's nextAsk is empty when an ask is allowed today.
function _rvLocked() { return !!(_rvState.ov && _rvState.ov.nextAsk); }

function _rvAgo(n) {
  if (n == null) return '';
  if (n < 1) return 'today';
  if (n < 60) return n + ' day' + (n === 1 ? '' : 's') + ' ago';
  var m = Math.round(n / 30.4);
  return m < 24 ? m + ' months ago' : Math.floor(m / 12) + ' years ago';
}

function _rvRenderSummary() {
  var o = _rvState.ov || {};
  var lastTxt = o.last ? _rvEscHtml(o.last.name) + ', ' + _rvEscHtml(o.last.date) + ' <span class="rv-dim">(' + _rvAgo(o.last.daysAgo) + ')</span>' : '-';
  document.getElementById('rvSummaryBody').innerHTML =
    '<div class="en-scard en-rv">' +
      '<div class="inq-fields en-fields">' +
        '<span class="inq-flabel">Google reviews</span><span class="inq-fval">' + (o.total || 0) + '</span>' +
        '<span class="inq-flabel">Last review</span><span class="inq-fval">' + lastTxt + '</span>' +
        '<span class="inq-flabel">Last ask</span><span class="inq-fval">' + _rvEscHtml(o.lastAsk || 'None yet') + '</span>' +
        '<span class="inq-flabel">Next ask</span><span class="inq-fval ' + (o.nextAsk ? '' : 'rv-go') + '">' + (o.nextAsk ? _rvEscHtml(o.nextAsk) : 'This week') + '</span>' +
      '</div>' +
    '</div>';
}

function _rvRenderCurrent() {
  var o = _rvState.ov || {}, list = o.current || [], locked = _rvLocked();
  var html = '<div class="db-cards-head en-rv-head"><span class="field-label">' + list.length + ' without a review</span>' +
    '<span class="field-label">One ask a week · ' + (o.reviewed || 0) + ' already reviewed</span></div>';
  if (!list.length) html += '<div class="inq-empty">None</div>';
  list.forEach(function (r) {
    var p = 'rc' + r.row;
    html += '<div class="en-scard en-rv" id="' + p + 'Card">' +
      '<div class="en-rv-top">' +
        '<div class="inq-name">' + _rvEscHtml(r.name) + '</div>' +
        '<div class="inq-acts en-rv-pick">' +
          '<button class="inq-db yes" onclick="_rvCurLeft(' + r.row + ', this)" ' +
            'data-tip="Instant.\nTicks Left a review in the Raise & Review chart.\nCard disappears from Reviews.">Left a review</button>' +
        '</div>' +
      '</div>' +
      '<div class="inq-fields en-fields">' +
        '<span class="inq-flabel">Start Date</span><span class="inq-fval">' + _rvEscHtml(r.start || '-') + '</span>' +
        '<span class="inq-flabel">Lifetime</span><span class="inq-fval">' + _rvEscHtml(r.lifetime || '-') + '</span>' +
        '<span class="inq-flabel">Rate</span><span class="inq-fval">' + _rvEscHtml(r.rate || '-') + '</span>' +
        '<span class="inq-flabel">Asked</span><span class="inq-fval" id="' + p + 'Asked">' + _rvEscHtml(r.askedWhen || 'Never') + '</span>' +
      '</div>' +
      '<div class="inq-acts en-rv-acts">' +
        '<button class="link-btn amber opens-window rv-ask" id="' + p + 'TplBtn" onclick="_rvOpenCurTpl(' + r.row + ')"' +
          (locked ? ' disabled data-tip="Next ask ' + _rvEscHtml(o.nextAsk) + '.\nOne ask a week."' : '') + '>' +
          (r.askedWhen ? 'Ask again' : 'Ask for a review') + '</button>' +
      '</div>' +
    '</div>';
  });
  document.getElementById('curReviewsBody').innerHTML = html;
}

function _rvFindCur(row) {
  var list = (_rvState.ov && _rvState.ov.current) || [];
  for (var i = 0; i < list.length; i++) if (list[i].row === row) return list[i];
  return null;
}

function _rvOpenCurTpl(row) {
  var r = _rvFindCur(row);
  if (!r || _rvLocked()) return;
  _stWin('rvTplWin', _rvEscHtml(r.name), 'Ask for a review', '',
    _rvTemplatesHtml(_rvBuildCurrentTemplates(r.name.split(' ')[0]), 'rc' + row, 'ask'));
}

// Any ask or nudge saved: the week starts now, so every Ask / Nudge dims.
function _rvStartWeek() {
  var o = _rvState.ov;
  if (!o) return;
  var fmt = function (x) { return x.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); };
  var d = new Date(); d.setDate(d.getDate() + (o.askDays || 7));
  o.lastAsk = fmt(new Date());
  o.nextAsk = fmt(d);
  _rvRenderSummary();
  _rvRenderCurrent();
  if (_rvState.list) _rvRender();
}

function _rvCurLeft(row, btn) {
  var r = _rvFindCur(row), card = document.getElementById('rc' + row + 'Card');
  if (!r || !card) return;
  card.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
  rpmBusy(card, btn, true, 'Saving');
  fetch(getScriptUrl() + '?action=reviewLeft&row=' + row + '&name=' + encodeURIComponent(r.name))
    .then(function (x) { return x.json(); })
    .then(function (res) {
      if (!res || !res.success) throw new Error(res && res.message || 'Not saved');
      _rvState.ov.current = _rvState.ov.current.filter(function (x) { return x.row !== row; });
      _rvState.ov.reviewed = (_rvState.ov.reviewed || 0) + 1;
      _rvRenderCurrent();
    })
    .catch(function (e) {
      rpmBusy(card, btn, false);
      card.querySelectorAll('button').forEach(function (b) { b.disabled = false; });
      rpmAlert({ title: 'Not saved', message: String(e && e.message || e) });
    });
}

// ── Ended students ───────────────────────────────────────────────────────────
// Terminated students whose goodbye review is still open (Lifetime & Review
// rows with no review result). All of the goodbye review happens here, none of
// it on the Terminate page (user, 2026-10-21). Each card: Ask for a review
// (never asked; copying saves Asked) or Nudge (copying saves Nudged), Left a
// review, Remove (records No review). 90 days after the last nudge the backend
// closes them as No review.

function _rvRender() {
  var d = _rvState.list || {}, list = d.reviews || [], locked = _rvLocked();
  var body = document.getElementById('endReviewsBody');
  var html = '<div class="db-cards-head en-rv-head"><span class="field-label">' + list.length + ' waiting on a review</span>' +
    '<span class="field-label">Closes ' + (d.closeDays || 90) + ' days after the last nudge</span></div>';
  if (!list.length) html += '<div class="inq-empty">None</div>';
  list.forEach(function (r) {
    var p = 'rv' + r.row;
    html += '<div class="en-scard en-rv" id="' + p + 'Card">' +
      // Name left, the two results top right; the ask/nudge at the foot.
      '<div class="en-rv-top">' +
        '<div class="inq-name">' + _rvEscHtml(r.name) + '</div>' +
        '<div class="inq-acts en-rv-pick">' +
          '<button class="inq-db yes" onclick="_rvClose(' + r.row + ', \'left\', this)" ' +
            'data-tip="Instant.\nTicks Left a review in Lifetime & Review.\nCard disappears from Reviews.">Left a review</button>' +
          '<button class="inq-db no" onclick="_rvClose(' + r.row + ', \'none\', this)" ' +
            'data-tip="Instant.\nRecords No review in Lifetime & Review.\nCard disappears from Reviews.\n(The row stays.)">Remove</button>' +
        '</div>' +
      '</div>' +
      '<div class="inq-fields en-fields">' +
        '<span class="inq-flabel">End Date</span><span class="inq-fval">' + _rvEscHtml(r.endDate || '-') + '</span>' +
        '<span class="inq-flabel">Asked</span><span class="inq-fval" id="' + p + 'Asked">' + _rvEscHtml(r.askedWhen || 'Never') + '</span>' +
        '<span class="inq-flabel">Nudged</span><span class="inq-fval" id="' + p + 'Nudged">' + _rvEscHtml(r.nudged || '-') + '</span>' +
        '<span class="inq-flabel">Closes</span><span class="inq-fval" id="' + p + 'Closes">' + _rvClosesText(r.closesIn) + '</span>' +
      '</div>' +
      '<div class="inq-acts en-rv-acts">' +
        '<button class="link-btn amber opens-window rv-ask" id="' + p + 'TplBtn" onclick="_rvOpenTpl(' + r.row + ')"' +
          (locked ? ' disabled data-tip="Next ask ' + _rvEscHtml(_rvState.ov.nextAsk) + '.\nOne ask a week."' : '') + '>' +
          (r.askedWhen ? 'Nudge' : 'Ask for a review') + '</button>' +
      '</div>' +
    '</div>';
  });
  if (d.closed && d.closed.length) {
    html += '<div class="en-note en-rv-closed">Closed as No review (' + (d.closeDays || 90) + ' days after the nudge): ' +
      _rvEscHtml(d.closed.join(', ')) + '</div>';
  }
  body.innerHTML = html;
}

function _rvClosesText(n) {
  if (n == null) return 'After a nudge';
  return n === 0 ? 'Today' : 'In ' + n + ' day' + (n === 1 ? '' : 's');
}

function _rvFind(row) {
  var list = (_rvState.list && _rvState.list.reviews) || [];
  for (var i = 0; i < list.length; i++) if (list[i].row === row) return list[i];
  return null;
}

// Never asked → the three ask templates; asked → the nudge. In a window
// (NAME · Ask for a review / Nudge), the portal's ✕-to-close one (_stWin).
function _rvOpenTpl(row) {
  var r = _rvFind(row);
  if (!r || _rvLocked()) return;
  var kind = r.askedWhen ? 'nudge' : 'ask';
  _stWin('rvTplWin', _rvEscHtml(r.name), kind === 'ask' ? 'Ask for a review' : 'Nudge', '',
    _rvTemplatesHtml(kind === 'ask' ? _rvBuildTemplates(r.name) : _rvBuildNudges(r.name), 'rv' + row, kind));
}

// A template was copied. Current card ('rc'): Asked When? = today. Ended card
// ('rv'): an ask saves Asked = today (the button becomes Nudge); a nudge saves
// Nudged = today and restarts the 90 days. Either way the week starts.
function _rvCopied(p) {
  var row = parseInt(p.slice(2), 10), cur = p.slice(0, 2) === 'rc';
  var r = cur ? _rvFindCur(row) : _rvFind(row);
  if (!r) return;
  var ask = cur || !r.askedWhen;
  var cell = document.getElementById(p + (ask ? 'Asked' : 'Nudged'));
  var action = cur ? 'reviewAsked' : (ask ? 'endReviewAsked' : 'endReviewNudge');
  fetch(getScriptUrl() + '?action=' + action + '&row=' + row + '&name=' + encodeURIComponent(r.name))
    .then(function (x) { return x.json(); })
    .then(function (res) {
      if (!res || !res.success) throw new Error(res && res.message || 'Not saved');
      if (ask) r.askedWhen = res.askedWhen || 'Today';
      else { r.nudged = res.nudged || 'Today'; r.closesIn = (_rvState.list && _rvState.list.closeDays) || 90; }
      _rvStartWeek();
    })
    .catch(function (e) { if (cell) cell.textContent = '⚠ Not saved' + (e && e.message ? ': ' + e.message : ''); });
}

// Left a review / Remove: the card dims while it saves, buttons too, with SAVING
// mid-screen (2026-10-23), then leaves the list.
function _rvClose(row, result, btn) {
  var r = _rvFind(row), card = document.getElementById('rv' + row + 'Card');
  if (!r || !card) return;
  card.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
  rpmBusy(card, btn, true, 'Saving');
  fetch(getScriptUrl() + '?action=endReviewClose&row=' + row + '&name=' + encodeURIComponent(r.name) + '&result=' + result)
    .then(function (x) { return x.json(); })
    .then(function (res) {
      if (!res || !res.success) throw new Error(res && res.message || 'Not saved');
      _rvState.list.reviews = _rvState.list.reviews.filter(function (x) { return x.row !== row; });
      _rvRender();
    })
    .catch(function (e) {
      rpmBusy(card, btn, false);
      card.querySelectorAll('button').forEach(function (b) { b.disabled = false; });
      rpmAlert({ title: 'Not saved', message: String(e && e.message || e) });
    });
}

// Escape for HTML text / textarea content (only the markup-significant chars;
// the same as _enEscHtml in ending.js).
function _rvEscHtml(s) {
  return (s || '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
