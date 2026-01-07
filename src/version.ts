import * as core from '@actions/core';
import { VersionInfo } from './types';

/**
 * Extracts version information from a tag name
 * Supports tags with or without 'v' prefix (e.g., 'v1.2.3' or '1.2.3')
 */
export function parseVersion(tag: string, verbose: boolean): VersionInfo {
  core.debug(`Parsing version from tag: ${tag}`);

  // Remove 'refs/tags/' prefix if present
  let tagName = tag.replace(/^refs\/tags\//, '');

  // Auto-detect and handle 'v' prefix
  const hasVPrefix = tagName.startsWith('v');
  if (hasVPrefix) {
    core.debug(`Detected 'v' prefix, will strip for parsing`);
    tagName = tagName.substring(1);
  }

  // Parse semantic version: major.minor.patch[-prerelease][+build]
  // Try matching version pattern directly first
  let versionRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([^+]+))?(?:\+(.+))?$/;
  let match = tagName.match(versionRegex);

  // If no match, try to extract version from tags with custom prefixes (e.g., 'release-5.1.0')
  if (!match) {
    // Find the first occurrence of digit.digit.digit pattern anywhere in the string
    versionRegex = /(\d+)\.(\d+)\.(\d+)(?:-([^+]+))?(?:\+(.+))?$/;
    match = tagName.match(versionRegex);
    
    if (match && verbose) {
      core.debug(`Extracted version from custom prefix tag: ${match[0]}`);
    }
  }

  if (!match) {
    throw new Error(
      `Invalid semantic version format: ${tag}. Expected format: v1.2.3 or 1.2.3 (with optional prerelease/build)`
    );
  }

  const major = parseInt(match[1], 10);
  const minor = parseInt(match[2], 10);
  const patch = parseInt(match[3], 10);
  const prerelease = match[4];
  const build = match[5];
  const isPrerelease = !!prerelease;

  const versionInfo: VersionInfo = {
    major,
    minor,
    patch,
    original: tag,
    isPrerelease,
    prerelease,
    build
  };

  if (verbose) {
    core.debug(`Parsed version components:`);
    core.debug(`  Major: ${major}`);
    core.debug(`  Minor: ${minor}`);
    core.debug(`  Patch: ${patch}`);
    core.debug(`  Prerelease: ${prerelease || 'none'}`);
    core.debug(`  Build: ${build || 'none'}`);
    core.debug(`  Is Prerelease: ${isPrerelease}`);
  }

  return versionInfo;
}

/**
 * Creates a tag name with the specified prefix
 */
export function createTagName(prefix: string, major: number, minor?: number): string {
  if (minor !== undefined) {
    return `${prefix}${major}.${minor}`;
  }
  return `${prefix}${major}`;
}
