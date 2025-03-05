import { TokenI as BaseTokenI } from '../../Tokens/types';

export interface EarnTokenI extends BaseTokenI {
  tokenBalanceFormatted: string;
  balanceFiat: string;
}
