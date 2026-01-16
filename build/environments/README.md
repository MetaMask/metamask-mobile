# Environment Configuration Management

This directory contains YAML configuration files for different build environments and build types using a hierarchical inheritance system.

## Structure

```
build/environments/
├── base.yml                    # Universal defaults (servers, common features)
├── build-types/
│   ├── main.yml               # Common for all main builds (code fencing, OAuth)
│   └── flask.yml              # Common for all flask builds (code fencing, OAuth)
├── environments/
│   ├── prod.yml               # Production environment config
│   ├── beta.yml               # Beta environment config
│   ├── rc.yml                 # Release Candidate config
│   ├── test.yml               # Test environment config
│   ├── exp.yml                # Experimental config
│   ├── dev.yml                # Development config
│   └── e2e.yml                # E2E config
└── combinations/
    ├── main-prod.yml          # Main + Production specific
    ├── main-beta.yml
    ├── main-rc.yml
    ├── main-test.yml
    ├── main-exp.yml
    ├── main-dev.yml
    ├── main-e2e.yml
    ├── flask-prod.yml
    ├── flask-rc.yml
    ├── flask-test.yml
    ├── flask-dev.yml
    └── flask-e2e.yml
```

## How It Works

The configuration system uses hierarchical inheritance:

1. **Base Configuration** (`base.yml`) - Universal defaults shared by ALL builds
2. **Build Type** (`build-types/{buildType}.yml`) - Common config for all builds of a type (main/flask)
3. **Environment** (`environments/{environment}.yml`) - Common config for all builds in an environment
4. **Combination** (`combinations/{buildType}-{environment}.yml`) - Specific overrides for the exact combination

Configs are merged in order, with later configs overriding earlier ones.

## Usage

### Merge configurations

```bash
node scripts/merge-config.js <buildType> <environment>
```

Examples:
```bash
# Main production build
node scripts/merge-config.js main prod

# Flask RC build
node scripts/merge-config.js flask rc

# Main experimental build
node scripts/merge-config.js main exp
```

This outputs the merged JSON configuration with all layers combined.

### In GitHub Actions

The `.github/workflows/build.yml` workflow automatically:
1. Loads and merges the configuration for the specified build type + environment
2. Sets non-secret environment variables (servers, features)
3. Maps secrets to GitHub secrets (requires secrets to be configured in GitHub environment settings)
4. Sets code fencing features for metro.transform.js

## Code Fencing

Code fencing configuration is defined in build-type configs (`build-types/main.yml`, `build-types/flask.yml`). Each combination file specifies which feature set to use via `active_features`.

The `metro.transform.js` file loads features from the merged config, falling back to hardcoded logic if config loading fails.

## Secret Management

**Important**: GitHub Actions doesn't allow dynamic secret access for security reasons. Secrets must be:

1. Configured in GitHub repository/environment settings
2. Explicitly referenced in the workflow using `${{ secrets.SECRET_NAME }}`

The configuration files map environment variable names to GitHub secret names. For example:
- `MM_SENTRY_DSN: "MM_SENTRY_DSN"` means the env var `MM_SENTRY_DSN` should use the GitHub secret `MM_SENTRY_DSN`

## Benefits

- **Hierarchical inheritance**: base → build-type → environment → combination
- **DRY**: Shared configuration defined once
- **Maintainable**: Update base.yml to change all environments
- **Clear**: Each config only shows what's different
- **Scalable**: Easy to add new environments or build types
- **Code fencing centralized**: All feature sets defined in build-type configs
- **Single source of truth**: All environment/build combinations in one place

## Migration Benefits

- Removes remapping logic from `build.sh`
- Centralizes code fencing configuration
- Single source of truth for all environment/build combinations
- Easy to add new combinations (e.g., `main-staging.yml`)
