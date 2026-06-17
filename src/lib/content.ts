import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * 项目分类，对应设计稿中 Project 下的三个子栏目：
 *  - main:  学位里程碑项目（M1.1 / M1.2 / M2.1 / FMP）
 *  - course: 选修课项目
 *  - extracurricular: 课外项目
 *
 * 分类来自 Info.txt 的 `Category:` 字段（如 `Category: M11`、`Category: Course`、
 * `Category: Extracurricular`）。缺少该字段的项目会归入 course 并在构建时给出警告。
 */
export type ProjectCategory = 'main' | 'course' | 'extracurricular';

export type MilestoneCode = 'M11' | 'M12' | 'M21' | 'FMP';

export type ProjectInfo = {
	title: string;
	time: string;
	projectType: string;
	role: string;
	location: string;
	client: string;
	eaInvolved: string[];
	abstract: string;
	category: ProjectCategory;
	milestone?: MilestoneCode;
};

export type Project = {
	id: string;
	slug: string;
	year: number;
	projectDir: string;
	coverImage: string;
	info: ProjectInfo;
	/** 标题主干（冒号/破折号前的部分），用于侧边栏与详情页大标题 */
	shortTitle: string;
	/** 详情页大标题，如 "M11 Balance Stompers." */
	displayTitle: string;
};

export type Figure = {
	index: number;
	src: string;
	caption: string;
};

/** portfolio-content.md 顶部 YAML frontmatter 的元信息 */
export type ProjectMeta = {
	subtitle?: string;
	period?: string;
	type?: string;
	members?: string;
	coach?: string;
	client?: string;
};

export type ProjectDetail = Project & {
	figures: Figure[];
	blocks: SectionBlock[];
	meta: ProjectMeta;
	dribbbleUrl?: string;
};

function publicPathToFilePath(publicPath: string) {
	return join(process.cwd(), 'public', publicPath.replace(/^\/+/, ''));
}

function encodePublicUrl(publicPath: string) {
	return publicPath
		.replaceAll('\\', '/')
		.split('/')
		.map((part, index) => (index === 0 ? part : encodeURIComponent(part)))
		.join('/');
}

function slugifyProjectId(id: string, year: number) {
	const withoutYearPrefix = id.replace(new RegExp(`^${year}P\\d+_?`, 'i'), '');
	return `${year}-${withoutYearPrefix || id}`
		.replace(/([a-z])([A-Z])/g, '$1-$2')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

const MILESTONE_CODES: MilestoneCode[] = ['M11', 'M12', 'M21', 'FMP'];

function parseCategory(raw: string): { category: ProjectCategory; milestone?: MilestoneCode } {
	const normalized = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
	const milestone = MILESTONE_CODES.find((code) => normalized === code);
	if (milestone) return { category: 'main', milestone };
	if (normalized.startsWith('EXTRA')) return { category: 'extracurricular' };
	return { category: 'course' };
}

function shortenTitle(title: string) {
	return title.split(/[:：]|\s[–—-]\s/)[0].replace(/^["“”]+|["“”]+$/g, '').trim();
}

export function parseProjectInfo(text: string): ProjectInfo {
	const values = new Map<string, string>();

	// Markdown 转义还原（\& → &、\- → -、\_ → _ 等）
	const unescapeMd = (value: string) => value.replace(/\\([&_\-[\]()#*])/g, '$1');

	// 兼容半角/全角冒号与历史乱码（"Time锛?…"）
	text.split(/\r?\n/).forEach((line) => {
		const match = line.match(/^(.+?)(?:[:：]|锛[?歖欝])\s*(.*)$/);
		if (!match) return;
		values.set(match[1].trim().toLowerCase(), unescapeMd(match[2].trim()));
	});

	const eaInvolved = (values.get('ea involved') ?? '')
		.split('/')
		.map((item) => item.trim())
		.filter(Boolean);

	const rawCategory = values.get('category') ?? '';
	const { category, milestone } = parseCategory(rawCategory);

	return {
		title: values.get('title') ?? 'Untitled project',
		time: values.get('time') ?? '',
		projectType: values.get('project type') ?? '',
		role: values.get('role') ?? '',
		location: values.get('location') ?? '',
		client: values.get('client') ?? '',
		eaInvolved,
		abstract: values.get('abstract') ?? '',
		category,
		milestone,
	};
}

export function getProjects(): Project[] {
	const filesRoot = join(process.cwd(), 'public', 'files');
	if (!existsSync(filesRoot)) return [];

	return readdirSync(filesRoot)
		.filter((yearDir) => /^Work_\d{4}$/.test(yearDir))
		.flatMap((yearDir) => {
			const year = Number(yearDir.match(/\d{4}/)?.[0]);
			const yearPath = join(filesRoot, yearDir);
			if (!Number.isFinite(year) || !statSync(yearPath).isDirectory()) return [];

			return readdirSync(yearPath)
				.map((projectId) => {
					const projectPath = join(yearPath, projectId);
					if (!statSync(projectPath).isDirectory()) return undefined;

					const projectDir = `/files/${yearDir}/${projectId}`;
					const infoMd = publicPathToFilePath(`${projectDir}/01_cover/Info.md`);
					const infoTxt = publicPathToFilePath(`${projectDir}/01_cover/Info.txt`);
					const infoFile = existsSync(infoMd) ? infoMd : infoTxt;
					const coverFile = publicPathToFilePath(`${projectDir}/01_cover/hero-image.png`);
					if (!existsSync(infoFile) || !existsSync(coverFile)) return undefined;

					const infoText = readFileSync(infoFile, 'utf-8');
					const info = parseProjectInfo(infoText);
					if (!/^category/im.test(infoText)) {
						console.warn(`[content] ${projectId} 的 Info 文件缺少 Category 字段，暂归入 Course`);
					}

					const shortTitle = shortenTitle(info.title);
					return {
						id: projectId,
						slug: slugifyProjectId(projectId, year),
						year,
						projectDir,
						coverImage: encodePublicUrl(`${projectDir}/01_cover/hero-image.png`),
						info,
						shortTitle,
						displayTitle: info.milestone ? `${info.milestone} ${shortTitle}` : shortTitle,
					} satisfies Project;
				})
				.filter((project): project is Project => Boolean(project));
		})
		.sort((a, b) => b.year - a.year || a.id.localeCompare(b.id));
}

const MILESTONE_ORDER: Record<MilestoneCode, number> = { M11: 0, M12: 1, M21: 2, FMP: 3 };

/** 项目起始时间排序键（year*100+month），用于新→旧排序 */
function startKey(time: string) {
	const m = time.match(/(\d{4})\s*[./-]\s*(\d{1,2})/);
	return m ? Number(m[1]) * 100 + Number(m[2]) : 0;
}

export function getProjectsByCategory() {
	const projects = getProjects();
	const byNewest = (a: Project, b: Project) => startKey(b.info.time) - startKey(a.info.time) || b.id.localeCompare(a.id);
	return {
		// Main 按里程碑倒序（FMP→M21→M12→M11，即新→旧）
		main: projects
			.filter((project) => project.info.category === 'main')
			.sort((a, b) => MILESTONE_ORDER[b.info.milestone ?? 'M11'] - MILESTONE_ORDER[a.info.milestone ?? 'M11']),
		course: projects.filter((project) => project.info.category === 'course').sort(byNewest),
		extracurricular: projects.filter((project) => project.info.category === 'extracurricular').sort(byNewest),
	};
}

/** 扫描 03-ea-contribution/fig_in_web 下的图片（命名如 <前缀>_web<N>.png），按 N 排序 */
function getFigures(projectDir: string): Figure[] {
	const figDir = publicPathToFilePath(`${projectDir}/03-ea-contribution/fig_in_web`);
	if (!existsSync(figDir)) return [];

	return readdirSync(figDir)
		.map((fileName) => {
			if (!/\.(png|jpe?g|webp|gif|svg)$/i.test(fileName)) return undefined;
			if (!statSync(join(figDir, fileName)).isFile()) return undefined;
			// 末尾编号 = 出现顺序；caption = 文件名（去掉扩展名与 _webN/末尾数字，用作图中标题）
			const index = Number(fileName.match(/_?web[\s_-]?(\d+)\./i)?.[1] ?? fileName.match(/(\d+)\./)?.[1] ?? 0);
			const caption = fileName
				.replace(/\.[^.]+$/, '')
				.replace(/[_\s-]?web[_\s-]?\d+$/i, '')
				.replace(/[_\s-]?\d+$/, '')
				.replace(/[_-]+/g, ' ')
				.trim();
			return {
				index,
				src: encodePublicUrl(`${projectDir}/03-ea-contribution/fig_in_web/${fileName}`),
				caption,
			} satisfies Figure;
		})
		.filter((figure): figure is Figure => Boolean(figure))
		.sort((a, b) => a.index - b.index);
}

/** 拆分 portfolio-content.md 的 YAML frontmatter 与正文 */
function splitFrontmatter(raw: string): { meta: ProjectMeta; body: string } {
	const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
	if (!match) return { meta: {}, body: raw };

	const meta: Record<string, string> = {};
	for (const line of match[1].split(/\r?\n/)) {
		const kv = line.match(/^(\w+):\s*"?(.*?)"?\s*$/);
		if (kv) meta[kv[1].toLowerCase()] = kv[2];
	}
	return { meta: meta as ProjectMeta, body: match[2] };
}

/** 从正文 Links 区的 [Dribbble](url) 提取作品页链接 */
function extractDribbbleUrl(body: string): string | undefined {
	return body.match(/\[dribbble\]\((https:\/\/dribbble\.com\/[^)]+)\)/i)?.[1];
}

export function getProjectDetails(): ProjectDetail[] {
	return getProjects().map((project) => {
		const file = publicPathToFilePath(`${project.projectDir}/03-ea-contribution/portfolio-content.md`);
		const raw = existsSync(file) ? readFileSync(file, 'utf-8') : '';
		const { meta, body } = splitFrontmatter(raw);

		return {
			...project,
			figures: getFigures(project.projectDir),
			blocks: parseMarkdownBlocks(body),
			meta,
			dribbbleUrl: extractDribbbleUrl(body),
		};
	});
}

/** 版块文字的结构化块，对应 Markdown */
export type SectionBlock =
	| { type: 'hr' }
	| { type: 'h2'; text: string }
	| { type: 'h3'; text: string }
	| { type: 'quote'; text: string }
	| { type: 'subhead'; text: string }
	| { type: 'list'; items: string[] }
	| { type: 'para'; text: string };

/**
 * 把一段 Markdown 解析为结构化块。
 * 支持：`## / ###` 标题、`---` 分隔线、`> 引言`、`- 列表`、
 * 整行 `**加粗**`（小标题）、普通段落（段内 `**加粗**`、`[链接](url)` 保留）。
 * 首行 `# 大标题` 会被跳过（页面另有大标题）。
 */
export function parseMarkdownBlocks(raw: string): SectionBlock[] {
	const lines = raw.replace(/<!--[\s\S]*?-->/g, '').split(/\r?\n/); // 先剥离 HTML 注释
	const blocks: SectionBlock[] = [];
	let para: string[] = [];
	let listItems: string[] = [];
	let quote: string[] = [];

	const flushPara = () => {
		const text = para.join(' ').trim();
		if (text && !text.startsWith('（在此粘贴')) blocks.push({ type: 'para', text });
		para = [];
	};
	const flushList = () => { if (listItems.length) blocks.push({ type: 'list', items: listItems }); listItems = []; };
	const flushQuote = () => { if (quote.length) blocks.push({ type: 'quote', text: quote.join(' ') }); quote = []; };
	const flushAll = () => { flushPara(); flushList(); flushQuote(); };

	for (const rawLine of lines) {
		const line = rawLine.trim();
		if (!line) { flushAll(); continue; }
		if (/^#\s/.test(line)) { flushAll(); continue; } // 跳过一级大标题
		if (/^---+$/.test(line)) { flushAll(); blocks.push({ type: 'hr' }); continue; }
		if (/^##\s/.test(line)) { flushAll(); blocks.push({ type: 'h2', text: line.replace(/^##\s+/, '') }); continue; }
		if (/^###\s/.test(line)) { flushAll(); blocks.push({ type: 'h3', text: line.replace(/^###\s+/, '') }); continue; }
		if (/^\[\^\d+\]:/.test(line)) { flushAll(); blocks.push({ type: 'para', text: line }); continue; } // 脚注各自成块
		if (/^>\s?/.test(line)) { flushPara(); flushList(); quote.push(line.replace(/^>\s?/, '')); continue; }
		if (/^[-*]\s/.test(line)) { flushPara(); flushQuote(); listItems.push(line.replace(/^[-*]\s+/, '')); continue; }
		if (/^\*\*[^*]+\*\*$/.test(line)) { flushAll(); blocks.push({ type: 'subhead', text: line.replace(/^\*\*|\*\*$/g, '') }); continue; }
		flushList(); flushQuote(); para.push(line);
	}
	flushAll();
	return blocks;
}

/** 读取 public/content/<name>.txt 并解析为结构化块 */
export function getSectionBlocks(name: string): SectionBlock[] {
	const filePath = join(process.cwd(), 'public', 'content', `${name}.txt`);
	if (!existsSync(filePath)) return [];
	return parseMarkdownBlocks(readFileSync(filePath, 'utf-8'));
}

const escapeHtml = (value: string) =>
	value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * 段内 Markdown → HTML（先转义）：
 * `[文本](url)` → 链接、`**加粗**` → strong、引用角标 `[^N]` 与 `[N]` → 上标。
 * （正文 [N] 是引用文献角标，非图片引用）
 */
export function renderInline(text: string) {
	return escapeHtml(text)
		.replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
		.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
		.replace(/\[\^(\d+)\]/g, '<sup class="cite-mark">$1</sup>')
		.replace(/\[(\d+)\]/g, '<sup class="cite-mark">$1</sup>');
}

/** EA 名称 → 色条代码（颜色见全局样式 .ea-*） */
export function getEaCode(eaName: string) {
	const normalized = eaName.toLowerCase();
	if (normalized.includes('creativity')) return 'ca';
	if (normalized.includes('technology')) return 'tr';
	if (normalized.includes('user')) return 'us';
	if (normalized.includes('business')) return 'be';
	if (normalized.includes('math') || normalized.includes('data')) return 'mdc';
	return 'default';
}

export function formatProjectDate(time: string) {
	const matches = Array.from(time.matchAll(/(\d{4})[./-](\d{1,2})/g));
	if (matches.length === 0) return time;
	const formatted = matches.map((match) => `${match[1]}.${match[2]}`);
	return Array.from(new Set(formatted)).join('-');
}
