// ─── TABS / INQUIRIES.JS ─────────────────────────────────────────────────────
// Inquiries tab: trial lesson inquiry cards from Gmail.

function renderInquiries(inquiries) {
  var list = document.getElementById("inquiriesList");
  list.innerHTML = "";
  if (!inquiries.length) {
    list.innerHTML = "<div class='inq-empty'>No inquiries found</div>";
    return;
  }
  var unreadCount = inquiries.filter(function(i) { return i.unread; }).length;
  if (unreadCount > 0) {
    var badge = document.getElementById("inqBadge");
    badge.textContent = unreadCount;
    badge.style.display = "inline-block";
  }
  inquiries.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
  inquiries.forEach(function(inq) {
    var card = document.createElement("div");
    card.className = "inq-card " + (inq.unread ? "unread" : "read");
    card.id = "inq-" + inq.id;
    var details = [
      inq.name   || "—",
      (inq.gender || "—") + " / " + (inq.age || "—"),
      inq.city   || "—"
    ].join(" · ");
    card.innerHTML =
      "<div class='inq-from'>Trial Inquiry</div>" +
      "<div class='inq-date'>" + (inq.date || "") + "</div>" +
      "<div class='inq-body'>" + details + "</div>" +
      "<button class='inq-delete' onclick='deleteInquiry(\"" + inq.id + "\")'>✕</button>";
    list.appendChild(card);
  });
}

function deleteInquiry(id) {
  var card = document.getElementById("inq-" + id);
  if (card) card.remove();
  var remaining = document.querySelectorAll(".inq-card.unread").length;
  var badge = document.getElementById("inqBadge");
  if (remaining > 0) { badge.textContent = remaining; badge.style.display = "inline-block"; }
  else { badge.style.display = "none"; }
}
