import { TokenI } from '../../../Tokens/types';

export interface StakeEarningsHistoryViewRouteParams {
  key: string;
  name: string;
  params: {
    asset: TokenI;
  };
}
