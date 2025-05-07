import { RouteProp } from '@react-navigation/native';
import { TokenI } from '../../../Tokens/types';

export enum EARN_INPUT_VIEW_ACTIONS {
  STAKE = 'STAKE',
  LEND = 'LEND',
  ALLOWANCE_INCREASE = 'ALLOWANCE_INCREASE',
}

interface EarnInputViewRouteParams {
  token: TokenI;
}

export interface EarnInputViewProps {
  route: RouteProp<{ params: EarnInputViewRouteParams }, 'params'>;
}
