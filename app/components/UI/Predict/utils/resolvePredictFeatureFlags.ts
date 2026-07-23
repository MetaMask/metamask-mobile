import {
  VersionGatedFeatureFlag,
  validatedVersionGatedFeatureFlag,
} from '../../../../util/remoteFeatureFlag';
import {
  DEFAULT_EXTENDED_SPORTS_MARKETS_FLAG,
  DEFAULT_FEE_COLLECTION_FLAG,
  DEFAULT_LIVE_SPORTS_FLAG,
  DEFAULT_MARKET_HIGHLIGHTS_FLAG,
  DEFAULT_PREDICT_SPORTS_FEED_FLAG,
  DEFAULT_PREDICT_WORLD_CUP_FLAG,
  DEFAULT_WIMBLEDON_TAB_FLAG,
} from '../constants/flags';
import {
  DEFAULT_NON_REG_TIME_SPORTS_MARKET_TYPES,
  filterSupportedLeagues,
} from '../constants/sports';
import {
  normalizeEnabledSportsMarketTypes,
  normalizeSportsMarketTypes,
} from '../providers/polymarket/outcomeGrouping';
import {
  parse,
  PredictFeeCollectionSchema,
  PredictSportsFeedSchema,
  PredictWimbledonTabSchema,
  PredictWorldCupSchema,
} from '../schemas';
import {
  PredictExtendedSportsMarketsFlag,
  PredictFeatureFlags,
  PredictLiveSportsFlag,
  PredictMarketHighlightsFlag,
  PredictWimbledonTabFlag,
} from '../types/flags';
import { unwrapRemoteFeatureFlag } from './flags';

export interface RawFeatureFlags {
  remoteFeatureFlags?: Record<string, unknown>;
  localOverrides?: Record<string, unknown>;
}

function resolveVersionGatedBooleanFlag(
  flag: unknown,
  fallback = false,
): boolean {
  return (
    validatedVersionGatedFeatureFlag(
      unwrapRemoteFeatureFlag<VersionGatedFeatureFlag>(flag),
    ) ?? fallback
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
  const extendedSportsMarketsEnabled =
    validatedVersionGatedFeatureFlag(extendedSportsFlag);
  const extendedSportsMarketsLeagues = extendedSportsMarketsEnabled
    ? filterSupportedLeagues(extendedSportsFlag.leagues ?? [])
    : [];
  const enabledSportsMarketTypes = extendedSportsMarketsEnabled
    ? normalizeEnabledSportsMarketTypes(
        extendedSportsFlag.enabledSportsMarketTypes,
      )
    : [];
  const hasNonRegTimeSportsMarketTypes = Object.prototype.hasOwnProperty.call(
    extendedSportsFlag,
    'nonRegTimeSportsMarketTypes',
  );
  const nonRegTimeSportsMarketTypes =
    extendedSportsMarketsEnabled && hasNonRegTimeSportsMarketTypes
      ? normalizeSportsMarketTypes(
          extendedSportsFlag.nonRegTimeSportsMarketTypes,
        )
      : normalizeSportsMarketTypes(DEFAULT_NON_REG_TIME_SPORTS_MARKET_TYPES);
  const fakOrdersEnabled = resolveVersionGatedBooleanFlag(
    flags.predictFakOrders,
  );
  const predictWithAnyTokenEnabled = resolveVersionGatedBooleanFlag(
    flags.predictWithAnyToken,
  );
  const predictUpDownEnabled = resolveVersionGatedBooleanFlag(
    flags.predictUpDown,
  );
  const predictPortfolioEnabled = resolveVersionGatedBooleanFlag(
    flags.predictPortfolio,
  );
  const predictHomeRedesignEnabled = resolveVersionGatedBooleanFlag(
    flags.predictHomeRedesign,
  );
  const predictSportCardLivePricesEnabled = resolveVersionGatedBooleanFlag(
    flags.predictSportCardLivePrices,
    true,
  );
  const parsedPredictWorldCup = parse(
    unwrapRemoteFeatureFlag<PredictFeatureFlags['predictWorldCup']>(
      flags.predictWorldCup,
    ),
    PredictWorldCupSchema,
    DEFAULT_PREDICT_WORLD_CUP_FLAG,
  );
  const predictWorldCup = validatedVersionGatedFeatureFlag(
    parsedPredictWorldCup,
  )
    ? parsedPredictWorldCup
    : DEFAULT_PREDICT_WORLD_CUP_FLAG;
  const parsedPredictSportsFeed = parse(
    unwrapRemoteFeatureFlag<PredictFeatureFlags['predictSportsFeed']>(
      flags.predictSportsFeed,
    ),
    PredictSportsFeedSchema,
    DEFAULT_PREDICT_SPORTS_FEED_FLAG,
  );
  const predictSportsFeed = validatedVersionGatedFeatureFlag(
    parsedPredictSportsFeed,
  )
    ? parsedPredictSportsFeed
    : DEFAULT_PREDICT_SPORTS_FEED_FLAG;
  const parsedPredictWimbledonTab = parse(
    unwrapRemoteFeatureFlag<PredictWimbledonTabFlag>(flags.predictWimbledon),
    PredictWimbledonTabSchema,
    DEFAULT_WIMBLEDON_TAB_FLAG,
  );
  const predictWimbledonTab = validatedVersionGatedFeatureFlag(
    parsedPredictWimbledonTab,
  )
    ? parsedPredictWimbledonTab
    : DEFAULT_WIMBLEDON_TAB_FLAG;

  return {
    feeCollection,
    liveSportsLeagues,
    extendedSportsMarketsLeagues,
    enabledSportsMarketTypes,
    nonRegTimeSportsMarketTypes,
    marketHighlightsFlag,
    fakOrdersEnabled,
    predictWithAnyTokenEnabled,
    predictUpDownEnabled,
    predictPortfolioEnabled,
    predictHomeRedesignEnabled,
    predictSportCardLivePricesEnabled,
    predictWorldCup,
    predictSportsFeed,
    predictWimbledonTab,
  };
}
