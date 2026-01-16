# Environment Configuration Management (MVP)

This directory contains YAML configuration files for different build environments.

## MVP Scope

This is a **minimal viable product** to start the migration to the new configuration structure. It includes:

- ✅ Base configuration (`base.yml`) with shared values
- ✅ Two example environments: `prod` and `rc`
- ✅ Simple merge script (`scripts/merge-config.js`)
- ✅ Basic structure that can be extended

**Not included in MVP** (will be added during migration):
- ❌ Other environments (exp, beta, test, dev, e2e)
- ❌ Build type separation (main vs flask)
- ❌ Code fencing configuration
- ❌ GitHub Actions workflow integration
- ❌ Secret management helpers

## Structure

```
build/environments/
├── base.yml              # Common config shared by all environments
├── prod/
│   └── config.yml       # Production-specific overrides
└── rc/
    └── config.yml       # Release Candidate-specific overrides
```

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

### Testing locally

You can test the merge script to see how configurations combine:

```bash
# Test production config
node scripts/merge-config.js prod | jq

# Test RC config
node scripts/merge-config.js rc | jq
```

## Next Steps (Migration)

1. **Add more environments**: Create `exp`, `beta`, `test`, `dev`, `e2e` configs
2. **Separate build types**: Add `build-types/` directory for main vs flask
3. **Add combinations**: Create `combinations/` for build-type + environment specific configs
4. **Integrate with workflows**: Update GitHub Actions to use merged configs
5. **Add code fencing**: Move code fencing config from `metro.transform.js` to YAML

## Benefits

- **DRY**: Shared configuration defined once in `base.yml`
- **Maintainable**: Update base.yml to change all environments
- **Clear**: Each env config only shows what's different
- **Scalable**: Easy to add new environments during migration
