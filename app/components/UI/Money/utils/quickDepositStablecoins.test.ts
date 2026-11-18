import { CHAIN_IDS } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { MUSD_TOKEN_ADDRESS } from '../../Earn/constants/musd';
import {
  buildQuickDepositStablecoinOptions,
  type AccountTokenBalances,
} from './quickDepositStablecoins';

const ETH_USDC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const ETH_USDT = '0xdac17f958d2ee523a2206206994597c13d831ec7';
const BASE_USDC = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
const BSC_USDT = '0x55d398326f99059ff775485246999027b3197955';
const POLYGON_USDC = '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359';
const MUSD = MUSD_TOKEN_ADDRESS.toLowerCase();

const monadMusdFlag = {
  chains: {
    eth: CHAIN_IDS.MAINNET,
    base: CHAIN_IDS.BASE,
    bsc: CHAIN_IDS.BSC,
    polygon: CHAIN_IDS.POLYGON,
    monad: CHAIN_IDS.MONAD,
    sepolia: CHAIN_IDS.SEPOLIA,
  },
  tokens: {
    eth_usdc: ETH_USDC,
    eth_usdt: ETH_USDT,
    eth_ausdc: '0x98c23e9d8f34fefb1b7bd6a91b7ff122f4e16f5c',
    base_usdc: BASE_USDC,
    bsc_usdt: BSC_USDT,
    polygon_usdc: POLYGON_USDC,
    sepolia_usdc: ETH_USDC,
    musd: MUSD,
  },
  routes: [
    ['eth', 'eth_usdc', 'monad', 'musd'],
    ['eth', 'eth_usdt', 'monad', 'musd'],
    ['eth', 'eth_ausdc', 'monad', 'musd'],
    ['base', 'base_usdc', 'monad', 'musd'],
    ['bsc', 'bsc_usdt', 'monad', 'musd'],
    ['polygon', 'polygon_usdc', 'base', 'base_usdc'],
    ['sepolia', 'sepolia_usdc', 'monad', 'musd'],
    ['eth', 'musd', 'monad', 'musd'],
  ],
};

const raw = (whole: string, decimals: number): Hex =>
  `0x${(BigInt(whole) * BigInt(10) ** BigInt(decimals)).toString(16)}` as Hex;

const build = (
  accountBalances: AccountTokenBalances | undefined,
  relayFlag: unknown = monadMusdFlag,
  blockedTokens?: object,
) =>
  buildQuickDepositStablecoinOptions({
    relayFlag,
    accountBalances,
    blockedTokens: blockedTokens as never,
  });

describe('quickDepositStablecoins', () => {
  it('sums the winner and prefills its largest chain', () => {
    expect(
      build({
        [CHAIN_IDS.MAINNET]: {
          [ETH_USDC]: raw('10', 6),
          [ETH_USDT]: raw('20', 6),
        },
        [CHAIN_IDS.BASE]: { [BASE_USDC]: raw('40', 6) },
      })[0],
    ).toEqual(
      expect.objectContaining({
        symbol: 'USDC',
        intent: 'addUsdc',
        aggregatedBalance: '50',
        preferredPaymentToken: { address: BASE_USDC, chainId: CHAIN_IDS.BASE },
      }),
    );
  });

  it('prefers the largest total, then USDC, USDT, mUSD', () => {
    expect(
      build({
        [CHAIN_IDS.MAINNET]: {
          [ETH_USDC]: raw('10', 6),
          [ETH_USDT]: raw('10', 6),
          [MUSD]: raw('10', 6),
        },
      })[0]?.symbol,
    ).toBe('USDC');
    expect(
      build({
        [CHAIN_IDS.MAINNET]: { [ETH_USDT]: raw('10', 6), [MUSD]: raw('10', 6) },
      })[0]?.intent,
    ).toBe('addUsdt');
    expect(
      build({
        [CHAIN_IDS.MAINNET]: { [ETH_USDC]: raw('4', 6), [MUSD]: raw('9', 6) },
      })[0]?.intent,
    ).toBe('addMusd');
  });

  it('hides empty, unsponsored, testnet, non-EVM, and unconfigured balances', () => {
    const hidden = [
      { [CHAIN_IDS.MAINNET]: { [ETH_USDC]: '0x0' } },
      { [CHAIN_IDS.POLYGON]: { [POLYGON_USDC]: raw('80', 6) } },
      { [CHAIN_IDS.SEPOLIA]: { [ETH_USDC]: raw('90', 6) } },
      {
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': { [ETH_USDC]: raw('78', 6) },
      },
    ];
    hidden.forEach((balances) => expect(build(balances)).toEqual([]));
    expect(
      build({ [CHAIN_IDS.MAINNET]: { [ETH_USDC]: raw('8', 6) } }, null),
    ).toEqual([]);
  });

  it('reads 18-decimal BNB Chain USDT and skips a blocked chain', () => {
    expect(
      build({ [CHAIN_IDS.BSC]: { [BSC_USDT]: raw('7', 18) } })[0]
        ?.aggregatedBalance,
    ).toBe('7');
    const blocked = build(
      {
        [CHAIN_IDS.MAINNET]: { [ETH_USDC]: raw('12', 6) },
        [CHAIN_IDS.BASE]: { [BASE_USDC]: raw('2', 6) },
      },
      monadMusdFlag,
      { chainIds: [CHAIN_IDS.MAINNET], tokens: [] },
    );
    expect(blocked[0]?.aggregatedBalance).toBe('2');
  });
});
