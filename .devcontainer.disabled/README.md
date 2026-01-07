# Dev Container

This dev container provides a consistent development environment for the GitHub Action.

## What's Included

- **Node.js 20** - Matches the CI/CD environment
- **Git** - Required for integration tests and git operations
- **GitHub CLI** - Optional, useful for GitHub operations
- **VS Code Extensions**:
    - ESLint
    - Prettier
    - TypeScript
    - Jest Runner

## Usage

1. Open the project in VS Code
2. When prompted, click "Reopen in Container"
3. Or use Command Palette: `Dev Containers: Reopen in Container`

## Optional: Install `act` for Local GitHub Actions Testing

To test GitHub Actions workflows locally, you can install `act`:

```bash
# Install act
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
```

Then use npm scripts to run workflows:

```bash
# Run test workflow
npm run test:act

# Run CI workflow
npm run test:act:ci
```

## Available Commands

Once in the container:

```bash
# Install dependencies
npm install

# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage
npm run test:coverage

# Build the action
npm run build

# Lint code
npm run lint

# Format code
npm run format

# Lint, build, and format
npm run lint            # Run ESLint
npm run build           # Build the action
npm run format          # Format code with Prettier

# Test workflows with act
npm run test:act        # Run test workflow
npm run test:act:verbose # Run test workflow with verbose output (debugging)
npm run test:act:ci     # Run CI workflow
npm run lint:act        # Run lint job via act
```

## Environment Variables

The devcontainer automatically passes the following environment variables from your host machine:

- `GITHUB_TOKEN` - GitHub Personal Access Token (for GitHub API access and `act` testing)
- `GITEA_TOKEN` - Gitea Personal Access Token (for Gitea testing, if applicable)
- `GH_TOKEN` - Alternative GitHub token name (used by GitHub CLI)

**Setting up environment variables:**

1. **VS Code Settings** (recommended):
    - Open VS Code settings (`.vscode/settings.json` or User Settings)
    - Add to `dev.containers.environment`:
        ```json
        {
        	"dev.containers.environment": {
        		"GITHUB_TOKEN": "your-token-here"
        	}
        }
        ```

2. **Shell Environment** (for terminal):

    ```bash
    export GITHUB_TOKEN="your-token-here"
    export GITEA_TOKEN="your-gitea-token"  # Optional
    export GH_TOKEN="your-token-here"      # Optional
    ```

3. **`.env` file** (not recommended for tokens, but possible):
    - Create `.env` file in project root
    - Add: `GITHUB_TOKEN=your-token-here`
    - Note: Add `.env` to `.gitignore` to avoid committing tokens

**Creating GitHub Tokens:**

- Go to https://github.com/settings/tokens
- Generate a new token with appropriate scopes (repo, workflow, etc.)
- Copy the token and set it as an environment variable

## Git Authentication

**Automatic Setup**: On container creation, `.devcontainer/setup-container.sh` runs and:

1. Installs npm deps and `act`
2. Detects the remote host from `origin`
3. Picks a token: `GITEA_TOKEN` for non-GitHub hosts, otherwise `GITHUB_TOKEN`/`GH_TOKEN`
4. Configures git credential helper (host-scoped, HTTPS only)
5. Performs a read-only `git ls-remote origin` check (non-fatal)

**Manual token setup (if automatic setup fails):**

- Set `GITEA_TOKEN` for non-GitHub remotes; otherwise set `GITHUB_TOKEN` or `GH_TOKEN`
- Token needs `repo` scope to push
- Re-run: `bash .devcontainer/setup-container.sh`

Notes:

- SSH is not configured; HTTPS + credential helper only
- GitHub CLI/tea are not required for auth

## Notes

- The container matches the GitHub Actions runner environment (Node.js 20, Ubuntu)
- Dependencies are automatically installed on container creation
- VS Code settings are configured for TypeScript, ESLint, and Prettier
- GitHub CLI authentication is automatically configured on container creation
