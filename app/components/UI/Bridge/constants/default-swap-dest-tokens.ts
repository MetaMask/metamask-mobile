import { CaipChainId, SolScope } from '@metamask/keyring-api';
import { BridgeToken } from '../types';
import { Hex } from '@metamask/utils';

export const DefaultSwapDestTokens: Record<Hex | CaipChainId, BridgeToken> = {
  [SolScope.Mainnet]: {
    address:
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    symbol: 'USDC',
    decimals: 6,
    image:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v.png',
    chainId: SolScope.Mainnet,
  },
};
