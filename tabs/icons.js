// ─── TABS / ICONS.JS ────────────────────────────────────────────────────────
// Shared icons. Lives under tabs/ (not core/) so the pre-commit hook cache-busts
// it with ?v=N; core/ files are not versioned and can be served stale.
//
// Every dictation button in the portal uses these two. To change the mic look
// everywhere, change MIC_ICON here (an <img src="..."> works too).
// Mic shape from the user's Canva design (MicIcon.svg, 2026-09-16): only the mic
// paths, without the black circle, cropped to the mic and filled with currentColor.
var MIC_ICON =
  '<svg class="mic-icon" viewBox="245 245 640 640" width="18" height="18" fill="currentColor" aria-hidden="true">' +
  '<path d="M 675.609375 344.765625 L 675.609375 592.21875 C 675.609375 642.066406 625.902344 682.699219 564.777344 682.699219 C 503.65625 682.699219 453.949219 642.066406 453.949219 592.21875 L 453.949219 344.765625 C 453.949219 294.855469 503.65625 254.292969 564.777344 254.292969 C 625.902344 254.292969 675.609375 294.867188 675.609375 344.765625 Z M 675.609375 344.765625 M 716.585938 507.546875 C 708.980469 507.546875 702.832031 513.710938 702.832031 521.292969 L 702.832031 589.886719 C 702.832031 654.425781 640.898438 706.941406 564.777344 706.941406 C 488.660156 706.941406 426.722656 654.4375 426.722656 589.886719 L 426.722656 521.292969 C 426.722656 513.695312 420.5625 507.546875 412.96875 507.546875 C 405.375 507.546875 399.226562 513.710938 399.226562 521.292969 L 399.226562 589.886719 C 399.226562 665.542969 466.152344 727.765625 551.035156 733.902344 L 551.035156 847.789062 L 479.703125 847.789062 C 472.109375 847.789062 465.960938 853.949219 465.960938 861.53125 C 465.960938 869.113281 472.121094 875.273438 479.703125 875.273438 L 649.828125 875.273438 C 657.421875 875.273438 663.574219 869.113281 663.574219 861.53125 C 663.574219 853.949219 657.410156 847.789062 649.828125 847.789062 L 578.519531 847.789062 L 578.519531 733.902344 C 663.394531 727.765625 730.332031 665.542969 730.332031 589.886719 L 730.332031 521.292969 C 730.332031 513.710938 724.179688 507.546875 716.585938 507.546875 Z M 716.585938 507.546875"/></svg>';
var MIC_STOP_ICON =
  '<svg class="mic-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">' +
  '<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>';

// Clipboard and leaves-the-portal arrow, on the Copy / Open Messages row.
// ⚠️ These two are hand-written paths, not drawn artwork like the mic. Swap
// them for drawn versions when there are some; nothing else has to change.
var COPY_ICON =
  '<svg class="copy-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" ' +
  'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M15 5H6a2 2 0 0 0-2 2v10"/></svg>';

// The portal's rule (styles.css, OPENS A WINDOW): a control that LEAVES the
// portal says so. Open Messages hands off to the Mac Messages app.
var OPEN_OUT_ICON =
  '<svg class="open-out-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" ' +
  'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M14 4h6v6M20 4l-8.5 8.5"/>' +
  '<path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/></svg>';
