// ─── BACK (2026-11-07, portal-todo 17) ──────────────────────────────────────
// One history for the whole portal. Back = the place you were just before,
// only a location: it never undoes or re-saves anything.
// A place = a tab, plus a page inside it (now: a student's page on Lessons).
// The header's Back button, the browser's Back, the mouse back button and the
// trackpad swipe all walk the same list. An open window closes first.

var rpmNav = { idx: 0, restoring: false, fresh: false };

function _navSame(a, b) {
  return !!a && !!b && a.tab === b.tab && JSON.stringify(a.page || null) === JSON.stringify(b.page || null);
}

// Record a place. Called by switchTab (tab only) and by pages that open inside a tab.
function rpmNavGo(tab, page) {
  if (rpmNav.restoring) return;
  var cur = history.state && history.state.rpm ? history.state : null;
  var next = { rpm: 1, tab: tab, page: page || null, idx: rpmNav.idx };
  if (_navSame(cur, next)) return;   // a redraw of the same place
  // Tab + its page opened in the same moment (Today → a student's Lessons page) = one step.
  if (cur && page && rpmNav.fresh && cur.tab === tab && !cur.page) {
    history.replaceState(next, '');
  } else if (!cur) {
    rpmNav.idx = 0; next.idx = 0;
    history.replaceState(next, '');
  } else {
    rpmNav.idx = cur.idx + 1; next.idx = rpmNav.idx;
    history.pushState(next, '');
  }
  if (!page) { rpmNav.fresh = true; setTimeout(function () { rpmNav.fresh = false; }, 0); }
  rpmNavPaint();
}

// The header button and any in-page Back.
function rpmBack() {
  if (_navCloseWindow()) return;
  if (rpmNav.idx > 0) history.back();
}

function rpmNavPaint() {
  var b = document.getElementById('hdrBack');
  if (b) b.disabled = rpmNav.idx <= 0;
}

// The open window on top, if any: press its own ✕ so its own warning / cleanup runs.
function _navCloseWindow() {
  var wins = Array.prototype.filter.call(
    document.querySelectorAll('.im-notes-back, .settings-overlay.open, .rpm-dlg-overlay'),
    function (w) { return getComputedStyle(w).display !== 'none' && getComputedStyle(w).visibility !== 'hidden'; });
  var w = wins[wins.length - 1];
  if (!w) return false;
  if (w.querySelector('.rpm-busy') || w.classList.contains('rpm-busy')) return true;   // saving: Back waits
  var x = w.querySelector('[data-close], .settings-close');
  if (x) x.click(); else w.remove();
  return true;
}

window.addEventListener('popstate', function (e) {
  var s = e.state;
  if (!s || !s.rpm) return;
  // A window open: the browser's Back closes it and you stay where you are.
  var left = _navCurrent;
  if (left && _navCloseWindow()) {
    history.pushState(left, '');
    return;
  }
  rpmNav.restoring = true;
  try {
    rpmNav.idx = s.idx;
    switchTab(s.tab);
    if (s.page && s.page.kind === 'imStudent' && typeof _imOpenStudent === 'function') _imOpenStudent(s.page.name);
    else if (s.tab === 'comms' && typeof commsShowOthers === 'function') commsShowOthers(!!(s.page && s.page.kind === 'commsOthers'));
    else if (s.tab === 'import' && typeof _imOpen !== 'undefined' && _imOpen && typeof _imClose === 'function') _imClose();
  } finally { rpmNav.restoring = false; }
  _navCurrent = s;
  rpmNavPaint();
});

// What the current entry holds (for putting it back after a window-close Back).
var _navCurrent = null;
(function () {
  var rs = history.replaceState.bind(history), ps = history.pushState.bind(history);
  history.replaceState = function (st, t, u) { if (st && st.rpm) _navCurrent = st; return rs(st, t, u); };
  history.pushState = function (st, t, u) { if (st && st.rpm) _navCurrent = st; return ps(st, t, u); };
})();

// ALERT LIGHTS (user, 2026-11-08): Comms, Emails and Initiate glow gold on the amp knobs and the
// rack while their ☰ menu row has its red dot; opening the tab clears the dot, so the light goes off.
// No alerts on Payments / Audit / Trial / Reviews (user). Delete this block + the CSS block to undo.
(function () {
  var TABS = ['comms', 'emails', 'initiate'];
  function waiting(t) {
    var b = document.querySelector('.tabs .tab-btn[data-tab="' + t + '"]');
    if (!b) return false;
    if (b.classList.contains('cm-new')) return true;
    var d = b.querySelector('.inq-badge'), n = d ? d.textContent.trim() : '';
    return !!d && d.style.display !== 'none' && n !== '' && n !== '0';
  }
  function paint() {
    TABS.forEach(function (t) {
      var on = waiting(t);
      document.querySelectorAll('.amp-knob[data-k="' + t + '"], .hr-pb[data-k="' + t + '"]')
        .forEach(function (k) { k.classList.toggle('rpm-alert', on); });
    });
  }
  function start() {
    var nav = document.querySelector('.tabs');
    if (!nav) return;
    new MutationObserver(paint).observe(nav, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['style', 'class'] });
    paint();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
