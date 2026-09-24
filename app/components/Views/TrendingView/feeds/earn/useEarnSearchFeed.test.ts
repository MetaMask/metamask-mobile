import { act, renderHook } from '@testing-library/react-native';
import type { Asset } from '@metamask/assets-controllers';
import { EthAccountType } from '@metamask/keyring-api';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import Logger from '../../../../../util/Logger';
import { EARN_EXPERIENCES } from '../../../../UI/Earn/constants/experiences';
import type {
  EarnAsset,
  EarnAssetId,
  EarnAssetMetadata,
  EarnExperience,
} from '../../../../UI/Earn/types/earnAssets';
import useEarnAssetCatalogue from '../../../../UI/Earn/hooks/useEarnAssetCatalogue';
import useMoneyAccountBalance from '../../../../UI/Money/hooks/useMoneyAccountBalance';
import { selectIsMoneyAccountVisible } from '../../../../UI/Money/selectors/visibility';
import { useEarnSearchFeed } from './useEarnSearchFeed';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));
jest.mock('../../../../UI/Earn/hooks/useEarnAssetCatalogue');
jest.mock('../../../../UI/Money/hooks/useMoneyAccountBalance');
jest.mock('../../../../UI/Money/selectors/visibility', () => ({
  selectIsMoneyAccountVisible: jest.fn(),
}));
jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

const mockUseEarnAssetCatalogue = useEarnAssetCatalogue as jest.MockedFunction<
  typeof useEarnAssetCatalogue
>;
const mockUseMoneyAccountBalance =
  useMoneyAccountBalance as jest.MockedFunction<typeof useMoneyAccountBalance>;
const mockUseSelector = jest.mocked(useSelector);
const mockSelectIsMoneyAccountVisible = jest.mocked(
  selectIsMoneyAccountVisible,
);
const mockLoggerError = jest.mocked(Logger.error);

const readyApyExperience = (
  name: string,
  percentage: number,
): EarnExperience => ({
  id: `lending:${name}`,
  type: EARN_EXPERIENCES.STABLECOIN_LENDING,
  role: 'underlying',
  depositReadiness: { status: 'ready' },
  rate: {
    type: 'APY',
    percentage,
    status: 'ready',
  },
  isFeeSubsidized: false,
});

const createAssetAddress = (symbol: string) =>
  `0x${Array.from(symbol)
    .map((character) => character.codePointAt(0)?.toString(16) ?? '0')
    .join('')
    .padEnd(40, '0')
    .slice(0, 40)}`;

const createAssetControllerAsset = ({
  symbol,
  balance,
  rawBalance,
}: {
  symbol: string;
  balance: string;
  rawBalance: `0x${string}`;
}): Asset => {
  const address = createAssetAddress(symbol);

  return {
    accountType: EthAccountType.Eoa,
    accountId: 'account-id',
    assetId: address,
    address,
    chainId: '0x1',
    decimals: 6,
    image: `${symbol}.png`,
    name: symbol,
    symbol,
    balance,
    rawBalance,
    fiat: {
      balance: Number(balance),
      currency: 'USD',
      conversionRate: 1,
    },
    isNative: false,
  } as Asset;
};

const createDiscoverySearchAsset = (
  name: string,
  overrides: Partial<EarnAssetMetadata> = {},
): EarnAsset => {
  const address = createAssetAddress(name);

  return {
    assetId: `eip155:1/erc20:${address.toLowerCase()}` as EarnAssetId,
    metadata: {
      address,
      chainId: '0x1',
      decimals: 6,
      image: `${name}.png`,
      name,
      symbol: name,
      logo: `${name}.png`,
      isETH: false,
      ...overrides,
    },
    wallet: { status: 'untracked' },
    experiences: [
      {
        ...readyApyExperience(name, 4),
        depositReadiness: {
          status: 'not_ready',
          reason: 'asset_not_tracked',
        },
      },
    ],
  };
};

const createHeldSearchAsset = (symbol: string, balance: string): EarnAsset => {
  const address = createAssetAddress(symbol);

  return {
    assetId: `eip155:1/erc20:${address.toLowerCase()}` as EarnAssetId,
    metadata: {
      address,
      chainId: '0x1',
      decimals: 6,
      image: `${symbol}.png`,
      name: symbol,
      symbol,
      logo: `${symbol}.png`,
      isETH: false,
    },
    wallet: {
      status: 'tracked',
      asset: createAssetControllerAsset({
        symbol,
        balance,
        rawBalance: '0x1',
      }),
    },
    experiences: [readyApyExperience(symbol, 4)],
  };
};

const heldUsdc = createHeldSearchAsset('USDC', '25');
const discoveryUsdt = createDiscoverySearchAsset('USDT');
const discoveryDai = createDiscoverySearchAsset('DAI');

const mockMoneyVisible = (isMoneyAccountVisible: boolean) => {
  mockSelectIsMoneyAccountVisible.mockReturnValue(isMoneyAccountVisible);
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectIsMoneyAccountVisible) {
      return mockSelectIsMoneyAccountVisible({} as never);
    }

    return undefined;
  });
};

const mockMoneyBalance = ({
  totalFiatRaw = '10',
  totalFiatFormatted = '$10.00',
  isBalanceLoading = false,
}: {
  totalFiatRaw?: string;
  totalFiatFormatted?: string;
  isBalanceLoading?: boolean;
} = {}) => {
  const balance: ReturnType<typeof useMoneyAccountBalance> = {
    moneyBalanceQuery: {
      data: undefined,
      error: null,
      fetchStatus: 'idle',
      isError: false,
      isFetching: false,
      isLoading: false,
      status: 'pending',
    } as ReturnType<typeof useMoneyAccountBalance>['moneyBalanceQuery'],
    isBalanceLoading,
    isBalanceFetchError: false,
    isBalanceUnavailable: false,
    isBalanceDegraded: false,
    balanceSource: 'api',
    usedFallback: false,
    lastKnownTotalFiatFormatted: totalFiatFormatted,
    refetchBalance: jest.fn().mockResolvedValue(undefined),
    tokenTotal: undefined,
    totalFiatFormatted,
    totalFiatRaw,
    withdrawableFiatFormatted: undefined,
    withdrawableFiatRaw: undefined,
    withdrawableMusd: undefined,
  };

  mockUseMoneyAccountBalance.mockReturnValue(balance);
};

const mockCatalogue = ({
  assets = [],
  isLoading = false,
  errors = [],
  refresh = jest.fn().mockResolvedValue(undefined),
  moneyApyDecimal = 0.062,
  moneyApyPercent = 6.2,
  moneyRateStatus = 'ready',
}: {
  assets?: EarnAsset[];
  isLoading?: boolean;
  errors?: Error[];
  refresh?: () => Promise<void>;
  moneyApyDecimal?: number;
  moneyApyPercent?: number;
  moneyRateStatus?: 'loading' | 'ready' | 'error' | 'unavailable';
} = {}) => {
  mockUseEarnAssetCatalogue.mockReturnValue({
    assets,
    isLoading,
    hasError: errors.length > 0,
    errors,
    refresh,
    moneyApyDecimal,
    moneyApyPercent,
    moneyRateStatus,
  });
};

describe('useEarnSearchFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMoneyVisible(false);
    mockMoneyBalance();
    mockCatalogue();
  });

  it('enables catalogue and Money balance loading when Earn search is enabled', () => {
    mockMoneyVisible(true);

    renderHook(() => useEarnSearchFeed({ query: '', enabled: true }));

    expect(mockUseEarnAssetCatalogue).toHaveBeenCalledWith({ enabled: true });
    expect(mockUseMoneyAccountBalance).toHaveBeenCalledWith({ enabled: true });
  });

  it('disables catalogue and Money balance loading when Earn search is disabled', () => {
    mockMoneyVisible(true);

    renderHook(() => useEarnSearchFeed({ query: '', enabled: false }));

    expect(mockUseEarnAssetCatalogue).toHaveBeenCalledWith({ enabled: false });
    expect(mockUseMoneyAccountBalance).toHaveBeenCalledWith({ enabled: false });
  });

  it('returns an inactive state when Earn search is disabled', () => {
    mockMoneyVisible(true);
    mockCatalogue({
      assets: [discoveryUsdt],
      isLoading: true,
      errors: [new Error('catalogue unavailable')],
    });

    const { result } = renderHook(() =>
      useEarnSearchFeed({ query: '', enabled: false }),
    );

    expect(result.current.data).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeUndefined();
  });

  it('pins visible Money before all ranked assets', () => {
    mockMoneyVisible(true);
    mockCatalogue({ assets: [discoveryUsdt, heldUsdc, discoveryDai] });

    const { result } = renderHook(() => useEarnSearchFeed({ query: '' }));

    expect(result.current.data.map((item) => item.id)).toEqual([
      'money-account',
      heldUsdc.assetId,
      discoveryUsdt.assetId,
      discoveryDai.assetId,
    ]);
  });

  it('keeps Money for a non-matching query and filters assets by name, ticker, or symbol', () => {
    mockMoneyVisible(true);
    const usdCoin = createDiscoverySearchAsset('USD Coin', {
      symbol: 'USDC',
      ticker: 'USDC',
    });
    const dai = createDiscoverySearchAsset('Dai Stablecoin', {
      symbol: 'DAI',
      ticker: 'DAI',
    });
    const tether = createDiscoverySearchAsset('Tether Token', {
      symbol: 'USDT',
      ticker: 'USDT',
    });
    mockCatalogue({
      assets: [usdCoin, dai, tether],
    });

    const { result, rerender } = renderHook(
      ({ query }: { query: string }) => useEarnSearchFeed({ query }),
      { initialProps: { query: 'usdc' } },
    );

    expect(result.current.data.map((item) => item.id)).toEqual([
      'money-account',
      usdCoin.assetId,
    ]);

    rerender({ query: 'stablecoin' });
    expect(result.current.data.map((item) => item.id)).toEqual([
      'money-account',
      dai.assetId,
    ]);

    rerender({ query: 'usdt' });
    expect(result.current.data.map((item) => item.id)).toEqual([
      'money-account',
      tether.assetId,
    ]);

    rerender({ query: 'no-match' });
    expect(result.current.data.map((item) => item.id)).toEqual([
      'money-account',
    ]);
  });

  it('Query uses word boundary matching for name', () => {
    const ethereum = createDiscoverySearchAsset('Ethereum', {
      symbol: 'ETH',
      ticker: 'ETH',
    });
    const tether = createDiscoverySearchAsset('Tether USD', {
      symbol: 'USDT',
      ticker: 'USDT',
    });
    mockCatalogue({ assets: [ethereum, tether] });

    const { result } = renderHook(() => useEarnSearchFeed({ query: 'ETH' }));

    // Excludes Tether when searching for ETH
    expect(result.current.data.map((item) => item.id)).toEqual([
      ethereum.assetId,
    ]);
  });

  it('omits Money when the account is hidden', () => {
    mockCatalogue({ assets: [discoveryUsdt] });

    const { result } = renderHook(() => useEarnSearchFeed({ query: '' }));

    expect(result.current.data.map((item) => item.id)).toEqual([
      discoveryUsdt.assetId,
    ]);
  });

  it('keeps usable data visible while catalogue or balance fields load', () => {
    mockMoneyVisible(true);
    mockMoneyBalance({ isBalanceLoading: true });
    mockCatalogue({
      assets: [discoveryUsdt],
      isLoading: true,
      moneyRateStatus: 'loading',
    });

    const { result } = renderHook(() => useEarnSearchFeed({ query: '' }));

    expect(result.current.data.map((item) => item.id)).toEqual([
      'money-account',
      discoveryUsdt.assetId,
    ]);
    expect(result.current.data[0]).toEqual({
      kind: 'money-account',
      id: 'money-account',
      balanceRaw: '10',
      balanceFiat: '$10.00',
      isBalanceLoading: true,
      apyPercent: 6.2,
      rateStatus: 'loading',
    });
    expect(result.current.isLoading).toBe(false);
  });

  it('exposes Money balance and rate fields in the visible search item', () => {
    mockMoneyVisible(true);
    mockMoneyBalance({
      totalFiatRaw: '25',
      totalFiatFormatted: '$25.00',
    });
    mockCatalogue({
      moneyApyPercent: 6.35,
      moneyRateStatus: 'ready',
    });

    const { result } = renderHook(() => useEarnSearchFeed({ query: '' }));

    expect(result.current.data[0]).toEqual({
      kind: 'money-account',
      id: 'money-account',
      balanceRaw: '25',
      balanceFiat: '$25.00',
      isBalanceLoading: false,
      apyPercent: 6.35,
      rateStatus: 'ready',
    });
  });

  it('reports loading when no usable data exists', () => {
    mockCatalogue({ isLoading: true });

    const { result } = renderHook(() => useEarnSearchFeed({ query: '' }));

    expect(result.current.data).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it('exposes catalogue errors with existing Earn warning copy', () => {
    const catalogueError = new Error('catalogue unavailable');
    mockCatalogue({ errors: [catalogueError] });

    const { result } = renderHook(() => useEarnSearchFeed({ query: '' }));

    expect(result.current.error?.message).toBe(
      strings('earn_module.assets_unavailable'),
    );
    expect(result.current.data).toEqual([]);
  });

  it('awaits refresh and exposes retrying state', async () => {
    let resolveRefresh: (() => void) | undefined;
    const refresh = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRefresh = resolve;
        }),
    );
    mockCatalogue({ errors: [new Error('catalogue unavailable')], refresh });

    const { result } = renderHook(() => useEarnSearchFeed({ query: '' }));

    let retryPromise = Promise.resolve();
    await act(async () => {
      retryPromise = result.current.error?.retry() ?? Promise.resolve();
    });

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(result.current.error?.isRetrying).toBe(true);

    await act(async () => {
      resolveRefresh?.();
      await retryPromise;
    });

    expect(result.current.error?.isRetrying).toBe(false);
  });

  it('suppresses duplicate retries while refresh is in flight', async () => {
    let resolveRefresh: (() => void) | undefined;
    const refresh = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRefresh = resolve;
        }),
    );
    mockCatalogue({ errors: [new Error('catalogue unavailable')], refresh });

    const { result } = renderHook(() => useEarnSearchFeed({ query: '' }));

    let firstRetry = Promise.resolve();
    let secondRetry = Promise.resolve();
    await act(async () => {
      firstRetry = result.current.error?.retry() ?? Promise.resolve();
      secondRetry = result.current.error?.retry() ?? Promise.resolve();
    });

    expect(refresh).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveRefresh?.();
      await Promise.all([firstRetry, secondRetry]);
    });
  });

  it('logs and rethrows refresh errors while preserving catalogue error state', async () => {
    const refreshError = new Error('refresh unavailable');
    const refresh = jest.fn().mockRejectedValue(refreshError);
    mockCatalogue({ errors: [new Error('catalogue unavailable')], refresh });

    const { result } = renderHook(() => useEarnSearchFeed({ query: '' }));
    let retryPromise = Promise.resolve();
    await act(async () => {
      retryPromise = result.current.error?.retry() ?? Promise.resolve();
      await retryPromise.catch(() => undefined);
    });

    await expect(retryPromise).rejects.toThrow('refresh unavailable');
    expect(mockLoggerError).toHaveBeenCalledWith(
      refreshError,
      'EarnSearch: Failed to refresh Earn data',
    );
    expect(result.current.error?.message).toBe(
      strings('earn_module.assets_unavailable'),
    );
  });
});
