# Git Floating Version Tags Action

[![CI](https://github.com/LiquidLogicLabs/git-floating-version-tags-action/actions/workflows/ci.yml/badge.svg)](https://github.com/LiquidLogicLabs/git-floating-version-tags-action/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)

A GitHub Action that creates or updates floating version tag aliases (major and minor) pointing to a reference commit, extracting version information from a tag. This action supports tags with or without the 'v' prefix and includes comprehensive logging capabilities.

## Features

- ✅ **Simplified input design**: `tag` (required) for version extraction, optional `refTag` (defaults to `tag`) for commit reference
- ✅ **Auto v-prefix handling**: Automatically handles tags with or without 'v' prefix (v1.2.3 or 1.2.3)
- ✅ **Floating tag support**: Creates/updates major (`v2`) and optional minor (`v2.3`) version tags
- ✅ **Version parsing**: Extracts semantic version from tag with configurable prefix for output tags
- ✅ **Prerelease handling**: Optional filtering of prerelease versions
- ✅ **Comprehensive logging**: Basic info logging always enabled, verbose debug logging via input flag
- ✅ **Git CLI integration**: Uses native git commands for reliable tag operations

## Usage

### Basic Example

```yaml
- name: Update Floating Tags
  uses: LiquidLogicLabs/git-floating-version-tags-action@v1
  with:
    tag: 'v2.3.4'
    updateMinor: true
```

This will:
- Extract version `2.3.4` from tag `v2.3.4`
- Create/update tag `v2` pointing to the same commit as `v2.3.4`
- Create/update tag `v2.3` pointing to the same commit as `v2.3.4`

### Tag Without 'v' Prefix

```yaml
- name: Update Floating Tags
  uses: LiquidLogicLabs/git-floating-version-tags-action@v1
  with:
    tag: '2.3.4'  # Works with or without 'v'
    updateMinor: true
```

### Different Reference Tag

Use a different commit/branch for floating tags than the version tag:

```yaml
- name: Update Floating Tags
  uses: LiquidLogicLabs/git-floating-version-tags-action@v1
  with:
    tag: 'v2.3.4'  # Extract version from this
    refTag: 'main'  # Point floating tags to this commit
    updateMinor: true
```

### With Verbose Debug Logging

```yaml
- name: Update Floating Tags
  uses: LiquidLogicLabs/git-floating-version-tags-action@v1
  with:
    tag: 'v2.3.4'
    updateMinor: true
    verbose: true  # Enables detailed debug logging
```

### In a Release Workflow

```yaml
name: Release

on:
  push:
    tags:
      - 'v*.*.*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Update Floating Tags
        uses: LiquidLogicLabs/git-floating-version-tags-action@v1
        with:
          tag: ${{ github.ref_name }}
          updateMinor: true
          verbose: true

      - name: Create Release
        uses: ncipollo/release-action@v1
        with:
          tag: ${{ github.ref_name }}
          token: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `tag` | The tag from which to extract version information (used to determine major/minor versions). Supports tags with or without 'v' prefix (e.g., 'v1.2.3' or '1.2.3') | Yes | - |
| `refTag` | The tag/commit that floating tags should point to (can be tag name, refs/tags/v1.2.3, or SHA). If not provided, uses the value from `tag` | No | Value of `tag` |
| `prefix` | Version prefix for tag names when creating floating tags | No | `v` |
| `updateMinor` | Whether to update minor version tags (v1.2) | No | `false` |
| `ignorePrerelease` | Whether to skip prerelease versions | No | `true` |
| `verbose` | Enable verbose debug logging. Sets ACTIONS_STEP_DEBUG=true environment variable and enables detailed debug output | No | `false` |

## Outputs

| Output | Description |
|--------|-------------|
| `majorTag` | The major version tag that was created/updated (e.g., 'v2') |
| `minorTag` | The minor version tag that was created/updated (e.g., 'v2.3'), if updateMinor is true |

## Examples

### Create Major Tag Only

```yaml
- uses: LiquidLogicLabs/git-floating-version-tags-action@v1
  with:
    tag: 'v1.2.3'
    # updateMinor defaults to false, so only v1 will be created/updated
```

### Create Major and Minor Tags

```yaml
- uses: LiquidLogicLabs/git-floating-version-tags-action@v1
  with:
    tag: 'v1.2.3'
    updateMinor: true
    # Creates/updates both v1 and v1.2
```

### Custom Prefix

```yaml
- uses: LiquidLogicLabs/git-floating-version-tags-action@v1
  with:
    tag: 'release-1.2.3'
    prefix: 'release-'
    updateMinor: true
    # Creates/updates release-1 and release-1.2
```

### Handle Prerelease Versions

By default, prerelease versions are ignored:

```yaml
- uses: LiquidLogicLabs/git-floating-version-tags-action@v1
  with:
    tag: 'v2.0.0-beta.1'
    # Will fail because ignorePrerelease defaults to true
```

To allow prerelease versions:

```yaml
- uses: LiquidLogicLabs/git-floating-version-tags-action@v1
  with:
    tag: 'v2.0.0-beta.1'
    ignorePrerelease: false
    updateMinor: true
    # Creates/updates v2 and v2.0 even for prerelease
```

### Point Floating Tags to a Different Commit

```yaml
- uses: LiquidLogicLabs/git-floating-version-tags-action@v1
  with:
    tag: 'v1.2.3'  # Extract version from this tag
    refTag: 'HEAD'  # But point floating tags to HEAD
    updateMinor: true
    # v1 and v1.2 will point to HEAD, not v1.2.3
```

## How It Works

1. **Version Extraction**: The action parses the `tag` input to extract semantic version components (major, minor, patch)
2. **Commit Resolution**: Resolves the commit SHA from `refTag` (or `tag` if `refTag` is not provided)
3. **Tag Creation/Update**: Creates or updates floating tags:
   - Major tag: `{prefix}{major}` (e.g., `v2`)
   - Minor tag: `{prefix}{major}.{minor}` (e.g., `v2.3`) if `updateMinor` is true
4. **Tag Push**: Pushes the created/updated tags to the remote repository

## Version Format Support

The action supports standard semantic versioning formats:

- `v1.2.3` (with v prefix)
- `1.2.3` (without v prefix)
- `v2.0.0-beta.1` (prerelease with v prefix)
- `2.0.0-beta.1` (prerelease without v prefix)
- `v1.2.3+build.123` (with build metadata)

The `prefix` input only affects the output floating tag names, not the parsing of the input tag.

## Logging

### Basic Logging (Always Enabled)

The action provides informative logging at each step:
- Version extraction
- Commit SHA resolution
- Tag creation/update operations
- Tag push operations

### Verbose Debug Logging

Enable verbose logging by setting `verbose: true`:

```yaml
- uses: LiquidLogicLabs/git-floating-version-tags-action@v1
  with:
    tag: 'v1.2.3'
    verbose: true
```

This enables:
- Detailed debug output via `core.debug()`
- Sets `ACTIONS_STEP_DEBUG=true` for GitHub Actions debug logging
- Shows parsed version components, git command outputs, and intermediate steps

## Security

- The action requires `contents: write` permission to push tags
- Tags are force-updated if they already exist (using `git push --force`)
- The action validates all inputs before execution
- Git commands are executed with proper error handling

## License

This project is licensed under the MIT License.

## Credits

This action is inspired by [zyactions/update-semver](https://github.com/zyactions/update-semver), extending its functionality with:
- Simplified input design
- Auto v-prefix handling
- Comprehensive logging
- Node.js/TypeScript implementation
- Git CLI integration tests

## Testing

### Unit Tests

Run unit tests locally:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Generate coverage report:

```bash
npm run test:coverage
```

### Lint, Build, and Format

Run locally (no act needed):

```bash
npm run lint      # Run ESLint
npm run build     # Build the action
npm run format    # Format code with Prettier
```

Or test via act (runs in CI environment):

```bash
npm run lint:act  # Run lint job via act (includes lint, type check, and build)
```

### Integration Tests

Integration tests run automatically in GitHub Actions (`.github/workflows/test.yml`). 

To test locally:

**Option 1: Use `act` via npm scripts (recommended for local testing)**
```bash
# Run test workflow
npm run test:act

# Run test workflow with verbose output (for debugging)
npm run test:act:verbose

# Run CI workflow (includes lint and test)
npm run test:act:ci

# Run just the lint job via act (lint, type check, build)
npm run lint:act

# Run release workflow (requires tag)
npm run test:act:release
```

Or manually with `act`:
```bash
# Install act: https://github.com/nektos/act
act -W .github/workflows/test.yml
```

**Option 2: Manual testing**
```bash
# Build the action first
npm run build

# Set environment variables (GitHub Actions converts camelCase inputs to uppercase)
export INPUT_TAG=v1.2.3
export INPUT_UPDATEMINOR=true
export INPUT_REFTAG=v1.2.3
export INPUT_IGNOREPRERELEASE=true
export INPUT_VERBOSE=false

# Run the action
node dist/index.js
```

**Note**: Full integration tests with git push operations require a git repository with remote access and are best tested in CI/CD.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

