import { renderHook, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { handleFetch } from '@metamask/controller-utils';
import { usePopularTokens } from './usePopularTokens';
import { selectCurrentCurrency } from '../../../../../../selectors/currencyRateController';
import { selectMoneyHubEnabledFlag } from '../../../../../UI/Money/selectors/featureFlags';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('@metamask/controller-utils', () => ({
  handleFetch: jest.fn(),
}));

// Mock the selector to avoid deep import chain issues
jest.mock('../../../../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: jest.fn(),
}));

// Mock musd constants to avoid deep import chain issues
jest.mock('../../../../../UI/Earn/constants/musd', () => ({
  MUSD_TOKEN_ADDRESS: '0xaca92e438df0b2401ff60da7e4337b687a2435da',
  isMusdToken: (address?: string) =>
    address?.toLowerCase() === '0xaca92e438df0b2401ff60da7e4337b687a2435da',
}));

jest.mock('../../../../../UI/Money/selectors/featureFlags', () => ({
  selectMoneyHubEnabledFlag: jest.fn(),
}));

const mockUseSelector = useSelector as unknown as jest.Mock;
const mockHandleFetch = handleFetch as jest.MockedFunction<typeof handleFetch>;

const arrangeSelectors = ({
  isMoneyHubEnabled = false,
}: { isMoneyHubEnabled?: boolean } = {}) => {
  mockUseSelector.mockImplementation((selector: unknown) => {
    if (selector === selectCurrentCurrency) {
      return 'usd';
    }
    if (selector === selectMoneyHubEnabledFlag) {
      return isMoneyHubEnabled;
    }
    return undefined;
  });
};

describe('usePopularTokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    arrangeSelectors();
  });

  it('returns isInitialLoading true on first fetch', () => {
    // Create a promise that never resolves to test the loading state
    mockHandleFetch.mockReturnValue(
      // eslint-disable-next-line no-empty-function
      new Promise(() => {}),
    );

    const { result } = renderHook(() => usePopularTokens());

    expect(result.current.isInitialLoading).toBe(true);
    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.tokens).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('fetches prices and returns tokens with price data', async () => {
    const mockPrices = {
      'eip155:1/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da': {
        price: 1.0,
        pricePercentChange1d: 0.05,
      },
      'eip155:1/slip44:60': {
        price: 3000.0,
        pricePercentChange1d: 2.5,
      },
    };

    mockHandleFetch.mockResolvedValue(mockPrices);

    const { result } = renderHook(() => usePopularTokens());

    await waitFor(() => {
      expect(result.current.isInitialLoading).toBe(false);
    });

    expect(result.current.tokens).toHaveLength(5);
    expect(result.current.tokens[0].name).toBe('MetaMask USD');
    expect(result.current.tokens[0].price).toBe(1.0);
    expect(result.current.tokens[0].priceChange1d).toBe(0.05);
    expect(result.current.tokens[1].name).toBe('Ethereum');
    expect(result.current.tokens[1].price).toBe(3000.0);
    expect(result.current.error).toBeNull();
  });

  it('sets error state when fetch fails', async () => {
    mockHandleFetch.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => usePopularTokens());

    await waitFor(() => {
      expect(result.current.isInitialLoading).toBe(false);
    });

    expect(result.current.error).toEqual(new Error('Network error'));
    // Still returns tokens without prices
    expect(result.current.tokens).toHaveLength(5);
    expect(result.current.tokens[0].price).toBeUndefined();
    expect(result.current.tokens[0].priceChange1d).toBeUndefined();
  });

  it('sets isRefreshing true on subsequent fetches', async () => {
    let resolveRefetch: () => void = () => undefined;
    const pendingPromise = new Promise<Record<string, unknown>>((resolve) => {
      resolveRefetch = () => resolve({});
    });

    // First call resolves immediately, subsequent calls use pending promise
    mockHandleFetch
      .mockResolvedValueOnce({})
      .mockReturnValueOnce(pendingPromise);

    const { result } = renderHook(() => usePopularTokens());

    // Wait for initial fetch to complete
    await waitFor(() => {
      expect(result.current.isInitialLoading).toBe(false);
    });

    // Trigger refetch - this will use the pending promise
    result.current.refetch();

    // Check refreshing state while fetch is pending
    await waitFor(() => {
      expect(result.current.isRefreshing).toBe(true);
    });
    expect(result.current.isInitialLoading).toBe(false);

    // Resolve the refetch
    resolveRefetch();

    await waitFor(() => {
      expect(result.current.isRefreshing).toBe(false);
    });
  });

  it('calls price API with correct parameters', async () => {
    mockHandleFetch.mockResolvedValue({});

    renderHook(() => usePopularTokens());

    await waitFor(() => {
      expect(mockHandleFetch).toHaveBeenCalled();
    });

    const fetchUrl = mockHandleFetch.mock.calls[0][0] as string;
    expect(fetchUrl).toContain(
      'https://price.api.cx.metamask.io/v3/spot-prices',
    );
    expect(fetchUrl).toContain('includeMarketData=true');
    expect(fetchUrl).toContain('vsCurrency=usd');
    expect(fetchUrl).toContain('assetIds=');
    expect(fetchUrl).toContain(
      'eip155%3A1%2Ferc20%3A0xaca92e438df0b2401ff60da7e4337b687a2435da',
    );
    expect(fetchUrl).toContain('eip155%3A1%2Fslip44%3A60');
  });

  it('refetch function triggers new fetch', async () => {
    mockHandleFetch.mockResolvedValue({});

    const { result } = renderHook(() => usePopularTokens());

    await waitFor(() => {
      expect(result.current.isInitialLoading).toBe(false);
    });

    expect(mockHandleFetch).toHaveBeenCalledTimes(1);

    await result.current.refetch();

    expect(mockHandleFetch).toHaveBeenCalledTimes(2);
  });

  it('excludes mUSD from tokens when the Money hub is enabled', async () => {
    mockHandleFetch.mockResolvedValue({});
    arrangeSelectors({ isMoneyHubEnabled: true });

    const { result } = renderHook(() => usePopularTokens());

    await waitFor(() => {
      expect(result.current.isInitialLoading).toBe(false);
    });

    expect(result.current.tokens).toHaveLength(4);
    expect(
      result.current.tokens.find((t) => t.symbol === 'mUSD'),
    ).toBeUndefined();
    expect(result.current.tokens[0].name).toBe('Ethereum');
  });
});
