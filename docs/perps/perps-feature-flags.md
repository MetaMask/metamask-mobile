# Perps Feature Flags Framework

## Overview

Framework for controlling Perps feature availability through LaunchDarkly with local fallback support. Supports version-gated rollouts and gradual feature releases.

**Key Design Principles:**

- LaunchDarkly is the single source of truth for feature enablement
- Version-gated flags ensure features only activate on compatible app versions
- Local environment variables provide development/testing fallback
- Graceful degradation when LaunchDarkly is unavailable

## Architecture

```mermaid
graph TD
    LD[LaunchDarkly Remote] -->|JSON flag| RFC[RemoteFeatureFlagController]
    RFC -->|stores in| Redux[Redux State]
    Redux -->|read by| Selector[Feature Flag Selector]
    Selector -->|boolean| Component[UI Component]

    ENV[Environment Variable] -->|fallback| Selector

    style LD fill:#e1f5ff
    style RFC fill:#fff3e0
    style Selector fill:#f3e5f5
    style Component fill:#e8f5e9
```

## Flag Types

### Version-Gated Boolean Flags

Used for feature on/off toggles with version requirements.

**Interface:**

```typescript
interface VersionGatedFeatureFlag {
  enabled: boolean;
  minimumVersion: string;
}
```

**Example LaunchDarkly JSON:**

```json
{
  "enabled": true,
  "minimumVersion": "7.60.0"
}
```

**Behavior:**

- `enabled: true` + version >= `minimumVersion` = feature ON
- `enabled: true` + version < `minimumVersion` = feature OFF
- `enabled: false` = feature OFF (regardless of version)
- Invalid/missing flag = fallback to local environment variable

### String Flags (for A/B Tests)

See [Perps A/B Testing Framework](./perps-ab-testing.md) for variant-based flags.

---

## Implementation Guide

### Adding a New Feature Flag

#### 1. Define the Selector

**File:** `app/components/UI/Perps/selectors/featureFlags/index.ts`

```typescript
/**
 * Selector for My Feature flag
 * Controls visibility of My Feature in the UI
 *
 * @returns boolean - true if feature should be shown, false otherwise
 */
export const selectMyFeatureEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    // Choose default behavior:
    // - Use `=== 'true'` for disabled by default (must explicitly enable)
    // - Use `!== 'false'` for enabled by default (must explicitly disable)
    const localFlag = process.env.MM_PERPS_MY_FEATURE_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.perpsMyFeatureEnabled as unknown as VersionGatedFeatureFlag;

    // Remote takes precedence, fallback to local
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  },
);
```

**Default Behavior Options:**

| Pattern       | Default  | Use Case                                              |
| ------------- | -------- | ----------------------------------------------------- |
| `=== 'true'`  | Disabled | New experimental features                             |
| `!== 'false'` | Enabled  | Features that should be on unless explicitly disabled |

#### 2. Add Mock Flag

**File:** `app/components/UI/Perps/mocks/remoteFeatureFlagMocks.ts`

```typescript
export const mockedPerpsFeatureFlagsEnabledState: Record<
  string,
  VersionGatedFeatureFlag
> = {
  // ... existing flags ...
  perpsMyFeatureEnabled: mockEnabledPerpsLDFlag,
};
```

#### 3. Add Environment Variable

**File:** `.js.env.example`

```bash
export MM_PERPS_MY_FEATURE_ENABLED="true"
```

#### 4. Use in Component

```typescript
import { useSelector } from 'react-redux';
import { selectMyFeatureEnabledFlag } from '../../selectors/featureFlags';

const MyComponent = () => {
  const isMyFeatureEnabled = useSelector(selectMyFeatureEnabledFlag);

  if (!isMyFeatureEnabled) {
    return null; // or alternative UI
  }

  return <MyFeature />;
};
```

#### 5. Add Unit Tests

**File:** `app/components/UI/Perps/selectors/featureFlags/index.test.ts`

Follow existing test patterns covering:

- Default behavior (when env var not set)
- Remote flag takes precedence over local
- Version gating validation
- Fallback to local when remote is invalid/unavailable

---

## Available Flags Reference

| Redux Property                                     | LaunchDarkly Key                                         | Env Variable                                   | Default | Purpose                   |
| -------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------- | ------- | ------------------------- |
| `perpsPerpTradingEnabled`                          | `perps-perp-trading-enabled`                             | `MM_PERPS_ENABLED`                             | false   | Main Perps feature toggle |
| `perpsPerpTradingServiceInterruptionBannerEnabled` | `perps-perp-trading-service-interruption-banner-enabled` | `MM_PERPS_SERVICE_INTERRUPTION_BANNER_ENABLED` | false   | Service disruption banner |
| `perpsPerpGtmOnboardingModalEnabled`               | `perps-perp-gtm-onboarding-modal-enabled`                | `MM_PERPS_GTM_MODAL_ENABLED`                   | false   | GTM onboarding modal      |
| `perpsOrderBookEnabled`                            | `perps-order-book-enabled`                               | `MM_PERPS_ORDER_BOOK_ENABLED`                  | false   | Order Book feature        |

---

## LaunchDarkly Configuration

### Naming Convention

| Format                    | Example                    |
| ------------------------- | -------------------------- |
| LaunchDarkly (kebab-case) | `perps-order-book-enabled` |
| Redux state (camelCase)   | `perpsOrderBookEnabled`    |

### Flag Structure (JSON type)

```json
{
  "variations": [
    {
      "name": "Enabled",
      "value": {
        "enabled": true,
        "minimumVersion": "7.60.0"
      }
    },
    {
      "name": "Disabled",
      "value": {
        "enabled": false,
        "minimumVersion": "0.0.0"
      }
    }
  ],
  "offVariation": 1,
  "fallthrough": {
    "variation": 0
  }
}
```

### Version Gating

The `minimumVersion` field ensures features only activate on compatible app versions:

- **Format:** Semantic version string (e.g., `"7.60.0"`)
- **Comparison:** Uses `compare-versions` library with `>=` operator
- **Use case:** Prevent feature activation on older app versions that lack required code

---

## Local Development

### Environment Variables

```bash
# Main feature toggle
export MM_PERPS_ENABLED="true"

# Service interruption banner
export MM_PERPS_SERVICE_INTERRUPTION_BANNER_ENABLED="false"

# GTM onboarding modal
export MM_PERPS_GTM_MODAL_ENABLED="true"

# Order Book feature
export MM_PERPS_ORDER_BOOK_ENABLED="true"
```

### Testing Flag States

**Test disabled state:**

```bash
export MM_PERPS_ORDER_BOOK_ENABLED="false"
```

**Test enabled state (when default is disabled):**

```bash
export MM_PERPS_MY_FEATURE_ENABLED="true"
```

**Override remote flag:** Set `isRemoteFeatureFlagOverrideActivated` in debug settings.

---

## Troubleshooting

### Flag Not Taking Effect

1. **Check Redux state:** Verify flag exists in `RemoteFeatureFlagController.remoteFeatureFlags`
2. **Check version:** Ensure app version meets `minimumVersion` requirement
3. **Check selector:** Verify selector is imported and used correctly

### Version Gating Not Working

1. **Verify `minimumVersion` format:** Must be valid semver string
2. **Check app version:** `getVersion()` from `react-native-device-info`
3. **Check comparison:** Uses `>=` operator

### Local Flag Not Overriding

1. **Restart Metro bundler** after changing `.js.env`
2. **Check override setting:** `isRemoteFeatureFlagOverrideActivated` must be true
3. **Verify spelling:** Environment variable names are case-sensitive

---

## Related Files

- **Selectors:** `app/components/UI/Perps/selectors/featureFlags/index.ts`
- **Mocks:** `app/components/UI/Perps/mocks/remoteFeatureFlagMocks.ts`
- **Tests:** `app/components/UI/Perps/selectors/featureFlags/index.test.ts`
- **Version validation:** `app/util/remoteFeatureFlag/index.ts`
- **Controller init:** `app/core/Engine/controllers/remote-feature-flag-controller-init.ts`

---

## Related Documentation

- [Perps A/B Testing Framework](./perps-ab-testing.md)
- [Perps Connection Architecture](./perps-connection-architecture.md)
- [Perps MetaMetrics Reference](./perps-metametrics-reference.md)

---

## FAQ

**Q: What happens if LaunchDarkly is down?**
A: The selector falls back to the local environment variable value.

**Q: How do I test a disabled flag?**
A: Set the environment variable to `'false'` (e.g., `MM_PERPS_ORDER_BOOK_ENABLED="false"`).

**Q: When should I use a feature flag vs A/B test?**
A: Feature flags for on/off toggles; A/B tests for comparing multiple variants with analytics.

**Q: How do I do a gradual rollout?**
A: Use LaunchDarkly percentage rollout rules while keeping version gating.

**Q: Can I have different versions for iOS and Android?**
A: Yes, use LaunchDarkly targeting rules to segment by platform with different `minimumVersion` values.

**Q: What's the difference between disabled by default and enabled by default?**
A: Disabled by default (`=== 'true'`) requires explicit opt-in. Enabled by default (`!== 'false'`) shows the feature unless explicitly disabled. Use disabled by default for new/experimental features.
