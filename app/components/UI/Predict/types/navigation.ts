import { ParamListBase } from '@react-navigation/native';
import { PredictPosition } from '.';

export interface PredictNavigationParamList extends ParamListBase {
  [key: string]: object | undefined;

  PredictCashOut: {
    position: PredictPosition;
  };

  PredictMarketDetails: {
    position: PredictPosition;
  };
}
