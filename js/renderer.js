window.SailSim = window.SailSim || {};

SailSim.createRenderer = function createRenderer(canvas, state) {
  const ctx = canvas.getContext("2d");
  const math = SailSim.math;
  const config = SailSim.config;

  function traceLakeOutline() {
    ctx.beginPath();
    config.lakeOutline.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
  }

  function drawLandmark(landmark) {
    ctx.fillStyle = landmark.kind === "dock" ? "#694a32" : "#f5e4ad";
    ctx.beginPath();
    ctx.arc(landmark.x, landmark.y, landmark.kind === "dock" ? 8 : 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = "600 13px Space Grotesk";
    ctx.fillStyle = "rgba(26, 49, 38, 0.9)";
    ctx.fillText(landmark.name, landmark.x + 12, landmark.y + 5);
  }

  function drawLake() {
    const centerX = canvas.width * 0.5;
    const centerY = canvas.height * config.CANVAS_CENTER_Y;
    const cameraX = state.boat.worldX;
    const cameraY = state.boat.worldY;

    ctx.fillStyle = "#8aa56a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(centerX, centerY);
    if (state.headingUp) ctx.rotate(-state.boat.heading);
    ctx.translate(-cameraX, -cameraY);

    ctx.fillStyle = "#75965d";
    const left = Math.floor((cameraX - canvas.width) / 90) * 90;
    const right = cameraX + canvas.width;
    const top = Math.floor((cameraY - canvas.height) / 90) * 90;
    const bottom = cameraY + canvas.height;
    for (let x = left; x <= right; x += 90) {
      for (let y = top; y <= bottom; y += 90) {
        const jitter = Math.sin(x * 0.013 + y * 0.017) * 18;
        ctx.beginPath();
        ctx.arc(x + jitter, y - jitter * 0.4, 3 + Math.abs(jitter) * 0.08, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    traceLakeOutline();
    ctx.strokeStyle = "rgba(77, 88, 47, 0.65)";
    ctx.lineWidth = 28;
    ctx.stroke();
    ctx.strokeStyle = "#d2b779";
    ctx.lineWidth = 15;
    ctx.stroke();

    ctx.save();
    ctx.clip();
    const gradient = ctx.createLinearGradient(0, -2850, 0, 2850);
    gradient.addColorStop(0, "#87cbea");
    gradient.addColorStop(0.55, "#3f98c4");
    gradient.addColorStop(1, "#2878a5");
    ctx.fillStyle = gradient;
    ctx.fillRect(-config.LAKE_WIDTH, -config.LAKE_HEIGHT, config.LAKE_WIDTH * 2, config.LAKE_HEIGHT * 2);

    drawWaterTexture(cameraX, cameraY);
    drawWorldWind(cameraX, cameraY);
    ctx.restore();

    config.landmarks.forEach(drawLandmark);
    ctx.restore();
  }

  function drawWaterTexture(cameraX, cameraY) {
    const spacing = 76;
    const left = Math.floor((cameraX - canvas.width) / spacing) * spacing;
    const right = cameraX + canvas.width;
    const top = Math.floor((cameraY - canvas.height) / spacing) * spacing;
    const bottom = cameraY + canvas.height;
    const shimmer = performance.now() * 0.0015;

    for (let y = top; y <= bottom; y += spacing) {
      for (let x = left; x <= right; x += spacing) {
        const seed = Math.sin(x * 0.021 + y * 0.017);
        const pulse = 0.5 + Math.sin(shimmer + seed * 5) * 0.5;
        const length = 7 + pulse * 8;
        const offsetX = Math.sin(y * 0.031) * 18;
        const offsetY = Math.cos(x * 0.027) * 12;
        ctx.strokeStyle = `rgba(220,247,255,${0.1 + pulse * 0.11})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x + offsetX - length, y + offsetY);
        ctx.quadraticCurveTo(x + offsetX, y + offsetY - 2, x + offsetX + length, y + offsetY);
        ctx.stroke();
      }
    }
  }

  function drawWorldWind(cameraX, cameraY) {
    const windToAngle = math.degToRad((state.windFromDeg + 180) % 360);
    const windVector = math.angleToVector(windToAngle);
    const cellSize = 230;
    const travelDistance = performance.now() * 0.018 * state.windKn;
    const travel = ((travelDistance % cellSize) + cellSize) % cellSize;
    const leftCell = Math.floor((cameraX - canvas.width * 1.4) / cellSize);
    const rightCell = Math.ceil((cameraX + canvas.width * 1.4) / cellSize);
    const topCell = Math.floor((cameraY - canvas.height * 1.4) / cellSize);
    const bottomCell = Math.ceil((cameraY + canvas.height * 1.4) / cellSize);

    for (let row = topCell; row <= bottomCell; row += 1) {
      for (let col = leftCell; col <= rightCell; col += 1) {
        const seed = Math.abs(Math.sin(col * 12.9898 + row * 78.233));
        if (seed < 0.38) continue;
        const baseX = col * cellSize + seed * 90;
        const baseY = row * cellSize + (seed * 173 % 95);
        const x = baseX + windVector.x * travel;
        const y = baseY + windVector.y * travel;
        const length = 38 + seed * 28;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(windToAngle - Math.PI / 2);
        ctx.strokeStyle = "rgba(255,247,225,0.3)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(length * 0.5, Math.sin(seed * 12 + performance.now() * 0.002) * 3, length, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(length, 0);
        ctx.lineTo(length - 12, -4);
        ctx.lineTo(length - 12, 4);
        ctx.closePath();
        ctx.fillStyle = "rgba(255,242,212,0.4)";
        ctx.fill();
        ctx.restore();
      }
    }
  }

  function drawIndicatorGlyph(cx, cy, angleDeg, color, kind, size) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(math.degToRad(angleDeg) - Math.PI / 2);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-size * 0.6, 0);
    ctx.lineTo(size * 0.8, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(size * 0.8, 0);
    ctx.lineTo(size * 0.55, -size * 0.28);
    ctx.lineTo(size * 0.55, size * 0.28);
    ctx.closePath();
    ctx.fill();
    if (kind === "wind") {
      ctx.strokeStyle = "rgba(255, 221, 169, 0.9)";
      ctx.beginPath();
      ctx.moveTo(-size * 0.25, -size * 0.5);
      ctx.lineTo(size * 0.15, 0);
      ctx.lineTo(-size * 0.25, size * 0.5);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawMeter(x, y, label, value, color, directionDeg, kind) {
    ctx.fillStyle = "rgba(12, 28, 38, 0.22)";
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, 176, 48, 12);
    ctx.fill();
    ctx.stroke();
    drawIndicatorGlyph(x + 22, y + 24, directionDeg, color, kind, 16);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "700 11px Space Grotesk";
    ctx.fillText(label, x + 46, y + 17);
    ctx.font = "700 16px Space Grotesk";
    ctx.fillText(value, x + 46, y + 34);
  }

  function drawHud() {
    const windToDeg = (state.windFromDeg + 180) % 360;
    const displayWindToDeg = state.headingUp ? windToDeg - math.radToDeg(state.boat.heading) : windToDeg;
    drawMeter(18, 18, `WIND FROM ${state.windFromDeg.toFixed(0)}° ${math.compassName(state.windFromDeg)}`, `${state.windKn.toFixed(1)} kn`, "rgba(255,143,67,0.9)", displayWindToDeg, "wind");
    drawMeter(18, 80, "BOAT", `${state.boat.speedWater.toFixed(1)} kn`, "rgba(38,111,166,0.9)", math.radToDeg(state.boat.heading), "boat");
  }

  function drawCompass() {
    const cx = canvas.width - 108;
    const cy = 118;
    const radius = 34;
    const headingDeg = ((math.radToDeg(state.boat.heading) + 360) % 360);

    ctx.fillStyle = "rgba(10,27,37,0.72)";
    ctx.strokeStyle = "rgba(255,255,255,0.32)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.save();
    ctx.translate(cx, cy);
    if (state.headingUp) ctx.rotate(-state.boat.heading);
    for (let i = 0; i < 8; i += 1) {
      const angle = i * Math.PI / 4;
      const outer = math.angleToVector(angle, radius - 5);
      const inner = math.angleToVector(angle, radius - (i % 2 === 0 ? 14 : 10));
      ctx.strokeStyle = i === 0 ? "#ff9d58" : "rgba(255,255,255,0.72)";
      ctx.lineWidth = i % 2 === 0 ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(inner.x, inner.y);
      ctx.lineTo(outer.x, outer.y);
      ctx.stroke();
    }
    ctx.fillStyle = "#ff9d58";
    ctx.font = "700 11px Space Grotesk";
    ctx.textAlign = "center";
    ctx.fillText("N", 0, -radius + 13);
    ctx.restore();

    ctx.save();
    ctx.translate(cx, cy);
    if (!state.headingUp) ctx.rotate(state.boat.heading);
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.lineTo(-5, 8);
    ctx.lineTo(5, 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.font = "700 10px Space Grotesk";
    ctx.textAlign = "center";
    ctx.fillText(`${headingDeg.toFixed(0)}° ${math.compassName(headingDeg)}`, cx, cy + radius + 13);
    ctx.textAlign = "start";
  }

  function drawMiniMap() {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const x = canvas.width - 190;
    const y = 180;
    const width = 164;
    const height = 122;
    const scale = Math.min((width - 18) / config.LAKE_WIDTH, (height - 18) / config.LAKE_HEIGHT);
    ctx.fillStyle = "rgba(10,27,37,0.68)";
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 12);
    ctx.fill();
    ctx.stroke();
    ctx.save();
    ctx.translate(x + width / 2, y + height / 2 + 5);
    ctx.scale(scale, scale);
    traceLakeOutline();
    ctx.fillStyle = "rgba(65,166,211,0.88)";
    ctx.fill();
    ctx.restore();
    const positionX = state.boat.worldX * scale;
    const positionY = state.boat.worldY * scale;
    const markerX = x + width / 2 + positionX;
    const markerY = y + height / 2 + 5 + positionY;
    ctx.fillStyle = state.boat.shoreContact > 0 ? "#ffb45c" : "#fff";
    ctx.beginPath();
    ctx.arc(markerX, markerY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = "700 10px Space Grotesk";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText("LAKE MAP", x + 10, y + 15);
    ctx.restore();
  }

  const POINT_OF_SAIL_BANDS = [
    { from: 0, to: 40, color: "#df5a2c", name: "No-Go" },
    { from: 40, to: 55, color: "#2fa382", name: "Close Hauled" },
    { from: 55, to: 70, color: "#57bd6a", name: "Close Reach" },
    { from: 70, to: 110, color: "#4a90d9", name: "Beam Reach" },
    { from: 110, to: 160, color: "#7b6ad8", name: "Broad Reach" },
    { from: 160, to: 180, color: "#3f6fb0", name: "Run" }
  ];

  function hexToRgba(hex, alpha) {
    const value = parseInt(hex.slice(1), 16);
    return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
  }

  function drawPointOfSailDial(cx, cy, radius) {
    const windRel = math.normalizeAngle(math.degToRad(state.windFromDeg) - state.boat.heading);
    const offWindDeg = Math.abs(math.radToDeg(windRel));
    // Starboard tack (wind over the starboard side) shows on the left, port tack on the right.
    const dialDir = windRel >= 0 ? -1 : 1;
    const top = -Math.PI / 2;
    const activeBand = POINT_OF_SAIL_BANDS.find((band) => offWindDeg >= band.from && offWindDeg < band.to) || POINT_OF_SAIL_BANDS[POINT_OF_SAIL_BANDS.length - 1];

    ctx.fillStyle = "rgba(10,27,37,0.72)";
    ctx.strokeStyle = "rgba(255,255,255,0.32)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    POINT_OF_SAIL_BANDS.forEach((band) => {
      [-1, 1].forEach((dir) => {
        const active = band === activeBand && dir === dialDir && !state.motorMode;
        const a1 = top + dir * math.degToRad(band.from);
        const a2 = top + dir * math.degToRad(band.to);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, a1, a2, dir < 0);
        ctx.closePath();
        ctx.fillStyle = hexToRgba(band.color, active ? 0.95 : 0.24);
        ctx.fill();
        ctx.strokeStyle = "rgba(6,20,29,0.55)";
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    });

    // Boat marker at the exact wind angle, plus a needle from the hub.
    if (!state.motorMode) {
      const markerAngle = top + dialDir * math.degToRad(Math.min(offWindDeg, 180));
      const mr = radius - 8;
      const mx = cx + Math.cos(markerAngle) * mr;
      const my = cy + Math.sin(markerAngle) * mr;
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(mx, my);
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(mx, my, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Wind comes from the top of the dial.
    ctx.fillStyle = "#ff9d58";
    ctx.beginPath();
    ctx.moveTo(cx, cy - radius - 3);
    ctx.lineTo(cx - 6, cy - radius - 13);
    ctx.lineTo(cx + 6, cy - radius - 13);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "700 9px Space Grotesk";
    ctx.textAlign = "center";
    ctx.fillText("WIND", cx, cy - radius - 17);
    ctx.fillStyle = "rgba(10,27,37,0.9)";
    ctx.fillText(state.motorMode ? "MOTORING" : (dialDir === -1 ? "STBD TACK" : "PORT TACK"), cx, cy + 3);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText("POINT OF SAIL", cx, cy + radius + 16);
    ctx.textAlign = "start";
  }

  function drawBoat() {
    const boat = state.boat;
    ctx.save();
    ctx.translate(canvas.width * 0.5, canvas.height * config.CANVAS_CENTER_Y);
    if (!state.headingUp) ctx.rotate(boat.heading);
    ctx.fillStyle = "#1d3d58";
    ctx.beginPath();
    ctx.moveTo(0, -48);
    ctx.bezierCurveTo(9, -40, 17, -18, 17, -2);
    ctx.bezierCurveTo(17, 14, 14, 28, 11, 36);
    ctx.lineTo(-11, 36);
    ctx.bezierCurveTo(-14, 28, -17, 14, -17, -2);
    ctx.bezierCurveTo(-17, -18, -9, -40, 0, -48);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#0d273a";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // Cockpit/deck inset for a boat-like read.
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -34);
    ctx.bezierCurveTo(11, -18, 11, 18, 6, 30);
    ctx.lineTo(-6, 30);
    ctx.bezierCurveTo(-11, 18, -11, -18, 0, -34);
    ctx.closePath();
    ctx.stroke();
    ctx.strokeStyle = "#0d273a";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.lineTo(0, -26);
    ctx.stroke();
    if (state.motorMode) {
      ctx.strokeStyle = "#8c4a22";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(0, 32);
      ctx.stroke();
      ctx.strokeStyle = "rgba(244,238,215,0.9)";
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(0, 28);
      ctx.stroke();
    } else {
      const boomAngle = state.sail.angle;
      const luff = state.sail.luff;
      const draw = state.sail.draw != null ? state.sail.draw : 1 - luff;
      const boomLength = 58;
      const tackX = 0;
      const tackY = -12;
      const clewX = Math.sin(boomAngle) * boomLength;
      const clewY = Math.cos(boomAngle) * boomLength + tackY;
      // Camber always bulges to leeward — the side the boom is on.
      const leeSign = Math.sign(boomAngle) || state.sail.side || 1;
      const nx = leeSign * Math.cos(boomAngle);
      const ny = -leeSign * Math.sin(boomAngle);
      const t = performance.now() * 0.02;

      ctx.strokeStyle = "#8c4a22";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(tackX, tackY);
      ctx.lineTo(clewX, clewY);
      ctx.stroke();

      // Mainsail cloth: a cambered curve from the mast/tack aft to the clew, closed along the boom.
      ctx.beginPath();
      ctx.moveTo(tackX, tackY);
      const segments = 10;
      for (let s = 1; s <= segments; s++) {
        const f = s / segments;
        const bx = tackX + (clewX - tackX) * f;
        const by = tackY + (clewY - tackY) * f;
        const camber = Math.sin(f * Math.PI) * (3 + draw * 15);
        const ripple = luff * Math.sin(t * 3 - f * 7) * (2 + 7 * (1 - f));
        const off = camber + ripple;
        ctx.lineTo(bx + nx * off, by + ny * off);
      }
      ctx.closePath();
      ctx.fillStyle = `rgba(255,250,240,${0.9 - luff * 0.22})`;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    const rudderAngle = math.degToRad(state.rudderDeg);
    ctx.strokeStyle = "#132f3e";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 36);
    ctx.lineTo(Math.sin(rudderAngle) * 16, 36 + Math.cos(rudderAngle) * 16);
    ctx.stroke();
    ctx.restore();
  }

  function drawArrow(cx, cy, angle, length, color, label) {
    const head = math.angleToVector(angle, length);
    const endX = cx + head.x;
    const endY = cy + head.y;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    const left = math.angleToVector(angle - math.degToRad(160), 11);
    const right = math.angleToVector(angle + math.degToRad(160), 11);
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(endX + left.x, endY + left.y);
    ctx.lineTo(endX + right.x, endY + right.y);
    ctx.closePath();
    ctx.fill();
    ctx.font = "600 14px Space Grotesk";
    ctx.fillText(label, endX + 8, endY - 8);
  }

  return {
    draw() {
      drawLake();
      drawHud();
      drawCompass();
      drawMiniMap();
      drawPointOfSailDial(78, 214, 54);
      drawBoat();
      const arrowAngle = math.degToRad((state.windFromDeg + 180) % 360) - (state.headingUp ? state.boat.heading : 0);
      drawArrow(canvas.width - 220, canvas.height - 90, arrowAngle, 52, "rgba(255,137,61,0.82)", `From ${state.windFromDeg.toFixed(0)}°`);
    }
  };
};
