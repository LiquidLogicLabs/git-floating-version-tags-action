import { exec } from "@actions/exec";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Store original environment and working directory
const originalEnv = { ...process.env };
const originalCwd = process.cwd();
let tempRepoDir: string | null = null;

// Mock @actions/core to capture outputs
const mockSetOutput = jest.fn();
const mockInfo = jest.fn((msg: string) => console.log(`ℹ️  ${msg}`));
const mockDebug = jest.fn((msg: string) => console.log(`🐛 ${msg}`));
const mockWarning = jest.fn((msg: string) => console.warn(`⚠️  ${msg}`));
const mockError = jest.fn((msg: string) => console.error(`❌ ${msg}`));
const mockSetFailed = jest.fn((msg: string) => {
	console.error(`💥 ${msg}`);
	throw new Error(msg);
});

jest.mock("@actions/core", () => ({
	getInput: jest.fn((name: string, options?: { required?: boolean }) => {
		const envKey = `INPUT_${name.toUpperCase()}`;
		const value = process.env[envKey] || "";
		if (options?.required && !value) {
			throw new Error(`Input required and not supplied: ${name}`);
		}
		return value;
	}),
	getBooleanInput: jest.fn((name: string) => {
		const envKey = `INPUT_${name.toUpperCase()}`;
		const value = process.env[envKey] || "false";
		return value === "true";
	}),
	setOutput: mockSetOutput,
	info: mockInfo,
	debug: mockDebug,
	warning: mockWarning,
	error: mockError,
	setFailed: mockSetFailed,
}));

// Mock pushTag to skip actual git push (we'll verify tags locally)
const mockPushTag = jest.fn().mockResolvedValue(undefined);
jest.mock("../git", () => {
	const original = jest.requireActual("../git");
	return {
		...original,
		pushTag: mockPushTag,
	};
});

// Helper functions for git operations (all run in temp repo)
async function runGitCommand(args: string[], options?: { silent?: boolean; cwd?: string }): Promise<string> {
	let output = "";
	const cwd = options?.cwd || tempRepoDir || process.cwd();
	try {
		await exec("git", args, {
			cwd,
			listeners: {
				stdout: (data: Buffer) => {
					output += data.toString();
				},
			},
			silent: options?.silent ?? false,
		});
		return output.trim();
	} catch (error) {
		if (options?.silent) {
			return "";
		}
		throw error;
	}
}

function runGitSync(args: string[], cwd?: string): string {
	const workDir = cwd || tempRepoDir || process.cwd();
	if (!workDir) {
		throw new Error("No working directory specified for git command");
	}
	try {
		// Use execFile to avoid shell interpretation issues with arguments
		const { execFileSync } = require("child_process");
		const result = execFileSync("git", args, {
			encoding: "utf-8",
			cwd: workDir,
			stdio: ["pipe", "pipe", "pipe"], // Suppress stderr to avoid noise
		});
		return result ? result.toString().trim() : "";
	} catch (error: any) {
		// Return empty string on error (caller should handle)
		// Log error for debugging if needed
		if (process.env.DEBUG_TESTS) {
			console.error(`Git command failed: git ${args.join(" ")} in ${workDir}:`, error.message);
		}
		return "";
	}
}

function gitTagExists(tagName: string): boolean {
	try {
		const result = runGitSync(["rev-parse", `refs/tags/${tagName}`]);
		return result.length === 40;
	} catch {
		return false;
	}
}

function getTagSha(tagName: string): string | null {
	try {
		const result = runGitSync(["rev-parse", `refs/tags/${tagName}`], tempRepoDir!);
		// Return null if empty string or invalid SHA (SHA should be exactly 40 chars)
		if (!result || result.trim().length !== 40) {
			return null;
		}
		return result.trim();
	} catch {
		return null;
	}
}

// Helper to create a tag in the temp repo
async function createTestTag(tagName: string, commitSha?: string): Promise<void> {
	if (!tempRepoDir) {
		throw new Error("Temp repo not initialized");
	}
	const sha = commitSha || runGitSync(["rev-parse", "HEAD"], tempRepoDir);
	if (!sha || sha.trim().length !== 40) {
		throw new Error(`Invalid commit SHA: "${sha}" (length: ${sha?.length || 0})`);
	}
	const shaTrimmed = sha.trim();
	try {
		await runGitCommand(["tag", "-a", tagName, "-m", `Test tag ${tagName}`, shaTrimmed], { silent: true });
	} catch (error) {
		// Tag might already exist, try to delete and recreate
		try {
			await runGitCommand(["tag", "-d", tagName], { silent: true });
			await runGitCommand(["tag", "-a", tagName, "-m", `Test tag ${tagName}`, shaTrimmed], { silent: true });
		} catch (e) {
			// Ignore - tag might be fine or we'll fail later
			console.log(`Warning: Could not create/recreate tag ${tagName}: ${e}`);
		}
	}
}

// Import the action run function (after mocks are set up)
import { run as runAction } from "../index";

describe("Integration Tests", () => {
	beforeAll(async () => {
		// Create temporary directory for test repository
		tempRepoDir = fs.mkdtempSync(path.join(os.tmpdir(), "git-action-test-"));

		// Initialize git repository
		runGitSync(["init"], tempRepoDir);
		runGitSync(["config", "user.name", "Test User"], tempRepoDir);
		runGitSync(["config", "user.email", "test@example.com"], tempRepoDir);

		// Create initial commit (needed for tag operations)
		fs.writeFileSync(path.join(tempRepoDir, "README.md"), "# Test Repository\n");
		const addResult = runGitSync(["add", "README.md"], tempRepoDir);
		const commitResult = runGitSync(["commit", "-m", "Initial commit"], tempRepoDir);
		// Check if commit succeeded by verifying HEAD exists
		const headCheck = runGitSync(["rev-parse", "HEAD"], tempRepoDir);
		if (!headCheck || headCheck.length !== 40) {
			// Try to see what went wrong
			const status = runGitSync(["status"], tempRepoDir);
			throw new Error(`Failed to create initial commit. Status: ${status}, HEAD: "${headCheck}"`);
		}

		// Verify commit was created
		const headSha = runGitSync(["rev-parse", "HEAD"], tempRepoDir);
		if (!headSha || headSha.length !== 40) {
			throw new Error(`Failed to create initial commit in temp repo. HEAD SHA: "${headSha}"`);
		}

		// Change to temp directory for tests
		process.chdir(tempRepoDir);
	});

	afterAll(() => {
		// Restore original working directory
		process.chdir(originalCwd);

		// Clean up temporary repository
		if (tempRepoDir && fs.existsSync(tempRepoDir)) {
			fs.rmSync(tempRepoDir, { recursive: true, force: true });
		}
	});

	beforeEach(() => {
		jest.clearAllMocks();
		mockPushTag.mockClear();
		process.env = { ...originalEnv };
		// Ensure we're in the temp repo for each test
		if (tempRepoDir) {
			process.chdir(tempRepoDir);
		}
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	test("Test 1: Tag with v prefix", async () => {
		console.log("\n🔍 Test 1: Tag with v prefix");

		// Setup - create source tag locally (no push needed)
		const tagName = "v1.2.3";
		await createTestTag(tagName);

		// Run action (should use process.cwd() which is tempRepoDir)
		process.env.INPUT_TAG = tagName;
		process.env.INPUT_UPDATEMINOR = "true";
		process.env.INPUT_VERBOSE = "true";

		await runAction();

		// Verify tags exist locally (no fetch needed since we don't push)
		const majorSha = getTagSha("v1");
		const minorSha = getTagSha("v1.2");
		const tagSha = getTagSha(tagName);

		expect(majorSha).toBeTruthy();
		expect(minorSha).toBeTruthy();
		expect(tagSha).toBeTruthy();
		expect(majorSha).toBe(tagSha);
		expect(minorSha).toBe(tagSha);

		console.log("✅ Major tag v1 and minor tag v1.2 correctly point to v1.2.3 commit");
		expect(mockSetOutput).toHaveBeenCalledWith("majorTag", "v1");
		expect(mockSetOutput).toHaveBeenCalledWith("minorTag", "v1.2");
	});

	test("Test 2: Tag without v prefix", async () => {
		console.log("\n🔍 Test 2: Tag without v prefix");

		// Setup
		const tagName = "2.0.0";
		await createTestTag(tagName);

		// Run action
		process.env.INPUT_TAG = tagName;
		process.env.INPUT_UPDATEMINOR = "true";

		await runAction();

		// Verify tags exist locally
		const majorSha = getTagSha("v2");
		const minorSha = getTagSha("v2.0");
		const tagSha = getTagSha(tagName);

		expect(majorSha).toBe(tagSha);
		expect(minorSha).toBe(tagSha);

		console.log("✅ Major tag v2 and minor tag v2.0 correctly point to 2.0.0 commit");
	});

	test("Test 3: Different refTag", async () => {
		console.log("\n🔍 Test 3: Different refTag");

		// Setup
		const tagName = "3.0.0";
		await createTestTag(tagName);

		// Run action
		process.env.INPUT_TAG = tagName;
		process.env.INPUT_REFTAG = "HEAD";
		process.env.INPUT_UPDATEMINOR = "false";

		await runAction();

		// Verify tags exist locally
		const majorSha = getTagSha("v3");
		const headSha = runGitSync(["rev-parse", "HEAD"], tempRepoDir!);

		expect(majorSha).toBe(headSha);

		console.log("✅ Major tag v3 correctly points to HEAD commit (refTag behavior works)");
	});

	test("Test 4: Prerelease skipping", async () => {
		console.log("\n🔍 Test 4: Prerelease skipping");

		// Setup - cleanup
		try {
			await runGitCommand(["tag", "-d", "v4"], { silent: true });
		} catch {
			// Tag might not exist, continue
		}

		const tagName = "v4.0.0-beta.1";
		await createTestTag(tagName);

		// Run action - should fail (setFailed will throw in mock)
		process.env.INPUT_TAG = tagName;
		process.env.INPUT_UPDATEMINOR = "false";
		process.env.INPUT_IGNOREPRERELEASE = "true"; // Enable prerelease skipping

		// Clear mock before running
		mockSetFailed.mockClear();

		// Run action - setFailed will throw, catch it
		try {
			await runAction();
		} catch (error) {
			// Expected - setFailed throws
		}

		// Verify setFailed was called
		expect(mockSetFailed).toHaveBeenCalled();

		// Verify tag doesn't exist locally
		const localTag = getTagSha("v4");
		expect(localTag).toBeNull();

		console.log("✅ Prerelease version correctly skipped (no v4 tag created)");
	});

	test("Test 5: Custom prefix", async () => {
		console.log("\n🔍 Test 5: Custom prefix");

		// Setup - use format that parseVersion can handle (strip prefix manually)
		// The action's parseVersion only handles 'v' prefix, so we'll use a tag without prefix
		const tagName = "5.1.0"; // No prefix - parseVersion expects this format
		await createTestTag(tagName);

		// Run action with custom prefix
		process.env.INPUT_TAG = tagName;
		process.env.INPUT_PREFIX = "release-"; // Custom prefix for output tags
		process.env.INPUT_UPDATEMINOR = "true";

		await runAction();

		// Verify

		const majorSha = getTagSha("release-5");
		const minorSha = getTagSha("release-5.1");
		const tagSha = getTagSha(tagName);

		expect(majorSha).toBe(tagSha);
		expect(minorSha).toBe(tagSha);

		console.log("✅ Custom prefix tags correctly created");
	});

	test("Test 6: Major tag only (updateMinor=false)", async () => {
		console.log("\n🔍 Test 6: Major tag only");

		// Setup
		const tagName = "v6.1.0";
		await createTestTag(tagName);

		// Run action
		process.env.INPUT_TAG = tagName;
		process.env.INPUT_UPDATEMINOR = "false";

		await runAction();

		// Verify

		const majorSha = getTagSha("v6");
		const tagSha = getTagSha(tagName);
		const minorExists = getTagSha("v6.1");

		expect(majorSha).toBe(tagSha);
		expect(minorExists).toBeNull();

		console.log("✅ Major tag v6 created, minor tag v6.1 not created (as expected)");
	});

	test("Test 7: Update existing floating tag (force update)", async () => {
		console.log("\n🔍 Test 7: Force update existing tag");

		// Setup
		const initialTag = "v7.0.0";
		const newTag = "v7.1.0";
		await createTestTag(initialTag);
		const initialSha = runGitSync(["rev-parse", `refs/tags/${initialTag}`], tempRepoDir!);
		await createTestTag("v7", initialSha);
		await createTestTag(newTag);

		// Run action
		process.env.INPUT_TAG = newTag;
		process.env.INPUT_UPDATEMINOR = "false";

		await runAction();

		// Verify

		const floatingSha = getTagSha("v7");
		const newTagSha = getTagSha(newTag);

		expect(floatingSha).toBe(newTagSha);

		console.log("✅ Floating tag v7 successfully updated to point to v7.1.0");
	});

	test("Test 8: Prerelease with ignorePrerelease=false", async () => {
		console.log("\n🔍 Test 8: Prerelease allowed");

		// Setup
		const tagName = "v8.0.0-rc.1";
		await createTestTag(tagName);

		// Run action
		process.env.INPUT_TAG = tagName;
		process.env.INPUT_IGNOREPRERELEASE = "false";
		process.env.INPUT_UPDATEMINOR = "false";

		await runAction();

		// Verify

		const majorTag = getTagSha("v8");
		const prereleaseSha = getTagSha(tagName);

		expect(majorTag).toBe(prereleaseSha);

		console.log("✅ Prerelease version processed correctly (v8 tag created)");
	});

	test("Test 9: RefTag pointing to different commit", async () => {
		console.log("\n🔍 Test 9: RefTag pointing to different commit");

		// Setup - create a commit
		const testFile = path.join(tempRepoDir!, "test-file.txt");
		fs.writeFileSync(testFile, "test content");
		try {
			runGitSync(["add", testFile], tempRepoDir!);
			runGitSync(["commit", "-m", "Test commit for refTag"], tempRepoDir!);
		} catch {
			// File might already be committed, continue
		}

		const headSha = runGitSync(["rev-parse", "HEAD"], tempRepoDir!);
		const previousSha = runGitSync(["rev-parse", "HEAD~1"], tempRepoDir!).split("\n")[0] || headSha;

		const tagName = "v9.0.0";
		await createTestTag(tagName, previousSha);

		// Run action
		process.env.INPUT_TAG = tagName;
		process.env.INPUT_REFTAG = "HEAD";
		process.env.INPUT_UPDATEMINOR = "false";

		await runAction();

		// Verify

		const floatingSha = getTagSha("v9");
		const currentHeadSha = runGitSync(["rev-parse", "HEAD"], tempRepoDir!);
		const tagSha = getTagSha(tagName);

		expect(floatingSha).toBe(currentHeadSha);
		expect(currentHeadSha).not.toBe(tagSha);

		console.log("✅ Floating tag v9 points to HEAD (different from v9.0.0 tag)");

		// Cleanup
		try {
			if (fs.existsSync(testFile)) {
				fs.unlinkSync(testFile);
			}
			runGitSync(["reset", "--hard", "HEAD~1"], tempRepoDir!);
		} catch {
			// Ignore cleanup errors
		}
	});

	test("Test 10: Zero versions (v0.x.x)", async () => {
		console.log("\n🔍 Test 10: Zero versions");

		// Setup
		const tagName = "v0.1.0";
		await createTestTag(tagName);

		// Run action
		process.env.INPUT_TAG = tagName;
		process.env.INPUT_UPDATEMINOR = "true";

		await runAction();

		// Verify

		const majorSha = getTagSha("v0");
		const minorSha = getTagSha("v0.1");
		const tagSha = getTagSha(tagName);

		expect(majorSha).toBe(tagSha);
		expect(minorSha).toBe(tagSha);

		console.log("✅ Zero version tags correctly created");
	});

	test("Test 11: Output verification", async () => {
		console.log("\n🔍 Test 11: Verify outputs");

		// Setup
		const tagName = "v11.2.3";
		await createTestTag(tagName);

		// Run action
		process.env.INPUT_TAG = tagName;
		process.env.INPUT_UPDATEMINOR = "true";

		await runAction();

		// Verify outputs
		expect(mockSetOutput).toHaveBeenCalledWith("majorTag", "v11");
		expect(mockSetOutput).toHaveBeenCalledWith("minorTag", "v11.2");

		console.log("✅ Outputs correctly set: majorTag=v11, minorTag=v11.2");
	});
});
