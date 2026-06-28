/* ─── timer / score ──────────────────────────────────────── */

var gameTimerInterval = null;
var gameElapsedSeconds = 0;
var gameScore = 0;
var gameMaxSeconds = 45;

var ITEMS_POOL = [];
var AI_POOL = [];
var REAL_POOL = [];
var gameCanvas = null;
var gameCtx = null;
var gameItems = [];
var slicedPieces = [];
var gameAnimationFrame = null;
var spawnTimer = 0;
var slicedAI = 0;
var slicedReal = 0;
var currentCombo = 0;
const GRAVITY = 0.075;

const aiImages = [
  "blue-runner-shark 2.png", "cactus-elephant-clock 1.png", "frog-tire 1.png",
  "image 1.png", "image 21.png", "image 22.png", "image 23.png", "image 24.png",
  "image 25.png", "image 27.png", "image 29.png", "image 30.png", "image 31.png",
  "image 32.png", "image 33.png", "image 34.png", "image 35.png", "image 36.png",
  "image 38.png", "image 39.png", "image 40.png", "image 41.png", "image 42.png",
  "image 43.png", "image 44.png", "image 45.png", "image 5.png", "tree-figure 1.png"
];

const realImages = [
  "image 10.png", "image 11.png", "image 12.png", "image 13.png", "image 14.png",
  "image 15.png", "image 16.png", "image 17.png", "image 18.png", "image 19.png",
  "image 20.png", "image 46.png", "image 47.png", "image 48.png", "image 49.png",
  "image 50.png", "image 6.png", "image 7.png", "image 8.png", "image 9.png"
];

// Preload images right away
aiImages.forEach(src => {
  let img = new Image();
  img.src = "assets/images/AI/" + src;
  const entry = { image: img, type: "SLOP" };
  ITEMS_POOL.push(entry);
  AI_POOL.push(entry);
});

realImages.forEach(src => {
  let img = new Image();
  img.src = "assets/images/real/" + src;
  const entry = { image: img, type: "REAL" };
  ITEMS_POOL.push(entry);
  REAL_POOL.push(entry);
});

/* ── Shuffled deck: draw every item once before repeating, never same order twice ── */
function ShuffledDeck(source) {
  this.source = source;
  this.deck = [];
}
ShuffledDeck.prototype._refill = function () {
  this.deck = this.source.slice();
  // Fisher-Yates shuffle
  for (let i = this.deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = this.deck[i]; this.deck[i] = this.deck[j]; this.deck[j] = tmp;
  }
};
ShuffledDeck.prototype.draw = function () {
  if (this.deck.length === 0) this._refill();
  return this.deck.pop();
};

var deckAll = null;
var deckAI = null;
var deckReal = null;

function resizeCanvas() {
  if (gameCanvas) {
    gameCanvas.width = window.innerWidth;
    gameCanvas.height = window.innerHeight;
  }
}

window.addEventListener("resize", resizeCanvas);

function spawnFromPool(deck, xOverride) {
  if (!gameCanvas || !deck) return;
  const proto = deck.draw();

  const x = xOverride !== undefined
    ? xOverride
    : gameCanvas.width * (0.25 + Math.random() * 0.5);
  const y = gameCanvas.height + 60;

  const targetX = gameCanvas.width * (0.3 + Math.random() * 0.4);
  const peakHeight = gameCanvas.height * (0.1 + Math.random() * 0.4);

  const dy = peakHeight - y;
  const vy = -Math.sqrt(Math.abs(2 * GRAVITY * dy));
  const t = Math.abs(vy / GRAVITY);
  const vx = (targetX - x) / t;

  let rotSpeed = Math.random() * 0.008 + 0.003;
  if (Math.random() < 0.5) rotSpeed = -rotSpeed;

  gameItems.push({
    image: proto.image,
    type: proto.type,
    x, y, vx, vy,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: rotSpeed
  });
}

function throwItem() {
  spawnFromPool(deckAll);
}

function throwPair() {
  if (!gameCanvas) return;
  const leftX = gameCanvas.width * (0.15 + Math.random() * 0.20);
  const rightX = gameCanvas.width * (0.65 + Math.random() * 0.20);
  spawnFromPool(deckAI, leftX);
  spawnFromPool(deckReal, rightX);
}

/* ── item dimensions helper ── */
function getItemDims(img) {
  if (img.complete && img.naturalWidth > 0) {
    const maxDim = Math.round(window.innerWidth * 0.13);
    const scale = maxDim / Math.max(img.naturalWidth, img.naturalHeight);
    return { w: img.naturalWidth * scale, h: img.naturalHeight * scale };
  }
  return { w: 160, h: 160 };
}

/* ── draw one image card (used for both live items and halves) ── */
function drawCard(ctx, img, halfW, halfH) {
  ctx.shadowBlur = 15;
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.roundRect(-halfW, -halfH, halfW * 2, halfH * 2, 5);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(-halfW, -halfH, halfW * 2, halfH * 2, 5);
  ctx.clip();
  ctx.drawImage(img, -halfW, -halfH, halfW * 2, halfH * 2);
  ctx.restore();

}

/* ── collision: line segment vs rotated rectangle ── */
function segSeg(ax, ay, bx, by, cx, cy, dx, dy) {
  const d = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
  if (d === 0) return false;
  const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / d;
  const u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / d;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

function lineHitsRotatedRect(x1, y1, x2, y2, cx, cy, rotation, halfW, halfH) {
  // Transform slash endpoints into item's local (unrotated) space
  const cos = Math.cos(-rotation), sin = Math.sin(-rotation);
  const dx1 = x1 - cx, dy1 = y1 - cy;
  const dx2 = x2 - cx, dy2 = y2 - cy;
  const lx1 = cos * dx1 - sin * dy1, ly1 = sin * dx1 + cos * dy1;
  const lx2 = cos * dx2 - sin * dy2, ly2 = sin * dx2 + cos * dy2;

  // Either endpoint inside the rect counts
  if (lx1 >= -halfW && lx1 <= halfW && ly1 >= -halfH && ly1 <= halfH) return true;
  if (lx2 >= -halfW && lx2 <= halfW && ly2 >= -halfH && ly2 <= halfH) return true;

  // Or the segment crosses any of the 4 edges
  const W = halfW, H = halfH;
  return segSeg(lx1, ly1, lx2, ly2, -W, -H, W, -H) ||  // top
    segSeg(lx1, ly1, lx2, ly2, W, -H, W, H) ||  // right
    segSeg(lx1, ly1, lx2, ly2, W, H, -W, H) ||  // bottom
    segSeg(lx1, ly1, lx2, ly2, -W, H, -W, -H);    // left
}

/* ── slice an item into two falling halves ── */
function sliceItem(item, idx, x1, y1, x2, y2) {
  const dims = getItemDims(item.image);
  const halfW = dims.w / 2, halfH = dims.h / 2;
  const worldAngle = Math.atan2(y2 - y1, x2 - x1);
  // Store cut angle relative to item's current rotation so it tumbles with the piece
  const localAngle = worldAngle - item.rotation;
  const nx = Math.cos(worldAngle + Math.PI / 2);
  const ny = Math.sin(worldAngle + Math.PI / 2);

  [-1, 1].forEach(function (side) {
    slicedPieces.push({
      image: item.image,
      x: item.x,
      y: item.y,
      vx: item.vx + nx * side * 2,
      vy: item.vy + ny * side * 2 - 1.5,
      rotation: item.rotation,
      rotationSpeed: item.rotationSpeed + (Math.random() - 0.5) * 0.06,
      localAngle: localAngle,
      side: side,
      alpha: 1.0,
      halfW: halfW,
      halfH: halfH
    });
  });

  gameItems.splice(idx, 1);
  if (item.type === "SLOP") {
    slicedAI++;
    currentCombo++;

    // Calculate score with combo multiplier
    // Base 100, plus 50 for each combo level above 1
    const pointsEarned = 100 + (currentCombo > 1 ? (currentCombo - 1) * 50 : 0);
    gameScore += pointsEarned;

    // Play sword slash sound
    var slashAudio = document.getElementById("slash-sound");
    if (slashAudio) {
      slashAudio.currentTime = 0;
      slashAudio.volume = 0.15;
      slashAudio.playbackRate = 0.8;
      slashAudio.play().catch(function (e) { });
    }

    // Update and animate combo sticker
    if (currentCombo > 1) {
      const $sticker = $("#combo-sticker");
      $("#combo-count").text(currentCombo);

      // Remove and re-add class to trigger CSS animation restart
      $sticker.removeClass("pop-in");
      void $sticker[0].offsetWidth; // trigger reflow
      $sticker.addClass("pop-in");

      // Play combo sound with escalating pitch
      var comboAudio = document.getElementById("combo-sound");
      if (comboAudio) {
        comboAudio.currentTime = 0;
        comboAudio.playbackRate = Math.min(1 + (currentCombo * 0.05), 2.0);
        comboAudio.play().catch(function (e) { });
      }
    }
  } else {
    slicedReal++;
    // Slicing a real image breaks the combo immediately
    currentCombo = 0;
    $("#combo-sticker").removeClass("pop-in");
    playErrorSound();
  }
  updateGameHud();
}

var audioCtx = null;
function playErrorSound() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    var oscillator = audioCtx.createOscillator();
    var gainNode = audioCtx.createGain();

    // A harsh, low-pitched sawtooth wave for an error buzz
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(120, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.2);

    gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.2);
  } catch (e) {
    console.log("Web Audio API not supported or failed", e);
  }
}

/* ── check slash segment against all live items ── */
function checkSliceCollisions(x1, y1, x2, y2) {
  for (let i = gameItems.length - 1; i >= 0; i--) {
    const item = gameItems[i];
    const dims = getItemDims(item.image);
    // Shrink the collision box to 55% of the visual size so the player has to cut deeper into the image
    const hitHalfW = (dims.w / 2) * 0.55;
    const hitHalfH = (dims.h / 2) * 0.55;
    if (lineHitsRotatedRect(x1, y1, x2, y2, item.x, item.y, item.rotation, hitHalfW, hitHalfH)) {
      sliceItem(item, i, x1, y1, x2, y2);
    }
  }
}

function gameLoop() {
  if (!gameCanvas || !gameCtx) return;

  gameCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

  spawnTimer++;

  const progress = Math.min(gameElapsedSeconds / gameMaxSeconds, 1.0);

  // Game music playback rate is kept at 1.0
  var gameMusic = document.getElementById("game-music");
  if (gameMusic) {
    gameMusic.playbackRate = 1.0;
  }

  // Only spawn while the clock is still running
  if (gameElapsedSeconds < gameMaxSeconds) {
    // Two-phase spawn rate (frames between throws):
    //   0–38s : slow intro → steady ramp, 160 → 55 frames
    //  38–45s : finale, 55 → 32 frames  (what used to be "mid" is now the peak)
    let currentSpawnRate;
    // Single linear ramp: one every ~6s at the start, one every ~1.5s at the end
    currentSpawnRate = Math.floor(450 - 330 * progress);   // 450 → 120 (linear)

    spawnTimer++;
    if (spawnTimer >= currentSpawnRate) {
      spawnTimer = 0;
      // Pair chance fades from 30% at the start to 0% at the last 10s (progress ~0.78)
      const pairChance = Math.max(0, 0.30 * (1 - progress / 0.78));
      if (Math.random() < pairChance) {
        throwPair();
      } else {
        throwItem();
      }
    }
  }

  /* ── live items ── */
  for (let i = gameItems.length - 1; i >= 0; i--) {
    const item = gameItems[i];
    item.y += item.vy;
    item.x += item.vx;
    item.vy += GRAVITY;
    item.rotation += item.rotationSpeed;

    if (item.y > gameCanvas.height + 200 && item.vy > 0) {
      gameItems.splice(i, 1);
      continue;
    }

    const img = item.image;
    if (!img.complete || img.naturalWidth === 0) continue;
    const dims = getItemDims(img);

    gameCtx.save();
    gameCtx.translate(item.x, item.y);
    gameCtx.rotate(item.rotation);
    drawCard(gameCtx, img, dims.w / 2, dims.h / 2);
    gameCtx.restore();
  }

  /* ── sliced halves ── */
  const LARGE = 3000;
  for (let i = slicedPieces.length - 1; i >= 0; i--) {
    const p = slicedPieces[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += GRAVITY * 1.8;
    p.rotation += p.rotationSpeed;
    p.alpha -= 0.022;

    if (p.alpha <= 0 || p.y > gameCanvas.height + 300) {
      slicedPieces.splice(i, 1);
      continue;
    }

    const img = p.image;
    if (!img.complete || img.naturalWidth === 0) continue;

    gameCtx.save();
    gameCtx.globalAlpha = p.alpha;
    gameCtx.translate(p.x, p.y);
    gameCtx.rotate(p.rotation);

    // Clip to one half of the cut (in local/rotated space)
    const ca = p.localAngle;
    const lx = Math.cos(ca), ly = Math.sin(ca);
    const nx = -ly * p.side, ny = lx * p.side;
    gameCtx.beginPath();
    gameCtx.moveTo(-lx * LARGE, -ly * LARGE);
    gameCtx.lineTo(lx * LARGE, ly * LARGE);
    gameCtx.lineTo(lx * LARGE + nx * LARGE, ly * LARGE + ny * LARGE);
    gameCtx.lineTo(-lx * LARGE + nx * LARGE, -ly * LARGE + ny * LARGE);
    gameCtx.closePath();
    gameCtx.clip();

    drawCard(gameCtx, img, p.halfW, p.halfH);
    gameCtx.restore();
  }

  gameAnimationFrame = requestAnimationFrame(gameLoop);
}

function formatGameTime(totalSeconds) {
  var remaining = Math.max(gameMaxSeconds - totalSeconds, 0);
  var minutes = Math.floor(remaining / 60);
  var seconds = remaining % 60;
  return minutes.toString().padStart(2, "0") + ":" + seconds.toString().padStart(2, "0");
}
function formatScore(v) {
  return v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
function getHighScore() {
  var s = localStorage.getItem("wii-game-highscore");
  return s ? parseInt(s, 10) : 8750;
}
function setHighScore(v) {
  localStorage.setItem("wii-game-highscore", v);
}
function stopGameTimer() {
  if (gameTimerInterval) {
    clearInterval(gameTimerInterval);
    gameTimerInterval = null;
  }
  if (gameAnimationFrame) {
    cancelAnimationFrame(gameAnimationFrame);
    gameAnimationFrame = null;
  }
  var gameMusic = document.getElementById("game-music");
  if (gameMusic) gameMusic.pause();
  stopGameSlash();
}
function updateGameHud() {
  $("#game-timer").text(formatGameTime(gameElapsedSeconds));
  $("#game-score").text(formatScore(gameScore));
  $("#game-highscore").text(formatScore(getHighScore()));
  var remaining = Math.max(1 - gameElapsedSeconds / gameMaxSeconds, 0);
  $("#game-progress").css("width", (remaining * 100).toFixed(1) + "%");
}

/* ─── slash renderer ─────────────────────────────────────── */

var slashCanvas = null;
var slashCtx = null;
var slashRAF = null;
var slashDrawing = false;
var slashPath = [];          // { x, y, time }  — timestamped points
var slashMouse = { x: 0, y: 0 };

var TRAIL_MS = 190;             // how long (ms) each point lives

/* ── polygon blade helpers (from reference) ── */
function slashSimplify(pts) {
  if (pts.length <= 2) return pts;
  var out = [pts[0]];
  for (var i = 1; i < pts.length; i++) {
    var p = out[out.length - 1];
    var dx = pts[i].x - p.x, dy = pts[i].y - p.y;
    if (dx * dx + dy * dy > 36) out.push(pts[i]);
  }
  out.push(pts[pts.length - 1]);
  return out;
}

function buildPoly(pts, maxW) {
  if (pts.length < 2) return null;
  var total = 0, lens = [0];
  for (var i = 1; i < pts.length; i++) {
    var dx = pts[i].x - pts[i - 1].x, dy = pts[i].y - pts[i - 1].y;
    total += Math.sqrt(dx * dx + dy * dy);
    lens.push(total);
  }
  if (total === 0) return null;
  var left = [], right = [];
  for (var i = 0; i < pts.length; i++) {
    var t = lens[i] / total;
    var w = Math.max(Math.sin(t * Math.PI) * maxW, maxW * 0.22);
    var tx, ty;
    if (i === 0) { tx = pts[1].x - pts[0].x; ty = pts[1].y - pts[0].y; }
    else if (i === pts.length - 1) { tx = pts[i].x - pts[i - 1].x; ty = pts[i].y - pts[i - 1].y; }
    else { tx = pts[i + 1].x - pts[i - 1].x; ty = pts[i + 1].y - pts[i - 1].y; }
    var len = Math.sqrt(tx * tx + ty * ty) || 1;
    tx /= len; ty /= len;
    left.push({ x: pts[i].x + (-ty) * w, y: pts[i].y + tx * w });
    right.push({ x: pts[i].x - (-ty) * w, y: pts[i].y - tx * w });
  }
  return { left: left, right: right, start: pts[0], end: pts[pts.length - 1] };
}

function fillPoly(poly, r, g, b, alpha) {
  if (!poly) return;
  slashCtx.beginPath();
  slashCtx.moveTo(poly.start.x, poly.start.y);
  for (var i = 0; i < poly.left.length; i++)  slashCtx.lineTo(poly.left[i].x, poly.left[i].y);
  slashCtx.lineTo(poly.end.x, poly.end.y);
  for (var i = poly.right.length - 1; i >= 0; i--) slashCtx.lineTo(poly.right[i].x, poly.right[i].y);
  slashCtx.closePath();
  slashCtx.fillStyle = "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
  slashCtx.fill();
}

/* ── draw the trail using polygon blades ── */
function drawTrail() {
  var pts = slashSimplify(slashPath);
  if (pts.length < 2) return;
  var blade = buildPoly(pts, 6);
  var soft = buildPoly(pts, 18);
  fillPoly(soft, 210, 230, 255, 0.12);
  fillPoly(blade, 255, 255, 255, 1.0);
}

/* ── crosshair cursor ── */
function drawCursorRing(x, y) {
  var ctx = slashCtx;
  var arm = 10;
  var gap = 4;

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";
  ctx.shadowColor = "rgba(255,255,255,0.6)";
  ctx.shadowBlur = 6;

  ctx.beginPath(); ctx.moveTo(x - arm - gap, y); ctx.lineTo(x - gap, y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + gap, y); ctx.lineTo(x + arm + gap, y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y - arm - gap); ctx.lineTo(x, y - gap); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y + gap); ctx.lineTo(x, y + arm + gap); ctx.stroke();

  ctx.restore();
}

/* ── resize ── */
function resizeSlashCanvas() {
  if (!slashCanvas) return;
  var dpr = window.devicePixelRatio || 1;
  slashCanvas.width = window.innerWidth * dpr;
  slashCanvas.height = window.innerHeight * dpr;
  slashCanvas.style.width = window.innerWidth + "px";
  slashCanvas.style.height = window.innerHeight + "px";
  slashCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/* ── main render loop ── */
function slashLoop() {
  if (!slashCtx) return;

  /* drop points older than TRAIL_MS */
  var now = Date.now();
  while (slashPath.length > 0 && now - slashPath[0].time > TRAIL_MS) {
    slashPath.shift();
  }

  slashCtx.clearRect(0, 0, slashCanvas.width, slashCanvas.height);

  if (slashPath.length > 1) {
    drawTrail();
  }

  if (!slashDrawing && slashPath.length === 0) {
    drawCursorRing(slashMouse.x, slashMouse.y);
  }

  slashRAF = requestAnimationFrame(slashLoop);
}

/* ── event helpers ── */
function getSlashPos(e) {
  var r = slashCanvas.getBoundingClientRect();
  var src = e.touches ? e.touches[0] : e;
  return { x: src.clientX - r.left, y: src.clientY - r.top, time: Date.now() };
}

function onSlashMouseDown(e) {
  if (e.button !== 0) return;
  slashDrawing = true;
  slashPath = [getSlashPos(e)];
  e.preventDefault();
}
function onSlashMouseMove(e) {
  var pos = getSlashPos(e);
  slashMouse.x = pos.x;
  slashMouse.y = pos.y;
  if (slashDrawing) {
    if (slashPath.length > 0) {
      var prev = slashPath[slashPath.length - 1];
      checkSliceCollisions(prev.x, prev.y, pos.x, pos.y);
    }
    slashPath.push(pos);
  }
  e.preventDefault();
}
function onSlashMouseUp(e) {
  if (e.button !== 0) return;
  slashDrawing = false;
}
function onSlashMouseLeave() {
  slashDrawing = false;
}

/* ── lifecycle ── */
function initGameSlash() {
  stopGameSlash();

  slashCanvas = document.getElementById("slash-canvas");
  if (!slashCanvas) return;
  slashCtx = slashCanvas.getContext("2d");
  slashDrawing = false;
  slashPath = [];

  resizeSlashCanvas();
  $(window).on("resize.slash", resizeSlashCanvas);

  slashCanvas.addEventListener("mousedown", onSlashMouseDown, { passive: false });
  slashCanvas.addEventListener("mousemove", onSlashMouseMove, { passive: false });
  slashCanvas.addEventListener("mouseup", onSlashMouseUp);
  slashCanvas.addEventListener("mouseleave", onSlashMouseLeave);

  if (slashRAF) cancelAnimationFrame(slashRAF);
  slashRAF = requestAnimationFrame(slashLoop);
}

function stopGameSlash() {
  slashDrawing = false;
  slashPath = [];

  if (slashRAF) { cancelAnimationFrame(slashRAF); slashRAF = null; }
  $(window).off("resize.slash");

  if (slashCanvas) {
    slashCanvas.removeEventListener("mousedown", onSlashMouseDown);
    slashCanvas.removeEventListener("mousemove", onSlashMouseMove);
    slashCanvas.removeEventListener("mouseup", onSlashMouseUp);
    slashCanvas.removeEventListener("mouseleave", onSlashMouseLeave);
  }

  if (slashCtx && slashCanvas)
    slashCtx.clearRect(0, 0, slashCanvas.width, slashCanvas.height);

  slashCanvas = null;
  slashCtx = null;
}

/* ─── game init ──────────────────────────────────────────── */
function initGame() {
  stopGameTimer();

  var idle = document.getElementById("idle-music");
  if (idle) idle.pause();

  gameCanvas = document.getElementById("game-canvas");
  if (gameCanvas) {
    gameCtx = gameCanvas.getContext("2d");
    resizeCanvas();
    gameItems = [];
    slicedPieces = [];
    spawnTimer = 0;
    deckAll = new ShuffledDeck(ITEMS_POOL);
    deckAI = new ShuffledDeck(AI_POOL);
    deckReal = new ShuffledDeck(REAL_POOL);
    gameLoop();
  }

  gameElapsedSeconds = 0;
  gameScore = 0;
  slicedAI = 0;
  slicedReal = 0;
  currentCombo = 0;
  $("#combo-sticker").removeClass("pop-in");
  updateGameHud();

  var gameMusic = document.getElementById("game-music");
  if (gameMusic) {
    gameMusic.currentTime = 0;
    gameMusic.playbackRate = 1.0;
    gameMusic.play().catch(e => console.error("Audio play error:", e));
  }

  gameTimerInterval = setInterval(function () {
    gameElapsedSeconds += 1;
    updateGameHud();

    if (gameElapsedSeconds >= gameMaxSeconds) {
      clearInterval(gameTimerInterval);
      gameTimerInterval = null;
      // Wait for all items to fall off screen, then show end screen
      waitForClear();
    }
  }, 1000);

  initGameSlash();
}

function waitForClear() {
  // Poll every 200ms until all items and pieces are gone from the canvas
  var poll = setInterval(function () {
    var allGone = gameItems.length === 0 && slicedPieces.length === 0;
    if (allGone) {
      clearInterval(poll);
      stopGameSlash();
      if (gameAnimationFrame) {
        cancelAnimationFrame(gameAnimationFrame);
        gameAnimationFrame = null;
      }
      var gameMusic = document.getElementById("game-music");
      if (gameMusic) gameMusic.pause();
      showEndScreen();
    }
  }, 200);
}

function showEndScreen() {
  if (gameScore > getHighScore()) setHighScore(gameScore);

  var el = document.getElementById("game-end-screen");
  if (!el) return;

  document.getElementById("end-score-value").textContent = formatScore(gameScore);
  document.getElementById("end-highscore-value").textContent = formatScore(getHighScore());
  document.getElementById("end-stat-ai").textContent = slicedAI;
  document.getElementById("end-stat-real").textContent = slicedReal;
  el.classList.add("visible");

  // Restore Wii cursor for the end screen
  $("body").addClass("end-screen-open");

  // Play idle sound in the end menu
  var idle = document.getElementById("idle-music");
  if (idle) {
    idle.currentTime = 0;
    idle.play();
  }
}

function startGame() {
  select();
  previousView = currentView || "menu";
  changeView("game", "fade");
}

function restartGame() {
  select();
  $("body").removeClass("end-screen-open");
  var el = document.getElementById("game-end-screen");
  if (el) el.classList.remove("visible");
  initGame();
}

function endGoToMenu() {
  back();
  var idle = document.getElementById("idle-music");
  if (idle) idle.pause();
  // Strip all game/channel state from body so the menu loads clean
  $("body").removeClass("in-game end-screen-open channel-splash splash-switch");
  stopGameTimer();
  changeView("menu", "fade");
}
