// ─── TABS / SECRETARY.JS ────────────────────────────────────────────────────
// Secretary ▾ dropdown: two static reading tabs, no backend calls.
//   Logic     — how the Secretary script (Apps Script, hourly trigger) decides
//               what to label, remind and email. Plain-language Q&A.
//   Templates — a sample of every email and text Secretary sends, rendered
//               from the real templates (RPM_Email_Templates.gs, RPM_Sms.gs)
//               on Oct 1 2026 with a made-up student. Re-generate the samples
//               below if a template's wording changes.

function initSecretaryTab(tab) {
  _secInjectStyle();
  if (tab === 'seclogic') {
    var lb = document.getElementById('secLogicBody');
    if (lb && !lb.dataset.done) { lb.innerHTML = _secLogicHtml(); lb.dataset.done = '1'; }
  } else {
    var tb = document.getElementById('secTemplatesBody');
    if (tb && !tb.dataset.done) { tb.innerHTML = _secTemplatesHtml(); tb.dataset.done = '1'; }
  }
}

// ── LOGIC ───────────────────────────────────────────────────────────────────
var SEC_LOGIC = [
  { h: 'Scanning', qa: [
    ['Does Secretary scan 60 days ahead, every hour?',
     'Yes. It runs every hour and checks the Weekly, Biweekly and Trial calendars.'],
    ['Does the 60-day end move every hour?',
     'No. The end is fixed once a day, at the first run after midnight. Each hourly check runs from "now" to that fixed end, so the window gets one hour shorter each run. Lessons that already started drop off the front.'],
    ['What happens at midnight?',
     'First, one last change check against yesterday’s list, so a change made late in the evening still gets its email. Then it wipes every label, relabels everything, and saves a new "midnight list": each label with its start and end time.']
  ]},
  { h: 'Lesson labels', qa: [
    ['Where does a student’s prefix come from?',
     'The first 2 letters of the first name plus the first 2 of the last name (Gail Greenwald = <code>gagr</code>). If that is taken, 3 + 3 letters, and so on. Make Student creates it once and saves it in the Counter sheet; Secretary only reads it.'],
    ['How are lessons numbered?',
     'At midnight, each student’s lessons in the window are numbered in date order: <code>gagr1</code>, <code>gagr2</code>, <code>gagr3</code>… Numbering restarts at 1 every midnight. The label lives in the event description.'],
    ['What label does a lesson added during the day get?',
     'The highest label still on the calendar for that student, plus 1. If the old lessons were deleted, their labels are free and get reused — which is why delete-and-recreate reads as a move.']
  ]},
  { h: '48-hour reminders', qa: [
    ['When does a reminder go out?',
     'When a labeled lesson is 47–48 hours away: an email, plus a text if the student has a phone number and texting is on. It runs on its own hourly trigger.'],
    ['Which reminder?',
     'By lessons finished in the block: 1st lesson, 2nd/3rd (lists the block’s dates), or 4th ("Payment Due"). Trials get "Trial Lesson - Reminder".'],
    ['Why is a lesson marked after its reminder?',
     'Hourly runs don’t land exactly 60 minutes apart, so two runs can both catch the same lesson. The <code>reminded:true</code> mark stops a duplicate.'],
    ['If a reminded lesson is moved later, is it reminded again?',
     'Yes, if its new 48-hour point is after the next midnight (the midnight wipe clears the mark). A small move that reaches 48 hours before midnight is not reminded again. Decided: rare, no fix needed.']
  ]},
  { h: 'Change detection', qa: [
    ['How does Secretary see a change?',
     'Every hour it looks up each label from its saved list and compares only the start and end time. Label gone = <b>cancelled</b>. Different time = <b>rescheduled</b>. Same = no change.'],
    ['Compared to what?',
     'To the last spot the student was emailed about. It starts as the midnight time; after each email that lesson’s saved time becomes the new spot (a cancelled lesson leaves the list). So A → B emails "to B", then B → C emails "to C", and a run with nothing new sends nothing.'],
    ['What counts as a cancel?',
     'A saved label that can’t be found. Besides a real delete: moved into the past, its label wiped, or moved to a calendar Secretary doesn’t scan. A lesson moved past the window end is <b>not</b> a cancel: Secretary looks 7 days past the end, by its label, or (if a series edit blanked it) as the student’s unlabeled lesson less than 7 days after its old time.'],
    ['Is there an email for an added lesson?',
     'No. A new lesson for an existing student just gets a label. Only trials get an email when added (the confirmation).'],
    ['Do reschedules and cancels send a text?',
     'No, email only. Texts go out only with the 48-hour reminders.']
  ]},
  { h: 'Recurring Slot email', qa: [
    ['When does "Your Recurring Slot Has Changed" go out?',
     'A regular student (not a trial) with 2 or more upcoming lessons in the list, where every one is still there, every one moved, and all the new times fall on one weekday (any day, including the old one). Lessons that already happened today are ignored.'],
    ['Move or delete-and-recreate?',
     'Move. A "This and following events" edit blanks the labels, but in the same run Secretary labels the blank lessons 1, 2, 3… before comparing, so they pair with the old ones in date order and read as moved. Delete-and-recreate only works if no run lands between the delete and the create.'],
    ['Example',
     'Charlotte Kang, biweekly Wed 7:30 PM → Tue 8:30 PM from Oct 6, moved on Oct 1. The window holds Oct 7, 21, Nov 4, 18; they become Oct 6, 20, Nov 3, 17. All moved onto Tuesday, so she gets "Your Recurring Slot Has Changed — Tuesdays at 8:30 PM (Starting October 6)".'],
    ['What can still go wrong?',
     'Moving lessons one at a time across runs gives separate "rescheduled" emails instead. Anything that wipes a label without a same-run relabel (editing a description by hand) turns a move into a cancel.']
  ]}
];

var SEC_EMAIL_WHEN = [
  ['1 lesson moved', 'Your Lesson Has Been Rescheduled'],
  ['1 lesson cancelled', 'Your Lesson Is Cancelled'],
  ['Trial moved / cancelled', 'Trial Lesson - Rescheduled / Cancelled'],
  ['2 or more changes in one run', 'Your Schedule Has Changed'],
  ['Every lesson moved onto one weekday', 'Your Recurring Slot Has Changed']
];

function _secLogicHtml() {
  var h = '<div class="section-label">Secretary · Logic</div>' +
          '<div class="sec-lead">How the Secretary script decides what to label, remind and email. Updated Oct 1, 2026.</div>';
  SEC_LOGIC.forEach(function(sec) {
    h += '<div class="sec-card"><div class="sec-h">' + sec.h + '</div>';
    sec.qa.forEach(function(p) { h += '<div class="sec-q">' + p[0] + '</div><div class="sec-a">' + p[1] + '</div>'; });
    if (sec.h === 'Change detection') {
      h += '<div class="sec-q">Which email goes out? (per student, per hourly run)</div><table class="sec-tbl">';
      SEC_EMAIL_WHEN.forEach(function(r) { h += '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td></tr>'; });
      h += '</table>';
    }
    h += '</div>';
  });
  return h;
}

// ── TEMPLATES ───────────────────────────────────────────────────────────────
function _secTemplatesHtml() {
  var h = '<div class="section-label">Secretary · Templates</div>' +
          '<div class="sec-lead">Every email and text Secretary sends, shown for a sample student (Sam Lee, lesson Tue Oct 6, 8:30 PM).</div>';
  var group = null;
  SEC_EMAIL_SAMPLES.forEach(function(e) {
    if (e.group !== group) { group = e.group; h += '<div class="sec-group">' + group + '</div>'; }
    var body = e.html.replace(/<img[^>]*cid:logo[^>]*>/g, '<div class="sec-logo">RED PICK<br>MUSIC</div>');
    h += '<div class="sec-card"><div class="sec-subj">' + e.subject + '</div><div class="sec-when">' + e.when + '</div>' +
         '<div class="sec-mail">' + body + '</div></div>';
  });
  h += '<div class="sec-group">Texts</div>';
  SEC_TEXT_SAMPLES.forEach(function(t) {
    h += '<div class="sec-card"><div class="sec-subj">' + t.subject + '</div><div class="sec-when">' + t.when + '</div>' +
         '<div class="sec-sms">' + _secEsc(t.body) + '</div></div>';
  });
  return h;
}

function _secEsc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function _secInjectStyle() {
  if (document.getElementById('secStyle')) return;
  var st = document.createElement('style');
  st.id = 'secStyle';
  st.textContent =
    ".sec-lead{color:var(--muted);font-size:12px;line-height:1.6;margin:-6px 0 16px}" +
    ".sec-card{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:14px 16px;margin-bottom:12px}" +
    ".sec-h{font-size:14px;font-weight:600;color:var(--text);margin-bottom:8px}" +
    ".sec-q{font-size:13px;font-weight:500;color:var(--text);margin-top:12px}" +
    ".sec-q:first-of-type{margin-top:0}" +
    ".sec-a{font-size:13px;line-height:1.6;color:var(--muted);margin-top:3px}" +
    ".sec-a code,.sec-card code{font-family:'DM Mono',monospace;font-size:12px;color:var(--text)}" +
    ".sec-tbl{width:100%;border-collapse:collapse;margin-top:6px;font-size:12px}" +
    ".sec-tbl td{padding:6px 8px;border-top:1px solid var(--border);color:var(--muted)}" +
    ".sec-tbl td:last-child{color:var(--text)}" +
    ".sec-group{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin:22px 0 8px}" +
    ".sec-subj{font-size:14px;font-weight:600;color:var(--text)}" +
    ".sec-when{font-size:12px;color:var(--muted);margin:2px 0 10px}" +
    ".sec-mail{background:#fff;color:#222;border-radius:6px;padding:14px 18px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.45}" +
    ".sec-mail p{margin:0 0 12px}" +
    ".sec-logo{width:56px;height:56px;border-radius:50%;background:#b3261e;color:#fff;font-size:8px;font-weight:700;display:flex;align-items:center;justify-content:center;text-align:center;line-height:1.2;margin-top:6px}" +
    ".sec-sms{background:var(--surface2);border-radius:12px;padding:12px 14px;font-size:13px;line-height:1.5;color:var(--text);white-space:pre-wrap;max-width:420px}";
  document.head.appendChild(st);
}

// ── SAMPLES (generated from the real templates, Oct 1 2026) ─────────────────
var SEC_EMAIL_SAMPLES = [
 {
  "group": "Booking",
  "subject": "Trial Lesson - Confirmation & Info",
  "when": "A new trial lesson appears on the Trial calendar (hourly run).",
  "html": "<div style='text-align:left;'><p>Hi Sam,</p><p style='margin-bottom:0;'>Your trial lesson is booked for:</p><p style='margin-top:0;'><strong><span style='color:inherit;text-decoration:none;pointer-events:none;'>Tuesday, October 6, 2026</span><span style='color:inherit;text-decoration:none;pointer-events:none;'> at </span><span style='color:inherit;text-decoration:none;pointer-events:none;'>8:30 PM</span></strong></p><p style='margin-bottom:0;'>Please review the information further below.</p><p style='margin-top:0;'>Looking forward to meeting you!</p><p style='font-size:0.92em;'>Bilgehan Tuncer<br>RED PICK MUSIC</p><div style='margin-top:8px; padding:0;'><img src='cid:logo' alt='Red Pick Music' style='display:block; width:80px; height:80px; max-width:80px; margin:0;'></div><hr style='border:none; border-top:1px solid #ccc; margin:8px 0 16px 0;'><p style='font-size:0.92em;'><em><strong>LESSON DETAILS</strong></em></p><hr style='border:none; border-top:1px solid #ccc; margin:4px 0 12px 0;'><p style='font-size:0.92em; margin-bottom:0;'><em><strong>DURATION:</strong></em></p><p style='font-size:0.92em; margin-top:4px;'><em>60 min.</em></p><hr style='border:none; border-top:1px solid #ccc; margin:12px 0;'><p style='font-size:0.92em; margin-bottom:0;'><em><strong>LOCATION:</strong></em></p><p style='font-size:0.92em; margin-top:4px;'><em><span x-apple-data-detectors='false' style='text-decoration:none; pointer-events:none;'>1 Greene St #214, Jersey City NJ 07302</span></em></p><hr style='border:none; border-top:1px solid #ccc; margin:12px 0;'><p style='font-size:0.92em; margin-bottom:0;'><em><strong>GETTING IN:</strong></em></p><p style='font-size:0.92em; margin-top:4px;'><em>Please note that the main door of the building is not on Greene Street, while the backdoor is. If you wish, you can still walk around to the main door, but the backdoor is the one you should use. When you arrive, ring the doorbell and the concierge will buzz you in — listen carefully, as the buzz is not very loud, and you'll need to push the door open while she is buzzing. From there, you can head directly to the elevator and take it to the 2nd floor. You don't need to sign in or inform the concierge, but if you are inquired as to where you are going, just say 214.</em></p><hr style='border:none; border-top:1px solid #ccc; margin:12px 0;'><p style='font-size:0.92em; margin-bottom:0;'><em><strong>PARKING:</strong></em></p><p style='font-size:0.92em; margin-top:4px;'><em>There is no dedicated parking space for guests, but street parking is available on Greene St and nearby side streets.</em></p><hr style='border:none; border-top:1px solid #ccc; margin:12px 0;'><p style='font-size:0.92em; margin-bottom:0;'><em><strong>PUBLIC TRANSIT:</strong></em></p><p style='font-size:0.92em; margin-top:4px;'><em>The building is located directly across from the Essex Street Light Rail station. There's also a Citi Bike station right across from the building, and it's about a 9-minute walk from Exchange Place or Grove Street PATH stations.</em></p><hr style='border:none; border-top:1px solid #ccc; margin:12px 0;'><p style='font-size:0.92em; margin-bottom:0;'><em><strong>RATES:</strong></em></p><p style='font-size:0.92em; margin-top:4px;'><em>[Trial / Weekly / Biweekly rates — read live from the Website Rates Archive sheet when sent]</em></p><hr style='border:none; border-top:1px solid #ccc; margin:12px 0;'><p style='font-size:0.92em; margin-bottom:0;'><em><strong>PAYMENT OPTIONS:</strong></em></p><ul style='font-size:0.92em; list-style:disc; padding-left:20px; text-align:left; margin-top:4px;'>  <li><em>Cash (preferred)</em></li>  <li><em>Venmo: @Bilgehan-Tuncer-Red-Pick-Music</em></li>  <li><em>Zelle: <span x-apple-data-detectors='false' style='text-decoration:none; pointer-events:none;'>redpickmusic@gmail.com</span></em></li></ul></div>"
 },
 {
  "group": "Reminders",
  "subject": "Guitar Lesson - Reminder",
  "when": "48 hours before the 1st lesson of a block.",
  "html": "<div style='text-align:left;'><p>Hi Sam,</p><p>Your guitar lesson is coming up — this is your <strong>1st lesson</strong> in your current block.</p><p style='margin-bottom:0;'><strong><span style='color:inherit;text-decoration:none;pointer-events:none;'>Tuesday, October 6, 2026</span><span style='color:inherit;text-decoration:none;pointer-events:none;'> at </span><span style='color:inherit;text-decoration:none;pointer-events:none;'>8:30 PM</span></strong></p><p style='font-size:0.92em;'>Bilgehan Tuncer<br>RED PICK MUSIC</p><div style='margin-top:8px; padding:0;'><img src='cid:logo' alt='Red Pick Music' style='display:block; width:80px; height:80px; max-width:80px; margin:0;'></div><br><hr><small><em style='font-size:0.92em;'>&#8226; <strong>Appointments:</strong> 60m (50m lesson, 10m transition)<br>&#8226; <strong>Deadline:</strong> Sunday 3:00 PM for all reschedules</em></small></div>"
 },
 {
  "group": "Reminders",
  "subject": "Guitar Lesson - Reminder",
  "when": "48 hours before the 2nd or 3rd lesson (lists the block’s finished dates).",
  "html": "<div style='text-align:left;'><p>Hi Sam,</p><p>Your guitar lesson is coming up — this is your <strong>3rd lesson</strong> in your current block.</p><p style='margin-bottom:0;'><strong><span style='color:inherit;text-decoration:none;pointer-events:none;'>Tuesday, October 6, 2026</span><span style='color:inherit;text-decoration:none;pointer-events:none;'> at </span><span style='color:inherit;text-decoration:none;pointer-events:none;'>8:30 PM</span></strong></p><p style='margin-top:0; font-size:0.92em;'><em>(Lessons completed: Sep 22 / Sep 29)</em></p><p style='font-size:0.92em;'>Bilgehan Tuncer<br>RED PICK MUSIC</p><div style='margin-top:8px; padding:0;'><img src='cid:logo' alt='Red Pick Music' style='display:block; width:80px; height:80px; max-width:80px; margin:0;'></div><br><hr><small><em style='font-size:0.92em;'>&#8226; <strong>Appointments:</strong> 60m (50m lesson, 10m transition)<br>&#8226; <strong>Deadline:</strong> Sunday 3:00 PM for all reschedules</em></small></div>"
 },
 {
  "group": "Reminders",
  "subject": "Reminder - Payment Due (4th Lesson)",
  "when": "48 hours before the 4th lesson of a block.",
  "html": "<div style='text-align:left;'><p>Hi Sam,</p><p>Your guitar lesson is coming up — this is your <strong>4th lesson</strong>, and payment for the next block is due this week.</p><p style='margin-bottom:0;'><strong><span style='color:inherit;text-decoration:none;pointer-events:none;'>Tuesday, October 6, 2026</span><span style='color:inherit;text-decoration:none;pointer-events:none;'> at </span><span style='color:inherit;text-decoration:none;pointer-events:none;'>8:30 PM</span></strong></p><p style='margin-top:0; font-size:0.92em;'><em>(Lessons completed: Sep 15 / Sep 22 / Sep 29)</em></p><p style='font-size:0.92em;'><em><strong>Payment Options:</strong></em></p><ul style='font-size:0.92em; list-style:disc; padding-left:20px; text-align:left;'>  <li><em>Cash (preferred)</em></li>  <li><em>Venmo: @Bilgehan-Tuncer-Red-Pick-Music</em></li>  <li><em>Zelle: <span x-apple-data-detectors='false' style='text-decoration:none; pointer-events:none;'>redpickmusic@gmail.com</span></em></li></ul><p style='font-size:0.92em;'>Bilgehan Tuncer<br>RED PICK MUSIC</p><div style='margin-top:8px; padding:0;'><img src='cid:logo' alt='Red Pick Music' style='display:block; width:80px; height:80px; max-width:80px; margin:0;'></div><br><hr><small><em style='font-size:0.92em;'>&#8226; <strong>Appointments:</strong> 60m (50m lesson, 10m transition)<br>&#8226; <strong>Deadline:</strong> Sunday 3:00 PM for all reschedules</em></small></div>"
 },
 {
  "group": "Reminders",
  "subject": "Trial Lesson - Reminder",
  "when": "48 hours before a trial lesson.",
  "html": "<div style='text-align:left;'><p>Hi Sam,</p><p>Your trial lesson is coming up.</p><p><strong><span style='color:inherit;text-decoration:none;pointer-events:none;'>Tuesday, October 6, 2026</span><span style='color:inherit;text-decoration:none;pointer-events:none;'> at </span><span style='color:inherit;text-decoration:none;pointer-events:none;'>8:30 PM</span></strong></p><p style='font-size:0.92em;'>Bilgehan Tuncer<br>RED PICK MUSIC</p><div style='margin-top:8px; padding:0;'><img src='cid:logo' alt='Red Pick Music' style='display:block; width:80px; height:80px; max-width:80px; margin:0;'></div></div>"
 },
 {
  "group": "Changes",
  "subject": "Your Lesson Has Been Rescheduled",
  "when": "One lesson moved since the last email.",
  "html": "<div style='text-align:left;'><p>Hi Sam,</p><p style='margin-bottom:0;'>Your guitar lesson has been rescheduled to:</p><p style='margin-top:0;'><strong><span style='color:inherit;text-decoration:none;pointer-events:none;'>Tuesday, October 6, 2026</span><span style='color:inherit;text-decoration:none;pointer-events:none;'> at </span><span style='color:inherit;text-decoration:none;pointer-events:none;'>8:30 PM</span></strong></p><p style='font-size:0.92em;'>Bilgehan Tuncer<br>RED PICK MUSIC</p><div style='margin-top:8px; padding:0;'><img src='cid:logo' alt='Red Pick Music' style='display:block; width:80px; height:80px; max-width:80px; margin:0;'></div></div>"
 },
 {
  "group": "Changes",
  "subject": "Your Lesson Is Cancelled",
  "when": "One lesson deleted since the last email.",
  "html": "<div style='text-align:left;'><p>Hi Sam,</p><p>Your guitar lesson on <strong><span style='color:inherit;text-decoration:none;pointer-events:none;'>Wednesday, October 7, 2026</span><span style='color:inherit;text-decoration:none;pointer-events:none;'> at </span><span style='color:inherit;text-decoration:none;pointer-events:none;'>7:30 PM</span></strong> has been cancelled.</p><p style='font-size:0.92em;'>Bilgehan Tuncer<br>RED PICK MUSIC</p><div style='margin-top:8px; padding:0;'><img src='cid:logo' alt='Red Pick Music' style='display:block; width:80px; height:80px; max-width:80px; margin:0;'></div></div>"
 },
 {
  "group": "Changes",
  "subject": "Your Schedule Has Changed",
  "when": "2 or more changes for one student in the same run (moves, cancels, or a mix).",
  "html": "<div style='text-align:left;'><p>Hi Sam,</p><p>Please note the following updates to your upcoming guitar lesson schedule:</p><p>Your lesson on <strong><span style='color:inherit;text-decoration:none;pointer-events:none;'>Wednesday, October 7, 2026</span><span style='color:inherit;text-decoration:none;pointer-events:none;'> at </span><span style='color:inherit;text-decoration:none;pointer-events:none;'>7:30 PM</span></strong> is rescheduled to <strong><span style='color:inherit;text-decoration:none;pointer-events:none;'>Tuesday, October 6, 2026</span><span style='color:inherit;text-decoration:none;pointer-events:none;'> at </span><span style='color:inherit;text-decoration:none;pointer-events:none;'>8:30 PM</span></strong></p><p>Additionally, your lesson on <strong><span style='color:inherit;text-decoration:none;pointer-events:none;'>Wednesday, October 21, 2026</span><span style='color:inherit;text-decoration:none;pointer-events:none;'> at </span><span style='color:inherit;text-decoration:none;pointer-events:none;'>7:30 PM</span></strong> is cancelled.</p><p style='font-size:0.92em;'>Bilgehan Tuncer<br>RED PICK MUSIC</p><div style='margin-top:8px; padding:0;'><img src='cid:logo' alt='Red Pick Music' style='display:block; width:80px; height:80px; max-width:80px; margin:0;'></div></div>"
 },
 {
  "group": "Changes",
  "subject": "Your Recurring Slot Has Changed",
  "when": "Every upcoming lesson moved, all onto one weekday.",
  "html": "<div style='text-align:left;'><p>Hi Sam,</p><p>Your schedule has permanently moved to:</p><p style='margin-bottom:0;'><strong><span style='color:inherit;text-decoration:none;pointer-events:none;'>Tuesdays at 8:30 PM</span></strong></p><p style='margin-top:0; font-size:0.92em;'><em><span style='color:inherit;text-decoration:none;pointer-events:none;'>(Starting October 6)</span></em></p><p style='font-size:0.92em;'>Bilgehan Tuncer<br>RED PICK MUSIC</p><div style='margin-top:8px; padding:0;'><img src='cid:logo' alt='Red Pick Music' style='display:block; width:80px; height:80px; max-width:80px; margin:0;'></div></div>"
 },
 {
  "group": "Changes",
  "subject": "Trial Lesson - Rescheduled",
  "when": "A trial lesson moved.",
  "html": "<div style='text-align:left;'><p>Hi Sam,</p><p>Your trial lesson has been rescheduled to:</p><p><strong><span style='color:inherit;text-decoration:none;pointer-events:none;'>Tuesday, October 6, 2026</span><span style='color:inherit;text-decoration:none;pointer-events:none;'> at </span><span style='color:inherit;text-decoration:none;pointer-events:none;'>8:30 PM</span></strong></p><p style='font-size:0.92em;'>Bilgehan Tuncer<br>RED PICK MUSIC</p><div style='margin-top:8px; padding:0;'><img src='cid:logo' alt='Red Pick Music' style='display:block; width:80px; height:80px; max-width:80px; margin:0;'></div></div>"
 },
 {
  "group": "Changes",
  "subject": "Trial Lesson - Cancelled",
  "when": "A trial lesson deleted.",
  "html": "<div style='text-align:left;'><p>Hi Sam,</p><p>Your trial lesson on <strong><span style='color:inherit;text-decoration:none;pointer-events:none;'>Wednesday, October 7, 2026</span><span style='color:inherit;text-decoration:none;pointer-events:none;'> at </span><span style='color:inherit;text-decoration:none;pointer-events:none;'>7:30 PM</span></strong> has been cancelled.</p><p style='font-size:0.92em;'>Bilgehan Tuncer<br>RED PICK MUSIC</p><div style='margin-top:8px; padding:0;'><img src='cid:logo' alt='Red Pick Music' style='display:block; width:80px; height:80px; max-width:80px; margin:0;'></div></div>"
 },
 {
  "group": "Not sent yet",
  "subject": "Block Complete — Payment Due",
  "when": "Template exists but nothing sends it (planned auto payment reminder).",
  "html": "<div style='text-align:left;'><p>Hi Sam,</p><p>You have completed your 4 lessons, and payment is now due.</p><p style='margin-bottom:4px;'><em><strong>Lessons completed:</strong></em></p><ul style='font-size:0.92em; list-style:disc; padding-left:20px; text-align:left; margin-top:0;'><li><em>Sep 15</em></li><li><em>Sep 22</em></li><li><em>Sep 29</em></li><li><em>Oct 6</em></li></ul><p style='font-size:0.92em;'><em><strong>Payment Options:</strong></em></p><ul style='font-size:0.92em; list-style:disc; padding-left:20px; text-align:left;'>  <li><em>Cash (preferred)</em></li>  <li><em>Venmo: @Bilgehan-Tuncer-Red-Pick-Music</em></li>  <li><em>Zelle: <span x-apple-data-detectors='false' style='text-decoration:none; pointer-events:none;'>redpickmusic@gmail.com</span></em></li></ul><p style='font-size:0.92em;'>Bilgehan Tuncer<br>RED PICK MUSIC</p><div style='margin-top:8px; padding:0;'><img src='cid:logo' alt='Red Pick Music' style='display:block; width:80px; height:80px; max-width:80px; margin:0;'></div><br><hr><small><em style='font-size:0.92em;'>&#8226; <strong>Appointments:</strong> 60m (50m lesson, 10m transition)<br>&#8226; <strong>Deadline:</strong> Sunday 3:00 PM for all reschedules</em></small></div>"
 }
];

var SEC_TEXT_SAMPLES = [
 {
  "subject": "Text — 1st lesson",
  "when": "Sent with the 1st-lesson reminder email.",
  "body": "Hi Sam — your guitar lesson is coming up! (1st in block)\n\nTuesday, October 6 at 8:30 PM\n\n• Sessions: 60 min (50 min lesson + 10 min transition)\n• Reschedule deadline: Sundays 3 PM\n\n— RED PICK MUSIC\n\n(Automated reminder — please don't reply to this number.)"
 },
 {
  "subject": "Text — 2nd / 3rd lesson",
  "when": "Sent with the 2nd/3rd-lesson reminder email.",
  "body": "Hi Sam — your guitar lesson is coming up! (3rd in block)\n\nTuesday, October 6 at 8:30 PM\n\n(Completed: Sep 22, Sep 29)\n\n• Sessions: 60 min (50 min lesson + 10 min transition)\n• Reschedule deadline: Sundays 3 PM\n\n— RED PICK MUSIC\n\n(Automated reminder — please don't reply to this number.)"
 },
 {
  "subject": "Text — 4th lesson (payment due)",
  "when": "Sent with the 4th-lesson reminder email.",
  "body": "Hi Sam — your guitar lesson is coming up! (4th in block — PAYMENT DUE)\n\nTuesday, October 6 at 8:30 PM\n\n(Completed: Sep 15, Sep 22, Sep 29)\n\n• Cash (preferred)\n• Venmo: @Bilgehan-Tuncer-Red-Pick-Music\n• Zelle: redpickmusic@gmail.com\n\n— RED PICK MUSIC\n\n(Automated reminder — please don't reply to this number.)"
 }
];
