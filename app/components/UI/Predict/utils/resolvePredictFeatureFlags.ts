import {
  VersionGatedFeatureFlag,
  validatedVersionGatedFeatureFlag,
} from '../../../../util/remoteFeatureFlag';
import {
  DEFAULT_EXTENDED_SPORTS_MARKETS_FLAG,
  DEFAULT_FEE_COLLECTION_FLAG,
  DEFAULT_LIVE_SPORTS_FLAG,
  DEFAULT_MARKET_HIGHLIGHTS_FLAG,
  DEFAULT_PREDICT_WORLD_CUP_FLAG,
} from '../constants/flags';
import {
  filterSupportedLeagues,
  SUPPORTED_SPORTS_LEAGUES,
} from '../constants/sports';
import {
  parse,
  PredictFeeCollectionSchema,
  PredictWorldCupSchema,
} from '../schemas';
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
  let extendedSportsMarketsLeagues = validatedVersionGatedFeatureFlag(
    extendedSportsFlag,
  )
    ? filterSupportedLeagues(extendedSportsFlag.leagues ?? [])
    : [];
  // TEMP / DEV-ONLY OVERRIDE — do NOT commit/merge. Delete this single line to
  // restore remote-flag behavior. Force-enables extended sports markets (game
  // lines / outcome cards + chips) for ALL supported leagues so the Predict game
  // details performance fix can be validated locally (e.g. France vs Senegal,
  // Iraq vs New Zealand), bypassing remote-flag precedence + version gating for
  // both the UI gate (useGameDetailsTabs) and the data-parse gate
  // (PolymarketProvider). Reload JS AND refetch the market (pull-to-refresh /
  // reopen) afterwards, since outcomeGroups are built at parse time.
  extendedSportsMarketsLeagues = filterSupportedLeagues(
    SUPPORTED_SPORTS_LEAGUES,
  );
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
  const predictHomepageDiscoveryNbaChampionEnabled =
    resolveVersionGatedBooleanFlag(
      flags.predictHomepageDiscoveryNbaChampionEnabled,
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

  return {
    feeCollection,
    liveSportsLeagues,
    extendedSportsMarketsLeagues,
    marketHighlightsFlag,
    fakOrdersEnabled,
    predictWithAnyTokenEnabled,
    predictUpDownEnabled,
    predictPortfolioEnabled,
    predictHomeRedesignEnabled,
    predictHomepageDiscoveryNbaChampionEnabled,
    predictWorldCup,
  };
}
