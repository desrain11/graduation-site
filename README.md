# Graduation Portfolio — Yunfei Hu

毕业用学术作品集网站（2024.09 – 2026.09），基于 Astro 静态构建。
与 `E:\Portfolio\portfolio-site`（通用作品集）完全独立，但共享同一套项目内容源。

## 内容管理

**项目内容不在本仓库维护。** 一律在旧站目录里管理，目录约定不变：

```
E:\Portfolio\portfolio-site\public\files\Work_YYYY\<项目ID>\
├── 01_cover\Info.txt        ← 项目元信息（Title / Time / Category / Role / ...）
├── 01_cover\hero-image.png  ← 封面图
└── ...
```

`npm run dev` / `npm run build` 前会自动执行 `scripts/sync-content.mjs`：
按 Info.txt 的 Time 起始时间筛选 2024.09–2026.09 范围内的项目，
镜像复制到本仓库 `public/files/`（**该目录为生成物，勿手动编辑**，但需提交 git 以便部署）。

### Info.txt 新增字段：Category

本站按设计稿把项目分三类，需要在每个项目的 Info.txt 中加一行：

```
Category: M11            ← 里程碑项目，可填 M11 / M12 / M21 / FMP（归入 Project > Main）
Category: Course         ← 选修课项目（Project > Course）
Category: Extracurricular ← 课外项目（Project > Extracurricular）
```

缺少该字段的项目暂时归入 Course，构建时会打印警告。旧站会忽略此字段，互不影响。

## 本仓库内容目录（需要手动维护）

```
public/
├── content/                 ← 四个文字板块（纯文本，空行分段）
│   ├── identity.txt
│   ├── vision.txt
│   ├── expertise-areas.txt
│   └── development.txt
├── image/cover/             ← 封面照片等
├── image/ui/                ← 小老鼠、奶酪洞、图标等 UI 素材
├── fonts/                   ← 网页字体
├── contact/                 ← 联系方式二维码（Wechat/Email/Linkedin/Dribbble）
└── cv/                      ← 中英文 CV PDF
```

## 命令

| 命令              | 说明                                   |
| :---------------- | :------------------------------------- |
| `npm install`     | 安装依赖                               |
| `npm run sync`    | 手动同步项目内容（dev/build 前会自动跑）|
| `npm run dev`     | 本地开发 `localhost:4321`              |
| `npm run build`   | 构建到 `./dist/`                       |
| `npm run preview` | 本地预览构建产物                       |

## 设计稿

Figma: https://www.figma.com/design/kPaWiu3MEv0lIOQBxvc4Qm/Portfolio-site
实现进度与待确认细节见 `docs/design-checklist.md`。
