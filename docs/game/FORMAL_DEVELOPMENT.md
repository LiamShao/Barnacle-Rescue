# 正式开发基线

核对日期：2026-10-01。代码基点：`bba0ab9` 加工作区阶段 0 生命周期修正与 1A Zen 双视角集成。计划与未执行的验收不代表已完成行为。

## 当前可玩版本

主菜单 → Challenge / Zen 与救援选择 → 清理 → 结果 → 重玩 / 下一救援 / 返回。原三关均可用两种模式；Zen 额外提供 Whole Turtle Care。

三项可选救援为 Gentle Start、Shell Care、Full Rescue，分别包含 3 / 5 / 7 个固定位置目标。拖动刮除、普通/坚硬目标、开裂与脱落、情绪和临时反应、Challenge 计时/生命/连击/评级、Zen、声音开关以及本地完成摘要均已实现。所有关卡开放，未实现解锁系统。

Whole Turtle Care 从 seed 准备全部 10 个目标，先清理背部/鳍肢，再通过 Next area 进入腹面。第一阶段清完时总进度为 60% 或 70%，不庆祝、不保存完成；只有最后目标脱落后才庆祝并显示结果、保存成功。重玩保留案例，返回选择或主菜单丢弃活动运行；再次选择生成新案例。新救援目前仅 Zen 可选，原三关的下一救援顺序保留。

背景、海龟、刮刀及两种藤壶的完整/开裂状态已使用 PNG；加载失败保留可玩的矢量场景。脱落、表情和反馈仍主要由程序绘制，声音仍是合成 Web Audio。美术接入完成不等于最终视觉、音频或设备体验通过验收。

## 正式开发能力与集成状态

| 能力 | 代码证据 | 当前边界 |
| --- | --- | --- |
| 内容定义、稳定 ID、几何与验证 | `src/levels/rescueDefinitions.ts`、`rescueValidation.ts`、`src/domain/identifiers.ts`、`geometry.ts` | 已验证四项内容；视图呈现、锚点与阶段文案配置化 |
| 确定性随机布局 | `src/levels/generatedPlacement.ts` | 已进入 Zen 双视角流程；固定三关仍使用原坐标 |
| Whole Turtle Care 内容 | `src/levels/levels.ts` 的 `playableRescues` / `wholeTurtleCare` | 10 个目标、2 个坚硬目标、7 个受影响区域；Zen 可选 |
| 腹面美术及矢量降级 | `src/game/TurtleView.ts`、`public/assets/game/turtle_body_ventral_v4.png` | 一个画布切换视图，腹面资产失败仍能完成 |
| 多阶段运行与会话 | `src/state/rescueRun.ts`、`rescueSession.ts` | Scene 以 run 为唯一目标/阶段真值；React 保留初始案例/seed，接收低频摘要 |

历史进度：M1–M9、D1 首轮美术接入、FD0、FD1、FD-201–203 已有实现/记录；1A 接入 FD-204–206、208 和 209–211 的 Zen 部分。M10 最终 QA 与部署历史跳过。下一步是 1B 的跨阶段 Challenge，之后是 1C 实机验收，FD2 尚未整体完成。

## 当前边界与剩余集成

- `App.tsx` 使用模式限定的 `playableRescues`；准备失败显示可恢复提示而不进入场景。会话保留初始 seed，重玩重建全部阶段。
- `BarnacleScene.ts` 更新 `RescueRun`，目标视图只读取 run 中的 HP。视图身份检查阻止迟到资源回写；切换清理旧输入、目标和反馈，保留整局 mood。
- `GameViewport.tsx` 提供 Next area 命令、run 摘要与场景失败回调，切换不重挂画布。ResizeObserver 保持渲染尺寸和宿主布局同步。
- `challenge.ts` 用同一 `elapsed` 驱动倒计时与连击。新需求要求切换暂停倒计时但不延长连击，需明确分离两种时间语义。
- 存档仍为 v2；四项当前救援 ID 可保存，只有原三关带可选 legacy 映射。中间阶段、放弃与准备失败不记录完成。
- `RescueRun.complete` 表示目标全部移除；Scene 保留两秒庆祝再通知 React 展示结果/写摘要。跨阶段 Challenge 的失败、暂停、连击与终态需在 1B 继续整合。

## 风险与发布状态

真实触屏刮除、误伤频率、横竖屏切换、音量/自动播放与长时间运行仍需设备实测。320px Chromium 鼠标自动化不能替代真实触控验收。历史及本次浏览器运行均出现过 Pixi WebGL 初始化问题，见 [检查记录](ACCEPTANCE_CRITERIA.md)。

2026-10-01 的生命周期修正补齐初始化取消/失败时的图形树清理、重复销毁保护和指针释放，单局销毁不再清空 Pixi 页面级共享池。新增确定性取消测试与 12 次导航的实际 WebGL 上下文释放检查。该修正针对代码中已确认的清理缺口，不能仅凭测试通过认定它就是历史间歇性 WebGL 失败的唯一原因。

目前没有已配置的正式部署目标、发布流水线或回滚流程。发布准备作为新阶段完成，不能改写 M10 的历史状态来获得发布认可。

后续执行顺序与阶段完成条件见 [开发路线](FORMAL_ROADMAP.md)，旧完成记录见 [历史归档](archive/FORMAL_ROADMAP_2026-09-30.md)。
