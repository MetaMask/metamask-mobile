import { Hex } from '@metamask/utils';
import { TokenI } from '../../UI/Tokens/types';

export type AssetDetailsParams = {
  address: Hex;
  chainId: Hex;
  asset: TokenI;
};
