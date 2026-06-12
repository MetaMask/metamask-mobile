import { toChecksumAddress } from '../../../../../../../util/address';
import type { BridgeToken } from '../../../../../../UI/Bridge/types';
import {
  enrichTokenBalance,
  type TokenBalanceDeps,
} from './enrichTokenBalance';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const ACCOUNT = '0x742d35cc6634c0532925a3b844bc454e4438f44e';
const USDC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';

const toHexBalance = (value: bigint): string => `0x${value.toString(16)}`;

const token = (
  overrides: Partial<BridgeToken> &
    Pick<BridgeToken, 'address' | 'chainId' | 'symbol'>,
): BridgeToken =>
  ({
    decimals: 18,
    name: 'Token',
    ...overrides,
  }) as BridgeToken;

const baseDeps = (overrides: Record<string, unknown> = {}): TokenBalanceDeps =>
  ({
    accountAddress: ACCOUNT,
    accountsByChainId: {},
    tokenBalances: {},
    tokenMarketData: {},
    currencyRates: { ETH: { usdConversionRate: 2000 } },
    allNetworkConfigs: { '0x1': { nativeCurrency: 'ETH' } },
    ...overrides,
  }) as unknown as TokenBalanceDeps;

describe('enrichTokenBalance', () => {
  describe('EVM native', () => {
    it('prices a held native token using the usd conversion rate', () => {
      const deps = baseDeps({
        accountsByChainId: {
          '0x1': {
            [toChecksumAddress(ACCOUNT)]: { balance: toHexBalance(10n ** 18n) },
          },
        },
      });

      const result = enrichTokenBalance(
        token({ address: ZERO_ADDRESS, chainId: '0x1', symbol: 'ETH' }),
        deps,
      );

      expect(result).toEqual({
        balance: '1.0',
        balanceFiat: '$2000.00',
        tokenFiatAmount: 2000,
        currencyExchangeRate: 2000,
      });
    });

    it('returns null for a native token with no balance', () => {
      const result = enrichTokenBalance(
        token({ address: ZERO_ADDRESS, chainId: '0x1', symbol: 'ETH' }),
        baseDeps(),
      );

      expect(result).toBeNull();
    });
  });

  describe('EVM ERC-20', () => {
    const withUsdcBalance = (extra: Record<string, unknown> = {}) =>
      baseDeps({
        tokenBalances: {
          [toChecksumAddress(ACCOUNT)]: {
            '0x1': {
              [toChecksumAddress(USDC)]: toHexBalance(250n * 10n ** 6n),
            },
          },
        },
        ...extra,
      });

    it('prices an ERC-20 from market data times the usd conversion rate', () => {
      const deps = withUsdcBalance({
        tokenMarketData: {
          '0x1': { [toChecksumAddress(USDC)]: { price: 0.0005 } },
        },
      });

      const result = enrichTokenBalance(
        token({ address: USDC, chainId: '0x1', symbol: 'USDC', decimals: 6 }),
        deps,
      );

      expect(result).toMatchObject({
        balance: '250.0',
        currencyExchangeRate: 1,
        tokenFiatAmount: 250,
      });
    });

    it('drops a held token with no market price (strict)', () => {
      const result = enrichTokenBalance(
        token({ address: USDC, chainId: '0x1', symbol: 'USDC', decimals: 6 }),
        withUsdcBalance(),
      );

      expect(result).toBeNull();
    });

    it('returns null when the computed exchange rate is zero (strict)', () => {
      const deps = withUsdcBalance({
        tokenMarketData: { '0x1': { [toChecksumAddress(USDC)]: { price: 0 } } },
      });

      const result = enrichTokenBalance(
        token({ address: USDC, chainId: '0x1', symbol: 'USDC', decimals: 6 }),
        deps,
      );

      expect(result).toBeNull();
    });

    it('returns a zero enrichment for an unheld token when lenient', () => {
      const result = enrichTokenBalance(
        token({ address: USDC, chainId: '0x1', symbol: 'USDC', decimals: 6 }),
        baseDeps(),
        { includeZeroBalance: true },
      );

      expect(result).toEqual({
        balance: '0',
        balanceFiat: '$0.00',
        tokenFiatAmount: 0,
        currencyExchangeRate: undefined,
      });
    });

    it('keeps the held balance for an unpriceable token when lenient', () => {
      const result = enrichTokenBalance(
        token({ address: USDC, chainId: '0x1', symbol: 'USDC', decimals: 6 }),
        withUsdcBalance(),
        { includeZeroBalance: true },
      );

      expect(result).toEqual({
        balance: '250.0',
        balanceFiat: undefined,
        tokenFiatAmount: 0,
        currencyExchangeRate: undefined,
      });
    });
  });

  describe('Solana', () => {
    const solAssetId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501';
    const solanaScope = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
    const solanaAccount = { id: 'solana-account-id' };

    it('prices a held Solana asset from multichain rates', () => {
      const deps = baseDeps({
        solanaAccount,
        multichainBalances: {
          [solanaAccount.id]: { [solAssetId]: { amount: '12.5' } },
        },
        multichainRates: { [solAssetId]: { rate: '200' } },
      });

      const result = enrichTokenBalance(
        token({
          address: solAssetId,
          chainId: solanaScope,
          symbol: 'SOL',
          decimals: 9,
        }),
        deps,
      );

      expect(result).toEqual({
        balance: '12.5',
        balanceFiat: '$2500.00',
        tokenFiatAmount: 2500,
        currencyExchangeRate: 200,
      });
    });

    it('returns null when there is no Solana account', () => {
      const result = enrichTokenBalance(
        token({ address: solAssetId, chainId: solanaScope, symbol: 'SOL' }),
        baseDeps(),
      );

      expect(result).toBeNull();
    });

    it('returns null when the Solana balance is zero', () => {
      const deps = baseDeps({
        solanaAccount,
        multichainBalances: {
          [solanaAccount.id]: { [solAssetId]: { amount: '0' } },
        },
        multichainRates: { [solAssetId]: { rate: '200' } },
      });

      const result = enrichTokenBalance(
        token({ address: solAssetId, chainId: solanaScope, symbol: 'SOL' }),
        deps,
      );

      expect(result).toBeNull();
    });

    it('keeps the held Solana balance when the rate is missing and lenient', () => {
      const deps = baseDeps({
        solanaAccount,
        multichainBalances: {
          [solanaAccount.id]: { [solAssetId]: { amount: '12.5' } },
        },
        multichainRates: {},
      });

      const result = enrichTokenBalance(
        token({ address: solAssetId, chainId: solanaScope, symbol: 'SOL' }),
        deps,
        { includeZeroBalance: true },
      );

      expect(result).toEqual({
        balance: '12.5',
        balanceFiat: undefined,
        tokenFiatAmount: 0,
        currencyExchangeRate: undefined,
      });
    });
  });
});
