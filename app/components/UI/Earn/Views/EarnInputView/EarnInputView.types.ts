import { TokenI } from '../../../Tokens/types';

export enum EARN_INPUT_VIEW_ACTIONS {
  DEPOSIT = 'DEPOSIT',
  WITHDRAW = 'WITHDRAW',
}

export interface EarnInputViewRouteParams {
  token: TokenI;
}
