// ─── MAGNIFIER (user, 2026-10-28) ──────────────────────────────────────────
// The header magnifier turns the pointer into a magnifying glass on every tab;
// resting it on longer text for half a second pops that text up bigger in a
// bubble over it, in the text's own font and grey. Leaving the bubble closes it;
// the button again turns the magnifier off. Clicks still work while it's on.
// To-Do rows get their own bubble with a Completed button (tabs/todo.js).
var MAG_MS        = 500;  // half a second (user, 2026-10-28; was 2, then 1)
var MAG_MIN_CHARS = 40;   // shorter text (a "Yes", a date) isn't worth a bubble
var _magOn    = false;
var _magTimer = null;
var _magEl    = null;     // what the pointer is resting on

function magToggle() {
  _magOn = !_magOn;
  document.body.classList.toggle("mag-on", _magOn);
  document.getElementById("hdrMag").classList.toggle("on", _magOn);
  if (!_magOn) { clearTimeout(_magTimer); magClose(); }
}

// The nearest block of text under the pointer; null when it's short or a control.
function _magPick(el) {
  if (!el || !el.closest || el.closest(".header, #magBubble")) return null;
  var row = el.closest(".tdo-row");
  if (row) return row;
  for (; el && el !== document.body; el = el.parentElement) {
    if (/^(BUTTON|INPUT|TEXTAREA|SELECT|A|LABEL)$/.test(el.tagName)) return null;
    if (getComputedStyle(el).display === "inline") continue;
    var t = (el.innerText || "").trim();
    if (t) return t.length >= MAG_MIN_CHARS && !_magIsContainer(el) ? el : null;
  }
  return null;
}

// A box of several text blocks (a card, a field list): the pointer is between
// lines, not on one, so nothing pops up.
function _magIsContainer(el) {
  var n = 0;
  for (var c = el.firstElementChild; c; c = c.nextElementSibling) {
    if ((c.innerText || "").trim() && getComputedStyle(c).display !== "inline" && ++n > 1) return true;
  }
  return false;
}

document.addEventListener("mouseover", function(e) {
  if (!_magOn || document.getElementById("magBubble")) return;
  var el = _magPick(e.target);
  if (el === _magEl) return;
  _magEl = el;
  clearTimeout(_magTimer);
  if (el) _magTimer = setTimeout(function() { _magOpen(el); }, MAG_MS);
});

function _magOpen(el) {
  magClose();
  var b;
  if (el.classList.contains("tdo-row")) {
    b = _todoZoomBubble(el);
  } else {
    var cs = getComputedStyle(el);
    b = document.createElement("div");
    b.className = "mag-bubble";
    b.style.fontFamily = cs.fontFamily;
    b.style.fontWeight = cs.fontWeight;
    b.style.color      = cs.color;   // never whiter than the text itself (user, 2026-10-28)
    b.style.fontSize   = Math.max(22, Math.round(parseFloat(cs.fontSize) * 1.8)) + "px";
    b.textContent = el.innerText.trim();
  }
  if (!b) return;
  b.id = "magBubble";
  document.body.appendChild(b);
  // Centred on the text, kept inside the window.
  var r = el.getBoundingClientRect();
  var w = Math.min(620, window.innerWidth - 32);
  b.style.width = w + "px";
  var left = Math.max(16, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - 16));
  var top = r.top + r.height / 2 - b.offsetHeight / 2;
  top = Math.max(16, Math.min(top, window.innerHeight - b.offsetHeight - 16));
  b.style.left = left + "px";
  b.style.top = top + "px";
  b.addEventListener("mouseleave", magClose);
  // If the bubble opened away from the pointer (kept inside the window), the first move outside it closes it.
  document.addEventListener("mousemove", function away(e) {
    if (!document.body.contains(b)) { document.removeEventListener("mousemove", away); return; }
    if (!b.contains(e.target) && !b._busy) { document.removeEventListener("mousemove", away); magClose(); }
  });
}

function magClose() {
  var b = document.getElementById("magBubble");
  if (b && b._busy) return;   // stays open while it saves
  if (b) b.remove();
  _magEl = null;
}
