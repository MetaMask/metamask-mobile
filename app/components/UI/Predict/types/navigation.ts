/**
 * Predict navigation parameters
 */

/** Predict market list parameters */
export interface PredictMarketListParams {
  entryPoint?: string;
}

/** Predict market details parameters */
export interface PredictMarketDetailsParams {
  marketId?: string;
  entryPoint?: string;
  title?: string;
  image?: string;
  isGame?: boolean;
  providerId?: string;
}

/** Predict activity detail parameters */
export interface PredictActivityDetailParams {
  activity: Record<string, unknown>;
}

/** Predict buy preview parameters */
export interface PredictBuyPreviewParams {
  market: Record<string, unknown>;
  outcome: Record<string, unknown>;
  outcomeToken: Record<string, unknown>;
  entryPoint?: string;
}

/** Predict sell preview parameters */
export interface PredictSellPreviewParams {
  market: Record<string, unknown>;
  position: Record<string, unknown>;
  outcome: Record<string, unknown>;
  entryPoint?: string;
}
