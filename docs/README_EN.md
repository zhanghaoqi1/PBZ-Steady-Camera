# PBZ Steady Camera v0.2.0-beta — UE4SS rewrite

Camera-only mod for Phantom Blade Zero, Windows x64 / Steam. Tested game build: CL 302256-17280, UE 5.7. This is a beta with unresolved intermittent native crashes.

## Requirement

Install a UE4SS build compatible with your PBZ version separately. Development and live UI checks used the PBZ-adapted UE4SS r4 build with `LoopInGameThreadWithDelay`. Generic UE4SS builds and other game versions have not been verified. **This archive does not include UE4SS, any loader DLL, or any other mod.**

## Install / upgrade from v0.1.x

1. Fully close the game. Install and verify your compatible UE4SS loader first.
2. If upgrading from the PAK edition, remove only the old `zz_PBZCamera_P.pak`, `zz_PBZCamera_P.utoc` and `zz_PBZCamera_P.ucas` from `ProjectPBZ/Content/Paks/~mods`. Do not run both camera editions together. The old combined `zz_PBZCombat_P` edition also contains camera edits and must not be used alongside this mod.
3. Extract the `PBZSteadyCamera` folder into the active UE4SS `Mods` directory, alongside your other mod folders. On the tested Steam layout this is `PBZ/platform/steam/ue4ss/Mods/`.
4. Verify the final path is `ue4ss/Mods/PBZSteadyCamera/Scripts/main.lua`, and `ue4ss/Mods/PBZSteadyCamera/enabled.txt` exists. Do not create an extra nested `PBZSteadyCamera` directory.
5. Start through Steam. Open the Esc system menu and select the camera tab immediately to the right of System. The current in-game labels are Simplified Chinese. Q/E includes the camera tab.

If this mod folder already exists, back up that folder and replace its contents with this release. No loader files need to be replaced.

## Controls

Five sliders adjust distance (90–200%, step 5%), FOV addition (0–40 degrees, step 1), shake (0–100%, step 5%), horizontal and vertical camera offsets (-300 to +300 cm, step 5 cm). Sliders preview immediately; values save after input settles and on leaving the page. Esc returns to gameplay.

The reset button `重置为原版` immediately restores and saves distance 100%, FOV addition 0, shake 100% and offsets 0/0. New installations use these original values. There are no preset/apply/cancel buttons in this rewrite.

Settings persist at `%LOCALAPPDATA%/ProjectPBZ/Saved/PBZCamera.json`. An existing profile is retained, including one created by the previous edition; this package contains no player configuration. Horizontal positive offsets move the camera to the right; positive vertical offsets raise it. Large offsets can put the camera inside geometry.

## Known issues and validation

- Intermittent native access-violation crashes remain under investigation. Two development-session dumps faulted in UE4SS.dll at different locations and on different threads; the triggering mod/call is not established. This release does **not** claim to fix those crashes.
- Movement-mode handoffs now preserve distance/framing additive channels rather than zeroing and re-adding them during normal/run/sprint transitions. The regression passes; sustained sprint visuals still need broader in-game validation.
- Native tab placement, Q/E and mouse dragging, reset, Esc return, saved-profile reload and selected black label have local/user live evidence. The relocated release package is verified offline; a complete fresh player installation has not been live-tested.
- Controller coverage, ultrawide layouts, all maps and all mod combinations have not been fully validated. Other mods changing the same camera or system menu may conflict.

Logs use the normal UE4SS log with `[PBZSteadyCamera]` prefixes. If menu construction was interrupted and the camera page is disabled on the next launch, close the game, retain the logs, then remove only `PBZSteadyCamera/Scripts/page.mounting` to retry. This file is a mod-owned crash guard, not a game save.

To uninstall, close the game and remove only `ue4ss/Mods/PBZSteadyCamera`. Keep UE4SS and other mods. The separate settings file remains unless you choose to remove it.

Project: https://github.com/zhanghaoqi1/PBZ-Steady-Camera
Nexus: https://www.nexusmods.com/phantombladezero/mods/382
