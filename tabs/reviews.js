// ─── REVIEWS TAB ─────────────────────────────────────────────────────────────
// Google reviews (2026-10-21). First section: Ended students, the goodbye
// review follow-up after Terminate (moved here from Terminate ▾ Reviews).
// A Current students section is still to be shaped.
// Backend: getEndReviews / endReviewAsked / endReviewNudge / endReviewClose
// (RPM_Ending.js).

var _rvState = {
  list: null   // getEndReviews answer: { reviews, closed, closeDays }
};

// ── Your Google review link ──────────────────────────────────────────────────
// Paste your g.page review link here (the one in your "would love your feedback"
// text cards). It gets baked into templates A and C below.
var RV_REVIEW_LINK = 'https://g.page/r/CdeK_Lah36oBEBM/review';

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
// Each is an editable textarea so you can tweak the wording before copying.
// p = id prefix 'rv<row>' (the Reviews card); kind 'ask' | 'nudge' names the
// date a copy saves.
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
    if (ok) _rvCopied(parseInt(p.slice(2), 10));
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

// ── Ended students ───────────────────────────────────────────────────────────
// Terminated students whose goodbye review is still open (Lifetime & Review
// rows with no review result). All of the goodbye review happens here, none of
// it on the Terminate page (user, 2026-10-21). Each card: Ask for a review
// (never asked; copying saves Asked) or Nudge (copying saves Nudged), Left a
// review, Remove (records No review). 90 days after the last nudge the backend
// closes them as No review. Backend: getEndReviews / endReviewAsked /
// endReviewNudge / endReviewClose (RPM_Ending.js).

function initReviewsTab() {
  var url = getScriptUrl();
  var body = document.getElementById('endReviewsBody');
  if (!url) { body.innerHTML = '<div class="empty-state">Set your Apps Script URL in settings first.</div>'; return; }
  body.innerHTML = '<div class="empty-state rpm-loading">Loading</div>';
  fetch(url + '?action=getEndReviews')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d.success) { body.innerHTML = '<div class="empty-state">⚠ ' + _rvEscHtml(d.message || 'Could not load reviews') + '</div>'; return; }
      _rvState.list = d;
      _rvRender();
    })
    .catch(function () { body.innerHTML = '<div class="empty-state">❌ Could not connect.</div>'; });
}

function _rvRender() {
  var d = _rvState.list || {}, list = d.reviews || [];
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
        '<button class="link-btn amber opens-window" id="' + p + 'TplBtn" onclick="_rvOpenTpl(' + r.row + ')">' + (r.askedWhen ? 'Nudge' : 'Ask for a review') + '</button>' +
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
  if (!r) return;
  var kind = r.askedWhen ? 'nudge' : 'ask';
  _stWin('rvTplWin', _rvEscHtml(r.name), kind === 'ask' ? 'Ask for a review' : 'Nudge', '',
    _rvTemplatesHtml(kind === 'ask' ? _rvBuildTemplates(r.name) : _rvBuildNudges(r.name), 'rv' + row, kind));
}

// A template was copied on a card: an ask saves Asked = today (the button
// becomes Nudge); a nudge saves Nudged = today and restarts the 90 days.
function _rvCopied(row) {
  var r = _rvFind(row);
  if (!r) return;
  var ask = !r.askedWhen, p = 'rv' + row;
  var cell = document.getElementById(p + (ask ? 'Asked' : 'Nudged')), closes = document.getElementById(p + 'Closes');
  fetch(getScriptUrl() + '?action=' + (ask ? 'endReviewAsked' : 'endReviewNudge') + '&row=' + row + '&name=' + encodeURIComponent(r.name))
    .then(function (x) { return x.json(); })
    .then(function (res) {
      if (!res || !res.success) throw new Error(res && res.message || 'Not saved');
      if (ask) {
        r.askedWhen = res.askedWhen || 'Today';
        if (cell) cell.textContent = r.askedWhen;
        var b = document.getElementById(p + 'TplBtn');
        if (b) b.textContent = 'Nudge';
      } else {
        r.nudged = res.nudged || 'Today'; r.closesIn = (_rvState.list && _rvState.list.closeDays) || 90;
        if (cell) cell.textContent = r.nudged;
        if (closes) closes.textContent = _rvClosesText(r.closesIn);
      }
    })
    .catch(function (e) { if (cell) cell.textContent = '⚠ Not saved' + (e && e.message ? ': ' + e.message : ''); });
}

// Left a review / Remove: the card dims while it saves, then leaves the list.
// The pressed button says "Saving…" so its dots move, like an Inquiries card (2026-10-21).
function _rvClose(row, result, btn) {
  var r = _rvFind(row), card = document.getElementById('rv' + row + 'Card');
  if (!r || !card) return;
  card.classList.add('inq-busy');
  card.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
  var was = btn && btn.textContent;
  if (btn) btn.textContent = 'Saving…';
  fetch(getScriptUrl() + '?action=endReviewClose&row=' + row + '&name=' + encodeURIComponent(r.name) + '&result=' + result)
    .then(function (x) { return x.json(); })
    .then(function (res) {
      if (!res || !res.success) throw new Error(res && res.message || 'Not saved');
      _rvState.list.reviews = _rvState.list.reviews.filter(function (x) { return x.row !== row; });
      _rvRender();
    })
    .catch(function (e) {
      card.classList.remove('inq-busy');
      card.querySelectorAll('button').forEach(function (b) { b.disabled = false; });
      if (btn) btn.textContent = was;
      rpmAlert({ title: 'Not saved', message: String(e && e.message || e) });
    });
}

// Escape for HTML text / textarea content (only the markup-significant chars;
// the same as _enEscHtml in ending.js).
function _rvEscHtml(s) {
  return (s || '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
