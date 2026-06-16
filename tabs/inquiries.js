// ─── TABS / INQUIRIES.JS ─────────────────────────────────────────────────────
// Inquiries tab: trial lesson inquiry cards, backed by the Inquiries sheet.
// Each inquiry has: status (unread|read|responded), date, name, gender, age,
// phone, email, city, level, interests, availability, daytime, message.
// "responded" inquiries are hidden here (they belong to the Pipeline — next phase).

function inqEsc(s) {
  return (s == null ? "" : String(s))
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function renderInquiries(inquiries) {
  var list = document.getElementById("inquiriesList");
  list.innerHTML = "";

  // Sync bar — always rendered at the top, regardless of inquiry count.
  var syncBar = document.createElement("div");
  syncBar.className = "inq-syncbar";
  syncBar.innerHTML =
    "<button id='inqSyncBtn' class='inq-btn inq-sync' onclick='syncInquiriesNow()'>\u21bb Sync</button>";
  list.appendChild(syncBar);

  // Hide responded — those move to the Pipeline section.
  var active = (inquiries || []).filter(function(i) {
    return (i.status || "unread") !== "responded";
  });

  if (!active.length) {
    var empty = document.createElement("div");
    empty.className = "inq-empty";
    empty.textContent = "No inquiries";
    list.appendChild(empty);
    var b0 = document.getElementById("inqBadge");
    if (b0) b0.style.display = "none";
    return;
  }

  active.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });

  var unreadCount = active.filter(function(i) { return (i.status || "unread") === "unread"; }).length;
  var badge = document.getElementById("inqBadge");
  if (badge) {
    if (unreadCount > 0) { badge.textContent = unreadCount; badge.style.display = "inline-block"; }
    else { badge.style.display = "none"; }
  }

  active.forEach(function(inq) {
    var status = inq.status || "unread";
    var emailAttr = inqEsc(inq.email);

    var bits = [];
    if (inq.name)   bits.push(inqEsc(inq.name));
    var ga = [];
    if (inq.gender) ga.push(inqEsc(inq.gender));
    if (inq.age)    ga.push(inqEsc(inq.age));
    if (ga.length)  bits.push(ga.join(" / "));
    if (inq.city)   bits.push(inqEsc(inq.city));
    var details = bits.length ? bits.join(" \u00b7 ") : "\u2014";

    var card = document.createElement("div");
    card.className = "inq-card " + (status === "unread" ? "unread" : "read");
    card.id = "inq-" + emailToId(inq.email);
    card.setAttribute("data-email", inq.email || "");
    if (status === "unread") {
      card.style.cursor = "pointer";
      card.onclick = function(ev) {
        if (ev.target.closest(".inq-btn")) return; // ignore button clicks
        markInquiryRead(inq.email);
      };
    }

    card.innerHTML =
      "<span class='inq-from'>Inquiry</span>" +
      "<span class='inq-date'>" + inqEsc(inq.date || "") + "</span>" +
      "<span class='inq-body'>" + details + "</span>" +
      "<div class='inq-actions'>" +
        "<button class='inq-btn inq-respond' onclick='markInquiryResponded(\"" + emailAttr + "\")'>Responded</button>" +
        "<button class='inq-btn inq-delete' onclick='deleteInquiry(\"" + emailAttr + "\")'>\u2715</button>" +
      "</div>";

    list.appendChild(card);
  });
}

// email -> safe DOM id fragment
function emailToId(email) {
  return (email || "").toString().toLowerCase().replace(/[^a-z0-9]/g, "_");
}

function inqAction(action, email, extra) {
  var url = getScriptUrl();
  if (!url) return Promise.resolve({ success: false });
  var q = url + "?action=" + action + "&email=" + encodeURIComponent(email || "");
  if (extra) q += extra;
  return fetch(q).then(function(r) { return r.json(); }).catch(function() { return { success: false }; });
}

// Manual sync — re-fetches getInquiries (which triggers syncInquiries server-side)
// and re-renders the list with fresh data.
function syncInquiriesNow() {
  var btn = document.getElementById("inqSyncBtn");
  if (btn) { btn.disabled = true; btn.textContent = "\u21bb Syncing..."; }
  var url = getScriptUrl();
  if (!url) return;
  fetch(url + "?action=getInquiries")
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data && data.inquiries) renderInquiries(data.inquiries);
      var b = document.getElementById("inqSyncBtn");
      if (b) { b.disabled = false; b.textContent = "\u21bb Sync"; }
    })
    .catch(function() {
      var b = document.getElementById("inqSyncBtn");
      if (b) { b.disabled = false; b.textContent = "\u21bb Sync"; }
    });
}

function markInquiryRead(email) {
  var card = document.getElementById("inq-" + emailToId(email));
  if (card && card.classList.contains("unread")) {
    card.classList.remove("unread");
    card.classList.add("read");
    card.style.cursor = "default";
    card.onclick = null;
    var badge = document.getElementById("inqBadge");
    if (badge) {
      var n = parseInt(badge.textContent) - 1;
      if (n > 0) { badge.textContent = n; } else { badge.style.display = "none"; }
    }
  }
  inqAction("markInquiryStatus", email, "&status=read");
}

function markInquiryResponded(email) {
  var card = document.getElementById("inq-" + emailToId(email));
  var wasUnread = card && card.classList.contains("unread");
  if (card) card.remove();
  if (wasUnread) {
    var badge = document.getElementById("inqBadge");
    if (badge) {
      var n = parseInt(badge.textContent) - 1;
      if (n > 0) { badge.textContent = n; } else { badge.style.display = "none"; }
    }
  }
  inqAction("markInquiryStatus", email, "&status=responded");
}

function deleteInquiry(email) {
  var card = document.getElementById("inq-" + emailToId(email));
  var wasUnread = card && card.classList.contains("unread");
  if (card) card.remove();
  if (wasUnread) {
    var badge = document.getElementById("inqBadge");
    if (badge) {
      var n = parseInt(badge.textContent) - 1;
      if (n > 0) { badge.textContent = n; } else { badge.style.display = "none"; }
    }
  }
  inqAction("deleteInquiryRow", email);
}
