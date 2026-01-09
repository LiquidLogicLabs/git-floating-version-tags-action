# Development Guide

This document provides information for developers who want to contribute to this project.

## Prerequisites

- Node.js 20 or higher
- npm
- Git
- (Optional) VS Code with Dev Container support for consistent development environment

## Getting Started

### Clone the Repository

```bash
git clone https://github.com/LiquidLogicLabs/git-action-tag-floating-version.git
cd git-action-tag-floating-version
```

### Install Dependencies

```bash
npm install
```

### Development Environment

#### Using Dev Containers (Recommended)

This project includes a `.devcontainer` configuration for a consistent development environment:

1. Open the project in VS Code
2. When prompted, click "Reopen in Container"
3. Dependencies are automatically installed

The dev container includes:
- Node.js 20
- Git
- GitHub CLI
- Pre-configured VS Code extensions (ESLint, Prettier, TypeScript, Jest)

#### Local Setup

If not using dev containers:

```bash
# Install dependencies
npm install

# Verify installation
npm test
```

## Project Structure

```
git-action-tag-floating-version/
├── src/                    # TypeScript source code
│   ├── index.ts           # Main entry point
│   ├── types.ts           # TypeScript type definitions
│   ├── version.ts         # Version parsing logic
│   ├── git.ts             # Git operations
│   └── __tests__/         # Test files
│       ├── version.test.ts
│       └── integration.test.ts
├── dist/                   # Built output (committed to git)
│   └── index.js           # Bundled action code
├── .github/
│   └── workflows/
│       ├── ci.yml         # CI workflow
│       ├── test.yml       # Reusable test workflow
│       └── release.yml    # Release workflow
├── docs/                   # Documentation
│   ├── DEVELOPMENT.md     # This file
│   └── TESTING.md         # Testing documentation
├── action.yml             # Action metadata
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
└── README.md              # User-facing documentation
```

## Development Workflow

### Making Changes

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**:
   - Follow the coding standards (see below)
   - Write tests for new functionality
   - Update documentation as needed

3. **Test locally**:
   ```bash
   npm test              # Run all tests
   npm run lint          # Check code style
   npm run build         # Build the action
   ```

4. **Commit your changes**:
   - Use clear, descriptive commit messages
   - Consider using [Conventional Commits](https://www.conventionalcommits.org/) format

5. **Push and create a Pull Request**

### Code Standards

- **TypeScript**: All code is written in TypeScript with strict mode enabled
- **Linting**: ESLint is used for code quality (run `npm run lint`)
- **Formatting**: Prettier is used for code formatting (run `npm run format`)
- **Type Safety**: Leverage TypeScript types throughout the codebase

### Available Scripts

```bash
# Development
npm run build          # Compile TypeScript and bundle with ncc
npm run package        # Alias for build
npm test               # Run all tests (unit + integration)
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Generate test coverage report
npm run lint           # Run ESLint
npm run format         # Format code with Prettier

# Testing workflows locally with act
npm run test:act           # Run test workflow via act
npm run test:act:verbose   # Run test workflow with verbose output
npm run test:act:ci        # Run CI workflow via act
npm run test:act:release   # Run release workflow via act
npm run lint:act           # Run lint job via act

# Releasing
npm run release:patch  # Create patch release (1.0.0 → 1.0.1)
npm run release:minor  # Create minor release (1.0.0 → 1.1.0)
npm run release:major  # Create major release (1.0.0 → 2.0.0)
```

## Building

The action is built using TypeScript compiler (`tsc`) and `@vercel/ncc`:

```bash
npm run build
```

This:
1. Compiles TypeScript to JavaScript
2. Bundles all dependencies into a single `dist/index.js` file
3. Generates source maps and license files
4. Outputs to `dist/` directory

**Note**: The `dist/` directory is committed to git as it's required for the action to work.

## Linting and Formatting

### Linting

Run ESLint to check code quality:

```bash
npm run lint
```

ESLint is configured to:
- Use TypeScript-specific rules
- Ignore test files and build output
- Enforce best practices

### Formatting

Format code with Prettier:

```bash
npm run format
```

Prettier automatically formats:
- All TypeScript files in `src/`
- Uses project's `.prettierrc.json` configuration

## Testing

See [TESTING.md](./TESTING.md) for comprehensive testing documentation.

Quick start:
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode for TDD
npm run test:coverage # Generate coverage report
```

## Contributing

### Pull Request Process

1. **Fork the repository** (if external contributor)

2. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**:
   - Write code following project standards
   - Add tests for new functionality
   - Update documentation

4. **Ensure all checks pass**:
   ```bash
   npm test
   npm run lint
   npm run build
   ```

5. **Commit your changes**:
   - Use clear commit messages
   - Consider Conventional Commits format

6. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request**:
   - Provide a clear description of changes
   - Reference any related issues
   - Ensure CI checks pass

### Code Review

- All PRs require review before merging
- Address review feedback promptly
- Keep PRs focused and reasonably sized

## Releasing

This project uses [`standard-version`](https://github.com/conventional-changelog/standard-version) for automated release tag creation with commit summaries.

### Pre-Release Checklist

Before creating a release, ensure:

1. **All local tests pass**:
   ```bash
   npm test
   ```

2. **Build succeeds**:
   ```bash
   npm run build
   ```

3. **Linter passes**:
   ```bash
   npm run lint
   ```

4. **CI workflow has passed**:
   - Push changes to `main`
   - Wait for CI workflow to complete successfully

### Creating a Release

Once the pre-release checklist is complete:

```bash
# For patch release (1.0.0 → 1.0.1)
npm run release:patch

# For minor release (1.0.0 → 1.1.0)
npm run release:minor

# For major release (1.0.0 → 2.0.0)
npm run release:major
```

### What Happens

The release command automatically:
1. Bumps the version in `package.json` (patch/minor/major)
2. Analyzes commits since the last tag to generate a commit summary
3. Creates a git commit with message like "chore: release v1.0.1"
4. Creates a git tag with a message that includes:
   - Version number
   - Summary of commits since last release
   - Formatted changelog-style content
5. Pushes the tag and commit to trigger the GitHub Actions release workflow

The release workflow then:
- Runs lint and tests as a safety check
- Builds and packages the action
- Generates release notes from PRs/commits
- Creates a GitHub release
- Creates/updates floating version tags

### Tag Messages

Release tag messages automatically include commit summaries formatted like:
```
v1.0.1

### Features
* Add new feature

### Bug Fixes
* Fix critical bug

### Chores
* Update dependencies
```

This works with conventional commits (recommended) or regular commit messages.

## Troubleshooting

### Build Issues

If build fails:
1. Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
2. Check TypeScript errors: `npx tsc --noEmit`
3. Verify Node.js version: `node --version` (should be 20+)

### Test Issues

If tests fail:
1. Ensure you're in the project root directory
2. Try cleaning Jest cache: `npm test -- --clearCache`
3. Check that git is properly configured for tests

### Act (Local Workflow Testing) Issues

If `act` fails:
1. Verify `act` is installed: `act --version`
2. Check `~/.actrc` configuration file exists
3. Ensure Docker is running

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [ESLint Documentation](https://eslint.org/docs/latest/)
- [Prettier Documentation](https://prettier.io/docs/en/)

## Getting Help

- Open an issue on GitHub for bug reports or feature requests
- Check existing issues for similar problems
- Review the [TESTING.md](./TESTING.md) for testing-related questions

