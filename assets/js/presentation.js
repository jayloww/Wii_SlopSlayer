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
    currentSlideIndex++;
    updateSlides();
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

// Slice animation logic
function sliceToNextSlide() {
  if (currentSlideIndex >= totalSlides - 1) {
    exitPresentation();
    return;
  }

  // Play slash sound if available
  const slashAudio = document.getElementById("slash-sound");
  if (slashAudio) {
    slashAudio.currentTime = 0;
    slashAudio.play();
  }

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
  currentSlide.style.visibility = 'hidden'; // Ensure it's hidden immediately beneath clones
  
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
  // We attach to document body but only act if in presentation mode
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

  // If the swipe was fast and long enough, trigger slice
  // Threshold: distance > 150px and duration < 500ms
  if (distance > 150 && duration < 500) {
    sliceToNextSlide();
  }
}
