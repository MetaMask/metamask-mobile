import { createStateFixture } from '../stateFixture';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import { FeatureFlagNames } from '../../../app/constants/featureFlags';

export const initialStateLogin = () =>
  createStateFixture()
    .withMinimalAccounts()
    .withMinimalKeyringController()
    .withMinimalAnalyticsController()
    .withRemoteFeatureFlags({})
    .withOverrides({
      user: {
        existingUser: true,
      },
    } as DeepPartial<RootState>);

export const routeRestorationEnabledFlags = (
  extras: {
    restoreWindowMs?: number;
    allowedRouteIds?: string[];
  } = {},
): Record<string, unknown> => ({
  [FeatureFlagNames.routeRestoration]: {
    enabled: true,
    minimumVersion: '0.0.0',
    ...extras,
  },
});

export const routeRestorationDisabledFlags: Record<string, unknown> = {
  [FeatureFlagNames.routeRestoration]: false,
};
