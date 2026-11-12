# 影之刃零稳镜设置 v0.2.0-beta · UE4SS 重制版

仅包含镜头功能，适用于 Windows x64 / Steam。实测环境为游戏 CL 302256-17280、UE 5.7。本版为测试版，偶发原生闪退仍在排查。

## 前置要求

请另行安装与你当前游戏版本兼容的 UE4SS。本项目开发和实机菜单验证使用 PBZ 适配版 UE4SS r4，提供 `LoopInGameThreadWithDelay`；通用 UE4SS 版本及其他游戏版本尚未验证。**本压缩包不包含 UE4SS、加载器 DLL 或其他 Mod。**

## 安装与旧版升级

1. 完全退出游戏，先确认兼容的 UE4SS 已能正常加载。
2. 从旧 PAK 版升级时，仅移除 `ProjectPBZ/Content/Paks/~mods` 中旧的 `zz_PBZCamera_P.pak`、`zz_PBZCamera_P.utoc`、`zz_PBZCamera_P.ucas`。两种镜头版本不能同时启用；旧组合版 `zz_PBZCombat_P` 也包含镜头修改，不能同时使用。
3. 将 ZIP 内的 `PBZSteadyCamera` 文件夹解压到当前 UE4SS 的 `Mods` 目录，与其他 Mod 文件夹并列。实测 Steam 布局为 `PBZ/platform/steam/ue4ss/Mods/`。
4. 最终应存在 `ue4ss/Mods/PBZSteadyCamera/Scripts/main.lua` 和 `ue4ss/Mods/PBZSteadyCamera/enabled.txt`，不要多套一层同名文件夹。
5. 正常通过 Steam 启动游戏，打开 Esc 菜单，选择“系统”右侧的“镜头”。Q/E 可切换到镜头页。

若已安装同名 Mod，先备份其文件夹，再以本版替换文件夹内容；无需覆盖任何 UE4SS 加载器文件。

## 使用

五项滑条为镜头距离90%–200%（每档5%）、视野增量0–40°（每档1°）、抖动0%–100%（每档5%）、水平/垂直偏移-300至+300cm（每档5cm）。拖动实时预览，停止调节后自动保存，离页或返回时补存；Esc返回游戏。

“重置为原版”会立即恢复并保存：距离100%、视野增量0、抖动100%、偏移0/0。首次安装也采用这组原版值。本版取消预设、应用和取消按钮。

配置保存在 `%LOCALAPPDATA%/ProjectPBZ/Saved/PBZCamera.json`，再次启动保留上次设置，旧版同路径的配置也会读取。压缩包没有附带玩家配置。水平正值表示镜头向右移动，垂直正值抬高镜头；大偏移可能使镜头进入场景几何体。

## 已知问题与验证边界

- 偶发原生内存访问异常闪退仍在排查。开发会话中的两份转储在UE4SS.dll不同位置、不同线程出错，尚未确认具体触发Mod或调用。本版不宣称修复了这些闪退。
- 已修改普通/跑步/疾跑模式切换时的距离与构图补偿交接，避免清零后重新混入；回归测试通过，持续疾跑动态观感仍需更多实机验证。
- 页签位置、Q/E和拖动、重置、Esc返回、重启配置读取、选中黑色字体已有本机或用户实测依据。独立发布副本完成离线路径迁移验证，尚未完成全新玩家目录安装的完整实机走查。
- 手柄完整导航、超宽屏、所有地图及其他Mod组合尚未全面验收。修改同一相机或系统菜单的Mod可能冲突。

诊断信息写入正常UE4SS日志，前缀为 `[PBZSteadyCamera]`。若页面构建中断导致下次启动禁用镜头页，请退出游戏并保留日志，再仅删除 `PBZSteadyCamera/Scripts/page.mounting` 重试；它是本Mod的崩溃保护标志，不是游戏存档。

卸载时退出游戏，仅删除 `ue4ss/Mods/PBZSteadyCamera`，保留UE4SS和其他Mod。独立镜头配置默认保留。

GitHub：https://github.com/zhanghaoqi1/PBZ-Steady-Camera
N网：https://www.nexusmods.com/phantombladezero/mods/382
