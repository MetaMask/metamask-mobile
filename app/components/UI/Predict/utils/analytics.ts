import { PredictEventValues } from '../constants/eventNames';
import type { PredictMarket, PredictOutcomeToken } from '../types';
import type { PredictEntryPoint } from '../types/navigation';

export function parseAnalyticsProperties(
  market: PredictMarket | undefined,
  outcomeToken: PredictOutcomeToken | undefined,
  entryPoint: PredictEntryPoint | undefined,
) {
  return {
    marketId: market?.id,
    marketTitle: market?.title,
    marketCategory: market?.category,
    marketTags: market?.tags,
    entryPoint: entryPoint || PredictEventValues.ENTRY_POINT.PREDICT_FEED,
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
