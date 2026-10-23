// ─── TABS / HELP.JS ─────────────────────────────────────────────────────────
// Help (in the Data ▾ menu): static reading pages, no backend calls.
//   Data tracked — the short page: what is tracked that matters, in two parts
//   (Students, Money), each in the order things happen, then what is not
//   tracked yet. Where each thing is stored is for the full data map (planned,
//   read live from the sheets), not this page.
// Update HELP_DATA in the same change whenever something that matters gets tracked.

function initHelpTab(tab) {
  if (!document.getElementById('helpStyle')) {
    var st = document.createElement('style');
    st.id = 'helpStyle';
    // Dashboard tab look (#tab-general, css/styles.css): red title, small amber
    // caps headings with a line under, faint lines between rows, no cards.
    st.textContent =
      "#helpDataBody > .settings-title{margin-bottom:6px}" +
      ".help-lead{font-size:10.5px;letter-spacing:1px;text-transform:uppercase;color:rgba(255,255,255,0.24);margin-bottom:30px}" +
      ".help-sec{margin-bottom:28px}" +
      ".help-gh{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(217,164,65,0.9);padding-bottom:8px;border-bottom:1px solid var(--border)}" +
      ".help-r{display:grid;grid-template-columns:170px minmax(0,1fr);gap:16px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);font-size:10.5px;line-height:1.5}" +
      ".help-w{letter-spacing:1px;text-transform:uppercase;color:rgba(255,255,255,0.24)}" +
      ".help-s{color:rgba(255,255,255,0.5)}" +
      // part heading: the Dashboard title's red, a step smaller
      ".help-ph{font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:2px;color:var(--accent);margin:44px 0 18px}" +
      ".help-sec + .help-ph, .help-lead + .help-ph{margin-top:0}" +
      ".help-miss + .help-ph{margin-top:44px}" +
      // not tracked yet: red heading, labels a step brighter, reasons dimmer
      ".help-miss .help-gh{color:var(--accent)}" +
      ".help-miss .help-w{color:rgba(255,255,255,0.5)}" +
      ".help-miss .help-s{color:rgba(255,255,255,0.24)}";
    document.head.appendChild(st);
  }
  if (tab === 'helpdata') {
    var b = document.getElementById('helpDataBody');
    if (b && !b.dataset.done) { b.innerHTML = _helpDataHtml(); b.dataset.done = '1'; }
  }
}

// ── DATA TRACKED ────────────────────────────────────────────────────────────
// rows: [label, what is kept]. missing: [what, why it matters / what exists today]
var HELP_UPDATED = 'Oct 23, 2026';
var HELP_DATA = [
  { id: 'students', h: 'Students', groups: [
    { h: 'Who they are', rows: [
      ['Contact', 'Name, email, phone'],
      ['About them', 'City, school or job, goals, interests'],
      ['Inquiry', 'Date, gender, age, level']
    ]},
    { h: 'Start', rows: [
      ['Trial', 'Date, lesson log, HW sent, outcome'],
      ['Start date', 'First regular lesson']
    ]},
    { h: 'Schedule', rows: [
      ['Slot', 'Weekly or biweekly, day and time'],
      ['Slot changes', 'Old, new, start date'],
      ['Availability', 'When they can come']
    ]},
    { h: 'Lessons', rows: [
      ['Lesson log', 'Date and subject, every lesson'],
      ['Block', 'Place in the current 4-lesson block'],
      ['HW', 'Files, links, video lessons, recorded on their phone, sent or not'],
      ['Recap email', 'Lesson notes, things to practice, sent at'],
      ['Checklist', 'Log, HW, schedule, email: done or open']
    ]},
    { h: 'Attendance', rows: [
      ['Skips', 'Who (student / teacher) and why'],
      ['Reschedules', 'Who asked and why'],
      ['No shows', 'Date'],
      ['Density', 'Lessons had vs. what their slot should give, from Jul 8, 2026']
    ]},
    { h: 'End and review', rows: [
      ['End date', 'Written by Terminate'],
      ['Lifetime', 'How long they stayed, with totals: lessons, payments, skips, reschedules'],
      ['Review', 'Left one or not; if not, when asked'],
      ['Google reviews', 'Name, date, start of the review']
    ]}
  ], missing: [
    ['How they found you', 'Google, referral, flyer. Inquiries has no field for it.'],
    ['Why they left', 'Terminate saves that they ended, not why.'],
    ['Notice given', 'On skips and reschedules: last minute or a week ahead.'],
    ['Review posted date', 'Shown on the Reviews tab, not saved to the student.']
  ]},
  { id: 'money', h: 'Money', groups: [
    { h: 'Rates', rows: [
      ['Rate', 'Each student, with raise dates'],
      ['Website prices', 'Weekly, biweekly, trial, and the day they changed']
    ]},
    { h: 'Payments', rows: [
      ['Payments', 'Date, amount, method (cash, Venmo, Zelle)'],
      ['Reminders', 'Every payment reminder sent']
    ]},
    { h: 'Income', rows: [
      ['Lessons', 'Per week, from the calendars every morning'],
      ['Gigs', 'Per week, typed in by hand'],
      ['Totals', 'Weekly, 4-week, average, net']
    ]},
    { h: 'Spending', rows: [
      ['Subscriptions', 'App, company, yearly, monthly, renewal'],
      ['Expense', 'Per 4 weeks, taken off for net']
    ]}
  ], missing: [
    ['Each gig on its own', 'Date, where, amount, how paid. Only a weekly total exists.'],
    ['One-off spending', 'Gear, strings, books: anything not a subscription.'],
    ['Subscription price changes', 'From Gmail receipts. An idea, not built.'],
    ['Tax', 'The Tax tab is a placeholder.'],
    ['End of year', 'The End of Year tab is a placeholder.']
  ]}
];

function _helpDataHtml() {
  var h = '<div class="settings-title"><span>Data tracked</span></div>' +
          '<div class="help-lead">What we track that matters · updated ' + HELP_UPDATED + '</div>';
  HELP_DATA.forEach(function(p, i) {
    h += '<div class="help-ph">0' + (i + 1) + ' · ' + p.h + '</div>';
    p.groups.forEach(function(g) {
      h += '<div class="help-sec"><div class="help-gh">' + g.h + '</div>';
      g.rows.forEach(function(r) {
        h += '<div class="help-r"><span class="help-w">' + r[0] + '</span><span class="help-s">' + r[1] + '</span></div>';
      });
      h += '</div>';
    });
    h += '<div class="help-sec help-miss"><div class="help-gh">Not tracked yet</div>';
    p.missing.forEach(function(m) {
      h += '<div class="help-r"><span class="help-w">' + m[0] + '</span><span class="help-s">' + m[1] + '</span></div>';
    });
    h += '</div>';
  });
  return h;
}
