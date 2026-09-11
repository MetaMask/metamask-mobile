import { errorCodes } from '@metamask/rpc-errors';
import {
  PredictEventValues,
  type PredictFailureCategoryValue,
  type PredictFailureStageValue,
} from '../constants/eventNames';
import { PREDICT_ERROR_CODES } from '../constants/errors';
import type { PredictMarket, PredictOutcomeToken } from '../types';
import type { PredictEntryPoint } from '../types/navigation';
import { getDisplayBuyPrice } from './prices';

const MAX_FAILURE_REASON_LENGTH = 255;
const REDACTED_VALUE = '[redacted]';

export interface PredictBuyFailureDetails {
  failureCategory: PredictFailureCategoryValue;
  failureReason: string;
  failureStage: PredictFailureStageValue;
  isUserRejected: boolean;
  isRetryable: boolean;
}

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
    sharePrice: getDisplayBuyPrice(outcomeToken),
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

function getPredictErrorMessage(error?: unknown): string {
  if (error instanceof Error) {
    return getPredictErrorMessage(error.message);
  }

  if (typeof error === 'string') {
    const trimmed = error.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        const parsedMessage = (
          parsed as { message?: unknown; error?: unknown } | null
        )?.message;
        const parsedError = (
          parsed as { message?: unknown; error?: unknown } | null
        )?.error;

        if (typeof parsedMessage === 'string') {
          return parsedMessage;
        }
        if (typeof parsedError === 'string') {
          return parsedError;
        }
        return PREDICT_ERROR_CODES.UNKNOWN_ERROR;
      } catch {
        return PREDICT_ERROR_CODES.UNKNOWN_ERROR;
      }
    }

    return trimmed;
  }

  const message = (error as { message?: unknown } | null | undefined)?.message;
  return typeof message === 'string'
    ? getPredictErrorMessage(message)
    : PREDICT_ERROR_CODES.UNKNOWN_ERROR;
}

export function sanitizePredictFailureReason(error?: unknown): string {
  return getPredictErrorMessage(error)
    .replace(/<[^>]*>/g, ' ')
    .replace(/https?:\/\/\S+/gi, REDACTED_VALUE)
    .replace(/0x[a-fA-F0-9]{40}\b/g, REDACTED_VALUE)
    .replace(/\bBearer\s+\S+/gi, `Bearer ${REDACTED_VALUE}`)
    .replace(
      /\b(api[_-]?key|token|authorization|password)\s*[:=]\s*[^\s,;]+/gi,
      `$1=${REDACTED_VALUE}`,
    )
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_FAILURE_REASON_LENGTH);
}

export function classifyPredictBuyFailure(
  error: unknown,
  failureStage: PredictFailureStageValue,
): PredictBuyFailureDetails {
  const { FAILURE_CATEGORY } = PredictEventValues;
  const errorCode = (error as { code?: unknown } | null | undefined)?.code;
  const failureReason = sanitizePredictFailureReason(error);
  const normalized = failureReason.toLowerCase();

  let failureCategory: PredictFailureCategoryValue = FAILURE_CATEGORY.OTHER;

  if (
    errorCode === errorCodes.provider.userRejectedRequest ||
    normalized.includes('user denied') ||
    normalized.includes('user rejected') ||
    normalized.includes('user cancelled') ||
    normalized.includes('user canceled')
  ) {
    failureCategory = FAILURE_CATEGORY.USER_REJECTED;
  } else if (
    normalized.includes('gas limit') ||
    normalized.includes('out of gas') ||
    normalized.includes('gas required') ||
    normalized.includes('intrinsic gas')
  ) {
    failureCategory = FAILURE_CATEGORY.GAS_LIMIT;
  } else if (
    normalized.includes('insufficient balance') ||
    normalized.includes('insufficient funds') ||
    normalized.includes('not enough balance')
  ) {
    failureCategory = FAILURE_CATEGORY.INSUFFICIENT_BALANCE;
  } else if (
    normalized.includes(PREDICT_ERROR_CODES.NOT_ELIGIBLE.toLowerCase()) ||
    normalized.includes('not eligible')
  ) {
    failureCategory = FAILURE_CATEGORY.NOT_ELIGIBLE;
  } else if (
    normalized.includes(
      PREDICT_ERROR_CODES.BUY_ORDER_NOT_FULLY_FILLED.toLowerCase(),
    ) ||
    normalized.includes(
      PREDICT_ERROR_CODES.ORDER_NOT_FULLY_FILLED.toLowerCase(),
    ) ||
    normalized.includes(
      PREDICT_ERROR_CODES.PREVIEW_NO_ORDER_MATCH_BUY.toLowerCase(),
    ) ||
    normalized.includes('not fully filled') ||
    normalized.includes('no match')
  ) {
    failureCategory = FAILURE_CATEGORY.NO_MATCH;
  } else if (normalized.includes('relayer')) {
    failureCategory = FAILURE_CATEGORY.RELAYER;
  } else if (
    normalized.includes('network') ||
    normalized.includes('timeout') ||
    normalized.includes('timed out') ||
    normalized.includes('connection') ||
    normalized.includes('fetch') ||
    normalized.includes('rpc')
  ) {
    failureCategory = FAILURE_CATEGORY.NETWORK;
  }

  return {
    failureCategory,
    failureReason,
    failureStage,
    isUserRejected: failureCategory === FAILURE_CATEGORY.USER_REJECTED,
    isRetryable: failureCategory === FAILURE_CATEGORY.NO_MATCH,
  };
}
