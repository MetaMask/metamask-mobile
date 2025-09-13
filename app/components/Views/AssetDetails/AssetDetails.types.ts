import { Hex } from '@metamask/utils';
import { TokenI } from '../../UI/Tokens/types';

export interface AssetDetailsParams {
  address: Hex;
  chainId: Hex;
  asset?: TokenI;
}
