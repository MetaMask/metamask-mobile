import { ParamListBase } from '@react-navigation/native';
import { PredictPosition } from '.';

export interface PredictNavigationParamList extends ParamListBase {
  Predict: undefined;
  PredictMarketList: undefined;
  PredictMarketDetails: {
    marketId?: string;
  };
  PredictCashOut: {
    position: PredictPosition;
  };
}
