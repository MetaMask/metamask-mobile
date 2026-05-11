#!/bin/bash
# Configures NSAppTransportSecurity in the built Info.plist based on
# METAMASK_ENVIRONMENT.
#
# Why this exists: a single Info.plist (ios/MetaMask/Info.plist) is shared by
# every "main" build (production, rc, beta, exp, e2e, test, dev). The source
# plist intentionally ships the strict App Store defaults
# (NSAllowsArbitraryLoads = false). For local development and automated testing
# we need to allow arbitrary loads + an explicit localhost exception so devs
# and CI can talk to Metro / mock servers / locally-hosted dapps over plain
# HTTP. All other environments (production, rc, beta, exp) ship strict ATS so
# binaries distributed to real users keep full HTTPS enforcement.
#
# This phase mutates the *built* Info.plist (TARGET_BUILD_DIR/INFOPLIST_PATH),
# never the source file, so:
#   - the working tree is never dirtied
#   - any build whose METAMASK_ENVIRONMENT is unset or unrecognized keeps the
#     strict defaults (fail-safe = secure)
#
# Behavior:
#   - METAMASK_ENVIRONMENT in {dev, test, e2e} -> relax ATS:
#       NSAllowsArbitraryLoads = true
#       NSAllowsLocalNetworking removed (subsumed by NSAllowsArbitraryLoads)
#       NSExceptionDomains.localhost.NSExceptionAllowsInsecureHTTPLoads = true
#   - anything else (production/rc/beta/exp/unset/unknown) -> no-op (ship
#     strict defaults)
#
# Run as an Xcode "Run Script" build phase on the MetaMask target (after Copy
# Bundle Resources). Not used by the MetaMask-Flask target: that target's
# source Info.plist already ships with arbitrary loads enabled.

set -eu

PLIST_BUDDY=/usr/libexec/PlistBuddy
PLIST="${TARGET_BUILD_DIR:-}/${INFOPLIST_PATH:-}"
ENV_NAME="${METAMASK_ENVIRONMENT:-production}"

if [ -z "${TARGET_BUILD_DIR:-}" ] || [ -z "${INFOPLIST_PATH:-}" ]; then
  echo "configure-ios-ats: TARGET_BUILD_DIR or INFOPLIST_PATH not set; skipping" >&2
  exit 0
fi

if [ ! -f "$PLIST" ]; then
  echo "configure-ios-ats: built Info.plist not found at $PLIST; skipping" >&2
  exit 0
fi

case "$ENV_NAME" in
  dev|test|e2e)
    ;;
  *)
    echo "configure-ios-ats: METAMASK_ENVIRONMENT=$ENV_NAME, leaving strict ATS defaults"
    exit 0
    ;;
esac

echo "configure-ios-ats: METAMASK_ENVIRONMENT=$ENV_NAME, relaxing ATS in $PLIST"

# Ensure the NSAppTransportSecurity dict exists (it does in the source plist,
# but be defensive in case a future edit removes it).
$PLIST_BUDDY -c "Add :NSAppTransportSecurity dict" "$PLIST" 2>/dev/null || true

# Allow arbitrary loads. Use Set if the key exists, fall back to Add.
if ! $PLIST_BUDDY -c "Set :NSAppTransportSecurity:NSAllowsArbitraryLoads true" "$PLIST" 2>/dev/null; then
  $PLIST_BUDDY -c "Add :NSAppTransportSecurity:NSAllowsArbitraryLoads bool true" "$PLIST"
fi

# NSAllowsLocalNetworking is redundant once NSAllowsArbitraryLoads is true.
# Apple emits a warning at App Store submission if both are present.
$PLIST_BUDDY -c "Delete :NSAppTransportSecurity:NSAllowsLocalNetworking" "$PLIST" 2>/dev/null || true

# Add the localhost exception. Each Add is idempotent because we swallow errors
# if the key already exists from a previous incremental build.
$PLIST_BUDDY -c "Add :NSAppTransportSecurity:NSExceptionDomains dict" "$PLIST" 2>/dev/null || true
$PLIST_BUDDY -c "Add :NSAppTransportSecurity:NSExceptionDomains:localhost dict" "$PLIST" 2>/dev/null || true
if ! $PLIST_BUDDY -c "Set :NSAppTransportSecurity:NSExceptionDomains:localhost:NSExceptionAllowsInsecureHTTPLoads true" "$PLIST" 2>/dev/null; then
  $PLIST_BUDDY -c "Add :NSAppTransportSecurity:NSExceptionDomains:localhost:NSExceptionAllowsInsecureHTTPLoads bool true" "$PLIST"
fi

echo "configure-ios-ats: done"
