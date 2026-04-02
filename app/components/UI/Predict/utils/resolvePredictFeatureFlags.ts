import {
  VersionGatedFeatureFlag,
  validatedVersionGatedFeatureFlag,
} from '../../../../util/remoteFeatureFlag';
import {
  DEFAULT_FEE_COLLECTION_FLAG,
  DEFAULT_LIVE_SPORTS_FLAG,
  DEFAULT_MARKET_HIGHLIGHTS_FLAG,
} from '../constants/flags';
import { filterSupportedLeagues } from '../constants/sports';
import { parse, PredictFeeCollectionSchema } from '../schemas';
import {
  PredictFeatureFlags,
  PredictLiveSportsFlag,
  PredictMarketHighlightsFlag,
} from '../types/flags';
import { unwrapRemoteFeatureFlag } from './flags';

export interface RawFeatureFlags {
  remoteFeatureFlags?: Record<string, unknown>;
  localOverrides?: Record<string, unknown>;
}

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
  const isHighlightsFlagValid = validatedVersionGatedFeatureFlag(
    rawMarketHighlightsFlag as unknown as VersionGatedFeatureFlag,
  );
  const marketHighlightsFlag =
    isHighlightsFlagValid && rawMarketHighlightsFlag
      ? rawMarketHighlightsFlag
      : DEFAULT_MARKET_HIGHLIGHTS_FLAG;

  const feeCollection = parse(
    unwrapRemoteFeatureFlag<PredictFeatureFlags['feeCollection']>(
      flags.predictFeeCollection,
    ),
    PredictFeeCollectionSchema,
    DEFAULT_FEE_COLLECTION_FLAG,
  );

  const fakOrdersEnabled =
    validatedVersionGatedFeatureFlag(
      unwrapRemoteFeatureFlag<VersionGatedFeatureFlag>(flags.predictFakOrders),
    ) ?? false;

  const predictWithAnyTokenEnabled =
    validatedVersionGatedFeatureFlag(
      unwrapRemoteFeatureFlag<VersionGatedFeatureFlag>(
        flags.predictWithAnyToken,
      ),
    ) ?? false;

  return {
    feeCollection,
    liveSportsLeagues,
    marketHighlightsFlag,
    fakOrdersEnabled,
    predictWithAnyTokenEnabled,
  };
}
