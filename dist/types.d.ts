/**
 * Version information extracted from a tag
 */
export interface VersionInfo {
    major: number;
    minor: number;
    patch: number;
    original: string;
    isPrerelease: boolean;
    prerelease?: string;
    build?: string;
}
/**
 * Action input parameters
 */
export interface ActionInputs {
    tag: string;
    refTag: string;
    prefix: string;
    updateMinor: boolean;
    ignorePrerelease: boolean;
    verbose: boolean;
}
/**
 * Result of a tag operation
 */
export interface TagOperationResult {
    tagName: string;
    commitSha: string;
    created: boolean;
    updated: boolean;
}
