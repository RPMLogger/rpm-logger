// ─── TABS / INQUIRIES.JS ─────────────────────────────────────────────────────
// Inquiries tab = Trial 0. The decision + response layer.
//   Top strip  — "Business Situation": ideal-load stepper + est. income + live
//                student/weekly/biweekly counts (compact).
//   Cards      — rich (who + motivation/skill/enthusiasm from message+interests).
//   Decision   — Yes / Maybe / No.
//                Yes   → retires the inquiry, they appear on the Initiate tab,
//                        where you reach out and, when agreed, book the trial.
//                Maybe → editable template popup → sends + logs to the warm list.
//                No    → editable template popup → sends + logs to the cold list.
// Backend: decideInquiry (RPM_Intake.js) + getStudentLoad.
// Lazy: everything loads only when this tab is opened (initInquiriesTab).

var _inqIdealKey = 'rpmIdealLoad';

// ── "Seen" tracking for the tab badge ────────────────────────────────────────
// Stored per browser. Dates from the sheet are day-only, so an inquiry is
// identified by email + name + date rather than by time of arrival.
var _inqSeenStore = 'rpmInqSeen';
var _inqNewThisVisit = {};
function _inqSeenKey(i) { return [(i.email || "").toLowerCase(), i.name || "", i.date || ""].join("|"); }
function _inqSeenLoad() {
  try { var v = localStorage.getItem(_inqSeenStore); return v ? JSON.parse(v) : null; } catch (e) { return null; }
}
function _inqSeenSave(obj) {
  try { localStorage.setItem(_inqSeenStore, JSON.stringify(obj)); } catch (e) {}
}

function inqEsc(s) {
  return (s == null ? "" : String(s))
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// ── Entry point (called from switchTab) ──────────────────────────────────────
function initInquiriesTab() {
  loadBusinessStrip();
  loadInquiryReplies();
  setInqView("email");   // always land on Email — never a mixed view
  var url = getScriptUrl();
  if (!url) return;
  fetch(url + "?action=getInquiries")
    .then(function (r) { return r.json(); })
    .then(function (d) { if (d && d.inquiries) renderInquiries(d.inquiries); })
    .catch(function () {});
}

// The Inquiries tab shows exactly ONE category at a time, chosen from the
// summary-strip counts. 'email' → inquiry cards + Business Situation; 'sms' /
// 'voicemail' → the comms inbox filtered to that type. No "all", no "open".
function setInqView(view) {
  window._inqView = view;
  var isEmail = (view === "email");

  var emailView = document.getElementById("inqEmailView");
  var inbox     = document.getElementById("commsInbox");
  if (emailView) emailView.style.display = isEmail ? "" : "none";
  if (inbox)     inbox.style.display     = isEmail ? "none" : "";

  // Highlight the active count; dim the others.
  var ids = { email: "commsEmail", voicemail: "commsVoicemail", sms: "commsSms" };
  Object.keys(ids).forEach(function (k) {
    var el = document.getElementById(ids[k]);
    if (!el) return;
    var on = (k === view);
    el.style.opacity = on ? "1" : "0.4";
    el.style.borderBottom = on ? "2px solid var(--accent)" : "2px solid transparent";
    el.style.paddingBottom = "3px";
  });

  // Text / Voicemail → drive the shared comms inbox filter (from comms.js).
  if (!isEmail && typeof renderCommsInbox === "function") {
    commsFilter = view; // 'sms' or 'voicemail'
    renderCommsInbox();
  }
}

// ── Replies to a Maybe or a No ────────────────────────────────
// Deciding Maybe or No sends an email, so the person can write back. The card
// has already left the tab by then, so without this the reply sits in Gmail
// unseen. Only these two decisions can appear: No reply and Scam send nothing.
function loadInquiryReplies() {
  var strip = document.getElementById("inqRepliesStrip");
  if (!strip) return;
  var url = getScriptUrl();
  if (!url) { strip.innerHTML = ""; return; }
  fetch(url + "?action=getInquiryReplies")
    .then(function (r) { return r.json(); })
    .then(function (d) { renderInquiryReplies(d && d.success ? d.replies : []); })
    .catch(function () { strip.innerHTML = ""; });   // silent: this is a bonus, not the tab
}

function renderInquiryReplies(replies) {
  var strip = document.getElementById("inqRepliesStrip");
  if (!strip) return;
  if (!replies || !replies.length) { strip.innerHTML = ""; return; }   // nothing to say

  strip.innerHTML =
    "<div class='inq-replies'>" +
      "<div class='inq-replies-head'>⚠ " + replies.length + " repl" + (replies.length === 1 ? "y" : "ies") +
        " to a Maybe or a No</div>" +
      replies.map(_inqReplyRow).join("") +
    "</div>";
}

function _inqReplyRow(r) {
  var gmail = "https://mail.google.com/mail/u/0/#all/" + encodeURIComponent(r.threadId);
  return "<div class='inq-reply'>" +
      "<div class='inq-reply-top'>" +
        "<span class='inq-reply-name'>" + inqEsc(r.name) + "</span>" +
        "<span class='inq-reply-when'>" + inqEsc(_inqAgo(r.date)) + "</span>" +
      "</div>" +
      "<div class='inq-reply-text'>" + inqEsc(r.snippet) + "</div>" +
      "<div class='inq-reply-acts'>" +
        "<a class='inq-db' href='" + gmail + "' target='_blank' " +
          "data-tip='opens the thread in gmail' data-tip-wrap>Read</a>" +
        "<button class='inq-db yes' onclick='_inqReopen(\"" + inqEsc(r.email) + "\", this)' " +
          "data-tip='clears the decision - the card comes back to this tab undecided' data-tip-wrap data-tip-left>" +
          "Reopen</button>" +
      "</div>" +
    "</div>";
}

// "3 days ago" from an ISO date.
function _inqAgo(iso) {
  var d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  var mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 60)   return mins <= 1 ? "just now" : mins + " minutes ago";
  var hrs = Math.round(mins / 60);
  if (hrs < 24)    return hrs === 1 ? "an hour ago" : hrs + " hours ago";
  var days = Math.round(hrs / 24);
  return days === 1 ? "yesterday" : days + " days ago";
}

// Put them back on the tab as an undecided card, so the decision can be made
// again now that they have said something new.
function _inqReopen(email, btn) {
  var url = getScriptUrl();
  if (!url) return;
  if (btn) { btn.disabled = true; btn.textContent = "Reopening…"; }
  fetch(url + "?action=reopenInquiry&email=" + encodeURIComponent(email))
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d || !d.success) {
        if (btn) { btn.disabled = false; btn.textContent = "Reopen"; }
        _inqToast("⚠ " + ((d && d.message) || "Could not reopen"), "var(--accent)");
        return;
      }
      _inqToast("↩ Back on the list", "var(--green)");
      initInquiriesTab();
    })
    .catch(function () {
      if (btn) { btn.disabled = false; btn.textContent = "Reopen"; }
      _inqToast("❌ Could not reach the portal.", "var(--accent)");
    });
}


// ── Top strip: Business Situation ────────────────────────────────────────────
function loadBusinessStrip() {
  var strip = document.getElementById("inqBizStrip");
  if (!strip) return;
  var url = getScriptUrl();
  if (!url) { strip.innerHTML = ""; return; }
  if (!strip.innerHTML) strip.innerHTML = '<div class="inq-empty">Loading load…</div>';
  fetch(url + "?action=getStudentLoad")
    .then(function (r) { return r.json(); })
    .catch(function () { return null; })
    .then(function (load) { renderBusinessStrip(load); });
}

function _inqIdeal() {
  var v = parseFloat(localStorage.getItem(_inqIdealKey));
  return (isFinite(v) && v > 0) ? v : 15;
}
function _inqStepIdeal(delta) {
  var v = Math.max(0.5, Math.round((_inqIdeal() + delta) * 2) / 2);
  localStorage.setItem(_inqIdealKey, String(v));
  loadBusinessStrip(); // re-render with the new target (cheap, uses fresh fetch)
}

// Compact on purpose: one headline row, one row of counts, all in the
// portal's mono font.
function renderBusinessStrip(load) {
  var strip = document.getElementById("inqBizStrip");
  if (!strip) return;
  // Was: blank the strip and say nothing. With no fallback rate behind the
  // income figure, a failure here is a student the chart cannot price, and
  // vanishing quietly is the one response that helps nobody.
  if (!load || !load.success) { strip.innerHTML = _apiRateWarning(load); return; }

  var ideal = _inqIdeal();
  var norm  = (typeof load.normalized === "number") ? load.normalized : 0;
  var incNow = load.totalIncome || 0;
  var perNorm = norm > 0 ? incNow / norm : 380;          // approx $ per normalized student/block
  var incIdeal = Math.round(ideal * perNorm);
  var gap = incIdeal - incNow;

  var mono = "font-family:'DM Mono',monospace;";
  function chip(label, value) {
    return '<div style="flex:1;min-width:70px;background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:5px 8px;text-align:center">' +
      '<div style="' + mono + 'font-size:13px;color:var(--text)">' + value + '</div>' +
      '<div style="' + mono + 'font-size:9px;letter-spacing:.5px;text-transform:uppercase;color:var(--muted);margin-top:1px">' + label + '</div>' +
    '</div>';
  }

  var loadColor = norm >= ideal ? 'var(--green)' : 'var(--text)';
  var gapLine = gap > 0
    ? '<span style="color:var(--green)">+$' + gap.toLocaleString() + '</span> to reach ' + _inqFmt(ideal)
    : '<span style="color:var(--green)">at target</span>';

  strip.innerHTML =
    '<div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px 12px;margin-bottom:12px">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:8px">' +
        '<div style="display:flex;align-items:center;gap:8px">' +
          '<span style="' + mono + 'font-size:10px;letter-spacing:.5px;text-transform:uppercase;color:var(--muted)">Ideal load</span>' +
          '<button onclick="_inqStepIdeal(-0.5)" style="' + _inqStepBtn() + '">−</button>' +
          '<span style="' + mono + 'font-size:14px;color:' + loadColor + '">' + _inqFmt(norm) + '<span style="color:var(--muted);font-size:11px"> / ' + _inqFmt(ideal) + '</span></span>' +
          '<button onclick="_inqStepIdeal(0.5)" style="' + _inqStepBtn() + '">+</button>' +
        '</div>' +
        '<div style="text-align:right;' + mono + '">' +
          '<span style="font-size:14px;color:var(--text)">$' + incNow.toLocaleString() + '</span>' +
          '<span style="font-size:10px;color:var(--muted);margin-left:8px">' + gapLine + '</span>' +
        '</div>' +
      '</div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
        chip('Students', load.totalStudents || 0) +
        chip('Weekly', load.weeklyCount || 0) +
        chip('Biweekly', load.biweeklyCount || 0) +
      '</div>' +
    '</div>';
}

function _inqFmt(n) { return (Math.round(n * 2) / 2).toString().replace(/\.0$/, ""); }
function _inqStepBtn() {
  return "width:22px;height:22px;border-radius:6px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px;line-height:1;cursor:pointer;font-family:'DM Mono',monospace";
}

// ── The inquiry cards ────────────────────────────────────────────────────────
// Every category on its own labeled line, aligned like the sheet. Empty → "-".
// SHARED: the Initiate and Trial cards call this too, so an inquiry looks
// identical before and after you say Yes. Change the fields here, both follow.
// 8126796102 → (812) 679-6102. Leaves anything that is not a 10-digit US
// number exactly as it was typed rather than mangling it.
function _inqPhonePretty(raw) {
  var d = (raw || "").toString().replace(/\D/g, "");
  if (d.length === 11 && d.charAt(0) === "1") d = d.slice(1);
  if (d.length !== 10) return (raw || "").toString();
  return "(" + d.slice(0, 3) + ") " + d.slice(3, 6) + "-" + d.slice(6);
}

function inqCardFieldsHtml(inq) {
  var fields = [
    ["Date",         inq.date],
    ["Gender",       inq.gender],
    ["Age",          inq.age ? _inqAgeShort(inq.age) : ""],
    ["City",         inq.city],
    // Contact sits with the identity fields, before the lesson details start.
    // Shown on the card because reading a number off the card beats opening a
    // composer to find it. Formatted, not raw, and plain text on purpose: a
    // tel: link is one mis-tap away from calling someone mid-lesson.
    ["Phone",        inq.phone ? _inqPhonePretty(inq.phone) : ""],
    ["Email",        inq.email],
    ["Level",        inq.level],
    ["Interests",    inq.interests],
    ["Availability", inq.availability],
    ["Daytime",      inq.daytime],
    ["Message",      inq.message]
  ];
  return fields.map(function (f) {
    var v = (f[1] != null && f[1].toString().trim()) ? inqEsc(f[1]) : "-";
    return "<span class='inq-flabel'>" + f[0] + "</span><span class='inq-fval'>" + v + "</span>";
  }).join("");
}

function renderInquiries(inquiries) {
  var list = document.getElementById("inquiriesList");
  list.innerHTML = "";

  var syncBar = document.createElement("div");
  syncBar.className = "inq-syncbar";
  syncBar.innerHTML = "<button id='inqSyncBtn' class='inq-btn inq-sync' onclick='syncInquiriesNow()'>↻ Sync</button>";
  list.appendChild(syncBar);

  // Undecided only (responded/decided ones leave the active list).
  var active = (inquiries || []).filter(function (i) { return (i.status || "unread") !== "responded"; });

  if (!active.length) {
    var empty = document.createElement("div");
    empty.className = "inq-empty";
    empty.textContent = "No inquiries";
    list.appendChild(empty);
    var b0 = document.getElementById("inqBadge");
    if (b0) b0.style.display = "none";
    return;
  }

  active.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });

  // Badge = inquiries you have not SEEN yet (arrived since you last had this tab
  // open), not "unread". Opening the tab marks everything shown as seen; the ones
  // that were new keep a "New" tag for that visit.
  var seen = _inqSeenLoad();
  var firstRun = !seen;
  seen = seen || {};
  var newKeys = {};
  active.forEach(function (i) { if (!firstRun && !seen[_inqSeenKey(i)]) newKeys[_inqSeenKey(i)] = true; });
  var tabOpen = document.getElementById("tab-inquiries").classList.contains("active");
  if (firstRun || tabOpen) {
    active.forEach(function (i) { seen[_inqSeenKey(i)] = true; });
    _inqSeenSave(seen);
    if (tabOpen) Object.keys(newKeys).forEach(function (k) { _inqNewThisVisit[k] = true; });
  }
  var newCount = (firstRun || tabOpen) ? 0 : Object.keys(newKeys).length;
  var badge = document.getElementById("inqBadge");
  if (badge) {
    if (newCount > 0) { badge.textContent = newCount; badge.style.display = "inline-block"; }
    else { badge.style.display = "none"; }
  }

  active.forEach(function (inq) {
    var status = inq.status || "unread";
    // The COLUMN is the card's identity. Two inquiries can share an email now,
    // and an email-derived id made both cards the same element: getElementById
    // returned the first, so a decision on the second one moved the first.
    var id = "c" + inq.col;
    var card = document.createElement("div");
    card.className = "inq-dcard " + (status === "unread" ? "unread" : "read");
    card.id = "inq-" + id;
    card.setAttribute("data-email", inq.email || "");

    // Channel source (all current inquiries arrive via Gmail; text/voicemail later).
    var chan = inq.channel || "Gmail";

    var fieldsHtml = inqCardFieldsHtml(inq);

    function btn(cls, dec, label, tip, tipLeft) {
      return "<button class='inq-db " + cls + "' " +
        (tip ? "data-tip='" + inqEsc(tip) + "' data-tip-wrap " + (tipLeft ? "data-tip-left " : "") : "") +
        "onclick='" + (dec === "scam" ? "inqScam" : "inqDecide") +
        "(" + (dec === "scam" ? "" : "\"" + dec + "\",") + "\"" + id + "\")'>" + label + "</button>";
    }

    card.innerHTML =
      "<div class='inq-drow'>" +
        "<span class='inq-chan'>" + inqEsc(chan) + "</span>" +
        (_inqNewThisVisit[_inqSeenKey(inq)] ? "<span class='inq-new'>New</span>" : "") +
      "</div>" +
      "<div class='inq-name-line'>" +
        "<span class='inq-name'>" + inqEsc(inq.name || "—") + "</span>" +
      "</div>" +
      "<div class='inq-fields'>" + fieldsHtml + "</div>" +
      "<div class='inq-acts'>" +
        btn("yes",   "yes",     "Yes",      "accepts - no email sent - moves to initiate - stays in inquiries sheet") +
        btn("maybe opens-window", "maybe", "Maybe", "\"try again in future\" email template opens - saves in email list - stays in inquiries sheet") +
        btn("no opens-window",    "no",    "No",    "\"no room, try different teachers\" email template opens - no email list - stays in inquiries sheet", true) +
        btn("",      "noreply", "No reply", "no email sent - kept on email list for later - stays in inquiries sheet", true) +
        btn("opens-window", "scam", "Scam", "marks as scam - deletes the email - deletes the inquiry", true) +
      "</div>";

    card._inq = inq;

    if (status === "unread") {
      card.addEventListener("click", function (ev) {
        if (ev.target.closest(".inq-db") || ev.target.closest(".inq-x")) return;
        markInquiryRead(id);
      });
    }
    list.appendChild(card);
  });
}

// "10 Years Old" → "10". Leaves anything non-numeric as-is. (Raw — the field
// renderer escapes it.)
function _inqAgeShort(age) {
  var s = (age || "").toString().trim();
  var m = s.match(/\d+/);
  return m ? m[0] : s;
}

// Scam → confirm, then log to Scam sheet + trash Gmail thread + remove card.
function inqScam(domId) {
  var card = document.getElementById("inq-" + domId);
  if (!card || !card._inq) return;
  var inq = card._inq;
  rpmConfirm({
    title: "Mark as scam?",
    message: "It stays in the Inquiries archive marked \"Scam\" and leaves the list.",
    confirmLabel: "Mark as scam",
    danger: true
  }).then(function (ok) { if (ok) _inqScamGo(inq); });
}

function _inqScamGo(inq) {
  var url = getScriptUrl();
  if (!url) return;
  var qs = "action=markInquiryScam&email=" + encodeURIComponent(inq.email || "") +
    "&col=" + encodeURIComponent(inq.col || "");
  fetch(url + "?" + qs)
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d || !d.success) { _inqToast("⚠ " + ((d && d.message) || "Scam failed"), "var(--accent)"); return; }
      _inqRemoveCard("c" + inq.col);
      _inqToast(d.purged
        ? "🚫 Deleted — email trashed, inquiry removed"
        : "🚫 Marked Scam — the email was not found, inquiry kept",
        "var(--muted)");
    })
    .catch(function () { _inqToast("❌ Could not reach the portal.", "var(--accent)"); });
}


// ── Decision dispatch ────────────────────────────────────────────────────────
function inqDecide(decision, domId) {
  var card = document.getElementById("inq-" + domId);
  if (!card || !card._inq) return;
  var inq = card._inq;
  if (decision === "yes") return _inqSendDecision("yes", inq, null);
  // No reply → silent clear, no popup, no email (still keeps the address).
  if (decision === "noreply") return _inqSendDecision("noreply", inq, { send: false, subject: "", body: "" });
  // Maybe / No → open the editable template popup.
  _inqOpenTemplate(decision, inq);
}

// The two response templates (Yes uses the Initiate tab's offer template instead).
function _inqTemplate(decision, name) {
  var first = (name || "").split(" ")[0] || "there";
  if (decision === "maybe") {
    return {
      subject: "Your Guitar Lesson Inquiry",
      body: "Hey " + first + ",\n\n" +
        "Thanks for your inquiry. I'm fully booked right now and don't see anything opening up for a while, but I'll keep your info on file and reach out when something does. You can also check back in a couple months."
    };
  }
  return {
    subject: "Your Guitar Lesson Inquiry",
    body: "Hey " + first + ",\n\n" +
      "Thanks for reaching out. Unfortunately I don't have availability that fits right now, and I'm not sure when I will. I'd recommend checking other local music teachers in the meantime.\n\n" +
      "Best of luck with your guitar journey!"
  };
}

function _inqOpenTemplate(decision, inq) {
  var tpl = _inqTemplate(decision, inq.name);
  // The title is who you are writing to. Which decision you are in is carried
  // by the Send button's colour, so the title does not have to repeat it.
  var label  = inq.name || "This inquiry";
  var accent = decision === "maybe" ? "var(--warn)" : "var(--accent)";
  var hasEmail = inq.email && inq.email.indexOf("@") !== -1;

  // Same box as core/dialog.js: one standard, so every popup in the portal
  // changes together. This one carries a form, so it takes the wide variant.
  var overlay = document.createElement("div");
  overlay.id = "inqModal";
  overlay.className = "rpm-dlg-overlay";
  overlay.innerHTML =
    "<div class='rpm-dlg rpm-dlg-wide' role='dialog' aria-modal='true' style='--dlg-accent:" + accent + "'>" +
      "<div class='rpm-dlg-head'>" +
        "<div class='rpm-dlg-title'>" + inqEsc(label) + "</div>" +
        "<button class='rpm-dlg-x' onclick='_inqCloseModal()' aria-label='Close'>✕</button>" +
      "</div>" +
      (hasEmail
        ? "<div class='rpm-dlg-meta'>To: " + inqEsc(inq.email) + "</div>"
        : "<div class='rpm-dlg-meta warn'>No email on file. This only records the decision.</div>") +
      "<div class='rpm-dlg-label'>Subject</div>" +
      "<input id='inqTplSubject' class='rpm-dlg-input' value='" + inqEsc(tpl.subject) + "'>" +
      "<div class='rpm-dlg-label'>Body</div>" +
      "<textarea id='inqTplBody' class='rpm-dlg-textarea' rows='9'>" + inqEsc(tpl.body) + "</textarea>" +
      "<div id='inqModalStatus'></div>" +
      "<div class='rpm-dlg-acts'>" +
        "<button class='rpm-dlg-btn' onclick='_inqCloseModal()'>Cancel</button>" +
        "<button id='inqSendBtn' class='rpm-dlg-btn act' onclick='_inqSubmitTemplate(\"" + decision + "\"," +
          (hasEmail ? "true" : "false") + ")'>" + (hasEmail ? "Send" : "Record decision") + "</button>" +
      "</div>" +
    "</div>";
  overlay._inq = inq;
  overlay.addEventListener("click", function (ev) { if (ev.target === overlay) _inqCloseModal(); });
  document.addEventListener("keydown", _inqModalKey, true);
  document.body.appendChild(overlay);

  // Editing the message is usually why this is open, so start there. The
  // cursor goes to the end rather than selecting, so a keystroke cannot wipe
  // the template.
  var ta = document.getElementById("inqTplBody");
  if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
}

// Escape closes it, the same reflex the rest of the portal's dialogs give you.
function _inqModalKey(e) {
  if (e.key === "Escape") { e.preventDefault(); _inqCloseModal(); }
}

function _inqCloseModal() {
  document.removeEventListener("keydown", _inqModalKey, true);
  var m = document.getElementById("inqModal");
  if (m) m.remove();
}

function _inqSubmitTemplate(decision, send) {
  var overlay = document.getElementById("inqModal");
  if (!overlay || !overlay._inq) return;
  var inq = overlay._inq;
  var subject = (document.getElementById("inqTplSubject") || {}).value || "";
  var body = (document.getElementById("inqTplBody") || {}).value || "";
  var st = document.getElementById("inqModalStatus");
  var btn = document.getElementById("inqSendBtn");
  if (btn) { btn.disabled = true; btn.style.opacity = "0.5"; btn.textContent = "Sending…"; }
  if (st) st.innerHTML = "<div style='font-family:\"DM Mono\",monospace;font-size:11px;color:var(--accent2);margin-top:8px'>" + (send ? "Sending email + filing…" : "Filing…") + "</div>";
  _inqSendDecision(decision, inq, { send: send, subject: subject, body: body });
}

function _inqSendDecision(decision, inq, tpl) {
  var url = getScriptUrl();
  if (!url) return;
  var qs = "action=decideInquiry&decision=" + decision +
    "&email=" + encodeURIComponent(inq.email || "") +
    "&col=" + encodeURIComponent(inq.col || "") +
    "&name=" + encodeURIComponent(inq.name || "") +
    "&age=" + encodeURIComponent(inq.age || "") +
    "&city=" + encodeURIComponent(inq.city || "");
  if (tpl) {
    qs += "&send=" + (tpl.send ? "1" : "0") +
      "&subject=" + encodeURIComponent(tpl.subject || "") +
      "&body=" + encodeURIComponent(tpl.body || "");
  }
  fetch(url + "?" + qs)
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d || !d.success) {
        var st = document.getElementById("inqModalStatus");
        if (st) st.innerHTML = "<div style='color:var(--accent);font-family:\"DM Mono\",monospace;font-size:11px;margin-top:8px'>⚠ " + ((d && d.message) || "Failed") + "</div>";
        return;
      }
      _inqCloseModal();
      _inqRemoveCard("c" + inq.col);
      var note, color;
      if (decision === "yes") {
        note = "✓ " + (inq.name || "Accepted") + " — reach out to them on the Initiate tab";
        color = "var(--green)";
      } else if (decision === "noreply") {
        note = "· Cleared silently — address kept on the list";
        color = "var(--muted)";
      } else {
        note = "✓ Filed" + (d.sent ? " + emailed" : "") + " — " + (decision === "maybe" ? "warm list" : "cold list");
        color = decision === "no" ? "var(--accent)" : "var(--green)";
      }
      _inqToast(note, color);
    })
    .catch(function () {
      var st = document.getElementById("inqModalStatus");
      if (st) st.innerHTML = "<div style='color:var(--accent);font-family:\"DM Mono\",monospace;font-size:11px;margin-top:8px'>❌ Could not reach the portal.</div>";
    });
}

function _inqRemoveCard(domId) {
  var card = document.getElementById("inq-" + domId);
  if (card) card.remove();
  // Refresh the strip so counts/income reflect any change (Yes → future student).
  loadBusinessStrip();
}

function _inqToast(msg, color) {
  var t = document.createElement("div");
  t.style.cssText = "position:fixed;left:50%;bottom:26px;transform:translateX(-50%);background:var(--surface);border:1px solid var(--border);border-left:3px solid " +
    (color || "var(--green)") + ";border-radius:10px;padding:12px 18px;font-family:'DM Mono',monospace;font-size:12px;color:var(--text);z-index:10000;box-shadow:0 6px 24px rgba(0,0,0,.35);max-width:88vw";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function () { t.style.transition = "opacity .4s"; t.style.opacity = "0"; setTimeout(function () { t.remove(); }, 400); }, 3200);
}

// ── plumbing kept from before ────────────────────────────────────────────────
function emailToId(email) { return (email || "").toString().toLowerCase().replace(/[^a-z0-9]/g, "_"); }

function inqAction(action, email, extra) {
  var url = getScriptUrl();
  if (!url) return Promise.resolve({ success: false });
  var q = url + "?action=" + action + "&email=" + encodeURIComponent(email || "");
  if (extra) q += extra;
  return fetch(q).then(function (r) { return r.json(); }).catch(function () { return { success: false }; });
}

function syncInquiriesNow() {
  var btn = document.getElementById("inqSyncBtn");
  if (btn) { btn.disabled = true; btn.textContent = "↻ Syncing..."; }
  var url = getScriptUrl();
  if (!url) return;
  fetch(url + "?action=getInquiries")
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data && data.inquiries) renderInquiries(data.inquiries);
      var b = document.getElementById("inqSyncBtn");
      if (b) { b.disabled = false; b.textContent = "↻ Sync"; }
    })
    .catch(function () {
      var b = document.getElementById("inqSyncBtn");
      if (b) { b.disabled = false; b.textContent = "↻ Sync"; }
    });
}

// Read/unread is a frontend-only visual cue now (no Status cell to persist to).
function markInquiryRead(domId) {
  var card = document.getElementById("inq-" + domId);
  if (card && card.classList.contains("unread")) {
    card.classList.remove("unread");
    card.classList.add("read");
  }
}

// deleteInquiry was the card's ✕: one unconfirmed click permanently deleted an
// inquiry column. Removed Sep 2026 — every decision already takes the card off
// the list, Scam deletes deliberately (with a confirm), and the Trial tab keeps
// a confirmed delete for archive cleanup.
