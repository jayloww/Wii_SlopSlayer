// Kiosk lockdown: no context menu, no browser gestures — every mouse button acts like a left click.
(function () {
  function remap(type, e) {
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

  document.addEventListener("contextmenu", function (e) {
    e.preventDefault();
  }, true);

  ["mousedown", "mouseup"].forEach(function (type) {
    document.addEventListener(type, function (e) {
      if (e.button !== 0) remap(type, e);
    }, true);
  });

  // Right/middle clicks fire "auxclick" instead of "click" — remap to a left click.
  document.addEventListener("auxclick", function (e) {
    remap("click", e);
  }, true);
})();
