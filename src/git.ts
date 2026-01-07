import * as core from '@actions/core';
import { exec } from '@actions/exec';
import { TagOperationResult } from './types';

/**
 * Gets the commit SHA for a given reference (tag, branch, or SHA)
 */
export async function getCommitSha(
  ref: string,
  verbose: boolean
): Promise<string> {
  core.info(`Resolving commit SHA for reference: ${ref}`);

  let output = '';
  const options = {
    listeners: {
      stdout: (data: Buffer) => {
        output += data.toString();
      }
    },
    silent: !verbose
  };

  try {
    await exec('git', ['rev-parse', ref], options);
    const sha = output.trim();

    if (!sha || sha.length !== 40) {
      throw new Error(`Invalid commit SHA resolved: ${sha}`);
    }

    if (verbose) {
      core.debug(`Resolved commit SHA: ${sha}`);
    }

    core.info(`Resolved commit SHA: ${sha.substring(0, 7)}...`);
    return sha;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to resolve commit SHA for "${ref}": ${message}`);
  }
}

/**
 * Checks if a tag exists locally
 */
export async function tagExists(tagName: string, verbose: boolean): Promise<boolean> {
  if (verbose) {
    core.debug(`Checking if tag exists: ${tagName}`);
  }

  try {
    const exitCode = await exec('git', ['rev-parse', `refs/tags/${tagName}`], {
      silent: true,
      ignoreReturnCode: true
    });
    return exitCode === 0;
  } catch {
    return false;
  }
}

/**
 * Creates or updates a git tag
 */
export async function createOrUpdateTag(
  tagName: string,
  commitSha: string,
  verbose: boolean
): Promise<TagOperationResult> {
  const exists = await tagExists(tagName, verbose);

  if (exists) {
    core.info(`Updating existing tag: ${tagName} -> ${commitSha.substring(0, 7)}`);
    if (verbose) {
      core.debug(`Using git tag -f to force update tag ${tagName}`);
    }

    // Force update existing tag
    await exec('git', ['tag', '-f', tagName, commitSha], {
      silent: !verbose
    });

    return {
      tagName,
      commitSha,
      created: false,
      updated: true
    };
  } else {
    core.info(`Creating new tag: ${tagName} -> ${commitSha.substring(0, 7)}`);
    if (verbose) {
      core.debug(`Using git tag to create new tag ${tagName}`);
    }

    // Create new tag
    await exec('git', ['tag', tagName, commitSha], {
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
export async function pushTag(
  tagName: string,
  force: boolean,
  verbose: boolean
): Promise<void> {
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
    await exec('git', args, {
      silent: !verbose
    });
    core.info(`Successfully pushed tag ${tagName} to remote`);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to push tag ${tagName}: ${message}`);
  }
}

/**
 * Verifies that a tag points to the expected commit
 */
export async function verifyTag(
  tagName: string,
  expectedSha: string,
  verbose: boolean
): Promise<boolean> {
  if (verbose) {
    core.debug(`Verifying tag ${tagName} points to ${expectedSha}`);
  }

  try {
    const actualSha = await getCommitSha(`refs/tags/${tagName}`, verbose);
    const matches = actualSha === expectedSha;

    if (verbose) {
      core.debug(
        `Tag verification: ${matches ? 'PASSED' : 'FAILED'} (expected: ${expectedSha.substring(0, 7)}, actual: ${actualSha.substring(0, 7)})`
      );
    }

    return matches;
  } catch {
    return false;
  }
}
