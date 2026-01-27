# MetaMask Mobile Build Architecture

## Quick Reference

```
.github/
├── builds.yml           # WHAT to build (configuration data)
├── builds.README.md     # This documentation
└── workflows/
    └── build.yml        # HOW to build (CI/CD automation)

scripts/
├── apply-build-config.js      # Reads builds.yml → sets env vars + remote flag defaults
├── validate-build-config.js   # Validates builds.yml structure
└── set-secrets-from-config.js # Maps GitHub Secrets → env vars
```

---

## File Responsibilities

### 1. `.github/builds.yml` — Configuration Data

**Purpose:** Single source of truth for all build variants.

**Contains:**
- Environment variables (API URLs, build config)
- Secret mappings (which GitHub Secret to use for each env var)
- Code fencing features (what code to include/exclude)
- **Remote feature flag defaults** (build-time defaults for LaunchDarkly flags)

**Example entry:**
```yaml
builds:
  main-prod:
    github_environment: build-production
    
    env:
      METAMASK_ENVIRONMENT: "production"
      METAMASK_BUILD_TYPE: "main"
      PORTFOLIO_API_URL: "https://portfolio.api.cx.metamask.io"
    
    secrets:
      SEGMENT_WRITE_KEY: "SEGMENT_WRITE_KEY"
      MM_SENTRY_DSN: "MM_SENTRY_DSN"
    
    code_fencing:
      - preinstalled-snaps
      - keyring-snaps
    
    remote_feature_flags:
      perpsPerpTradingEnabled: false
      earnPooledStakingEnabled: true
      earnStablecoinLendingEnabled: true
```

---

### 2. `.github/workflows/build.yml` — CI/CD Workflow

**Purpose:** GitHub Actions workflow that orchestrates the build process.

**Responsibilities:**
1. Receive build request (manual trigger or called by another workflow)
2. Load configuration from `builds.yml`
3. Handle approval gates for production builds
4. Execute the build on appropriate runners

**Flow:**
```
┌─────────────────────────────────────────────────────────────────┐
│                    workflow_dispatch / workflow_call            │
│                         (build_name, platform)                  │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  JOB: prepare                                                   │
│  ├── yarn install                                               │
│  ├── validate-build-config.js (fail fast if invalid)            │
│  └── Load config from builds.yml                                │
│      └── Output: requires_approval, github_environment, secrets │
└─────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
         requires_approval=true      requires_approval=false
                    │                           │
                    ▼                           │
┌───────────────────────────────┐               │
│  JOB: approval                │               │
│  └── Wait for manual approval │               │
└───────────────────────────────┘               │
                    │                           │
                    └─────────────┬─────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  JOB: build (matrix: android/ios)                               │
│  ├── yarn install                                               │
│  ├── apply-build-config.js --export (set env vars)              │
│  ├── set-secrets-from-config.js (map secrets)                   │
│  └── ./scripts/build.sh                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

### 3. `scripts/apply-build-config.js` — Config Loader

**Purpose:** Reads `builds.yml` and exports environment variables + remote feature flag defaults.

**Two modes:**

```bash
# Mode 1: Direct (sets process.env in Node.js)
node scripts/apply-build-config.js main-prod

# Mode 2: Shell export (outputs eval-able statements)
eval "$(node scripts/apply-build-config.js main-prod --export)"
```

**What it does:**
```
builds.yml                         Environment Variables
───────────────────────────────────────────────────────────────────────────
env:                         →     METAMASK_ENVIRONMENT=production
  METAMASK_ENVIRONMENT             METAMASK_BUILD_TYPE=main
  METAMASK_BUILD_TYPE              PORTFOLIO_API_URL=https://portfolio.api.cx.metamask.io
  PORTFOLIO_API_URL                ...

code_fencing:                →     CODE_FENCING_FEATURES=["preinstalled-snaps",...]
  - preinstalled-snaps
  - keyring-snaps

remote_feature_flags:        →     REMOTE_FEATURE_FLAG_DEFAULTS={"perpsPerpTradingEnabled":false,...}
  perpsPerpTradingEnabled: false
  earnPooledStakingEnabled: true
```

**Server URL Strategy:**
- `_servers` anchor: Production URLs as defaults
- Test/e2e/exp/dev builds override with UAT/dev URLs
- GitHub Environment determines actual secret values (same secret names, different values per environment)

---

### 4. `scripts/validate-build-config.js` — Config Validator

**Purpose:** Validates `builds.yml` structure before builds run.

**Checks:**
- YAML syntax is valid
- All builds have required fields:
  - `env.METAMASK_ENVIRONMENT`
  - `env.METAMASK_BUILD_TYPE`
  - `github_environment`

**Usage:**
```bash
node scripts/validate-build-config.js
# ✅ Valid: 8 builds configured
#    main-prod, main-rc, main-dev, main-test, flask-prod, flask-rc, flask-dev, flask-test
```

---

### 5. `scripts/set-secrets-from-config.js` — Secret Mapper

**Purpose:** Maps GitHub Secrets to environment variables based on config.

**How it works:**

```
builds.yml secrets:                GitHub Secrets              App expects
─────────────────────────────────────────────────────────────────────────────
SEGMENT_WRITE_KEY: "SEGMENT_KEY_QA"  →  $SEGMENT_KEY_QA  →  $SEGMENT_WRITE_KEY
MM_SENTRY_DSN: "MM_SENTRY_DSN_TEST"  →  $MM_SENTRY_DSN_TEST  →  $MM_SENTRY_DSN
```

**Why mapping?** Different builds use different secrets, but the app always expects the same env var names.

**Usage:**
```bash
CONFIG_SECRETS='{"SEGMENT_WRITE_KEY":"SEGMENT_KEY_QA"}' node scripts/set-secrets-from-config.js
# ✓ SEGMENT_WRITE_KEY
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BUILD TIME                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   .github/builds.yml                                                        │
│         │                                                                   │
│         ├────────────────┬────────────────┬────────────────┐                │
│         │                │                │                │                │
│         ▼                ▼                ▼                ▼                │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌─────────────────┐      │
│   │   env    │    │ secrets  │    │  code_   │    │ remote_feature_ │      │
│   │          │    │          │    │ fencing  │    │     flags       │      │
│   └────┬─────┘    └────┬─────┘    └────┬─────┘    └───────┬─────────┘      │
│        │               │               │                  │                 │
│        ▼               ▼               ▼                  ▼                 │
│   apply-build-   set-secrets-    metro.transform.js  apply-build-          │
│   config.js      from-config.js  (removes code)      config.js             │
│        │               │               │                  │                 │
│        └───────┬───────┘               │                  │                 │
│                │                       │                  │                 │
│                ▼                       ▼                  ▼                 │
│        Environment Vars        Bundled JavaScript   REMOTE_FEATURE_        │
│                │                       │            FLAG_DEFAULTS          │
│                │                       │                  │                 │
│                └───────────┬───────────┴──────────────────┘                 │
│                            │                                                │
│                            ▼                                                │
│                     Built App (.apk / .ipa)                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              RUNTIME                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   RemoteFeatureFlagController                                               │
│   ├── Build-time defaults seeded (from REMOTE_FEATURE_FLAG_DEFAULTS)        │
│   │                                                                         │
│   ├── LaunchDarkly fetches and OVERRIDES at runtime                         │
│   │                                                                         │
│   └── Selectors read from remoteFeatureFlags                                │
│         │                                                                   │
│         ▼                                                                   │
│   App behavior (feature enabled/disabled)                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Priority Order

When the same variable is set in multiple places:

```
1. .js.env (local dev only)     ← Highest priority
2. LaunchDarkly (runtime)       ← Overrides remote feature flags
3. builds.yml (build time)      ← Default values
```

**Example for env vars:**
```bash
# builds.yml sets:
RAMPS_ENVIRONMENT: "production"

# Developer's .js.env overrides for local testing:
export RAMPS_ENVIRONMENT="staging"

# Result: App uses "staging" locally, "production" in CI builds
```

---

## Remote Feature Flags

`builds.yml` is the **single source of truth** for remote feature flag defaults. These are seeded into `RemoteFeatureFlagController` at startup, then LaunchDarkly can override them at runtime.

### Pattern: Single Anchor with Overrides

Following the same pattern as `_servers` and `_secrets`:

```yaml
# Single anchor with production (conservative) defaults
_remote_feature_flags: &remote_feature_flags
  perpsPerpTradingEnabled: false
  earnPooledStakingEnabled: true
  earnMusdConversionFlowEnabled: false

builds:
  # Prod/RC/Test/E2E use defaults directly
  main-prod:
    remote_feature_flags: *remote_feature_flags

  # Dev/Exp override specific flags
  main-dev:
    remote_feature_flags:
      <<: *remote_feature_flags
      perpsPerpTradingEnabled: true      # Enable for testing
      earnMusdConversionFlowEnabled: true
```

### How It Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  builds.yml                                                                 │
│  ├── _remote_feature_flags (anchor with prod defaults)                      │
│  ├── main-prod uses *remote_feature_flags directly                          │
│  └── main-dev uses <<: *remote_feature_flags + overrides                    │
│                                                                             │
│         ↓ (build time)                                                      │
│                                                                             │
│  REMOTE_FEATURE_FLAG_DEFAULTS env var (JSON)                                │
│                                                                             │
│         ↓ (app startup)                                                     │
│                                                                             │
│  RemoteFeatureFlagController seeds defaults                                 │
│                                                                             │
│         ↓ (runtime)                                                         │
│                                                                             │
│  LaunchDarkly fetches and OVERRIDES (versioned flags with minAppVersion)    │
│                                                                             │
│         ↓                                                                   │
│                                                                             │
│  Selectors read from remoteFeatureFlags (single source)                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Selector Pattern

Selectors use this pattern to read feature flags:

```typescript
export const selectPerpsEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag = remoteFeatureFlags?.perpsPerpTradingEnabled as VersionGatedFeatureFlag;

    // Try versioned flag first (from LaunchDarkly), fall back to build-time default
    return (
      validatedVersionGatedFeatureFlag(remoteFlag) ??
      (remoteFeatureFlags?.perpsPerpTradingEnabled as boolean)
    );
  },
);
```

**Flow:**
1. `validatedVersionGatedFeatureFlag()` checks if LaunchDarkly returned a versioned flag with version gating
2. If not (returns `undefined`), falls back to the build-time default (simple boolean from `builds.yml`)

### Benefits

- **Single source of truth** - One anchor defines all production defaults
- **Explicit overrides** - Dev builds show exactly which flags differ from production
- **No hardcoded fallbacks** - Selectors trust the seeded defaults
- **Easy maintenance** - Adding a new flag only requires updating one anchor
- **LaunchDarkly still works** - Runtime overrides with version gating

---

## Build Variants

| Build        | Environment | GitHub Environment | Use Case                  |
| ------------ | ----------- | ------------------ | ------------------------- |
| `main-prod`  | production  | build-production   | App Store release         |
| `main-rc`    | rc          | build-rc           | Release candidate testing |
| `main-test`  | test        | build-test         | QA testing                |
| `main-e2e`   | e2e         | build-e2e          | E2E automated tests       |
| `main-exp`   | exp         | build-exp          | Experimental builds       |
| `main-dev`   | dev         | build-dev          | Local development         |
| `flask-prod` | production  | build-production   | Flask App Store release   |
| `flask-test` | test        | build-test         | Flask QA testing          |
| `flask-e2e`  | e2e         | build-e2e          | Flask E2E tests           |
| `flask-dev`  | dev         | build-dev          | Flask local development   |

---

## YAML Anchors

`builds.yml` uses YAML anchors to avoid repetition. The pattern is: **single anchor with production defaults, override in specific builds as needed**.

```yaml
# Define anchors with production (conservative) defaults
_servers: &servers
  PORTFOLIO_API_URL: "https://portfolio.api.cx.metamask.io"
  SECURITY_ALERTS_API_URL: "https://security-alerts.api.cx.metamask.io"

_remote_feature_flags: &remote_feature_flags
  perpsPerpTradingEnabled: false
  earnPooledStakingEnabled: true
  earnMusdConversionFlowEnabled: false

# Reuse via aliases, override as needed
builds:
  main-prod:
    env:
      <<: *servers
    remote_feature_flags: *remote_feature_flags  # Use defaults directly
  
  main-dev:
    env:
      <<: *servers
      PORTFOLIO_API_URL: "https://portfolio.dev-api.cx.metamask.io"  # Override URL
    remote_feature_flags:
      <<: *remote_feature_flags
      # Override specific flags for dev testing
      perpsPerpTradingEnabled: true
      earnMusdConversionFlowEnabled: true
```

**Key:** Anchors are resolved at YAML parse time, not runtime. No magic inheritance logic needed.

**Pattern Benefits:**
- Single source of truth for defaults
- Explicit overrides show exactly what differs from production
- Adding a new flag only requires updating one anchor

---

## How to Add Things

### New Remote Feature Flag (Recommended)

For feature flags that LaunchDarkly may control, add to `remote_feature_flags`:

1. Add to `.github/builds.yml` anchor (production default):
```yaml
# Add to the single anchor with production (conservative) default
_remote_feature_flags: &remote_feature_flags
  # ... existing flags ...
  myNewFeatureEnabled: false  # Conservative for prod
```

2. Override in dev/exp builds if needed:
```yaml
builds:
  main-dev:
    remote_feature_flags:
      <<: *remote_feature_flags
      # Override for dev testing
      myNewFeatureEnabled: true
```

3. Create selector in your feature's selectors:
```typescript
export const selectMyNewFeatureEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag = remoteFeatureFlags?.myNewFeatureEnabled as VersionGatedFeatureFlag;
    return (
      validatedVersionGatedFeatureFlag(remoteFlag) ??
      (remoteFeatureFlags?.myNewFeatureEnabled as boolean)
    );
  },
);
```

4. Use in component:
```typescript
const isEnabled = useSelector(selectMyNewFeatureEnabled);
```

### New Environment Variable (Build Config)

For non-feature-flag config (API URLs, build settings), add to `env`:

1. Add to `.github/builds.yml`:
```yaml
builds:
  main-prod:
    env:
      MY_API_URL: "https://api.example.com"
  main-dev:
    env:
      MY_API_URL: "https://dev-api.example.com"
```

2. Document in `.js.env.example`:
```bash
export MY_API_URL="https://api.example.com"
```

3. Use in code:
```typescript
const apiUrl = process.env.MY_API_URL;
```

### New Secret

1. Add to GitHub repository secrets

2. Add mapping in `.github/builds.yml`:
```yaml
builds:
  main-prod:
    secrets:
      MY_API_KEY: "MY_API_KEY_PROD"
  main-dev:
    secrets:
      MY_API_KEY: "MY_API_KEY_DEV"
```

### New Build Variant

1. Add to `.github/builds.yml`:
```yaml
builds:
  main-beta:
    requires_approval: true
    github_environment: build-beta
    env:
      METAMASK_ENVIRONMENT: "beta"
      METAMASK_BUILD_TYPE: "main"
      # ... rest of config
```

2. Add to workflow dropdown in `.github/workflows/build.yml`:
```yaml
build_name:
  type: choice
  options:
    - main-prod
    - main-beta  # Add here
    - main-rc
```

---

## Troubleshooting

### Build not found
```
❌ Build "main-foo" not found. Available: main-prod, main-rc, ...
```
→ Check build name matches exactly in `.github/builds.yml`

### Validation failed
```
❌ main-prod: missing env.METAMASK_ENVIRONMENT
```
→ Ensure all required fields are present

### Remote feature flag not working

1. **Check builds.yml** - Is the flag defined in `remote_feature_flags`?
2. **Check LaunchDarkly** - Is LaunchDarkly overriding with a different value?
3. **Check selector** - Does it follow the pattern?
   ```typescript
   validatedVersionGatedFeatureFlag(remoteFlag) ??
   (remoteFeatureFlags?.flagName as boolean)
   ```
4. **Check flag name** - LaunchDarkly flag name must match exactly (e.g., `perpsPerpTradingEnabled`)

### Secrets not set
```
⚠ SEGMENT_KEY_PROD not found (for SEGMENT_WRITE_KEY)
```
→ Ensure GitHub Secret exists with exact name from `secrets` mapping

---

## Testing Locally

```bash
# Validate config
node scripts/validate-build-config.js

# See what env vars would be set (including remote feature flag defaults)
node scripts/apply-build-config.js main-dev --export

# Apply config and verify
eval "$(node scripts/apply-build-config.js main-dev --export)"
echo $METAMASK_ENVIRONMENT           # Should print: dev
echo $REMOTE_FEATURE_FLAG_DEFAULTS   # Should print: {"perpsPerpTradingEnabled":true,...}

# Parse remote feature flags JSON
node -e "console.log(JSON.parse(process.env.REMOTE_FEATURE_FLAG_DEFAULTS))"
```
