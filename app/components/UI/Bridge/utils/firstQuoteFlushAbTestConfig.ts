import type { RootState } from '../../../../reducers';
import {
  selectFeatureFlagThresholdGroups,
  selectRemoteFeatureFlags,
} from '../../../../selectors/featureFlagController';
import { resolveABTestAssignment } from '../../../../util/abTest';

export const FIRST_QUOTE_FLUSH_AB_KEY = 'swapsSWAPS5043AbtestFirstQuoteFlush';

export enum FirstQuoteFlushVariant {
  Control = 'control',
  Treatment = 'treatment',
}

export const selectFirstQuoteFlushVariant = (state: RootState): string =>
  resolveABTestAssignment(
    selectRemoteFeatureFlags(state),
    FIRST_QUOTE_FLUSH_AB_KEY,
    Object.values(FirstQuoteFlushVariant),
    selectFeatureFlagThresholdGroups(state),
  ).variantName;
