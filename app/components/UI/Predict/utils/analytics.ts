import { PredictEventValues } from '../constants/eventNames';
import { PREDICT_ERROR_CODES } from '../constants/errors';
import type { PredictMarket, PredictOutcomeToken } from '../types';
import type { PredictEntryPoint } from '../types/navigation';

export function parseAnalyticsProperties(
  market: PredictMarket | undefined,
  outcomeToken: PredictOutcomeToken | undefined,
  entryPoint: PredictEntryPoint | undefined,
  predictFeedTab?: string,
  predictScreen?: string,
) {
  return {
    marketId: market?.id,
    marketTitle: market?.title,
    marketCategory: market?.category,
    marketTags: market?.tags,
    entryPoint: entryPoint || PredictEventValues.ENTRY_POINT.PREDICT_FEED,
    ...(predictFeedTab ? { predictFeedTab } : {}),
    ...(predictScreen ? { predictScreen } : {}),
    transactionType: PredictEventValues.TRANSACTION_TYPE.MM_PREDICT_BUY,
    liquidity: market?.liquidity,
    volume: market?.volume,
    sharePrice: outcomeToken?.price,
    marketType:
      market?.outcomes?.length === 1
        ? PredictEventValues.MARKET_TYPE.BINARY
        : PredictEventValues.MARKET_TYPE.MULTI_OUTCOME,
    outcome: outcomeToken?.title?.toLowerCase(),
    marketSlug: market?.slug,
    gameId: market?.game?.id,
    gameStartTime: market?.game?.startTime,
    gameLeague: market?.game?.league,
    gameStatus: market?.game?.status,
    gamePeriod: market?.game?.period,
    gameClock: market?.game?.elapsed,
  };
}

/**
 * Classifies a claim error into a stable `failure_reason` value for the
 * `mm_predict_claim` analytics event. Resolution-lag is the dominant failure
 * mode (PRED-963), so it is checked first.
 */
export function mapClaimFailureReason(error?: unknown): string {
  const { CLAIM_FAILURE_REASON } = PredictEventValues;

  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';
  const normalized = message.toLowerCase();

  if (
    normalized.includes(
      PREDICT_ERROR_CODES.MARKET_PENDING_RESOLUTION.toLowerCase(),
    ) ||
    normalized.includes('pending resolution') ||
    normalized.includes('no claimable positions') ||
    normalized.includes('no positions were won') ||
    normalized.includes('no positions won')
  ) {
    return CLAIM_FAILURE_REASON.PENDING_RESOLUTION;
  }

  if (
    normalized.includes('user denied') ||
    normalized.includes('user rejected') ||
    normalized.includes('user cancelled') ||
    normalized.includes('user canceled')
  ) {
    return CLAIM_FAILURE_REASON.USER_REJECTED;
  }

  if (
    normalized.includes('insufficient') ||
    normalized.includes('out of gas') ||
    normalized.includes('gas required') ||
    normalized.includes('intrinsic gas')
  ) {
    return CLAIM_FAILURE_REASON.INSUFFICIENT_GAS;
  }

  if (
    normalized.includes('network') ||
    normalized.includes('timeout') ||
    normalized.includes('timed out') ||
    normalized.includes('connection') ||
    normalized.includes('fetch')
  ) {
    return CLAIM_FAILURE_REASON.NETWORK_ERROR;
  }

  return CLAIM_FAILURE_REASON.UNKNOWN;
}
