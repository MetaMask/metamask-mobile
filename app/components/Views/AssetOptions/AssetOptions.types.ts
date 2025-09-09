import { TokenI } from '../../UI/Tokens/types';

export interface AssetOptionsParams {
  address: string;
  isNativeCurrency: boolean;
  chainId: string;
  asset: TokenI;
}
