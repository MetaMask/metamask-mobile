# Environment Configuration Management (YAML Anchors)

This directory contains YAML configuration files using native YAML anchors feature.

## Structure

- `shared.yml` - Defines YAML anchors for shared configuration
- `prod/config.yml` - Production configuration using anchors
- `rc/config.yml` - Release Candidate configuration using anchors
- `exp/config.yml` - Experimental configuration using anchors

## How It Works

1. **Shared Anchors**: `shared.yml` defines anchors (using `x-` prefix) for:
   - `x-servers` → `*servers`
   - `x-features` → `*features`
   - `x-build-base` → `*build-base`
   - `x-common-secrets` → `*common-secrets`

2. **Environment Configs**: Each environment config references anchors using `*anchorName` syntax
3. **Merge Keys**: Use `<<: *anchorName` to merge anchor content into objects
4. **Loading**: The `scripts/load-yaml-config.js` script loads and resolves anchors

## Usage

### Load configuration

```bash
node scripts/load-yaml-config.js <environment>
```

Example:
```bash
node scripts/load-yaml-config.js prod
```

This outputs the resolved JSON configuration with all anchors expanded.

### In GitHub Actions

The workflow would use `load-yaml-config.js` to load the configuration, similar to Proposal 1.

## YAML Anchor Syntax

### Defining Anchors (in shared.yml)
```yaml
x-servers: &servers
  portfolio_api: "https://..."
  auth_service: "https://..."
```

### Using Anchors (in config.yml)
```yaml
# Direct reference
servers: *servers

# Merge into object
secrets:
  <<: *common-secrets
  # Additional secrets here
```

## Benefits

- **Native YAML**: Uses standard YAML features (anchors and merge keys)
- **No Custom Scripts**: Leverages YAML parser's built-in anchor support
- **DRY**: Shared values defined once as anchors
- **Clear**: Anchor references make dependencies explicit

## Limitations

- **Cross-file Anchors**: Standard YAML doesn't support anchors across files
  - Solution: `load-yaml-config.js` loads both files and resolves anchors
- **Complexity**: Anchor resolution can be complex for deeply nested structures
- **Tool Support**: Some YAML tools may not fully support merge keys (`<<`)

## Comparison with Proposal 1

| Feature | Proposal 1 (Base Config) | Proposal 2 (Anchors) |
|---------|-------------------------|----------------------|
| Standard YAML | ✅ Yes | ⚠️ Requires cross-file support |
| Custom Script | ✅ Simple merge | ⚠️ Anchor resolution needed |
| Clarity | ✅ Very clear | ⚠️ Can be complex |
| Maintenance | ✅ Easy | ⚠️ Moderate |
