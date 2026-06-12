# builds.yml — Build Configuration Source of Truth

`builds.yml` is the single source of truth for all MetaMask Mobile build configurations. CI reads it to configure environment variables, secrets, code signing, and code fencing for every build variant. Local development can override values via `.js.env`.

**Owner:** `@MetaMask/mobile-platform` (protected by CODEOWNERS)

## File Structure

The file has two major sections: **YAML anchors** (reusable blocks prefixed with `_`) and the **`builds`** map (actual build definitions).

```
_public_envs     → shared env vars (servers, feature flags)
_secrets         → shared secret name mappings
_signing_*       → AWS signing configs per tier
_code_fencing_*  → feature lists per build type

builds:
  <build-name>:
    github_environment: <GitHub Environment name>
    signing: *signing_anchor          # optional (omit for dev/sim)
    env:
      <<: *public_envs
      METAMASK_ENVIRONMENT: '...'
      METAMASK_BUILD_TYPE: '...'
      # overrides...
    secrets: *secrets
    code_fencing: *code_fencing_anchor
```

### Section Reference

| Section              | Purpose                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| `env`                | Non-secret environment variables (API URLs, build flags). Set directly in CI.                     |
| `secrets`            | Maps env var names → GitHub Secret names. Actual values live in GitHub Environments.              |
| `signing`            | AWS IAM role + Secrets Manager secret for code signing. Omit for unsigned builds (dev/simulator). |
| `code_fencing`       | List of features to include via code fencing at build time.                                       |
| `github_environment` | GitHub Environment that determines which secret values are injected.                              |

### Build Name Convention

Build names follow the pattern `<type>-<environment>`:

| Type    | Environments                                      |
| ------- | ------------------------------------------------- |
| `main`  | `prod`, `beta`, `rc`, `test`, `e2e`, `exp`, `dev` |
| `flask` | `prod`, `test`, `e2e`, `dev`                      |
| `qa`    | `prod`, `dev`                                     |

## How CI Consumes builds.yml

The build workflow (`.github/workflows/build.yml`) processes builds.yml in this order:

1. **Validate** — `node scripts/validate-build-config.js` checks that every build has required fields (`env.METAMASK_ENVIRONMENT`, `env.METAMASK_BUILD_TYPE`, `github_environment`).
2. **Load config** — The `prepare` job reads the build entry, extracts `github_environment`, `secrets`, and `signing` into workflow outputs.
3. **Apply env** — `node scripts/apply-build-config.js <build-name>` exports all `env` values and `code_fencing` into the CI environment.
4. **Set secrets** — `node scripts/set-secrets-from-config.js` maps secret names from the config to actual GitHub Secret values (via `toJSON(secrets)`) and injects them into `GITHUB_ENV`.
5. **Configure signing** — `.github/actions/configure-signing/action.yml` assumes the AWS role and fetches signing certificates from Secrets Manager.

## Common Tasks

### Add a new environment variable

1. Add the variable to `_public_envs` if it applies to all builds, or directly to specific build entries under `env:`.
2. Override it in any build that needs a different value (e.g., dev builds using staging URLs).
3. Run `node scripts/validate-build-config.js` to confirm the YAML is valid.

```yaml
_public_envs: &public_envs # ... existing vars ...
  MY_NEW_API_URL: 'https://my-api.api.cx.metamask.io'

builds:
  main-test:
    env:
      <<: *public_envs
      MY_NEW_API_URL: 'https://my-api.dev-api.cx.metamask.io' # override for test
```

### Add a new secret

1. Add the mapping to the `_secrets` anchor. The key is the env var name your code reads; the value is the GitHub Secret name.
2. Create the actual secret in the relevant GitHub Environments (e.g., `build-production`, `build-uat`).
3. No workflow changes are needed — `set-secrets-from-config.js` picks up new entries automatically via `toJSON(secrets)`.

```yaml
_secrets: &secrets # ... existing secrets ...
  MY_NEW_SECRET: 'MY_NEW_SECRET'
```

If a specific build needs a **different** secret name (e.g., QA using a separate Segment project), override it inline:

```yaml
qa-prod:
  secrets:
    <<: *secrets
    SEGMENT_WRITE_KEY: SEGMENT_WRITE_KEY_QA
```

### Add a new code fencing feature

1. Add the feature name to the appropriate `_code_fencing_*` anchor(s).
2. Ensure `metro.transform.js` recognizes the feature for code stripping.

```yaml
_code_fencing_main: &code_fencing_main
  - preinstalled-snaps
  - keyring-snaps
  # ... existing features ...
  - my-new-feature
```

### Add a new build variant

1. Add a new entry under `builds:` following the naming convention `<type>-<environment>`.
2. Every build **must** have: `github_environment`, `env.METAMASK_ENVIRONMENT`, `env.METAMASK_BUILD_TYPE`.
3. Reference shared anchors with `<<: *public_envs`, `*secrets`, and the appropriate `*signing_*` and `*code_fencing_*`.
4. Add the build name to the `workflow_dispatch` options list in `.github/workflows/build.yml`.

```yaml
builds:
  main-staging:
    github_environment: build-staging
    signing: *signing_rc
    env:
      <<: *public_envs
      METAMASK_ENVIRONMENT: 'staging'
      METAMASK_BUILD_TYPE: 'main'
    secrets: *secrets
    code_fencing: *code_fencing_main
```

### Change signing configuration

Signing tiers map to AWS IAM roles and Secrets Manager secrets. The tiers are:

| Anchor                | Used by                             | AWS Role                                     |
| --------------------- | ----------------------------------- | -------------------------------------------- |
| `_signing_prod`       | `main-prod`                         | `metamask-mobile-prod-signer`                |
| `_signing_rc`         | `main-rc`, `main-beta`              | `metamask-mobile-rc-signer`                  |
| `_signing_uat`        | `main-test`, `main-e2e`, `main-exp` | `metamask-mobile-uat-signer`                 |
| `_signing_flask_prod` | `flask-prod`                        | `metamask-mobile-prod-signer` (flask secret) |
| `_signing_flask_uat`  | `flask-test`, `flask-e2e`           | `metamask-mobile-uat-signer` (flask secret)  |

To change a build's signing, point its `signing:` to a different anchor or define a new anchor.

## Validation

Run these locally before pushing changes:

```bash
# Validate YAML structure and required fields
node scripts/validate-build-config.js

# Verify builds.yml matches current Bitrise config (transition period)
node scripts/verify-build-config.js --verbose
```

## Local Development

For local builds, `.js.env` takes precedence over `builds.yml`. The `main-dev` and `flask-dev` entries reflect the expected local dev configuration but are not read directly by the dev server — they serve as the reference for what `.js.env` should contain.

To apply a build config locally for testing:

```bash
eval $(node scripts/apply-build-config.js main-dev --export)
```

## Rules

- **Never remove an env var or secret mapping without confirming no code references it.** Search the codebase for usages first.
- **Always use YAML anchors** for shared values. Do not duplicate URLs or secret mappings across builds.
- **All values must be strings** (wrap in quotes). The apply script calls `String(value)` but YAML can misinterpret unquoted booleans/numbers.
- **Test locally** with `validate-build-config.js` before pushing. CI runs this check but catching errors early is faster.
- **Coordinate with the mobile-platform team** for signing changes — they own the AWS roles and Secrets Manager entries.
