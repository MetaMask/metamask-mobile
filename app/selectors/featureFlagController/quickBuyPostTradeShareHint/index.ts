import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import {
  VersionGatedFeatureFlag,
  validatedVersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';

/**
 * Whether Quick Buy shows the "$10 to post" Social post-trade share hint.
 *
 * Remote flag key: `quickBuyPostTradeShareHintEnabled`. Defaults to false when
 * the flag is missing or invalid.
 */
export const selectQuickBuyPostTradeShareHintEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag =
      remoteFeatureFlags?.quickBuyPostTradeShareHintEnabled as unknown as VersionGatedFeatureFlag;

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);
