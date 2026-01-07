"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCommitSha = getCommitSha;
exports.tagExists = tagExists;
exports.createOrUpdateTag = createOrUpdateTag;
exports.pushTag = pushTag;
exports.verifyTag = verifyTag;
const core = __importStar(require("@actions/core"));
const exec_1 = require("@actions/exec");
/**
 * Gets the commit SHA for a given reference (tag, branch, or SHA)
 */
async function getCommitSha(ref, verbose) {
    core.info(`Resolving commit SHA for reference: ${ref}`);
    let output = '';
    const options = {
        listeners: {
            stdout: (data) => {
                output += data.toString();
            }
        },
        silent: !verbose
    };
    try {
        await (0, exec_1.exec)('git', ['rev-parse', ref], options);
        const sha = output.trim();
        if (!sha || sha.length !== 40) {
            throw new Error(`Invalid commit SHA resolved: ${sha}`);
        }
        if (verbose) {
            core.debug(`Resolved commit SHA: ${sha}`);
        }
        core.info(`Resolved commit SHA: ${sha.substring(0, 7)}...`);
        return sha;
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error occurred';
        throw new Error(`Failed to resolve commit SHA for "${ref}": ${message}`);
    }
}
/**
 * Checks if a tag exists locally
 */
async function tagExists(tagName, verbose) {
    if (verbose) {
        core.debug(`Checking if tag exists: ${tagName}`);
    }
    try {
        const exitCode = await (0, exec_1.exec)('git', ['rev-parse', `refs/tags/${tagName}`], {
            silent: true,
            ignoreReturnCode: true
        });
        return exitCode === 0;
    }
    catch {
        return false;
    }
}
/**
 * Creates or updates a git tag
 */
async function createOrUpdateTag(tagName, commitSha, verbose) {
    const exists = await tagExists(tagName, verbose);
    if (exists) {
        core.info(`Updating existing tag: ${tagName} -> ${commitSha.substring(0, 7)}`);
        if (verbose) {
            core.debug(`Using git tag -f to force update tag ${tagName}`);
        }
        // Force update existing tag
        await (0, exec_1.exec)('git', ['tag', '-f', tagName, commitSha], {
            silent: !verbose
        });
        return {
            tagName,
            commitSha,
            created: false,
            updated: true
        };
    }
    else {
        core.info(`Creating new tag: ${tagName} -> ${commitSha.substring(0, 7)}`);
        if (verbose) {
            core.debug(`Using git tag to create new tag ${tagName}`);
        }
        // Create new tag
        await (0, exec_1.exec)('git', ['tag', tagName, commitSha], {
            silent: !verbose
        });
        return {
            tagName,
            commitSha,
            created: true,
            updated: false
        };
    }
}
/**
 * Pushes a tag to the remote repository
 */
async function pushTag(tagName, force, verbose) {
    const action = force ? 'force pushing' : 'pushing';
    core.info(`${action} tag ${tagName} to remote`);
    const args = ['push', 'origin', tagName];
    if (force) {
        args.push('--force');
    }
    if (verbose) {
        core.debug(`Executing: git ${args.join(' ')}`);
    }
    try {
        await (0, exec_1.exec)('git', args, {
            silent: !verbose
        });
        core.info(`Successfully pushed tag ${tagName} to remote`);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error occurred';
        throw new Error(`Failed to push tag ${tagName}: ${message}`);
    }
}
/**
 * Verifies that a tag points to the expected commit
 */
async function verifyTag(tagName, expectedSha, verbose) {
    if (verbose) {
        core.debug(`Verifying tag ${tagName} points to ${expectedSha}`);
    }
    try {
        const actualSha = await getCommitSha(`refs/tags/${tagName}`, verbose);
        const matches = actualSha === expectedSha;
        if (verbose) {
            core.debug(`Tag verification: ${matches ? 'PASSED' : 'FAILED'} (expected: ${expectedSha.substring(0, 7)}, actual: ${actualSha.substring(0, 7)})`);
        }
        return matches;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=git.js.map