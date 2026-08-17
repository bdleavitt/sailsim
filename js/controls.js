window.SailSim = window.SailSim || {};

SailSim.createControls = function createControls(state) {
  const inputs = {
    rudderAngle: document.getElementById("rudderAngle"),
    holdRudder: document.getElementById("holdRudder"),
    headingUp: document.getElementById("headingUp"),
    sheetTension: document.getElementById("sheetTension"),
    motorMode: document.getElementById("motorMode"),
    motorThrottle: document.getElementById("motorThrottle"),
    windDirection: document.getElementById("windDirection"),
    windSpeed: document.getElementById("windSpeed")
  };

  const restartButton = document.getElementById("restartButton");

  const labels = {
    rudderValue: document.getElementById("rudderValue"),
    sheetValue: document.getElementById("sheetValue"),
    motorValue: document.getElementById("motorValue"),
    windDirValue: document.getElementById("windDirValue"),
    windSpeedValue: document.getElementById("windSpeedValue"),
    headingReadout: document.getElementById("headingReadout"),
    speedReadout: document.getElementById("speedReadout"),
    apparentReadout: document.getElementById("apparentReadout"),
    positionReadout: document.getElementById("positionReadout"),
    navigationReadout: document.getElementById("navigationReadout"),
    pointOfSailLabel: document.getElementById("pointOfSailLabel"),
    sailControls: document.getElementById("sailControls"),
    motorControls: document.getElementById("motorControls")
  };

  let rudderReturnFrame = 0;
  let rudderIsHeld = false;

  function updateReadouts() {
    const math = SailSim.math;
    labels.rudderValue.textContent = `${state.rudderDeg.toFixed(0)}°`;
    labels.sheetValue.textContent = `${state.sheetTension.toFixed(0)}%`;
    labels.motorValue.textContent = `${state.motorThrottle.toFixed(0)}%`;
    labels.windDirValue.textContent = `${state.windFromDeg.toFixed(0)}° ${math.compassName(state.windFromDeg)}`;
    labels.windSpeedValue.textContent = `${state.windKn.toFixed(1)} kn`;
    labels.headingReadout.textContent = `${((math.radToDeg(state.boat.heading) + 360) % 360).toFixed(0)}°`;
    labels.speedReadout.textContent = `${state.boat.speedWater.toFixed(1)} kn`;
    labels.apparentReadout.textContent = `${state.apparentWindKn.toFixed(1)} kn`;

    const eastWest = state.boat.worldX >= 0 ? "E" : "W";
    const northSouth = state.boat.worldY <= 0 ? "N" : "S";
    labels.positionReadout.textContent = `${Math.abs(state.boat.worldX).toFixed(0)} m ${eastWest}, ${Math.abs(state.boat.worldY).toFixed(0)} m ${northSouth}`;
    labels.navigationReadout.textContent = state.boat.shoreContact > 0 ? "Shore contact — turn away" : "Clear water";
    labels.navigationReadout.classList.toggle("warning", state.boat.shoreContact > 0);
    labels.pointOfSailLabel.textContent = state.pointOfSail;
  }

  function syncStateFromInputs() {
    state.rudderDeg = Number(inputs.rudderAngle.value);
    state.holdRudder = inputs.holdRudder.checked;
    state.headingUp = inputs.headingUp.checked;
    state.sheetTension = Number(inputs.sheetTension.value);
    state.motorMode = inputs.motorMode.checked;
    state.motorThrottle = Number(inputs.motorThrottle.value);
    state.windFromDeg = Number(inputs.windDirection.value);
    state.windKn = Number(inputs.windSpeed.value);
    labels.sailControls.hidden = state.motorMode;
    labels.motorControls.hidden = !state.motorMode;
    if (state.holdRudder) stopRudderReturn();
    updateReadouts();
  }

  Object.values(inputs).forEach((input) => input.addEventListener("input", syncStateFromInputs));

  function restartSimulation() {
    const fresh = SailSim.createState();
    Object.keys(fresh).forEach((key) => {
      if (key === "boat" || key === "sail") Object.assign(state[key], fresh[key]);
      else state[key] = fresh[key];
    });
    inputs.rudderAngle.value = String(fresh.rudderDeg);
    inputs.holdRudder.checked = fresh.holdRudder;
    inputs.headingUp.checked = fresh.headingUp;
    inputs.sheetTension.value = String(fresh.sheetTension);
    inputs.motorMode.checked = fresh.motorMode;
    inputs.motorThrottle.value = String(fresh.motorThrottle);
    inputs.windDirection.value = String(fresh.windFromDeg);
    inputs.windSpeed.value = String(fresh.windKn);
    stopRudderReturn();
    syncStateFromInputs();
  }

  if (restartButton) restartButton.addEventListener("click", restartSimulation);

  function stopRudderReturn() {
    cancelAnimationFrame(rudderReturnFrame);
    rudderReturnFrame = 0;
  }

  function returnRudderToCenter() {
    rudderIsHeld = false;
    if (state.holdRudder) return;
    stopRudderReturn();
    let previousTime = performance.now();

    const settle = (time) => {
      if (rudderIsHeld) return;
      const elapsedSeconds = Math.min((time - previousTime) / 1000, 0.05);
      previousTime = time;
      const returnStep = SailSim.config.RUDDER_RETURN_DEG_PER_SECOND * elapsedSeconds;
      const nextAngle = Math.abs(state.rudderDeg) <= returnStep
        ? 0
        : state.rudderDeg - Math.sign(state.rudderDeg) * returnStep;
      state.rudderDeg = nextAngle;
      inputs.rudderAngle.value = String(Math.round(nextAngle));
      updateReadouts();
      if (nextAngle !== 0) rudderReturnFrame = requestAnimationFrame(settle);
    };

    rudderReturnFrame = requestAnimationFrame(settle);
  }

  const holdRudder = () => {
    rudderIsHeld = true;
    stopRudderReturn();
  };

  // Jump/drag directly to a touch/pointer position instead of requiring the thumb to be grabbed exactly.
  function setRudderFromClientX(clientX) {
    const rect = inputs.rudderAngle.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const min = Number(inputs.rudderAngle.min);
    const max = Number(inputs.rudderAngle.max);
    const value = Math.round(min + ratio * (max - min));
    state.rudderDeg = value;
    inputs.rudderAngle.value = String(value);
    updateReadouts();
  }

  inputs.rudderAngle.addEventListener("pointerdown", (event) => {
    holdRudder();
    setRudderFromClientX(event.clientX);
    inputs.rudderAngle.setPointerCapture(event.pointerId);
  });
  inputs.rudderAngle.addEventListener("pointermove", (event) => {
    if (!rudderIsHeld) return;
    setRudderFromClientX(event.clientX);
  });
  inputs.rudderAngle.addEventListener("keydown", holdRudder);
  inputs.rudderAngle.addEventListener("keyup", returnRudderToCenter);
  inputs.rudderAngle.addEventListener("blur", returnRudderToCenter);
  window.addEventListener("pointerup", () => {
    if (rudderIsHeld) returnRudderToCenter();
  });
  window.addEventListener("pointercancel", () => {
    if (rudderIsHeld) returnRudderToCenter();
  });

  // Global left/right arrow keys drive the rudder without needing focus on the slider (game-style helm).
  const KEY_RUDDER_DEG_PER_SECOND = 90;
  let keyRudderFrame = 0;
  let keyRudderDirection = 0;
  let keyRudderPreviousTime = 0;

  function keyRudderTick(time) {
    if (keyRudderDirection === 0) {
      keyRudderFrame = 0;
      return;
    }
    const elapsedSeconds = Math.min((time - keyRudderPreviousTime) / 1000, 0.05);
    keyRudderPreviousTime = time;
    const min = Number(inputs.rudderAngle.min);
    const max = Number(inputs.rudderAngle.max);
    const step = KEY_RUDDER_DEG_PER_SECOND * elapsedSeconds;
    const nextAngle = Math.max(min, Math.min(max, state.rudderDeg + keyRudderDirection * step));
    state.rudderDeg = nextAngle;
    inputs.rudderAngle.value = String(Math.round(nextAngle));
    updateReadouts();
    keyRudderFrame = requestAnimationFrame(keyRudderTick);
  }

  function startKeyRudder(direction) {
    holdRudder();
    if (keyRudderDirection === direction) return;
    keyRudderDirection = direction;
    keyRudderPreviousTime = performance.now();
    if (!keyRudderFrame) keyRudderFrame = requestAnimationFrame(keyRudderTick);
  }

  function stopKeyRudder(direction) {
    if (keyRudderDirection !== direction) return;
    keyRudderDirection = 0;
    cancelAnimationFrame(keyRudderFrame);
    keyRudderFrame = 0;
    returnRudderToCenter();
  }

  window.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const active = document.activeElement;
    const otherSliderFocused = active
      && active.tagName === "INPUT"
      && active.type === "range"
      && active !== inputs.rudderAngle;
    if (otherSliderFocused) return;
    event.preventDefault();
    if (event.repeat) return;
    startKeyRudder(event.key === "ArrowLeft" ? -1 : 1);
  });

  window.addEventListener("keyup", (event) => {
    if (event.key === "ArrowLeft") stopKeyRudder(-1);
    else if (event.key === "ArrowRight") stopKeyRudder(1);
  });

  syncStateFromInputs();
  return { updateReadouts };
};
