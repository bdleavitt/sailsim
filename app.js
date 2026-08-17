const canvas = document.getElementById("simCanvas");
const simCard = document.querySelector(".sim-card");
const fullscreenButton = document.getElementById("fullscreenButton");
const state = SailSim.createState();
const controls = SailSim.createControls(state);
const renderer = SailSim.createRenderer(canvas, state);

// Match the canvas drawing buffer to its displayed size so it fills the screen correctly (esp. on mobile/full screen).
function resizeCanvasToDisplaySize() {
  const rect = canvas.getBoundingClientRect();
  const width = Math.round(rect.width);
  const height = Math.round(rect.height);
  if (width > 0 && height > 0 && (canvas.width !== width || canvas.height !== height)) {
    canvas.width = width;
    canvas.height = height;
  }
}

function isFullscreenActive() {
  return simCard.classList.contains("is-fullscreen");
}

function enterFullscreen() {
  simCard.classList.add("is-fullscreen");
  document.body.classList.add("fullscreen-active");
  const request = simCard.requestFullscreen || simCard.webkitRequestFullscreen;
  if (request) request.call(simCard).catch(() => {});
  resizeCanvasToDisplaySize();
}

function exitFullscreen() {
  simCard.classList.remove("is-fullscreen");
  document.body.classList.remove("fullscreen-active");
  if (document.fullscreenElement || document.webkitFullscreenElement) {
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (exit) exit.call(document).catch(() => {});
  }
  resizeCanvasToDisplaySize();
}

if (fullscreenButton) {
  fullscreenButton.addEventListener("click", () => {
    if (isFullscreenActive()) exitFullscreen();
    else enterFullscreen();
  });
}

document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement && isFullscreenActive()) exitFullscreen();
});
document.addEventListener("webkitfullscreenchange", () => {
  if (!document.webkitFullscreenElement && isFullscreenActive()) exitFullscreen();
});
window.addEventListener("resize", resizeCanvasToDisplaySize);
window.addEventListener("orientationchange", resizeCanvasToDisplaySize);
if (window.ResizeObserver) {
  new ResizeObserver(resizeCanvasToDisplaySize).observe(canvas);
}
resizeCanvasToDisplaySize();

let previousTime = performance.now();

function animationLoop(time) {
  const elapsedSeconds = Math.min((time - previousTime) / 1000, 0.04);
  previousTime = time;

  SailSim.physics.update(state, elapsedSeconds);
  renderer.draw();
  controls.updateReadouts();
  requestAnimationFrame(animationLoop);
}

requestAnimationFrame(animationLoop);
