/**
 * 从旧作品集网站 (E:\Portfolio\portfolio-site\public\files) 同步项目内容。
 *
 * 规则：
 *  - 扫描 Work_YYYY/<projectId>/01_cover/Info.txt
 *  - 只同步起始时间在 RANGE_START 与 RANGE_END 之间的项目（毕业作品集范围）
 *  - 同步到本仓库 public/files/Work_YYYY/<projectId>/（整目录镜像，目标多余文件会被删除）
 *
 * public/files/ 下的内容由本脚本生成，请勿手动编辑——内容一律在旧站目录里维护。
 * 该脚本会在 npm run dev / build 前自动执行，也可手动 `npm run sync`。
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE_ROOT = resolve(__dirname, '../../portfolio-site/public/files');
const TARGET_ROOT = resolve(__dirname, '../public/files');

// 毕业作品集时间范围（含端点），按项目起始时间判断
const RANGE_START = { year: 2024, month: 9 };
const RANGE_END = { year: 2026, month: 9 };

function parseStartDate(infoText) {
	// 兼容半角/全角冒号以及历史乱码（"Time锛?025.9" 之类），直接在 Time 行里找第一个 yyyy.m
	const timeLine = infoText.split(/\r?\n/).find((line) => /^\s*Time/i.test(line));
	const match = timeLine?.match(/(\d{4})\s*[./-]\s*(\d{1,2})/);
	if (!match) return undefined;
	return { year: Number(match[1]), month: Number(match[2]) };
}

function isInRange(date) {
	const value = date.year * 100 + date.month;
	return value >= RANGE_START.year * 100 + RANGE_START.month
		&& value <= RANGE_END.year * 100 + RANGE_END.month;
}

if (!existsSync(SOURCE_ROOT)) {
	console.error(`[sync-content] 找不到内容源目录: ${SOURCE_ROOT}`);
	process.exit(1);
}

const selected = [];
const skipped = [];

for (const yearDir of readdirSync(SOURCE_ROOT)) {
	if (!/^Work_\d{4}$/.test(yearDir)) continue;
	const yearPath = join(SOURCE_ROOT, yearDir);
	if (!statSync(yearPath).isDirectory()) continue;

	for (const projectId of readdirSync(yearPath)) {
		const projectPath = join(yearPath, projectId);
		if (!statSync(projectPath).isDirectory()) continue;

		const infoMd = join(projectPath, '01_cover', 'Info.md');
		const infoTxt = join(projectPath, '01_cover', 'Info.txt');
		const infoPath = existsSync(infoMd) ? infoMd : infoTxt;
		if (!existsSync(infoPath)) {
			skipped.push(`${yearDir}/${projectId} (缺少 Info.md)`);
			continue;
		}

		const startDate = parseStartDate(readFileSync(infoPath, 'utf-8'));
		if (!startDate) {
			skipped.push(`${yearDir}/${projectId} (Time 字段无法解析)`);
			continue;
		}
		if (!isInRange(startDate)) {
			skipped.push(`${yearDir}/${projectId} (起始 ${startDate.year}.${startDate.month} 不在范围内)`);
			continue;
		}

		selected.push({ yearDir, projectId, source: projectPath });
	}
}

// 镜像同步：先清空目标，再复制入选项目
rmSync(TARGET_ROOT, { recursive: true, force: true });
mkdirSync(TARGET_ROOT, { recursive: true });

for (const { yearDir, projectId, source } of selected) {
	const target = join(TARGET_ROOT, yearDir, projectId);
	cpSync(source, target, { recursive: true });
}

console.log(`[sync-content] 已同步 ${selected.length} 个项目 → public/files/`);
for (const { yearDir, projectId } of selected) console.log(`  ✓ ${yearDir}/${projectId}`);
if (skipped.length > 0) {
	console.log(`[sync-content] 已跳过 ${skipped.length} 项:`);
	for (const item of skipped) console.log(`  - ${item}`);
}
