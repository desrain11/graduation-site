# 设计实现清单

设计稿：https://www.figma.com/design/kPaWiu3MEv0lIOQBxvc4Qm/Portfolio-site
参考截图（权威版，用户手工整理）：`E:\Portfolio\_figma-refs\`，01–09 为翻页流顺序，
10-project-content(1-3) 为项目详情页（不参与翻页流，点卡片进入）。

## 已实现

- [x] 封面：YUNFEI HU SVG、整行可点菜单（PI&V→Identity / Project→Main / 直达各板块）、
      照片、奶酪洞四角、RatOnly、EN|中、社交图标（图标为临时内联 SVG）
- [x] 9 页翻页流 + 阻尼翻页：内容滚到底继续拖、超过留白 62% 翻页，否则回弹；
      页间留白为深色条 + 下一页名称提示
- [x] 封面 ↔ 内页过渡：封面向左缩放淡出，侧边栏延迟淡入；内页 EN|中 顶栏固定
- [x] 侧边栏导航树（独立滚动）：PI&V/Project（含三个子分类与项目列表）/Expertise/Development/Contract
- [x] Identity / Vision / Expertise Areas / Development 文字页（读 public/content/*.txt）
- [x] Project Main（M11/M12/M21/FMP 排序）/ Course 网格 / Extracurricular 横幅
- [x] 项目详情页：标题链接 Dribbble 原作品页（从存档 HTML 提取 /shots/ 链接，不内嵌存档）；
      ea-contribution.txt 段落 + figure~N 引用解析；宽屏 figure 就近排左侧栏、
      窄屏（≤900px）收进文字流等宽；Back to Project/<分类> 返回对应翻页
- [x] 小老鼠滚动条：随内容滚动走位，下滑头朝下/上滑头朝上，单屏页停页顶，点击停靠左侧
- [x] Contract：四张刮刮卡（刮开见 QR）、版权行；无地址无 CV（按用户要求移除）
- [x] Category 字段已写入源 Info.txt（旧站忽略）：balance=M11、TacoTask=M12、
      2025Hola=M21、2026Hola=FMP、The-EYE=Extracurricular，其余 Course —— **待用户确认映射**

## figure 引用约定

- 文稿（03-ea-contribution/ea-contribution.txt）中写 `figure~1`（兼容 `Figure ~ 2` 等大小写空格变体）
- 图片放 `02-storyline/`，命名 `figure-1.png`（兼容 `figure_1.jpg`、`Figure 2.webp` 等）
- 渲染时段落内标记显示为斜体 (Figure 1)，图片带 Figure N 题注

## 待确认 / 待做

- [ ] **Category 映射确认**（尤其 M12=TacoTask 还是 DUIET？）
- [ ] 翻页阻尼手感参数（阈值 GAP*0.62、回弹 240ms、动画 720ms）待真机调
- [ ] 小老鼠旋转方向（素材默认头朝右的假设）与停靠动画细节待视觉确认
- [ ] 封面社交图标用的是临时内联 SVG，需要 Figma 导出正式图标（含 Figma 图标？）
- [ ] 刮刮卡封面目前是深色底+平台名文字，需要正式图标素材后重绘
- [ ] 移动端三块竖版（01-cover_thin / 02-content_thin / 03-menu_thin）未实现，
      当前 ≤900px 仅详情页做了基础适配且隐藏侧边栏
- [ ] 中文版（EN|中）：现为"敬请期待"占位
- [ ] 精确字号/间距走查（当前按参考图目测 + 1440 比例单位 --u）
- [ ] 2024P04_Casting 缺 Info.txt，是否收录？
