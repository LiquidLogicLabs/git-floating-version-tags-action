import { VersionInfo } from './types';
/**
 * Extracts version information from a tag name
 * Supports tags with or without 'v' prefix (e.g., 'v1.2.3' or '1.2.3')
 */
export declare function parseVersion(tag: string, verbose: boolean): VersionInfo;
/**
 * Creates a tag name with the specified prefix
 */
export declare function createTagName(prefix: string, major: number, minor?: number): string;
