# Version-Gated Feature Flags

Canonical guide for evaluating remote feature flags that include a minimum app version. Applies to all teams (Ramp, Perps, Money, Predict, platform selectors, etc.).

## SSOT

| Concern                              | Location                                                                               |
| ------------------------------------ | -------------------------------------------------------------------------------------- |
| Version comparison + flag validation | [`app/util/remoteFeatureFlag/index.ts`](../../app/util/remoteFeatureFlag/index.ts)     |
| Raw flag storage                     | `RemoteFeatureFlagController.remoteFeatureFlags` (no client version gating)            |
| Boolean for UI / hooks               | Selectors under `app/selectors/featureFlagController/` or `**/selectors/featureFlags/` |

**Always use** `validatedVersionGatedFeatureFlag` in selectors. **Never** duplicate `hasMinimumRequiredVersion` or `validatedVersionGatedFeatureFlag` in feature modules.

`hasMinimumRequiredVersion` is a lower-level helper used inside `validatedVersionGatedFeatureFlag`. Import it from the util only when you need a standalone version check — do not reimplement it.

## Flag shapes

### Standard (preferred)

LaunchDarkly JSON:

```json
{
  "enabled": true,
  "minimumVersion": "7.65.0"
}
```

Progressive-rollout wrappers (`{ name, value: { enabled, minimumVersion } }`) are normalized automatically.

### Non-standard configs

Some flags use different property names (e.g. `depositConfig` uses `active` instead of `enabled`). **Map** to the canonical shape before calling the helper:

```typescript
validatedVersionGatedFeatureFlag({
  enabled: depositConfig.active ?? false,
  minimumVersion: depositConfig.minimumVersion ?? '',
}) ?? false;
```

### Multi-version flags (controller-processed)

`RemoteFeatureFlagController` resolves flags shaped as `{ versions: { "7.53.0": value, "7.60.0": value } }` at fetch time using `clientVersion`. Consumers read the **processed** value from state — no `validatedVersionGatedFeatureFlag` call needed for that shape.

## Implementation pattern

### 1. Selector (required)

```typescript
import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '../index'; // adjust path
import {
  validatedVersionGatedFeatureFlag,
  type VersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';

export const selectMyFeatureEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const localFlag = process.env.MM_MY_FEATURE_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.myFeature as unknown as VersionGatedFeatureFlag;

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  },
);
```

- Remote flag wins when valid; `undefined` from the helper triggers env/local fallback.
- When `OVERRIDE_REMOTE_FEATURE_FLAGS=true`, the helper returns `undefined` so local overrides apply.

### 2. Hook or component

```typescript
const isEnabled = useSelector(selectMyFeatureEnabled);
```

Do not call `getVersion()`, `compare-versions`, or local version helpers in hooks/components.

## Version source

`validatedVersionGatedFeatureFlag` compares against the **native binary version** from `react-native-device-info`'s `getVersion()` — not `package.json`. After a version bump, do a clean native rebuild if gating behaves unexpectedly.

## Forbidden

- Local `function hasMinimumRequiredVersion(...)` copies
- Inline `compareVersions.compare(getVersion(), minimumVersion, '>=')` for feature flags
- Duplicate util files under `app/components/UI/**/utils/` or `app/core/redux/slices/**/`

## Related

- [Perps feature flags](../perps/perps-feature-flags.md) — team-specific examples
- [Compliance OFAC gating](../compliance.md#feature-flag) — real selector using this pattern
- [`.cursor/rules/version-gated-feature-flags.mdc`](../../.cursor/rules/version-gated-feature-flags.mdc) — Cursor agent rule
- External: [MetaMask remote feature flags](https://github.com/MetaMask/contributor-docs/blob/main/docs/remote-feature-flags.md)
