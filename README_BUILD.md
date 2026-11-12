> Legacy PAK build instructions for v0.1.x only. The current v0.2.0-beta uses UE4SS Lua files shipped in the release ZIP; it does not use this builder. See README and docs/README_EN.md.

# Rebuilding the camera-only source package

This source archive contains only the Mod's own six modules, tests and builder. It does not include game originals, decryption keys, game executables, UE4SS or packaging tool binaries.

Tested tools: Python3.13, Node24, repak0.2.3 and retoc0.1.5. The source/build scripts require Python3.10 or later. Supply your own tool paths and the two original JavaScript files locally extracted from the supported game build.

The originals directory must contain:

```text
UI/Widget/SystemBase.js
Gameplay/GameModeBuild.js
```

Their SHA-256 must match `mod.json`; the builder rejects other originals before staging any files. It never modifies your originals or installed game.

Example:

```powershell
python -X utf8 build.py --originals "X:\extracted\ProjectPBZ\Content\JavaScript" --repak "X:\tools\repak.exe" --retoc "X:\tools\retoc.exe" --out ".\out"
```

The builder runs the Python release tests and Node camera tests, syntax-checks staged JavaScript, creates the PAK and empty UE5.7 IoStore sidecars, unpacks and hash-compares the PAK, enforces the payload allowlist, and writes player/source ZIPs with hashes. Install instructions are in the player ZIP.

`src/PBZCamera` is the maintained separated snapshot. Rebuilding does not require the combined development project. The two original scripts retain their original bodies and receive only lifecycle wrappers. The Mod's own source has no Boss or developer-probe dependency.

No separate license is imposed by this packaging process. The source includes no third-party tool binaries; game assets/scripts retain their existing ownership. A publisher can add their own author/contact/license information separately.
