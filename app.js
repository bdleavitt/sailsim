const canvas = document.getElementById("simCanvas");
const state = SailSim.createState();
const controls = SailSim.createControls(state);
const renderer = SailSim.createRenderer(canvas, state);

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
