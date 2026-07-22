/* ─── timer / score ──────────────────────────────────────── */

var gameTimerInterval = null;
var gameOverTimeout = null;
var gameElapsedSeconds = 0;
var gameScore = 0;
var gameOver = false;
var playerLives = 3;
const MAX_LIVES = 3;
const DIFFICULTY_RAMP_SECONDS = 120;

var ITEMS_POOL = [];
var AI_POOL = [];
var REAL_POOL = [];
var gameCanvas = null;
var gameCtx = null;
var gameItems = [];
var slicedPieces = [];
var gameAnimationFrame = null;
var spawnTimer = 0;
var lastGameFrameTime = null;
var floatIndicators = [];
var missFlashAlpha = 0;
var slicedAI = 0;
var slicedReal = 0;
var missedAI = 0;
var lifeMistakes = []; // { image, reason: "cut" | "missed" }
var currentCombo = 0;
const GRAVITY = 0.082;
const FRAME_MS = 1000 / 60;
const PHYSICS_SPEED_MULTIPLIER = 2.1;
const SPAWN_SPEED_MULTIPLIER = 4.3;

const aiImages = [
  "6174ceea7d612c45ebeccc1026e66521.webp",
  "669726e56b60d483ebfca9cc_6635609c8bc91f380db981ee_URAXIKYN_PvJ8_raw.jpeg",
  "ai-animal-hybrid-image.png", "blue-runner-shark 2.png", "cactus-elephant-clock 1.png",
  "frog-tire 1.png", "futuristic-half-robot-tiger_23-2151558824.avif", "gangaster-cat-7.webp",
  "image 1.png", "image 21.png", "image 22.png", "image 23.png", "image 24.png",
  "image 25.png", "image 27.png", "image 29.png", "image 30.png", "image 31.png",
  "image 32.png", "image 33.png", "image 34.png", "image 35.png", "image 36.png",
  "image 38.png", "image 39.png", "image 40.png", "image 41.png", "image 42.png",
  "image 43.png", "image 44.png", "image 45.png", "image 5.png", "images (1).jpeg",
  "images (2).jpeg", "images.jpeg", "olql786rnsvl.webp", "p0jkct29.jpg", "tree-figure 1.png"
];

const realImages = [
  "0001_AdobeStock_460169080.jpg", "AdobeStock_175375173_422894_reduced.jpg",
  "GettyImages-200140069-001-572230963df78c5640ea71bf.jpg", "Wildlife_at_Maasai_Mara_(Lion).jpg",
  "animal-and-their-babies-870x490 (1).webp", "animal-and-their-babies-870x490.webp",
  "baby-animal-photos-65f9bc47971de.avif",
  "closeup-scarlet-macaw-from-side-view-scarlet-macaw-closeup-head_488145-3540.avif",
  "cute-wild-animals-2-686e3652d7b64__700.jpg", "fox-715588_640.jpg", "image 10.png",
  "image 11.png", "image 12.png", "image 13.png", "image 14.png", "image 15.png",
  "image 16.png", "image 17.png", "image 18.png", "image 19.png", "image 20.png",
  "image 46.png", "image 47.png", "image 48.png", "image 49.png", "image 50.png",
  "image 6.png", "image 7.png", "image 8.png", "image 9.png", "images (1).jpeg",
  "images.jpeg", "istockphoto-1068395160-612x612.jpg",
  "lamb-iStock-665494268-16x9-e1559777676675-1200x675.jpg",
  "photo-1500479694472-551d1fb6258d.avif", "sand-cat-in-kuwait-desert-m.jpg",
  "sloth-animal-on-tree-branch-and-looking-at-camera-photo.jpg",
  "species-cat_f931wg_c_scale,w_1524.jpg"
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

/* ── Shuffled deck: every image appears once per cycle before any repeat ── */
function ShuffledDeck(source) {
  this.source = source;
  this.deck = [];
  this.lastDrawn = null;
}
ShuffledDeck.prototype._shuffle = function (arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
};
ShuffledDeck.prototype._refill = function () {
  this.deck = this._shuffle(this.source.slice());

  // When a new cycle starts, avoid back-to-back identical images across cycles
  if (this.lastDrawn && this.deck.length > 1) {
    const lastSrc = this.lastDrawn.image.src;
    const top = this.deck.length - 1;
    if (this.deck[top].image.src === lastSrc) {
      const swap = Math.floor(Math.random() * (this.deck.length - 1));
      const tmp = this.deck[top];
      this.deck[top] = this.deck[swap];
      this.deck[swap] = tmp;
    }
  }
};
ShuffledDeck.prototype.draw = function () {
  if (this.deck.length === 0) this._refill();
  this.lastDrawn = this.deck.pop();
  return this.lastDrawn;
};

var deckAI = null;
var deckReal = null;
var spawnCountAI = 0;
var spawnCountReal = 0;

// The game canvas's CSS box is fixed at the app's 1920x1080 reference resolution
// (see universal.css #viewport-stage) and is scaled visually as a whole by the
// outer viewport transform, so its buffer must match that CSS size, not the real
// window size (which would double-scale/distort everything on other-ratio screens).
function resizeCanvas() {
  if (gameCanvas) {
    gameCanvas.width = gameCanvas.clientWidth;
    gameCanvas.height = gameCanvas.clientHeight;
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

  if (proto.type === "SLOP") spawnCountAI++;
  else spawnCountReal++;
}

function throwItem() {
  let deck;
  if (spawnCountAI < spawnCountReal) {
    deck = deckAI;
  } else if (spawnCountReal < spawnCountAI) {
    deck = deckReal;
  } else {
    deck = Math.random() < 0.5 ? deckAI : deckReal;
  }
  spawnFromPool(deck);
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
    const maxDim = Math.round(gameCanvas.width * 0.17);
    const scale = maxDim / Math.max(img.naturalWidth, img.naturalHeight);
    return { w: img.naturalWidth * scale, h: img.naturalHeight * scale };
  }
  return { w: 200, h: 200 };
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

  const isMistake = item.type !== "SLOP";

  // Same split for both — a wrong cut additionally flashes the halves red briefly
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
      fade: 0.022,
      mistake: isMistake,
      age: 0,
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
    resetCombo();
    playRealSliceErrorSound();
    lifeMistakes.push({ image: item.image, reason: "cut" });
    loseLife();
  }
  updateGameHud();
}

function getDifficultyProgress() {
  return Math.min(gameElapsedSeconds / DIFFICULTY_RAMP_SECONDS, 1.0);
}

function getSpawnRateFrames() {
  const progress = getDifficultyProgress();
  let frames = Math.floor(540 - 405 * progress);   // 540 → 135 over 120s

  // Keep ramping after 120s so survival becomes nearly impossible
  if (gameElapsedSeconds > DIFFICULTY_RAMP_SECONDS) {
    const overtime = gameElapsedSeconds - DIFFICULTY_RAMP_SECONDS;
    frames = Math.max(40, 135 - overtime * 1.5);
  }

  return frames;
}

function loseLife() {
  if (gameOver) return;
  var lostIndex = playerLives - 1;
  playerLives = Math.max(playerLives - 1, 0);

  if (lostIndex >= 0) {
    var $heart = $("#game-lives .life-icon").eq(lostIndex);
    $heart.removeClass("filled losing").addClass("empty losing");
    void $heart[0].offsetWidth;
    setTimeout(function () {
      $heart.removeClass("losing");
    }, 600);
  }

  updateGameHud();
  if (playerLives <= 0) {
    triggerGameOver();
  }
}

function triggerGameOver() {
  if (gameOver) return;
  gameOver = true;

  // Stop input, spawning and the timer instantly so the fatal move can't repeat,
  // but keep the render loop alive briefly so the cut/flash is still visible.
  if (gameTimerInterval) {
    clearInterval(gameTimerInterval);
    gameTimerInterval = null;
  }
  stopGameSlash();

  if (gameOverTimeout) clearTimeout(gameOverTimeout);
  gameOverTimeout = setTimeout(finishGame, 180);
}

function finishGame() {
  if (gameOverTimeout) {
    clearTimeout(gameOverTimeout);
    gameOverTimeout = null;
  }
  if (gameTimerInterval) {
    clearInterval(gameTimerInterval);
    gameTimerInterval = null;
  }

  gameItems = [];
  slicedPieces = [];
  stopGameSlash();

  if (gameAnimationFrame) {
    cancelAnimationFrame(gameAnimationFrame);
    gameAnimationFrame = null;
  }

  var gameMusic = document.getElementById("game-music");
  if (gameMusic) gameMusic.pause();

  showEndScreen();
}

function resetCombo() {
  currentCombo = 0;
  $("#combo-sticker").removeClass("pop-in");
}

var audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(freqStart, freqEnd, duration, type, volume) {
  try {
    var ctx = getAudioCtx();
    var oscillator = ctx.createOscillator();
    var gainNode = ctx.createGain();
    var now = ctx.currentTime;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freqStart, now);
    if (freqEnd !== freqStart) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), now + duration);
    }

    gainNode.gain.setValueAtTime(volume, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(now);
    oscillator.stop(now + duration);
  } catch (e) {
    console.log("Web Audio API not supported or failed", e);
  }
}

function playRealSliceErrorSound() {
  // Harsh, punishing low buzz for slicing a real image
  playTone(100, 32, 0.38, "sawtooth", 0.72);
  playTone(170, 55, 0.3, "square", 0.38);
}

function playMissSound() {
  // Two quick descending tones for letting an AI image escape
  playTone(600, 360, 0.14, "square", 0.42);
  setTimeout(function () {
    playTone(480, 260, 0.18, "square", 0.42);
  }, 110);
}

/* ── visual feedback when an AI image is missed ── */
function spawnMissIndicator(x) {
  if (!gameCanvas) return;
  var margin = gameCanvas.width * 0.12;
  var cx = Math.max(margin, Math.min(gameCanvas.width - margin, x));
  var cy = gameCanvas.height - gameCanvas.height * 0.16;
  floatIndicators.push({ text: "MISSED!", x: cx, y: cy, age: 0, life: 950, color: "#ff5470" });
  missFlashAlpha = 1;
}

function updateAndDrawIndicators(deltaMs) {
  // Red edge flash
  if (missFlashAlpha > 0) {
    missFlashAlpha = Math.max(0, missFlashAlpha - deltaMs / 500);
    var w = gameCanvas.width, h = gameCanvas.height;
    var grad = gameCtx.createRadialGradient(
      w / 2, h / 2, Math.min(w, h) * 0.32,
      w / 2, h / 2, Math.max(w, h) * 0.72
    );
    grad.addColorStop(0, "rgba(255, 30, 70, 0)");
    grad.addColorStop(1, "rgba(255, 30, 70, " + (0.4 * missFlashAlpha) + ")");
    gameCtx.save();
    gameCtx.fillStyle = grad;
    gameCtx.fillRect(0, 0, w, h);
    gameCtx.restore();
  }

  if (floatIndicators.length === 0) return;

  var baseFont = Math.max(26, Math.min(gameCanvas.width, gameCanvas.height) * 0.05);

  for (var i = floatIndicators.length - 1; i >= 0; i--) {
    var f = floatIndicators[i];
    f.age += deltaMs;
    var t = f.age / f.life;
    if (t >= 1) { floatIndicators.splice(i, 1); continue; }

    var y = f.y - t * (gameCanvas.height * 0.08);
    var alpha = t < 0.15 ? (t / 0.15) : 1 - (t - 0.15) / 0.85;
    var pop = 0.7 + Math.min(t * 4, 1) * 0.4;
    var shakeX = f.shake ? Math.sin(f.age * 0.06) * baseFont * 0.18 * (1 - t) : 0;

    gameCtx.save();
    gameCtx.globalAlpha = Math.max(alpha, 0);
    gameCtx.translate(f.x + shakeX, y);
    gameCtx.scale(pop, pop);
    gameCtx.textAlign = "center";
    gameCtx.textBaseline = "middle";

    gameCtx.font = "700 " + baseFont + "px 'Asap', sans-serif";
    gameCtx.lineWidth = baseFont * 0.16;
    gameCtx.strokeStyle = "rgba(0, 0, 0, 0.55)";
    gameCtx.strokeText(f.text, 0, 0);
    gameCtx.fillStyle = f.color || "#ff5470";
    gameCtx.fillText(f.text, 0, 0);

    gameCtx.restore();
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

function gameLoop(now) {
  if (!gameCanvas || !gameCtx) return;

  if (lastGameFrameTime === null) lastGameFrameTime = now;
  var deltaMs = Math.min(now - lastGameFrameTime, 50);
  lastGameFrameTime = now;
  var dt = (deltaMs / FRAME_MS) * PHYSICS_SPEED_MULTIPLIER;

  gameCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

  const progress = getDifficultyProgress();

  // Game music speeds up slightly as difficulty rises
  var gameMusic = document.getElementById("game-music");
  if (gameMusic) {
    gameMusic.playbackRate = 1.0 + progress * 0.35;
  }

  if (!gameOver) {
    const currentSpawnRateFrames = getSpawnRateFrames();
    const currentSpawnRateMs = currentSpawnRateFrames * FRAME_MS;

    spawnTimer += deltaMs * SPAWN_SPEED_MULTIPLIER;
    if (spawnTimer >= currentSpawnRateMs) {
      spawnTimer -= currentSpawnRateMs;
      // Pair chance fades out by ~90s, stays off during peak difficulty
      const pairChance = Math.max(0, 0.30 * (1 - gameElapsedSeconds / 90));
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
    item.y += item.vy * dt;
    item.x += item.vx * dt;
    item.vy += GRAVITY * dt;
    item.rotation += item.rotationSpeed * dt;

    if (item.y > gameCanvas.height + 200 && item.vy > 0) {
      if (item.type === "SLOP") {
        missedAI++;
        resetCombo();
        playMissSound();
        spawnMissIndicator(item.x);
        lifeMistakes.push({ image: item.image, reason: "missed" });
        loseLife();
      }
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
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += GRAVITY * 1.8 * dt;
    p.rotation += p.rotationSpeed * dt;
    p.alpha -= (p.fade || 0.022) * dt;
    if (p.mistake) p.age += deltaMs;

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

    // Wrong cut: light the halves up red. Stays solid while the scene is frozen
    // on game over, otherwise fades out over ~320ms during normal play.
    if (p.mistake) {
      var FLASH_MS = 320;
      var tint = gameOver ? 0.6 : (p.age < FLASH_MS ? 0.6 * (1 - p.age / FLASH_MS) : 0);
      if (tint > 0) {
        gameCtx.globalCompositeOperation = "source-atop";
        gameCtx.fillStyle = "rgba(255, 25, 35, " + tint + ")";
        gameCtx.fillRect(-p.halfW, -p.halfH, p.halfW * 2, p.halfH * 2);
        gameCtx.globalCompositeOperation = "source-over";
      }
    }

    gameCtx.restore();
  }

  updateAndDrawIndicators(deltaMs);

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
  return s ? parseInt(s, 10) : 0;
}
function setHighScore(v) {
  localStorage.setItem("wii-game-highscore", v);
}
function resetHighScore() {
  localStorage.removeItem("wii-game-highscore");
}

// One-time reset of previously saved high scores
if (!localStorage.getItem("wii-highscore-reset")) {
  resetHighScore();
  localStorage.setItem("wii-highscore-reset", "1");
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
  lastGameFrameTime = null;
  document.removeEventListener("keydown", onGameDebugKeyDown);
  var gameMusic = document.getElementById("game-music");
  if (gameMusic) gameMusic.pause();
  stopGameSlash();
}
function updateGameHud() {
  $("#game-timer").text(formatGameTime(gameElapsedSeconds));
  $("#game-score").text(formatScore(gameScore));
  $("#game-highscore").text(formatScore(getHighScore()));
  updateLivesHud();
}

function updateLivesHud() {
  var $hearts = $("#game-lives .life-icon");
  if (!$hearts.length) return;

  $hearts.each(function (i) {
    var $heart = $(this);
    if ($heart.hasClass("losing")) return;
    $heart.removeClass("filled empty").addClass(i < playerLives ? "filled" : "empty");
  });
}

/* ─── slash renderer ─────────────────────────────────────── */

var slashCanvas = null;
var slashCtx = null;
var slashRAF = null;
var slashDrawing = false;
var slashPath = [];          // { x, y, time }  — timestamped points
var slashMouse = { x: 0, y: 0 };
var gameFilterX = new OneEuroFilter(0.8, 0.03, 1.0);
var gameFilterY = new OneEuroFilter(0.8, 0.03, 1.0);

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

/* ── resize ──
   Same reasoning as resizeCanvas(): size the buffer from the element's own
   (fixed 1920x1080-reference) CSS box, not the real window, since the whole
   app is scaled as one unit by the outer viewport transform. */
function resizeSlashCanvas() {
  if (!slashCanvas) return;
  var dpr = window.devicePixelRatio || 1;
  var cssWidth = slashCanvas.clientWidth;
  var cssHeight = slashCanvas.clientHeight;
  slashCanvas.width = cssWidth * dpr;
  slashCanvas.height = cssHeight * dpr;
  slashCanvas.style.width = cssWidth + "px";
  slashCanvas.style.height = cssHeight + "px";
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

/* ── event helpers ──
   getBoundingClientRect() reports the canvas's post-transform size on real
   screen pixels (it accounts for the outer viewport scale), while our drawing
   coordinates are in the canvas's own fixed CSS pixel space. Rescale pointer
   coordinates through that ratio so slashes land under the cursor regardless
   of the real screen's size/aspect ratio. */
function getSlashPos(e) {
  var r = slashCanvas.getBoundingClientRect();
  var src = (e.touches && e.touches.length) ? e.touches[0] : e;
  var scaleX = slashCanvas.clientWidth / r.width;
  var scaleY = slashCanvas.clientHeight / r.height;
  return {
    x: (src.clientX - r.left) * scaleX,
    y: (src.clientY - r.top) * scaleY,
    time: Date.now()
  };
}

function applySlashSegment(x1, y1, x2, y2) {
  checkSliceCollisions(x1, y1, x2, y2);
}

function onSlashPointerDown(e) {
  if (gameOver || !slashCanvas) return;
  // Only left (A) or right (B) click can start a slash — everything else
  // (middle click, back/forward side buttons, etc.) is ignored outright.
  if (e.pointerType === "mouse" && e.button !== 0 && e.button !== 2) return;

  gameFilterX.reset();
  gameFilterY.reset();

  var pos = getSlashPos(e);
  pos.x = gameFilterX.filter(pos.x, pos.time);
  pos.y = gameFilterY.filter(pos.y, pos.time);

  var fromX = slashMouse.x;
  var fromY = slashMouse.y;

  slashMouse.x = pos.x;
  slashMouse.y = pos.y;
  slashDrawing = true;
  slashPath = [pos];

  // Slice immediately on press (fixes gamepad B / click-without-drag)
  applySlashSegment(fromX, fromY, pos.x, pos.y);
  applySlashSegment(pos.x, pos.y, pos.x + 1, pos.y);

  // A fatal slice above can end the game synchronously (stopGameSlash nulls
  // slashCanvas) before we get here, e.g. an instant tap with no drag.
  if (slashCanvas && slashCanvas.setPointerCapture) {
    try { slashCanvas.setPointerCapture(e.pointerId); } catch (err) { }
  }
  e.preventDefault();
}

function onGlobalPointerMove(e) {
  if (!slashCanvas || gameOver) return;

  var pos = getSlashPos(e);
  pos.x = gameFilterX.filter(pos.x, pos.time);
  pos.y = gameFilterY.filter(pos.y, pos.time);

  slashMouse.x = pos.x;
  slashMouse.y = pos.y;

  if (!slashDrawing) return;

  if (slashPath.length > 0) {
    var prev = slashPath[slashPath.length - 1];
    applySlashSegment(prev.x, prev.y, pos.x, pos.y);
  }
  slashPath.push(pos);
  e.preventDefault();
}

function onSlashPointerUp(e) {
  if (e.pointerType === "mouse" && e.button !== 0 && e.button !== 2) return;
  slashDrawing = false;
  if (slashCanvas && slashCanvas.releasePointerCapture) {
    try { slashCanvas.releasePointerCapture(e.pointerId); } catch (err) { }
  }
}

/* ── lifecycle ── */
function initGameSlash() {
  stopGameSlash();

  slashCanvas = document.getElementById("slash-canvas");
  if (!slashCanvas) return;
  slashCtx = slashCanvas.getContext("2d");
  slashDrawing = false;
  slashPath = [];
  slashMouse.x = slashCanvas.clientWidth / 2;
  slashMouse.y = slashCanvas.clientHeight / 2;

  gameFilterX.reset();
  gameFilterY.reset();

  resizeSlashCanvas();
  $(window).on("resize.slash", resizeSlashCanvas);

  slashCanvas.addEventListener("pointerdown", onSlashPointerDown, { passive: false });
  window.addEventListener("pointermove", onGlobalPointerMove, { passive: false });
  window.addEventListener("pointerup", onSlashPointerUp, { passive: false });
  window.addEventListener("pointercancel", onSlashPointerUp, { passive: false });

  if (slashRAF) cancelAnimationFrame(slashRAF);
  slashRAF = requestAnimationFrame(slashLoop);
}

function stopGameSlash() {
  slashDrawing = false;
  slashPath = [];

  if (slashRAF) { cancelAnimationFrame(slashRAF); slashRAF = null; }
  $(window).off("resize.slash");

  window.removeEventListener("pointermove", onGlobalPointerMove);
  window.removeEventListener("pointerup", onSlashPointerUp);
  window.removeEventListener("pointercancel", onSlashPointerUp);

  if (slashCanvas) {
    slashCanvas.removeEventListener("pointerdown", onSlashPointerDown);
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

  if (gameOverTimeout) { clearTimeout(gameOverTimeout); gameOverTimeout = null; }
  if (gameAnimationFrame) { cancelAnimationFrame(gameAnimationFrame); gameAnimationFrame = null; }

  gameCanvas = document.getElementById("game-canvas");
  if (gameCanvas) {
    gameCtx = gameCanvas.getContext("2d");
    resizeCanvas();
    gameItems = [];
    slicedPieces = [];
    spawnTimer = 0;
    lastGameFrameTime = null;
    deckAI = new ShuffledDeck(AI_POOL);
    deckReal = new ShuffledDeck(REAL_POOL);
    gameAnimationFrame = requestAnimationFrame(gameLoop);
  }

  gameElapsedSeconds = 0;
  gameScore = 0;
  gameOver = false;
  playerLives = MAX_LIVES;
  slicedAI = 0;
  slicedReal = 0;
  spawnCountAI = 0;
  spawnCountReal = 0;
  missedAI = 0;
  lifeMistakes = [];
  currentCombo = 0;
  floatIndicators = [];
  missFlashAlpha = 0;
  if (gameOverTimeout) { clearTimeout(gameOverTimeout); gameOverTimeout = null; }
  $("#combo-sticker").removeClass("pop-in");
  updateGameHud();

  var gameMusic = document.getElementById("game-music");
  if (gameMusic) {
    gameMusic.currentTime = 0;
    gameMusic.playbackRate = 1.0;
    gameMusic.play().catch(e => console.error("Audio play error:", e));
  }

  gameTimerInterval = setInterval(function () {
    if (!gameOver) {
      gameElapsedSeconds += 1;
      updateGameHud();
    }
  }, 1000);

  initGameSlash();
  document.addEventListener("keydown", onGameDebugKeyDown);
}

function onGameDebugKeyDown(e) {
  if (!e.ctrlKey || (e.key !== "e" && e.key !== "E")) return;
  if (typeof currentView === "undefined" || currentView !== "game") return;

  var endScreen = document.getElementById("game-end-screen");
  if (endScreen && endScreen.classList.contains("visible")) return;

  e.preventDefault();
  endGameEarly();
}

function endGameEarly() {
  if (gameOver) return;

  gameOver = true;
  playerLives = 0;
  updateGameHud();
  finishGame();
}

function showEndScreen() {
  var isNewHighScore = gameScore > getHighScore();
  if (isNewHighScore) setHighScore(gameScore);

  var el = document.getElementById("game-end-screen");
  if (!el) return;

  var scoreValEl = document.getElementById("end-score-value");
  var bannerEl = document.getElementById("new-highscore-banner");

  if (scoreValEl) {
    scoreValEl.classList.remove("new-highscore-glow");
    scoreValEl.textContent = formatScore(gameScore);
  }
  if (bannerEl) {
    bannerEl.classList.remove("show");
  }

  if (isNewHighScore) {
    if (scoreValEl) scoreValEl.classList.add("new-highscore-glow");
    if (bannerEl) bannerEl.classList.add("show");
  }

  var mistakesEl = document.getElementById("end-mistakes");
  if (mistakesEl) {
    mistakesEl.innerHTML = "";
    lifeMistakes.forEach(function (mistake) {
      var card = document.createElement("div");
      card.className = "end-mistake end-mistake-" + mistake.reason;

      var imgWrap = document.createElement("div");
      imgWrap.className = "end-mistake-img";
      var img = document.createElement("img");
      img.src = mistake.image.src;
      img.alt = "";
      img.draggable = false;

      function sizeLikeGameCard() {
        if (!img.naturalWidth) return;
        var maxDim = 180;
        var scale = maxDim / Math.max(img.naturalWidth, img.naturalHeight);
        img.style.width = Math.round(img.naturalWidth * scale) + "px";
        img.style.height = Math.round(img.naturalHeight * scale) + "px";
      }
      if (img.complete) sizeLikeGameCard();
      else img.onload = sizeLikeGameCard;

      imgWrap.appendChild(img);

      var label = document.createElement("span");
      label.className = "end-mistake-label";
      label.textContent = mistake.reason === "cut" ? "WRONG CUT" : "MISSED";

      card.appendChild(imgWrap);
      card.appendChild(label);
      mistakesEl.appendChild(card);
    });
  }

  // Manage leaderboard
  var leaderboard = [];
  var rawLeaderboard = localStorage.getItem("wii-game-leaderboard");
  if (rawLeaderboard) {
    try {
      leaderboard = JSON.parse(rawLeaderboard);
    } catch (e) {
      leaderboard = [];
    }
  }

  // Create current game entry with a unique ID
  var currentEntryId = "score-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
  var currentEntry = {
    id: currentEntryId,
    score: gameScore,
    timestamp: Date.now()
  };

  leaderboard.push(currentEntry);
  leaderboard.sort(function(a, b) {
    return b.score - a.score;
  });

  localStorage.setItem("wii-game-leaderboard", JSON.stringify(leaderboard));

  // Helper to create an entry DOM element
  function createEntryElement(entry, rank, isCurrent) {
    var entryDiv = document.createElement("div");
    entryDiv.className = "leaderboard-entry";
    if (isCurrent) {
      entryDiv.classList.add("highlight-entry");
    }

    if (rank === 1) {
      entryDiv.classList.add("gold-place");
    } else if (rank === 2) {
      entryDiv.classList.add("silver-place");
    } else if (rank === 3) {
      entryDiv.classList.add("bronze-place");
    }

    var rankSpan = document.createElement("span");
    rankSpan.className = "leaderboard-entry-rank";
    rankSpan.textContent = rank + ".";

    var scoreSpan = document.createElement("span");
    scoreSpan.className = "leaderboard-entry-score";
    scoreSpan.textContent = formatScore(entry.score);

    entryDiv.appendChild(rankSpan);
    entryDiv.appendChild(scoreSpan);
    return entryDiv;
  }

  // Render leaderboard entries
  var leaderboardEl = document.getElementById("leaderboard-entries");
  if (leaderboardEl) {
    leaderboardEl.innerHTML = "";

    // Find rank of the current score in the sorted list
    var currentRank = -1;
    for (var i = 0; i < leaderboard.length; i++) {
      if (leaderboard[i].id === currentEntryId) {
        currentRank = i + 1; // 1-indexed rank
        break;
      }
    }

    // Render top 5
    var limit = Math.min(leaderboard.length, 5);
    for (var index = 0; index < limit; index++) {
      var entry = leaderboard[index];
      var entryDiv = createEntryElement(entry, index + 1, entry.id === currentEntryId);
      leaderboardEl.appendChild(entryDiv);
    }

    // If current score is not in the top 5, append a separator and the current score entry
    if (currentRank > 5) {
      var sepDiv = document.createElement("div");
      sepDiv.className = "leaderboard-separator";
      sepDiv.textContent = "• • •";
      leaderboardEl.appendChild(sepDiv);

      var userEntry = leaderboard[currentRank - 1];
      var entryDiv = createEntryElement(userEntry, currentRank, true);
      leaderboardEl.appendChild(entryDiv);
    }
  }

  el.classList.add("visible");

  // Restore Wii cursor for the end screen
  $("body").removeClass("in-game").addClass("end-screen-open");

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
  $("body").addClass("in-game").removeClass("end-screen-open");
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
