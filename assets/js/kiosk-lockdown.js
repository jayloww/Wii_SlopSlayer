// Kiosk lockdown: only left click (A) and right click (B) do anything.
// Everything else — middle click, back/forward side buttons, keyboard,
// wheel/scroll — is inert. Trackpad gestures used to exit the kiosk are
// handled by the OS below the browser, so they're untouched here.
(function () {
  function isAllowedButton(e) {
    return e.button === 0 || e.button === 2;
  }

  // No context menu on right click
  document.addEventListener("contextmenu", function (e) {
    e.preventDefault();
    e.stopImmediatePropagation();
  }, true);

  // Block any mouse button that isn't A (left) or B (right) — no remapping,
  // just make sure it does nothing at all.
  ["mousedown", "mouseup", "click"].forEach(function (type) {
    document.addEventListener(type, function (e) {
      if (!isAllowedButton(e)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }, true);
  });

  ["pointerdown", "pointerup", "pointercancel"].forEach(function (type) {
    document.addEventListener(type, function (e) {
      if (e.pointerType === "mouse" && !isAllowedButton(e)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }, true);
  });

  // auxclick fires for middle/side buttons on release — block it outright
  document.addEventListener("auxclick", function (e) {
    e.preventDefault();
    e.stopImmediatePropagation();
  }, true);

  // Block scroll / zoom gestures from the remote
  ["wheel", "scroll"].forEach(function (type) {
    document.addEventListener(type, function (e) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }, { capture: true, passive: false });
  });

  // Block every keyboard key (Home, 1, 2, +, -, Esc, Win, media keys, etc.)
  function blockKey(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
  }
  document.addEventListener("keydown", blockKey, true);
  document.addEventListener("keyup", blockKey, true);
  document.addEventListener("keypress", blockKey, true);
})();
