import * as core from '@actions/core';
import { parseVersion, createTagName } from './version';
import {
  getCommitSha,
  createOrUpdateTag,
  pushTag,
  verifyTag
} from './git';
import { ActionInputs } from './types';

/**
 * Main action entry point
 */
export async function run(): Promise<void> {
  try {
    // Parse inputs
    const tag = core.getInput('tag', { required: true });
    const refTagInput = core.getInput('refTag');
    const prefix = core.getInput('prefix') || 'v';
    const updateMinor = core.getBooleanInput('updateMinor');
    const ignorePrerelease = core.getBooleanInput('ignorePrerelease');
    const verbose = core.getBooleanInput('verbose');

    // Set ACTIONS_STEP_DEBUG if verbose is enabled
    if (verbose) {
      process.env.ACTIONS_STEP_DEBUG = 'true';
      core.debug('Verbose logging enabled');
    }

    // Default refTag to tag if not provided
    const refTag = refTagInput || tag;

    const inputs: ActionInputs = {
      tag,
      refTag,
      prefix,
      updateMinor,
      ignorePrerelease,
      verbose
    };

    if (verbose) {
      core.debug('Action inputs:');
      core.debug(`  tag: ${inputs.tag}`);
      core.debug(`  refTag: ${inputs.refTag}`);
      core.debug(`  prefix: ${inputs.prefix}`);
      core.debug(`  updateMinor: ${inputs.updateMinor}`);
      core.debug(`  ignorePrerelease: ${inputs.ignorePrerelease}`);
      core.debug(`  verbose: ${inputs.verbose}`);
    }

    if (refTag !== tag) {
      core.info(`Using refTag "${refTag}" (different from version tag "${tag}")`);
    }

    // Extract version information from tag
    core.info(`Extracting version from tag: ${tag}`);
    const versionInfo = parseVersion(tag, verbose);

    // Check for prerelease
    if (versionInfo.isPrerelease && ignorePrerelease) {
      core.warning(
        `Tag ${tag} is a prerelease version (${versionInfo.prerelease}). Skipping due to ignorePrerelease=true`
      );
      core.setFailed(
        `Prerelease versions are ignored. Tag "${tag}" contains prerelease identifier "${versionInfo.prerelease}"`
      );
      return;
    }

    if (verbose && versionInfo.isPrerelease) {
      core.debug(
        `Prerelease version detected but proceeding (ignorePrerelease=false): ${versionInfo.prerelease}`
      );
    }

    // Get commit SHA for reference tag
    const commitSha = await getCommitSha(refTag, verbose);

    // Create/update major version tag
    const majorTagName = createTagName(prefix, versionInfo.major);
    core.info(`Creating/updating major tag: ${majorTagName}`);

    const majorTagResult = await createOrUpdateTag(
      majorTagName,
      commitSha,
      verbose
    );

    // Push major tag
    await pushTag(majorTagName, majorTagResult.updated, verbose);

    // Verify major tag
    if (verbose) {
      const verified = await verifyTag(majorTagName, commitSha, verbose);
      if (!verified) {
        core.warning(`Tag ${majorTagName} verification failed`);
      }
    }

    // Set major tag output
    core.setOutput('majorTag', majorTagName);

    // Create/update minor version tag if requested
    if (updateMinor) {
      const minorTagName = createTagName(
        prefix,
        versionInfo.major,
        versionInfo.minor
      );
      core.info(`Creating/updating minor tag: ${minorTagName}`);

      const minorTagResult = await createOrUpdateTag(
        minorTagName,
        commitSha,
        verbose
      );

      // Push minor tag
      await pushTag(minorTagName, minorTagResult.updated, verbose);

      // Verify minor tag
      if (verbose) {
        const verified = await verifyTag(minorTagName, commitSha, verbose);
        if (!verified) {
          core.warning(`Tag ${minorTagName} verification failed`);
        }
      }

      // Set minor tag output
      core.setOutput('minorTag', minorTagName);
    }

    // Summary
    core.info('✅ Successfully created/updated floating version tags');
    if (verbose) {
      core.debug('Action completed successfully');
    }
  } catch (error) {
    if (error instanceof Error) {
      core.error(error.message);
      core.setFailed(error.message);
    } else {
      const message = 'Unknown error occurred';
      core.error(message);
      core.setFailed(message);
    }
  }
}

// Run the action (only when executed directly, not when imported for testing)
if (require.main === module) {
  run();
}
