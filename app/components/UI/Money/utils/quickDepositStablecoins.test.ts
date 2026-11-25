import { CHAIN_IDS } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import type { PreferredToken } from '../../../../selectors/featureFlagController/confirmations';
import { MUSD_TOKEN_ADDRESS } from '../../Earn/constants/musd';
import {
  buildQuickDepositStablecoinOption,
  type QuickDepositAsset,
} from './quickDepositStablecoins';

const ETH_USDC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const ETH_USDT = '0xdac17f958d2ee523a2206206994597c13d831ec7';
const ETH_AUSDC = '0x98c23e9d8f34fefb1b7bd6a91b7ff122f4e16f5c';
const ARB_USDT = '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9';
const BASE_USDC = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
const BSC_USDC = '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d';
const BSC_USDT = '0x55d398326f99059ff775485246999027b3197955';
const POLYGON_USDC = '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359';
const MUSD = MUSD_TOKEN_ADDRESS;

const token = (
  address: string,
  chainId: string,
  name?: string,
): PreferredToken => ({
  address,
  chainId,
  name,
  successRate: 1,
});

const supportedTokens = [
  token(ETH_USDC, CHAIN_IDS.MAINNET, 'USDC'),
  token(ETH_USDT, CHAIN_IDS.MAINNET, 'USDT'),
  token(ETH_AUSDC, CHAIN_IDS.MAINNET, 'aEthUSDC'),
  token(ARB_USDT, CHAIN_IDS.ARBITRUM, 'USDT'),
  token(BASE_USDC, CHAIN_IDS.BASE, 'USDC'),
  token(BSC_USDC, CHAIN_IDS.BSC, 'USDC'),
  token(BSC_USDT, CHAIN_IDS.BSC, 'USDT'),
  token(MUSD, CHAIN_IDS.MAINNET, 'mUSD'),
  token(MUSD, CHAIN_IDS.LINEA_MAINNET, 'mUSD'),
  token(MUSD, CHAIN_IDS.MONAD, 'mUSD'),
];

const raw = (whole: string, decimals: number): Hex =>
  `0x${(BigInt(whole) * 10n ** BigInt(decimals)).toString(16)}`;

const asset = (
  overrides: Pick<QuickDepositAsset, 'address' | 'chainId' | 'symbol'> &
    Partial<QuickDepositAsset>,
): QuickDepositAsset => ({
  decimals: 6,
  rawBalance: '0x0',
  ...overrides,
});

const build = (
  assets: QuickDepositAsset[],
  tokens: PreferredToken[] = supportedTokens,
) => buildQuickDepositStablecoinOption({ assets, supportedTokens: tokens });

describe('buildQuickDepositStablecoinOption', () => {
  it('sums the winner and prefills its largest chain', () => {
    expect(
      build([
        asset({
          address: ETH_USDC,
          chainId: CHAIN_IDS.MAINNET,
          symbol: 'USDC',
          rawBalance: raw('10', 6),
        }),
        asset({
          address: BASE_USDC,
          chainId: CHAIN_IDS.BASE,
          symbol: 'USDC',
          rawBalance: raw('40', 6),
        }),
        asset({
          address: ETH_USDT,
          chainId: CHAIN_IDS.MAINNET,
          symbol: 'USDT',
          rawBalance: raw('20', 6),
        }),
      ]),
    ).toEqual(
      expect.objectContaining({
        symbol: 'USDC',
        intent: 'addUsdc',
        aggregatedBalance: '50',
        preferredPaymentToken: { address: BASE_USDC, chainId: CHAIN_IDS.BASE },
      }),
    );
  });

  it('picks USDT on Arbitrum when it is the largest balance', () => {
    expect(
      build([
        asset({
          address: ETH_USDC,
          chainId: CHAIN_IDS.MAINNET,
          symbol: 'USDC',
          rawBalance: raw('5', 6),
        }),
        asset({
          address: ARB_USDT,
          chainId: CHAIN_IDS.ARBITRUM,
          symbol: 'USDT',
          rawBalance: raw('75', 6),
        }),
      ]),
    ).toEqual(
      expect.objectContaining({
        symbol: 'USDT',
        intent: 'addUsdt',
        aggregatedBalance: '75',
        preferredPaymentToken: {
          address: ARB_USDT,
          chainId: CHAIN_IDS.ARBITRUM,
        },
      }),
    );
  });

  it('uses the Pay config name when token metadata differs', () => {
    expect(
      build([
        asset({
          address: ARB_USDT,
          chainId: CHAIN_IDS.ARBITRUM,
          symbol: 'USDT0',
          rawBalance: raw('75', 6),
        }),
      ]),
    ).toEqual(
      expect.objectContaining({
        symbol: 'USDT',
        intent: 'addUsdt',
        aggregatedBalance: '75',
      }),
    );
  });

  it('picks mUSD when it is the largest balance', () => {
    expect(
      build([
        asset({
          address: ETH_USDC,
          chainId: CHAIN_IDS.MAINNET,
          symbol: 'USDC',
          rawBalance: raw('4', 6),
        }),
        asset({
          address: MUSD,
          chainId: CHAIN_IDS.LINEA_MAINNET,
          symbol: 'MUSD',
          rawBalance: raw('9', 6),
        }),
      ]),
    ).toEqual(
      expect.objectContaining({
        symbol: 'mUSD',
        intent: 'addMusd',
        aggregatedBalance: '9',
        preferredPaymentToken: {
          address: MUSD,
          chainId: CHAIN_IDS.LINEA_MAINNET,
        },
      }),
    );
  });

  it('prefers USDC when USDC, USDT, and mUSD tie', () => {
    expect(
      build([
        asset({
          address: ETH_USDC,
          chainId: CHAIN_IDS.MAINNET,
          symbol: 'USDC',
          rawBalance: raw('10', 6),
        }),
        asset({
          address: ETH_USDT,
          chainId: CHAIN_IDS.MAINNET,
          symbol: 'USDT',
          rawBalance: raw('10', 6),
        }),
        asset({
          address: MUSD,
          chainId: CHAIN_IDS.MAINNET,
          symbol: 'mUSD',
          rawBalance: raw('10', 6),
        }),
      ])?.symbol,
    ).toBe('USDC');
  });

  it('prefers USDT when USDT and mUSD tie', () => {
    expect(
      build([
        asset({
          address: ETH_USDT,
          chainId: CHAIN_IDS.MAINNET,
          symbol: 'USDT',
          rawBalance: raw('10', 6),
        }),
        asset({
          address: MUSD,
          chainId: CHAIN_IDS.MAINNET,
          symbol: 'mUSD',
          rawBalance: raw('10', 6),
        }),
      ])?.intent,
    ).toBe('addUsdt');
  });

  it('reads 18-decimal BNB Chain tokens from the asset metadata', () => {
    expect(
      build([
        asset({
          address: BSC_USDC,
          chainId: CHAIN_IDS.BSC,
          symbol: 'USDC',
          decimals: 18,
          rawBalance: raw('7', 18),
        }),
      ]),
    ).toEqual(
      expect.objectContaining({
        symbol: 'USDC',
        aggregatedBalance: '7',
        preferredPaymentToken: {
          address: BSC_USDC,
          chainId: CHAIN_IDS.BSC,
        },
      }),
    );

    expect(
      build([
        asset({
          address: BSC_USDT,
          chainId: CHAIN_IDS.BSC,
          symbol: 'USDT',
          decimals: 18,
          rawBalance: raw('3', 18),
        }),
      ])?.aggregatedBalance,
    ).toBe('3');
  });

  it('hides when there are no assets', () => {
    expect(build([])).toBeUndefined();
  });

  it('hides a zero balance', () => {
    expect(
      build([
        asset({
          address: ETH_USDC,
          chainId: CHAIN_IDS.MAINNET,
          symbol: 'USDC',
          rawBalance: '0x0',
        }),
      ]),
    ).toBeUndefined();
  });

  it('hides an unsupported chain', () => {
    expect(
      build([
        asset({
          address: POLYGON_USDC,
          chainId: CHAIN_IDS.POLYGON,
          symbol: 'USDC',
          rawBalance: raw('80', 6),
        }),
      ]),
    ).toBeUndefined();
  });

  it('hides when the supported list is empty', () => {
    expect(
      build(
        [
          asset({
            address: ETH_USDC,
            chainId: CHAIN_IDS.MAINNET,
            symbol: 'USDC',
            rawBalance: raw('8', 6),
          }),
        ],
        [],
      ),
    ).toBeUndefined();
  });

  it('hides a testnet token', () => {
    expect(
      build([
        asset({
          address: ETH_USDC,
          chainId: CHAIN_IDS.SEPOLIA,
          symbol: 'USDC',
          rawBalance: raw('90', 6),
        }),
      ]),
    ).toBeUndefined();
  });

  it('ignores aUSDC and USDC.e', () => {
    expect(
      build(
        [
          asset({
            address: ETH_AUSDC,
            chainId: CHAIN_IDS.MAINNET,
            symbol: 'aUSDC',
            rawBalance: raw('50', 6),
          }),
          asset({
            address: POLYGON_USDC,
            chainId: CHAIN_IDS.POLYGON,
            symbol: 'USDC.e',
            rawBalance: raw('60', 6),
          }),
        ],
        [...supportedTokens, token(POLYGON_USDC, CHAIN_IDS.POLYGON, 'USDC.e')],
      ),
    ).toBeUndefined();
  });

  it('ignores the legacy MUSD token', () => {
    const legacyMusd = '0xe2fceac20813592220b8c56999000d08c7844e6c';

    expect(
      build(
        [
          asset({
            address: legacyMusd,
            chainId: CHAIN_IDS.MAINNET,
            symbol: 'MUSD',
            rawBalance: raw('50', 6),
          }),
        ],
        [...supportedTokens, token(legacyMusd, CHAIN_IDS.MAINNET, 'MUSD')],
      ),
    ).toBeUndefined();
  });
});
