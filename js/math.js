window.SailSim = window.SailSim || {};

SailSim.math = {
  degToRad(value) {
    return (value * Math.PI) / 180;
  },

  radToDeg(value) {
    return (value * 180) / Math.PI;
  },

  normalizeAngle(angle) {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
  },

  angleToVector(angle, magnitude = 1) {
    return {
      x: Math.sin(angle) * magnitude,
      y: -Math.cos(angle) * magnitude
    };
  },

  vectorMagnitude(vector) {
    return Math.hypot(vector.x, vector.y);
  },

  smoothstep(edge0, edge1, x) {
    const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
    return t * t * (3 - 2 * t);
  },

  compassName(degrees) {
    const points = [
      "N", "N by E", "NNE", "NE by N", "NE", "NE by E", "ENE", "E by N",
      "E", "E by S", "ESE", "SE by E", "SE", "SE by S", "SSE", "S by E",
      "S", "S by W", "SSW", "SW by S", "SW", "SW by W", "WSW", "W by S",
      "W", "W by N", "WNW", "NW by W", "NW", "NW by N", "NNW", "N by W"
    ];
    const normalized = ((degrees % 360) + 360) % 360;
    return points[Math.round(normalized / 11.25) % 32];
  },

  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }
};
