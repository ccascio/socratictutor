#!/usr/bin/env bash
# Full production desktop build pipeline:
#   1. Download matching Node.js binary
#   2. Build Next.js in standalone mode
#   3. Run tauri build (creates unsigned .app)
#   4. Inject standalone server + node binary into the .app bundle
#
# The .app produced by this script is unsigned. Use release-macos.sh for
# the signed, notarized release build.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Use the same Node.js version as the system to avoid ABI mismatches with native modules.
NODE_VERSION="$(node -p 'process.versions.node')"
HOST_ARCH="$(uname -m)"
APP_NAME="SocraticTutor"

if [[ "$HOST_ARCH" == "arm64" ]]; then
  NODE_ARCH="arm64"
  TAURI_TRIPLE="aarch64-apple-darwin"
elif [[ "$HOST_ARCH" == "x86_64" ]]; then
  NODE_ARCH="x64"
  TAURI_TRIPLE="x86_64-apple-darwin"
else
  echo "Unsupported architecture: $HOST_ARCH" >&2
  exit 1
fi

BINARIES_STAGING="$ROOT_DIR/src-tauri/binaries"
NODE_BIN_STAGING="$BINARIES_STAGING/node-${TAURI_TRIPLE}"
NODE_VERSION_CACHE="$BINARIES_STAGING/.node-version"

mkdir -p "$BINARIES_STAGING"

# ── 1. Download node binary ──────────────────────────────────────────────────

if [[ ! -f "$NODE_BIN_STAGING" ]] || [[ "$(cat "$NODE_VERSION_CACHE" 2>/dev/null)" != "$NODE_VERSION" ]]; then
  echo "Downloading Node.js $NODE_VERSION ($NODE_ARCH)…"
  TMP_DIR="$(mktemp -d)"
  TARBALL="node-v${NODE_VERSION}-darwin-${NODE_ARCH}.tar.xz"
  curl -fL "https://nodejs.org/dist/v${NODE_VERSION}/${TARBALL}" -o "$TMP_DIR/$TARBALL"
  tar -xJf "$TMP_DIR/$TARBALL" -C "$TMP_DIR"
  cp "$TMP_DIR/node-v${NODE_VERSION}-darwin-${NODE_ARCH}/bin/node" "$NODE_BIN_STAGING"
  chmod +x "$NODE_BIN_STAGING"
  echo "$NODE_VERSION" > "$NODE_VERSION_CACHE"
  rm -rf "$TMP_DIR"
  echo "Node binary ready: $NODE_BIN_STAGING"
else
  echo "Node binary cached: $NODE_BIN_STAGING (v${NODE_VERSION})"
fi

# ── 2. Build Next.js in standalone mode ──────────────────────────────────────

echo "Building Next.js standalone…"
NEXT_APP_TARGET=desktop npm run build

# Verify better-sqlite3 native module is in the standalone output (nft may miss it)
SQLITE_NODE="$ROOT_DIR/.next/standalone/node_modules/better-sqlite3/build/Release/better_sqlite3.node"
if [[ ! -f "$SQLITE_NODE" ]]; then
  echo "better-sqlite3 not traced into standalone — copying manually…"
  SQLITE_SRC="$ROOT_DIR/node_modules/better-sqlite3/build/Release/better_sqlite3.node"
  mkdir -p "$(dirname "$SQLITE_NODE")"
  cp "$SQLITE_SRC" "$SQLITE_NODE"
fi

# Copy public/ and .next/static/ into standalone (Next.js doesn't do this automatically)
echo "Staging static assets into standalone…"
rm -rf "$ROOT_DIR/.next/standalone/public"
cp -r "$ROOT_DIR/public" "$ROOT_DIR/.next/standalone/public"
mkdir -p "$ROOT_DIR/.next/standalone/.next/static"
rsync -a "$ROOT_DIR/.next/static/" "$ROOT_DIR/.next/standalone/.next/static/"

# ── 3. Build unsigned Tauri .app ─────────────────────────────────────────────

echo "Building Tauri app (unsigned)…"
# Unset signing identity so Tauri skips signing (we sign manually after bundle injection)
APPLE_SIGNING_IDENTITY='' NEXT_APP_TARGET=desktop \
  npx @tauri-apps/cli build --config src-tauri/tauri.desktop.conf.json 2>&1 | \
  grep -v "^npm warn" || true

APP_BUNDLE="$ROOT_DIR/src-tauri/target/release/bundle/macos/${APP_NAME}.app"
RESOURCES_DIR="$APP_BUNDLE/Contents/Resources"

if [[ ! -d "$APP_BUNDLE" ]]; then
  echo "ERROR: Tauri build did not produce $APP_BUNDLE" >&2
  exit 1
fi

# ── 4. Inject resources into bundle ──────────────────────────────────────────
# Tauri's glob-based resource bundler does not preserve directory structure for
# large trees, so we inject resources manually after the bundle is created.

echo "Injecting node binary into bundle…"
mkdir -p "$RESOURCES_DIR/binaries"
cp "$NODE_BIN_STAGING" "$RESOURCES_DIR/binaries/node-${TAURI_TRIPLE}"
chmod +x "$RESOURCES_DIR/binaries/node-${TAURI_TRIPLE}"

echo "Injecting Next.js standalone server into bundle…"
rm -rf "$RESOURCES_DIR/standalone"
# Use ditto --norsrc to avoid carrying over extended attributes from source files
ditto --norsrc "$ROOT_DIR/.next/standalone" "$RESOURCES_DIR/standalone"

echo ""
echo "Unsigned bundle ready: $APP_BUNDLE"
echo "Next: run 'bash scripts/release-macos.sh' to sign and notarize."
