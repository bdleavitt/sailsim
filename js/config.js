window.SailSim = window.SailSim || {};

SailSim.config = {
  KNOT_TO_PX: 18,
  LAKE_WIDTH: 8400,
  LAKE_HEIGHT: 5700,
  BOAT_CLEARANCE: 28,
  RUDDER_RETURN_DEG_PER_SECOND: 22,
  CANVAS_CENTER_Y: 0.58,
  SAIL_CL: 1.4,
  SAIL_CD: 1.3,
  SAIL_DRIVE: 0.026,
  HULL_DRAG: 0.09,
  MAX_BOAT_KN: 9
};

SailSim.config.lakeOutline = Array.from({ length: 80 }, (_, index) => {
  const angle = (index / 80) * Math.PI * 2;
  const variation = 1 + Math.sin(angle * 3 + 0.7) * 0.09 + Math.sin(angle * 7 - 0.4) * 0.035;
  return {
    x: Math.cos(angle) * SailSim.config.LAKE_WIDTH * 0.5 * variation,
    y: Math.sin(angle) * SailSim.config.LAKE_HEIGHT * 0.5 * variation
  };
});

SailSim.config.landmarks = [
  { x: -2460, y: -1440, name: "Pine Cove", kind: "cove" },
  { x: 2160, y: -1500, name: "North Marina", kind: "dock" },
  { x: 2910, y: 990, name: "Heron Point", kind: "point" },
  { x: -2280, y: 1560, name: "South Beach", kind: "beach" }
];
