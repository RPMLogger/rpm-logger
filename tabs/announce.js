// ─── TABS / ANNOUNCE.JS ─────────────────────────────────────────────────────
// Announcements (user, 2026-11-05): one text to many students from the RPM
// line, then a table of who got it and who replied Y, and a Nudge for the ones
// still waiting. Modelled on Trip Summary's confirmations (same rows and status
// words). Reusable: every announcement keeps its own table, newest on top.
// Lives in a window behind an "Announcements" button next to Others on Comms.
// Backend: RPM_Announce.js (getAnnouncements / sendAnnouncement / nudgeAnnouncement).

var ANN_DEFAULT_TEXT =
  "IMPORTANT: ALL LESSON TEXTING IS MOVING HERE\n\nPLEASE REPLY Y TO CONFIRM.\n\n" +
  "Hi [Student]!\n\n" +
  "As my email said, this RPM Notifications number is now our official texting line for anything lesson-related.\n\n" +
  "Photos are fine here, but videos and PDFs don't come through. Please send me a link, or put them in your Dropbox lesson folder and let me know.\n\n" +
  "Thanks!\nBilgehan";
// The notepad-and-pen under DRAFT (user's own icon, 2026-11-05).
var ANN_DRAFT_ICON = '<svg class="win-icon" viewBox="0 0 907.5 830.25" width="33" height="30" fill="currentColor" aria-hidden="true"><defs><clipPath id="annDr548a"><path d="M 0.160156 0 L 578 0 L 578 829.5 L 0.160156 829.5 Z M 0.160156 0 " clip-rule="nonzero"/></clipPath><clipPath id="annDr7472"><path d="M 398 646 L 578 646 L 578 829.5 L 398 829.5 Z M 398 646 " clip-rule="nonzero"/></clipPath><clipPath id="annDr6e62"><path d="M 495 98 L 906.839844 98 L 906.839844 507 L 495 507 Z M 495 98 " clip-rule="nonzero"/></clipPath></defs><g clip-path="url(#annDr548a)"><path d="M 412.632812 829.5 L 47.558594 829.5 C 21.671875 829.5 0.675781 808.507812 0.675781 782.625 L 0.675781 46.875 C 0.675781 20.992188 21.671875 0 47.558594 0 L 530.449219 0 C 556.335938 0 577.332031 20.992188 577.332031 46.875 L 577.332031 369.914062 C 577.332031 377.453125 571.214844 383.566406 563.675781 383.566406 C 556.132812 383.566406 550.015625 377.453125 550.015625 369.914062 L 550.015625 46.875 C 550.015625 36.074219 541.25 27.515625 530.652344 27.515625 L 47.761719 27.515625 C 37.164062 27.515625 28.398438 36.277344 28.398438 46.875 L 28.398438 782.625 C 28.398438 793.425781 37.164062 801.988281 47.761719 801.988281 L 407.128906 801.988281 L 550.015625 654.429688 L 550.015625 480.375 C 550.015625 472.835938 556.132812 466.722656 563.675781 466.722656 C 571.214844 466.722656 577.332031 472.835938 577.332031 480.375 L 577.332031 659.933594 C 577.332031 663.398438 575.902344 666.863281 573.457031 669.511719 L 422.617188 825.222656 C 419.96875 828.074219 416.300781 829.5 412.632812 829.5 Z M 412.632812 829.5 " fill-opacity="1" fill-rule="evenodd"/></g><g clip-path="url(#annDr7472)"><path d="M 412.632812 829.5 C 405.089844 829.5 398.972656 823.386719 398.972656 815.84375 L 398.972656 659.933594 C 398.972656 652.390625 405.089844 646.277344 412.632812 646.277344 L 563.46875 646.277344 C 571.011719 646.277344 577.128906 652.390625 577.128906 659.933594 C 577.128906 667.472656 571.011719 673.585938 563.46875 673.585938 L 426.492188 673.585938 L 426.492188 815.84375 C 426.289062 823.386719 420.171875 829.5 412.632812 829.5 Z M 412.632812 829.5 " fill-opacity="1" fill-rule="evenodd"/></g><g clip-path="url(#annDr6e62)"><path d="M 545.941406 406.800781 L 528.003906 474.671875 L 602.8125 457.753906 L 868.003906 190.152344 C 875.136719 183.019531 878.804688 173.644531 878.804688 163.660156 C 878.804688 153.671875 874.730469 144.296875 867.59375 137.164062 C 853.121094 122.898438 829.679688 122.898438 815.207031 137.367188 Z M 509.046875 506.667969 C 505.375 506.667969 501.707031 505.242188 499.261719 502.386719 C 496 498.921875 494.574219 494.03125 495.796875 489.34375 L 520.460938 396 C 521.070312 393.757812 522.296875 391.515625 523.925781 389.886719 L 795.84375 117.800781 C 820.914062 92.734375 861.683594 92.527344 886.957031 117.394531 C 899.394531 129.621094 906.121094 145.925781 906.324219 163.25 C 906.527344 180.574219 899.800781 196.878906 887.570312 209.3125 L 619.523438 479.765625 C 617.691406 481.597656 615.246094 483.027344 612.796875 483.433594 L 512.101562 506.464844 C 511.085938 506.667969 510.066406 506.667969 509.046875 506.667969 Z M 509.046875 506.667969 " fill-opacity="1" fill-rule="evenodd"/></g><path d="M 853.734375 237.640625 C 850.269531 237.640625 846.804688 236.417969 844.152344 233.769531 L 770.773438 163.046875 C 765.269531 157.746094 765.066406 149.1875 770.363281 143.683594 C 775.664062 138.183594 784.226562 137.976562 789.730469 143.277344 L 863.109375 214.203125 C 868.613281 219.5 868.816406 228.0625 863.519531 233.566406 C 860.867188 236.214844 857.402344 237.640625 853.734375 237.640625 Z M 853.734375 237.640625 " fill-opacity="1" fill-rule="evenodd"/><path d="M 609.742188 483.839844 C 606.480469 483.839844 603.015625 482.617188 600.363281 480.171875 L 524.332031 409.859375 C 518.828125 404.765625 518.421875 396 523.519531 390.496094 C 528.613281 384.996094 537.378906 384.585938 542.882812 389.683594 L 618.914062 460.199219 C 624.417969 465.292969 624.824219 474.058594 619.730469 479.5625 C 617.078125 482.414062 613.410156 483.839844 609.742188 483.839844 Z M 609.742188 483.839844 " fill-opacity="1" fill-rule="evenodd"/><path d="M 455.234375 139.8125 L 117.476562 139.8125 C 109.933594 139.8125 103.820312 133.699219 103.820312 126.15625 C 103.820312 118.617188 109.933594 112.503906 117.476562 112.503906 L 455.234375 112.503906 C 462.773438 112.503906 468.890625 118.617188 468.890625 126.15625 C 468.890625 133.699219 462.773438 139.8125 455.234375 139.8125 Z M 455.234375 139.8125 " fill-opacity="1" fill-rule="evenodd"/><path d="M 455.234375 240.492188 L 117.476562 240.492188 C 109.933594 240.492188 103.820312 234.378906 103.820312 226.839844 C 103.820312 219.296875 109.933594 213.183594 117.476562 213.183594 L 455.234375 213.183594 C 462.773438 213.183594 468.890625 219.296875 468.890625 226.839844 C 468.890625 234.378906 462.773438 240.492188 455.234375 240.492188 Z M 455.234375 240.492188 " fill-opacity="1" fill-rule="evenodd"/><path d="M 455.234375 337.507812 L 117.476562 337.507812 C 109.933594 337.507812 103.820312 331.394531 103.820312 323.851562 C 103.820312 316.3125 109.933594 310.195312 117.476562 310.195312 L 455.234375 310.195312 C 462.773438 310.195312 468.890625 316.3125 468.890625 323.851562 C 468.890625 331.394531 462.773438 337.507812 455.234375 337.507812 Z M 455.234375 337.507812 " fill-opacity="1" fill-rule="evenodd"/><path d="M 455.234375 438.1875 L 117.476562 438.1875 C 109.933594 438.1875 103.820312 432.074219 103.820312 424.53125 C 103.820312 416.992188 109.933594 410.878906 117.476562 410.878906 L 455.234375 410.878906 C 462.773438 410.878906 468.890625 416.992188 468.890625 424.53125 C 468.890625 432.074219 462.773438 438.1875 455.234375 438.1875 Z M 455.234375 438.1875 " fill-opacity="1" fill-rule="evenodd"/><path d="M 351.683594 538.871094 L 117.476562 538.871094 C 109.933594 538.871094 103.820312 532.753906 103.820312 525.214844 C 103.820312 517.671875 109.933594 511.558594 117.476562 511.558594 L 351.683594 511.558594 C 359.226562 511.558594 365.339844 517.671875 365.339844 525.214844 C 365.339844 532.753906 359.226562 538.871094 351.683594 538.871094 Z M 351.683594 538.871094 " fill-opacity="1" fill-rule="evenodd"/></svg>';
// Megaphone under the window title (user's own icons, 2026-11-06): A = design-3 (in use), B = design-4 (spare).
var ANN_MEGAPHONE_ICON = '<svg class="win-icon" viewBox="0 0 245.25 195.000001" fill="currentColor" aria-hidden="true"><defs><clipPath id="annMeg3"><path d="M 209 104 L 243.503906 104 L 243.503906 119 L 209 119 Z M 209 104 " clip-rule="nonzero"/></clipPath></defs><path fill="currentColor" d="M 180.597656 70.90625 C 172.503906 37.449219 156.671875 1.445312 141.03125 1.445312 C 140.257812 1.445312 139.484375 1.535156 138.738281 1.714844 C 135.328125 2.535156 132.617188 5.132812 130.625 9.34375 C 130.414062 9.511719 130.179688 9.640625 130.003906 9.863281 C 121.25 21.050781 89.894531 57.996094 54.121094 66.636719 L 26.789062 73.683594 C 26.683594 73.707031 26.574219 73.742188 26.46875 73.773438 C 18.097656 76.074219 11.027344 81.339844 6.476562 88.6875 C 1.714844 96.382812 0.269531 105.472656 2.402344 114.289062 C 4.539062 123.109375 9.980469 130.535156 17.726562 135.207031 C 25.441406 139.855469 34.5625 141.238281 43.402344 139.105469 L 49.070312 137.738281 C 49.070312 137.738281 49.074219 137.738281 49.074219 137.738281 L 49.078125 137.738281 L 55.894531 136.089844 L 78.511719 182.53125 C 81.457031 188.574219 87.527344 192.09375 93.84375 192.09375 C 96.339844 192.09375 98.875 191.546875 101.265625 190.382812 C 109.703125 186.273438 113.226562 176.074219 109.117188 167.644531 L 90.832031 130.09375 C 123.480469 129.820312 156.824219 144.984375 164.445312 148.675781 C 167.171875 150.707031 169.9375 151.832031 172.695312 151.832031 C 173.46875 151.832031 174.242188 151.742188 174.984375 151.5625 C 182.203125 149.816406 186.355469 140.222656 186.988281 123.816406 C 187.554688 109.085938 185.285156 90.292969 180.597656 70.90625 Z M 41.699219 132.078125 C 34.726562 133.765625 27.539062 132.675781 21.464844 129.011719 C 15.386719 125.351562 11.109375 119.515625 9.4375 112.589844 C 7.761719 105.664062 8.894531 98.519531 12.632812 92.484375 C 16.3125 86.53125 22.113281 82.304688 28.976562 80.578125 L 31.386719 79.996094 L 43.855469 131.554688 Z M 98.097656 183.878906 C 93.25 186.238281 87.375 184.214844 85.019531 179.367188 L 76.808594 162.515625 L 94.648438 154.460938 L 102.609375 170.8125 C 104.972656 175.65625 102.949219 181.519531 98.097656 183.878906 Z M 91.480469 147.957031 L 73.644531 156.007812 L 63.097656 134.351562 L 71.476562 132.328125 C 75.234375 131.421875 79.082031 130.824219 82.964844 130.472656 Z M 69.773438 125.300781 L 50.890625 129.859375 L 38.417969 78.292969 L 55.828125 74.082031 C 85.910156 66.816406 112.652344 41.070312 127.039062 24.847656 C 126.910156 26.324219 126.804688 27.851562 126.742188 29.457031 C 126.441406 37.128906 126.933594 45.914062 128.117188 55.296875 C 128.136719 55.433594 128.101562 55.558594 128.132812 55.695312 C 128.144531 55.742188 128.175781 55.773438 128.1875 55.816406 C 129.28125 64.300781 130.925781 73.261719 133.132812 82.371094 C 135.292969 91.304688 138.007812 100.414062 141.121094 108.972656 C 141.136719 109.144531 141.097656 109.304688 141.136719 109.472656 C 141.257812 109.964844 141.492188 110.386719 141.777344 110.765625 C 145.351562 120.328125 149.421875 129.101562 153.769531 136.078125 C 134.308594 128.363281 100.039062 117.984375 69.773438 125.300781 Z M 135.855469 58.488281 C 141.308594 59.988281 147.78125 67.425781 150.519531 78.75 C 153.238281 90 150.933594 99.511719 146.8125 103.386719 C 144.445312 96.585938 142.183594 89.027344 140.164062 80.671875 C 138.332031 73.089844 136.898438 65.632812 135.855469 58.488281 Z M 179.757812 123.539062 C 179.234375 137.085938 176.128906 143.84375 173.285156 144.53125 C 173.09375 144.578125 172.902344 144.597656 172.695312 144.597656 C 172.054688 144.597656 171.34375 144.402344 170.566406 144.019531 C 170.265625 143.640625 169.886719 143.3125 169.425781 143.074219 C 169.277344 142.996094 168.886719 142.792969 168.304688 142.503906 C 163.066406 138.1875 156 127.273438 149.433594 110.488281 C 157.589844 105.484375 161.144531 91.886719 157.554688 77.046875 C 153.945312 62.125 144.519531 51.605469 134.902344 50.980469 C 134.066406 43.292969 133.722656 36.09375 133.96875 29.734375 C 134.492188 16.183594 137.59375 9.429688 140.441406 8.742188 C 140.628906 8.695312 140.824219 8.675781 141.03125 8.675781 C 148.007812 8.675781 163.609375 31.441406 173.5625 72.605469 C 178.101562 91.363281 180.300781 109.453125 179.757812 123.539062 Z M 179.757812 123.539062 " fill-opacity="1" fill-rule="nonzero"/><path fill="currentColor" d="M 208.230469 68.675781 C 206.632812 68.640625 205.195312 67.542969 204.796875 65.917969 C 204.320312 63.980469 205.507812 62.019531 207.449219 61.546875 L 231.089844 55.75 C 233.027344 55.269531 234.988281 56.460938 235.464844 58.398438 C 235.941406 60.339844 234.75 62.296875 232.8125 62.773438 L 209.171875 68.570312 C 208.855469 68.644531 208.539062 68.683594 208.230469 68.675781 Z M 208.230469 68.675781 " fill-opacity="1" fill-rule="nonzero"/><path fill="currentColor" d="M 190.320312 29.164062 C 189.351562 29.121094 188.402344 28.691406 187.722656 27.894531 C 186.425781 26.371094 186.613281 24.089844 188.136719 22.796875 L 209.453125 4.679688 C 210.972656 3.386719 213.261719 3.570312 214.550781 5.089844 C 215.847656 6.609375 215.660156 8.894531 214.140625 10.1875 L 192.824219 28.304688 C 192.097656 28.921875 191.203125 29.203125 190.320312 29.164062 Z M 190.320312 29.164062 " fill-opacity="1" fill-rule="nonzero"/><g clip-path="url(#annMeg3)"><path fill="currentColor" d="M 240.058594 118.414062 C 239.582031 118.492188 239.078125 118.484375 238.574219 118.355469 L 212.371094 111.886719 C 210.425781 111.410156 209.246094 109.449219 209.726562 107.511719 C 210.199219 105.574219 212.15625 104.382812 214.101562 104.871094 L 240.308594 111.339844 C 242.253906 111.820312 243.433594 113.777344 242.953125 115.714844 C 242.601562 117.152344 241.429688 118.175781 240.058594 118.414062 Z M 240.058594 118.414062 " fill-opacity="1" fill-rule="nonzero"/></g></svg>';
var ANN_MEGAPHONE_ICON_B = '<svg class="win-icon" viewBox="0 0 245.25 198.749995" fill="currentColor" aria-hidden="true"><defs><clipPath id="annMeg4"><path d="M 1 0.179688 L 193 0.179688 L 193 197.574219 L 1 197.574219 Z M 1 0.179688 " clip-rule="nonzero"/></clipPath></defs><g clip-path="url(#annMeg4)"><path fill="currentColor" d="M 160.023438 3.421875 C 157.210938 1.015625 154.015625 -0.0859375 150.777344 0.234375 C 147.390625 0.570312 144.167969 2.496094 141.699219 5.652344 C 121.308594 31.742188 97.871094 49.523438 72.03125 58.496094 C 62.929688 61.660156 53.578125 63.472656 44.539062 65.222656 C 39.417969 66.214844 34.125 67.242188 28.902344 68.5 C 21.835938 70.210938 17.316406 74.679688 15.472656 81.777344 C 8.054688 83.5625 2.992188 89.058594 1.574219 96.882812 C 0.226562 104.339844 1.679688 111.898438 5.894531 119.34375 C 9.972656 126.539062 16.753906 129.691406 24.511719 128.027344 C 25.984375 131.945312 29.660156 133.09375 32.914062 134.109375 C 34.960938 134.75 36.902344 135.355469 38.222656 136.546875 C 43.902344 141.683594 48.007812 153.421875 51.972656 164.777344 C 57.613281 180.917969 63.425781 197.558594 74.15625 197.558594 C 75.238281 197.558594 76.371094 197.390625 77.5625 197.03125 C 87.667969 193.992188 99.488281 188.144531 98.765625 177.480469 L 98.773438 177.480469 L 98.746094 177.152344 C 98.4375 173.792969 96.269531 171.984375 93.753906 169.886719 C 93.027344 169.28125 92.277344 168.652344 91.535156 167.960938 C 88.136719 164.769531 86.367188 159.515625 84.804688 154.878906 C 84.480469 153.917969 84.164062 152.980469 83.84375 152.085938 C 87.640625 150.894531 90.523438 148.835938 91.777344 146.417969 C 92.613281 144.804688 92.726562 143.074219 92.121094 141.285156 C 91.347656 138.992188 90.046875 136.90625 88.792969 134.890625 C 87.285156 132.46875 85.726562 129.964844 85.050781 127.074219 C 113.445312 123.792969 149.773438 135.6875 171.59375 148.160156 C 174.113281 149.597656 176.898438 149.925781 179.648438 149.109375 C 182.945312 148.132812 185.941406 145.539062 187.671875 142.167969 C 192.230469 133.285156 192.917969 123.925781 192.976562 115.132812 C 193.1875 84.199219 187.082031 53.652344 174.832031 24.347656 C 171.269531 15.824219 166.285156 8.785156 160.023438 3.421875 Z M 166.328125 85.710938 C 161.707031 80.308594 160.226562 72.164062 162.417969 64.203125 C 167.550781 70.886719 168.898438 78.304688 166.328125 85.710938 Z M 156.261719 63.277344 C 154.570312 72.90625 156.125 81.5 161.003906 89.523438 C 158.539062 91.707031 155.71875 93.085938 151.667969 94.09375 C 148.359375 82.191406 146.335938 71.957031 145.324219 61.941406 C 149.273438 61.378906 152.859375 61.816406 156.261719 63.277344 Z M 161.121094 98.117188 C 164.363281 96.570312 167.421875 95.113281 170.1875 92.6875 C 173.695312 89.617188 175.28125 82.925781 174.324219 75.226562 C 173.257812 66.683594 169.441406 59.570312 164.59375 57.097656 C 160.644531 55.085938 156.445312 54.898438 151.992188 54.707031 C 149.496094 54.597656 146.921875 54.484375 144.320312 54.035156 C 143.230469 44.78125 142.078125 12.488281 150.414062 8.867188 C 151.40625 8.433594 152.5 8.46875 153.664062 8.960938 C 160.210938 11.730469 167.472656 27.796875 169.714844 33.753906 C 181.683594 65.488281 186.472656 96.21875 183.949219 125.09375 C 183.449219 130.808594 182.335938 137.71875 178.128906 140.472656 C 177.035156 141.191406 175.863281 141.28125 174.542969 140.742188 C 165.792969 137.203125 155.378906 108.863281 153.769531 102.09375 C 156.222656 100.449219 158.714844 99.261719 161.121094 98.117188 Z M 42.183594 126.902344 C 37.132812 127.917969 32.863281 125.933594 30.164062 121.277344 C 24.164062 110.355469 21.730469 97.457031 23.300781 85.003906 C 24.222656 81.613281 25.554688 78.308594 29 77.097656 L 65.234375 69.328125 C 63.539062 85.667969 67.207031 102.613281 76.144531 119.71875 L 42.292969 126.875 Z M 156.554688 131.691406 C 134.992188 122.679688 113.832031 118.261719 92.132812 118.261719 C 89.570312 118.261719 86.996094 118.320312 84.417969 118.445312 C 74.453125 103.09375 70.558594 85.902344 72.832031 67.347656 C 96.398438 59.074219 117.429688 45.136719 135.351562 25.917969 C 134.375 40.859375 135.242188 54.714844 138.148438 70.699219 C 141.179688 92.003906 147.03125 111.40625 156.550781 131.691406 Z M 78.226562 137.039062 C 78.125 136.316406 78.027344 135.605469 77.902344 134.917969 C 77.902344 134.917969 77.902344 134.667969 77.902344 134.667969 C 77.90625 133.605469 77.960938 132.453125 78.757812 131.898438 C 79.25 134.371094 80.488281 136.390625 81.707031 138.332031 C 82.6875 139.890625 83.613281 141.363281 84.113281 142.972656 C 84.15625 143.25 83.601562 143.753906 82.59375 144.117188 C 81.507812 144.503906 80.445312 144.523438 80.234375 144.15625 C 78.90625 141.898438 78.558594 139.429688 78.226562 137.042969 Z M 68.710938 129.53125 C 69.898438 141.632812 74.140625 152.011719 79.144531 163.351562 L 79.304688 163.71875 C 81.488281 168.671875 83.394531 172.992188 88.105469 175.949219 L 88.03125 175.949219 L 89.066406 176.507812 C 90.390625 177.234375 90.902344 178.121094 90.625 179.230469 C 89.574219 183.453125 77.964844 189.085938 74.21875 189.128906 L 74.1875 189.128906 C 71.199219 189.128906 69.144531 184.757812 67.914062 182.144531 L 67.867188 182.039062 C 64.761719 175.4375 62.28125 168.660156 59.882812 162.097656 C 56.539062 152.949219 53.082031 143.484375 47.90625 134.5625 L 68.707031 129.535156 Z M 20.265625 119.933594 C 17.367188 120.738281 15.054688 118.433594 13.910156 116.953125 C 10.21875 112.171875 7.542969 103.324219 9.457031 96.792969 C 10.34375 93.773438 12.097656 91.710938 14.675781 90.65625 C 14.773438 99.757812 15.558594 109.59375 20.265625 119.933594 Z M 20.265625 119.933594 " fill-opacity="1" fill-rule="nonzero"/></g><path fill="currentColor" d="M 242.507812 57.097656 C 242.136719 56.140625 240.457031 54.476562 238.742188 54.863281 L 204.769531 62.453125 C 204 62.625 203.378906 63.054688 202.972656 63.699219 C 202.4375 64.542969 202.40625 65.507812 202.535156 66.078125 C 202.816406 67.304688 204.328125 68.492188 205.984375 68.492188 C 206.230469 68.492188 206.472656 68.464844 206.71875 68.414062 L 239.769531 61.101562 C 240.839844 60.863281 241.746094 60.179688 242.261719 59.222656 C 242.652344 58.496094 242.746094 57.722656 242.507812 57.097656 Z M 242.507812 57.097656 " fill-opacity="1" fill-rule="nonzero"/><path fill="currentColor" d="M 239.398438 105.210938 L 207.773438 94.367188 C 206.746094 94.015625 205.671875 94.109375 204.8125 94.625 C 204.160156 95.015625 203.726562 95.617188 203.621094 96.269531 C 203.382812 97.753906 204.0625 99.578125 205.824219 100.179688 L 237.148438 110.945312 C 237.5 111.0625 237.84375 111.125 238.183594 111.125 C 238.65625 111.125 239.113281 111.003906 239.53125 110.773438 C 240.351562 110.320312 240.867188 109.527344 240.992188 108.980469 C 241.191406 108.128906 241.011719 105.765625 239.394531 105.214844 Z M 239.398438 105.210938 " fill-opacity="1" fill-rule="nonzero"/><path fill="currentColor" d="M 221.75 12.074219 C 221.671875 11.269531 221.359375 10.628906 220.921875 10.355469 C 220.167969 9.882812 217.828125 9.378906 216.796875 10.320312 L 192.15625 32.859375 C 191.582031 33.386719 191.347656 34.175781 191.496094 35.078125 C 191.671875 36.140625 192.355469 37.179688 193.082031 37.496094 C 193.621094 37.730469 194.152344 37.847656 194.671875 37.847656 C 195.539062 37.847656 196.359375 37.515625 197.058594 36.863281 L 220.945312 14.632812 C 221.65625 13.96875 221.828125 12.875 221.75 12.074219 Z M 221.75 12.074219 " fill-opacity="1" fill-rule="nonzero"/></svg>';
// [Student] is each student's first name (user, 2026-11-05: tried [], [Student] reads clearer). [] works too;
// the backend only knows [Student], so [] is turned into it on send.
var ANN_NAME_RE = /\[\s*(Student|First)?\s*\]/gi;
var ANN_NUDGE_TEXT = "Hi [Student]! Quick follow-up on my text above. Please reply Y to confirm. Thanks!";

var annData = null;       // last getAnnouncements answer
var annOpenId = null;     // the announcement whose table is open (null = newest)

// The button sits in the Comms title row, left of Others. Comms builds that row
// itself, so this waits for it instead of editing comms.js.
setInterval(function () {
  var oth = document.getElementById("commsOthersBtn");
  if (!oth || document.getElementById("commsAnnBtn")) return;
  var b = document.createElement("button");
  b.className = "link-btn cm-ann-btn";
  b.id = "commsAnnBtn";
  b.textContent = "Announcements";
  b.setAttribute("data-tip", "Opens a window.\nText all students at once, see who confirmed.");
  b.setAttribute("data-tip-wrap", "");
  b.onclick = function () { annOpen(); };
  oth.parentNode.insertBefore(b, oth);
}, 700);

function annEsc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function annFirst(n) { return String(n || "").trim().split(/\s+/)[0] || ""; }

// ── Cost: plain (GSM-7) texts fit 160 characters, 153 per piece when longer;
//    one character outside that alphabet makes the whole text Unicode (70 / 67).
var ANN_GSM = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
var ANN_GSM_EXT = "^{}\\[~]|€";   // allowed, but count as 2
function annCost(text) {
  var bad = [], len = 0;
  Array.from(text).forEach(function (c) {
    if (ANN_GSM.indexOf(c) >= 0) len += 1;
    else if (ANN_GSM_EXT.indexOf(c) >= 0) len += 2;
    else if (bad.indexOf(c) < 0) bad.push(c);
  });
  if (bad.length) { len = Array.from(text).length; return { len: len, pieces: len <= 70 ? 1 : Math.ceil(len / 67), bad: bad }; }
  return { len: len, pieces: len <= 160 ? 1 : Math.ceil(len / 153), bad: [] };
}

// ── The window ───────────────────────────────────────────────────────────────
function annWin() {
  var w = document.getElementById("annOverlay");
  if (w) return w;
  w = document.createElement("div");
  w.className = "im-notes-back cm-win-back";
  w.id = "annOverlay";
  w.onclick = function (e) { if (e.target === w) annClose(); };
  w.innerHTML = '<div class="td-student cm-win ann-win"><div class="settings-title im-title"><span id="annTitle">Announcements</span>' +
    // No page switch in the title: the rack has its own Announcements and Confirmations buttons (user, 2026-11-06).
    '<span class="cm-oth-acts"><button class="settings-close" onclick="annClose()">✕</button></span></div>' +
    // The portal's window top: red name · grey part (No show's look); the megaphone under it (user, 2026-11-06).
    '<div class="ann-win-icon">' + ANN_MEGAPHONE_ICON + '</div>' +
    '<div id="annBody"></div></div>';
  document.body.appendChild(w);
  return w;
}
function annClose() { var w = document.getElementById("annOverlay"); if (w) w.classList.remove("open"); }
document.addEventListener("keydown", function (e) {
  var w = document.getElementById("annOverlay");
  if (e.key === "Escape" && w && w.classList.contains("open") && !document.querySelector(".rpm-dlg-overlay")) annClose();
});

// Opens on New announcement; Confirmations is its own button (user, 2026-11-05).
var annView = "new";
function annOpen() {
  annWin().classList.add("open");
  annView = "new";
  annData = null;   // fresh roster + table each time; LOADING until it lands
  annLoad();
}
// Confirmations button on the rack: the same window, straight on the table (user, 2026-11-06).
function annOpenConf() {
  annWin().classList.add("open");
  annView = "list";
  annOpenId = null;
  annData = null;
  annLoad();
}
function annHeadBtns() {}   // the title row used to switch pages; the rack does it now

function annLoad() {
  var body = document.getElementById("annBody"), url = getScriptUrl();
  if (!body || !url) return;
  if (!annData) body.innerHTML = '<div class="empty-state rpm-loading">Loading</div>';
  fetch(url + "?action=getAnnouncements")
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d || !d.success) { body.innerHTML = '<div class="empty-state">' + annEsc((d && d.message) || "Could not load") + '</div>'; return; }
      annData = d;
      if (annView === "new") { annView = ""; annCompose(); }
      else annRenderList();
    })
    .catch(function () { body.innerHTML = '<div class="empty-state">Connection failed</div>'; });
}

// ── The list: newest announcement open, older ones one line each ─────────────
function annWhen(ts) {
  var d = new Date(String(ts).replace(" ", "T"));
  if (isNaN(d)) return String(ts || "");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ", " +
         d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function annTag(s) {
  var tag = function (c, t) { return "<span class='ts-tag' style='color:" + c + "'>" + t + "</span>"; };
  if (s.state === "confirmed") return tag("var(--green)", "Confirmed");
  if (s.state === "reply")     return tag("var(--warn)", "Needs reply");
  if (s.state === "failed")    return tag("#ff5a4d", "Not delivered");
  return tag("var(--muted)", "Awaiting");
}
var ANN_RANK = { reply: 0, failed: 1, waiting: 2, confirmed: 3 };

function annRenderList() {
  var body = document.getElementById("annBody");
  document.getElementById("annTitle").innerHTML = "Announcements<span class='win-sub'> · Confirmations</span>";
  annHeadBtns(true);
  var list = (annData && annData.announcements) || [];
  if (!list.length) { body.innerHTML = '<div class="empty-state">None</div>'; return; }
  var open = annOpenId || list[0].id;
  body.innerHTML = "";
  var cur = list.filter(function (a) { return a.id === open; })[0] || list[0];
  var card = annCard(cur);
  // The others sit under the buttons, above the student rows, so they're seen without scrolling (user, 2026-11-05).
  var others = list.filter(function (a) { return a !== cur; });
  if (others.length) {
    var slot = card.querySelector(".ann-others");
    slot.innerHTML = "<div class='ann-others-t'>Other announcements</div>";
    others.forEach(function (a) { slot.appendChild(annPastRow(a)); });
    slot.hidden = false;
  }
  body.appendChild(card);
}

function annPastRow(a) {
  var r = document.createElement("div");
  r.className = "ann-past";
  r.innerHTML = "<span class='ann-past-when'>" + annEsc(annWhen(a.sentAt)) + "</span>" +
    "<span class='ann-past-text'>" + annEsc(String(a.template || "").split("\n")[0]) + "</span>" +
    "<span class='ann-past-n'>" + a.confirmed + " / " + a.students.length + "</span>";
  r.setAttribute("data-tip", "Instant.\nShows who confirmed this one.");
  r.onclick = function () { annOpenId = a.id; annRenderList(); };
  return r;
}

function annCard(a) {
  var wrap = document.createElement("div");
  wrap.className = "ann-card";
  var waiting = a.students.filter(function (s) { return s.state === "waiting"; });
  wrap.innerHTML =
    "<div class='db-cx-head im-sec-head im-main-head tv-sec-head ts-sec-head'><label class='field-label db-cx-t im-main-t'>Confirmations</label></div>" +
    "<div class='tv-sec-note tv-steps ts-steps'>" +
      "<span><i>1.</i>Sent " + annEsc(annWhen(a.sentAt)) + " to " + a.students.length + " students</span>" +
      "<span class='ts-sub'><i>-</i>A Y back (or a 👍) confirms by itself</span>" +
      "<span class='ts-sub'><i>-</i>Needs reply: they wrote something else, answer it</span>" +
      "<span><i>2.</i>No answer yet: Nudge texts only the ones awaiting</span></div>" +
    "<div class='ann-acts'><button class='link-btn' data-a='text' data-tip='Instant.\nThe text that went out.'>Show text</button>" +
      "<button class='link-btn amber' data-a='nudge'" + (waiting.length ? " data-tip='Opens the Nudge draft.\nOnly the ones awaiting get it.' data-tip-wrap" : " disabled data-tip='Locked.\nNobody is awaiting.' data-tip-wrap") + ">Nudge " +
      (waiting.length ? waiting.length + " awaiting" : "") + "</button></div>" +
    "<div class='ann-textbox' hidden>" + annEsc(String(a.template || "").replace(ANN_NAME_RE, "[Student]")) + "</div>" +
    "<div class='ann-others' hidden></div>" +
    "<hr class='divider ts-rule'>" +
    "<div class='ts-trip-dates'>" + a.confirmed + " / " + a.students.length + " confirmed</div>";
  var list = document.createElement("div");
  a.students.slice().sort(function (x, y) { return (ANN_RANK[x.state] - ANN_RANK[y.state]) || x.name.localeCompare(y.name); })
    .forEach(function (s) {
      var r = document.createElement("div");
      r.className = "ts-row ann-row " + (s.state === "confirmed" ? "ts-row-ok" : s.state === "reply" ? "ts-row-reply" : s.state === "failed" ? "ann-row-bad" : "ts-row-wait");
      var sub = s.state === "reply" ? "“" + s.reply + "”" : s.state === "confirmed" ? annWhen(s.confirmedAt) : (s.nudges ? "Nudged " + annWhen(s.lastNudge) : "");
      r.innerHTML = "<span class='ann-row-l'><span class='ts-row-name'>" + annEsc(s.name) + "</span>" +
        (sub ? "<span class='ann-row-sub'>" + annEsc(sub) + "</span>" : "") + "</span>" + annTag(s);
      r.setAttribute("data-tip", "Opens their conversation.");
      r.onclick = function () { annOpenConversation(s.name); };
      list.appendChild(r);
    });
  wrap.appendChild(list);
  wrap.querySelector("[data-a='text']").onclick = function () {
    var t = wrap.querySelector(".ann-textbox"); t.hidden = !t.hidden;
    this.textContent = t.hidden ? "Show text" : "Hide text";
  };
  var nb = wrap.querySelector("[data-a='nudge']");
  if (waiting.length) nb.onclick = function () { annCompose({ nudge: a, names: waiting.map(function (s) { return s.name; }) }); };
  return wrap;
}

function annOpenConversation(name) {
  annClose();
  if (typeof commsStudents === "undefined") return;
  var s = commsStudents.filter(function (x) { return x.name === name; })[0];
  if (!s) return;
  var k = commsKey(s.number);
  var last = commsMessages.filter(function (m) { return commsKey(m.fromNumber) === k; })
    .sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); })[0];
  commsPaneOpen(last || { row: 0, source: "sms", fromNumber: s.number, fromName: s.name, student: s.name, responded: true, blank: true });
}

// ── Compose: a new announcement, or a nudge for one ──────────────────────────
// opts.nudge = the announcement being nudged; opts.names = who gets the nudge.
function annCompose(opts) {
  opts = opts || {};
  var body = document.getElementById("annBody");
  var nudge = opts.nudge || null;
  document.getElementById("annTitle").innerHTML = nudge ? "Announcements<span class='win-sub'> · Nudge</span>" : "Announcements<span class='win-sub'> · Send mass text</span>";
  annHeadBtns(false);
  // The test number is gone from the list (user, 2026-11-06).
  var everyone = ((annData && annData.students) || []).filter(function (n) { return !/\(test\)/i.test(n); });
  var names = nudge ? opts.names : everyone;
  var on = {};
  names.forEach(function (n) { on[n] = !/\(test\)/i.test(n) || !!nudge; });   // the test number starts unticked

  body.innerHTML =
    "<div class='db-cx-head im-sec-head im-main-head tv-sec-head ts-sec-head'><label class='field-label db-cx-t im-main-t'>" + (nudge ? "Nudge draft" : "Draft") + "</label></div>" +
    // Numbered steps like Confirmations' (user, 2026-11-06).
    "<div class='tv-sec-note tv-steps ts-steps'><span><i>1.</i>Draft your message</span><span><i>2.</i>Pick the person</span><span><i>3.</i>Send</span></div>" +
    // Greeting picked here, written in by itself (user, 2026-11-06): each student's name, everyone, or none.
    "<div class='ann-greet' id='annGreet'>" +
      "<span class='db-check' data-g='name' role='radio' tabindex='0' data-tip='Instant.\nOpens with Hi and each first name.'><i class='db-box'></i><span>Hi <mark class='ann-mark'>NAME</mark>!</span></span>" +
      "<span class='db-check' data-g='all' role='radio' tabindex='0' data-tip='Instant.\nOpens with Hi everyone!'><i class='db-box'></i>Hi everyone!</span>" +
      "<span class='db-check' data-g='none' role='radio' tabindex='0' data-tip='Instant.\nNo greeting line.'><i class='db-box'></i>No greeting</span></div>" +
    // One box: you type straight into the blue bubble, my-text blue (user, 2026-11-06; Preview section gone).
    // Just the framed bubble: you type in it, it grows, the greeting on top with a real first name (user, 2026-11-06).
    "<div class='ts-thread tv-rv-thread ann-thread'><div class='ts-bub tv-rv-bub ann-bub'><div class='ann-greet-line' id='annGreetLine'></div>" +
    "<div class='ann-hl-wrap'><div class='ann-hl' id='annHl' aria-hidden='true'></div>" +
    "<textarea class='cm-reply ann-text' id='annText' rows='1' placeholder='Type your message'></textarea></div></div></div>" +
    "<div class='ann-cost' id='annCost'></div>" +
    "<div class='db-cx-head im-sec-head im-main-head tv-sec-head ts-sec-head ann-to-head'><label class='field-label db-cx-t im-main-t'>To</label>" +
      "<span class='ann-to-acts'><button class='link-btn' data-all='1' data-tip='Instant.\nTicks every student.' data-tip-left>All</button><button class='link-btn' data-all='0' data-tip='Instant.\nUnticks everyone.' data-tip-left>None</button></span></div>" +
    "<div class='ann-to' id='annTo'></div>" +
    "<div class='ann-foot'>" + (nudge ? "<button class='link-btn' id='annBack' data-tip='Instant.\nBack to Confirmations, nothing sent.'>Back</button>" : "<span></span>") +
      "<button class='link-btn red' id='annSend' data-tip='Opens a window.\nWarning first, then the texts go out.' data-tip-wrap data-tip-left>Send</button></div>";
  var ta = document.getElementById("annText");
  // Once the default text has gone out, the next announcement starts blank (user, 2026-11-05).
  var annNorm = function (t) { return String(t || "").replace(ANN_NAME_RE, "[Student]").trim(); };
  var defaultSent = ((annData && annData.announcements) || []).some(function (a) { return annNorm(a.template) === annNorm(ANN_DEFAULT_TEXT); });
  // The greeting lives in the picker, so the box holds only the rest: a "Hi [Student]!" opening is lifted out.
  var greet = "name", start = nudge ? ANN_NUDGE_TEXT : (defaultSent ? "" : ANN_DEFAULT_TEXT);
  var GREET_RE = /^\s*Hi\s*(\[\s*(Student|First)?\s*\]|everyone)\s*!\s*/i, gm = start.match(GREET_RE);
  if (gm) { greet = /everyone/i.test(gm[1]) ? "all" : "name"; start = start.replace(GREET_RE, ""); }
  ta.value = start;
  var greetText = function () { return greet === "name" ? "Hi [Student]!" : greet === "all" ? "Hi everyone!" : ""; };
  var fullText = function () { var g = greetText(), b = ta.value.trim(); return g && b ? g + "\n\n" + b : (g || b); };
  var paintGreet = function () {
    body.querySelectorAll("#annGreet .db-check").forEach(function (el) { el.classList.toggle("on", el.dataset.g === greet); el.setAttribute("aria-checked", el.dataset.g === greet); });
  };
  body.querySelectorAll("#annGreet .db-check").forEach(function (el) {
    var pick = function () { greet = el.dataset.g; paintGreet(); paint(); ta.focus(); };
    el.onclick = pick;
    el.onkeydown = function (e) { if (e.key === " " || e.key === "Enter") { e.preventDefault(); pick(); } };
  });
  var to = document.getElementById("annTo");
  to.innerHTML = names.map(function (n, i) {
    return "<span class='db-check" + (on[n] ? " on" : "") + "' data-i='" + i + "' role='checkbox' tabindex='0'><i class='db-box'></i>" + annEsc(n) + "</span>";
  }).join("");
  var count = function () { return names.filter(function (n) { return on[n]; }).length; };
  var hl = document.getElementById("annHl");
  var paintHl = function () {
    hl.innerHTML = annEsc(ta.value).replace(ANN_NAME_RE, function (m) { return "<mark>" + m + "</mark>"; }) + "\n";
    hl.scrollTop = ta.scrollTop;
  };
  ta.addEventListener("scroll", function () { hl.scrollTop = ta.scrollTop; });
  var paint = function () {
    paintHl();
    var c = annCost(fullText().replace(ANN_NAME_RE, "Christian")), n = count();
    document.getElementById("annCost").innerHTML =
      c.len + " characters · " + c.pieces + " text" + (c.pieces > 1 ? "s" : "") + " each · " + n + " student" + (n === 1 ? "" : "s") +
      " · about $" + (c.pieces * n * 0.011).toFixed(2) +
      (c.bad.length ? "<br><span class='ann-bad'>" + annEsc(c.bad.join(" ")) + " makes it cost about 2.5× more. Use - * ' \" instead.</span>" : "");
    // The greeting shows as sent: a ticked student's first name, else the first student's.
    var first = names.filter(function (x) { return on[x]; })[0] || names[0] || "";
    var gl = document.getElementById("annGreetLine");
    gl.textContent = greet === "name" ? "Hi " + (annFirst(first) || "name") + "!" : greet === "all" ? "Hi everyone!" : "";
    gl.hidden = greet === "none";
    document.getElementById("annSend").textContent = "Send →";   // the count is in the line under the bubble (user, 2026-11-06)
    document.getElementById("annSend").disabled = !n || !ta.value.trim();
  };
  to.querySelectorAll(".db-check").forEach(function (el) {
    var flip = function () { var n = names[+el.dataset.i]; on[n] = !on[n]; el.classList.toggle("on", on[n]); paint(); };
    el.onclick = flip;
    el.onkeydown = function (e) { if (e.key === " " || e.key === "Enter") { e.preventDefault(); flip(); } };
  });
  body.querySelectorAll("[data-all]").forEach(function (b) {
    b.onclick = function () {
      var v = b.dataset.all === "1";
      names.forEach(function (n) { on[n] = v; });
      to.querySelectorAll(".db-check").forEach(function (el) { el.classList.toggle("on", v); });
      paint();
    };
  });
  ta.oninput = paint;
  if (nudge) document.getElementById("annBack").onclick = function () { annRenderList(); };
  document.getElementById("annSend").onclick = function () { annSend(nudge, names.filter(function (n) { return on[n]; }), fullText()); };
  paintGreet();
  paint();
  ta.focus(); ta.setSelectionRange(0, 0); ta.scrollTop = 0;   // start at the top, the whole text in view
}

function annSend(nudge, picked, text) {
  if (!picked.length || !text) return;
  var c = annCost(text.replace(ANN_NAME_RE, "Christian"));
  rpmConfirm({
    title: "Warning!",
    subtitle: "Upon activation:",
    message: "→ " + picked.length + " student" + (picked.length === 1 ? "" : "s") + " get this text from the RPM line, one each (no group chat).\n" +
             "→ " + c.pieces + " text" + (c.pieces > 1 ? "s" : "") + " each, about $" + (c.pieces * picked.length * 0.011).toFixed(2) + " in all.\n" +
             "→ Sent texts can't be taken back.",
    confirmLabel: nudge ? "Nudge" : "Send",
    icon: typeof WARN_ICON !== "undefined" ? WARN_ICON : undefined,
    danger: true,
    className: "tv-golive-dlg ann-send-dlg"
  }).then(function (ok) {
    if (!ok) return;
    var url = getScriptUrl(); if (!url) return;
    var win = document.querySelector("#annOverlay .ann-win"), btn = document.getElementById("annSend");
    rpmBusy(win, btn, true, "Sending");
    var q = url + "?action=" + (nudge ? "nudgeAnnouncement" : "sendAnnouncement") +
      "&text=" + encodeURIComponent(text.replace(ANN_NAME_RE, "[Student]")) + "&students=" + encodeURIComponent(picked.join("|")) +
      (nudge ? "&id=" + encodeURIComponent(nudge.id) : "");
    // Not callScript: its catch never calls back, and the window would stay dimmed.
    fetch(q).then(function (r) { return r.json(); }).catch(function () { return { success: false, message: "Connection error. Check the table before sending again." }; }).then(function (d) {
      rpmBusy(win, btn, false);
      if (!d || !d.success) { rpmAlert({ title: "Not sent", message: (d && d.message) || "Connection error" }); return; }
      if (d.failed && d.failed.length) rpmAlert({ title: "Some texts didn't go out", message: d.failed.join("\n") });
      annOpenId = nudge ? nudge.id : (d.id || null);
      annData = null;
      annLoad();
      if (typeof loadCommsInbox === "function") loadCommsInbox();   // the texts show in each conversation
    });
  });
}
