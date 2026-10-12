// ─── TABS / HELP.JS ─────────────────────────────────────────────────────────
// Help ▾ dropdown: static reading pages, no backend calls. One page per
// system, so how something works can be looked up instead of asked again.
// Same card look as the Inquiries tab (.inq-dcard).
//   Data tracked — everything kept on every student, and where it lives.

function initHelpTab(tab) {
  if (!document.getElementById('helpStyle')) {
    var st = document.createElement('style');
    st.id = 'helpStyle';
    // Inquiries card look (.inq-dcard, css/styles.css); the item labels may wrap here.
    st.textContent =
      ".help-lead{font-family:'DM Mono',monospace;font-size:10.5px;color:rgba(255,255,255,0.35);margin:-10px 0 22px}" +
      ".help-card .inq-fields{grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:5px 20px}" +
      ".help-card .inq-flabel{white-space:normal;color:rgba(255,255,255,0.5)}" +
      ".help-card .inq-fval{color:rgba(255,255,255,0.3)}" +
      ".help-card.help-missing{border-left-color:var(--border)}";
    document.head.appendChild(st);
  }
  if (tab === 'helpdata') {
    var b = document.getElementById('helpDataBody');
    if (b && !b.dataset.done) { b.innerHTML = _helpDataHtml(); b.dataset.done = '1'; }
  }
}

// ── DATA TRACKED ────────────────────────────────────────────────────────────
// [what, where it lives]
var HELP_DATA = [
  { h: 'Who they are', rows: [
    ['Name, email', 'Counter sheet → Counter tab'],
    ['Phone', 'Counter sheet → Phone Numbers tab'],
    ['City, school or job, goals, interests', 'Students Import → their tab, top block'],
    ['Inquiry: date, gender, age, level', 'Inquiries sheet → Inquiries tab (one column each)']
  ]},
  { h: 'Schedule and rate', rows: [
    ['Weekly or biweekly, regular slot', 'Google Calendar (RPM - Weekly / Biweekly)'],
    ['Availability notes', 'Student Availability sheet'],
    ['Current rate', 'Rates, Raise, Lifetime & Review History sheet'],
    ['Raise dates', 'Rates, Raise, Lifetime & Review History sheet'],
    ['Website prices and the day they changed', 'Website Rates Archive sheet']
  ]},
  { h: 'Lessons', rows: [
    ['Every lesson: date and what was taught', 'Students Import → their tab, row 12 down'],
    ['Lesson number in the 4-lesson block', 'Counter sheet → Counter tab'],
    ['Log / HW / Schedule done, per lesson', 'HW Tracking sheet → Lesson Checklist tab'],
    ['HW given, files, sent or not', 'HW Tracking sheet → HW Log tab'],
    ['Lesson folders', 'Dropbox → their folder']
  ]},
  { h: 'Money', rows: [
    ['Every payment: date, amount, method', 'RPM Payments sheet'],
    ['Payment reminders sent', 'Counter sheet → Payment Reminders tab'],
    ['What each lesson earned', 'Income sheet']
  ]},
  { h: 'Attendance', rows: [
    ['Skips: who (student / teacher) and why', 'Counter sheet → Skip Logs tab'],
    ['Reschedules: who asked and why', 'Counter sheet → Reschedule Logs tab'],
    ['No shows', 'Counter sheet → No Show Logs tab'],
    ['Lessons cancelled for your trips', 'RPM Travel Agent sheet']
  ]},
  { h: 'Start, end, review', rows: [
    ['Start date, how long with you', 'Rates, Raise, Lifetime & Review History sheet'],
    ['Left a review (yes / no), asked when', 'Rates, Raise, Lifetime & Review History sheet'],
    ['Trial: how it went', 'Intake ▾ Trial card'],
    ['End date + totals (lessons, payments, skips, reschedules, review)', 'Inquiries sheet → Lifetime & Review tab (written by Terminate)'],
    ['Their full lesson tab after they end', 'Eski sheet']
  ]},
  { h: 'Messages', rows: [
    ['Texts with them', 'RPM Comms sheet → Inbox and Student Line tabs']
  ]}
];

var HELP_DATA_MISSING = [
  ['How they found you', 'Google, referral, flyer. Inquiries has no field for it.'],
  ['Why they left', 'Terminate saves that they ended, not why.'],
  ['How much notice they gave', 'On skips and reschedules: last minute or a week ahead.'],
  ['Referrals', 'Who they sent your way.'],
  ['Review posted date', 'The day the review showed up on Google, not just yes / no. Needed to check reviews are spaced about a week apart.'],
  ['Parent contact', 'For students who are kids.']
];

function _helpDataHtml() {
  var h = '<div class="section-label">Data tracked</div>' +
          '<div class="help-lead">Everything kept on every student, and where it lives. Updated Oct 12, 2026.</div>';
  HELP_DATA.forEach(function(sec) {
    h += '<div class="inq-dcard help-card"><div class="inq-drow"><span class="inq-chan">' + sec.rows.length + ' items</span></div>' +
         '<div class="inq-name-line"><span class="inq-name">' + sec.h + '</span></div><div class="inq-fields">';
    sec.rows.forEach(function(r) { h += '<span class="inq-flabel">' + r[0] + '</span><span class="inq-fval">' + r[1] + '</span>'; });
    h += '</div></div>';
  });
  h += '<div class="section-label" style="margin-top:30px">Not tracked yet</div>' +
       '<div class="inq-dcard help-card help-missing"><div class="inq-fields">';
  HELP_DATA_MISSING.forEach(function(p) { h += '<span class="inq-flabel">' + p[0] + '</span><span class="inq-fval">' + p[1] + '</span>'; });
  h += '</div></div>';
  return h;
}
