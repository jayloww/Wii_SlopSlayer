// Kiosk lockdown: only pointer move + click/swipe. Everything else is blocked.
// Right/middle mouse buttons are remapped to left click so A and B both work.
(function () {
  function remapMouse(type, e) {
    e.preventDefault();
    e.stopImmediatePropagation();
    e.target.dispatchEvent(new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: e.clientX,
      clientY: e.clientY,
      screenX: e.screenX,
      screenY: e.screenY,
      button: 0,
      buttons: type === "mouseup" ? 0 : 1,
      relatedTarget: e.relatedTarget
    }));
  }

  function remapPointer(type, e) {
    e.preventDefault();
    e.stopImmediatePropagation();
    e.target.dispatchEvent(new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: e.clientX,
      clientY: e.clientY,
      screenX: e.screenX,
      screenY: e.screenY,
      button: 0,
      buttons: (type === "pointerup" || type === "pointercancel") ? 0 : 1,
      pointerId: e.pointerId,
      pointerType: e.pointerType || "mouse",
      isPrimary: e.isPrimary !== false,
      width: e.width || 1,
      height: e.height || 1,
      pressure: typeof e.pressure === "number" ? e.pressure : 0.5,
      relatedTarget: e.relatedTarget
    }));
  }

  // No context menu
  document.addEventListener("contextmenu", function (e) {
    e.preventDefault();
    e.stopImmediatePropagation();
  }, true);

  // Remap non-left mouse buttons → left click
  ["mousedown", "mouseup"].forEach(function (type) {
    document.addEventListener(type, function (e) {
      if (e.button !== 0) remapMouse(type, e);
    }, true);
  });

  // Remap non-left pointer buttons → left click (needed for in-game slash)
  ["pointerdown", "pointerup", "pointercancel"].forEach(function (type) {
    document.addEventListener(type, function (e) {
      if (e.pointerType === "mouse" && e.button !== 0) remapPointer(type, e);
    }, true);
  });

  document.addEventListener("auxclick", function (e) {
    remapMouse("click", e);
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
