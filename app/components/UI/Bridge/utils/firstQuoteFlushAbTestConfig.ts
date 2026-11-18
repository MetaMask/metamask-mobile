import type { RootState } from '../../../../reducers';
import {
  selectFeatureFlagThresholdGroups,
  selectRemoteFeatureFlags,
} from '../../../../selectors/featureFlagController';
import { resolveABTestAssignment } from '../../../../util/abTest';

export const FIRST_QUOTE_FLUSH_AB_KEY = 'swapsSWAPS5043AbtestFirstQuoteFlush';
export const IMMEDIATE_FIRST_QUOTE_FETCH_AB_KEY =
  'swapsSWAPS5347AbtestImmediateFirstQuoteFetch';
export const YIELD_AFTER_FIRST_QUOTE_AB_KEY =
  'swapsSWAPS5348AbtestYieldAfterFirstQuote';

export enum FirstQuoteFlushVariant {
  Control = 'control',
  Treatment = 'treatment',
}

export const selectFirstQuoteAbTestVariant = (
  state: RootState,
  flagKey: string,
): string =>
  resolveABTestAssignment(
    selectRemoteFeatureFlags(state),
    flagKey,
    Object.values(FirstQuoteFlushVariant),
    selectFeatureFlagThresholdGroups(state),
  ).variantName;
