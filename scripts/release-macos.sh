#!/usr/bin/env bash
# Signs, notarizes, and packages a distributable SocraticTutor DMG.
# Prerequisites: Apple Developer ID Application cert + notarization creds in keychain.
set -euo pipefail

MODE="${1:-release}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

APP_NAME="SocraticTutor"
VERSION="$(node -p "JSON.parse(require('fs').readFileSync('src-tauri/tauri.conf.json', 'utf8')).version")"
HOST_ARCH="$(uname -m)"

if [[ "$HOST_ARCH" == "arm64" ]]; then
  BUNDLE_ARCH="aarch64"
elif [[ "$HOST_ARCH" == "x86_64" ]]; then
  BUNDLE_ARCH="x64"
else
  echo "Unsupported macOS architecture: $HOST_ARCH" >&2
  exit 1
fi

BUNDLE_DIR="$ROOT_DIR/src-tauri/target/release/bundle"
APP_SRC="$BUNDLE_DIR/macos/${APP_NAME}.app"

# Sign + notarize in /tmp to avoid iCloud xattr interference
TMP_APP="/tmp/${APP_NAME}.app"
TMP_DMG="/tmp/${APP_NAME}_${VERSION}_${BUNDLE_ARCH}.dmg"
DMG_PATH="$BUNDLE_DIR/dmg/${APP_NAME}_${VERSION}_${BUNDLE_ARCH}.dmg"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing command: $1" >&2
    exit 1
  fi
}

has_apple_id_notary_env() {
  [[ -n "${APPLE_ID:-}" && -n "${APPLE_PASSWORD:-}" && -n "${APPLE_TEAM_ID:-}" ]]
}

validate_notary_password_reference() {
  if [[ "${APPLE_PASSWORD:-}" == @keychain:* ]]; then
    local item_name="${APPLE_PASSWORD#@keychain:}"
    if ! security find-generic-password -s "$item_name" >/dev/null 2>&1; then
      echo "APPLE_PASSWORD references missing Keychain item: $item_name" >&2
      exit 1
    fi
  fi
}

resolve_notary_password_reference() {
  if [[ "${APPLE_PASSWORD:-}" == @keychain:* ]]; then
    local item_name="${APPLE_PASSWORD#@keychain:}"
    export APPLE_PASSWORD
    APPLE_PASSWORD="$(security find-generic-password -w -a "$APPLE_ID" -s "$item_name")"
  fi
}

resolve_signing_identity() {
  if [[ -n "${APPLE_SIGNING_IDENTITY:-}" ]]; then return; fi
  local identity
  identity="$(security find-identity -v -p codesigning | awk -F'"' '/Developer ID Application/ { print $2; exit }')"
  [[ -n "$identity" ]] && export APPLE_SIGNING_IDENTITY="$identity"
}

preflight() {
  require_cmd node; require_cmd npm; require_cmd cargo
  require_cmd codesign; require_cmd security; require_cmd spctl
  require_cmd xcrun; require_cmd shasum; require_cmd hdiutil; require_cmd ditto

  resolve_signing_identity

  if [[ -z "${APPLE_SIGNING_IDENTITY:-}" ]]; then
    echo "Missing APPLE_SIGNING_IDENTITY — install a Developer ID Application certificate." >&2
    exit 1
  fi

  if ! security find-identity -v -p codesigning | grep -qF "$APPLE_SIGNING_IDENTITY"; then
    echo "APPLE_SIGNING_IDENTITY not found in keychain." >&2
    exit 1
  fi

  if ! has_apple_id_notary_env; then
    echo "Set APPLE_ID + APPLE_PASSWORD + APPLE_TEAM_ID for notarization." >&2
    exit 1
  fi

  validate_notary_password_reference

  echo "Preflight OK | version: $VERSION | identity: $APPLE_SIGNING_IDENTITY"
}

preflight
[[ "$MODE" == "--preflight" ]] && exit 0

resolve_notary_password_reference

# Full build: downloads node, builds Next.js, creates unsigned bundle
bash scripts/build-desktop.sh

if [[ ! -d "$APP_SRC" ]]; then
  echo "ERROR: no bundle at $APP_SRC" >&2; exit 1
fi

# Copy to /tmp (outside iCloud-monitored workspace) so xattr strip is permanent
rm -rf "$TMP_APP" "$TMP_DMG"
ditto --norsrc "$APP_SRC" "$TMP_APP"
xattr -cr "$TMP_APP"

codesign \
  --force --deep \
  --sign "$APPLE_SIGNING_IDENTITY" \
  --entitlements "$ROOT_DIR/src-tauri/entitlements.plist" \
  --options runtime \
  "$TMP_APP"

codesign --verify --deep --strict --verbose=2 "$TMP_APP"
spctl -a -vv --type execute "$TMP_APP"

# Build DMG and notarize
hdiutil create -volname "$APP_NAME" -srcfolder "$TMP_APP" -ov -format UDZO "$TMP_DMG"

xcrun notarytool submit "$TMP_DMG" \
  --apple-id "$APPLE_ID" \
  --team-id "$APPLE_TEAM_ID" \
  --password "$APPLE_PASSWORD" \
  --wait

xcrun stapler staple "$TMP_APP"
xcrun stapler validate "$TMP_APP"

# Rebuild DMG with stapled app
rm -f "$TMP_DMG"
hdiutil create -volname "$APP_NAME" -srcfolder "$TMP_APP" -ov -format UDZO "$TMP_DMG"

mkdir -p "$(dirname "$DMG_PATH")"
cp "$TMP_DMG" "$DMG_PATH"

spctl -a -vv -t open --context context:primary-signature "$DMG_PATH"
xcrun stapler validate "$DMG_PATH"
shasum -a 256 "$DMG_PATH" | tee "${DMG_PATH}.sha256"

echo ""
echo "Release artifact: $DMG_PATH"
