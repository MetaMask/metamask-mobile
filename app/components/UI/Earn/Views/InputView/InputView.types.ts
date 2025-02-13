import { RouteProp } from '@react-navigation/native';
import { TokenI } from '../../../Tokens/types';

export enum EARN_ACTIONS {
  STAKE = 'STAKE',
  LEND = 'LEND',
  DEPOSIT = 'DEPOSIT',
}

export interface EarnInputViewRouteParams {
  token: TokenI;
  action: EARN_ACTIONS;
}

export interface EarnInputViewProps {
  route: RouteProp<
    {
      params: EarnInputViewRouteParams;
    },
    'params'
  >;
}
