# Barnacle Rescue

React + TypeScript + Vite + PixiJS 的本地单人海龟救援游戏。当前包含三项固定布局救援（Challenge / Zen），以及 Zen 专属 Whole Turtle Care：随机分布的 10 个目标，依次清理背部/鳍肢和腹面，同案例重玩并保存最终成功摘要。双视角 Challenge 与真实设备验收仍待完成。

## 本地开发

```sh
pnpm install
pnpm dev
```

## 检查

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e --workers=1
```

E2E 使用 Chromium，按 `playwright.config.ts` 启动本地 Vite 服务；首次运行需准备对应 Playwright 浏览器。真实触控与音频效果另行实测。

从 [文档导航](docs/game/README.md)、[当前基线](docs/game/FORMAL_DEVELOPMENT.md) 和 [开发路线](docs/game/FORMAL_ROADMAP.md) 开始。产品基础事实源为 [MVP_SPEC](docs/game/MVP_SPEC.md)。正式发布验收与部署尚未完成。
