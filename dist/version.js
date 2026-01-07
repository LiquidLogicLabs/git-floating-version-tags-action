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
exports.parseVersion = parseVersion;
exports.createTagName = createTagName;
const core = __importStar(require("@actions/core"));
/**
 * Extracts version information from a tag name
 * Supports tags with or without 'v' prefix (e.g., 'v1.2.3' or '1.2.3')
 */
function parseVersion(tag, verbose) {
    core.debug(`Parsing version from tag: ${tag}`);
    // Remove 'refs/tags/' prefix if present
    let tagName = tag.replace(/^refs\/tags\//, "");
    // Auto-detect and handle 'v' prefix
    const hasVPrefix = tagName.startsWith("v");
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
        if (match) {
            core.debug(`Extracted version from custom prefix tag: ${match[0]}`);
        }
    }
    if (!match) {
        throw new Error(`Invalid semantic version format: ${tag}. Expected format: v1.2.3 or 1.2.3 (with optional prerelease/build)`);
    }
    const major = parseInt(match[1], 10);
    const minor = parseInt(match[2], 10);
    const patch = parseInt(match[3], 10);
    const prerelease = match[4];
    const build = match[5];
    const isPrerelease = !!prerelease;
    const versionInfo = {
        major,
        minor,
        patch,
        original: tag,
        isPrerelease,
        prerelease,
        build,
    };
    core.debug(`Parsed version components:`);
    core.debug(`  Major: ${major}`);
    core.debug(`  Minor: ${minor}`);
    core.debug(`  Patch: ${patch}`);
    core.debug(`  Prerelease: ${prerelease || "none"}`);
    core.debug(`  Build: ${build || "none"}`);
    core.debug(`  Is Prerelease: ${isPrerelease}`);
    return versionInfo;
}
/**
 * Creates a tag name with the specified prefix
 */
function createTagName(prefix, major, minor) {
    if (minor !== undefined) {
        return `${prefix}${major}.${minor}`;
    }
    return `${prefix}${major}`;
}
//# sourceMappingURL=version.js.map