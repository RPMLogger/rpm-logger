// ─── CORE / MSGRACK.JS ──────────────────────────────────────────────────────
// THE MESSAGES TIER (user, 2026-11-14): the Home rack's second tier (under To-Do / Notes / screen), only for
// "someone wrote to me". Three groups, each a caption + cream button + red LED (the
// Calendar's BIRTH. / DOCT. look). Lit = something waiting there; click = go there.
//   TEXTS   Student (a student text not answered) · Others (unknown numbers + voicemails)
//   EMAILS  Student · G Business
//   INQ.    Inq (new form) · Initiate (a reply) · Trial (a reply)
// It reads only what the portal already has (comms inbox, email counts, badges, trial
// threads); it fetches nothing. The LCD screen is not part of this yet.
// Two tiers (user, 2026-11-14, rack photo): top = messages, bottom = problems (something broke):
//   PAYMENTS  a payment that didn't auto-confirm, or a student owes 3+ blocks
//   FINANCIAL income not recording (the finance health "!")
//   LOGS      Lessons audit sync problems only (dates / block sync / calendar), not unlogged lessons
//   SECRETARY night run recovered, or a trial with no email

var MR_LIGHTS = [
  // Inq. first, Texts last (user, 2026-11-15)
  { grp: 'Inq.', items: [
    { k: 'inq', cap: 'Inq', tip: 'Opens Inquiries.\nLit while a new inquiry came in.' },
    { k: 'initiate', cap: 'Initiate', tip: 'Opens Initiate.\nLit while someone wrote back.' },
    { k: 'trial', cap: 'Trial', tip: 'Opens Trial.\nLit while someone wrote back.' } ] },
  { grp: 'Emails', items: [
    { k: 'stu-email', cap: 'Student', tip: 'Opens Emails, Students.\nLit while a student email is new.' },
    { k: 'gbus', cap: 'G.Bus.', tip: 'Opens Emails, G Business.\nLit while a G Business email is new.' } ] },
  { grp: 'Texts', items: [
    { k: 'stu-text', cap: 'Student', tip: 'Opens Comms.\nLit while a student text waits for an answer.' },
    { k: 'others', cap: 'Others', tip: 'Opens Others.\nLit while an unknown number or voicemail waits.' } ] }
];

var AL_JACKS = 12;   // sockets on the alarm rack (was the photo's 22, then 17; user 2026-11-15: "fewer" = no empty ones)
var MR_PROBLEMS = [
  { grp: 'Logs', items: [{ k: 'logs', tip: 'Opens the Lessons audit.\nLit when lessons are out of sync.' }] },
  { grp: 'Payments', items: [{ k: 'payments', tip: 'Lit when a payment didn\'t auto-confirm,\nor a student owes 3+ blocks.' }] },
  { grp: 'Financial', items: [{ k: 'financial', tip: 'Opens Financial.\nLit when income is not recording.' }] },
  { grp: 'Secretary', items: [{ k: 'secretary', tip: 'Lit when the Secretary raised an alert:\nnight run recovered, or a trial with no email.' }] }
];

// Students 3+ blocks behind: the Payments audit's own list (once the opening audit run is back), or a Secretary "owes" alert.
function _mrOwes3() {
  var ready = typeof _rsReady === 'undefined' || _rsReady;
  var list = ready && typeof _auCache !== 'undefined' && _auCache.unpaid && _auCache.unpaid.list || [];
  return list.some(function (s) { return (s.owes || 0) >= 3; }) ||
    (typeof _secAlerts !== 'undefined' ? _secAlerts : []).some(function (a) { return a.type === 'owes'; });
}
function _mrSync() {
  var c = (typeof _rsReady === 'undefined' || _rsReady) && typeof _auCache !== 'undefined' && _auCache.sync;
  return !!(c && [c.dates, c.sync, c.cal].some(function (l) { return l && l.length; }));
}

function _mrBadgeOn(id) {
  var b = document.getElementById(id);
  return !!(b && b.style.display !== 'none' && b.textContent.trim() !== '');
}

// A text that still needs me: theirs, not answered, not a 👍 tapback, not a scam.
function _mrTextWaits(m) {
  return !m.scam && m.source !== 'out' && !m.responded && !(typeof commsReaction === 'function' && commsReaction(m));
}

function _mrState() {
  var msgs = typeof commsMessages !== 'undefined' ? commsMessages : [];
  var em = typeof _emCounts !== 'undefined' ? _emCounts : null;
  return {
    'stu-text': msgs.some(function (m) { return m.student && _mrTextWaits(m); }),
    'others': msgs.some(function (m) { return !m.student && _mrTextWaits(m); }),
    'stu-email': !!(em && em.students > 0),
    'gbus': !!(em && em.gbusiness > 0),
    'inq': _mrBadgeOn('inqBadge'),
    'initiate': _mrBadgeOn('initNavBadge'),
    'trial': (typeof _trTrialReplies !== 'undefined' ? _trTrialReplies : 0) > 0,
    'payments': (typeof _payUnmatched !== 'undefined' ? _payUnmatched : 0) > 0 || _mrOwes3(),
    'financial': _mrBadgeOn('finNavBadge'),
    'logs': _mrSync(),
    'secretary': (typeof _secAlerts !== 'undefined' ? _secAlerts : []).some(function (a) { return a.type !== 'owes'; })
  };
}

function msgRackOpen(k) {
  if (k === 'stu-text') { switchTab('comms'); return; }
  if (k === 'others') { switchTab('comms'); if (typeof commsShowOthers === 'function') commsShowOthers(true, true); return; }
  if (k === 'stu-email') { _emKey = 'students'; switchTab('emails'); return; }
  if (k === 'gbus') { _emKey = 'gbusiness'; switchTab('emails'); return; }
  if (k === 'payments') {   // a payment to confirm first (Incoming), else who owes (Payments audit)
    if (typeof _payUnmatched !== 'undefined' && _payUnmatched > 0) { switchTab('payments'); return; }
    switchTab('audit'); if (typeof openPayAudit === 'function') openPayAudit(); return;
  }
  if (k === 'financial') { switchTab('financial2'); return; }
  if (k === 'logs') { if (typeof openLessonAudit === 'function') openLessonAudit(); return; }
  if (k === 'secretary') {   // the alert box sits by the build number at the top
    var sa = document.getElementById('secAlert'); window.scrollTo({ top: 0, behavior: 'smooth' });
    if (sa) { sa.classList.remove('mr-flash'); void sa.offsetWidth; sa.classList.add('mr-flash'); }
    return;
  }
  switchTab(k === 'inq' ? 'inquiries' : k);
}

function _mrRender() {
  var box = document.getElementById('msgRack');
  if (box && !box.firstChild) {
    // the group names sit above the engraved line, their lights in one row under it (user, 2026-11-15)
    var caps = function (groups) {
      return '<div class="mr-row mr-caps">' + groups.map(function (g) {
        return '<span class="mr-grp"><span class="hr-cap mr-grp-cap" data-grp="' + g.grp + '">' + g.grp + '</span></span>';
      }).join('') + '</div>';
    };
    var tier = function (groups, cls) {
      return '<div class="mr-row ' + cls + '">' + groups.map(function (g) {
        return '<span class="mr-grp"><span class="mr-cells">' +
          g.items.map(function (it) {
            return '<span class="mr-cell">' + (it.cap ? '<span class="hr-cap">' + it.cap + '</span>' : '') +
              '<button class="mr-ob" data-k="' + it.k + '" data-tip="' + it.tip.replace(/\n/g, '&#10;') + '" onclick="msgRackOpen(this.dataset.k)"></button>' +
              '<i class="mr-led"></i></span>';
          }).join('') + '</span></span>';
      }).join('') + '</div>';
    };
    // The Home rack's second tier (user, 2026-11-14: "all in one rack"): a line, then the message lights.
    // Messages only (user, 2026-11-14): the alarms moved to their own slim rack (#alarmRack, below).
    box.innerHTML = '<div class="mr-tier-line" style="visibility:hidden"></div>' + caps(MR_LIGHTS) + '<div class="mr-tier-line"></div>' + tier(MR_LIGHTS, 'mr-top');
  }
  var al = document.getElementById('alarmRack');
  if (al && !al.firstChild) {
    // THE ALARM RACK (user, 2026-11-14, patch-bay photo): a slim unit of its own, a row of jack sockets that glow red
    // when something broke, an engraved label under each. No buttons: the socket (or its label) opens the place.
    al.innerHTML = '<span class="hr-bolt" style="left:10px"></span><span class="hr-bolt" style="right:10px"></span>' +
      // a full patch bay (user, 2026-11-15, patch-bay photo): each alarm's label spans 3 sockets (its middle one lights),
      // spread evenly (user, 2026-11-15): the empty sockets shared out at both ends and between the alarms
      (function () {
        var empty = function (n) { return new Array(Math.max(n, 0) + 1).join('<span class="al-jack al-empty"><i class="mr-led al-led"></i><i class="al-sock"></i></span>'); };
        var gaps = MR_PROBLEMS.length + 1, spare = AL_JACKS - MR_PROBLEMS.length * 3, each = Math.floor(spare / gaps), extra = spare - each * gaps;
        return '<div class="al-row" style="grid-template-columns:repeat(' + AL_JACKS + ',1fr)">' + empty(each + Math.floor(extra / 2)) + MR_PROBLEMS.map(function (g, n) {
          var it = g.items[0];
          return '<button class="al-jack al-grp" data-k="' + it.k + '" data-tip="' + it.tip.replace(/\n/g, '&#10;') + '" onclick="msgRackOpen(this.dataset.k)">' +
            '<i class="mr-led al-led"></i><i class="mr-led al-led al-mid"></i><i class="mr-led al-led"></i>' +
          '<i class="al-sock"></i><i class="al-sock"></i><i class="al-sock"></i><span class="hr-cap">' + g.grp + '</span></button>' +
            empty(n === MR_PROBLEMS.length - 1 ? each + extra - Math.floor(extra / 2) : each);
        }).join('') + '</div>';
      })();
  }
  var s = _mrState();
  document.querySelectorAll('#msgRack .mr-ob, #alarmRack .al-jack').forEach(function (b) { b.classList.toggle('lit', !!s[b.dataset.k]); });
  var tx = document.querySelector('#msgRack .mr-grp-cap[data-grp="Texts"]');   // the TEXTS label lights up with a student text (user, 2026-11-15)
  if (tx) tx.classList.toggle('lit', !!s['stu-text']);
}

(function () {
  function start() { _mrRender(); setInterval(_mrRender, 3000); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
