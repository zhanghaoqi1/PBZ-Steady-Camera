# v0.2.0-beta — 2026-11-13

## 中文

- 放弃旧PAK加载方案，使用UE4SS重做。发行包仅含稳镜Mod，UE4SS需另行安装。
- “镜头”接入原生顶部导航，位于“系统”右侧，支持Q/E；移除原来的多次等待挂载，打开菜单默认保持原生页面。
- 去除额外灰色遮罩、预设行和箭头数值按钮，五个参数改为原生滑条。
- 拖动实时预览，停止调节、离页与返回时自动保存，重启读取上次设置。
- 新增“重置为原版”，立即恢复并保存五项原版值。
- 修复镜头页Esc返回：仅处理当前镜头页请求，保存最后一次滑动值后走原生关闭；旧页、切页后的旧请求及失效回调受到隔离。
- 选中镜头标签字体为黑色，未选中为白色，避免每帧重设文字覆盖原生选中样式。
- 改进同一角色相机的普通/跑步/疾跑模式交接，保留距离/构图补偿，避免清零后重新混入；持续疾跑动态观感仍待更多实测。
- 相机与菜单在适配版UE4SS提供的原生游戏线程定时器上运行；输入队列可由UI循环直接处理，覆盖派发丢失或同步异常的回退。
- 发布副本改用安装目录相对加载、正常UE4SS日志，移除开发目录和文件命令通道。

已知问题：偶发原生闪退仍在排查，本版不是闪退修复版。旧PAK版必须移除，前置UE4SS不在压缩包中。测试版兼容范围和安装说明见README。

## English

- Rebuilt the camera mod for UE4SS, replacing the legacy PAK route. Mod files only; install compatible UE4SS separately.
- Registered a native Camera tab immediately after System, including Q/E navigation, without the old multi-observation mount delay or automatic camera-page selection.
- Replaced numeric arrows with five native sliders; removed the extra grey overlay and preset row.
- Added immediate preview, automatic saving after changes settle/on exit, and profile reload on startup.
- Added Reset to Original, restoring and saving all five original values immediately.
- Fixed Esc return through a scoped camera-page request and native close path, including final-slider sampling, stale-page isolation and dispatch recovery.
- Matched native navigation colors: black selected Camera text and white unselected text.
- Preserved additive camera channels across normal/run/sprint mode changes to avoid zero/reapply kicks. Sustained sprint visuals still require further live validation.
- Used native game-thread timers on the tested PBZ UE4SS build; UI polling can drain input when deferred dispatch is lost or throws.
- Made the release independent of the developer checkout and removed its file-command interface.

Known issue: intermittent native crashes are still under investigation. This is not a crash-fix release. Remove the old camera PAK files before installing; UE4SS is not bundled. See README for installation and validation limits.


---

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
