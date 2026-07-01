let currentSlideIndex = 0;
const totalSlides = 5;

// Variables for slice detection
let isSwiping = false;
let startX, startY;
let startTime;

// Reset presentation state when loading
function initPresentation() {
  currentSlideIndex = 0;
  updateSlides();
  setupSwipeZone();
}

function updateSlides() {
  const slides = document.querySelectorAll('.pres-slide');
  if (!slides || slides.length === 0) return;

  slides.forEach((slide, index) => {
    if (index === currentSlideIndex) {
      slide.classList.add('active');
      slide.style.visibility = 'visible';
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

// Spark/Particle Generator
function createSparks(sx, sy, ex, ey) {
  const container = document.getElementById('presentation-container');
  if (!container) return;

  const numSparks = 25;
  const dx = ex - sx;
  const dy = ey - sy;

  for (let i = 0; i < numSparks; i++) {
    const pct = i / (numSparks - 1);
    const x = sx + dx * pct;
    const y = sy + dy * pct;

    const spark = document.createElement('div');
    spark.className = 'pres-spark';
    container.appendChild(spark);

    spark.style.left = `${x}px`;
    spark.style.top = `${y}px`;

    // Random direction and velocity
    const angle = Math.random() * Math.PI * 2;
    const speed = 100 + Math.random() * 250; // px/sec
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    spark.style.setProperty('--vx', `${vx}px`);
    spark.style.setProperty('--vy', `${vy}px`);

    // Reflow and fly
    spark.offsetHeight;
    spark.classList.add('fly');

    setTimeout(() => {
      if (container.contains(spark)) container.removeChild(spark);
    }, 800);
  }
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

// Slice animation logic
function sliceToNextSlide(sx, sy, ex, ey) {
  if (currentSlideIndex >= totalSlides - 1) {
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

  // Create visual slice FX (glowing trail & spark burst)
  createSlashTrail(sx, sy, ex, ey);
  createSparks(sx, sy, ex, ey);

  const container = document.getElementById('presentation-container');
  const currentSlide = document.getElementById('pres-slide-' + currentSlideIndex);
  
  if (!currentSlide || !container) return;

  // Clone current slide twice for the two halves
  const clone1 = currentSlide.cloneNode(true);
  const clone2 = currentSlide.cloneNode(true);

  clone1.id = '';
  clone2.id = '';
  
  clone1.className = 'slice-layer slice-half-1';
  clone2.className = 'slice-layer slice-half-2';

  // Append clones
  container.appendChild(clone1);
  container.appendChild(clone2);

  // Hide original slide and go to next
  currentSlide.classList.remove('active');
  currentSlide.style.visibility = 'hidden'; 
  
  currentSlideIndex++;
  const nextSlideEl = document.getElementById('pres-slide-' + currentSlideIndex);
  if (nextSlideEl) {
    nextSlideEl.classList.add('active');
    nextSlideEl.style.visibility = 'visible';
  }

  // Clean up clones after animation
  setTimeout(() => {
    if (container.contains(clone1)) container.removeChild(clone1);
    if (container.contains(clone2)) container.removeChild(clone2);
  }, 1000);
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
