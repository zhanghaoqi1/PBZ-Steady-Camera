# 影之刃零 · 稳镜设置

PBZ Steady Camera · **v0.2.0-beta — UE4SS 重制版**

当前版本已从旧 PAK 方案迁移为 UE4SS Lua Mod。**下载包仅包含稳镜 Mod，不包含 UE4SS。** 请另行安装与你的 PBZ 游戏版本兼容的 UE4SS；本机验证使用 PBZ 适配版 r4，通用版尚未验证。

> 测试版：偶发原生闪退仍在排查，本次更新不宣称解决闪退。持续疾跑动态观感仍需更多实机验证。

[下载 v0.2.0-beta](https://github.com/zhanghaoqi1/PBZ-Steady-Camera/releases/tag/v0.2.0-beta) · [中文安装说明](docs/README_简体中文.md) · [English](docs/README_EN.md) · [更新日志](docs/CHANGELOG.md)

## 当前功能

- 原生顶部“镜头”标签位于“系统”右侧
- 五项滑条：距离90%–200%、视野增量0–40°、抖动0%–100%、水平/垂直偏移±300cm。
- 拖动实时预览，停止调节或返回时自动保存，重启保留上次设置。
- “重置为原版”立即恢复并保存距离100%、视野增量0、抖动100%、偏移0/0。

## 安装

1. 关闭游戏，准备兼容的UE4SS。
2. 移除旧PAK版的 `zz_PBZCamera_P.pak/.utoc/.ucas`。旧组合版 `zz_PBZCombat_P` 也不能同时使用。
3. 解压ZIP中的 `PBZSteadyCamera` 到当前UE4SS的 `Mods` 目录。
4. 确认 `ue4ss/Mods/PBZSteadyCamera/Scripts/main.lua` 与 `enabled.txt` 存在。实测Steam位置为 `PBZ/platform/steam/ue4ss/Mods/`。

配置文件为 `%LOCALAPPDATA%/ProjectPBZ/Saved/PBZCamera.json`，旧配置保留；发行包不附带任何玩家配置。卸载仅删除本Mod文件夹，保留UE4SS和其他Mod。

## 验证范围

开发版131项Python回归、93项JavaScript测试通过（Python中含90项UE4SS测试）；发布副本另有3项路径迁移、包内容及可重复构建测试。原生导航、滑条、重置、Esc返回、重启读取和黑色选中字体现有本机或用户实测依据。发布ZIP在陌生路径完成离线加载验证，全新玩家目录的完整实机走查尚未完成。

实测游戏为Windows x64 / Steam、CL302256-17280、UE5.7。手柄完整导航、超宽屏、所有地图和其他Mod组合尚未全面验证。

## 历史源码

仓库根目录的 `build.py`、`mod.json`、`src/PBZCamera` 和旧源码构建说明属于v0.1.x PAK路线，保留供历史参考，**不能用来构建当前UE4SS版本**。v0.2.0运行模块为发行ZIP中 `PBZSteadyCamera/Scripts/` 的9个Lua文件，不需要PAK打包。

反馈时请提供游戏版本、UE4SS版本、Mod列表和大致操作；分享日志前移除个人信息。Mod无联网、遥测或自动更新功能。
