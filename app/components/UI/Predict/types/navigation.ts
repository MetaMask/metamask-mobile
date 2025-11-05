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
  | typeof PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS;

export interface PredictNavigationParamList extends ParamListBase {
  Predict: undefined;
  PredictMarketList: undefined;
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
