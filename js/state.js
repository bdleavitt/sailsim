window.SailSim = window.SailSim || {};

SailSim.createState = function createState() {
  return {
    rudderDeg: 0,
    holdRudder: true,
    headingUp: true,
    sheetTension: 70,
    motorMode: false,
    motorThrottle: 35,
    windFromDeg: 315,
    windKn: 14,
    apparentWindKn: 0,
    pointOfSail: "Beam Reach",
    sail: {
      angle: SailSim.math.degToRad(30),
      luff: 0,
      draw: 0,
      side: 1
    },
    boat: {
      heading: SailSim.math.degToRad(40),
      speedWater: 0,
      yawRate: 0,
      worldX: 0,
      worldY: 0,
      shoreContact: 0
    }
  };
};
