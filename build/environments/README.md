# Environment Configuration Management

This directory contains YAML configuration files for different build environments (prod, rc, exp).

## Structure

- `base.yml` - Common configuration shared across all environments
- `prod/config.yml` - Production-specific overrides
- `rc/config.yml` - Release Candidate-specific overrides  
- `exp/config.yml` - Experimental-specific overrides

## How It Works

1. **Base Configuration**: `base.yml` contains all shared configuration (servers, features, common secrets)
2. **Environment Overrides**: Each environment directory contains a `config.yml` that only defines what's different
3. **Merging**: The `scripts/merge-config.js` script merges base.yml with the environment-specific config.yml

## Usage

### Merge configurations

```bash
node scripts/merge-config.js <environment>
```

Example:
```bash
node scripts/merge-config.js prod
```

This outputs the merged JSON configuration.

### In GitHub Actions

The `.github/workflows/build.yml` workflow automatically:
1. Loads and merges the configuration for the specified environment
2. Sets non-secret environment variables (servers, features)
3. Maps secrets to GitHub secrets (requires secrets to be configured in GitHub environment settings)

## Secret Management

**Important**: GitHub Actions doesn't allow dynamic secret access for security reasons. Secrets must be:

1. Configured in GitHub repository/environment settings
2. Explicitly referenced in the workflow using `${{ secrets.SECRET_NAME }}`

The configuration files map environment variable names to GitHub secret names. For example:
- `MM_SENTRY_DSN: "MM_SENTRY_DSN"` means the env var `MM_SENTRY_DSN` should use the GitHub secret `MM_SENTRY_DSN`

To use secrets in the workflow, you'll need to either:
- Explicitly list each secret in the workflow file
- Use a composite action that handles the mapping
- Configure secrets in the GitHub environment and access them directly

## Benefits

- **DRY**: Shared configuration defined once in `base.yml`
- **Maintainable**: Update base.yml to change all environments
- **Clear**: Each env config only shows what's different
- **Scalable**: Easy to add new environments
