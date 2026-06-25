/* ─── timer / score ──────────────────────────────────────── */

var gameTimerInterval  = null;
var gameElapsedSeconds = 0;
var gameScore          = 0;
var gameMaxSeconds     = 180;

var ITEMS_POOL = [];
var gameCanvas = null;
var gameCtx = null;
var gameItems = [];
var slicedPieces = [];
var gameAnimationFrame = null;
var spawnTimer = 0;
const GRAVITY = 0.11;

const aiImages = [
  "NYC_generated.jpg", 
  "abstract_art_generated.jpg", "architecture_generated.jpg", "banana-hound.png", 
  "banana-usb.jpg", "blue-runner-shark.jpg", "cactus-elephant-clock.jpg", 
  "capybara-call-center.png", "cat_loaf.jpg", "crocodile-wrestle.png", 
  "espresso-goose.png", "frog-tire.png", "glass-dachshund.png", 
  "greek-frog.png", "jogging_generated.jpg", "munich_generated.jpg", 
  "pelican-open-for-work.png", "port_generated.jpg", "rainforest_generated.jpg", 
  "shark-vase.png", "shrimp-benediction-20260617.png", "tree-figure.png", 
  "washing-machine.png", "white-collar-fish.jpg"
];

const realImages = [
  "abstract.webp", "architecture.webp", "art.webp", "car.webp", "fish_boy.webp", 
  "jogging.webp", "light.webp", "nature.webp", "vase.webp"
];

// Preload images right away
aiImages.forEach(src => {
  let img = new Image();
  img.src = "assets/images/AI/" + src;
  ITEMS_POOL.push({ image: img, type: "SLOP" });
});

realImages.forEach(src => {
  let img = new Image();
  img.src = "assets/images/real/" + src;
  ITEMS_POOL.push({ image: img, type: "REAL" });
});

function resizeCanvas() {
  if (gameCanvas) {
    gameCanvas.width = window.innerWidth;
    gameCanvas.height = window.innerHeight;
  }
}

window.addEventListener("resize", resizeCanvas);

function throwItem() {
  if (!gameCanvas || ITEMS_POOL.length === 0) return;
  const proto = ITEMS_POOL[Math.floor(Math.random() * ITEMS_POOL.length)];
  
  // Toss mostly from underside into the frame
  const x = gameCanvas.width * (0.25 + Math.random() * 0.5);
  const y = gameCanvas.height + 60;
  
  // Don't throw too much outside left/right, keep it in frame
  const targetX = gameCanvas.width * (0.3 + Math.random() * 0.4);
  const peakHeight = gameCanvas.height * (0.1 + Math.random() * 0.4);
  
  const dy = peakHeight - y;
  const vy = -Math.sqrt(Math.abs(2 * GRAVITY * dy));
  
  const t = Math.abs(vy / GRAVITY);
  const vx = (targetX - x) / t;
  
  // Guarantee at least a bit of rotation, randomizing the direction
  let rotSpeed = Math.random() * 0.008 + 0.003;
  if (Math.random() < 0.5) rotSpeed = -rotSpeed;

  gameItems.push({
    image: proto.image,
    type: proto.type,
    x: x,
    y: y,
    vx: vx,
    vy: vy,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: rotSpeed
  });
}

/* ── item dimensions helper ── */
function getItemDims(img) {
  if (img.complete && img.naturalWidth > 0) {
    const maxDim = 210;
    const scale  = maxDim / Math.max(img.naturalWidth, img.naturalHeight);
    return { w: img.naturalWidth * scale, h: img.naturalHeight * scale };
  }
  return { w: 160, h: 160 };
}

/* ── draw one image card (used for both live items and halves) ── */
function drawCard(ctx, img, halfW, halfH) {
  ctx.shadowBlur  = 15;
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

/* ── collision: line segment vs circle ── */
function lineHitsCircle(x1, y1, x2, y2, cx, cy, r) {
  const dx = x2 - x1, dy = y2 - y1;
  const fx = x1 - cx, fy = y1 - cy;
  const a  = dx*dx + dy*dy;
  if (a === 0) return false;
  const b  = 2*(fx*dx + fy*dy);
  const c  = fx*fx + fy*fy - r*r;
  const d  = b*b - 4*a*c;
  if (d < 0) return false;
  const sq = Math.sqrt(d);
  const t1 = (-b - sq) / (2*a);
  const t2 = (-b + sq) / (2*a);
  return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
}

/* ── slice an item into two falling halves ── */
function sliceItem(item, idx, x1, y1, x2, y2) {
  const dims  = getItemDims(item.image);
  const halfW = dims.w / 2, halfH = dims.h / 2;
  const worldAngle = Math.atan2(y2 - y1, x2 - x1);
  // Store cut angle relative to item's current rotation so it tumbles with the piece
  const localAngle = worldAngle - item.rotation;
  const nx = Math.cos(worldAngle + Math.PI / 2);
  const ny = Math.sin(worldAngle + Math.PI / 2);

  [-1, 1].forEach(function(side) {
    slicedPieces.push({
      image:         item.image,
      x:             item.x,
      y:             item.y,
      vx:            item.vx + nx * side * 2,
      vy:            item.vy + ny * side * 2 - 1.5,
      rotation:      item.rotation,
      rotationSpeed: item.rotationSpeed + (Math.random() - 0.5) * 0.06,
      localAngle:    localAngle,
      side:          side,
      alpha:         1.0,
      halfW:         halfW,
      halfH:         halfH
    });
  });

  gameItems.splice(idx, 1);
  gameScore += 100;
  updateGameHud();
}

/* ── check slash segment against all live items ── */
function checkSliceCollisions(x1, y1, x2, y2) {
  for (let i = gameItems.length - 1; i >= 0; i--) {
    const item  = gameItems[i];
    const dims  = getItemDims(item.image);
    const r     = Math.sqrt(dims.w * dims.w + dims.h * dims.h) / 2 * 0.72;
    if (lineHitsCircle(x1, y1, x2, y2, item.x, item.y, r)) {
      sliceItem(item, i, x1, y1, x2, y2);
    }
  }
}

function gameLoop() {
  if (!gameCanvas || !gameCtx) return;
  
  gameCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
  
  spawnTimer++;
  
  const progress = Math.min(gameElapsedSeconds / gameMaxSeconds, 1.0);
  const currentSpawnRate = Math.floor(90 - (90 - 25) * progress);
  
  if (spawnTimer >= currentSpawnRate) {
    spawnTimer = 0;
    const burstCount = (progress > 0.4 && Math.random() < 0.4) ? 2 : 1;
    for (let j = 0; j < burstCount; j++) setTimeout(throwItem, j * 250);
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
    p.x  += p.vx;
    p.y  += p.vy;
    p.vy += GRAVITY * 1.8;
    p.rotation      += p.rotationSpeed;
    p.alpha         -= 0.022;

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
    const ca  = p.localAngle;
    const lx  = Math.cos(ca), ly = Math.sin(ca);
    const nx  = -ly * p.side, ny = lx * p.side;
    gameCtx.beginPath();
    gameCtx.moveTo(-lx * LARGE,             -ly * LARGE);
    gameCtx.lineTo( lx * LARGE,              ly * LARGE);
    gameCtx.lineTo( lx * LARGE + nx * LARGE, ly * LARGE + ny * LARGE);
    gameCtx.lineTo(-lx * LARGE + nx * LARGE,-ly * LARGE + ny * LARGE);
    gameCtx.closePath();
    gameCtx.clip();

    drawCard(gameCtx, img, p.halfW, p.halfH);
    gameCtx.restore();
  }
  
  gameAnimationFrame = requestAnimationFrame(gameLoop);
}

function formatGameTime(totalSeconds) {
  var minutes = Math.floor(totalSeconds / 60);
  var seconds = totalSeconds % 60;
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
  stopGameSlash();
}
function updateGameHud() {
  $("#game-timer").text(formatGameTime(gameElapsedSeconds));
  $("#game-score").text(formatScore(gameScore));
  $("#game-highscore").text(formatScore(getHighScore()));
  $("#game-progress").css("width", Math.min((gameElapsedSeconds / gameMaxSeconds) * 100, 100) + "%");
}

/* ─── slash renderer ─────────────────────────────────────── */

var slashCanvas  = null;
var slashCtx     = null;
var slashRAF     = null;
var slashDrawing = false;
var slashPath    = [];          // { x, y, time }  — timestamped points
var slashMouse   = { x: 0, y: 0 };

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
    var dx = pts[i].x - pts[i-1].x, dy = pts[i].y - pts[i-1].y;
    total += Math.sqrt(dx*dx + dy*dy);
    lens.push(total);
  }
  if (total === 0) return null;
  var left = [], right = [];
  for (var i = 0; i < pts.length; i++) {
    var t  = lens[i] / total;
    var w  = Math.max(Math.sin(t * Math.PI) * maxW, maxW * 0.22);
    var tx, ty;
    if (i === 0)               { tx = pts[1].x   - pts[0].x;   ty = pts[1].y   - pts[0].y;   }
    else if (i===pts.length-1) { tx = pts[i].x   - pts[i-1].x; ty = pts[i].y   - pts[i-1].y; }
    else                       { tx = pts[i+1].x - pts[i-1].x; ty = pts[i+1].y - pts[i-1].y; }
    var len = Math.sqrt(tx*tx + ty*ty) || 1;
    tx /= len; ty /= len;
    left.push({ x: pts[i].x + (-ty)*w, y: pts[i].y + tx*w });
    right.push({ x: pts[i].x - (-ty)*w, y: pts[i].y - tx*w });
  }
  return { left:left, right:right, start:pts[0], end:pts[pts.length-1] };
}

function fillPoly(poly, r, g, b, alpha) {
  if (!poly) return;
  slashCtx.beginPath();
  slashCtx.moveTo(poly.start.x, poly.start.y);
  for (var i=0;i<poly.left.length;i++)  slashCtx.lineTo(poly.left[i].x,  poly.left[i].y);
  slashCtx.lineTo(poly.end.x, poly.end.y);
  for (var i=poly.right.length-1;i>=0;i--) slashCtx.lineTo(poly.right[i].x, poly.right[i].y);
  slashCtx.closePath();
  slashCtx.fillStyle = "rgba("+r+","+g+","+b+","+alpha+")";
  slashCtx.fill();
}

/* ── draw the trail using polygon blades ── */
function drawTrail() {
  var pts = slashSimplify(slashPath);
  if (pts.length < 2) return;
  var blade = buildPoly(pts, 6);
  var soft  = buildPoly(pts, 18);
  fillPoly(soft,  210, 230, 255, 0.12);
  fillPoly(blade, 255, 255, 255, 1.0);
}

/* ── crosshair cursor ── */
function drawCursorRing(x, y) {
  var ctx = slashCtx;
  var arm = 10;
  var gap = 4;

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth   = 1.5;
  ctx.lineCap     = "round";
  ctx.shadowColor = "rgba(255,255,255,0.6)";
  ctx.shadowBlur  = 6;

  ctx.beginPath(); ctx.moveTo(x - arm - gap, y); ctx.lineTo(x - gap, y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + gap, y);        ctx.lineTo(x + arm + gap, y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y - arm - gap);  ctx.lineTo(x, y - gap); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y + gap);         ctx.lineTo(x, y + arm + gap); ctx.stroke();

  ctx.restore();
}

/* ── resize ── */
function resizeSlashCanvas() {
  if (!slashCanvas) return;
  var dpr = window.devicePixelRatio || 1;
  slashCanvas.width        = window.innerWidth  * dpr;
  slashCanvas.height       = window.innerHeight * dpr;
  slashCanvas.style.width  = window.innerWidth  + "px";
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
  var r   = slashCanvas.getBoundingClientRect();
  var src = e.touches ? e.touches[0] : e;
  return { x: src.clientX - r.left, y: src.clientY - r.top, time: Date.now() };
}

function onSlashMouseDown(e) {
  if (e.button !== 0) return;
  slashDrawing = true;
  slashPath    = [getSlashPos(e)];
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
  slashCtx    = slashCanvas.getContext("2d");
  slashDrawing = false;
  slashPath    = [];

  resizeSlashCanvas();
  $(window).on("resize.slash", resizeSlashCanvas);

  slashCanvas.addEventListener("mousedown",  onSlashMouseDown,  { passive: false });
  slashCanvas.addEventListener("mousemove",  onSlashMouseMove,  { passive: false });
  slashCanvas.addEventListener("mouseup",    onSlashMouseUp);
  slashCanvas.addEventListener("mouseleave", onSlashMouseLeave);

  if (slashRAF) cancelAnimationFrame(slashRAF);
  slashRAF = requestAnimationFrame(slashLoop);
}

function stopGameSlash() {
  slashDrawing = false;
  slashPath    = [];

  if (slashRAF) { cancelAnimationFrame(slashRAF); slashRAF = null; }
  $(window).off("resize.slash");

  if (slashCanvas) {
    slashCanvas.removeEventListener("mousedown",  onSlashMouseDown);
    slashCanvas.removeEventListener("mousemove",  onSlashMouseMove);
    slashCanvas.removeEventListener("mouseup",    onSlashMouseUp);
    slashCanvas.removeEventListener("mouseleave", onSlashMouseLeave);
  }

  if (slashCtx && slashCanvas)
    slashCtx.clearRect(0, 0, slashCanvas.width, slashCanvas.height);

  slashCanvas = null;
  slashCtx    = null;
}

/* ─── game init ──────────────────────────────────────────── */
function initGame() {
  stopGameTimer();
  
  gameCanvas = document.getElementById("game-canvas");
  if (gameCanvas) {
    gameCtx = gameCanvas.getContext("2d");
    resizeCanvas();
    gameItems = [];
    slicedPieces = [];
    spawnTimer = 0;
    gameLoop();
  }

  gameElapsedSeconds = 0;
  gameScore          = 0;
  updateGameHud();

  gameTimerInterval = setInterval(function() {
    gameElapsedSeconds += 1;
    updateGameHud();
  }, 1000);

  initGameSlash();
}

function startGame() {
  select();
  previousView = currentView || "menu";
  changeView("game", "fade");
}
