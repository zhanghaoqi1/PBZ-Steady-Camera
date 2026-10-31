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
