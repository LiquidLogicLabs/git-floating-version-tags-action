import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { execFileSync } from "child_process";
import { run as runAction } from "../../index";

const originalEnv = { ...process.env };
const originalCwd = process.cwd();

let workDir: string;
let bareDir: string;

function execGit(args: string[], cwd?: string, silent = false): string {
	const workingDir = cwd || workDir;
	const result = execFileSync("git", args, {
		cwd: workingDir,
		encoding: "utf-8",
		stdio: silent ? "pipe" : ["pipe", "pipe", "pipe"],
	}) as unknown as string;
	return result.trim();
}

function execGitSafe(args: string[], cwd?: string): string {
	try {
		return execGit(args, cwd, true);
	} catch {
		return "";
	}
}

function deleteAllTags(): void {
	const tags = execGitSafe(["tag", "-l"]);
	if (!tags) {
		return;
	}
	for (const tag of tags.split("\n").filter(Boolean)) {
		execGit(["tag", "-d", tag]);
	}
}

function resetBareRepo(): void {
	if (bareDir && fs.existsSync(bareDir)) {
		fs.rmSync(bareDir, { recursive: true, force: true });
	}
	bareDir = fs.mkdtempSync(path.join(os.tmpdir(), "git-floating-bare-"));
	execGit(["init", "--bare", bareDir], workDir);
	execGit(["remote", "set-url", "origin", bareDir], workDir);
}

beforeAll(() => {
	workDir = fs.mkdtempSync(path.join(os.tmpdir(), "git-floating-e2e-"));
	bareDir = fs.mkdtempSync(path.join(os.tmpdir(), "git-floating-bare-"));

	execGit(["init"], workDir);
	execGit(["config", "user.name", "E2E User"], workDir);
	execGit(["config", "user.email", "e2e@example.com"], workDir);

	// seed a commit so tags have something to point to
	fs.writeFileSync(path.join(workDir, "README.md"), "# E2E Repo\n");
	execGit(["add", "README.md"], workDir);
	execGit(["commit", "-m", "init"], workDir);

	execGit(["remote", "add", "origin", bareDir], workDir);
	process.chdir(workDir);
});

afterAll(() => {
	process.chdir(originalCwd);
	process.env = originalEnv;
	if (workDir && fs.existsSync(workDir)) {
		fs.rmSync(workDir, { recursive: true, force: true });
	}
	if (bareDir && fs.existsSync(bareDir)) {
		fs.rmSync(bareDir, { recursive: true, force: true });
	}
});

beforeEach(() => {
	process.env = { ...originalEnv };
	process.chdir(workDir);
	process.env.GIT_WORKING_DIRECTORY = workDir;
	deleteAllTags();
	resetBareRepo();
});

afterEach(() => {
	process.env = originalEnv;
});

describe("E2E: floating tag updates", () => {
	jest.setTimeout(30000);

	test("creates and pushes major/minor tags from version tag", async () => {
		const sourceTag = "v1.2.3";
		execGit(["tag", "-a", sourceTag, "-m", "src tag"], workDir);

		process.env.INPUT_TAG = sourceTag;
		process.env.INPUT_UPDATEMINOR = "true";
		process.env.INPUT_IGNOREPRERELEASE = "false";
		process.env.INPUT_VERBOSE = "false";

		await runAction();

		const tagSha = execGit(["rev-parse", sourceTag], workDir);
		const majorSha = execGit(["rev-parse", "refs/tags/v1"], workDir);
		const minorSha = execGit(["rev-parse", "refs/tags/v1.2"], workDir);

		expect(majorSha).toBe(tagSha);
		expect(minorSha).toBe(tagSha);

		// verify remote tags exist and match
		const remoteMajor = execGitSafe(["--git-dir", bareDir, "rev-parse", "refs/tags/v1"]);
		const remoteMinor = execGitSafe(["--git-dir", bareDir, "rev-parse", "refs/tags/v1.2"]);
		expect(remoteMajor).toBe(tagSha);
		expect(remoteMinor).toBe(tagSha);
	});

	test("creates only major tag when updateMinor=false", async () => {
		const sourceTag = "v2.0.0";
		execGit(["tag", "-a", sourceTag, "-m", "src tag"], workDir);

		process.env.INPUT_TAG = sourceTag;
		process.env.INPUT_UPDATEMINOR = "false";
		process.env.INPUT_IGNOREPRERELEASE = "false";
		process.env.INPUT_VERBOSE = "false";

		await runAction();

		const tagSha = execGit(["rev-parse", sourceTag], workDir);
		const majorSha = execGit(["rev-parse", "refs/tags/v2"], workDir);
		expect(majorSha).toBe(tagSha);

		const minorExists = execGitSafe(["rev-parse", "refs/tags/v2.0"], workDir);
		expect(minorExists).toBe("");

		const remoteMajor = execGitSafe(["--git-dir", bareDir, "rev-parse", "refs/tags/v2"]);
		expect(remoteMajor).toBe(tagSha);

		const remoteMinor = execGitSafe(["--git-dir", bareDir, "rev-parse", "refs/tags/v2.0"]);
		expect(remoteMinor).toBe("");
	});
});
