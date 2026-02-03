/**
 * Predict navigation parameters
 */

import { ParamListBase } from '@react-navigation/native';
import {
  PredictActivityItem,
  PredictMarket,
  PredictOutcome,
  PredictOutcomeToken,
  PredictPosition,
} from '.';
import { PredictEventValues } from '../constants/eventNames';

export type PredictEntryPoint =
  | typeof PredictEventValues.ENTRY_POINT.CAROUSEL
  | typeof PredictEventValues.ENTRY_POINT.PREDICT_FEED
  | typeof PredictEventValues.ENTRY_POINT.PREDICT_MARKET_DETAILS
  | typeof PredictEventValues.ENTRY_POINT.SEARCH
  | typeof PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS
  | typeof PredictEventValues.ENTRY_POINT.HOMEPAGE_NEW_PREDICTION
  | typeof PredictEventValues.ENTRY_POINT.HOMEPAGE_BALANCE
  | typeof PredictEventValues.ENTRY_POINT.MAIN_TRADE_BUTTON
  | typeof PredictEventValues.ENTRY_POINT.BACKGROUND
  | typeof PredictEventValues.ENTRY_POINT.TRENDING_SEARCH
  | typeof PredictEventValues.ENTRY_POINT.TRENDING;

/** Predict market list parameters */
export interface PredictMarketListParams {
  entryPoint?: string;
}

/** Predict market details parameters */
export interface PredictMarketDetailsParams {
  marketId?: string;
  entryPoint?: PredictEntryPoint;
  title?: string;
  image?: string;
  isGame?: boolean;
  providerId?: string;
}

/** Predict activity detail parameters */
export interface PredictActivityDetailParams {
  activity: PredictActivityItem;
}

/** Predict buy preview parameters */
export interface PredictBuyPreviewParams {
  market: PredictMarket;
  outcome: PredictOutcome;
  outcomeToken: PredictOutcomeToken;
  entryPoint?: PredictEntryPoint;
}

/** Predict sell preview parameters */
export interface PredictSellPreviewParams {
  market: PredictMarket;
  position: PredictPosition;
  outcome: PredictOutcome;
  entryPoint?: PredictEntryPoint;
}

export interface PredictNavigationParamList extends ParamListBase {
  Predict: undefined;
  PredictMarketList: PredictMarketListParams;
  PredictMarketDetails: PredictMarketDetailsParams;
  PredictSellPreview: PredictSellPreviewParams;
  PredictBuyPreview: PredictBuyPreviewParams;
  PredictActivityDetail: PredictActivityDetailParams;
}
