import { ParamListBase } from '@react-navigation/native';
import {
  PredictMarket,
  PredictOutcome,
  PredictOutcomeToken,
  PredictPosition,
} from '.';
import { PredictEventValues } from '../constants/eventNames';

export type PredictEntryPoint =
  | typeof PredictEventValues.ENTRY_POINT.PREDICT_FEED
  | typeof PredictEventValues.ENTRY_POINT.PREDICT_MARKET_DETAILS
  | typeof PredictEventValues.ENTRY_POINT.SEARCH;

export interface PredictNavigationParamList extends ParamListBase {
  Predict: undefined;
  PredictMarketList: undefined;
  PredictMarketDetails: {
    marketId?: string;
  };
  PredictCashOut: {
    position: PredictPosition;
    outcome: PredictOutcome;
  };
  PredictPlaceBet: {
    market: PredictMarket;
    outcome: PredictOutcome;
    outcomeToken: PredictOutcomeToken;
    entryPoint?: PredictEntryPoint;
  };
}
