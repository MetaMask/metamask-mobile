import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { EthAccountType, SolAccountType } from '@metamask/keyring-api';
import { useMoneyEarnableTokens } from './useMoneyEarnableTokens';
import {
  selectMetaMaskPayTokensFlags,
  selectRelayFixedSpread,
} from '../../../../selectors/featureFlagController/confirmations';
import { selectMoneyDepositMinBalance } from '../selectors/featureFlags';
import {
  isTokenBlocked,
  getBlockedTokensForTransactionType,
} from '../../../Views/confirmations/utils/transaction-pay';
import { useAccountTokens } from '../../../Views/confirmations/hooks/send/useAccountTokens';
import { AssetType } from '../../../Views/confirmations/types/token';
import { MUSD_TOKEN_ADDRESS } from '../../Earn/constants/musd';
import type { RelayFixedSpreadConfig } from '../../../Views/confirmations/utils/relayFixedSpread';
import { selectCurrencyRates } from '../../../../selectors/currencyRateController';
import { selectNetworkConfigurations } from '../../../../selectors/networkController';
import { calcUsdAmountFromFiat } from '../../Bridge/utils/exchange-rates';

jest.mock('react-redux');
jest.mock('../../../../selectors/featureFlagController/confirmations');
jest.mock('../selectors/featureFlags');
jest.mock('../../../Views/confirmations/utils/transaction-pay');
jest.mock('../../../Views/confirmations/hooks/send/useAccountTokens');
jest.mock('../../../../selectors/currencyRateController');
jest.mock('../../../../selectors/networkController');
jest.mock('../../Bridge/utils/exchange-rates');

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockIsTokenBlocked = isTokenBlocked as jest.MockedFunction<
  typeof isTokenBlocked
>;
const mockGetBlockedTokensForTransactionType =
  getBlockedTokensForTransactionType as jest.MockedFunction<
    typeof getBlockedTokensForTransactionType
  >;
const mockUseAccountTokens = useAccountTokens as jest.MockedFunction<
  typeof useAccountTokens
>;
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

const DEFAULT_BLOCKED_TOKENS = { chainIds: [], tokens: [] };
const DEFAULT_PAY_FLAGS = {
  preferredTokens: { default: [], overrides: {} },
  blockedTokens: { default: DEFAULT_BLOCKED_TOKENS, overrides: {} },
  minimumRequiredTokenBalance: 0,
};

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
const ETH_DAI = makeToken({
  address: '0x6b175474e89094c44da98b954eedeac495271d0f',
  symbol: 'DAI',
  chainId: '0x1',
  fiat: { balance: 200, currency: 'usd', conversionRate: 1 },
});

describe('useMoneyEarnableTokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectMetaMaskPayTokensFlags) return DEFAULT_PAY_FLAGS;
      if (selector === selectRelayFixedSpread) return EMPTY_RELAY_CONFIG;
      if (selector === selectMoneyDepositMinBalance) return 0.01;
      if (selector === selectCurrencyRates) return DEFAULT_CURRENCY_RATES;
      if (selector === selectNetworkConfigurations)
        return DEFAULT_NETWORK_CONFIGURATIONS;
      return undefined;
    });

    mockUseAccountTokens.mockReturnValue([]);
    mockGetBlockedTokensForTransactionType.mockReturnValue(
      DEFAULT_BLOCKED_TOKENS,
    );
    mockIsTokenBlocked.mockReturnValue(false);
    mockCalcUsdAmountFromFiat.mockReturnValue(undefined);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('return shape', () => {
    it('returns tokens array and isNoFeeToken function', () => {
      const { result } = renderHook(() => useMoneyEarnableTokens());

      expect(Array.isArray(result.current.tokens)).toBe(true);
      expect(typeof result.current.isNoFeeToken).toBe('function');
    });
  });

  describe('tokens — useAccountTokens options', () => {
    it('calls useAccountTokens with includeNoBalance false', () => {
      renderHook(() => useMoneyEarnableTokens());

      expect(mockUseAccountTokens).toHaveBeenCalledWith({
        includeNoBalance: false,
      });
    });
  });

  describe('tokens — blocklist', () => {
    it('scopes blocklist lookup to moneyAccountDeposit transaction type', () => {
      renderHook(() => useMoneyEarnableTokens());

      expect(mockGetBlockedTokensForTransactionType).toHaveBeenCalledWith(
        DEFAULT_PAY_FLAGS.blockedTokens,
        'moneyAccountDeposit',
      );
    });

    it('includes tokens that pass the MM Pay blocklist', () => {
      mockUseAccountTokens.mockReturnValue([ETH_USDC]);

      const { result } = renderHook(() => useMoneyEarnableTokens());

      expect(result.current.tokens).toContainEqual(ETH_USDC);
    });

    it('excludes tokens blocked by MM Pay', () => {
      mockUseAccountTokens.mockReturnValue([ETH_USDC, ETH_USDT]);
      mockIsTokenBlocked.mockImplementation(
        (token: { address: string }) => token.address === ETH_USDC.address,
      );

      const { result } = renderHook(() => useMoneyEarnableTokens());

      expect(result.current.tokens).not.toContainEqual(ETH_USDC);
      expect(result.current.tokens).toContainEqual(ETH_USDT);
    });

    it('returns empty array when all tokens are MM Pay blocked', () => {
      mockUseAccountTokens.mockReturnValue([ETH_USDC]);
      mockIsTokenBlocked.mockReturnValue(true);

      const { result } = renderHook(() => useMoneyEarnableTokens());

      expect(result.current.tokens).toEqual([]);
    });
  });

  describe('tokens — EVM filter', () => {
    it('excludes non-EVM tokens', () => {
      const solanaToken = makeToken({
        address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        symbol: 'USDC',
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        accountType: SolAccountType.DataAccount,
        fiat: { balance: 400, currency: 'usd', conversionRate: 1 },
      });
      mockUseAccountTokens.mockReturnValue([solanaToken, ETH_USDC]);

      const { result } = renderHook(() => useMoneyEarnableTokens());

      expect(result.current.tokens).not.toContainEqual(solanaToken);
      expect(result.current.tokens).toContainEqual(ETH_USDC);
    });

    it('excludes non-EVM tokens without calling isTokenBlocked on them', () => {
      const solanaToken = makeToken({
        address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        symbol: 'USDC',
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        accountType: SolAccountType.DataAccount,
        fiat: { balance: 400, currency: 'usd', conversionRate: 1 },
      });
      mockUseAccountTokens.mockReturnValue([solanaToken]);

      renderHook(() => useMoneyEarnableTokens());

      expect(mockIsTokenBlocked).not.toHaveBeenCalledWith(
        solanaToken,
        expect.anything(),
      );
    });
  });

  describe('tokens — minimum balance filter', () => {
    it('excludes tokens below the minBalance threshold', () => {
      const dustToken = makeToken({
        symbol: 'DUST',
        fiat: { balance: 0.005, currency: 'usd', conversionRate: 1 },
      });
      mockUseAccountTokens.mockReturnValue([dustToken, ETH_USDC]);

      const { result } = renderHook(() => useMoneyEarnableTokens());

      expect(result.current.tokens).not.toContainEqual(dustToken);
      expect(result.current.tokens).toContainEqual(ETH_USDC);
    });

    it('excludes tokens with undefined fiat balance', () => {
      const noFiat = makeToken({ fiat: undefined });
      mockUseAccountTokens.mockReturnValue([noFiat, ETH_USDC]);

      const { result } = renderHook(() => useMoneyEarnableTokens());

      expect(result.current.tokens).not.toContainEqual(noFiat);
    });

    it('excludes tokens with null fiat balance', () => {
      const nullFiat = makeToken({
        fiat: {
          balance: null as unknown as number,
          currency: 'usd',
          conversionRate: 1,
        },
      });
      mockUseAccountTokens.mockReturnValue([nullFiat, ETH_USDC]);

      const { result } = renderHook(() => useMoneyEarnableTokens());

      expect(result.current.tokens).not.toContainEqual(nullFiat);
    });

    it('includes token at exactly the minBalance threshold', () => {
      const atThreshold = makeToken({
        symbol: 'EXACT',
        fiat: { balance: 0.01, currency: 'usd', conversionRate: 1 },
      });
      mockUseAccountTokens.mockReturnValue([atThreshold]);

      const { result } = renderHook(() => useMoneyEarnableTokens());

      expect(result.current.tokens).toContainEqual(atThreshold);
    });

    it('returns empty array when useAccountTokens returns empty list', () => {
      mockUseAccountTokens.mockReturnValue([]);

      const { result } = renderHook(() => useMoneyEarnableTokens());

      expect(result.current.tokens).toEqual([]);
    });
  });

  describe('tokens — fiat balance descending sort', () => {
    it('orders eligible tokens highest-to-lowest fiat balance', () => {
      mockUseAccountTokens.mockReturnValue([ETH_DAI, ETH_USDC, ETH_USDT]);

      const { result } = renderHook(() => useMoneyEarnableTokens());

      expect(result.current.tokens.map((t) => t.symbol)).toEqual([
        'USDC',
        'USDT',
        'DAI',
      ]);
    });
  });

  describe('isNoFeeToken — directional Monad mUSD route match', () => {
    it('returns true for a token with a subsidized route TO Monad mUSD', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectMetaMaskPayTokensFlags) return DEFAULT_PAY_FLAGS;
        if (selector === selectRelayFixedSpread)
          return RELAY_CONFIG_WITH_DEPOSIT_ROUTE;
        if (selector === selectMoneyDepositMinBalance) return 0.01;
        return undefined;
      });
      mockUseAccountTokens.mockReturnValue([ETH_USDC]);

      const { result } = renderHook(() => useMoneyEarnableTokens());

      expect(result.current.isNoFeeToken(ETH_USDC)).toBe(true);
    });

    it('returns true when mUSD is source and destination is Monad mUSD', () => {
      const ethMusd = makeToken({
        address: MUSD_TOKEN_ADDRESS,
        symbol: 'mUSD',
        chainId: '0x1',
        fiat: { balance: 500, currency: 'usd', conversionRate: 1 },
      });
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectMetaMaskPayTokensFlags) return DEFAULT_PAY_FLAGS;
        if (selector === selectRelayFixedSpread)
          return RELAY_CONFIG_WITH_MUSD_SOURCE_DEPOSIT;
        if (selector === selectMoneyDepositMinBalance) return 0.01;
        return undefined;
      });
      mockUseAccountTokens.mockReturnValue([ethMusd]);

      const { result } = renderHook(() => useMoneyEarnableTokens());

      expect(result.current.isNoFeeToken(ethMusd)).toBe(true);
    });

    it('returns true for Monad mUSD even though the flag has no Monad mUSD -> Monad mUSD route', () => {
      const monadMusd = makeToken({
        address: MUSD_TOKEN_ADDRESS,
        symbol: 'mUSD',
        chainId: CHAIN_IDS.MONAD,
        fiat: { balance: 500, currency: 'usd', conversionRate: 1 },
      });
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectMetaMaskPayTokensFlags) return DEFAULT_PAY_FLAGS;
        if (selector === selectRelayFixedSpread)
          return RELAY_CONFIG_WITH_MUSD_WITHDRAW_ROUTE;
        if (selector === selectMoneyDepositMinBalance) return 0.01;
        return undefined;
      });
      mockUseAccountTokens.mockReturnValue([monadMusd]);

      const { result } = renderHook(() => useMoneyEarnableTokens());

      expect(result.current.isNoFeeToken(monadMusd)).toBe(true);
    });

    it('returns false for a subsidized source whose route target is NOT Monad mUSD', () => {
      const lineaUsdc = makeToken({
        address: '0x176211869ca2b568f2a7d4ee941e073a821ee1ff',
        symbol: 'USDC',
        chainId: '0xe708',
        fiat: { balance: 500, currency: 'usd', conversionRate: 1 },
      });
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectMetaMaskPayTokensFlags) return DEFAULT_PAY_FLAGS;
        if (selector === selectRelayFixedSpread)
          return RELAY_CONFIG_WITH_NON_MONAD_DEPOSIT;
        if (selector === selectMoneyDepositMinBalance) return 0.01;
        return undefined;
      });
      mockUseAccountTokens.mockReturnValue([lineaUsdc]);

      const { result } = renderHook(() => useMoneyEarnableTokens());

      expect(result.current.isNoFeeToken(lineaUsdc)).toBe(false);
    });

    it('returns false when the relay config has no routes', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectMetaMaskPayTokensFlags) return DEFAULT_PAY_FLAGS;
        if (selector === selectRelayFixedSpread) return EMPTY_RELAY_CONFIG;
        if (selector === selectMoneyDepositMinBalance) return 0.01;
        return undefined;
      });
      mockUseAccountTokens.mockReturnValue([ETH_USDC]);

      const { result } = renderHook(() => useMoneyEarnableTokens());

      expect(result.current.isNoFeeToken(ETH_USDC)).toBe(false);
    });

    it('returns false for a token with no chainId', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectMetaMaskPayTokensFlags) return DEFAULT_PAY_FLAGS;
        if (selector === selectRelayFixedSpread)
          return RELAY_CONFIG_WITH_DEPOSIT_ROUTE;
        if (selector === selectMoneyDepositMinBalance) return 0.01;
        return undefined;
      });
      mockUseAccountTokens.mockReturnValue([]);
      const noChain = {
        ...ETH_USDC,
        chainId: undefined,
      } as unknown as AssetType;

      const { result } = renderHook(() => useMoneyEarnableTokens());

      expect(result.current.isNoFeeToken(noChain)).toBe(false);
    });

    it('returns false for a token on a different chain with same address', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectMetaMaskPayTokensFlags) return DEFAULT_PAY_FLAGS;
        if (selector === selectRelayFixedSpread)
          return RELAY_CONFIG_WITH_DEPOSIT_ROUTE;
        if (selector === selectMoneyDepositMinBalance) return 0.01;
        return undefined;
      });
      // Same address as ETH_USDC but on Arbitrum — no matching route
      const arbitrumUsdc = makeToken({
        address: ETH_USDC.address,
        chainId: '0xa4b1',
        symbol: 'USDC',
        fiat: { balance: 100, currency: 'usd', conversionRate: 1 },
      });
      mockUseAccountTokens.mockReturnValue([arbitrumUsdc]);

      const { result } = renderHook(() => useMoneyEarnableTokens());

      expect(result.current.isNoFeeToken(arbitrumUsdc)).toBe(false);
    });
  });

  describe('tokens — overrideToUsd', () => {
    it('leaves fiat balance untouched when overrideToUsd is not passed', () => {
      mockUseAccountTokens.mockReturnValue([ETH_USDC]);

      const { result } = renderHook(() => useMoneyEarnableTokens());

      expect(result.current.tokens).toContainEqual(ETH_USDC);
      expect(mockCalcUsdAmountFromFiat).not.toHaveBeenCalled();
    });

    it('leaves fiat balance untouched when overrideToUsd is false', () => {
      mockUseAccountTokens.mockReturnValue([ETH_USDC]);

      const { result } = renderHook(() =>
        useMoneyEarnableTokens({ overrideToUsd: false }),
      );

      expect(result.current.tokens).toContainEqual(ETH_USDC);
      expect(mockCalcUsdAmountFromFiat).not.toHaveBeenCalled();
    });

    it('converts fiat balance to usd when overrideToUsd is true', () => {
      mockUseAccountTokens.mockReturnValue([ETH_USDC]);
      mockCalcUsdAmountFromFiat.mockReturnValue(450);

      const { result } = renderHook(() =>
        useMoneyEarnableTokens({ overrideToUsd: true }),
      );

      expect(result.current.tokens[0].fiat).toEqual({
        balance: 450,
        currency: 'usd',
        conversionRate: ETH_USDC.fiat?.conversionRate,
      });
    });

    it('passes token chainId, network configurations, and currency rates to calcUsdAmountFromFiat', () => {
      mockUseAccountTokens.mockReturnValue([ETH_USDC]);
      mockCalcUsdAmountFromFiat.mockReturnValue(450);

      renderHook(() => useMoneyEarnableTokens({ overrideToUsd: true }));

      expect(mockCalcUsdAmountFromFiat).toHaveBeenCalledWith({
        tokenFiatValue: ETH_USDC.fiat?.balance,
        chainId: ETH_USDC.chainId,
        networkConfigurationsByChainId: DEFAULT_NETWORK_CONFIGURATIONS,
        evmMultiChainCurrencyRates: DEFAULT_CURRENCY_RATES,
      });
    });

    it('excludes tokens with no fiat balance before usd conversion runs', () => {
      const noFiat = makeToken({ symbol: 'NOFIAT', fiat: undefined });
      mockUseAccountTokens.mockReturnValue([noFiat]);

      const { result } = renderHook(() =>
        useMoneyEarnableTokens({ overrideToUsd: true }),
      );

      expect(result.current.tokens).toEqual([]);
      expect(mockCalcUsdAmountFromFiat).not.toHaveBeenCalled();
    });

    it('drops fiat when calcUsdAmountFromFiat cannot resolve a usd rate', () => {
      mockUseAccountTokens.mockReturnValue([ETH_USDC]);
      mockCalcUsdAmountFromFiat.mockReturnValue(undefined);

      const { result } = renderHook(() =>
        useMoneyEarnableTokens({ overrideToUsd: true }),
      );

      expect(result.current.tokens[0].fiat).toBeUndefined();
    });

    it('converts fiat for every eligible token when overrideToUsd is true', () => {
      mockUseAccountTokens.mockReturnValue([ETH_USDC, ETH_USDT]);
      mockCalcUsdAmountFromFiat.mockImplementation(
        ({ tokenFiatValue }) => tokenFiatValue * 2,
      );

      const { result } = renderHook(() =>
        useMoneyEarnableTokens({ overrideToUsd: true }),
      );

      expect(result.current.tokens.map((token) => token.fiat?.balance)).toEqual(
        [1000, 600],
      );
    });
  });
});
