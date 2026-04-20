import {
  VersionGatedFeatureFlag,
  validatedVersionGatedFeatureFlag,
} from '../../../../util/remoteFeatureFlag';
import {
  DEFAULT_EXTENDED_SPORTS_MARKETS_FLAG,
  DEFAULT_FEE_COLLECTION_FLAG,
  DEFAULT_LIVE_SPORTS_FLAG,
  DEFAULT_MARKET_HIGHLIGHTS_FLAG,
} from '../constants/flags';
import { filterSupportedLeagues } from '../constants/sports';
import { parse, PredictFeeCollectionSchema } from '../schemas';
import {
  PredictExtendedSportsMarketsFlag,
  PredictFeatureFlags,
  PredictLiveSportsFlag,
  PredictMarketHighlightsFlag,
} from '../types/flags';
import { unwrapRemoteFeatureFlag } from './flags';

export interface RawFeatureFlags {
  remoteFeatureFlags?: Record<string, unknown>;
  localOverrides?: Record<string, unknown>;
}

function resolveVersionGatedBooleanFlag(flag: unknown): boolean {
  return (
    validatedVersionGatedFeatureFlag(
      unwrapRemoteFeatureFlag<VersionGatedFeatureFlag>(flag),
    ) ?? false
  );
}

/**
 * Resolves the Predict feature flags used by both the controller and selectors.
 * Local overrides take precedence over remote values when both are present.
 *
 * @param rawState - Raw RemoteFeatureFlagController state slices used by Predict.
 * @returns The normalized Predict feature flag set.
 */
export function resolvePredictFeatureFlags(
  rawState: RawFeatureFlags,
): PredictFeatureFlags {
  const flags = {
    ...(rawState.remoteFeatureFlags ?? {}),
    ...(rawState.localOverrides ?? {}),
  };

  const liveSportsFlag =
    unwrapRemoteFeatureFlag<PredictLiveSportsFlag>(flags.predictLiveSports) ??
    DEFAULT_LIVE_SPORTS_FLAG;
  const liveSportsLeagues = liveSportsFlag.enabled
    ? filterSupportedLeagues(liveSportsFlag.leagues ?? [])
    : [];

  const rawMarketHighlightsFlag =
    unwrapRemoteFeatureFlag<PredictMarketHighlightsFlag>(
      flags.predictMarketHighlights,
    );
  const marketHighlightsFlag =
    rawMarketHighlightsFlag &&
    validatedVersionGatedFeatureFlag(
      rawMarketHighlightsFlag as unknown as VersionGatedFeatureFlag,
    )
      ? rawMarketHighlightsFlag
      : DEFAULT_MARKET_HIGHLIGHTS_FLAG;

  const feeCollection = parse(
    unwrapRemoteFeatureFlag<PredictFeatureFlags['feeCollection']>(
      flags.predictFeeCollection,
    ),
    PredictFeeCollectionSchema,
    DEFAULT_FEE_COLLECTION_FLAG,
  );

  const extendedSportsFlag =
    unwrapRemoteFeatureFlag<PredictExtendedSportsMarketsFlag>(
      flags.predictExtendedSportsMarkets,
    ) ?? DEFAULT_EXTENDED_SPORTS_MARKETS_FLAG;
  const extendedSportsMarketsLeagues = validatedVersionGatedFeatureFlag(
    extendedSportsFlag,
  )
    ? filterSupportedLeagues(extendedSportsFlag.leagues ?? [])
    : [];

  return {
    feeCollection,
    liveSportsLeagues,
    extendedSportsMarketsLeagues,
    marketHighlightsFlag,
    fakOrdersEnabled: resolveVersionGatedBooleanFlag(flags.predictFakOrders),
    predictWithAnyTokenEnabled: resolveVersionGatedBooleanFlag(
      flags.predictWithAnyToken,
    ),
    predictUpDownEnabled: resolveVersionGatedBooleanFlag(flags.predictUpDown),
    predictClobV2Enabled: resolveVersionGatedBooleanFlag(flags.predictClobV2),
  };
}
