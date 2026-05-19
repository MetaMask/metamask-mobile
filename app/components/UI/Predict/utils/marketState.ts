import { PREDICT_ERROR_CODES } from '../constants/errors';
import type { PredictProvider } from '../providers/types';
import {
  PredictMarketStatus,
  type OrderPreview,
  type PredictMarket,
} from '../types';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';

export const PENDING_RESOLUTION_STATUSES = new Set([
  'proposed',
  'proposed_resolution',
  'disputed',
  'in_dispute',
]);

export const FINAL_RESOLUTION_STATUSES = new Set([
  'resolved',
  'finalized',
  'finalized_resolution',
  'closed',
]);

export const normalizeResolutionStatus = (resolutionStatus?: string) =>
  resolutionStatus
    ?.trim()
    .toLowerCase()
    .replace(/[\s-]+/gu, '_');

export const getNonBettableMarketErrorCode = (
  market: PredictMarket,
  preview: OrderPreview,
): string | undefined => {
  const outcome = market.outcomes.find(({ id }) => id === preview.outcomeId);

  if (!outcome) {
    return PREDICT_ERROR_CODES.MARKET_NOT_ACCEPTING_BETS;
  }

  const resolutionStatus = normalizeResolutionStatus(outcome.resolutionStatus);

  if (resolutionStatus && PENDING_RESOLUTION_STATUSES.has(resolutionStatus)) {
    return PREDICT_ERROR_CODES.MARKET_PENDING_RESOLUTION;
  }

  if (resolutionStatus && FINAL_RESOLUTION_STATUSES.has(resolutionStatus)) {
    return PREDICT_ERROR_CODES.MARKET_NOT_ACCEPTING_BETS;
  }

  if (
    market.status !== PredictMarketStatus.OPEN ||
    market.active === false ||
    outcome.status !== PredictMarketStatus.OPEN ||
    outcome.active === false ||
    outcome.acceptingOrders === false
  ) {
    return PREDICT_ERROR_CODES.MARKET_NOT_ACCEPTING_BETS;
  }

  return undefined;
};

export const validateMarketBettable = async ({
  provider,
  preview,
}: {
  provider: Pick<PredictProvider, 'getMarketDetails'>;
  preview: OrderPreview;
}): Promise<void> => {
  let market: PredictMarket;

  try {
    market = await provider.getMarketDetails({
      marketId: preview.marketId,
    });
  } catch (error) {
    DevLogger.log(
      'PredictController: Failed to validate market state before order',
      { error: error instanceof Error ? error.message : String(error) },
    );
    throw new Error(PREDICT_ERROR_CODES.MARKET_BETTABLE_CHECK_FAILED);
  }

  const errorCode = getNonBettableMarketErrorCode(market, preview);

  if (errorCode) {
    throw new Error(errorCode);
  }
};
