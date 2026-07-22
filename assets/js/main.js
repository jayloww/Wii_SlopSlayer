// The whole app is authored at a fixed 1920x1080 reference resolution (see
// universal.css #viewport-stage). Scale + letterbox that box to fit whatever
// real screen/window we're actually running on, so the layout, HUD and game
// physics look identical regardless of the display's aspect ratio.
var VIEWPORT_STAGE_WIDTH = 1920;
var VIEWPORT_STAGE_HEIGHT = 1080;

function fitViewportStage() {
  var stage = document.getElementById("viewport-stage");
  if (!stage) return;

  var scale = Math.min(
    window.innerWidth / VIEWPORT_STAGE_WIDTH,
    window.innerHeight / VIEWPORT_STAGE_HEIGHT
  );
  var offsetX = (window.innerWidth - VIEWPORT_STAGE_WIDTH * scale) / 2;
  var offsetY = (window.innerHeight - VIEWPORT_STAGE_HEIGHT * scale) / 2;

  stage.style.transform = "translate(" + offsetX + "px, " + offsetY + "px) scale(" + scale + ")";
}

window.addEventListener("resize", fitViewportStage);
// This script runs in <head>, before #viewport-stage (in <body>) exists yet,
// so the very first fit has to wait for the DOM instead of running inline.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", fitViewportStage);
} else {
  fitViewportStage();
}

//delay
var delay = ( function() {
    var timer = 0;
    return function(callback, ms) {
        clearTimeout (timer);
        timer = setTimeout(callback, ms);
    };
})();

// idle timer — returns to main menu after 1 minute of no interaction
var idleTimer = null;
var idleActive = false;
var IDLE_TIMEOUT_MS = 60000;

function idleReturnToMenu() {
  idleActive = false;
  clearTimeout(idleTimer);

  // stop game if running
  if (typeof stopGameTimer === "function") stopGameTimer();

  // reset audio
  ["idle-music", "game-music"].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) { el.pause(); el.currentTime = 0; }
  });
  var bg = document.getElementById("bg-music");
  if (bg) bg.play();

  // remove splash classes
  $(".main-menu").removeClass("channel-splash");
  $("body").removeClass("channel-splash").addClass("splash-switch");
  delay(function() { $("body").removeClass("splash-switch"); }, 900);

  // navigate to menu
  if (typeof changeView === "function") changeView("menu", "fade");
}

function resetIdleTimer() {
  if (!idleActive) return;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(idleReturnToMenu, IDLE_TIMEOUT_MS);
}

function startIdleTimer() {
  idleActive = true;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(idleReturnToMenu, IDLE_TIMEOUT_MS);
}

function stopIdleTimer() {
  idleActive = false;
  clearTimeout(idleTimer);
}

document.addEventListener("mousemove", resetIdleTimer, { passive: true });


// UI audio
function hover(){
	var audio = document.getElementById("hover");
	audio.play();
}

// click audio
function select(){
	var audio = document.getElementById("select");
	audio.play();
}

// zip audio
function zip(){
	var audio = document.getElementById("zip");
	audio.play();
	select();
	var bg = document.getElementById("bg-music");
	if (bg) bg.pause();
	var idle = document.getElementById("idle-music");
	if (idle) idle.play();
}

// back
function back(){
	var audio = document.getElementById("back");
	audio.play();
	var idle = document.getElementById("idle-music");
	if (idle) idle.pause();
	var bg = document.getElementById("bg-music");
	if (bg) bg.play();
}

// date & time
const monthNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function updateDateTime() {
	const now = new Date();
	weekday = monthNames[now.getDay()];
	day = now.getDate();
	month = now.getMonth() + 1;
	date = weekday + " " + month + "/" + day;

	let hours = now.getHours();
	const minutes = now.getMinutes().toString().padStart(2, "0");
	const ampm = hours >= 12 ? "PM" : "AM";
	hours = hours % 12 || 12;
	menuTime = hours + ":" + minutes + " " + ampm;

	$(document).find(".date span").text(date);
	$(document).find(".menu-time").text(menuTime);
}

function fitChannelGrid() {
	var $top = $(".top-section");
	var $grid = $(".channels");
	if (!$top.length || !$grid.length) return;

	$grid.css("transform", "none");
	var scaleX = ($top.width() - 160) / $grid.outerWidth();
	var scaleY = ($top.height() - 40) / $grid.outerHeight();
	var scale = Math.min(scaleX, scaleY);

	$grid.css({
		transform: "scale(" + scale + ")",
		transformOrigin: "center center"
	});
}

updateDateTime();
setInterval(updateDateTime, 1000);

$( document ).ready(function() {
  $(window).on("resize", fitChannelGrid);

  // Block native image drag (Wii remote / mouse jitter otherwise drags the channel art)
  document.addEventListener("dragstart", function (e) {
    if (e.target && e.target.tagName === "IMG") e.preventDefault();
  }, true);

  // Use mousedown — Wii remotes often fail to produce a clean click event
  $("body").on("mousedown", ".occupied .hover", function (e) {
    if (e.button !== 0) return;
    e.preventDefault();

    zip();

    var centerX = $(this).offset().left + $(this).width() / 2;
    var centerY = $(this).offset().top + $(this).height() / 2;
    $( ".main-menu" ).css( {"transform-origin" : centerX + "px " + centerY + "px 0px"} );

    var img = $( this ).attr( "data-img" );
    $( ".splash-screen" ).css( {"background-image" : " url(" + img + ")", "transform-origin" : centerX + "px " + centerY + "px 0px"} );

    $( ".main-menu" ).addClass( "channel-splash" );
    $( "body" ).addClass( "channel-splash" );
    delay(function(){
      $( "body" ).removeClass( "splash-switch" );
    }, 900 );
    startIdleTimer();
  });

  $("body").on("mousedown", ".start-btn", function (e) {
    if (e.button !== 0) return;
    e.preventDefault();
    if (typeof startGame === "function") startGame();
  });

	// back to main menu
	$("body").on("mousedown", ".menu-btn", function (e) {
    if (e.button !== 0) return;
    e.preventDefault();
		stopIdleTimer();
		$( ".main-menu" ).removeClass( "channel-splash" );
		$( "body" ).removeClass( "channel-splash" );
		$( "body" ).addClass( "splash-switch" );
		delay(function(){
			$( "body" ).removeClass( "splash-switch" );
		}, 900 );
	});

});
