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

// Asks for students still taking lessons (2026-10-25; rewritten 2026-10-26 in
// the user's own words). Each one stands alone: nothing is said in the lesson
// first. A, B, C only.
function _rvBuildCurrentTemplates(name, win) {
  var link = RV_REVIEW_LINK;
  // The closeness opening (user, 2026-10-26), B and C only: A is already personal.
  var close = 'normally I hate asking anyone for a review while we\'re still doing lessons, but I really need one at this time, and I felt I could ask you.\n\n';
  var easy = 'Doesn\'t need to be a masterpiece, just a couple of sentences is enough:\n\n' + link + '\n\n' +
    'Thanks, see you next week!';
  return [
    // The best one, right after a real win. The card's Recent win fills the
    // bracket when there is one.
    { label: 'A · Proud of you',
      text:
        'Hey ' + name + ',\n\nYou know what, I\'m actually really proud of you (and me!) that we got to this level' +
        (win ? ': ' + win : ' [what they achieved - e.g. "that solo came together today"]') + '. It took some time!\n\n' +
        'So do me a favor, only if you want to: a review would really help me, and maybe this is a good time to do it? ' + easy },
    // Only in endorsement renewal season.
    { label: 'B · Endorsement renewal',
      text:
        'Hey ' + name + ',\n\nYou know what, ' + close +
        'It\'s that time of the year: I have a couple of endorsements and it\'s renewal time, and recent reviews help a lot in their decisions. ' +
        'Do you think you could leave me a quick review on Google? ' + easy },
    // The year-round reason.
    { label: 'C · Google ranking',
      text:
        'Hey ' + name + ',\n\nYou know what, ' + close +
        'Google is giving me trouble: when it doesn\'t see recent reviews, it keeps pushing my page down. ' +
        'Do you think you could leave me a quick review? ' + easy }
  ];
}

// Three ask-for-review templates in Bilgehan's voice. [brackets] are left for
// him to fill per student (the personal callback). [Name] is auto-filled.
function _rvBuildTemplates(name) {
  var link = RV_REVIEW_LINK;
  return [
    { label: 'A · Warm - you clicked',
      text:
        name + '!\n\n' +
        '[personal callback - e.g. "That video came out so cool, I\'m glad we took it."] It was a fun journey with you, and you can come back anytime if you change your mind.\n\n' +
        'Quick favor - would you leave a review on my Google page? It helps me and other people looking for lessons. Here\'s the link:\n\n' +
        link + '\n\n' +
        'Stay in touch and keep playing!' },
    { label: 'B · Life got busy',
      text:
        'Hey ' + name + ',\n\n' +
        'Sorry to see you go, man - you do what you have to do. It was a pleasure, and good luck with the guitar and everything else.\n\n' +
        'If you find the time, a quick review would really help - my reviews are getting old and I could use some fresh ones. Google or Yelp, whatever\'s easier. No rush at all.\n\n' +
        'Take care, stay in touch.\nBilgehan..' },
    { label: 'C · Short & friendly',
      text:
        name + '!\n\n' +
        'Thanks for all the lessons - it was a lot of fun. Quick favor if you have a minute: a Google review really helps me out and means a lot. Here\'s the link:\n\n' +
        link + '\n\n' +
        'Keep playing!' }
  ];
}

// Nudges (user, 2026-10-26): only for someone who said yes and hasn't left it
// yet, in the user's own words, no name (user, 2026-10-26). The same three for
// current and terminated.
function _rvBuildNudges(name) {
  var again = '\n\nHere\'s the link again:\n\n' + RV_REVIEW_LINK;
  return [
    { label: 'Nudge · What happened', text: 'Hey, umm, what happened to the review? :P' + again },
    { label: 'Nudge · I thought', text: 'Hey, uhm, I thought I was getting a review? :P' + again },
    { label: 'Nudge · Reminder', text: 'Hey! Just wanted to remind you about the review! (Please? 🥺)' + again }
  ];
}

// Build editable templates. Textareas hold the raw text directly, so
// apostrophes render normally (no escaping artifacts) and you can edit in place.
// p = id prefix: 'rv<row>' an Ended card, 'rc<row>' a Current card; kind
// 'ask' | 'nudge' names the date a copy saves.
function _rvTemplatesHtml(tpl, p, kind, phone) {
  // Open Messages (user, 2026-10-26): the student's chat, from the
  // Phone Numbers tab. It doesn't fill in the text; Copy first, then paste.
  var digits = String(phone || '').replace(/\D/g, '');
  var msgs = digits ? '<div class="inq-acts en-rv-acts rv-tpl-foot"><a class="link-btn blue" href="sms:' + digits + '" data-tip="Opens elsewhere.\nThe Messages chat with ' + _rvEscAttr(phone) + '.\nPaste the copied text there."><span>iMessage</span>' + OPEN_OUT_ICON + '</a></div>' : '';
  // The number it goes to, under the icon, like the Travel Plan's (2026-10-26).
  var num = phone ? '<div class="rv-tpl-phone">' + _rvEscHtml(phone) + '</div>' : '';
  return num + tpl.map(function (t, i) {
    // Nudges are text only (user, 2026-10-26): no Email, no "also sent" line.
    var nudge = kind === 'nudge';
    var mail = nudge ? '' : '<button class="link-btn" onclick="_rvOpenMail(\'' + p + '\', ' + i + ')" data-tip="Opens the Email window.\nSending it saves today as the ' + (kind === 'ask' ? 'asked' : 'nudged') + ' date.">' +
      ENVELOPE_ICON + '<span>Email</span></button>';
    return '<div class="en-tpl">' +
      '<div class="en-tpl-top">' +
        // Text template 1, 2, 3 (user, 2026-10-26): starting points edited before
        // sending, so no names on them. t.label stays in the code as a note.
        '<span class="field-label">Text template ' + (i + 1) + '</span>' +
        '<span class="en-tpl-btns">' +
        '<button class="link-btn" id="' + p + 'CopyBtn-' + i + '" onclick="_rvCopyTemplate(\'' + p + '\', ' + i + ')" ' +
          'data-tip="Instant.\nCopies the text for iMessage.\n' + (nudge ? 'Saves today as the nudged date.' : 'Saves nothing: the email send records the ask.') + '">' + COPY_ICON + '<span>Copy</span></button>' +
        mail + '</span>' +
      '</div>' +
      // The Travel Plan's text message look (user, 2026-10-26): your blue bubble
      // on the right in a framed box; you can still edit it in place.
      '<div class="ts-thread tv-rv-thread rv-thread"><div id="' + p + 'TA-' + i + '" class="ts-bub tv-rv-bub rv-bub" contenteditable="plaintext-only" spellcheck="false">' +
        _rvEscHtml(nudge ? t.text : _rvWithAlso(t.text)) + '</div></div>' +
    '</div>';
  }).join('') + msgs;   // one blue Open Messages at the foot (user, 2026-10-26)
}

// The text version says the email went too (user, 2026-10-26): the line goes
// right under the link (or above the sign-off when there is no link). The
// Email window takes it back out.
var RV_ALSO = '(I also sent this via email, if you find it easier to do it on your computer.)';
function _rvWithAlso(text) {
  var at = text.indexOf(RV_REVIEW_LINK);
  if (at >= 0) { at += RV_REVIEW_LINK.length; return text.slice(0, at) + '\n\n' + RV_ALSO + text.slice(at); }
  var cut = text.lastIndexOf('\n\n');
  return cut < 0 ? text + '\n\n' + RV_ALSO : text.slice(0, cut) + '\n\n' + RV_ALSO + text.slice(cut);
}
function _rvWithoutAlso(text) {
  return text.split('\n\n' + RV_ALSO).join('').split(RV_ALSO).join('').trim();
}

// The template window's student, for the Email window: set when it opens.
var _rvTplWho = null;   // { p, name, email, kind: 'ask' | 'nudge' }

// Email window (user, 2026-10-26): the template as edited, without the "also
// sent via email" line, from the portal's Gmail. Sent = the asked / nudged
// date, the same as Copy.
function _rvOpenMail(p, i) {
  var ta = document.getElementById(p + 'TA-' + i), who = _rvTplWho || {};
  if (!ta) return;
  var lbl = function (t, id) { return '<label class="field-label" for="' + id + '">' + t + '</label>'; };
  // The Email button's envelope (om-31) under the title (user, 2026-10-26; was EMAIL_WIN_ICON).
  var w = _stWin('rvMailWin', _rvEscHtml(who.name || ''), 'Email', ENVELOPE_ICON.replace('<svg ', '<svg style="height:26px;width:auto" '),
    '<div style="margin-bottom:16px">' + lbl('To', 'rvMailTo') + '<input id="rvMailTo" class="rpm-field" value="' + _rvEscAttr(who.email || '') + '"></div>' +
    '<div style="margin-bottom:16px">' + lbl('Subject', 'rvMailSubj') + '<input id="rvMailSubj" class="rpm-field" value="A Quick Favor"></div>' +
    lbl('Message', 'rvMailBody') +
    '<textarea id="rvMailBody" rows="14" class="rpm-field en-tpl-ta">' + _rvEscHtml(_rvWithoutAlso(ta.innerText)) + '</textarea>' +
    // Preview dim, Send bright, the house email shown under them (Trial's Compose).
    '<div class="inq-acts en-rv-acts rv-tpl-foot">' +
      '<button class="link-btn" onclick="_trRenderPreview(document.getElementById(\'rvMailBody\').value, \'rvMailPreview\')">' + DETAILS_ICON + '<span>Preview</span></button>' +
      '<button class="link-btn bright" id="rvMailSend" onclick="_rvSendMail(\'' + p + '\')">' + SEND_ICON + '<span>Send</span></button></div>' +
    '<div id="rvMailPreview"></div>');
  w.style.zIndex = 10001;
}

function _rvSendMail(p) {
  var w = document.getElementById('rvMailWin'), btn = document.getElementById('rvMailSend');
  if (!w || !btn) return;
  var to = document.getElementById('rvMailTo').value.trim();
  var subj = document.getElementById('rvMailSubj').value.trim();
  var body = document.getElementById('rvMailBody').value.trim();
  if (!to) { rpmAlert({ title: 'No email address', message: 'Type the student\'s email in To.' }); return; }
  var panel = w.querySelector('.log-panel');
  rpmBusy(panel, btn, true, 'Sending');
  fetch(getScriptUrl() + '?action=reviewEmail&to=' + encodeURIComponent(to) + '&subject=' + encodeURIComponent(subj) + '&body=' + encodeURIComponent(body))
    .then(function (x) { return x.json(); })
    .then(function (res) {
      if (!res || !res.success) throw new Error(res && res.message || 'Not sent');
      w.remove();
      _rvCopied(p, (_rvTplWho && _rvTplWho.kind) || 'ask');   // saves the asked / nudged date
    })
    .catch(function (e) {
      rpmBusy(panel, btn, false);
      rpmAlert({ title: 'Not sent', message: String(e && e.message || e) });
    });
}

// The texting hand at the Travel Plan's size (it is tiny at the window default).
var RV_TEXT_ICON = PHONE_ICON.replace('<svg ', '<svg style="height:42px;width:auto" ');

// Copy the (possibly edited) textarea text to the clipboard. Falls back to
// execCommand for older WebViews. Flashes the button label so the tap registers.
// Copy saves nothing (user, 2026-10-26): only a sent email proves the ask, so
// _rvSendMail saves the date (_rvCopied).
function _rvCopyTemplate(p, i) {
  var ta = document.getElementById(p + 'TA-' + i);
  if (!ta) return;
  var text = ta.innerText.replace(/\n+$/, '');   // the bubble is a div now
  var btn = document.getElementById(p + 'CopyBtn-' + i);
  function flash(ok) {
    // A nudge is only ever a text, so its Copy is the record (2026-10-26).
    if (ok && _rvTplWho && _rvTplWho.kind === 'nudge' && _rvTplWho.p === p) _rvCopied(p, 'nudge');
    if (!btn) return;
    var lbl = btn.querySelector('span') || btn;   // keeps the copy icon
    lbl.textContent = ok ? 'Copied' : 'Select & copy';
    setTimeout(function () { lbl.textContent = 'Copy'; }, 1600);
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
      if (_rvState.ov) _rvRenderSummary();   // the plan's picker lists ended students too
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
      _rvState.order = null;
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

// Said yes / Nudge due beside a name in Asked at the moment (2026-10-26).
function _rvAskTag(a) {
  var r = a.kind === 'ended' ? _rvFind(a.row) : _rvFindCur(a.row);
  if (!r || !r.saidYes) return '';
  return r.nudgeDue ? ' <span class="rv-due">Nudge due</span>' : ' <span class="rv-dim">· said yes</span>';
}

// Yelp's count, updated by hand (11 on 2026-10-25).
var RV_YELP_COUNT = 11;
// The next rate raise, typed in by hand (user, 2026-10-26).
var RV_NEXT_RAISE = 'February 2027';

// "30 · 5.0 ★" from a SerpApi count, else the fallback number.
function _rvCount(x, fallback) {
  if (!x) return String(fallback);
  return _rvEscHtml(String(x.count)) + (x.rating ? ' · ' + Number(x.rating).toFixed(1) + ' ★' : '');
}

function _rvRenderSummary() {
  var o = _rvState.ov || {}, c = o.counts || {};
  // The Dashboard's box (user, 2026-10-25): washed title band, label / value rows.
  var row = function (l, v, cls) { return '<div class="ld-row' + (cls || '') + '"><span class="ld-l">' + l + '</span><span class="ld-v">' + v + '</span></div>'; };
  document.getElementById('rvSummaryBody').innerHTML =
    '<div class="ld-cards">' +
      // Review count (user, 2026-10-26): Google + Yelp from SerpApi every
      // Monday (counts); until its first check, the email count and Yelp's 11.
      '<div class="inq-dcard ld-card"><div class="ld-title ld-title-sum"><span>Review count</span>' +
        (c.checked ? '<span class="f2-cur ld-sum">Checked ' + _rvEscHtml(c.checked) + '</span>' : '') + '</div>' +
      row('Google', _rvCount(c.google, o.total || 0)) +
      row('Yelp', _rvCount(c.yelp, RV_YELP_COUNT)) +
    '</div><div class="inq-dcard ld-card">' +
      // Next raise (user, 2026-10-26): asks are timed against it.
      '<div class="ld-title"><span>Raise</span></div>' +
      row('Next raise date', RV_NEXT_RAISE) +
    '</div><div class="inq-dcard ld-card">' +
      // All grey (user, 2026-10-25): last review, how long ago, the last ask,
      // who it went to, and whether their review came.
      '<div class="ld-title"><span>Last review</span></div>' +
      row('Date', o.last ? _rvEscHtml(o.last.date) + (o.last.name ? ' - ' + _rvEscHtml(o.last.name) : '') : '-') +
      row('How long ago', o.last ? _rvAgo(o.last.daysAgo) : '-') +
    '</div><div class="inq-dcard ld-card">' +
      // At the moment (user, 2026-10-26): everyone asked who hasn't left a
      // review yet, newest first, one "date - name" row each. Google names
      // don't match students, so the circle marks Left a review by hand.
      '<div class="ld-title"><span>Asked at the moment</span></div>' +
      ((o.asks || []).length
        ? o.asks.map(function (a, i) {
            return '<div class="ld-row rv-askrow"><span class="ld-v">' +
              '<button class="rv-tick" title="Left a review" onclick="_rvAskLeft(' + i + ', this)"></button>' +
              _rvEscHtml(a.date) + ' - ' + _rvEscHtml(a.name) + _rvAskTag(a) + '</span></div>';
          }).join('')
        : row('', 'No open asks')) +
    '</div>' + _rvPlanHtml() + '</div>';
}

// The circle on an At the moment row: Left a review + Left When = today, on
// the chart (current) or the summary row (ended); the row leaves the box.
function _rvAskLeft(i, btn) {
  var a = (_rvState.ov.asks || [])[i], card = btn.closest('.ld-card');
  if (!a) return;
  var q = a.kind === 'ended' ? 'endReviewClose&result=left' : 'reviewLeft';
  btn.classList.add('on');
  rpmBusy(card, btn, true, 'Saving');
  fetch(getScriptUrl() + '?action=' + q + '&row=' + a.row + '&name=' + encodeURIComponent(a.name))
    .then(function (x) { return x.json(); })
    .then(function (res) {
      if (!res || !res.success) throw new Error(res && res.message || 'Not saved');
      var o = _rvState.ov;
      o.asks = o.asks.filter(function (x) { return x !== a; });
      if (a.kind === 'ended') {
        if (_rvState.list) _rvState.list.reviews = (_rvState.list.reviews || []).filter(function (x) { return x.row !== a.row; });
      } else {
        o.current = (o.current || []).filter(function (x) { return x.row !== a.row; });
        o.reviewed = (o.reviewed || 0) + 1;
      }
      _rvRenderSummary();
      _rvRenderCurrent();
      if (_rvState.list) _rvRender();
    })
    .catch(function (e) {
      rpmBusy(card, btn, false);
      btn.classList.remove('on');
      rpmAlert({ title: 'Not saved', message: String(e && e.message || e) });
    });
}

// ── The 12-week plan (2026-10-25) ────────────────────────────────────────────
// This week + the next 11 (Monday to Sunday), a name picked for each. Saved in
// the "Review Plan" tab (reviewPlan); the overview hands it back as plan.
var RV_PLAN_WEEKS = 12;
var RV_MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function _rvWeeks() {
  var d = new Date(); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));   // back to Monday
  var out = [];
  for (var i = 0; i < RV_PLAN_WEEKS; i++) {
    var w = new Date(d); w.setDate(d.getDate() + 7 * i);
    var iso = w.getFullYear() + '-' + ('0' + (w.getMonth() + 1)).slice(-2) + '-' + ('0' + w.getDate()).slice(-2);
    out.push({ iso: iso, label: RV_MON[w.getMonth()] + ' ' + w.getDate() });
  }
  return out;
}

function _rvPlanHtml() {
  var o = _rvState.ov || {}, plan = o.plan || (o.plan = {}), weeks = _rvWeeks();
  var cur = _rvSortedBest(o.current || []).map(function (r) { return r.name; });
  var ended = ((_rvState.list && _rvState.list.reviews) || []).map(function (r) { return r.name; });
  var where = {};   // name → the week label it is already planned in
  weeks.forEach(function (w) { if (plan[w.iso]) where[plan[w.iso]] = w.label; });
  // The portal's own list (Log cash's student picker, .cash-dd), not the OS menu.
  var opt = function (iso, n, sel) {
    return '<button type="button" class="cash-dd-opt' + (n === sel ? ' on' : '') + '" onclick="_rvSetPlan(\'' + iso + '\', this.dataset.n)" data-n="' + _rvEscAttr(n) + '">' +
      (n ? _rvEscHtml(n) : '—') + (where[n] && n !== sel ? '<span class="rv-dd-where">' + where[n] + '</span>' : '') + '</button>';
  };
  var grp = function (t) { return '<div class="rv-dd-grp">' + t + '</div>'; };
  return '<div class="inq-dcard ld-card rv-plan">' +
    '<div class="ld-title ld-title-sum"><span>Next 12 weeks</span><span class="f2-cur ld-sum">Type students to plan</span></div>' +
    weeks.map(function (w, i) {
      var sel = plan[w.iso] || '';
      return '<div class="ld-row' + (i === 0 ? ' lead' : '') + '"><span class="ld-l">' + w.label + (i === 0 ? ' · This week' : '') + '</span>' +
        // A type-in field (user, 2026-10-25: no arrow); the list under it narrows as you type.
        '<span class="ld-v"><div class="cash-dd rv-dd" id="rvDd' + i + '" data-iso="' + w.iso + '">' +
          '<input class="rpm-field rv-dd-in' + (sel ? ' picked' : '') + '" value="' + _rvEscAttr(sel) + '" autocomplete="off" ' +
            'onfocus="_rvDdOpen(' + i + ')" oninput="_rvDdFilter(' + i + ')" onkeydown="_rvDdKey(event, ' + i + ')">' +
          '<div class="cash-dd-list" hidden>' +
            (sel ? opt(w.iso, '', sel) : '') +
            grp('Current students') + cur.map(function (n) { return opt(w.iso, n, sel); }).join('') +
            (ended.length ? grp('Ended students') + ended.map(function (n) { return opt(w.iso, n, sel); }).join('') : '') +
          '</div>' +
        '</div></span></div>';
    }).join('') +
  '</div>';
}

// One list open at a time; a click anywhere else closes it and puts the
// field back to its saved name.
function _rvDdOpen(i) {
  var dd = document.getElementById('rvDd' + i);
  if (!dd || dd.classList.contains('open')) return;
  _rvDdClose();
  dd.classList.add('open');
  dd.querySelector('.cash-dd-list').hidden = false;
  _rvDdFilter(i, true);
}

// Narrow the list to names containing what is typed (all of it on open);
// the first match is lit, Enter picks it.
function _rvDdFilter(i, all) {
  var dd = document.getElementById('rvDd' + i), q = all ? '' : dd.querySelector('.rv-dd-in').value.trim().toLowerCase(), first = null, word = null;
  dd.querySelectorAll('.cash-dd-opt').forEach(function (b) {
    var n = (b.dataset.n || '').toLowerCase(), show = !q || n.indexOf(q) !== -1;
    b.hidden = !show;
    b.classList.remove('hi');
    if (show && b.dataset.n) {
      if (!first) first = b;
      if (!word && (' ' + n).indexOf(' ' + q) !== -1) word = b;   // "si" lights Siena before Fransisco
    }
  });
  first = word || first;
  dd.querySelectorAll('.rv-dd-grp').forEach(function (g) {
    var n = g.nextElementSibling, any = false;
    while (n && !n.classList.contains('rv-dd-grp')) { if (!n.hidden) any = true; n = n.nextElementSibling; }
    g.hidden = !any;
  });
  if (first && q) first.classList.add('hi');
}

function _rvDdKey(e, i) {
  var dd = document.getElementById('rvDd' + i);
  if (e.key === 'Escape') { _rvDdClose(); e.target.blur(); return; }
  if (e.key !== 'Enter') return;
  e.preventDefault();
  var hi = dd.querySelector('.cash-dd-opt.hi'), v = e.target.value.trim();
  _rvSetPlan(dd.dataset.iso, hi ? hi.dataset.n : v);   // empty field + Enter clears the week
}

function _rvDdClose() {
  document.querySelectorAll('.rv-dd.open').forEach(function (d) {
    d.classList.remove('open');
    d.querySelector('.cash-dd-list').hidden = true;
    var inp = d.querySelector('.rv-dd-in'), o = _rvState.ov;
    if (inp && o) inp.value = (o.plan || {})[d.dataset.iso] || '';
  });
}

document.addEventListener('click', function (e) {
  if (!e.target.closest || !e.target.closest('.rv-dd')) _rvDdClose();
});

// Best-to-ask order for the picker, whatever the cards are sorted by.
function _rvSortedBest(list) {
  return list.slice().sort(function (a, b) { return (_rvScore(b) - _rvScore(a)) || ((a.startTs || 9e15) - (b.startTs || 9e15)); });
}

function _rvSetPlan(iso, name) {
  var o = _rvState.ov, was = o.plan[iso] || '';
  _rvDdClose();
  if (name === was) return;
  if (name) o.plan[iso] = name; else delete o.plan[iso];
  _rvRenderSummary();
  fetch(getScriptUrl() + '?action=reviewPlan&week=' + iso + '&name=' + encodeURIComponent(name))
    .then(function (x) { return x.json(); })
    .then(function (res) { if (!res || !res.success) throw new Error(res && res.message || 'Not saved'); })
    .catch(function (e) {
      if (was) o.plan[iso] = was; else delete o.plan[iso];
      _rvRenderSummary();
      rpmAlert({ title: 'Not saved', message: String(e && e.message || e) });
    });
}

// ── How each student is doing (2026-10-25) ───────────────────────────────────
// Momentum stands in for "how long will they stay"; Progress for "are they
// getting better"; a Recent win is the best moment to ask. Saved in the Raise
// & Review chart K..N (reviewNote). The sort bar orders the cards by them.
var RV_NOTES = {
  momentum: { label: 'Momentum', opts: [['Excited', 'yes'], ['Cruising', 'maybe'], ['Fading', 'no']] },
  progress: { label: 'Progress', opts: [['Improving', 'yes'], ['Steady', 'maybe'], ['Stuck', 'no']] }
};
var RV_SORTS = [['best', 'Best to ask'], ['long', 'Longest first'], ['momentum', 'Momentum'], ['progress', 'Progress']];
var RV_WIN_DAYS = 14;   // a win counts toward Best to ask for two weeks

function _rvSortKey() {
  try { return localStorage.getItem('rvSort') || 'best'; } catch (e) { return 'best'; }
}

function _rvSetSort(k) {
  try { localStorage.setItem('rvSort', k); } catch (e) {}
  _rvState.order = null;
  _rvRenderCurrent();
}

// Best to ask: a fresh win, then Excited / Improving up, Fading / Stuck down.
function _rvScore(r) {
  var s = 0;
  if (r.win && r.winDays != null && r.winDays <= RV_WIN_DAYS) s += 4;
  s += { Excited: 2, Cruising: 1, Fading: -3 }[r.momentum] || 0;
  s += { Improving: 2, Steady: 1, Stuck: -3 }[r.progress] || 0;
  return s;
}

// The order is fixed while you edit (a tapped card never jumps away); it is
// worked out again only on load and when a sort button is pressed.
function _rvSorted(list) {
  var o = _rvState.order;
  if (o) return list.slice().sort(function (a, b) { return (o[a.row] || 0) - (o[b.row] || 0); });
  var k = _rvSortKey(), idx = function (f, v) { var o = RV_NOTES[f].opts.map(function (x) { return x[0]; }).indexOf(v); return o < 0 ? 9 : o; };
  return list.slice().sort(function (a, b) {
    var d = 0;
    if (k === 'best') d = _rvScore(b) - _rvScore(a);
    else if (k === 'momentum' || k === 'progress') d = idx(k, a[k]) - idx(k, b[k]);
    return d || ((a.startTs || 9e15) - (b.startTs || 9e15));   // ties: longest first
  });
}

function _rvNotesHtml(r) {
  var p = 'rc' + r.row;
  var chips = function (f) {
    return '<span class="inq-flabel">' + RV_NOTES[f].label + '</span><span class="inq-fval rv-chips">' +
      RV_NOTES[f].opts.map(function (o) {
        var on = r[f] === o[0];
        return '<button class="inq-db' + (on ? ' ' + o[1] : '') + '" onclick="_rvSetNote(' + r.row + ', \'' + f + '\', \'' + o[0] + '\', this)">' + o[0] + '</button>';
      }).join('') + '</span>';
  };
  return '<div class="inq-fields en-fields rv-notes">' +
    chips('momentum') + chips('progress') +
    '<span class="inq-flabel">Recent win</span><span class="inq-fval rv-win">' +
      '<input id="' + p + 'Win" class="rpm-field rv-win-in" value="' + _rvEscAttr(r.win) + '" ' +
        'onkeydown="if(event.key===\'Enter\')this.blur()" onblur="_rvSaveWin(' + r.row + ', this)">' +
      '<span class="rv-dim" id="' + p + 'WinDate">' + _rvEscHtml(r.winDate || '') + '</span>' +
    '</span>' +
  '</div>';
}

// Tapping the lit chip again clears it.
function _rvSetNote(row, field, value, btn) {
  var r = _rvFindCur(row);
  if (!r) return;
  var v = r[field] === value ? '' : value, was = r[field];
  r[field] = v;
  _rvRenderCurrent();
  _rvSaveNote(r, field, v, function () { r[field] = was; _rvRenderCurrent(); });
}

function _rvSaveWin(row, inp) {
  var r = _rvFindCur(row), v = inp.value.trim();
  if (!r || v === (r.win || '')) return;
  var was = { win: r.win, winDate: r.winDate, winDays: r.winDays };
  r.win = v;
  var dateEl = document.getElementById('rc' + row + 'WinDate');
  if (dateEl) dateEl.textContent = v ? 'Saving' : '';
  _rvSaveNote(r, 'win', v, function () { r.win = was.win; r.winDate = was.winDate; r.winDays = was.winDays; _rvRenderCurrent(); }, function (res) {
    r.winDate = res.winDate || ''; r.winDays = v ? 0 : null;
    if (dateEl) dateEl.textContent = r.winDate;
  });
}

function _rvSaveNote(r, field, value, undo, done) {
  fetch(getScriptUrl() + '?action=reviewNote&row=' + r.row + '&name=' + encodeURIComponent(r.name) + '&field=' + field + '&value=' + encodeURIComponent(value))
    .then(function (x) { return x.json(); })
    .then(function (res) {
      if (!res || !res.success) throw new Error(res && res.message || 'Not saved');
      if (done) done(res);
    })
    .catch(function (e) { undo(); rpmAlert({ title: 'Not saved', message: String(e && e.message || e) }); });
}

function _rvRenderCurrent() {
  var o = _rvState.ov || {}, list = _rvSorted(o.current || []), locked = _rvLocked(), sk = _rvSortKey();
  _rvState.order = {};
  list.forEach(function (r, i) { _rvState.order[r.row] = i + 1; });
  // The Dashboard's box (user, 2026-10-26): counts + the plan, above the
  // Current students title.
  var row = function (l, v) { return '<div class="ld-row"><span class="ld-l">' + l + '</span><span class="ld-v">' + v + '</span></div>'; };
  document.getElementById('rvCurSum').innerHTML =
    '<div class="ld-cards"><div class="inq-dcard ld-card"><div class="ld-title"><span>Current students</span></div>' +
      row('Without a review', list.length) +
      row('Already left a review', o.reviewed || 0) +
      row('Plan', 'Ask one a week') +
    '</div></div>';
  var html =
    '<div class="hol-views rv-sorts">' + RV_SORTS.map(function (s) {
      return '<button class="link-btn' + (s[0] === sk ? ' lit' : '') + '" onclick="_rvSetSort(\'' + s[0] + '\')">' + s[1] + '</button>';
    }).join('') + '</div>';
  if (!list.length) html += '<div class="inq-empty">None</div>';
  list.forEach(function (r) {
    var p = 'rc' + r.row;
    html += '<div class="en-scard en-rv' + (r.askedWhen ? ' asked' : '') + '" id="' + p + 'Card">' +   // amber once asked (user, 2026-10-26)
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
        _rvYesRows(r, true, p) +
      '</div>' +
      _rvNotesHtml(r) +
      // Never asked: Ask. Asked + said yes: Nudge (amber when due). Asked, no
      // yes: nothing, no nudge without a yes (user, 2026-10-26).
      (!r.askedWhen
        ? '<div class="inq-acts en-rv-acts"><button class="link-btn amber opens-window rv-ask" id="' + p + 'TplBtn" onclick="_rvOpenCurTpl(' + r.row + ')"' +
            (locked ? ' disabled data-tip="Next ask ' + _rvEscHtml(o.nextAsk) + '.\nOne ask a week."' : '') + '>Ask for a review</button></div>'
        : r.saidYes
          ? '<div class="inq-acts en-rv-acts"><button class="link-btn opens-window' + (r.nudgeDue ? ' amber' : '') + '" onclick="_rvOpenCurNudge(' + r.row + ')">Nudge</button></div>'
          : '') +
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
  // The Travel Plan's texting hand under the title (user, 2026-10-26).
  _rvTplWho = { p: 'rc' + row, name: r.name, email: r.email || '', kind: 'ask' };
  _stWin('rvTplWin', _rvEscHtml(r.name), 'Templates', RV_TEXT_ICON,
    _rvTemplatesHtml(_rvBuildCurrentTemplates(r.name.split(' ')[0], r.win || ''), 'rc' + row, 'ask', r.phone));
}

// The nudge window for a current student who said yes (2026-10-26).
function _rvOpenCurNudge(row) {
  var r = _rvFindCur(row);
  if (!r || !r.saidYes) return;
  _rvTplWho = { p: 'rc' + row, name: r.name, email: r.email || '', kind: 'nudge' };
  _stWin('rvTplWin', _rvEscHtml(r.name), 'Nudge', RV_TEXT_ICON,
    _rvTemplatesHtml(_rvBuildNudges(r.name.split(' ')[0]), 'rc' + row, 'nudge', r.phone));
}

// Said yes (2026-10-26): ticked when they answer the ask with a yes. Only they
// get the Nudge button; Nudge due 10 days on with no review. Tap again to clear.
function _rvSaidYes(cur, row, el) {
  var r = cur ? _rvFindCur(row) : _rvFind(row);
  if (!r) return;
  var was = r.saidYes, on = !was;
  r.saidYes = on ? 'Today' : ''; r.nudgeDue = false;
  var redraw = function () { _rvRenderSummary(); if (cur) _rvRenderCurrent(); else _rvRender(); };
  redraw();
  fetch(getScriptUrl() + '?action=' + (cur ? 'reviewSaidYes' : 'endReviewSaidYes') + '&row=' + row + '&name=' + encodeURIComponent(r.name) + '&on=' + (on ? 1 : 0))
    .then(function (x) { return x.json(); })
    .then(function (res) {
      if (!res || !res.success) throw new Error(res && res.message || 'Not saved');
      r.saidYes = res.saidYes || (on ? 'Today' : ''); redraw();
    })
    .catch(function (e) { r.saidYes = was; redraw(); rpmAlert({ title: 'Not saved', message: String(e && e.message || e) }); });
}

// The asked-card rows shared by both lists: Said yes (a tick), Nudged, Nudge due.
function _rvYesRows(r, cur, p) {
  if (!r.askedWhen) return '';
  return '<span class="inq-flabel">Said yes</span><span class="inq-fval"><span class="db-check rv-yes' + (r.saidYes ? ' on' : '') + '" role="checkbox" tabindex="0" ' +
      'onclick="_rvSaidYes(' + cur + ', ' + r.row + ', this)"><i class="db-box"></i>' + _rvEscHtml(r.saidYes || 'Not yet') + '</span></span>' +
    (r.saidYes ? '<span class="inq-flabel">Nudged</span><span class="inq-fval" id="' + p + 'Nudged">' + _rvEscHtml(r.nudged || '-') +
      (r.nudgeDue ? ' <span class="rv-due">Nudge due</span>' : '') + '</span>' : '');
}

// Any ask or nudge saved: the week starts now, so every Ask / Nudge dims.
function _rvStartWeek(name) {
  var o = _rvState.ov;
  if (!o) return;
  var fmt = function (x) { return x.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); };
  var d = new Date(); d.setDate(d.getDate() + (o.askDays || 7));
  o.lastAsk = fmt(new Date());
  o.lastAskWho = name || ''; o.lastAskGot = false;
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
  var html = '';   // no count line: the cards say it (user, 2026-10-26)
  if (!list.length) html += '<div class="inq-empty">None</div>';
  list.forEach(function (r) {
    var p = 'rv' + r.row;
    html += '<div class="en-scard en-rv' + (r.askedWhen ? ' asked' : '') + '" id="' + p + 'Card">' +   // amber once asked (user, 2026-10-26)
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
        _rvYesRows(r, false, p) +
        '<span class="inq-flabel">Closes</span><span class="inq-fval" id="' + p + 'Closes">' + _rvClosesText(r.closesIn) + '</span>' +
      '</div>' +
      (!r.askedWhen
        ? '<div class="inq-acts en-rv-acts"><button class="link-btn amber opens-window rv-ask" id="' + p + 'TplBtn" onclick="_rvOpenTpl(' + r.row + ')"' +
            (locked ? ' disabled data-tip="Next ask ' + _rvEscHtml(_rvState.ov.nextAsk) + '.\nOne ask a week."' : '') + '>Ask for a review</button></div>'
        : r.saidYes
          ? '<div class="inq-acts en-rv-acts"><button class="link-btn opens-window' + (r.nudgeDue ? ' amber' : '') + '" onclick="_rvOpenTpl(' + r.row + ')">Nudge</button></div>'
          : '') +
    '</div>';
  });
  if (d.closed && d.closed.length) {
    html += '<div class="en-note en-rv-closed">Closed as No review (' + (d.closeDays || 90) + ' days after the last ask or nudge): ' +
      _rvEscHtml(d.closed.join(', ')) + '</div>';
  }
  body.innerHTML = html;
}

function _rvClosesText(n) {
  if (n == null) return 'After the ask';
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
  if (!r || (!r.askedWhen && _rvLocked())) return;
  var kind = r.askedWhen ? 'nudge' : 'ask';
  _rvTplWho = { p: 'rv' + row, name: r.name, email: r.email || '', kind: kind };
  _stWin('rvTplWin', _rvEscHtml(r.name), kind === 'ask' ? 'Templates' : 'Nudge', RV_TEXT_ICON,
    _rvTemplatesHtml(kind === 'ask' ? _rvBuildTemplates(r.name.split(' ')[0]) : _rvBuildNudges(r.name.split(' ')[0]), 'rv' + row, kind, r.phone));
}

// An email went out (2026-10-26: Copy saves nothing). An ask saves Asked =
// today and starts the week; a nudge saves Nudged = today (current: Q, ended: P,
// which also restarts the 90 days) and does not touch the weekly lock.
function _rvCopied(p, kind) {
  var row = parseInt(p.slice(2), 10), cur = p.slice(0, 2) === 'rc';
  var r = cur ? _rvFindCur(row) : _rvFind(row);
  if (!r) return;
  var ask = kind !== 'nudge';
  var cell = document.getElementById(p + (ask ? 'Asked' : 'Nudged'));
  var action = ask ? (cur ? 'reviewAsked' : 'endReviewAsked') : (cur ? 'reviewNudged' : 'endReviewNudge');
  fetch(getScriptUrl() + '?action=' + action + '&row=' + row + '&name=' + encodeURIComponent(r.name))
    .then(function (x) { return x.json(); })
    .then(function (res) {
      if (!res || !res.success) throw new Error(res && res.message || 'Not saved');
      if (ask) { r.askedWhen = res.askedWhen || 'Today'; _rvStartWeek(r.name); return; }
      r.nudged = res.nudged || 'Today'; r.nudgeDue = false;
      if (!cur) r.closesIn = (_rvState.list && _rvState.list.closeDays) || 90;
      _rvRenderSummary(); _rvRenderCurrent(); if (_rvState.list) _rvRender();
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

function _rvEscAttr(s) { return _rvEscHtml(s).replace(/"/g, '&quot;'); }
