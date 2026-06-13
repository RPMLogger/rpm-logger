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

  // Hide responded — those move to the Pipeline section.
  var active = (inquiries || []).filter(function(i) {
    return (i.status || "unread") !== "responded";
  });

  if (!active.length) {
    list.innerHTML = "<div class='inq-empty'>No inquiries</div>";
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

    var sub = [];
    if (inq.level)        sub.push(inqEsc(inq.level));
    if (inq.availability) sub.push(inqEsc(inq.availability));
    if (inq.phone)        sub.push(inqEsc(inq.phone));

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
      "<div class='inq-main'>" +
        "<div class='inq-line1'>" +
          "<span class='inq-from'>Trial Inquiry</span>" +
          "<span class='inq-date'>" + inqEsc(inq.date || "") + "</span>" +
          "<span class='inq-body'>" + details + "</span>" +
        "</div>" +
        (sub.length ? "<div class='inq-sub'>" + sub.join(" \u00b7 ") + "</div>" : "") +
      "</div>" +
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
