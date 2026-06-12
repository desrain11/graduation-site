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

/** ea-contribution 的一个段落，figureRefs 为该段引用的图号 */
export type ContributionBlock = {
	text: string;
	figureRefs: number[];
};

export type ProjectDetail = Project & {
	figures: Figure[];
	blocks: ContributionBlock[];
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

	// 兼容半角/全角冒号与历史乱码（"Time锛?…"）
	text.split(/\r?\n/).forEach((line) => {
		const match = line.match(/^(.+?)(?:[:：]|锛[?歖欝])\s*(.*)$/);
		if (!match) return;
		values.set(match[1].trim().toLowerCase(), match[2].trim());
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
					const infoFile = publicPathToFilePath(`${projectDir}/01_cover/Info.txt`);
					const coverFile = publicPathToFilePath(`${projectDir}/01_cover/hero-image.png`);
					if (!existsSync(infoFile) || !existsSync(coverFile)) return undefined;

					const infoText = readFileSync(infoFile, 'utf-8');
					const info = parseProjectInfo(infoText);
					if (!/^category/im.test(infoText)) {
						console.warn(`[content] ${projectId} 的 Info.txt 缺少 Category 字段，暂归入 Course`);
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

export function getProjectsByCategory() {
	const projects = getProjects();
	return {
		main: projects
			.filter((project) => project.info.category === 'main')
			.sort((a, b) => MILESTONE_ORDER[a.info.milestone ?? 'FMP'] - MILESTONE_ORDER[b.info.milestone ?? 'FMP']),
		course: projects.filter((project) => project.info.category === 'course'),
		extracurricular: projects.filter((project) => project.info.category === 'extracurricular'),
	};
}

/** 扫描 02-storyline 下的 figure-N.* 图片（兼容 figure1 / Figure_1 / figure 1 等写法） */
function getFigures(projectDir: string): Figure[] {
	const storylinePath = publicPathToFilePath(`${projectDir}/02-storyline`);
	if (!existsSync(storylinePath)) return [];

	return readdirSync(storylinePath)
		.map((fileName) => {
			const match = fileName.match(/^figure[\s_-]?(\d+)\.(png|jpe?g|webp|gif|svg)$/i);
			if (!match || !statSync(join(storylinePath, fileName)).isFile()) return undefined;
			return {
				index: Number(match[1]),
				src: encodePublicUrl(`${projectDir}/02-storyline/${fileName}`),
				caption: `Figure ${match[1]}`,
			} satisfies Figure;
		})
		.filter((figure): figure is Figure => Boolean(figure))
		.sort((a, b) => a.index - b.index);
}

/** 解析 ea-contribution.txt：分段并提取每段中的 figure~N 引用 */
function parseContribution(text: string): ContributionBlock[] {
	return text
		.trim()
		.split(/\r?\n+/)
		.map((paragraph) => paragraph.trim())
		.filter(Boolean)
		.map((paragraph) => {
			const figureRefs = Array.from(paragraph.matchAll(/figure\s*~\s*(\d+)/gi), (m) => Number(m[1]));
			return { text: paragraph, figureRefs: Array.from(new Set(figureRefs)) };
		});
}

/** 从 02-storyline 的 Dribbble 存档 HTML 中提取原始页面链接 */
function getDribbbleUrl(projectDir: string): string | undefined {
	const storylinePath = publicPathToFilePath(`${projectDir}/02-storyline`);
	if (!existsSync(storylinePath)) return undefined;

	const archive = readdirSync(storylinePath).find(
		(fileName) => fileName.toLowerCase().endsWith('.html') && statSync(join(storylinePath, fileName)).isFile()
	);
	if (!archive) return undefined;

	const html = readFileSync(join(storylinePath, archive), 'utf-8');
	// 优先取作品页（/shots/...）链接，避免误取个人主页
	const match =
		html.match(/<link[^>]+rel="canonical"[^>]+href="(https:\/\/dribbble\.com\/shots\/[^"?]+)"/i) ??
		html.match(/property="og:url"[^>]*content="(https:\/\/dribbble\.com\/shots\/[^"?]+)"/i) ??
		html.match(/"(https:\/\/dribbble\.com\/shots\/[\w-]+)"/i);
	return match?.[1];
}

export function getProjectDetails(): ProjectDetail[] {
	return getProjects().map((project) => {
		const contributionFile = publicPathToFilePath(`${project.projectDir}/03-ea-contribution/ea-contribution.txt`);
		const contributionText = existsSync(contributionFile) ? readFileSync(contributionFile, 'utf-8') : '';

		return {
			...project,
			figures: getFigures(project.projectDir),
			blocks: parseContribution(contributionText),
			dribbbleUrl: getDribbbleUrl(project.projectDir),
		};
	});
}

/** 读取 public/content/ 下的版块文字（identity / vision / expertise-areas / development） */
export function getSectionText(name: string) {
	const filePath = join(process.cwd(), 'public', 'content', `${name}.txt`);
	if (!existsSync(filePath)) return [];
	return readFileSync(filePath, 'utf-8')
		.trim()
		.split(/\r?\n+/)
		.map((paragraph) => paragraph.trim())
		.filter((paragraph) => Boolean(paragraph) && !paragraph.startsWith('（在此粘贴'));
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
