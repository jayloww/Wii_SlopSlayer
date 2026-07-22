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

  // The Wiimote's Home button is mapped to the Windows key by the DolphinBar
  // driver, which opens the Start menu at the OS shell level — before our
  // keydown listener above ever sees it, so preventDefault() can't stop it.
  // The Keyboard Lock API is the one thing that *can* claim system keys like
  // the Windows/Meta key, but ONLY while the page is in real Fullscreen API
  // mode (the --kiosk window alone does not count) and after a user gesture.
  // So on the first click we enter Fullscreen API mode and lock every key;
  // locked keys are delivered to the page (where blockKey() above swallows
  // them) instead of the OS. Trackpad swipe-to-exit is unaffected (OS level).
  function engageKeyboardLock() {
    if (navigator.keyboard && navigator.keyboard.lock) {
      // No arguments = capture ALL keys (Meta/Win, Esc, etc.).
      navigator.keyboard.lock().catch(function () { });
    }
  }

  function armLockdown() {
    if (document.fullscreenElement) {
      engageKeyboardLock();
    } else if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen()
        .then(engageKeyboardLock)
        .catch(function () { });
    }
  }

  // Try on the first user gesture (Fullscreen + Keyboard Lock both require one).
  document.addEventListener("pointerdown", armLockdown, { capture: true, once: true });
  document.addEventListener("mousedown", armLockdown, { capture: true, once: true });

  // If fullscreen is ever lost the keyboard lock is released with it; re-arm so
  // the next click re-enters fullscreen and re-locks the Windows key.
  document.addEventListener("fullscreenchange", function () {
    if (!document.fullscreenElement) {
      document.addEventListener("pointerdown", armLockdown, { capture: true, once: true });
      document.addEventListener("mousedown", armLockdown, { capture: true, once: true });
    }
  });
})();
