// ─── TABS / INQARCHIVE.JS ────────────────────────────────────────────────────
// Every inquiry ever written, in one read-only list, newest first, split by
// year.
//
// The Inquiries tab is a QUEUE: the moment you press Yes / Maybe / No the card
// leaves it. That is right for working through the morning's post and useless
// for "who was that guy who wrote in last March", or for seeing the students
// you have now next to the inquiry they arrived as. The archive is the other
// half of the same data: the sheet, but readable.
//
// READ-ONLY ON PURPOSE. Same card as the Inquiries tab, minus the decision
// buttons. A decision belongs to the tab where you are actually deciding one;
// a page you open to look things up should not have a No button on it.
//
// Every visit re-reads the sheet, so there is no Reload button: the last copy
// shows at once (no spinner on a return visit) and is swapped for the fresh
// one when it arrives.

var _iaCache = null;
var _iaTrial = null;   // getTrialStats: booked / noShow / students / didntContinue / inProgress

// Same source as the Inquiries tab. getInquiries returns EVERY column in the
// sheet with its Decision; the Inquiries tab is the thing doing the filtering,
// not the backend, so the archive just declines to filter.
function initInqArchiveTab() {
  var host = document.getElementById("inqArchiveList");
  if (!host) return;
  var url = getScriptUrl();
  if (_iaCache) _iaRender(_iaCache);
  else host.innerHTML = "<div class='inq-empty rpm-loading'>Loading</div>";
  if (!url) return;
  fetch(url + "?action=getInquiries")
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d || !d.success) {
        if (!_iaCache) host.innerHTML = "<div class='inq-empty'>Could not load the archive</div>";
        return;
      }
      _iaCache = d.inquiries || [];
      _iaRender(_iaCache);
    })
    .catch(function () {
      if (!_iaCache) host.innerHTML = "<div class='inq-empty'>Could not load the archive</div>";
    });
}

// "Sep 17, 2026" → 2026. Anything unparseable lands in its own group at the
// bottom rather than being dropped: a row with a bad date is still a person.
function _iaYear(inq) {
  var d = new Date(inq.date);
  if (!isNaN(d)) return d.getFullYear();
  var m = (inq.date || "").toString().match(/(20\d{2})/);
  return m ? parseInt(m[1], 10) : 0;
}

// Decision → a class stem. Blank means nobody has answered this one yet, which
// on the Inquiries tab is the only kind of card there is, and here is the thing
// most worth spotting. Drives both the chip and the card's left edge.
function _iaCls(decision) {
  var d = (decision || "").toString().trim();
  return d ? d.toLowerCase().replace(/[^a-z]/g, "") : "open";
}

function _iaChip(decision) {
  var d = (decision || "").toString().trim();
  return "<span class='ia-chip ia-" + _iaCls(decision) + "'>" + inqEsc(d || "Open") + "</span>";
}

// ─── TRIAL ANALYSIS (Data tab) ──────────────────────────────────────────────
// Its own tab under Data (was a button on the Archive until 2026-09-24): the
// whole funnel, all time. Inquiries from the Inquiries sheet; the trial lines from
// the Trial Lessons sheet (getTrialStats).
//   Trials booked = From website + Manual booking
//                 = No shows + Students + Didn't continue + In progress
// No Show is its own outcome, never counted with Didn't continue (Dismiss).
// A zero or a number not loaded yet reads "—".
function _iaAnalysisHtml() {
  var t = _iaTrial || {};
  var inq = (_iaCache || []).length;
  function num(x) { return x ? x : "—"; }
  function pct(a, b) { return (a && b) ? Math.round(a / b * 100) + "%" : ""; }
  // label · share (of the line it splits) · number
  function row(label, n, share, cls) {
    return "<div class='iat-row" + (cls ? " " + cls : "") + "'>" +
      "<span class='iat-l'>" + label + "</span>" +
      "<span class='iat-p'>" + share + "</span>" +
      "<span class='iat-n'>" + num(n) + "</span></div>";
  }

  // Box 1: who wrote in, and who got a trial (and how it was booked).
  // Box 2, Trial Outcome: every booked trial by how it ended, counts only.
  return "<div class='section-label'>Analysis</div>" +
    "<div class='iat'>" +
      row("Inquiries",        inq,        "",                       "top") +
      row("Trials Booked",    t.booked,   pct(t.booked, inq),       "top") +
      row("From Website",     t.website,  pct(t.website, t.booked), "sub") +
      row("Manual Booking",   t.manual,   pct(t.manual, t.booked),  "sub") +
    "</div>" +
    // Every booked trial, best ending first: these four add up to Trials Booked.
    "<div class='section-label'>Trial Outcome</div>" +
    "<div class='iat'>" +
      row("Turned Students", t.students,      "") +
      row("Not Continued",   t.didntContinue, "") +
      row("In Progress",     t.inProgress,    "") +
      row("No Shows",        t.noShow,        "") +
    "</div>";
}

function _iaPaintAnalysis() {
  var box = document.getElementById("trialAnalysisBody");
  if (box) box.innerHTML = _iaAnalysisHtml();
}

// Data → Trial Analysis. Two reads, painted as each lands: the inquiry count
// (the archive's own list, reused when it is already in memory) and the trial
// numbers from the Trial Lessons sheet.
function initTrialAnalysisTab() {
  var url = getScriptUrl();
  if (!url) return;
  if (_iaCache || _iaTrial) _iaPaintAnalysis();
  fetch(url + "?action=getTrialStats")
    .then(function (r) { return r.json(); })
    .then(function (d) { if (d && d.success) { _iaTrial = d.stats; _iaPaintAnalysis(); } })
    .catch(function () {});
  fetch(url + "?action=getInquiries")
    .then(function (r) { return r.json(); })
    .then(function (d) { if (d && d.success) { _iaCache = d.inquiries || []; _iaPaintAnalysis(); } })
    .catch(function () {});
}

function _iaRender(inquiries) {
  var host = document.getElementById("inqArchiveList");
  if (!host) return;

  var all = (inquiries || []).slice();
  if (!all.length) { host.innerHTML = "<div class='inq-empty'>Nothing in the archive yet</div>"; return; }

  all.sort(function (a, b) {
    var da = new Date(a.date), db = new Date(b.date);
    if (isNaN(da) && isNaN(db)) return 0;
    if (isNaN(da)) return 1;
    if (isNaN(db)) return -1;
    return db - da;
  });

  // Group into years, keeping the sorted order inside each one.
  var years = [], byYear = {};
  all.forEach(function (inq) {
    var y = _iaYear(inq);
    if (!byYear[y]) { byYear[y] = []; years.push(y); }
    byYear[y].push(inq);
  });
  years.sort(function (a, b) { return b - a; });

  // The page head: its label, the all-time count as one wide tile, a rule.
  var html = "<div class='section-label'>Inquiry Archive</div>" +
    "<div class='rpm-counts'>" + _inqCount("Inquiries", all.length) + "</div>" +
    "<hr class='divider inq-sec-rule'>";

  years.forEach(function (y) {
    var rows = byYear[y];

    html +=
      "<div class='ia-year'>" +
        "<span class='ia-year-n'>" + (y || "No date") + "</span>" +
      "</div>";

    rows.forEach(function (inq) {
      html +=
        "<div class='inq-dcard archived ia-d-" + _iaCls(inq.decision) + "'>" +
          "<div class='inq-drow'>" +
            "<span class='inq-chan'>" + inqEsc(inq.channel || "Gmail") + "</span>" +
            _iaChip(inq.decision) +
          "</div>" +
          "<div class='inq-name-line'>" +
            "<span class='inq-name'>" + inqEsc(inq.name || "—") + "</span>" +
          "</div>" +
          "<div class='inq-fields'>" + inqCardFieldsHtml(inq) + "</div>" +
        "</div>";
    });
  });

  host.innerHTML = html;
}
