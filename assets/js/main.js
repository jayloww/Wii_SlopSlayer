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
  // go to main menu when channel is clicked
	$("body").on("click", ".occupied .hover", function(){
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

	// back to main menu
	$("body").on("click", ".menu-btn", function(){
		stopIdleTimer();
		$( ".main-menu" ).removeClass( "channel-splash" );
		$( "body" ).removeClass( "channel-splash" );
		$( "body" ).addClass( "splash-switch" );
		delay(function(){
			$( "body" ).removeClass( "splash-switch" );
		}, 900 );
	});

	// ignore screen warning
	$("body").on("click", ".screen-message", function(){
		$( ".screen-message" ).addClass( "hidden" );
	});
});
