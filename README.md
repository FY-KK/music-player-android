# Mineradio Android

## 项目简介

Mineradio 的 Android 适配版本，基于 Capacitor + WebView 架构，将原版 Electron 桌面应用移植到 Android 平台。

原项目：[Mineradio-LX-Music](https://github.com/ww085213/Mineradio-LX-Music)

## 技术栈

- 框架：Capacitor 6
- 前端：原版 Web 资源（HTML/CSS/JS）
- 原生：Android WebView
- 构建：Gradle

## 功能特性

- 本地音乐播放
- 多平台音乐搜索（网易云、QQ音乐、咪咕、酷狗、酷我）
- 歌词显示
- 歌单导入
- 音频可视化

## 目录结构

```
Project-009-音乐播放器安卓版/
├── README.md                    # 项目说明
├── CLAUDE.md                    # Claude Code 指令
├── package.json                 # npm 配置
├── capacitor.config.json        # Capacitor 配置
├── src/main/
│   ├── java/com/mineradio/app/  # Android 原生代码
│   ├── assets/www/              # Web 资源
│   └── res/                     # Android 资源
└── android/                     # Android 项目
```

## 开发指南

### 环境要求

- Node.js 18+
- Android Studio
- JDK 17+

### 常用命令

```bash
# 安装依赖
npm install

# 同步到 Android
npx cap sync

# 用 Android Studio 打开
npx cap open android

# 构建 APK
cd android && ./gradlew assembleDebug
```

## 架构说明

采用 Capacitor + WebView 架构：

1. **Web 层**：复用原版 Mineradio 的全部前端代码
2. **桥接层**：`server-mobile.js` 拦截 API 请求，在 WebView 中模拟后端服务
3. **原生层**：Android WebView 提供运行环境，支持音频播放和文件访问

## License

MIT
