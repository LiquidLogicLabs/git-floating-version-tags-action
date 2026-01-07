# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - TBD

### Added
- Initial implementation
- Support for creating/updating floating major version tags (e.g., `v2`)
- Support for creating/updating floating minor version tags (e.g., `v2.3`)
- Auto-detection of tags with or without 'v' prefix
- Optional `refTag` input to point floating tags to a different commit
- Configurable prefix for output tag names
- Prerelease version filtering (optional)
- Verbose debug logging support
- Comprehensive git CLI integration tests
- Basic logging for all operations

### Features
- Extracts semantic version from input tag
- Creates or updates floating tags pointing to reference commit
- Pushes tags to remote repository
- Validates inputs and provides clear error messages
- Supports both `v1.2.3` and `1.2.3` tag formats
- Type-safe TypeScript implementation

