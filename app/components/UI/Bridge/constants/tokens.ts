import { CaipAssetType } from '@metamask/utils';
import { BridgeToken } from '../types';

export const BridgeTokenMetadata: Record<CaipAssetType, BridgeToken> = {
  'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    decimals: 6,
    image:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
    chainId: '0x1',
  },
};
