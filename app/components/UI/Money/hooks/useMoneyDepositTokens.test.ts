import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useMoneyDepositTokens } from './useMoneyDepositTokens';
import {
  selectMoneyDepositTokensBlocklist,
  selectMoneyNoFeeTokens,
  selectMoneyTokensSortMode,
  selectMoneyDepositMinBalance,
} from '../selectors/featureFlags';
import { isTokenInWildcardList } from '../../Earn/utils/wildcardTokenList';
import { isTokenBlocked } from '../../../Views/confirmations/utils/transaction-pay';
import { useAccountTokens } from '../../../Views/confirmations/hooks/send/useAccountTokens';
import { useTransactionPayBlockedTokens } from '../../../Views/confirmations/hooks/pay/useTransactionPayBlockedTokens';
import { AssetType } from '../../../Views/confirmations/types/token';
import { EthAccountType, SolAccountType } from '@metamask/keyring-api';

jest.mock('react-redux');
jest.mock('../selectors/featureFlags');
jest.mock('../../Earn/utils/wildcardTokenList');
jest.mock('../../../Views/confirmations/utils/transaction-pay');
jest.mock('../../../Views/confirmations/hooks/send/useAccountTokens');
jest.mock(
  '../../../Views/confirmations/hooks/pay/useTransactionPayBlockedTokens',
);

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockIsTokenInWildcardList = isTokenInWildcardList as jest.MockedFunction<
  typeof isTokenInWildcardList
>;
const mockIsTokenBlocked = isTokenBlocked as jest.MockedFunction<
  typeof isTokenBlocked
>;
const mockUseAccountTokens = useAccountTokens as jest.MockedFunction<
  typeof useAccountTokens
>;
const mockUseTransactionPayBlockedTokens =
  useTransactionPayBlockedTokens as jest.MockedFunction<
    typeof useTransactionPayBlockedTokens
  >;

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

const USDC = makeToken({
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  symbol: 'USDC',
  fiat: { balance: 500, currency: 'usd', conversionRate: 1 },
});
const USDT = makeToken({
  address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
  symbol: 'USDT',
  fiat: { balance: 300, currency: 'usd', conversionRate: 1 },
});
const DAI = makeToken({
  address: '0x6b175474e89094c44da98b954eedeac495271d0f',
  symbol: 'DAI',
  fiat: { balance: 200, currency: 'usd', conversionRate: 1 },
});
const LINEA_USDC = makeToken({
  address: '0x176211869ca2b568f2a7d4ee941e073a821ee1ff',
  symbol: 'USDC',
  chainId: '0xe708',
  fiat: { balance: 150, currency: 'usd', conversionRate: 1 },
});

const DEFAULT_BLOCKED_TOKENS = { chainIds: [], tokens: [] };

describe('useMoneyDepositTokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectMoneyDepositTokensBlocklist) return {};
      if (selector === selectMoneyNoFeeTokens) return {};
      if (selector === selectMoneyTokensSortMode) return 'fiatBalanceDesc';
      if (selector === selectMoneyDepositMinBalance) return 0.01;
      return undefined;
    });

    mockUseAccountTokens.mockReturnValue([]);
    mockUseTransactionPayBlockedTokens.mockReturnValue(DEFAULT_BLOCKED_TOKENS);
    mockIsTokenBlocked.mockReturnValue(false);
    mockIsTokenInWildcardList.mockReturnValue(false);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('return shape', () => {
    it('returns tokens, isEligibleToken, isNoFeeToken, and filterAllowedTokens', () => {
      const { result } = renderHook(() => useMoneyDepositTokens());

      expect(Array.isArray(result.current.tokens)).toBe(true);
      expect(typeof result.current.isEligibleToken).toBe('function');
      expect(typeof result.current.isNoFeeToken).toBe('function');
      expect(typeof result.current.filterAllowedTokens).toBe('function');
    });
  });

  describe('tokens — filtering pipeline', () => {
    it('includes tokens that pass all filters', () => {
      mockUseAccountTokens.mockReturnValue([USDC]);

      const { result } = renderHook(() => useMoneyDepositTokens());

      expect(result.current.tokens).toContainEqual(USDC);
    });

    it('excludes tokens blocked by MM Pay', () => {
      mockUseAccountTokens.mockReturnValue([USDC, USDT]);
      mockIsTokenBlocked.mockImplementation(
        (token: { address: string }) => token.address === USDC.address,
      );

      const { result } = renderHook(() => useMoneyDepositTokens());

      expect(result.current.tokens).not.toContainEqual(USDC);
      expect(result.current.tokens).toContainEqual(USDT);
    });

    it('excludes non-EVM tokens', () => {
      const solanaToken = makeToken({
        address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        symbol: 'USDC',
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        accountType: SolAccountType.DataAccount,
        fiat: { balance: 400, currency: 'usd', conversionRate: 1 },
      });
      mockUseAccountTokens.mockReturnValue([solanaToken, USDC]);

      const { result } = renderHook(() => useMoneyDepositTokens());

      expect(result.current.tokens).not.toContainEqual(solanaToken);
      expect(result.current.tokens).toContainEqual(USDC);
    });

    it('excludes non-EVM tokens before the MM Pay blocklist check', () => {
      const solanaToken = makeToken({
        address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        symbol: 'USDC',
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        accountType: SolAccountType.DataAccount,
        fiat: { balance: 400, currency: 'usd', conversionRate: 1 },
      });
      mockUseAccountTokens.mockReturnValue([solanaToken]);

      renderHook(() => useMoneyDepositTokens());

      expect(mockIsTokenBlocked).not.toHaveBeenCalledWith(
        solanaToken,
        expect.anything(),
      );
    });

    it('excludes tokens on the Money blocklist', () => {
      mockUseAccountTokens.mockReturnValue([USDC, USDT]);
      mockIsTokenInWildcardList.mockImplementation(
        (symbol: string) => symbol === 'USDC',
      );

      const { result } = renderHook(() => useMoneyDepositTokens());

      expect(result.current.tokens).not.toContainEqual(USDC);
      expect(result.current.tokens).toContainEqual(USDT);
    });

    it('excludes tokens below minBalance threshold (dust)', () => {
      const dustToken = makeToken({
        symbol: 'DUST',
        fiat: { balance: 0.005, currency: 'usd', conversionRate: 1 },
      });
      mockUseAccountTokens.mockReturnValue([dustToken, USDC]);

      const { result } = renderHook(() => useMoneyDepositTokens());

      expect(result.current.tokens).not.toContainEqual(dustToken);
      expect(result.current.tokens).toContainEqual(USDC);
    });

    it('excludes tokens with undefined fiat balance', () => {
      const noFiat = makeToken({ fiat: undefined });
      mockUseAccountTokens.mockReturnValue([noFiat, USDC]);

      const { result } = renderHook(() => useMoneyDepositTokens());

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
      mockUseAccountTokens.mockReturnValue([nullFiat, USDC]);

      const { result } = renderHook(() => useMoneyDepositTokens());

      expect(result.current.tokens).not.toContainEqual(nullFiat);
    });

    it('returns empty array when all tokens are filtered out', () => {
      mockUseAccountTokens.mockReturnValue([USDC]);
      mockIsTokenBlocked.mockReturnValue(true);

      const { result } = renderHook(() => useMoneyDepositTokens());

      expect(result.current.tokens).toEqual([]);
    });

    it('returns empty array when useAccountTokens returns empty list', () => {
      mockUseAccountTokens.mockReturnValue([]);

      const { result } = renderHook(() => useMoneyDepositTokens());

      expect(result.current.tokens).toEqual([]);
    });

    it('calls useAccountTokens with includeNoBalance false', () => {
      renderHook(() => useMoneyDepositTokens());

      expect(mockUseAccountTokens).toHaveBeenCalledWith({
        includeNoBalance: false,
      });
    });
  });

  describe('tokens — fiatBalanceDesc sort', () => {
    it('orders eligible tokens highest-to-lowest fiat balance', () => {
      mockUseAccountTokens.mockReturnValue([DAI, USDC, USDT]);

      const { result } = renderHook(() => useMoneyDepositTokens());

      expect(result.current.tokens.map((t) => t.symbol)).toEqual([
        'USDC',
        'USDT',
        'DAI',
      ]);
    });

    it('applies fiatBalanceDesc when sortModeOverride is fiatBalanceDesc', () => {
      mockUseAccountTokens.mockReturnValue([DAI, USDC]);

      const { result } = renderHook(() =>
        useMoneyDepositTokens({ sortModeOverride: 'fiatBalanceDesc' }),
      );

      expect(result.current.tokens[0].symbol).toBe('USDC');
      expect(result.current.tokens[1].symbol).toBe('DAI');
    });
  });

  describe('tokens — noFeePriority sort', () => {
    beforeEach(() => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectMoneyDepositTokensBlocklist) return {};
        if (selector === selectMoneyNoFeeTokens) return { '*': ['USDC'] };
        if (selector === selectMoneyTokensSortMode) return 'noFeePriority';
        if (selector === selectMoneyDepositMinBalance) return 0.01;
        return undefined;
      });
    });

    it('renders no-fee bucket before fee bucket', () => {
      mockUseAccountTokens.mockReturnValue([USDT, USDC, DAI]);
      mockIsTokenInWildcardList.mockImplementation((_symbol, list) =>
        Boolean(list && Object.keys(list).length > 0 && _symbol === 'USDC'),
      );

      const { result } = renderHook(() => useMoneyDepositTokens());

      const symbols = result.current.tokens.map((t) => t.symbol);
      expect(symbols.indexOf('USDC')).toBeLessThan(symbols.indexOf('USDT'));
      expect(symbols.indexOf('USDC')).toBeLessThan(symbols.indexOf('DAI'));
    });

    it('sorts each bucket by fiat balance descending', () => {
      mockUseAccountTokens.mockReturnValue([DAI, USDC, LINEA_USDC, USDT]);
      // USDC and LINEA_USDC are no-fee; USDT and DAI are fee tokens
      mockIsTokenInWildcardList.mockImplementation((symbol, list) =>
        Boolean(list && Object.keys(list).length > 0 && symbol === 'USDC'),
      );

      const { result } = renderHook(() => useMoneyDepositTokens());

      const symbols = result.current.tokens.map((t) => t.symbol);
      // No-fee bucket: USDC (500) before LINEA_USDC (150)
      const usdcIdx = symbols.indexOf('USDC');
      const lineaUsdcIdx = symbols.lastIndexOf('USDC');
      expect(result.current.tokens[usdcIdx].fiat?.balance).toBeGreaterThan(
        result.current.tokens[lineaUsdcIdx].fiat?.balance ?? 0,
      );
      // Fee bucket: USDT (300) before DAI (200)
      expect(symbols.indexOf('USDT')).toBeLessThan(symbols.indexOf('DAI'));
    });

    it('sortModeOverride takes precedence over remote selector', () => {
      // Remote selector returns noFeePriority, but override forces fiatBalanceDesc
      mockUseAccountTokens.mockReturnValue([DAI, USDC, USDT]);
      mockIsTokenInWildcardList.mockReturnValue(false);

      const { result } = renderHook(() =>
        useMoneyDepositTokens({ sortModeOverride: 'fiatBalanceDesc' }),
      );

      // All tokens sorted by fiat desc regardless of no-fee status
      expect(result.current.tokens.map((t) => t.symbol)).toEqual([
        'USDC',
        'USDT',
        'DAI',
      ]);
    });
  });

  describe('isEligibleToken', () => {
    it('returns true for a token matching address and chainId in the eligible list', () => {
      mockUseAccountTokens.mockReturnValue([USDC]);

      const { result } = renderHook(() => useMoneyDepositTokens());

      expect(result.current.isEligibleToken(USDC)).toBe(true);
    });

    it('returns false for a token with matching address but wrong chainId', () => {
      mockUseAccountTokens.mockReturnValue([USDC]);

      const { result } = renderHook(() => useMoneyDepositTokens());

      const wrongChain = makeToken({
        address: USDC.address,
        chainId: '0x89',
        symbol: 'USDC',
        fiat: { balance: 500, currency: 'usd', conversionRate: 1 },
      });

      expect(result.current.isEligibleToken(wrongChain)).toBe(false);
    });

    it('returns false when token is undefined', () => {
      mockUseAccountTokens.mockReturnValue([USDC]);

      const { result } = renderHook(() => useMoneyDepositTokens());

      expect(result.current.isEligibleToken(undefined)).toBe(false);
    });

    it('returns false when token has no chainId', () => {
      mockUseAccountTokens.mockReturnValue([USDC]);

      const { result } = renderHook(() => useMoneyDepositTokens());

      const noChain = { ...USDC, chainId: undefined } as unknown as AssetType;

      expect(result.current.isEligibleToken(noChain)).toBe(false);
    });

    it('performs case-insensitive address comparison', () => {
      mockUseAccountTokens.mockReturnValue([USDC]);

      const { result } = renderHook(() => useMoneyDepositTokens());

      const upperCaseAddress = makeToken({
        address: USDC.address.toUpperCase() as `0x${string}`,
        chainId: USDC.chainId,
        symbol: 'USDC',
        fiat: { balance: 500, currency: 'usd', conversionRate: 1 },
      });

      expect(result.current.isEligibleToken(upperCaseAddress)).toBe(true);
    });
  });

  describe('isNoFeeToken', () => {
    it('returns true for a token in the no-fee wildcard list', () => {
      mockIsTokenInWildcardList.mockReturnValue(true);
      mockUseAccountTokens.mockReturnValue([USDC]);

      const { result } = renderHook(() => useMoneyDepositTokens());

      expect(result.current.isNoFeeToken(USDC)).toBe(true);
    });

    it('returns false for a token not in the no-fee list', () => {
      mockIsTokenInWildcardList.mockReturnValue(false);
      mockUseAccountTokens.mockReturnValue([USDT]);

      const { result } = renderHook(() => useMoneyDepositTokens());

      expect(result.current.isNoFeeToken(USDT)).toBe(false);
    });
  });

  describe('filterAllowedTokens', () => {
    it('filters an external token list through MM Pay block, Money blocklist, and min balance', () => {
      mockUseAccountTokens.mockReturnValue([]);
      mockIsTokenBlocked.mockImplementation(
        (token: { address: string }) => token.address === USDC.address,
      );

      const { result } = renderHook(() => useMoneyDepositTokens());

      const filtered = result.current.filterAllowedTokens([USDC, USDT, DAI]);

      expect(filtered).not.toContainEqual(USDC);
      expect(filtered).toContainEqual(USDT);
      expect(filtered).toContainEqual(DAI);
    });

    it('returns empty array when given empty array', () => {
      const { result } = renderHook(() => useMoneyDepositTokens());

      expect(result.current.filterAllowedTokens([])).toEqual([]);
    });

    it('excludes dust tokens from external list via min balance filter', () => {
      const dustToken = makeToken({
        symbol: 'DUST',
        fiat: { balance: 0.005, currency: 'usd', conversionRate: 1 },
      });
      mockUseAccountTokens.mockReturnValue([]);

      const { result } = renderHook(() => useMoneyDepositTokens());

      const filtered = result.current.filterAllowedTokens([dustToken, USDC]);

      expect(filtered).not.toContainEqual(dustToken);
      expect(filtered).toContainEqual(USDC);
    });

    it('maintains referential equality across re-renders when deps unchanged', () => {
      const stableBlocklist = {};
      const stableNoFeeList = {};
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectMoneyDepositTokensBlocklist)
          return stableBlocklist;
        if (selector === selectMoneyNoFeeTokens) return stableNoFeeList;
        if (selector === selectMoneyTokensSortMode) return 'fiatBalanceDesc';
        if (selector === selectMoneyDepositMinBalance) return 0.01;
        return undefined;
      });
      mockUseAccountTokens.mockReturnValue([USDC]);

      const { result, rerender } = renderHook(() => useMoneyDepositTokens());
      const first = result.current.filterAllowedTokens;

      rerender();

      expect(result.current.filterAllowedTokens).toBe(first);
    });
  });
});
