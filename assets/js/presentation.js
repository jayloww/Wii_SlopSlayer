let currentSlideIndex = 0;
const totalSlides = 5;

// Variables for slice detection
let isSwiping = false;
let startX, startY;
let startTime;

// Background animation variables
let bgAnimationInterval;
const aiImageAssets = [
  'cactus-elephant-clock 1.png',
  'frog-tire 1.png',
  'tree-figure 1.png',
  'image 21.png',
  'image 22.png',
  'image 23.png',
  'image 24.png',
  'image 25.png',
  'image 27.png',
  'image 29.png',
  'image 31.png'
];

// Reset presentation state when loading
function initPresentation() {
  currentSlideIndex = 0;
  updateSlides();
  setupSwipeZone();
  startBackgroundLoop();
}

// Clean up background loop if exiting
function stopBackgroundLoop() {
  if (bgAnimationInterval) {
    clearInterval(bgAnimationInterval);
    bgAnimationInterval = null;
  }
}

function startBackgroundLoop() {
  stopBackgroundLoop(); // Ensure no duplicates
  // Spawn an image every 2.5 seconds
  bgAnimationInterval = setInterval(spawnFlyingImage, 2500);
  // Spawn a few immediately
  for(let i=0; i<3; i++) {
    setTimeout(spawnFlyingImage, i * 500);
  }
}

function spawnFlyingImage() {
  const container = document.getElementById('bg-flying-images');
  if (!container || currentView !== "presentation") {
    stopBackgroundLoop();
    return;
  }

  const img = document.createElement('img');
  const randomImage = aiImageAssets[Math.floor(Math.random() * aiImageAssets.length)];
  img.src = `assets/images/AI/${randomImage}`;
  img.className = 'flying-bg-img';
  
  // Random start position (usually offscreen right or bottom)
  const startX = window.innerWidth + 100;
  const startY = Math.random() * window.innerHeight;
  
  // Random end position (offscreen left)
  const endX = -200;
  const endY = startY + (Math.random() * 400 - 200);

  img.style.left = startX + 'px';
  img.style.top = startY + 'px';
  
  // Random size and rotation
  const scale = 0.5 + Math.random() * 0.8;
  const startRot = Math.random() * 360;
  const endRot = startRot + (Math.random() * 360 - 180);

  img.style.transform = `scale(${scale}) rotate(${startRot}deg)`;
  
  container.appendChild(img);

  // Animate using Web Animations API
  const duration = 8000 + Math.random() * 6000;
  
  const animation = img.animate([
    { transform: `translate(0, 0) scale(${scale}) rotate(${startRot}deg)` },
    { transform: `translate(${endX - startX}px, ${endY - startY}px) scale(${scale}) rotate(${endRot}deg)` }
  ], {
    duration: duration,
    easing: 'linear',
    fill: 'forwards'
  });

  animation.onfinish = () => {
    if (container.contains(img)) {
      container.removeChild(img);
    }
  };
}


function updateSlides() {
  const slides = document.querySelectorAll('.pres-slide');
  if (!slides || slides.length === 0) return;

  slides.forEach((slide, index) => {
    if (index === currentSlideIndex) {
      slide.classList.add('active');
    } else {
      slide.classList.remove('active');
    }
  });
}

function nextSlide() {
  select(); // play select audio
  if (currentSlideIndex < totalSlides - 1) {
    // Generate mock diagonal cut coordinates for button press
    const width = window.innerWidth;
    const height = window.innerHeight;
    const sx = width * 0.8;
    const sy = height * 0.2;
    const ex = width * 0.2;
    const ey = height * 0.8;
    sliceToNextSlide(sx, sy, ex, ey);
  } else {
    stopBackgroundLoop();
    exitPresentation(); // Exit if last slide
  }
}

function prevSlide() {
  select(); // play select audio
  if (currentSlideIndex > 0) {
    currentSlideIndex--;
    updateSlides();
  }
}

// High-Performance Canvas Spark/Particle Generator
function createSparksCanvas(sx, sy, ex, ey) {
  const container = document.getElementById('presentation-container');
  if (!container) return;

  const canvas = document.createElement('canvas');
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '99';
  container.appendChild(canvas);

  // Set logical resolution matching window viewport
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const ctx = canvas.getContext('2d');
  const particles = [];
  const dx = ex - sx;
  const dy = ey - sy;
  const numSparks = 30;

  // Generate particles along the swipe vector
  for (let i = 0; i < numSparks; i++) {
    const pct = i / (numSparks - 1);
    const px = sx + dx * pct;
    const py = sy + dy * pct;

    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 6; // pixels per frame
    const size = 2 + Math.random() * 3;
    const decay = 0.015 + Math.random() * 0.02;

    particles.push({
      x: px,
      y: py,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: size,
      alpha: 1,
      decay: decay
    });
  }

  // Animation Loop running on compositor frame rates
  function drawFrame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let hasActiveParticles = false;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (p.alpha > 0) {
        // Move with drag friction
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1; // subtle gravity drift
        p.alpha -= p.decay;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#00aaff'; // Updated to professional blue
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        hasActiveParticles = true;
      }
    }

    if (hasActiveParticles) {
      requestAnimationFrame(drawFrame);
    } else {
      if (container.contains(canvas)) {
        container.removeChild(canvas);
      }
    }
  }

  requestAnimationFrame(drawFrame);
}

// Glowing Sword-Slash Trail
function createSlashTrail(sx, sy, ex, ey) {
  const container = document.getElementById('presentation-container');
  if (!container) return;

  const dx = ex - sx;
  const dy = ey - sy;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);

  const trail = document.createElement('div');
  trail.className = 'slash-trail';
  container.appendChild(trail);

  trail.style.width = `${distance}px`;
  trail.style.left = `${sx}px`;
  trail.style.top = `${sy}px`;
  trail.style.transform = `rotate(${angle}rad) scaleY(1)`;

  // Reflow and animate transition
  trail.offsetHeight;
  trail.style.opacity = '0';
  trail.style.transform = `rotate(${angle}rad) scaleY(0)`;

  setTimeout(() => {
    if (container.contains(trail)) container.removeChild(trail);
  }, 400);
}

// Custom Slice animation logic
function sliceToNextSlide(sx, sy, ex, ey) {
  if (currentSlideIndex >= totalSlides - 1) {
    stopBackgroundLoop();
    exitPresentation();
    return;
  }

  // Ensure coordinate fallback if called without parameters
  if (sx === undefined || sy === undefined || ex === undefined || ey === undefined) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    sx = width * 0.8;
    sy = height * 0.2;
    ex = width * 0.2;
    ey = height * 0.8;
  }

  // Play slash sound if available
  const slashAudio = document.getElementById('slash-sound');
  if (slashAudio) {
    slashAudio.currentTime = 0;
    slashAudio.play().catch(e => console.log("Audio play error", e));
  }

  // Create visual slice FX (glowing trail & spark burst)
  createSlashTrail(sx, sy, ex, ey);
  createSparksCanvas(sx, sy, ex, ey);

  const container = document.getElementById('presentation-container');
  const currentSlide = document.getElementById('pres-slide-' + currentSlideIndex);
  
  if (!currentSlide || !container) return;

  // Clone current slide twice for the two halves
  const clone1 = currentSlide.cloneNode(true);
  const clone2 = currentSlide.cloneNode(true);

  clone1.id = '';
  clone2.id = '';
  
  clone1.classList.remove('active');
  clone2.classList.remove('active');

  // Wrappers to apply the slice animations over the background
  const wrapper1 = document.createElement('div');
  wrapper1.className = 'slice-layer slice-half-1';
  wrapper1.appendChild(clone1);

  const wrapper2 = document.createElement('div');
  wrapper2.className = 'slice-layer slice-half-2';
  wrapper2.appendChild(clone2);

  // Append clones
  container.appendChild(wrapper1);
  container.appendChild(wrapper2);

  // Update slide index and switch active class
  currentSlideIndex++;
  updateSlides();

  // Clean up clones after animation
  setTimeout(() => {
    if (container.contains(wrapper1)) container.removeChild(wrapper1);
    if (container.contains(wrapper2)) container.removeChild(wrapper2);
  }, 800);
}

// Swipe detection logic
function setupSwipeZone() {
  if (window.presSwipeInitialized) return;
  window.presSwipeInitialized = true;

  document.addEventListener('mousedown', handleSwipeStart);
  document.addEventListener('touchstart', handleSwipeStart, {passive: false});

  document.addEventListener('mouseup', handleSwipeEnd);
  document.addEventListener('touchend', handleSwipeEnd);
}

function handleSwipeStart(e) {
  if (currentView !== "presentation") return;
  
  isSwiping = true;
  if (e.type === 'touchstart') {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  } else {
    startX = e.clientX;
    startY = e.clientY;
  }
  startTime = Date.now();
}

function handleSwipeEnd(e) {
  if (currentView !== "presentation" || !isSwiping) return;
  isSwiping = false;

  let endX, endY;
  if (e.type === 'touchend') {
    endX = e.changedTouches[0].clientX;
    endY = e.changedTouches[0].clientY;
  } else {
    endX = e.clientX;
    endY = e.clientY;
  }
  const endTime = Date.now();

  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  const duration = endTime - startTime;

  // If the swipe was fast and long enough, trigger slice with exact coordinates
  // Threshold: distance > 150px and duration < 500ms
  if (distance > 150 && duration < 500) {
    sliceToNextSlide(startX, startY, endX, endY);
  }
}
