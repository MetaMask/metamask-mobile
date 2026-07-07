import type { Hex } from '@metamask/utils';
import type { BridgeToken } from '../../../../../../UI/Bridge/types';
import { NETWORK_CHAIN_ID } from '../../../../../../../util/networks/customNetworks';

/**
 * Canonical USDC / USDT deployments per EVM chain for the Sell "Receive" picker.
 *
 * `DefaultSwapDestTokens` only carries a single default destination stablecoin per chain (USDC *or*
 * USDT, never both), which is why USDT was missing on Optimism (and USDC on
 * Polygon, etc.). This table lets `useReceiveTokens` offer *both* major
 * stablecoins on every supported chain.
 *
 * Addresses are the canonical Circle / Tether deployments and mirror the
 * stablecoin source-of-truth in `useStablecoinsDefaultSlippage`. Chains where
 * Tether has no canonical USDT (Base, Monad, HyperEVM) list USDC only.
 *
 * The set is curated against the token-alerts security API: only assets it
 * returns as `Verified` are listed. Entries that came back non-`Verified` were
 * dropped — Linea USDC/USDT and zkSync USDT (all `Benign`) — as was Sei USDC,
 * which the API did not confirm as `Verified`.
 */
type StableSymbol = 'USDC' | 'USDT';

const STABLE_NAMES: Record<StableSymbol, string> = {
  USDC: 'USD Coin',
  USDT: 'Tether USD',
};

// Token icons follow a predictable CDN path keyed by decimal chain id and
// lower-cased address, so we derive them rather than hand-maintaining URLs.
const tokenIconUrl = (chainId: Hex, address: string): string =>
  `https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/${parseInt(
    chainId,
    16,
  )}/erc20/${address.toLowerCase()}.png`;

const makeStable = (
  chainId: Hex,
  symbol: StableSymbol,
  address: string,
  decimals: number,
): BridgeToken => ({
  symbol,
  name: STABLE_NAMES[symbol],
  address,
  decimals,
  image: tokenIconUrl(chainId, address),
  chainId,
  isVerified: true,
});

export const RECEIVE_STABLECOIN_CANDIDATES: BridgeToken[] = [
  // Ethereum
  makeStable(
    NETWORK_CHAIN_ID.MAINNET,
    'USDC',
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    6,
  ),
  makeStable(
    NETWORK_CHAIN_ID.MAINNET,
    'USDT',
    '0xdac17f958d2ee523a2206206994597c13d831ec7',
    6,
  ),
  // Polygon
  makeStable(
    NETWORK_CHAIN_ID.POLYGON,
    'USDC',
    '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
    6,
  ),
  makeStable(
    NETWORK_CHAIN_ID.POLYGON,
    'USDT',
    '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
    6,
  ),
  // Arbitrum
  makeStable(
    NETWORK_CHAIN_ID.ARBITRUM,
    'USDC',
    '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
    6,
  ),
  makeStable(
    NETWORK_CHAIN_ID.ARBITRUM,
    'USDT',
    '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
    6,
  ),
  // Base (no canonical USDT)
  makeStable(
    NETWORK_CHAIN_ID.BASE,
    'USDC',
    '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
    6,
  ),
  // Optimism
  makeStable(
    NETWORK_CHAIN_ID.OPTIMISM,
    'USDC',
    '0x0b2c639c533813f4aa9d7837caf62653d097ff85',
    6,
  ),
  makeStable(
    NETWORK_CHAIN_ID.OPTIMISM,
    'USDT',
    '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58',
    6,
  ),
  // BNB Smart Chain (stablecoins use 18 decimals here)
  makeStable(
    NETWORK_CHAIN_ID.BSC,
    'USDC',
    '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
    18,
  ),
  makeStable(
    NETWORK_CHAIN_ID.BSC,
    'USDT',
    '0x55d398326f99059ff775485246999027b3197955',
    18,
  ),
  // Avalanche
  makeStable(
    NETWORK_CHAIN_ID.AVALANCHE,
    'USDC',
    '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
    6,
  ),
  makeStable(
    NETWORK_CHAIN_ID.AVALANCHE,
    'USDT',
    '0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7',
    6,
  ),
  // zkSync Era (USDT omitted — token-alerts API returns it as Benign, not Verified)
  makeStable(
    NETWORK_CHAIN_ID.ZKSYNC_ERA,
    'USDC',
    '0x1d17cbcf0d6d143135ae902365d2e5e2a16538d4',
    6,
  ),
  // Monad (no canonical USDT)
  makeStable(
    NETWORK_CHAIN_ID.MONAD,
    'USDC',
    '0x754704bc059f8c67012fed69bc8a327a5aafb603',
    6,
  ),
  // HyperEVM (no canonical USDT)
  makeStable(
    NETWORK_CHAIN_ID.HYPE,
    'USDC',
    '0xb88339cb7199b77e23db6e890353e22632ba630f',
    6,
  ),
];
