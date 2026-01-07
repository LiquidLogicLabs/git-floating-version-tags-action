#!/bin/bash
# Devcontainer setup: install deps, install act, configure HTTPS git auth via credential helper.
# Keep non-fatal where reasonable to avoid blocking container creation.
set +e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${GREEN}$1${NC}"; }
log_warn() { echo -e "${YELLOW}$1${NC}"; }
log_error() { echo -e "${RED}$1${NC}"; }

run_step() {
	DESC="$1"; shift
	CMD="$@"
	echo "🔧 $DESC..."
	"$@"
	STATUS=$?
	if [ $STATUS -ne 0 ]; then
		log_warn "⚠ $DESC failed (exit $STATUS); continuing"
	fi
}

echo "🚀 Devcontainer setup starting..."

echo "📦 Installing npm dependencies"
npm install

# Install act (non-fatal if it fails)
run_step "Installing act" bash -c "curl -s https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash && sudo mv ./bin/act /usr/local/bin/act"
run_step "Configuring act runner image" bash -c "mkdir -p ~/.config/act && echo '-P ubuntu-latest=catthehacker/ubuntu:act-latest' > ~/.config/act/actrc"

# Git HTTPS auth via credential helper (no gh/tea)
echo "🔧 Setting up Git authentication (HTTPS-only, credential helper)..."

# Determine host from origin
REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
HOST=""
if [ -n "$REMOTE_URL" ]; then
	HOST=$(echo "$REMOTE_URL" | sed -E 's#^[^:/]+://([^/]+)/.*#\1#; s#^[^@]+@([^:]+):.*#\1#')
fi

if [ -z "$HOST" ]; then
	log_warn "⚠ No remote 'origin' found; skipping auth setup (normal for new repos)"
	REMOTE_URL="(none)"
	METHOD="not configured"
	TOKEN_SRC="(none)"
else
	echo "Remote host detected: $HOST"

	# Configure Git user if missing
	if [ -z "$(git config --global user.name)" ]; then
		git config --global user.name "Dev Container User" || true
		log_warn "⚠ Git user.name not set, using default"
	fi
	if [ -z "$(git config --global user.email)" ]; then
		git config --global user.email "devcontainer@example.com" || true
		log_warn "⚠ Git user.email not set, using default"
	fi

	# Select token and configure auth method
	TOKEN=""
	TOKEN_SRC=""
	if [ "$HOST" = "github.com" ]; then
		# For GitHub, use gh CLI credential helper (handles SSO/org auth better)
		if command -v gh >/dev/null 2>&1; then
			TOKEN="${GITHUB_TOKEN:-$GH_TOKEN}"
			if [ -n "$TOKEN" ]; then
				TOKEN_SRC=$( [ -n "$GITHUB_TOKEN" ] && echo "GITHUB_TOKEN" || echo "GH_TOKEN" )
				echo "Using token source: $TOKEN_SRC for host $HOST"
				# Configure gh to use the token from env
				# Note: gh auth setup-git will configure git to use gh as credential helper
				gh auth setup-git --hostname github.com >/dev/null 2>&1 || true
				# Ensure git uses gh credential helper for GitHub
				git config --global --replace-all credential.https://github.com.helper '!gh auth git-credential' || true
				METHOD="HTTPS (gh credential helper)"
				log_info "✓ GitHub auth configured via gh CLI"
			else
				log_warn "⚠ No GITHUB_TOKEN/GH_TOKEN available for GitHub"
				METHOD="not configured"
			fi
		else
			log_warn "⚠ gh CLI not available; falling back to plain credential store"
			TOKEN="${GITHUB_TOKEN:-$GH_TOKEN}"
			if [ -n "$TOKEN" ]; then
				TOKEN_SRC=$( [ -n "$GITHUB_TOKEN" ] && echo "GITHUB_TOKEN" || echo "GH_TOKEN" )
				CRED_FILE="$HOME/.git-credentials"
				mkdir -p "$(dirname "$CRED_FILE")"
				git config --global credential.helper "store --file $CRED_FILE" || true
				printf "https://oauth2:%s@%s\n" "$TOKEN" "$HOST" > "$CRED_FILE" 2>/dev/null || true
				chmod 600 "$CRED_FILE" 2>/dev/null || true
				METHOD="HTTPS (credential store)"
				log_info "✓ Credential helper configured for $HOST"
			else
				log_warn "⚠ No token available; auth not configured"
				METHOD="not configured"
			fi
		fi
	elif [ -n "$GITEA_TOKEN" ]; then
		# For non-GitHub hosts, use plain credential store
		TOKEN="$GITEA_TOKEN"
		TOKEN_SRC="GITEA_TOKEN"
		echo "Using token source: $TOKEN_SRC for host $HOST"
		CRED_FILE="$HOME/.git-credentials"
		mkdir -p "$(dirname "$CRED_FILE")"
		git config --global credential.helper "store --file $CRED_FILE" || true
		printf "https://oauth2:%s@%s\n" "$TOKEN" "$HOST" > "$CRED_FILE" 2>/dev/null || true
		chmod 600 "$CRED_FILE" 2>/dev/null || true
		METHOD="HTTPS (credential store)"
		log_info "✓ Credential helper configured for $HOST"
	else
		log_warn "⚠ No token available (GITEA_TOKEN / GITHUB_TOKEN / GH_TOKEN); auth not configured"
		METHOD="not configured"
	fi

	# Verify read-only access (non-fatal)
	echo ""
	echo "🔍 Verifying Git authentication (read-only)..."
	if git ls-remote --heads origin >/dev/null 2>&1; then
		log_info "✓ Can read from remote"
	else
		log_warn "⚠ Cannot read from remote; check token scope or network"
		log_warn "  Remote URL: $REMOTE_URL"
	fi
fi

# Summary
echo ""
echo "📋 Setup Summary:"
echo "  Remote URL: ${REMOTE_URL}"
echo "  Host: ${HOST:-'(none)'}"
echo "  Git method: ${METHOD:-'(none)'}"
echo "  Token source: ${TOKEN_SRC:-'(none)'}"

echo ""
log_info "✅ Devcontainer setup complete!"
