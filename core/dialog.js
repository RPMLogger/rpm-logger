// ─── CORE / DIALOG.JS ───────────────────────────────────────────────────────
// The portal's own confirm / alert / prompt box.
//
// The browser's native confirm() is drawn by macOS: white, rounded, headed
// "rpmlogger.github.io says", and completely unstyleable. It was the only
// light-themed thing in the portal. These three replace it.
//
//   rpmConfirm({ title, message, confirmLabel, cancelLabel, danger })  -> Promise<bool>
//   rpmAlert({ title, message, confirmLabel })                         -> Promise<void>
//   rpmPrompt({ title, message, value, placeholder, confirmLabel })    -> Promise<string|null>
//
// Escape cancels, Enter confirms, clicking the dark area cancels — the same
// reflexes the native box gave for free. Style comes from the style-pass
// tokens in css/styles.css, so every dialog in the portal changes together.

var _rpmDlgOpen = null;   // the overlay currently on screen, if any

function _rpmDialog(opts) {
  opts = opts || {};
  var kind = opts.kind || "confirm";   // confirm | alert | prompt

  // Only one at a time. A second request cancels the first rather than
  // stacking boxes nobody asked for.
  if (_rpmDlgOpen) _rpmDlgOpen.close(null);

  return new Promise(function (resolve) {
    var lastFocus = document.activeElement;

    var overlay = document.createElement("div");
    overlay.className = "rpm-dlg-overlay";

    var box = document.createElement("div");
    box.className = "rpm-dlg" + (kind === "prompt" ? " rpm-dlg-wide" : "");
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");

    // ── header ──
    var head = document.createElement("div");
    head.className = "rpm-dlg-head";
    var title = document.createElement("div");
    title.className = "rpm-dlg-title";
    title.textContent = opts.title || "Are you sure?";
    if (opts.danger) title.classList.add("danger");
    head.appendChild(title);

    var x = document.createElement("button");
    x.type = "button";
    x.className = "rpm-dlg-x";
    x.setAttribute("aria-label", "Close");
    x.textContent = "✕";
    head.appendChild(x);
    box.appendChild(head);

    // ── message ──
    if (opts.message) {
      var msg = document.createElement("div");
      msg.className = "rpm-dlg-msg";
      msg.textContent = opts.message;
      box.appendChild(msg);
    }

    // ── input (prompt only) ──
    var input = null;
    if (kind === "prompt") {
      input = document.createElement("input");
      input.type = "text";
      input.className = "rpm-dlg-input";
      input.value = opts.value || "";
      input.placeholder = opts.placeholder || "";
      box.appendChild(input);
    }

    // ── actions ──
    var acts = document.createElement("div");
    acts.className = "rpm-dlg-acts";

    var cancelBtn = null;
    if (kind !== "alert") {
      cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.className = "rpm-dlg-btn";
      cancelBtn.textContent = opts.cancelLabel || "Cancel";
      acts.appendChild(cancelBtn);
    }

    var okBtn = document.createElement("button");
    okBtn.type = "button";
    okBtn.className = "rpm-dlg-btn " + (opts.danger ? "danger" : "go");
    okBtn.textContent = opts.confirmLabel || (kind === "alert" ? "OK" : "Yes");
    acts.appendChild(okBtn);
    box.appendChild(acts);

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    function close(value) {
      if (_rpmDlgOpen !== handle) return;
      _rpmDlgOpen = null;
      document.removeEventListener("keydown", onKey, true);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
      resolve(value);
    }

    function cancelValue() { return kind === "confirm" ? false : null; }

    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); close(cancelValue()); return; }
      if (e.key === "Enter" && kind !== "alert") {
        // In a prompt the Enter key belongs to the field, which is the same
        // gesture as pressing the confirm button.
        e.preventDefault();
        confirmNow();
      }
    }

    function confirmNow() {
      if (kind === "prompt") return close(input.value);
      close(kind === "alert" ? undefined : true);
    }

    x.addEventListener("click", function () { close(cancelValue()); });
    if (cancelBtn) cancelBtn.addEventListener("click", function () { close(cancelValue()); });
    okBtn.addEventListener("click", confirmNow);
    overlay.addEventListener("mousedown", function (e) {
      if (e.target === overlay) close(cancelValue());
    });
    document.addEventListener("keydown", onKey, true);

    var handle = { close: close };
    _rpmDlgOpen = handle;

    // Focus the field in a prompt, the safe button in a destructive confirm,
    // so a stray Enter never deletes anything.
    if (input) { input.focus(); input.select(); }
    else if (opts.danger && cancelBtn) cancelBtn.focus();
    else okBtn.focus();
  });
}

function rpmConfirm(opts) {
  opts = opts || {};
  opts.kind = "confirm";
  return _rpmDialog(opts);
}

function rpmAlert(opts) {
  if (typeof opts === "string") opts = { title: opts };
  opts = opts || {};
  opts.kind = "alert";
  return _rpmDialog(opts);
}

function rpmPrompt(opts) {
  opts = opts || {};
  opts.kind = "prompt";
  return _rpmDialog(opts);
}
