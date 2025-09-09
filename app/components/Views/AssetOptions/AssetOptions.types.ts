import { TokenI } from '../../UI/Tokens/types';

export type AssetOptionsParams = {
  address: string;
  isNativeCurrency: boolean;
  chainId: string;
  asset: TokenI;
};
