import { CHAIN_IDS } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { MUSD_TOKEN_ADDRESS } from '../../Earn/constants/musd';
import { getRelayFixedSpreadRoutesWithSymbols } from '../../../Views/confirmations/utils/relayFixedSpread';
import {
  aliasToQuickDepositSymbol,
  buildQuickDepositStablecoinOptions,
  QUICK_DEPOSIT_STABLECOIN_FALLBACK_CONTRACTS,
  resolveQuickDepositStablecoinContracts,
  selectHighestPositiveBalanceChain,
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

const raw = (whole: string, decimals: number): Hex => {
  const value = BigInt(whole) * BigInt(10) ** BigInt(decimals);
  return `0x${value.toString(16)}` as Hex;
};

describe('aliasToQuickDepositSymbol', () => {
  it('reads USDC and USDT from chain-prefixed aliases', () => {
    expect(aliasToQuickDepositSymbol('eth_usdc')).toBe('USDC');
    expect(aliasToQuickDepositSymbol('bsc_usdt')).toBe('USDT');
  });

  it('ignores wrapped and lookalike aliases', () => {
    expect(aliasToQuickDepositSymbol('eth_ausdc')).toBeUndefined();
    expect(aliasToQuickDepositSymbol('eth_ausdt')).toBeUndefined();
    expect(aliasToQuickDepositSymbol('polygon_usdce')).toBeUndefined();
    expect(aliasToQuickDepositSymbol('musd')).toBeUndefined();
  });
});

describe('resolveQuickDepositStablecoinContracts', () => {
  it('uses the fallback catalog when no deposit routes are available', () => {
    expect(resolveQuickDepositStablecoinContracts([])).toEqual(
      QUICK_DEPOSIT_STABLECOIN_FALLBACK_CONTRACTS,
    );
  });

  it('drops wrapped tokens, testnets, and routes that do not target Monad mUSD', () => {
    const contracts = resolveQuickDepositStablecoinContracts(
      getRelayFixedSpreadRoutesWithSymbols(
        monadMusdFlag,
        'confirmations_relay_fixed_spread',
      ),
    );

    expect(contracts.map((contract) => contract.address)).toEqual([
      ETH_USDC,
      ETH_USDT,
      BASE_USDC,
      BSC_USDT,
    ]);
  });
});

describe('selectHighestPositiveBalanceChain', () => {
  it('returns the chain with the largest balance', () => {
    const chainId = selectHighestPositiveBalanceChain(
      {
        [CHAIN_IDS.MAINNET]: '500',
        [CHAIN_IDS.LINEA_MAINNET]: '1000',
      },
      CHAIN_IDS.MAINNET,
    );

    expect(chainId).toBe(CHAIN_IDS.LINEA_MAINNET);
  });

  it('returns the fallback chain when every balance is zero', () => {
    const chainId = selectHighestPositiveBalanceChain(
      { [CHAIN_IDS.BASE]: '0' },
      CHAIN_IDS.MAINNET,
    );

    expect(chainId).toBe(CHAIN_IDS.MAINNET);
  });
});

describe('buildQuickDepositStablecoinOptions', () => {
  it('shows USDC and USDT when the account holds a non-zero balance on a supported chain', () => {
    const accountBalances: AccountTokenBalances = {
      [CHAIN_IDS.MAINNET]: {
        [ETH_USDC]: raw('25', 6),
        [ETH_USDT]: raw('4', 6),
      },
    };

    const options = buildQuickDepositStablecoinOptions({
      relayFlag: monadMusdFlag,
      accountBalances,
    });

    expect(options).toEqual([
      {
        symbol: 'USDC',
        aggregatedBalance: '25',
        preferredPaymentToken: {
          address: ETH_USDC,
          chainId: CHAIN_IDS.MAINNET,
        },
      },
      {
        symbol: 'USDT',
        aggregatedBalance: '4',
        preferredPaymentToken: {
          address: ETH_USDT,
          chainId: CHAIN_IDS.MAINNET,
        },
      },
    ]);
  });

  it('hides a symbol when every supported balance is zero', () => {
    const options = buildQuickDepositStablecoinOptions({
      relayFlag: monadMusdFlag,
      accountBalances: {
        [CHAIN_IDS.MAINNET]: {
          [ETH_USDC]: '0x0',
          [ETH_USDT]: '0x0',
        },
      },
    });

    expect(options).toEqual([]);
  });

  it('hides a symbol the account does not hold', () => {
    const options = buildQuickDepositStablecoinOptions({
      relayFlag: monadMusdFlag,
      accountBalances: {
        [CHAIN_IDS.MAINNET]: {
          [ETH_USDC]: raw('1', 6),
        },
      },
    });

    expect(options.map((option) => option.symbol)).toEqual(['USDC']);
  });

  it('ignores a balance on a chain that does not deposit into Monad mUSD', () => {
    const options = buildQuickDepositStablecoinOptions({
      relayFlag: monadMusdFlag,
      accountBalances: {
        [CHAIN_IDS.POLYGON]: {
          [POLYGON_USDC]: raw('80', 6),
        },
      },
    });

    expect(options).toEqual([]);
  });

  it('ignores testnet balances even when a deposit route is listed', () => {
    const options = buildQuickDepositStablecoinOptions({
      relayFlag: monadMusdFlag,
      accountBalances: {
        [CHAIN_IDS.SEPOLIA]: {
          [ETH_USDC]: raw('90', 6),
        },
      },
    });

    expect(options).toEqual([]);
  });

  it('sums supported chains and preselects the chain with the full largest balance', () => {
    const options = buildQuickDepositStablecoinOptions({
      relayFlag: monadMusdFlag,
      accountBalances: {
        [CHAIN_IDS.MAINNET]: {
          [ETH_USDC]: raw('10', 6),
        },
        [CHAIN_IDS.BASE]: {
          [BASE_USDC]: raw('40', 6),
        },
      },
    });

    expect(options).toEqual([
      {
        symbol: 'USDC',
        aggregatedBalance: '50',
        preferredPaymentToken: {
          address: BASE_USDC,
          chainId: CHAIN_IDS.BASE,
        },
      },
    ]);
  });

  it('reads 18-decimal BNB Chain USDT as a whole token', () => {
    const options = buildQuickDepositStablecoinOptions({
      relayFlag: monadMusdFlag,
      accountBalances: {
        [CHAIN_IDS.BSC]: {
          [BSC_USDT]: raw('7', 18),
        },
      },
    });

    expect(options).toEqual([
      {
        symbol: 'USDT',
        aggregatedBalance: '7',
        preferredPaymentToken: {
          address: BSC_USDT,
          chainId: CHAIN_IDS.BSC,
        },
      },
    ]);
  });

  it('hides a holding that MetaMask Pay blocks for money account deposits', () => {
    const options = buildQuickDepositStablecoinOptions({
      relayFlag: monadMusdFlag,
      accountBalances: {
        [CHAIN_IDS.MAINNET]: {
          [ETH_USDC]: raw('12', 6),
          [ETH_USDT]: raw('3', 6),
        },
      },
      blockedTokens: {
        chainIds: [],
        tokens: [{ address: ETH_USDC, chainId: CHAIN_IDS.MAINNET }],
      },
    });

    expect(options.map((option) => option.symbol)).toEqual(['USDT']);
  });

  it('hides holdings on a chain MetaMask Pay blocks', () => {
    const options = buildQuickDepositStablecoinOptions({
      relayFlag: monadMusdFlag,
      accountBalances: {
        [CHAIN_IDS.MAINNET]: {
          [ETH_USDC]: raw('12', 6),
        },
        [CHAIN_IDS.BASE]: {
          [BASE_USDC]: raw('2', 6),
        },
      },
      blockedTokens: {
        chainIds: [CHAIN_IDS.MAINNET],
        tokens: [],
      },
    });

    expect(options).toEqual([
      {
        symbol: 'USDC',
        aggregatedBalance: '2',
        preferredPaymentToken: {
          address: BASE_USDC,
          chainId: CHAIN_IDS.BASE,
        },
      },
    ]);
  });

  it('uses the fallback catalog when the relay flag is missing', () => {
    const options = buildQuickDepositStablecoinOptions({
      relayFlag: undefined,
      accountBalances: {
        [CHAIN_IDS.MAINNET]: {
          [ETH_USDC]: raw('8', 6),
        },
      },
    });

    expect(options[0]?.preferredPaymentToken).toEqual({
      address: ETH_USDC,
      chainId: CHAIN_IDS.MAINNET,
    });
  });

  it('does not fall back to extra chains once the flag lists Monad mUSD routes', () => {
    const options = buildQuickDepositStablecoinOptions({
      relayFlag: {
        chains: { eth: CHAIN_IDS.MAINNET, monad: CHAIN_IDS.MONAD },
        tokens: { eth_usdt: ETH_USDT, musd: MUSD },
        routes: [['eth', 'eth_usdt', 'monad', 'musd']],
      },
      accountBalances: {
        [CHAIN_IDS.MAINNET]: {
          [ETH_USDC]: raw('8', 6),
          [ETH_USDT]: raw('1', 6),
        },
      },
    });

    expect(options.map((option) => option.symbol)).toEqual(['USDT']);
  });
});
