# Build System Migration: Bitrise → GitHub Actions

This document outlines the migration path from Bitrise to GitHub Actions using the centralized `builds.yml` configuration.

## Migration Phases

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Phase 1: builds.yml for config                              ✅ COMPLETE   │
├─────────────────────────────────────────────────────────────────────────────┤
│  Phase 1.5: Parallel validation in Bitrise                   ✅ COMPLETE   │
├─────────────────────────────────────────────────────────────────────────────┤
│  Phase 2: Remove env remapping from build.sh                 ✅ COMPLETE   │
├─────────────────────────────────────────────────────────────────────────────┤
│  Phase 3: Add store deployment workflows                     📍 NEXT       │
├─────────────────────────────────────────────────────────────────────────────┤
│  Phase 4: Deprecate Bitrise                                  ⏳ PENDING    │
└─────────────────────────────────────────────────────────────────────────────┘
```

> **Note:** E2E test workflows already exist in GitHub Actions (see `.github/workflows/run-e2e-*.yml`), so no migration needed for E2E.

---

## Phase 1: builds.yml Configuration ✅

**Status:** Complete

**What was done:**

- Created `.github/builds.yml` as single source of truth
- Created `scripts/apply-build-config.js` to load and export config
- Created `scripts/validate-build-config.js` for CI validation
- Created `scripts/set-secrets-from-config.js` for secret mapping
- Created `.github/workflows/build.yml` GitHub Actions workflow
- **Added `remote_feature_flags` section** for build-time defaults of LaunchDarkly flags
- **Updated `RemoteFeatureFlagController`** to seed defaults from `REMOTE_FEATURE_FLAG_DEFAULTS`
- **Refactored selectors** (Perps, Earn) to use build-time defaults instead of hardcoded fallbacks

**Files:**

```
.github/
├── builds.yml           # Build configuration (env vars, secrets, code fencing, remote_feature_flags)
├── builds.README.md     # Architecture documentation
└── workflows/
    └── build.yml        # GitHub Actions workflow

scripts/
├── apply-build-config.js      # Loads config, exports env vars + REMOTE_FEATURE_FLAG_DEFAULTS
├── validate-build-config.js   # Validates config structure
└── set-secrets-from-config.js # Maps GitHub Secrets → env vars

app/core/Engine/controllers/
└── remote-feature-flag-controller-init.ts  # Seeds build-time defaults

app/components/UI/Perps/selectors/featureFlags/
└── index.ts  # Updated to use build-time defaults

app/components/UI/Earn/selectors/featureFlags/
└── index.ts  # Updated to use build-time defaults
```

### Remote Feature Flags Architecture

**Pattern:** Single anchor with production defaults, override in dev/exp builds (same as `_servers`).

```yaml
# builds.yml
_remote_feature_flags: &remote_feature_flags # Single anchor with prod defaults
  perpsPerpTradingEnabled: false
  earnPooledStakingEnabled: true

builds:
  main-prod:
    remote_feature_flags: *remote_feature_flags # Use defaults
  main-dev:
    remote_feature_flags:
      <<: *remote_feature_flags
      perpsPerpTradingEnabled: true # Override for dev
```

```
Flow:
─────────────────────────────────────────────────────────────────────────
builds.yml (build time)     →     REMOTE_FEATURE_FLAG_DEFAULTS (JSON env var)
                            →     RemoteFeatureFlagController seeds defaults
                            →     LaunchDarkly OVERRIDES at runtime
                            →     Selectors read from remoteFeatureFlags
```

**Benefits:**

- Single source of truth for feature flag defaults (one anchor)
- Explicit overrides show exactly what differs from production
- Removed ~50+ hardcoded `process.env.MM_*` checks from selectors
- LaunchDarkly still works with version gating

---

## Phase 1.5: Parallel Validation in Bitrise 📍

**Status:** Next

**Goal:** Run both old (remapping functions) and new (builds.yml) configuration in parallel within Bitrise builds. Compare outputs to validate the new config produces identical results before trusting it.

### Why This Phase?

- **Zero risk** - Bitrise still uses old remapping for actual builds
- **Early detection** - Catches config mismatches before Phase 2
- **Builds confidence** - Team sees "✅ Config matches" in every build
- **Audit trail** - Bitrise logs show comparison results

### Implementation

#### Step 1: Create verification script ✅

The script has been created at `scripts/verify-build-config.js`. It:

- Automatically detects build name from `METAMASK_BUILD_TYPE` + `METAMASK_ENVIRONMENT`
- Compares env vars, secret mappings, code fencing, and remote feature flags
- Supports `--strict` mode (exit with error on mismatch) and `--verbose` mode

```bash
# Test locally
METAMASK_BUILD_TYPE=main METAMASK_ENVIRONMENT=production node scripts/verify-build-config.js --verbose

# Output shows what matches and what differs from builds.yml
```

#### Step 2: Add to Bitrise workflows

In `bitrise.yml`, add a verification step after the existing remapping but before the actual build.

The script auto-detects the build name from `METAMASK_BUILD_TYPE` and `METAMASK_ENVIRONMENT`:

```yaml
# After existing remapping runs (sets env vars the old way)
# Add this step BEFORE the actual build step
- script@1:
    title: Verify builds.yml config matches
    inputs:
      - content: |
          #!/bin/bash
          # Don't use set -e initially - we want to control exit behavior

          echo "╔════════════════════════════════════════════════════════════╗"
          echo "║  Phase 1.5: Parallel Validation                            ║"
          echo "║  Comparing Bitrise env vars with builds.yml config         ║"
          echo "╚════════════════════════════════════════════════════════════╝"

          # Run verification (auto-detects build from METAMASK_BUILD_TYPE + METAMASK_ENVIRONMENT)
          # Week 1-2: Run without --strict (warnings only)
          # Week 3+:  Add --strict to fail builds on mismatch
          node scripts/verify-build-config.js --verbose

          # Uncomment below when ready for strict mode:
          # node scripts/verify-build-config.js --strict
```

**Where to add this step:**

- Find workflows that call `remapMainProdEnvVariables`, `remapMainDevEnvVariables`, etc.
- Add the verification step AFTER the remapping script, BEFORE `generateIosBinary` or `generateAndroidBinary`

#### Step 3: Rollout strategy

```
Week 1: Add verification step with warnings only (don't fail builds)
        - Change process.exit(1) to process.exit(0) temporarily
        - Monitor logs for mismatches

Week 2: Fix any mismatches found in builds.yml

Week 3: Enable strict mode (fail on mismatch)
        - Restore process.exit(1)

Week 4: If all builds pass validation for 1 week, proceed to Phase 2
```

### Success Criteria

- [x] `verify-build-config.js` created and tested locally
- [x] Verification step added to Bitrise build workflows:
  - `_android_build_template` (main Android builds)
  - `_ios_build_template` (main iOS builds)
  - `ios_e2e_build` (iOS E2E builds)
  - `_android_e2e_build_template` (Android E2E builds)
- [ ] 1+ week of builds passing with "✅ Config verification PASSED"
- [ ] No mismatches detected in any build variant
- [ ] Team confident to proceed to Phase 2

### What Gets Validated

**Environment Variables:**
| Variable | Why Critical |
| ------------------------- | ------------------------------------------- |
| `METAMASK_ENVIRONMENT` | Build identity - wrong = undefined behavior |
| `METAMASK_BUILD_TYPE` | Build identity - wrong = undefined behavior |
| `PORTFOLIO_API_URL` | API endpoint - wrong = API errors |
| `SECURITY_ALERTS_API_URL` | Security features - wrong = alerts broken |
| `RAMPS_ENVIRONMENT` | Ramps feature - wrong = payment issues |
| `IS_TEST` | Test mode flags - wrong = unexpected state |

**Secret Mappings:**
| Secret | Why Critical |
| ------------------------------ | ------------------------------------------------- |
| `SEGMENT_WRITE_KEY` | Analytics - wrong mapping = data in wrong project |
| `MM_SENTRY_DSN` | Error tracking - wrong mapping = errors lost |
| `IOS_GOOGLE_CLIENT_ID` | Auth - wrong mapping = login fails |
| `MM_CARD_BAANX_API_CLIENT_KEY` | Card feature - wrong mapping = API errors |

**Also Validated:**

- Code fencing features (what code is included/excluded)
- Remote feature flag defaults (build-time LaunchDarkly defaults)

---

## Phase 2: Remove Env Remapping from build.sh ✅

**Status:** Complete

**Goal:** Replace 200+ lines of `remapXxxEnvVariables()` functions in `build.sh` with a single config load from `builds.yml`.

### What Was Done

1. **Added `loadBuildConfig()` function** to `build.sh` that:
   - Constructs build name from `METAMASK_BUILD_TYPE` + `METAMASK_ENVIRONMENT` (e.g., `main-prod`)
   - Normalizes environment names (`production` → `prod`)
   - Calls `apply-build-config.js` with `--export` flag
   - Evaluates the exported environment variables

2. **Removed 12 remapping functions** (~200 lines):
   - `remapEnvVariable()`
   - `remapMainDevEnvVariables()`
   - `remapMainProdEnvVariables()`
   - `remapMainBetaEnvVariables()`
   - `remapMainReleaseCandidateEnvVariables()`
   - `remapMainExperimentalEnvVariables()`
   - `remapMainTestEnvVariables()`
   - `remapMainE2EEnvVariables()`
   - `remapFlaskProdEnvVariables()`
   - `remapFlaskTestEnvVariables()`
   - `remapFlaskE2EEnvVariables()`
   - `remapEnvVariableQA()`

3. **Replaced switch/case logic** (~35 lines) with a single call to `loadBuildConfig()`

4. **Added QA builds** to `builds.yml`:
   - `qa-prod` - QA production build
   - `qa-dev` - QA development build

### New Config Loading (build.sh)

```bash
loadBuildConfig() {
    local build_type="$1"
    local environment="$2"

    # Normalize environment name (production -> prod)
    local normalized_env="$environment"
    case "$environment" in
        production) normalized_env="prod" ;;
    esac

    # Construct build name (e.g., main-prod, flask-dev)
    local build_name="${build_type}-${normalized_env}"

    echo "📦 Loading configuration from builds.yml for '${build_name}'..."

    # Load config using apply-build-config.js
    local config_output
    config_output=$(node "${__DIRNAME__}/apply-build-config.js" "${build_name}" --export 2>&1)
    local exit_code=$?

    if [ $exit_code -ne 0 ]; then
        echo "❌ Failed to load build configuration"
        echo "Error: ${config_output}"
        return 1
    fi

    # Apply the configuration (exports environment variables)
    eval "$config_output"
    echo "✅ Configuration loaded from builds.yml"
    return 0
}
```

### Backward Compatibility

The old 3-argument format still works:

```bash
# Old format (still supported)
./scripts/build.sh android main production

# New format (recommended)
./scripts/build.sh android main-prod
```

### Completed Checklist

- [x] Added `loadBuildConfig()` function to `build.sh`
- [x] Removed 12 `remapXxxEnvVariables()` functions (~200 lines)
- [x] Replaced switch/case remapping logic with single `loadBuildConfig()` call
- [x] Added QA builds to `builds.yml` (`qa-prod`, `qa-dev`)
- [x] Maintained backward compatibility with old 3-argument format

### Testing

```bash
# Test each build variant
./scripts/build.sh android main production  # Old format
./scripts/build.sh android main-prod        # Also works (normalized internally)
./scripts/build.sh ios flask dev
./scripts/build.sh ios qa production

# Verify error handling
./scripts/build.sh android invalid-build    # Should fail with clear error
```

---

## Phase 3: Store Deployment Workflows ⏳

**Goal:** Replace Bitrise store deployment pipelines with GitHub Actions.

### Workflows to Create

```
.github/workflows/
├── build.yml                    # ✅ Exists
├── deploy-android-play.yml      # ⏳ Deploy to Play Store
├── deploy-ios-testflight.yml    # ⏳ Deploy to TestFlight
├── deploy-ios-appstore.yml      # ⏳ Deploy to App Store
└── release.yml                  # ⏳ Full release pipeline
```

### Key Components

| Bitrise Step                      | GitHub Actions Equivalent                  |
| --------------------------------- | ------------------------------------------ |
| `deploy-to-bitrise-io`            | `actions/upload-artifact@v4`               |
| `google-play-deploy`              | `r0adkll/upload-google-play@v1`            |
| `deploy-to-itunesconnect-deliver` | `apple-actions/upload-testflight-build@v1` |
| `fastlane`                        | `ruby/setup-ruby` + `fastlane`             |

### Example: Play Store Deployment

```yaml
# .github/workflows/deploy-android-play.yml
name: Deploy Android to Play Store

on:
  workflow_call:
    inputs:
      build_name:
        required: true
        type: string
      track:
        required: true
        type: string # internal, alpha, beta, production

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Download APK artifact
        uses: actions/download-artifact@v4
        with:
          name: android-${{ inputs.build_name }}

      - name: Upload to Play Store
        uses: r0adkll/upload-google-play@v1
        with:
          serviceAccountJsonPlainText: ${{ secrets.PLAY_STORE_SERVICE_ACCOUNT }}
          packageName: io.metamask
          releaseFiles: app-prod-release.aab
          track: ${{ inputs.track }}
```

---

## Phase 4: Deprecate Bitrise ⏳

**Goal:** Fully transition to GitHub Actions and remove Bitrise.

### Checklist

- [ ] All build variants working in GitHub Actions
- [ ] Store deployments working
- [x] E2E tests running in GitHub Actions (already complete)
- [ ] Nightly builds configured
- [ ] Team trained on new workflows
- [ ] Monitoring/alerting set up
- [ ] Documentation updated
- [ ] `bitrise.yml` removed from repository

### Deprecation Timeline

```
Week 1-2: Run both systems in parallel (builds)
Week 3-4: Run both systems in parallel (deployments)
Week 5:   Disable Bitrise triggers, monitor GitHub Actions
Week 6:   Remove bitrise.yml, update documentation
```

---

## Quick Reference

### Running Builds

```bash
# Local development
./scripts/build.sh android main-dev
./scripts/build.sh ios flask-dev

# CI (GitHub Actions)
# Triggered via workflow_dispatch or workflow_call
```

### Validating Configuration

```bash
# Check config is valid
node scripts/validate-build-config.js

# Preview env vars for a build
node scripts/apply-build-config.js main-prod --export
```

### Adding a New Build Variant

1. Add to `.github/builds.yml`
2. Add to workflow dropdown in `.github/workflows/build.yml`
3. Add package.json script (optional)
4. Test: `./scripts/build.sh <platform> <new-build-name>`

---

## Rollback Plan

If issues arise during migration:

1. **Phase 2 rollback:** Revert build.sh changes, keep old remapping functions
2. **Phase 3 rollback:** Keep Bitrise pipelines active, disable GitHub Actions deployment workflows
3. **Phase 4 rollback:** Re-enable Bitrise from git history

All phases are designed to be reversible with minimal impact.
