var gameTimerInterval = null;
var gameElapsedSeconds = 0;
var gameScore = 0;
var gameMaxSeconds = 180;

var ITEMS_POOL = [];
var gameCanvas = null;
var gameCtx = null;
var gameItems = [];
var gameAnimationFrame = null;
var spawnTimer = 0;
const GRAVITY = 0.11;

const aiImages = [
  "Cyber_Frame_Mockup.jpg", "NYC_generated.jpg", "Nature_Frame_Mockup.jpg", 
  "abstract_art_generated.jpg", "architecture_generated.jpg", "banana-hound.png", 
  "banana-usb.jpg", "blue-runner-shark.jpg", "cactus-elephant-clock.jpg", 
  "capybara-call-center.png", "cat_loaf.jpg", "crocodile-wrestle.png", 
  "espresso-goose.png", "fire.png", "frog-tire.png", "glass-dachshund.png", 
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
  
  const x = gameCanvas.width * (0.2 + Math.random() * 0.6);
  const y = gameCanvas.height + 60;
  
  const targetX = gameCanvas.width / 2 + (Math.random() - 0.5) * 200;
  const peakHeight = gameCanvas.height * (0.15 + Math.random() * 0.35);
  
  const dy = peakHeight - y;
  const vy = -Math.sqrt(Math.abs(2 * GRAVITY * dy));
  
  const t = Math.abs(vy / GRAVITY);
  const vx = (targetX - x) / t;
  
  gameItems.push({
    image: proto.image,
    type: proto.type,
    x: x,
    y: y,
    vx: vx,
    vy: vy,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.025
  });
}

function gameLoop() {
  if (!gameCanvas || !gameCtx) return;
  
  gameCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
  
  spawnTimer++;
  // Spawn every ~1.5s (90 frames)
  if (spawnTimer >= 90) {
    spawnTimer = 0;
    throwItem();
  }
  
  for (let i = gameItems.length - 1; i >= 0; i--) {
    const item = gameItems[i];
    item.y += item.vy;
    item.x += item.vx;
    item.vy += GRAVITY;
    item.rotation += item.rotationSpeed;
    
    // Remove if it falls below screen
    if (item.y > gameCanvas.height + 200 && item.vy > 0) {
      gameItems.splice(i, 1);
      continue;
    }
    
    gameCtx.save();
    gameCtx.translate(item.x, item.y);
    gameCtx.rotate(item.rotation);
    
    // Draw 1:1 image with rounded corners
    const size = 150;
    const half = size / 2;
    
    // Add subtle shadow for depth
    gameCtx.shadowBlur = 10;
    gameCtx.shadowColor = "rgba(0, 0, 0, 0.4)";
    
    gameCtx.beginPath();
    gameCtx.roundRect(-half, -half, size, size, 16);
    gameCtx.fillStyle = "#fff";
    gameCtx.fill(); // fill to render shadow and background
    
    gameCtx.shadowColor = "transparent"; // disable shadow for image clip
    gameCtx.clip();
    
    // Center and crop the image to 1:1
    const img = item.image;
    if (img.complete && img.naturalWidth > 0) {
      const minDim = Math.min(img.naturalWidth, img.naturalHeight);
      const sx = (img.naturalWidth - minDim) / 2;
      const sy = (img.naturalHeight - minDim) / 2;
      gameCtx.drawImage(img, sx, sy, minDim, minDim, -half, -half, size, size);
    }
    
    gameCtx.restore();
  }
  
  gameAnimationFrame = requestAnimationFrame(gameLoop);
}

function formatGameTime(totalSeconds) {
  var minutes = Math.floor(totalSeconds / 60);
  var seconds = totalSeconds % 60;
  return minutes.toString().padStart(2, "0") + ":" + seconds.toString().padStart(2, "0");
}

function formatScore(value) {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function getHighScore() {
  var stored = localStorage.getItem("wii-game-highscore");
  return stored ? parseInt(stored, 10) : 8750;
}

function setHighScore(value) {
  localStorage.setItem("wii-game-highscore", value);
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
}

function updateGameHud() {
  $("#game-timer").text(formatGameTime(gameElapsedSeconds));
  $("#game-score").text(formatScore(gameScore));
  $("#game-highscore").text(formatScore(getHighScore()));

  var progress = Math.min((gameElapsedSeconds / gameMaxSeconds) * 100, 100);
  $("#game-progress").css("width", progress + "%");
}

function initGame() {
  stopGameTimer();
  
  gameCanvas = document.getElementById("game-canvas");
  if (gameCanvas) {
    gameCtx = gameCanvas.getContext("2d");
    resizeCanvas();
    gameItems = [];
    spawnTimer = 0;
    gameLoop();
  }

  gameElapsedSeconds = 0;
  gameScore = 0;
  updateGameHud();

  gameTimerInterval = setInterval(function() {
    gameElapsedSeconds += 1;
    updateGameHud();
  }, 1000);
}

function startGame() {
  select();
  previousView = currentView || "menu";
  changeView("game", "fade");
}
