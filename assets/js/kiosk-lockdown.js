// Kiosk lockdown for Mayflash DolphinBar (Mode 2 / Game Mode):
// - Every mouse button acts like a left click (A and B both work)
// - Home (Win/Meta) does nothing
// - 1 / 2 (system volume keys) do nothing
// - Plus (Enter) = louder, Minus (Esc) = quieter
(function () {
  window.__kioskMasterVolume = 1;
  var VOL_STEP = 0.08;

  function applyMasterVolume() {
    var master = window.__kioskMasterVolume;
    document.querySelectorAll("audio").forEach(function (el) {
      if (el.dataset.baseVolume == null) {
        el.dataset.baseVolume = String(el.volume);
      }
      var base = parseFloat(el.dataset.baseVolume);
      if (isNaN(base)) base = 1;
      el.volume = Math.max(0, Math.min(1, base * master));
    });
  }

  function bumpVolume(dir) {
    window.__kioskMasterVolume = Math.max(0, Math.min(1, window.__kioskMasterVolume + dir * VOL_STEP));
    applyMasterVolume();
  }

  window.__kioskApplyMasterVolume = applyMasterVolume;
  window.__kioskBumpVolume = bumpVolume;

  function remapMouse(type, e) {
    e.preventDefault();
    e.stopPropagation();
    var clone = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: e.clientX,
      clientY: e.clientY,
      screenX: e.screenX,
      screenY: e.screenY,
      button: 0,
      buttons: 1,
      relatedTarget: e.relatedTarget
    });
    e.target.dispatchEvent(clone);
  }

  function remapPointer(type, e) {
    e.preventDefault();
    e.stopImmediatePropagation();
    var clone = new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: e.clientX,
      clientY: e.clientY,
      screenX: e.screenX,
      screenY: e.screenY,
      button: 0,
      buttons: type === "pointerup" || type === "pointercancel" ? 0 : 1,
      pointerId: e.pointerId,
      pointerType: e.pointerType || "mouse",
      isPrimary: e.isPrimary !== false,
      width: e.width || 1,
      height: e.height || 1,
      pressure: typeof e.pressure === "number" ? e.pressure : 0.5,
      relatedTarget: e.relatedTarget
    });
    e.target.dispatchEvent(clone);
  }

  document.addEventListener("contextmenu", function (e) {
    e.preventDefault();
  }, true);

  ["mousedown", "mouseup"].forEach(function (type) {
    document.addEventListener(type, function (e) {
      if (e.button !== 0) remapMouse(type, e);
    }, true);
  });

  // Game slash uses pointer events — remap right/middle so A and B both cut.
  ["pointerdown", "pointerup", "pointercancel"].forEach(function (type) {
    document.addEventListener(type, function (e) {
      if (e.pointerType === "mouse" && e.button !== 0) remapPointer(type, e);
    }, true);
  });

  // Right/middle clicks fire "auxclick" instead of "click" — remap to a left click.
  document.addEventListener("auxclick", function (e) {
    remapMouse("click", e);
  }, true);

  function isBlockedOsKey(e) {
    var key = e.key;
    var code = e.code;

    // Home → Windows / Meta key
    if (key === "Meta" || key === "OS" || code === "MetaLeft" || code === "MetaRight" || code === "OSLeft" || code === "OSRight") {
      return true;
    }

    // 1 / 2 in Mode 2 → system volume keys (block; do not change our volume)
    if (
      key === "AudioVolumeUp" || key === "AudioVolumeDown" || key === "AudioVolumeMute" ||
      key === "VolumeUp" || key === "VolumeDown" || key === "VolumeMute" ||
      code === "AudioVolumeUp" || code === "AudioVolumeDown" || code === "AudioVolumeMute" ||
      code === "VolumeUp" || code === "VolumeDown" || code === "VolumeMute"
    ) {
      return true;
    }

    // Mode 1 leftovers for 1 / 2
    if (key === "PageUp" || key === "PageDown" || code === "PageUp" || code === "PageDown") {
      return true;
    }

    return false;
  }

  function isVolumeUpKey(e) {
    // Plus in Mode 2 → Enter
    return e.key === "Enter" || e.code === "Enter" || e.code === "NumpadEnter" || e.key === "+" || e.code === "Equal" || e.code === "NumpadAdd";
  }

  function isVolumeDownKey(e) {
    // Minus in Mode 2 → Escape
    return e.key === "Escape" || e.code === "Escape" || e.key === "-" || e.code === "Minus" || e.code === "NumpadSubtract";
  }

  function onKey(e) {
    if (isBlockedOsKey(e)) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (isVolumeUpKey(e)) {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === "keydown" && !e.repeat) bumpVolume(1);
      return;
    }

    if (isVolumeDownKey(e)) {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === "keydown" && !e.repeat) bumpVolume(-1);
      return;
    }
  }

  document.addEventListener("keydown", onKey, true);
  document.addEventListener("keyup", onKey, true);

  // Keep base volumes in sync once media elements exist
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyMasterVolume);
  } else {
    applyMasterVolume();
  }
})();
