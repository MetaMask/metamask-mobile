import { CaipChainId, Hex } from '@metamask/utils';
import {
  DefaultSwapDestTokens,
  Bip44TokensForDefaultPairs,
} from '../../../../../UI/Bridge/constants/default-swap-dest-tokens';
import { ETH_USDT_ADDRESS } from '../../../../../../constants/bridge';
import { getNativeSourceToken } from '../../../../../UI/Bridge/utils/tokenUtils';
import type { BridgeToken } from '../../../../../UI/Bridge/types';
import { NETWORK_CHAIN_ID } from '../../../../../../util/networks/customNetworks';

const ALLOWED_SYMBOLS = new Set(['mUSD', 'USDC', 'USDT']);

/**
 * Static EVM stablecoin candidates extracted from DefaultSwapDestTokens.
 * Filtered to only mUSD, USDC, and USDT on EVM chains.
 */
const STABLECOIN_CANDIDATES: BridgeToken[] = Object.values(
  DefaultSwapDestTokens,
)
  .filter(
    (token) =>
      ALLOWED_SYMBOLS.has(token.symbol) &&
      typeof token.chainId === 'string' &&
      token.chainId.startsWith('0x'),
  )
  // Add mainnet USDC from Bip44TokensForDefaultPairs (DefaultSwapDestTokens has mUSD for mainnet)
  .concat(
    Bip44TokensForDefaultPairs[
      'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
    ],
  )
  // Add mainnet USDT (not in DefaultSwapDestTokens)
  .concat({
    symbol: 'USDT',
    name: 'Tether USD',
    address: ETH_USDT_ADDRESS,
    decimals: 6,
    image:
      'https://static.cx.metamask.io/api/v1/tokenIcons/1/0xdac17f958d2ee523a2206206994597c13d831ec7.png',
    chainId: NETWORK_CHAIN_ID.MAINNET,
  });

/**
 * Major EVM chains where users commonly hold native tokens.
 * We check native balances on all of these, not just the destination chain.
 */
const NATIVE_TOKEN_CHAIN_IDS: Hex[] = [
  NETWORK_CHAIN_ID.MAINNET, // ETH
  NETWORK_CHAIN_ID.BASE, // ETH
  NETWORK_CHAIN_ID.ARBITRUM, // ETH
  NETWORK_CHAIN_ID.OPTIMISM, // ETH
  NETWORK_CHAIN_ID.POLYGON, // POL
  NETWORK_CHAIN_ID.BSC, // BNB
  NETWORK_CHAIN_ID.LINEA_MAINNET, // ETH
];

/**
 * Returns all source token candidates for QuickBuy:
 * - All stablecoin candidates (mUSD, USDC, USDT across EVM chains)
 * - Native tokens on all major EVM chains (ETH on mainnet, Base, Arbitrum, etc.)
 * - The native token of the destination chain if not already included
 *
 * @param destChainId - The destination chain ID from the position
 */
export const getSourceTokenCandidates = (
  destChainId: Hex | CaipChainId | undefined,
): BridgeToken[] => {
  const candidates = [...STABLECOIN_CANDIDATES];
  const addedNativeChains = new Set<string>();

  // Add native tokens for all major chains
  for (const chainId of NATIVE_TOKEN_CHAIN_IDS) {
    const nativeToken = getNativeSourceToken(chainId);
    candidates.push(nativeToken);
    addedNativeChains.add(chainId);
  }

  // Add native token for the destination chain if not already included
  if (
    destChainId &&
    typeof destChainId === 'string' &&
    destChainId.startsWith('0x') &&
    !addedNativeChains.has(destChainId)
  ) {
    const nativeToken = getNativeSourceToken(destChainId);
    candidates.push(nativeToken);
  }

  return candidates;
};

/**
 * Unique key for a token candidate: address:chainId
 */
export const getTokenKey = (token: BridgeToken): string =>
  `${token.address.toLowerCase()}:${token.chainId}`;
