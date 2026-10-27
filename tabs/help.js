// ─── TABS / HELP.JS ─────────────────────────────────────────────────────────
// Help (in the Data ▾ menu): static reading pages, no backend calls.
//   Data tracked — the short page: one button per part (Students, Lessons,
//   Finance), each opening a window (the portal's _stWin look) that lists what
//   is tracked that matters, in boxes. Where each thing is stored is for the
//   full data map (planned, read live from the sheets), not this page.
// Update HELP_DATA in the same change whenever something that matters gets tracked.

function initHelpTab(tab) {
  if (!document.getElementById('helpStyle')) {
    var st = document.createElement('style');
    st.id = 'helpStyle';
    // Red title + icon like the Dashboard; in the windows, each box a bordered
    // list with faint lines between items.
    st.textContent =
      "#helpDataBody > .settings-title{margin-bottom:10px}" +
      ".help-icon{margin:0 0 18px}.help-icon .win-icon{height:34px}" +
      "#helpWin .win-icon{height:24px}" +   // the window icon a step up from 20 (user 2026-10-23)
      ".help-lead{font-size:10.5px;letter-spacing:1px;text-transform:uppercase;color:var(--t-faint);margin-bottom:14px}" +
      ".help-btns{display:flex;gap:8px;flex-wrap:wrap}" +
      ".help-box{border:2px solid var(--border);border-radius:var(--radius-card);padding:4px 14px;margin-bottom:22px}" +
      ".help-box:last-child{margin-bottom:0}" +
      ".help-i{padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);font-size:10.5px;line-height:1.5;color:var(--t-normal)}" +
      ".help-i:last-child{border-bottom:0}";
    document.head.appendChild(st);
  }
  if (tab === 'helpdata') {
    var b = document.getElementById('helpDataBody');
    if (b && !b.dataset.done) { b.innerHTML = _helpDataHtml(); b.dataset.done = '1'; }
  }
}

// The user's magnifying glass (om-111.svg), black fill stripped so it takes the icon grey.
var HELP_ICON =
  '<svg class="win-icon" viewBox="0 0 907.5 907.5" fill="currentColor" aria-hidden="true">' +
  '<path d="M 304.847656 65.113281 C 172.0625 65.113281 64.089844 173.085938 64.089844 305.871094 C 64.089844 438.660156 172.0625 546.628906 304.847656 546.628906 C 437.636719 546.628906 545.605469 438.660156 545.605469 305.871094 C 545.605469 173.085938 437.636719 65.113281 304.847656 65.113281 Z M 304.847656 521.046875 C 186.261719 521.046875 89.675781 424.460938 89.675781 305.871094 C 89.675781 187.285156 186.261719 90.699219 304.847656 90.699219 C 423.4375 90.699219 520.023438 187.285156 520.023438 305.871094 C 520.023438 424.460938 423.4375 521.046875 304.847656 521.046875 Z M 304.847656 521.046875 "/>' +
  '<path d="M 482.796875 275.042969 C 479.214844 254.0625 471.921875 234.105469 461.304688 215.683594 C 429.066406 159.910156 369.195312 125.242188 304.847656 125.242188 C 297.8125 125.242188 292.058594 130.996094 292.058594 138.03125 C 292.058594 145.070312 297.8125 150.824219 304.847656 150.824219 C 360.113281 150.824219 411.539062 180.632812 439.171875 228.476562 C 448.253906 244.210938 454.523438 261.355469 457.59375 279.265625 C 459.128906 287.964844 459.769531 296.789062 459.769531 305.746094 C 459.769531 312.78125 465.523438 318.539062 472.5625 318.539062 C 479.597656 318.539062 485.355469 312.78125 485.355469 305.746094 C 485.355469 295.511719 484.457031 285.148438 482.796875 275.042969 Z M 482.796875 275.042969 "/>' +
  '<path d="M 678.652344 581.554688 L 632.085938 534.988281 C 621.210938 524.117188 603.941406 522.453125 590.765625 529.359375 L 548.933594 487.527344 C 586.800781 436.742188 609.1875 373.929688 609.1875 305.871094 C 609.1875 138.03125 472.6875 1.535156 304.847656 1.535156 C 137.007812 1.535156 0.382812 138.03125 0.382812 305.871094 C 0.382812 473.710938 136.882812 610.210938 304.722656 610.210938 C 372.777344 610.210938 435.71875 587.695312 486.503906 549.828125 L 528.210938 591.53125 C 520.789062 604.835938 522.582031 621.851562 533.839844 633.109375 L 580.402344 679.675781 L 756.6875 855.957031 L 795.832031 895.101562 C 802.355469 901.628906 811.183594 905.335938 820.394531 905.335938 C 829.734375 905.335938 838.429688 901.753906 844.957031 895.101562 L 893.824219 846.234375 C 907.382812 832.675781 907.382812 810.542969 893.824219 796.984375 Z M 607.652344 670.589844 L 669.566406 608.675781 L 827.6875 766.792969 L 765.769531 828.710938 Z M 25.96875 305.871094 C 25.96875 152.105469 151.082031 27.121094 304.722656 27.121094 C 458.363281 27.121094 583.472656 152.234375 583.472656 305.871094 C 583.472656 459.511719 458.363281 584.625 304.722656 584.625 C 151.082031 584.625 25.96875 459.640625 25.96875 305.871094 Z M 536.011719 510.8125 L 571.449219 546.246094 L 545.222656 572.472656 L 509.789062 537.035156 Z M 552.003906 602.023438 L 600.871094 553.15625 C 602.664062 551.363281 604.964844 550.46875 607.394531 550.46875 C 609.828125 550.46875 612.128906 551.492188 613.921875 553.15625 L 651.402344 590.636719 L 589.484375 652.554688 L 552.003906 615.070312 C 548.421875 611.488281 548.421875 605.605469 552.003906 602.023438 Z M 875.914062 828.199219 L 827.046875 877.066406 C 823.59375 880.519531 817.453125 880.519531 813.996094 877.066406 L 783.808594 846.875 L 845.722656 784.957031 L 875.914062 815.148438 C 879.625 818.730469 879.625 824.488281 875.914062 828.199219 Z M 875.914062 828.199219 "/>' +
  '</svg>';

// ── DATA TRACKED ────────────────────────────────────────────────────────────
// One part per button; each part is a list of boxes, each box a list of items.
var HELP_UPDATED = 'Oct 23';
var HELP_DATA = [
  { id: 'students', h: 'Students', boxes: [
    ['Name', 'Email', 'Phone', 'City', 'School/Job'],
    ['Goals', 'Interests', 'Gender', 'Age', 'Level'],
    ['First Contact Date', 'Start Date', 'Regular Slot', 'Slot Changes', 'Availability'],
    ['Skips', 'Reschedules', 'No Shows', 'Density'],
    ['Payments'],
    ['End Date', 'Lifetime', 'Review State', 'Google Reviews', 'Portal Text Messages']
  ]},
  { id: 'lessons', h: 'Lessons', boxes: [
    ['Lesson Date', 'Material Covered', 'Place in Block', 'HW Sent/Files']
  ]},
  { id: 'finance', h: 'Finance', boxes: [
    ['Student Rates', 'Raise Dates', 'Website Prices', 'Price Change Dates'],
    ['Lesson Income', 'Gig Income'],
    ['Expenses', 'Subscriptions', 'Renewal Dates']
  ]}
];

function _helpDataHtml() {
  return '<div class="settings-title"><span>Tracked data</span></div>' +
         '<div class="help-icon">' + HELP_ICON + '</div>' +   // under the title, like the Dashboard's
         '<div class="help-lead">Updated ' + HELP_UPDATED + '</div>' +
         '<div class="help-btns">' +
           HELP_DATA.map(function(p) { return '<button class="link-btn" onclick="_helpOpen(\'' + p.id + '\')">' + p.h + '</button>'; }).join('') +
         '</div>';
}

function _helpOpen(id) {
  var p = HELP_DATA.filter(function(x) { return x.id === id; })[0];
  if (!p) return;
  var body = p.boxes.map(function(box) {
    return '<div class="help-box">' + box.map(function(i) { return '<div class="help-i">' + i + '</div>'; }).join('') + '</div>';
  }).join('');
  _stWin('helpWin', 'Tracked data', p.h, HELP_ICON, body);
}
