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
  rate: {
    type: 'APY',
    percentage,
    status: 'ready',
  },
  isFeeSubsidized: false,
});

const createAssetControllerAsset = ({
  symbol,
  balance,
  rawBalance,
}: {
  symbol: string;
  balance: string;
  rawBalance: `0x${string}`;
}): Asset =>
  ({
    accountType: EthAccountType.Eoa,
    accountId: 'account-id',
    assetId: `0x${symbol.toLowerCase().padEnd(40, '0')}`,
    address: `0x${symbol.toLowerCase().padEnd(40, '0')}`,
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
  }) as Asset;

const createDiscoverySearchAsset = (
  name: string,
  overrides: Partial<EarnAssetMetadata> = {},
): EarnAsset => ({
  kind: 'discovery',
  assetId: `eip155:1/erc20:${name.toLowerCase()}` as EarnAssetId,
  metadata: {
    address: `0x${name.toLowerCase()}`,
    chainId: '0x1',
    decimals: 6,
    image: `${name}.png`,
    name,
    symbol: name,
    logo: `${name}.png`,
    isETH: false,
    ...overrides,
  },
  experiences: [readyApyExperience(name, 4)],
});

const createHeldSearchAsset = (symbol: string, balance: string): EarnAsset => ({
  kind: 'held',
  assetId: `eip155:1/erc20:${symbol.toLowerCase()}` as EarnAssetId,
  asset: createAssetControllerAsset({
    symbol,
    balance,
    rawBalance: '0x1',
  }),
  experiences: [readyApyExperience(symbol, 4)],
});

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
  mockUseMoneyAccountBalance.mockReturnValue({
    totalFiatRaw,
    totalFiatFormatted,
    isBalanceLoading,
  } as ReturnType<typeof useMoneyAccountBalance>);
};

const mockCatalogue = ({
  assets = [],
  isLoading = false,
  errors = [],
  refresh = jest.fn().mockResolvedValue(undefined),
  moneyApyPercent = 6.2,
  moneyRateStatus = 'ready',
}: {
  assets?: EarnAsset[];
  isLoading?: boolean;
  errors?: Error[];
  refresh?: () => Promise<void>;
  moneyApyPercent?: number;
  moneyRateStatus?: 'loading' | 'ready' | 'error' | 'unavailable';
} = {}) => {
  mockUseEarnAssetCatalogue.mockReturnValue({
    assets,
    assetsById: {},
    isLoading,
    hasError: errors.length > 0,
    errors,
    refresh,
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

  it('pins visible Money before all ranked assets', () => {
    mockMoneyVisible(true);
    mockCatalogue({ assets: [discoveryUsdt, heldUsdc, discoveryDai] });

    const { result } = renderHook(() => useEarnSearchFeed({ query: '' }));

    expect(result.current.data.map((item) => item.id)).toEqual([
      'money-account',
      heldUsdc.assetId,
      discoveryDai.assetId,
      discoveryUsdt.assetId,
    ]);
  });

  it('keeps Money for a non-matching query and filters assets by name, ticker, or symbol', () => {
    mockMoneyVisible(true);
    mockCatalogue({
      assets: [
        createDiscoverySearchAsset('USD Coin', {
          symbol: 'USDC',
          ticker: 'USDC',
        }),
        createDiscoverySearchAsset('Dai Stablecoin', {
          symbol: 'DAI',
          ticker: 'DAI',
        }),
        createDiscoverySearchAsset('Tether Token', {
          symbol: 'USDT',
          ticker: 'USDT',
        }),
      ],
    });

    const { result, rerender } = renderHook(
      ({ query }: { query: string }) => useEarnSearchFeed({ query }),
      { initialProps: { query: 'usdc' } },
    );

    expect(result.current.data.map((item) => item.id)).toEqual([
      'money-account',
      expect.stringContaining('usd coin'),
    ]);

    rerender({ query: 'stablecoin' });
    expect(result.current.data.map((item) => item.id)).toEqual([
      'money-account',
      expect.stringContaining('dai stablecoin'),
    ]);

    rerender({ query: 'usdt' });
    expect(result.current.data.map((item) => item.id)).toEqual([
      'money-account',
      expect.stringContaining('tether token'),
    ]);

    rerender({ query: 'no-match' });
    expect(result.current.data.map((item) => item.id)).toEqual([
      'money-account',
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
    expect(result.current.isLoading).toBe(false);
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
    act(() => {
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
    act(() => {
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
