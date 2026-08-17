window.SailSim = window.SailSim || {};

SailSim.physics = {
  pointOfSailName(offWindDeg) {
    if (offWindDeg < 40) return "In Irons / No-Go Zone";
    if (offWindDeg < 55) return "Close Hauled";
    if (offWindDeg < 70) return "Close Reach";
    if (offWindDeg < 110) return "Beam Reach";
    if (offWindDeg < 160) return "Broad Reach";
    return "Run";
  },

  update(state, dt) {
    const math = SailSim.math;
    const cfg = SailSim.config;
    const { KNOT_TO_PX } = cfg;
    const boat = state.boat;

    // Apparent wind = true wind vector minus the boat's motion through the water.
    const trueWindVec = math.angleToVector(math.degToRad((state.windFromDeg + 180) % 360), state.windKn * KNOT_TO_PX);
    const boatWaterVec = math.angleToVector(boat.heading, boat.speedWater * KNOT_TO_PX);
    const apparentWindVec = {
      x: trueWindVec.x - boatWaterVec.x,
      y: trueWindVec.y - boatWaterVec.y
    };
    const apparentDir = Math.atan2(apparentWindVec.x, -apparentWindVec.y);
    const apparentRel = math.normalizeAngle(apparentDir - boat.heading);
    const side = Math.sign(apparentRel) || state.sail.side || 1;
    // Apparent wind angle measured from the bow to where the wind comes from (0 = head to wind, 180 = dead run).
    const awaDeg = 180 - Math.abs(math.radToDeg(apparentRel));
    const aws = math.vectorMagnitude(apparentWindVec) / KNOT_TO_PX;
    state.apparentWindKn = aws;

    const offWindDeg = Math.abs(math.radToDeg(math.normalizeAngle(math.degToRad(state.windFromDeg) - boat.heading)));
    state.pointOfSail = state.motorMode ? "Under Power" : this.pointOfSailName(offWindDeg);

    // The wind holds the boom to leeward at the limit the sheet allows (out to the shrouds when fully eased).
    const maxBoomDeg = 10 + (1 - state.sheetTension / 100) * 82;
    // Drive comes from attached flow up to the apparent-wind angle; eased past that the sail luffs.
    const trimBoomDeg = Math.min(awaDeg, maxBoomDeg);
    const alphaDeg = awaDeg - trimBoomDeg;
    const alpha = math.degToRad(alphaDeg);

    // Flat-plate lift/drag, then projected onto the heading for driving force.
    const cl = cfg.SAIL_CL * Math.sin(2 * alpha);
    const cd = cfg.SAIL_CD * (1 - Math.cos(2 * alpha)) * 0.5;
    const awaRad = math.degToRad(awaDeg);
    let driveCoef = cl * Math.sin(awaRad) - cd * Math.cos(awaRad);

    // Luff in the no-go zone, or when the sail is eased too far to keep flow attached.
    const luffFromNoGo = 1 - math.smoothstep(34, 47, offWindDeg);
    const luffFromEase = 1 - math.smoothstep(6, 14, alphaDeg);
    const luff = state.motorMode ? 0 : math.clamp(Math.max(luffFromNoGo, luffFromEase), 0, 1);

    // No forward drive is possible inside the no-go zone.
    const pointing = math.smoothstep(30, 44, offWindDeg);
    driveCoef = Math.max(0, driveCoef) * pointing * (1 - luff * 0.92);

    const sailDrive = state.motorMode ? 0 : cfg.SAIL_DRIVE * aws * aws * driveCoef;
    const motorTargetSpeed = state.motorMode ? state.motorThrottle * 0.06 : 0;
    const motorDrive = state.motorMode ? (motorTargetSpeed - boat.speedWater) * 0.9 : 0;
    const hullDrag = cfg.HULL_DRAG * boat.speedWater * boat.speedWater;
    boat.speedWater = math.clamp(boat.speedWater + (sailDrive + motorDrive - hullDrag) * dt, 0, cfg.MAX_BOAT_KN);

    const targetBoom = side * math.degToRad(state.motorMode ? 0 : maxBoomDeg);
    // The boom whips across during a downwind jibe, drifts across while luffing through a tack,
    // and otherwise trims at a steady rate that firms up in stronger wind.
    const boomCrossing = Math.sign(targetBoom) !== Math.sign(state.sail.angle) && Math.abs(state.sail.angle) > 0.03;
    const jibing = boomCrossing && offWindDeg > 115;
    const responseRate = jibing ? 12 : boomCrossing ? 2.4 : 3 + aws * 0.15;
    const sailResponse = Math.min(1, dt * responseRate);
    state.sail.angle += math.normalizeAngle(targetBoom - state.sail.angle) * sailResponse;
    state.sail.side = Math.sign(state.sail.angle) || side;
    state.sail.luff += (luff - state.sail.luff) * Math.min(1, dt * 6);
    // A jibe momentarily collapses the sail as it slams through dead downwind.
    const drawTarget = state.motorMode ? 0 : (jibing ? 0 : 1 - luff);
    state.sail.draw += (drawTarget - state.sail.draw) * Math.min(1, dt * (jibing ? 12 : 4));

    const turnAuthority = math.clamp(boat.speedWater / 6, 0.05, 1);
    const targetYaw = math.degToRad(state.rudderDeg) * turnAuthority * 0.8;
    boat.yawRate += (targetYaw - boat.yawRate) * 2.8 * dt;
    boat.heading = math.normalizeAngle(boat.heading + boat.yawRate * dt);

    const boatVelocity = math.angleToVector(boat.heading, boat.speedWater * KNOT_TO_PX);
    SailSim.lake.moveBoat(state, boatVelocity.x, boatVelocity.y, dt);
  }
};
