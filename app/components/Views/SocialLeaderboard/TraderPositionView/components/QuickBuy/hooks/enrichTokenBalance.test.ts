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
    // `conversionRate` is the native-token -> user-currency rate that the
    // canonical `calcTokenFiatRate` reads.
    currencyRates: { ETH: { conversionRate: 2000, usdConversionRate: 2000 } },
    currentCurrency: 'USD',
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
        balanceFiat: '$2,000.00',
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

    it('prices an ERC-20 from market data times the native conversion rate', () => {
      const deps = withUsdcBalance({
        tokenMarketData: {
          '0x1': { [toChecksumAddress(USDC)]: { price: 0.0005 } },
        },
      });

      const result = enrichTokenBalance(
        token({
          address: toChecksumAddress(USDC),
          chainId: '0x1',
          symbol: 'USDC',
          decimals: 6,
        }),
        deps,
      );

      expect(result).toMatchObject({
        balance: '250.0',
        balanceFiat: '$250.00',
        currencyExchangeRate: 1,
        tokenFiatAmount: 250,
      });
    });

    it('prices a lowercase-address ERC-20 against checksum-keyed market data', () => {
      const deps = withUsdcBalance({
        tokenMarketData: {
          '0x1': { [toChecksumAddress(USDC)]: { price: 0.0005 } },
        },
      });

      const result = enrichTokenBalance(
        token({
          address: USDC.toLowerCase(),
          chainId: '0x1',
          symbol: 'USDC',
          decimals: 6,
        }),
        deps,
      );

      expect(result).toMatchObject({
        balance: '250.0',
        balanceFiat: '$250.00',
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
        balanceFiat: '$2,500.00',
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

  describe('Tron and Bitcoin', () => {
    const trxAssetId = 'tron:728126428/slip44:195';
    const tronScope = 'tron:728126428';
    const btcAssetId = 'bip122:000000000019d6689c085ae165831e93/slip44:0';
    const bitcoinScope = 'bip122:000000000019d6689c085ae165831e93';
    const tronAccount = { id: 'tron-account-id' };
    const bitcoinAccount = { id: 'bitcoin-account-id' };

    it('prices a held TRX balance using the Tron account multichain data', () => {
      const deps = baseDeps({
        tronAccount,
        multichainBalances: {
          [tronAccount.id]: { [trxAssetId]: { amount: '100' } },
        },
        multichainRates: { [trxAssetId]: { rate: '0.25' } },
      });

      const result = enrichTokenBalance(
        token({ address: trxAssetId, chainId: tronScope, symbol: 'TRX' }),
        deps,
      );

      expect(result).toEqual({
        balance: '100',
        balanceFiat: '$25.00',
        tokenFiatAmount: 25,
        currencyExchangeRate: 0.25,
      });
    });

    it('prices a held BTC balance using the Bitcoin account multichain data', () => {
      const deps = baseDeps({
        bitcoinAccount,
        multichainBalances: {
          [bitcoinAccount.id]: { [btcAssetId]: { amount: '0.5' } },
        },
        multichainRates: { [btcAssetId]: { rate: '100000' } },
      });

      const result = enrichTokenBalance(
        token({ address: btcAssetId, chainId: bitcoinScope, symbol: 'BTC' }),
        deps,
      );

      expect(result).toEqual({
        balance: '0.5',
        balanceFiat: '$50,000.00',
        tokenFiatAmount: 50000,
        currencyExchangeRate: 100000,
      });
    });

    it('returns null when there is no account for the candidate chain (strict)', () => {
      const result = enrichTokenBalance(
        token({ address: trxAssetId, chainId: tronScope, symbol: 'TRX' }),
        baseDeps(),
      );

      expect(result).toBeNull();
    });

    it('returns a zero enrichment when there is no account for the chain and lenient', () => {
      const result = enrichTokenBalance(
        token({ address: btcAssetId, chainId: bitcoinScope, symbol: 'BTC' }),
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

    it('does not read another chain account for a non-EVM candidate (Solana account does not price TRX)', () => {
      const solanaAccount = { id: 'solana-account-id' };
      const deps = baseDeps({
        solanaAccount,
        multichainBalances: {
          [solanaAccount.id]: { [trxAssetId]: { amount: '100' } },
        },
        multichainRates: { [trxAssetId]: { rate: '0.25' } },
      });

      const result = enrichTokenBalance(
        token({ address: trxAssetId, chainId: tronScope, symbol: 'TRX' }),
        deps,
      );

      expect(result).toBeNull();
    });
  });
});
