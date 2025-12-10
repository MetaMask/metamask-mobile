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
  | typeof PredictEventValues.ENTRY_POINT.PREDICT_FEED
  | typeof PredictEventValues.ENTRY_POINT.PREDICT_MARKET_DETAILS
  | typeof PredictEventValues.ENTRY_POINT.SEARCH
  | typeof PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS
  | typeof PredictEventValues.ENTRY_POINT.HOMEPAGE_NEW_PREDICTION
  | typeof PredictEventValues.ENTRY_POINT.HOMEPAGE_BALANCE
  | typeof PredictEventValues.ENTRY_POINT.MAIN_TRADE_BUTTON
  | typeof PredictEventValues.ENTRY_POINT.BACKGROUND
  | typeof PredictEventValues.ENTRY_POINT.TRENDING_SEARCH;

export interface PredictNavigationParamList extends ParamListBase {
  Predict: undefined;
  PredictMarketList: {
    entryPoint?: PredictEntryPoint;
  };
  PredictMarketDetails: {
    marketId?: string;
    entryPoint?: PredictEntryPoint;
    title?: string;
    image?: string;
  };
  PredictSellPreview: {
    market: PredictMarket;
    position: PredictPosition;
    outcome: PredictOutcome;
    entryPoint?: PredictEntryPoint;
  };
  PredictBuyPreview: {
    market: PredictMarket;
    outcome: PredictOutcome;
    outcomeToken: PredictOutcomeToken;
    entryPoint?: PredictEntryPoint;
  };
  PredictActivityDetail: {
    activity: PredictActivityItem;
  };
}
