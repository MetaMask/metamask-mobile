import { ParamListBase } from '@react-navigation/native';
import { PredictMarket, PredictPosition } from '.';

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
    outcomeTokenId: string;
  };
}
