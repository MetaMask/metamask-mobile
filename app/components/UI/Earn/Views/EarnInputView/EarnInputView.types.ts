import { RouteProp } from '@react-navigation/native';
import { TokenI } from '../../../Tokens/types';

export enum EARN_INPUT_VIEW_ACTIONS {
  DEPOSIT = 'DEPOSIT',
  WITHDRAW = 'WITHDRAW',
}

export interface EarnInputViewRouteParams {
  token: TokenI;
}

interface EarnInputViewParamList {
  Stake: EarnInputViewRouteParams;
  [key: string]: object | undefined;
}

export interface EarnInputViewProps {
  route: RouteProp<EarnInputViewParamList, 'Stake'>;
}
