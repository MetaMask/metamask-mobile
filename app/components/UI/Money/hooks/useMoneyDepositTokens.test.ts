import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { EthAccountType } from '@metamask/keyring-api';
import { useMoneyDepositTokens } from './useMoneyDepositTokens';
import { selectRelayFixedSpread } from '../../../../selectors/featureFlagController/confirmations';
import { AssetType } from '../../../Views/confirmations/types/token';
import { MUSD_TOKEN_ADDRESS } from '../../Earn/constants/musd';
import type { RelayFixedSpreadConfig } from '../../../Views/confirmations/utils/relayFixedSpread';
import { selectCurrencyRates } from '../../../../selectors/currencyRateController';
import { selectNetworkConfigurations } from '../../../../selectors/networkController';
import { calcUsdAmountFromFiat } from '../../Bridge/utils/exchange-rates';
import { selectMoneyDepositEligibleAssets } from '../selectors/depositTokens';

jest.mock('react-redux');
jest.mock('../../../../selectors/featureFlagController/confirmations');
jest.mock('../../../../selectors/currencyRateController');
jest.mock('../../../../selectors/networkController');
jest.mock('../../Bridge/utils/exchange-rates');

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockCalcUsdAmountFromFiat = calcUsdAmountFromFiat as jest.MockedFunction<
  typeof calcUsdAmountFromFiat
>;

const DEFAULT_CURRENCY_RATES: ReturnType<typeof selectCurrencyRates> = {
  ETH: {
    conversionDate: 0,
    conversionRate: 3000,
    usdConversionRate: 3000,
  },
};
const DEFAULT_NETWORK_CONFIGURATIONS: ReturnType<
  typeof selectNetworkConfigurations
> = {
  '0x1': { nativeCurrency: 'ETH' },
} as unknown as ReturnType<typeof selectNetworkConfigurations>;

/** Minimal relay config: eth USDC -> Monad mUSD (no-fee deposit route). */
const RELAY_CONFIG_WITH_DEPOSIT_ROUTE: RelayFixedSpreadConfig = {
  routes: [
    {
      sourceChain: '0x1',
      sourceToken: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // eth USDC
      targetChain: CHAIN_IDS.MONAD,
      targetToken: MUSD_TOKEN_ADDRESS,
    },
  ],
};

/** Config with mUSD as source that still deposits into Monad mUSD. */
const RELAY_CONFIG_WITH_MUSD_SOURCE_DEPOSIT: RelayFixedSpreadConfig = {
  routes: [
    {
      sourceChain: '0x1',
      sourceToken: MUSD_TOKEN_ADDRESS, // eth mUSD
      targetChain: CHAIN_IDS.MONAD,
      targetToken: MUSD_TOKEN_ADDRESS,
    },
  ],
};

/**
 * Withdraw route: Monad mUSD -> eth USDC. Monad mUSD appears only as a source
 * (no route INTO Monad mUSD), so the directional match alone would not tag it.
 */
const RELAY_CONFIG_WITH_MUSD_WITHDRAW_ROUTE: RelayFixedSpreadConfig = {
  routes: [
    {
      sourceChain: CHAIN_IDS.MONAD,
      sourceToken: MUSD_TOKEN_ADDRESS, // Monad mUSD
      targetChain: '0x1',
      targetToken: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // eth USDC
    },
  ],
};

/**
 * Deposit route into a NON-Monad mUSD: Linea USDC -> Linea mUSD. Linea USDC is
 * a subsidized source, but its target is Linea mUSD, not Monad mUSD — so a
 * Money deposit (which always targets Monad mUSD) is not subsidized.
 */
const RELAY_CONFIG_WITH_NON_MONAD_DEPOSIT: RelayFixedSpreadConfig = {
  routes: [
    {
      sourceChain: '0xe708',
      sourceToken: '0x176211869ca2b568f2a7d4ee941e073a821ee1ff', // Linea USDC
      targetChain: '0xe708',
      targetToken: MUSD_TOKEN_ADDRESS, // Linea mUSD
    },
  ],
};

const EMPTY_RELAY_CONFIG: RelayFixedSpreadConfig = { routes: [] };

const makeToken = (overrides: Partial<AssetType> = {}): AssetType =>
  ({
    address: '0xabc0000000000000000000000000000000000001',
    chainId: '0x1',
    symbol: 'TOK',
    name: 'Token',
    decimals: 18,
    balance: '1000000000000000000',
    fiat: { balance: 100, currency: 'usd', conversionRate: 1 },
    isETH: false,
    aggregators: [],
    image: '',
    accountType: EthAccountType.Eoa,
    ...overrides,
  }) as AssetType;

const ETH_USDC = makeToken({
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  symbol: 'USDC',
  chainId: '0x1',
  fiat: { balance: 500, currency: 'usd', conversionRate: 1 },
});
const ETH_USDT = makeToken({
  address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
  symbol: 'USDT',
  chainId: '0x1',
  fiat: { balance: 300, currency: 'usd', conversionRate: 1 },
});

let eligibleAssets: AssetType[] = [];

const mockSelectors = (
  relayFixedSpread: RelayFixedSpreadConfig = EMPTY_RELAY_CONFIG,
) => {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectMoneyDepositEligibleAssets) return eligibleAssets;
    if (selector === selectRelayFixedSpread) return relayFixedSpread;
    if (selector === selectCurrencyRates) return DEFAULT_CURRENCY_RATES;
    if (selector === selectNetworkConfigurations)
      return DEFAULT_NETWORK_CONFIGURATIONS;
    return undefined;
  });
};

describe('useMoneyDepositTokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    eligibleAssets = [];
    mockSelectors();
    mockCalcUsdAmountFromFiat.mockReturnValue(undefined);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('return shape', () => {
    it('returns tokens array and isNoFeeToken function', () => {
      const { result } = renderHook(() => useMoneyDepositTokens());

      expect(Array.isArray(result.current.tokens)).toBe(true);
      expect(typeof result.current.isNoFeeToken).toBe('function');
    });
  });

  describe('tokens', () => {
    it('returns eligible assets from selector unchanged', () => {
      eligibleAssets = [ETH_USDC, ETH_USDT];

      const { result } = renderHook(() => useMoneyDepositTokens());

      expect(result.current.tokens).toEqual(eligibleAssets);
    });

    it('returns an empty array when selector has no eligible assets', () => {
      const { result } = renderHook(() => useMoneyDepositTokens());

      expect(result.current.tokens).toEqual([]);
    });
  });

  describe('isNoFeeToken — directional Monad mUSD route match', () => {
    it('returns true for a token with a subsidized route TO Monad mUSD', () => {
      mockSelectors(RELAY_CONFIG_WITH_DEPOSIT_ROUTE);

      const { result } = renderHook(() => useMoneyDepositTokens());

      expect(result.current.isNoFeeToken(ETH_USDC)).toBe(true);
    });

    it('returns true when mUSD is source and destination is Monad mUSD', () => {
      const ethMusd = makeToken({
        address: MUSD_TOKEN_ADDRESS,
        symbol: 'mUSD',
        chainId: '0x1',
        fiat: { balance: 500, currency: 'usd', conversionRate: 1 },
      });
      mockSelectors(RELAY_CONFIG_WITH_MUSD_SOURCE_DEPOSIT);

      const { result } = renderHook(() => useMoneyDepositTokens());

      expect(result.current.isNoFeeToken(ethMusd)).toBe(true);
    });

    it('returns true for Monad mUSD even though the flag has no Monad mUSD -> Monad mUSD route', () => {
      const monadMusd = makeToken({
        address: MUSD_TOKEN_ADDRESS,
        symbol: 'mUSD',
        chainId: CHAIN_IDS.MONAD,
        fiat: { balance: 500, currency: 'usd', conversionRate: 1 },
      });
      mockSelectors(RELAY_CONFIG_WITH_MUSD_WITHDRAW_ROUTE);

      const { result } = renderHook(() => useMoneyDepositTokens());

      expect(result.current.isNoFeeToken(monadMusd)).toBe(true);
    });

    it('returns false for a subsidized source whose route target is NOT Monad mUSD', () => {
      const lineaUsdc = makeToken({
        address: '0x176211869ca2b568f2a7d4ee941e073a821ee1ff',
        symbol: 'USDC',
        chainId: '0xe708',
        fiat: { balance: 500, currency: 'usd', conversionRate: 1 },
      });
      mockSelectors(RELAY_CONFIG_WITH_NON_MONAD_DEPOSIT);

      const { result } = renderHook(() => useMoneyDepositTokens());

      expect(result.current.isNoFeeToken(lineaUsdc)).toBe(false);
    });

    it('returns false when the relay config has no routes', () => {
      const { result } = renderHook(() => useMoneyDepositTokens());

      expect(result.current.isNoFeeToken(ETH_USDC)).toBe(false);
    });

    it('returns false for a token with no chainId', () => {
      mockSelectors(RELAY_CONFIG_WITH_DEPOSIT_ROUTE);
      const noChain = {
        ...ETH_USDC,
        chainId: undefined,
      } as unknown as AssetType;

      const { result } = renderHook(() => useMoneyDepositTokens());

      expect(result.current.isNoFeeToken(noChain)).toBe(false);
    });

    it('returns false for a token on a different chain with same address', () => {
      mockSelectors(RELAY_CONFIG_WITH_DEPOSIT_ROUTE);
      // Same address as ETH_USDC but on Arbitrum — no matching route
      const arbitrumUsdc = makeToken({
        address: ETH_USDC.address,
        chainId: '0xa4b1',
        symbol: 'USDC',
        fiat: { balance: 100, currency: 'usd', conversionRate: 1 },
      });

      const { result } = renderHook(() => useMoneyDepositTokens());

      expect(result.current.isNoFeeToken(arbitrumUsdc)).toBe(false);
    });
  });

  describe('tokens — overrideToUsd', () => {
    it('leaves fiat balance untouched when overrideToUsd is not passed', () => {
      eligibleAssets = [ETH_USDC];

      const { result } = renderHook(() => useMoneyDepositTokens());

      expect(result.current.tokens).toContainEqual(ETH_USDC);
      expect(mockCalcUsdAmountFromFiat).not.toHaveBeenCalled();
    });

    it('leaves fiat balance untouched when overrideToUsd is false', () => {
      eligibleAssets = [ETH_USDC];

      const { result } = renderHook(() =>
        useMoneyDepositTokens({ overrideToUsd: false }),
      );

      expect(result.current.tokens).toContainEqual(ETH_USDC);
      expect(mockCalcUsdAmountFromFiat).not.toHaveBeenCalled();
    });

    it('converts fiat balance to usd when overrideToUsd is true', () => {
      eligibleAssets = [ETH_USDC];
      mockCalcUsdAmountFromFiat.mockReturnValue(450);

      const { result } = renderHook(() =>
        useMoneyDepositTokens({ overrideToUsd: true }),
      );

      expect(result.current.tokens[0].fiat).toEqual({
        balance: 450,
        currency: 'usd',
        conversionRate: ETH_USDC.fiat?.conversionRate,
      });
    });

    it('passes token chainId, network configurations, and currency rates to calcUsdAmountFromFiat', () => {
      eligibleAssets = [ETH_USDC];
      mockCalcUsdAmountFromFiat.mockReturnValue(450);

      renderHook(() => useMoneyDepositTokens({ overrideToUsd: true }));

      expect(mockCalcUsdAmountFromFiat).toHaveBeenCalledWith({
        tokenFiatValue: ETH_USDC.fiat?.balance,
        chainId: ETH_USDC.chainId,
        networkConfigurationsByChainId: DEFAULT_NETWORK_CONFIGURATIONS,
        evmMultiChainCurrencyRates: DEFAULT_CURRENCY_RATES,
      });
    });

    it('preserves tokens with no fiat balance without requesting a usd rate', () => {
      const noFiat = makeToken({ symbol: 'NOFIAT', fiat: undefined });
      eligibleAssets = [noFiat];

      const { result } = renderHook(() =>
        useMoneyDepositTokens({ overrideToUsd: true }),
      );

      expect(result.current.tokens).toEqual([noFiat]);
      expect(mockCalcUsdAmountFromFiat).not.toHaveBeenCalled();
    });

    it('drops fiat when calcUsdAmountFromFiat cannot resolve a usd rate', () => {
      eligibleAssets = [ETH_USDC];
      mockCalcUsdAmountFromFiat.mockReturnValue(undefined);

      const { result } = renderHook(() =>
        useMoneyDepositTokens({ overrideToUsd: true }),
      );

      expect(result.current.tokens[0].fiat).toBeUndefined();
    });

    it('converts fiat for every eligible token when overrideToUsd is true', () => {
      eligibleAssets = [ETH_USDC, ETH_USDT];
      mockCalcUsdAmountFromFiat.mockImplementation(
        ({ tokenFiatValue }) => tokenFiatValue * 2,
      );

      const { result } = renderHook(() =>
        useMoneyDepositTokens({ overrideToUsd: true }),
      );

      expect(result.current.tokens.map((token) => token.fiat?.balance)).toEqual(
        [1000, 600],
      );
    });
  });
});
