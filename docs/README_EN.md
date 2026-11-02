# Phantom Blade Zero 鈥?Steady Camera v0.1.2-beta

Camera-only experimental build. Adds a native **Camera Settings / 闀滃ご璁剧疆** tab to the Esc menu, with distance, FOV offset, camera-shake and camera-offset controls, Apply/Cancel and presets. The current UI labels are in Simplified Chinese.

## Supported base build

Windows x64 / Steam Build **26266538**, game **CL-301524_JKS-17219**, Unreal Engine **5.7.4**. Other builds/platforms and future game updates are unverified.

The separated package passes automated behavior/dependency tests and a PAK unpack/hash roundtrip. The shared camera implementation and native menu were previously tested in-game in the combined development build. **A new end-to-end installation/gameplay test of this separated distribution has not been performed.** This is a beta, not a claim of full gameplay coverage.

This release expands distance/FOV/offset ranges and adds paused Apply preview. The shared combined development build received real-game preview, original-preset and Esc-cancellation checks on 2026-11-02. This is not a fresh standalone installation test.

## Installation

1. Exit the game completely.
2. Remove the old combined development package if present: all three `zz_PBZCombat_P.pak/.utoc/.ucas` files. Do not install both packages together.
3. Copy this archive's `ProjectPBZ` folder into the game's root folder, creating:

```text
PBZ/ProjectPBZ/Content/Paks/~mods/zz_PBZCamera_P.pak
PBZ/ProjectPBZ/Content/Paks/~mods/zz_PBZCamera_P.utoc
PBZ/ProjectPBZ/Content/Paks/~mods/zz_PBZCamera_P.ucas
```

Keep all three files. Do not place them under `platform/steam` or replace original containers. Launch normally through Steam, load a save, press Esc and select the rightmost camera tab.

Uses the game's bundled Puerts runtime. No additional UE4SS, ModEngine, injected DLL, launcher or online service is required by this package.

## Controls

Distance: **90鈥?00%**, steps of **5%**, default **110%**. FOV offset: **+0掳 to +40掳**, steps of **1掳**, default **+0掳**. Shake: **0鈥?00%**, steps of **10%**, default **60%**. Horizontal camera offset (X): **-300 to +300 cm**, steps of **5 cm**, default **0**. Vertical camera offset (Y): **-300 to +300 cm**, steps of **5 cm**, default **0**.

Edit using sliders/arrows and choose **搴旂敤 (Apply)** to save; the paused menu background refreshes immediately without leaving the page. The native blur and vignette remain. **鍙栨秷 (Cancel)**, switching tabs or Esc discards unapplied edits. **鎭㈠鍘熺増 (Original preset)** prepares 100% distance, +0掳 FOV, 100% shake and zero offsets; Apply is still required.

Offsets are in centimetres: negative X shifts the character to the right of frame (camera moves left), positive Y raises the camera and moves the character down; 0 is the original framing. Large offsets (near 卤300 cm) may push the camera through doorways, walls or ceilings, as the original camera does no collision correction for them.

Configuration: `%LOCALAPPDATA%\ProjectPBZ\Saved\PBZCamera.json`. No personal configuration or save is bundled. Old combined-package settings are not imported automatically.

Only recognized ordinary gameplay cameras are modified. Unknown/cinematic/execution cameras are left alone. Full controller navigation, ultrawide layouts, every scene and every Boss encounter have not been comprehensively validated.

## Conflicts and uninstall

Overrides `UI/Widget/SystemBase.js` and `Gameplay/GameModeBuild.js`; adds six camera modules. Other mods replacing these scripts or changing the same camera may conflict. Remove older versions before installing this one.

To uninstall, exit the game and delete only the three `zz_PBZCamera_P` files. To reset this mod's defaults, optionally delete `PBZCamera.json` while the game is closed. Its optional diagnostic log is `PBZCamera-diagnostics.txt` in the same Saved directory.

No Boss rematch, combat-stat/AI edits, developer request execution, resource keys, personal saves, external binaries, networking, updater or telemetry are included. See `MANIFEST.json` and `SHA256SUMS.txt` for the exact payload, hashes and validation scope.

Version 0.1.3 fixes a defect where applying `Restore original` appeared to do nothing until a slider was moved again: distance and XY framing are native additive overrides, and a paused camera component does not tick, so removing an override did not recompute the paused image. The combined development build was re-tested in game on 2026-11-02 and now returns distance, FOV, shake and both offsets to the original look immediately; the standalone package runs the same code and passes the automated suite.
