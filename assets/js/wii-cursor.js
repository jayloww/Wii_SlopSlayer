/* Scalable Wii pointer — CSS cursor images cannot resize with the viewport */
(function () {
  var CURSOR_SIZE_RATIO = 0.065;
  var cursorEl = null;

  function isActive() {
    return !document.body.classList.contains("in-game") ||
      document.body.classList.contains("end-screen-open");
  }

  function updateSize() {
    if (!cursorEl) return;
    var size = Math.min(window.innerWidth, window.innerHeight) * CURSOR_SIZE_RATIO;
    cursorEl.style.width = size + "px";
  }

  function updateVisibility() {
    if (!cursorEl) return;
    cursorEl.style.display = isActive() ? "block" : "none";
  }

  function moveTo(clientX, clientY) {
    if (!cursorEl) return;
    cursorEl.style.left = clientX + "px";
    cursorEl.style.top = clientY + "px";
  }

  function onPointerMove(e) {
    moveTo(e.clientX, e.clientY);
    if (isActive()) updateVisibility();
  }

  function enforceHiddenSystemCursor() {
    document.documentElement.classList.add("wii-pointer-active");
    document.documentElement.style.cursor = "none";
    document.body.style.cursor = "none";
  }

  function init() {
    enforceHiddenSystemCursor();

    cursorEl = document.createElement("img");
    cursorEl.id = "wii-cursor";
    cursorEl.src = "assets/images/cursor.png";
    cursorEl.draggable = false;
    cursorEl.alt = "";
    document.body.appendChild(cursorEl);

    // DolphinBar / Mayflash often emit mousemove but not pointermove
    document.addEventListener("pointermove", onPointerMove, { passive: true, capture: true });
    document.addEventListener("mousemove", onPointerMove, { passive: true, capture: true });

    window.addEventListener("resize", updateSize);

    new MutationObserver(function () {
      updateVisibility();
      updateSize();
      enforceHiddenSystemCursor();
    }).observe(document.body, { attributes: true, attributeFilter: ["class"] });

    updateSize();
    updateVisibility();
    moveTo(window.innerWidth / 2, window.innerHeight / 2);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
