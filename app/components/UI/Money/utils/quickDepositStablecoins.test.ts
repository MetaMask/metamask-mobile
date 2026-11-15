import { CHAIN_IDS } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { MUSD_TOKEN_ADDRESS } from '../../Earn/constants/musd';
import { getRelayFixedSpreadRoutesWithSymbols } from '../../../Views/confirmations/utils/relayFixedSpread';
import {
  buildQuickDepositStablecoinOptions,
  resolveQuickDepositStablecoinContracts,
  type AccountTokenBalances,
} from './quickDepositStablecoins';

const ETH_USDC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const BASE_USDC = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
const BSC_USDC = '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d';
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
    eth_ausdc: '0x98c23e9d8f34fefb1b7bd6a91b7ff122f4e16f5c',
    base_usdc: BASE_USDC,
    bsc_usdc: BSC_USDC,
    polygon_usdc: POLYGON_USDC,
    sepolia_usdc: ETH_USDC,
    musd: MUSD,
  },
  routes: [
    ['eth', 'eth_usdc', 'monad', 'musd'],
    ['eth', 'eth_ausdc', 'monad', 'musd'],
    ['base', 'base_usdc', 'monad', 'musd'],
    ['bsc', 'bsc_usdc', 'monad', 'musd'],
    ['polygon', 'polygon_usdc', 'base', 'base_usdc'],
    ['sepolia', 'sepolia_usdc', 'monad', 'musd'],
    ['eth', 'musd', 'monad', 'musd'],
  ],
};

const raw = (whole: string, decimals: number): Hex =>
  `0x${(BigInt(whole) * BigInt(10) ** BigInt(decimals)).toString(16)}` as Hex;

const build = (
  accountBalances: AccountTokenBalances | undefined,
  extras: { relayFlag?: unknown; blockedTokens?: object } = {},
) =>
  buildQuickDepositStablecoinOptions({
    relayFlag:
      extras.relayFlag === undefined ? monadMusdFlag : extras.relayFlag,
    accountBalances,
    blockedTokens: extras.blockedTokens as never,
  });

describe('resolveQuickDepositStablecoinContracts', () => {
  it('returns nothing when the sponsored-route flag is empty', () => {
    expect(resolveQuickDepositStablecoinContracts([])).toEqual([]);
  });

  it('keeps USDC routes into Monad mUSD and drops wrappers, testnets, and other targets', () => {
    const contracts = resolveQuickDepositStablecoinContracts(
      getRelayFixedSpreadRoutesWithSymbols(
        monadMusdFlag,
        'confirmations_relay_fixed_spread',
      ),
    );

    expect(contracts.map((contract) => contract.address)).toEqual([
      ETH_USDC,
      BASE_USDC,
      BSC_USDC,
    ]);
  });
});

describe('buildQuickDepositStablecoinOptions', () => {
  it('sums supported USDC and preselects the chain with the largest balance', () => {
    expect(
      build({
        [CHAIN_IDS.MAINNET]: { [ETH_USDC]: raw('10', 6) },
        [CHAIN_IDS.BASE]: { [BASE_USDC]: raw('40', 6) },
      }),
    ).toEqual([
      {
        symbol: 'USDC',
        aggregatedBalance: '50',
        preferredPaymentToken: { address: BASE_USDC, chainId: CHAIN_IDS.BASE },
      },
    ]);
  });

  it('hides a zero balance, an unsponsored chain, and a testnet', () => {
    expect(build({ [CHAIN_IDS.MAINNET]: { [ETH_USDC]: '0x0' } })).toEqual([]);
    expect(
      build({ [CHAIN_IDS.POLYGON]: { [POLYGON_USDC]: raw('80', 6) } }),
    ).toEqual([]);
    expect(
      build({ [CHAIN_IDS.SEPOLIA]: { [ETH_USDC]: raw('90', 6) } }),
    ).toEqual([]);
  });

  it('reads 18-decimal BNB Chain USDC and skips a blocked contract', () => {
    expect(
      build({ [CHAIN_IDS.BSC]: { [BSC_USDC]: raw('7', 18) } })[0]
        ?.aggregatedBalance,
    ).toBe('7');
    expect(
      build(
        {
          [CHAIN_IDS.MAINNET]: { [ETH_USDC]: raw('12', 6) },
          [CHAIN_IDS.BASE]: { [BASE_USDC]: raw('2', 6) },
        },
        {
          blockedTokens: {
            chainIds: [CHAIN_IDS.MAINNET],
            tokens: [],
          },
        },
      )[0]?.aggregatedBalance,
    ).toBe('2');
  });

  it('hides USDC when the sponsored-route flag is missing', () => {
    expect(
      build(
        { [CHAIN_IDS.MAINNET]: { [ETH_USDC]: raw('8', 6) } },
        { relayFlag: null },
      ),
    ).toEqual([]);
  });

  it('does not fall back once the flag lists Monad mUSD routes without USDC', () => {
    expect(
      build(
        { [CHAIN_IDS.MAINNET]: { [ETH_USDC]: raw('8', 6) } },
        {
          relayFlag: {
            chains: { eth: CHAIN_IDS.MAINNET, monad: CHAIN_IDS.MONAD },
            tokens: { musd: MUSD },
            routes: [['eth', 'musd', 'monad', 'musd']],
          },
        },
      ),
    ).toEqual([]);
  });
});
