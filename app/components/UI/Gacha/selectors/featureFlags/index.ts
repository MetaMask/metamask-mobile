import { createSelector } from 'reselect';

import { selectRemoteFeatureFlags } from '../../../../../selectors/featureFlagController';
import { validatedVersionGatedFeatureFlag } from '../../../../../util/remoteFeatureFlag';

/** Whether Gacha is enabled remotely or forced on for a local development build. */
export const selectGachaEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean =>
    (__DEV__ && process.env.MM_GACHA_ENABLED === 'true') ||
    (validatedVersionGatedFeatureFlag(remoteFeatureFlags?.gachaEnabled) ??
      false),
);
