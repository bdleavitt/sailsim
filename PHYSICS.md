# Sailing Physics

This document describes how the sailing model in `js/physics.js` works today, the
reasoning behind it, and how it is intended to behave. It is a teaching-oriented
approximation, not a full computational-fluid-dynamics rig, but it produces a
physically believable speed polar and sail behavior across every point of sail.

All logic lives in `SailSim.physics.update(state, dt)`. Tunable constants live in
`js/config.js`.

## Conventions

- Compass headings are degrees clockwise from north: `0°` north, `90°` east.
- World coordinates use positive `x` east and positive `y` south.
- `windFromDeg` is the compass direction the wind blows **from**.
- Boat heading is stored internally in radians.
- Speeds are in knots; `KNOT_TO_PX` (18) converts knots to visual world movement.
- Angles used in the aerodynamic model are measured **from the bow to where the
  wind comes from**: `0°` is head-to-wind, `180°` is a dead run.

## 1. Apparent wind

The sail reacts to apparent wind — the vector sum of the true wind and the wind
created by the boat's own motion.

```text
trueWindVec    = angleToVector((windFromDeg + 180) mod 360, windKn * KNOT_TO_PX)
boatWaterVec   = angleToVector(heading, speedWater * KNOT_TO_PX)
apparentWindVec = trueWindVec - boatWaterVec

apparentDir = atan2(apparentWindVec.x, -apparentWindVec.y)
apparentRel = normalizeAngle(apparentDir - heading)   // signed, travel direction relative to bow
aws         = |apparentWindVec| / KNOT_TO_PX           // apparent wind speed (kn)
```

`apparentRel` is the direction the air *travels* relative to the bow. The
aerodynamically useful quantity is the angle from the bow to the wind **source**:

```text
awaDeg = 180 - |apparentRel in degrees|                // 0 = head to wind, 180 = dead run
```

Getting this inversion right is essential: measuring the angle to where the wind
*goes* (instead of where it comes *from*) silently flips the entire model, making
close-hauled behave like a run.

## 2. Point of sail

Classification uses the **true** wind angle off the bow, which matches the
standard points-of-sail diagram:

```text
offWindDeg = |normalizeAngle(windFromDeg - heading)|
```

| Point of sail | `offWindDeg` |
| --- | --- |
| In Irons / No-Go Zone | `< 40` |
| Close Hauled | `40 – 55` |
| Close Reach | `55 – 70` |
| Beam Reach | `70 – 110` |
| Broad Reach | `110 – 160` |
| Run | `160 – 180` |

The on-canvas pie dial mirrors these bands: wind at the top, starboard tack on the
left, port tack on the right, run at the bottom (6:00), beam reach at 9:00 / 3:00.

## 3. Boom position and angle of attack

The mainsheet sets how far the boom can swing to leeward; the wind then holds the
boom out at that limit.

```text
maxBoomDeg = 8 + (1 - sheetTension/100) * 77           // 8° hauled in ... 85° eased out
boomDeg    = min(awaDeg, maxBoomDeg)                    // the boom cannot pass the wind
alphaDeg   = awaDeg - boomDeg                           // angle of attack of the sail
```

Correct trim means easing the boom so the sail meets the wind at a healthy angle
of attack. Sheeting in too hard (small `maxBoomDeg`) or easing too far both move
`alphaDeg` away from its productive range.

## 4. Drive: flat-plate lift and drag

The sail is modeled as a thin flat plate. Lift and drag coefficients come from the
angle of attack, then are projected onto the boat's heading:

```text
CL = SAIL_CL * sin(2 * alpha)                           // SAIL_CL = 1.4
CD = SAIL_CD * (1 - cos(2 * alpha)) / 2                 // SAIL_CD = 1.3  (= SAIL_CD * sin^2(alpha))

driveCoef = CL * sin(awa) - CD * cos(awa)
```

This projection is what makes the polar realistic without hand-authored per-angle
speeds:

- **Beam reach** (`awa ≈ 90°`): `sin` term dominates → lift-driven, fast.
- **Broad reach** (`awa ≈ 135°`): both lift and drag push forward → fastest range.
- **Run** (`awa ≈ 180°`): pure drag drive, and apparent wind is lowest, so it is
  slower than a reach.
- **Close hauled** (`awa ≈ 45°`): lift and drag partly oppose → modest drive, but
  apparent wind is highest, so the boat still moves well.

## 5. Luffing

Luffing is gated so it only happens when it physically should:

```text
luffFromNoGo = 1 - smoothstep(34, 47, offWindDeg)       // luffs inside the no-go zone
luffFromEase = 1 - smoothstep(6, 14, alphaDeg)          // luffs when eased too far to hold flow
luff         = clamp(max(luffFromNoGo, luffFromEase), 0, 1)
```

On any valid, well-trimmed point of sail both terms are zero, so the sail draws
cleanly. Sailing into the no-go zone, or easing the sheet well past the correct
trim, drives `luff` toward 1. Motoring forces `luff = 0`.

## 6. Combining into speed

```text
pointing  = smoothstep(30, 44, offWindDeg)              // no forward drive in the no-go zone
driveCoef = max(0, driveCoef) * pointing * (1 - luff * 0.92)

sailDrive = SAIL_DRIVE * aws^2 * driveCoef              // SAIL_DRIVE = 0.026
hullDrag  = HULL_DRAG  * speedWater^2                   // HULL_DRAG  = 0.09
speedWater = clamp(speedWater + (sailDrive + motorDrive - hullDrag) * dt, 0, MAX_BOAT_KN)
```

Drive scales with the square of apparent wind speed; hull drag scales with the
square of boat speed, so the boat settles at an equilibrium speed for each point
of sail. `MAX_BOAT_KN` (9) caps the top end.

### Representative polar (14 kn true wind, best trim)

| Point of sail (`offWindDeg`) | Settled speed |
| --- | --- |
| No-Go (25°) | 0.0 kn (luffing) |
| Close Hauled (45°) | ~5.9 kn |
| Close Reach (60°) | ~7.4 kn |
| Beam Reach (90°) | ~8.4 kn (peak) |
| Broad Reach (120°) | ~7.6 kn |
| Run (180°) | ~5.3 kn |

This is the intended shape: zero in the no-go zone, rising through close-hauled,
peaking on a beam/broad reach, and easing off on a dead run as apparent wind
falls. Best sheet trim eases progressively from fully in (close-hauled) to fully
out (run).

## 7. Motor mode

With the sail down, drive comes from a simple proportional controller toward a
throttle-set target speed, and the sail produces no force:

```text
motorTargetSpeed = motorThrottle * 0.06
motorDrive       = (motorTargetSpeed - speedWater) * 0.9
```

## 8. Steering

```text
turnAuthority = clamp(speedWater / 6, 0.05, 1)          // rudder needs flow to bite
targetYaw     = degToRad(rudderDeg) * turnAuthority * 0.8
yawRate      += (targetYaw - yawRate) * 2.8 * dt         // smoothed response
heading       = normalizeAngle(heading + yawRate * dt)
```

A near-stationary boat barely answers the helm; steering firms up with speed.

## 9. Sail animation

The rendered sail (`js/renderer.js`) is driven by three state fields the physics
updates every frame: `sail.angle` (boom angle), `sail.luff` (0–1), and
`sail.draw` (0–1 fullness).

- **Trim response.** The boom eases toward its target at `3 + aws * 0.15` per
  second, so it firms up in stronger wind.
- **Jibe.** When the boom must cross the centerline while sailing deep
  (`offWindDeg > 115`), the response rate jumps to `12/s`, whipping the boom across
  dead downwind. The measured peak swing exceeds ~1600°/s — the characteristic
  "slam" of a jibe. `sail.draw` is driven to 0 through the crossing so the sail
  visibly collapses and refills on the new side.
- **Tack.** A centerline crossing while sailing high uses a gentler `2.4/s` drift,
  because the sail is luffing through head-to-wind rather than snapping.
- **Belly and luff.** `sail.draw` sets how full the sail bellies; `sail.luff` adds
  a traveling ripple concentrated near the luff (leading edge) so a luffing or
  in-irons sail flutters while a drawing sail holds a smooth curve.

## Known simplifications and intended future refinements

- No heel, leeway, or sideforce — only forward drive is modeled.
- Flat-plate coefficients are a coarse stand-in for a real sail's lift/drag curve;
  they intentionally favor readable behavior over precision.
- Waves, gusts, current, and sail twist are not simulated.
- Hull drag is a single quadratic term rather than a form + wave-making model, so
  there is no distinct hull-speed wall beyond the `MAX_BOAT_KN` clamp.

These are acceptable for a points-of-sail teaching tool; the priority is that each
point of sail *feels* right and that trim and steering have believable
consequences.
