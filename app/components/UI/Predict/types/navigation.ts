import { ParamListBase } from '@react-navigation/native';
import { PredictMarket, PredictOutcomeToken, PredictPosition } from '.';

export interface PredictNavigationParamList extends ParamListBase {
  Predict: undefined;
  PredictMarketList: undefined;
  PredictMarketDetails: {
    marketId?: string;
  };
  PredictCashOut: {
    position: PredictPosition;
  };

  PredictMarketDetails: {
    position: PredictPosition;
  };

  PredictPlaceBet: {
    market: PredictMarket;
    outcomeId: string;
    outcomeToken: PredictOutcomeToken;
  };
}
