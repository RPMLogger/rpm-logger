// ─── TABS / HELP.JS ─────────────────────────────────────────────────────────
// Help ▾ dropdown: static reading pages, no backend calls. One page per
// system, so how something works can be looked up instead of asked again.
// Same card look as Secretary ▾ Logic (reuses its sec-* styles).
//   Data tracked — everything kept on every student, and where it lives.

function initHelpTab(tab) {
  _secInjectStyle();
  if (!document.getElementById('helpStyle')) {
    var st = document.createElement('style');
    st.id = 'helpStyle';
    // The item reads bright, where it lives muted (Secretary's table is the other way round).
    st.textContent = ".help-tbl td:first-child{color:var(--text);width:48%}.help-tbl td:last-child{color:var(--muted)}";
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
  var h = '<div class="section-label">Help · Data tracked</div>' +
          '<div class="sec-lead">Everything kept on every student, and where it lives. Updated Oct 12, 2026.</div>';
  HELP_DATA.forEach(function(sec) {
    h += '<div class="sec-card"><div class="sec-h">' + sec.h + '</div><table class="sec-tbl help-tbl">';
    sec.rows.forEach(function(r) { h += '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td></tr>'; });
    h += '</table></div>';
  });
  h += '<div class="sec-group">Not tracked yet</div><div class="sec-card">';
  HELP_DATA_MISSING.forEach(function(p) { h += '<div class="sec-q">' + p[0] + '</div><div class="sec-a">' + p[1] + '</div>'; });
  h += '</div>';
  return h;
}
