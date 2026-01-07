import { TagOperationResult } from "./types";
/**
 * Gets the commit SHA for a given reference (tag, branch, or SHA)
 */
export declare function getCommitSha(ref: string, verbose: boolean): Promise<string>;
/**
 * Checks if a tag exists locally
 */
export declare function tagExists(tagName: string, verbose: boolean): Promise<boolean>;
/**
 * Creates or updates a git tag
 */
export declare function createOrUpdateTag(tagName: string, commitSha: string, verbose: boolean): Promise<TagOperationResult>;
/**
 * Pushes a tag to the remote repository
 */
export declare function pushTag(tagName: string, force: boolean, verbose: boolean): Promise<void>;
/**
 * Verifies that a tag points to the expected commit
 */
export declare function verifyTag(tagName: string, expectedSha: string, verbose: boolean): Promise<boolean>;
