# Points of Sail Simulator

A frontend-only HTML5 canvas application for learning points of sail, sail trim, rudder control, and wind-relative boat behavior on a bounded lake.

## Run Locally

The scripts intentionally use a shared browser namespace rather than JavaScript module imports, so `index.html` works when opened directly with a `file://` URL. A static server is still recommended during development:

```bash
python -m http.server 5500
```

Open `http://localhost:5500`.

## Current Features

- Centered animated sailboat with sail, boom, and visible rudder
- Helm control with optional hold-position or drift-to-center behavior
- Wind speed and wind-from direction controls
- Wind bearings labeled with degrees and 32-point compass directions
- Downwind animated wind arrows
- Vertical mainsheet tension control beside the on-canvas helm
- Curved sail animation with responsive boom travel, luffing, and a fast downwind jibe
- Motor mode with lowered sail and adjustable throttle
- Realistic point-of-sail speed polar based on apparent-wind lift and drag
- On-canvas pie-chart point-of-sail dial and a top-center point-of-sail pill
- Large bounded lake with shoreline collision and named landmarks
- Heading-up and north-up navigation views
- Scrolling world camera, compass, coordinates, navigation status, and orientable minimap
- Live point-of-sail classification and instrument readouts

See [PHYSICS.md](PHYSICS.md) for a full description of the sailing model — apparent
wind, sail lift/drag, the speed polar, luffing, jibing, and steering.

## Project Structure

```text
index.html          UI markup and ordered script loading
styles.css          Layout, controls, and responsive presentation
app.js              Small animation-loop bootstrap
PHYSICS.md          Detailed description of the sailing physics model
js/
  config.js         Tunable constants, lake outline, and landmarks
  math.js           Angle, vector, magnitude, and clamp helpers
  state.js          Initial mutable simulation, sail, view, and propulsion state
  lake.js           Lake containment and shoreline collision
  physics.js        Wind, sail response, motor drive, drag, steering, movement
  controls.js       DOM inputs, readouts, modes, and rudder return behavior
  renderer.js       Canvas lake, world effects, camera, compass, sailboat, HUD, minimap
```

Scripts attach their public APIs to the shared `window.SailSim` namespace and must remain in dependency order in `index.html`.

## Coordinate and Wind Conventions

- Compass headings are degrees clockwise from north: `0°` north, `90°` east.
- Canvas world coordinates use positive `x` east and positive `y` south.
- `windFromDeg` always means the compass direction the wind originates from.
- The downwind direction used for force and animation is `(windFromDeg + 180) % 360`.
- Boat heading is stored internally in radians.
- Speeds shown to users are knots; `KNOT_TO_PX` converts knots to visual world movement.
- Heading-Up View rotates the world by the negative boat heading and keeps the boat upright.
- North-up view leaves world orientation fixed and rotates the boat and compass pointer.
- Lake water glints and transparent wind arrows are generated in world coordinates inside the lake camera transform.
- World effects must not derive particle positions from the boat-relative display angle; doing so makes them jump when steering.

## Main State Fields

- `rudderDeg` and `holdRudder` control steering and return behavior.
- `sheetTension` is a percentage that limits maximum boom travel; it is not a direct boom angle.
- `motorMode` and `motorThrottle` select and control powered propulsion.
- `headingUp` selects the rotating-world navigation view.
- `sail.angle` and `sail.luff` are physics-driven animation values; controls should not set them directly.
- `windFromDeg` is always a source bearing, never the direction the arrows travel.

## Guidelines for Future Updates

### Adjust simulation behavior

Edit `js/physics.js` for sail drive, sheet-to-boom mapping, luffing, motor thrust, hull drag, turning authority, point-of-sail thresholds, or apparent wind. Put shared tuning values in `js/config.js` rather than scattering constants through the code.

### Change the lake or add locations

Edit dimensions, `lakeOutline`, and `landmarks` in `js/config.js`. Keep collision calculations in `js/lake.js`. The renderer and minimap both consume the same outline, so visuals and collision remain aligned.

### Add a new control or readout

Add its markup to `index.html`, styling to `styles.css`, and DOM wiring to `js/controls.js`. Store the value in the state produced by `js/state.js`; physics or rendering can then consume it without querying the DOM.

The rudder, mainsheet, Motor Mode switch, motor throttle, and slim Heading-Up switch are HTML controls overlaid on the canvas rather than pixels drawn by `renderer.js`. Motor Mode sits left of the rudder, reveals a vertical throttle above it, and hides the mainsheet overlay. Heading-Up sits at the top-right of the canvas.

### Change camera, compass, sail, or visual effects

Keep canvas-only changes in `js/renderer.js`. The renderer owns heading-up transforms, compass/minimap orientation, sail shape, and visual effects. Rendering should read state but should not mutate physics state. Effects intended to rotate with the map—shore, landmarks, water texture, and wind particles—must be drawn inside the same translated/rotated world context. Screen-fixed instruments belong outside that context.

### Add new simulation systems

Create a focused file under `js/`, expose a small API on `SailSim`, load it before `app.js`, and call it from the bootstrap loop or an existing subsystem. Avoid adding unrelated logic back into `app.js`.

## Model Scope

The physics are intentionally simplified for education and immediate visual feedback. This is not a naval architecture, weather-routing, or safety-of-navigation model.
