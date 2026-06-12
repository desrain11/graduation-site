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
	const milestone = MILESTONE_CODES.find((code) => normalized === code || normalized === code.replace('M', 'M_'));
	if (milestone) return { category: 'main', milestone };
	if (normalized.startsWith('EXTRA')) return { category: 'extracurricular' };
	return { category: 'course' };
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

					const info = parseProjectInfo(readFileSync(infoFile, 'utf-8'));
					if (!info.milestone && !readFileSync(infoFile, 'utf-8').match(/^category/im)) {
						console.warn(`[content] ${projectId} 的 Info.txt 缺少 Category 字段，暂归入 Course`);
					}

					return {
						id: projectId,
						slug: slugifyProjectId(projectId, year),
						year,
						projectDir,
						coverImage: encodePublicUrl(`${projectDir}/01_cover/hero-image.png`),
						info,
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

export function getProjectBySlug(slug: string) {
	return getProjects().find((project) => project.slug === slug);
}

/** 读取 public/content/ 下的版块文字（Identity / Vision / Expertise Areas / Development） */
export function getSectionText(name: string) {
	const filePath = join(process.cwd(), 'public', 'content', `${name}.txt`);
	return existsSync(filePath) ? readFileSync(filePath, 'utf-8').trim() : '';
}

export function formatProjectDate(time: string) {
	const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	const matches = Array.from(time.matchAll(/(\d{4})[./-](\d{1,2})/g));
	if (matches.length === 0) return time;

	const formatted = matches.map((match) => {
		const month = monthNames[Number(match[2]) - 1];
		return month ? `${month} ${match[1]}` : match[1];
	});
	return Array.from(new Set(formatted)).join(' - ');
}
