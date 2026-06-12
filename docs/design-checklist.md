# 设计实现清单

设计稿：https://www.figma.com/design/kPaWiu3MEv0lIOQBxvc4Qm/Portfolio-site

## 页面结构（已从设计稿确认）

- **封面**（黄色奶酪背景）：YUNFEI HU 大标题、右上 ACADEMIC PORTFOLIO 信息、圆形照片、
  小老鼠插画、五个板块入口菜单（带 + 展开）、EN|中 切换、底部社交图标
- **内页通用布局**：左侧深色侧边栏（YUNFEI HU. + 可展开导航树）+ 右侧浅黄内容面板
- **五个板块**：
  1. PI&V → Identity / Vision（文字页）
  2. Project → Main（M11/M12/M21/FMP）/ Course / Extracurricular（卡片网格 + 详情页）
  3. Expertise Areas（文字页）
  4. Development（文字页）
  5. Contract（深色联系页：四个联系卡、位置、CV 下载、版权）
- **交互**：板块独立成页；用户稍用力下滑可带阻尼地翻到下一板块
- 另有 720×1561 移动端画板 ×3（cover / content / menu）

## 待用户确认的设计细节

- [ ] **项目分类映射**：每个项目对应 M11/M12/M21/FMP/Course/Extracurricular 中的哪个
      （通过在 Info.txt 加 `Category:` 字段解决）
- [ ] **字体**：标题（YUNFEI HU 的衬线/展示字体）与正文字体名称及字重；字体文件放 `public/fonts/`
- [ ] **精确颜色**：奶酪黄、侧边栏深色、内容面板色等（可从 Figma 变量读取，或用户提供）
- [ ] **阻尼滚动手感**：触发阈值（滚动多少算"稍微用力"）、动画时长/缓动；长文字板块内部
      滚动与整页翻页如何共存（先滚到底再翻页？）
- [ ] **项目详情页（+More）**：左侧 Figure 图片列 + 右侧长文 —— 图片和文字从项目目录哪个
      子文件夹读取？需要定一个新的目录约定（建议如 `05-academic/figure-01.png、content.txt`）
- [ ] **封面菜单 "+" 展开**：展开后显示什么（子栏目？预览？）
- [ ] **EN|中 切换**：首发是否需要中文版，还是与旧站一样先占位
- [ ] **移动端**：三块竖版画板的适配范围（仅封面+菜单？还是全部板块）
- [ ] **Expertise Areas / Development 板块**：设计稿中正文与 Identity 相同（占位），
      最终是纯文字还是有图表/EA 地图

## 素材清单（导入位置）

| 素材 | 放置位置 | 来源 |
| :--- | :--- | :--- |
| 封面圆形照片 | `public/image/cover/` | 用户提供 |
| 小老鼠 / 奶酪洞 / 星星等插画 | `public/image/ui/` | 可从 Figma 导出或复用旧站 |
| 社交图标（Wechat/Email/Dribbble/Linkedin/Figma?） | `public/image/ui/` | 可从 Figma 导出 |
| 联系二维码 ×4 | `public/contact/` | 可复用旧站 `public/Contact/` |
| 中英文 CV PDF | `public/cv/` | 用户提供（旧站为 202601 版） |
| 字体文件 | `public/fonts/` | 用户提供 |
| 四个板块文字 | `public/content/*.txt` | 用户提供 |
| favicon | `public/favicon.svg` | 可复用旧站 |
