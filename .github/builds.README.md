# MetaMask Mobile Build Architecture

## Quick Reference

```
.github/
├── builds.yml           # WHAT to build (configuration data)
├── builds.README.md     # This documentation
└── workflows/
    └── build.yml        # HOW to build (CI/CD automation)

scripts/
├── apply-build-config.js      # Reads builds.yml → sets env vars
├── validate-build-config.js   # Validates builds.yml structure
└── set-secrets-from-config.js # Maps GitHub Secrets → env vars
```

---

## File Responsibilities

### 1. `.github/builds.yml` — Configuration Data

**Purpose:** Single source of truth for all build variants.

**Contains:**
- Environment variables (API URLs, feature flags)
- Secret mappings (which GitHub Secret to use for each env var)
- Build settings (keystore, scheme, bundle ID)
- Code fencing features (what code to include/exclude)

**Example entry:**
```yaml
builds:
  main-prod:
    requires_approval: true
    github_environment: build-production
    
    env:
      METAMASK_ENVIRONMENT: "production"
      PORTFOLIO_API_URL: "https://portfolio.api.cx.metamask.io"
      MM_PERPS_ENABLED: "false"
    
    secrets:
      SEGMENT_WRITE_KEY: "SEGMENT_WRITE_KEY"
      MM_SENTRY_DSN: "MM_SENTRY_DSN"
    
    build:
      android:
        keystore: "mainProd"
        package_name: "io.metamask"
      ios:
        scheme: "MetaMask"
        bundle_id: "io.metamask"
    
    code_fencing:
      - preinstalled-snaps
      - keyring-snaps
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

**Purpose:** Reads `builds.yml` and exports environment variables.

**Two modes:**

```bash
# Mode 1: Direct (sets process.env in Node.js)
node scripts/apply-build-config.js main-prod

# Mode 2: Shell export (outputs eval-able statements)
eval "$(node scripts/apply-build-config.js main-prod --export)"
```

**What it does:**
```
builds.yml                    Environment Variables
───────────────────────────────────────────────────
env:                    →     METAMASK_ENVIRONMENT=production
  METAMASK_ENVIRONMENT        PORTFOLIO_API_URL=https://...
  PORTFOLIO_API_URL           MM_PERPS_ENABLED=false
  MM_PERPS_ENABLED

code_fencing:           →     CODE_FENCING_FEATURES=["preinstalled-snaps",...]
  - preinstalled-snaps
  - keyring-snaps

build.ios.is_sim_build  →     IS_SIM_BUILD=true
```

---

### 4. `scripts/validate-build-config.js` — Config Validator

**Purpose:** Validates `builds.yml` structure before builds run.

**Checks:**
- YAML syntax is valid
- All builds have required fields:
  - `env.METAMASK_ENVIRONMENT`
  - `env.METAMASK_BUILD_TYPE`
  - `github_environment`
  - `build.android.keystore`
  - `build.ios.scheme`

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
│         ├──────────────────────┬──────────────────────┐                     │
│         │                      │                      │                     │
│         ▼                      ▼                      ▼                     │
│   ┌──────────┐          ┌──────────┐          ┌──────────┐                  │
│   │   env    │          │ secrets  │          │  code_   │                  │
│   │          │          │          │          │ fencing  │                  │
│   └────┬─────┘          └────┬─────┘          └────┬─────┘                  │
│        │                     │                     │                        │
│        ▼                     ▼                     ▼                        │
│   apply-build-        set-secrets-from-      metro.transform.js            │
│   config.js           config.js              (removes code)                │
│        │                     │                     │                        │
│        └──────────┬──────────┘                     │                        │
│                   │                                │                        │
│                   ▼                                ▼                        │
│           Environment Variables            Bundled JavaScript               │
│                   │                                │                        │
│                   └────────────┬───────────────────┘                        │
│                                │                                            │
│                                ▼                                            │
│                         Built App (.apk / .ipa)                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              RUNTIME                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Built-in defaults (from builds.yml at build time)                         │
│         │                                                                   │
│         ▼                                                                   │
│   LaunchDarkly (can override feature flags)                                 │
│         │                                                                   │
│         ▼                                                                   │
│   App behavior                                                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Priority Order

When the same variable is set in multiple places:

```
1. .js.env (local dev only)     ← Highest priority
2. LaunchDarkly (runtime)       ← Can override feature flags
3. builds.yml (build time)      ← Default values
```

**Example:**
```bash
# builds.yml sets:
MM_PERPS_ENABLED: "false"

# Developer's .js.env overrides for local testing:
export MM_PERPS_ENABLED="true"

# Result: App uses "true" locally, "false" in CI builds
```

---

## Build Variants

| Build | Environment | Approval | Use Case |
|-------|-------------|----------|----------|
| `main-prod` | production | ✅ Yes | App Store release |
| `main-rc` | rc | ❌ No | Release candidate testing |
| `main-dev` | dev | ❌ No | Development builds |
| `main-test` | test | ❌ No | E2E/automated tests |
| `flask-prod` | production | ✅ Yes | Flask App Store release |
| `flask-rc` | rc | ❌ No | Flask release candidate |
| `flask-dev` | dev | ❌ No | Flask development |
| `flask-test` | test | ❌ No | Flask E2E tests |

---

## YAML Anchors

`builds.yml` uses YAML anchors to avoid repetition:

```yaml
# Define once (anchor)
_servers_prod: &servers_prod
  PORTFOLIO_API_URL: "https://portfolio.api.cx.metamask.io"
  SECURITY_ALERTS_API_URL: "https://security-alerts.api.cx.metamask.io"

# Reuse everywhere (alias)
builds:
  main-prod:
    env:
      <<: *servers_prod      # Merges all server URLs here
      MM_PERPS_ENABLED: "false"
  
  main-rc:
    env:
      <<: *servers_prod      # Same servers, different build
      MM_PERPS_ENABLED: "false"
```

**Key:** Anchors are resolved at YAML parse time, not runtime. No magic inheritance logic needed.

---

## How to Add Things

### New Environment Variable

1. Add to `.github/builds.yml`:
```yaml
builds:
  main-prod:
    env:
      MY_NEW_FLAG: "false"
  main-dev:
    env:
      MY_NEW_FLAG: "true"  # Different value for dev
```

2. Document in `.js.env.example`:
```bash
export MY_NEW_FLAG="false"
```

3. Use in code:
```typescript
const enabled = process.env.MY_NEW_FLAG === 'true';
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

### Feature flag not working
1. Check `.js.env` isn't overriding
2. Check LaunchDarkly isn't overriding
3. Verify env var name matches exactly

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

# See what env vars would be set
node scripts/apply-build-config.js main-dev --export

# Apply config and verify
eval "$(node scripts/apply-build-config.js main-dev --export)"
echo $METAMASK_ENVIRONMENT  # Should print: dev
echo $MM_PERPS_ENABLED      # Should print: true
```
