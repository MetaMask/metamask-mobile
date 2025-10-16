import { ParamListBase } from '@react-navigation/native';
import {
  PredictActivityItem,
  PredictMarket,
  PredictOutcome,
  PredictOutcomeToken,
  PredictPosition,
} from '.';

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
  };
  PredictActivityDetail: {
    activity: PredictActivityItem;
  };
}
