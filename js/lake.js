window.SailSim = window.SailSim || {};

SailSim.lake = {
  contains(x, y, clearance = 0) {
    const { lakeOutline } = SailSim.config;
    let inside = false;

    for (let i = 0, j = lakeOutline.length - 1; i < lakeOutline.length; j = i, i += 1) {
      const a = lakeOutline[i];
      const b = lakeOutline[j];
      const intersects = ((a.y > y) !== (b.y > y)) &&
        (x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x);
      if (intersects) inside = !inside;
    }

    if (!inside || clearance <= 0) return inside;

    let closestDistance = Infinity;
    for (let i = 0; i < lakeOutline.length; i += 1) {
      const a = lakeOutline[i];
      const b = lakeOutline[(i + 1) % lakeOutline.length];
      const abX = b.x - a.x;
      const abY = b.y - a.y;
      const lengthSquared = abX * abX + abY * abY;
      const t = SailSim.math.clamp(((x - a.x) * abX + (y - a.y) * abY) / lengthSquared, 0, 1);
      closestDistance = Math.min(closestDistance, Math.hypot(x - (a.x + abX * t), y - (a.y + abY * t)));
    }

    return closestDistance >= clearance;
  },

  moveBoat(state, dx, dy, dt) {
    const { BOAT_CLEARANCE } = SailSim.config;
    const boat = state.boat;
    const nextX = boat.worldX + dx * dt;
    const nextY = boat.worldY + dy * dt;

    if (this.contains(nextX, nextY, BOAT_CLEARANCE)) {
      boat.worldX = nextX;
      boat.worldY = nextY;
      boat.shoreContact = Math.max(0, boat.shoreContact - dt * 2);
      return;
    }

    let moved = false;
    if (this.contains(nextX, boat.worldY, BOAT_CLEARANCE)) {
      boat.worldX = nextX;
      moved = true;
    }
    if (this.contains(boat.worldX, nextY, BOAT_CLEARANCE)) {
      boat.worldY = nextY;
      moved = true;
    }

    boat.shoreContact = 1;
    boat.speedWater *= moved ? 0.72 : 0.2;
  }
};
