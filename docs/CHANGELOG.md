# v0.1.3-beta — 2026-11-02

- Fixes "restore original" (or any parameter returning to its native value) appearing to do nothing until a slider was moved again.
- Root cause: distance and X/Y framing are native additive overrides, and a paused camera component does not tick, so removing an override did not recompute the paused image.
- A pause-time rollback now writes the zero value first (distance 0, socket offset `(0,0,0)`, blend 0) so the background returns immediately; the override entry itself is removed on the next unpaused poll, with delta bookkeeping that prevents duplicate writes.
- Verified in game: distance, FOV, shake and X/Y offset all return to the original look on Apply after "restore original", including repeatedly.
- 42 camera behavior tests and 4 release tests pass.

# v0.1.2-beta — 2026-11-02

- Adds signed camera framing offsets: horizontal X and vertical Y, each **-300 to +300 cm** in 5 cm steps, default 0.
- Offsets are applied as native `SocketOffset` additive parameters and removed again when both values return to zero.
- Original/steady presets now also reset both offsets to 0; drafts, Cancel and Apply behave like the other controls.
- Distance response range is 90–200% and FOV increment +0–40°; successful Apply refreshes the paused camera background.
- 42 camera behavior tests and 4 release tests pass.

# v0.1.1-beta — 2026-11-02

- Distance90–200%, FOV increment0–40 degrees; existing5%/1 degree steps.
- Successful Apply refreshes the paused camera background through native camera/controller interfaces.
- Native pause, blur, vignette, drafts/cancel and UI styling retained.
- Combined build live checks cover Apply, original preset and Esc cancellation; separated package installation remains untested.
- 37 camera behavior tests and4 release tests pass.

# v0.1.0-beta — 2026-10-31

- First separated camera-only distribution; independent `PBZCamera` module namespace and configuration.
- Native Esc camera tab, game font/slider styling, shorter sliders and step arrows.
- Distance/FOV/shake presets, explicit Apply, draft cancellation and original-camera restore.
- Native BackInput, selected-tab black text and non-latching command selection.
- Local non-hit-testing edge vignette; no additional texture files.
- Reapply shake/FOV adjustments after the native camera resets to its earlier baseline; covered by automated regression tests, not a fresh in-game retest.
- Only SystemBase and GameModeBuild lifecycle extensions; no Bell/Boss menu patch or developer probe.
- Includes checksums, Chinese/English instructions and an optional reproducible own-source package.

See the README validation boundary: camera implementation has earlier in-game evidence; the separated public package is automatically verified but has not received a fresh full in-game installation test.
