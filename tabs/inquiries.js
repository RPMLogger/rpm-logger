// ─── TABS / INQUIRIES.JS ─────────────────────────────────────────────────────
// Inquiries tab = Trial 0. The decision + response layer.
//   Top strip  — "Business Situation": ideal-load stepper + est. income + live
//                student/weekly/biweekly counts + biweekly unmatched spots.
//   Cards      — rich (who + motivation/skill/enthusiasm from message+interests).
//   Decision   — Yes / Maybe / No.
//                Yes   → retires the inquiry, you go book them in the Trial tab.
//                Maybe → editable template popup → sends + logs to the warm list.
//                No    → editable template popup → sends + logs to the cold list.
// Backend: decideInquiry (RPM_Intake.js) + getStudentLoad / getBiweeklyBalance.
// Lazy: everything loads only when this tab is opened (initInquiriesTab).

var _inqIdealKey = 'rpmIdealLoad';

function inqEsc(s) {
  return (s == null ? "" : String(s))
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// ── Entry point (called from switchTab) ──────────────────────────────────────
function initInquiriesTab() {
  loadBusinessStrip();
  var url = getScriptUrl();
  if (!url) return;
  fetch(url + "?action=getInquiries")
    .then(function (r) { return r.json(); })
    .then(function (d) { if (d && d.inquiries) renderInquiries(d.inquiries); })
    .catch(function () {});
}

// ── Top strip: Business Situation ────────────────────────────────────────────
function loadBusinessStrip() {
  var strip = document.getElementById("inqBizStrip");
  if (!strip) return;
  var url = getScriptUrl();
  if (!url) { strip.innerHTML = ""; return; }
  if (!strip.innerHTML) strip.innerHTML = '<div class="inq-empty">Loading load…</div>';
  var load = null, biweekly = null;
  Promise.all([
    fetch(url + "?action=getStudentLoad").then(function (r) { return r.json(); }).catch(function () { return null; }),
    fetch(url + "?action=getBiweeklyBalance").then(function (r) { return r.json(); }).catch(function () { return null; })
  ]).then(function (res) {
    load = res[0]; biweekly = res[1];
    renderBusinessStrip(load, biweekly);
  });
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

function renderBusinessStrip(load, biweekly) {
  var strip = document.getElementById("inqBizStrip");
  if (!strip) return;
  if (!load || !load.success) { strip.innerHTML = ""; return; }

  var ideal = _inqIdeal();
  var norm  = (typeof load.normalized === "number") ? load.normalized : 0;
  var incNow = load.totalIncome || 0;
  var perNorm = norm > 0 ? incNow / norm : 380;          // approx $ per normalized student/block
  var incIdeal = Math.round(ideal * perNorm);
  var gap = incIdeal - incNow;

  // Biweekly unmatched = biweekly students whose slot has no partner (empty on
  // the alternate week → a pairable opening).
  var unmatched = "—";
  if (biweekly && biweekly.success) {
    var paired = 0;
    (biweekly.pairs || []).forEach(function (p) { paired += (p.students || []).length; });
    unmatched = Math.max(0, (load.biweeklyCount || 0) - paired);
  }

  function chip(label, value, color) {
    return '<div style="flex:1;min-width:78px;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:8px 10px;text-align:center">' +
      '<div style="font-family:\'Syne\',sans-serif;font-size:18px;font-weight:600;color:' + (color || 'var(--text)') + '">' + value + '</div>' +
      '<div style="font-family:\'DM Mono\',monospace;font-size:9px;letter-spacing:.5px;text-transform:uppercase;color:var(--muted);margin-top:2px">' + label + '</div>' +
    '</div>';
  }

  var loadColor = norm >= ideal ? 'var(--green)' : 'var(--text)';
  var gapLine = gap > 0
    ? '<span style="color:var(--green)">+$' + gap.toLocaleString() + '</span> to reach ' + _inqFmt(ideal)
    : '<span style="color:var(--green)">at target</span>';

  strip.innerHTML =
    '<div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:14px">' +
      // Load + income headline
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px">' +
        '<div style="display:flex;align-items:center;gap:10px">' +
          '<span style="font-family:\'DM Mono\',monospace;font-size:10px;letter-spacing:.5px;text-transform:uppercase;color:var(--muted)">Ideal load</span>' +
          '<button onclick="_inqStepIdeal(-0.5)" style="' + _inqStepBtn() + '">−</button>' +
          '<span style="font-family:\'Syne\',sans-serif;font-size:21px;font-weight:600;color:' + loadColor + '">' + _inqFmt(norm) + '<span style="color:var(--muted);font-size:15px"> / ' + _inqFmt(ideal) + '</span></span>' +
          '<button onclick="_inqStepIdeal(0.5)" style="' + _inqStepBtn() + '">＋</button>' +
        '</div>' +
        '<div style="text-align:right">' +
          '<div style="font-family:\'Syne\',sans-serif;font-size:20px;font-weight:600;color:var(--text)">$' + incNow.toLocaleString() + '</div>' +
          '<div style="font-family:\'DM Mono\',monospace;font-size:10px;color:var(--muted)">' + gapLine + '</div>' +
        '</div>' +
      '</div>' +
      // Count chips
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
        chip('Students', load.totalStudents || 0) +
        chip('Weekly', load.weeklyCount || 0) +
        chip('Biweekly', load.biweeklyCount || 0) +
        chip('BW unmatched', unmatched, unmatched && unmatched !== '—' && unmatched > 0 ? 'var(--accent2)' : 'var(--text)') +
      '</div>' +
      // Coming soon
      '<div style="margin-top:10px;font-family:\'DM Mono\',monospace;font-size:10px;color:var(--muted);text-align:center">' +
        'Available / Filled / Open slots · <span style="opacity:.7">coming soon</span></div>' +
    '</div>';
}

function _inqFmt(n) { return (Math.round(n * 2) / 2).toString().replace(/\.0$/, ""); }
function _inqStepBtn() {
  return "width:26px;height:26px;border-radius:7px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:15px;line-height:1;cursor:pointer;font-family:'Syne',sans-serif";
}

// ── The inquiry cards ────────────────────────────────────────────────────────
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

  var unreadCount = active.filter(function (i) { return (i.status || "unread") === "unread"; }).length;
  var badge = document.getElementById("inqBadge");
  if (badge) {
    if (unreadCount > 0) { badge.textContent = unreadCount; badge.style.display = "inline-block"; }
    else { badge.style.display = "none"; }
  }

  active.forEach(function (inq) {
    var status = inq.status || "unread";
    var id = emailToId(inq.email);
    var card = document.createElement("div");
    card.className = "inq-dcard " + (status === "unread" ? "unread" : "read");
    card.id = "inq-" + id;
    card.setAttribute("data-email", inq.email || "");

    // Channel source (all current inquiries arrive via Gmail; text/voicemail later).
    var chan = inq.channel || "Gmail";

    // Name line: Name · Gender / Age (child|adult) · City
    var meta = [];
    var ga = [];
    if (inq.gender) ga.push(inqEsc(inq.gender));
    if (inq.age)    ga.push(_inqAgeShort(inq.age) + (_inqIsChild(inq.age) ? " (child)" : " (adult)"));
    if (ga.length)  meta.push(ga.join(" / "));
    if (inq.city)   meta.push(inqEsc(inq.city));

    // Every category on its own line, aligned like the sheet. Empty → "-".
    var fields = [
      ["Date",         inq.date],
      ["Level",        inq.level],
      ["Interests",    inq.interests],
      ["Availability", inq.availability],
      ["Daytime",      inq.daytime],
      ["Message",      inq.message]
    ];
    var fieldsHtml = fields.map(function (f) {
      var v = (f[1] != null && f[1].toString().trim()) ? inqEsc(f[1]) : "-";
      return "<span class='inq-flabel'>" + f[0] + "</span><span class='inq-fval'>" + v + "</span>";
    }).join("");

    function btn(cls, dec, label, title) {
      return "<button class='inq-db " + cls + "' " + (title ? "title='" + title + "' " : "") +
        "onclick='" + (dec === "scam" ? "inqScam" : "inqDecide") +
        "(" + (dec === "scam" ? "" : "\"" + dec + "\",") + "\"" + id + "\")'>" + label + "</button>";
    }

    card.innerHTML =
      "<div class='inq-drow'>" +
        "<span class='inq-chan'>" + inqEsc(chan) + "</span>" +
      "</div>" +
      "<div class='inq-name-line'>" +
        "<span class='inq-name'>" + inqEsc(inq.name || "—") + "</span>" +
        (meta.length ? "<span class='inq-meta'>" + meta.join(" · ") + "</span>" : "") +
      "</div>" +
      "<div class='inq-fields'>" + fieldsHtml + "</div>" +
      "<div class='inq-acts'>" +
        btn("yes",   "yes",     "Yes") +
        btn("maybe", "maybe",   "Maybe") +
        btn("no",    "no",      "No") +
        btn("",      "noreply", "No reply", "Silent clear — no email, keeps their address on the list") +
        btn("",      "scam",    "Scam",     "Scammer — delete + trash email") +
        "<button class='inq-x' onclick='deleteInquiry(\"" + inqEsc(inq.email) + "\")' title='Delete'>✕</button>" +
      "</div>";

    card._inq = inq;

    if (status === "unread") {
      card.addEventListener("click", function (ev) {
        if (ev.target.closest(".inq-db") || ev.target.closest(".inq-x")) return;
        markInquiryRead(inq.email);
      });
    }
    list.appendChild(card);
  });
}

// "10 Years Old" → "10". Leaves anything non-numeric as-is.
function _inqAgeShort(age) {
  var s = (age || "").toString().trim();
  var m = s.match(/\d+/);
  return m ? m[0] : inqEsc(s);
}

// Scam → confirm, then log to Scam sheet + trash Gmail thread + remove card.
function inqScam(domId) {
  var card = document.getElementById("inq-" + domId);
  if (!card || !card._inq) return;
  var inq = card._inq;
  if (!confirm("Mark as scam?\n\nIt stays in the Inquiries archive marked \"Scam\" and leaves the list.")) return;
  var url = getScriptUrl();
  if (!url) return;
  var qs = "action=markInquiryScam&email=" + encodeURIComponent(inq.email || "");
  fetch(url + "?" + qs)
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d || !d.success) { _inqToast("⚠ " + ((d && d.message) || "Scam failed"), "var(--accent)"); return; }
      _inqRemoveCard(inq.email);
      _inqToast("🚫 Marked Scam", "var(--muted)");
    })
    .catch(function () { _inqToast("❌ Could not reach the portal.", "var(--accent)"); });
}

function _inqIsChild(age) {
  var n = parseInt(age, 10);
  return isFinite(n) && n > 0 && n < 18;
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

// The two response templates (Yes uses the Trial tab's offer template instead).
function _inqTemplate(decision, name) {
  var first = (name || "").split(" ")[0] || "there";
  if (decision === "maybe") {
    return {
      subject: "RED PICK MUSIC — your guitar lesson inquiry",
      body: "Hey " + first + ",\n\n" +
        "Thanks for your inquiry. I'm fully booked right now, but I'll keep your info on file and reach out when something opens up.\n\n" +
        "Bilgehan / RED PICK MUSIC"
    };
  }
  return {
    subject: "RED PICK MUSIC — your guitar lesson inquiry",
    body: "Hey " + first + ",\n\n" +
      "Thanks for reaching out. Unfortunately I don't have availability that fits right now, and I'm not sure when I will. I'd recommend checking other local music teachers in the meantime.\n\n" +
      "Best of luck with your guitar journey!\n\n" +
      "Bilgehan / RED PICK MUSIC"
  };
}

function _inqOpenTemplate(decision, inq) {
  var tpl = _inqTemplate(decision, inq.name);
  var label = decision === "maybe" ? "Maybe — keep on file" : "No — not a fit";
  var accent = decision === "maybe" ? "#d98e04" : "var(--accent)";
  var hasEmail = inq.email && inq.email.indexOf("@") !== -1;

  var overlay = document.createElement("div");
  overlay.id = "inqModal";
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:18px";
  overlay.innerHTML =
    "<div style='background:var(--surface);border:1px solid var(--border);border-radius:14px;max-width:520px;width:100%;padding:18px;box-sizing:border-box'>" +
      "<div style='display:flex;align-items:center;justify-content:space-between;margin-bottom:12px'>" +
        "<div style='font-family:\"Syne\",sans-serif;font-size:16px;font-weight:700;color:" + accent + "'>" + label + "</div>" +
        "<button onclick='_inqCloseModal()' style='background:none;border:none;color:var(--muted);font-size:20px;cursor:pointer'>✕</button>" +
      "</div>" +
      (hasEmail
        ? "<div style='font-family:\"DM Mono\",monospace;font-size:11px;color:var(--muted);margin-bottom:8px'>To: " + inqEsc(inq.email) + "</div>"
        : "<div style='font-family:\"DM Mono\",monospace;font-size:11px;color:var(--accent);margin-bottom:8px'>No email on file — this will only log to the list.</div>") +
      "<input id='inqTplSubject' value='" + inqEsc(tpl.subject) + "' style='box-sizing:border-box;width:100%;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:9px 12px;color:var(--text);font-family:\"DM Mono\",monospace;font-size:12px;margin-bottom:8px'>" +
      "<textarea id='inqTplBody' rows='9' style='box-sizing:border-box;width:100%;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:10px 12px;color:var(--text);font-family:\"DM Mono\",monospace;font-size:12px;line-height:1.5;resize:vertical'>" + inqEsc(tpl.body) + "</textarea>" +
      "<div id='inqModalStatus'></div>" +
      "<div style='display:flex;gap:8px;margin-top:12px'>" +
        (hasEmail
          ? "<button id='inqSendBtn' onclick='_inqSubmitTemplate(\"" + decision + "\",true)' style='flex:2;background:" + accent + ";color:#fff;border:none;border-radius:10px;padding:12px;font-family:\"Syne\",sans-serif;font-weight:700;font-size:14px;cursor:pointer'>Send & file</button>"
          : "") +
        "<button onclick='_inqSubmitTemplate(\"" + decision + "\",false)' style='flex:1;background:var(--bg);border:1px solid var(--border);color:var(--text);border-radius:10px;padding:12px;font-family:\"DM Mono\",monospace;font-size:12px;cursor:pointer'>Just file</button>" +
      "</div>" +
    "</div>";
  overlay._inq = inq;
  overlay.addEventListener("click", function (ev) { if (ev.target === overlay) _inqCloseModal(); });
  document.body.appendChild(overlay);
}

function _inqCloseModal() {
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
      _inqRemoveCard(inq.email);
      var note, color;
      if (decision === "yes") {
        note = "✓ " + (inq.name || "Accepted") + " — now book them in the Trial tab";
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

function _inqRemoveCard(email) {
  var card = document.getElementById("inq-" + emailToId(email));
  var wasUnread = card && card.classList.contains("unread");
  if (card) card.remove();
  if (wasUnread) {
    var badge = document.getElementById("inqBadge");
    if (badge) { var n = parseInt(badge.textContent) - 1; if (n > 0) badge.textContent = n; else badge.style.display = "none"; }
  }
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
function markInquiryRead(email) {
  var card = document.getElementById("inq-" + emailToId(email));
  if (card && card.classList.contains("unread")) {
    card.classList.remove("unread");
    card.classList.add("read");
    var badge = document.getElementById("inqBadge");
    if (badge) { var n = parseInt(badge.textContent) - 1; if (n > 0) badge.textContent = n; else badge.style.display = "none"; }
  }
}

function deleteInquiry(email) {
  _inqRemoveCard(email);
  inqAction("deleteInquiryRow", email);
}
