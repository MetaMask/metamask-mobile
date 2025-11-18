import { waitFor } from '@testing-library/react-native';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import initialRootState from '../../../../util/test/initial-root-state';
import { handleFetch } from '@metamask/controller-utils';
import { useRampTokens, RampsToken } from './useRampTokens';
import { UnifiedRampRoutingType } from '../../../../reducers/fiatOrders';
import Logger from '../../../../util/Logger';

jest.mock('@metamask/controller-utils', () => ({
  ...jest.requireActual('@metamask/controller-utils'),
  handleFetch: jest.fn(),
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

const mockHandleFetch = handleFetch as jest.MockedFunction<typeof handleFetch>;
const mockLoggerError = Logger.error as jest.MockedFunction<
  typeof Logger.error
>;

const createMockToken = (overrides = {}): RampsToken => ({
  assetId: 'eip155:1/slip44:60',
  chainId: 'eip155:1',
  name: 'Ethereum',
  symbol: 'ETH',
  decimals: 18,
  iconUrl: 'https://example.com/eth.png',
  supported: true,
  ...overrides,
});

const createMockState = (
  rampRoutingDecision: UnifiedRampRoutingType | null = null,
  detectedGeolocation?: string,
) => ({
  ...initialRootState,
  fiatOrders: {
    ...initialRootState.fiatOrders,
    rampRoutingDecision,
    detectedGeolocation,
  },
});

describe('useRampTokens', () => {
  const originalEnv = process.env.METAMASK_ENVIRONMENT;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.METAMASK_ENVIRONMENT = 'dev';
  });

  afterEach(() => {
    jest.resetAllMocks();
    process.env.METAMASK_ENVIRONMENT = originalEnv;
  });

  describe('fetches tokens with correct parameters', () => {
    it('fetches tokens for AGGREGATOR routing decision', async () => {
      const mockTokens = [
        createMockToken(),
        createMockToken({ symbol: 'BTC' }),
      ];
      mockHandleFetch.mockResolvedValueOnce(mockTokens);

      const { result } = renderHookWithProvider(() => useRampTokens(), {
        state: createMockState(UnifiedRampRoutingType.AGGREGATOR, 'us-ca'),
      });

      await waitFor(() => {
        expect(mockHandleFetch).toHaveBeenCalledWith(
          'https://on-ramp-cache.uat-api.cx.metamask.io/regions/us-ca/tokens?action=buy&sdk=2.1.5',
        );
      });

      expect(result.current.tokens).toEqual(mockTokens);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('fetches tokens for DEPOSIT routing decision', async () => {
      const mockTokens = [createMockToken()];
      mockHandleFetch.mockResolvedValueOnce(mockTokens);

      const { result } = renderHookWithProvider(() => useRampTokens(), {
        state: createMockState(UnifiedRampRoutingType.DEPOSIT, 'uk'),
      });

      await waitFor(() => {
        expect(mockHandleFetch).toHaveBeenCalledWith(
          'https://on-ramp-cache.uat-api.cx.metamask.io/regions/uk/tokens?action=deposit&sdk=2.1.5',
        );
      });

      expect(result.current.tokens).toEqual(mockTokens);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('includes SDK version in query parameters', async () => {
      const mockTokens = [createMockToken()];
      mockHandleFetch.mockResolvedValueOnce(mockTokens);

      renderHookWithProvider(() => useRampTokens(), {
        state: createMockState(UnifiedRampRoutingType.DEPOSIT, 'us-ca'),
      });

      await waitFor(() => {
        expect(mockHandleFetch).toHaveBeenCalled();
      });

      const calledUrl = mockHandleFetch.mock.calls[0][0];
      expect(calledUrl).toContain('sdk=2.1.5');
    });
  });

  describe('environment-based URL selection', () => {
    it('uses production URL for production environment', async () => {
      process.env.METAMASK_ENVIRONMENT = 'production';
      const mockTokens = [createMockToken()];
      mockHandleFetch.mockResolvedValueOnce(mockTokens);

      renderHookWithProvider(() => useRampTokens(), {
        state: createMockState(UnifiedRampRoutingType.AGGREGATOR, 'us-ca'),
      });

      await waitFor(() => {
        expect(mockHandleFetch).toHaveBeenCalledWith(
          'https://on-ramp-cache.api.cx.metamask.io/regions/us-ca/tokens?action=buy&sdk=2.1.5',
        );
      });
    });

    it('uses production URL for beta environment', async () => {
      process.env.METAMASK_ENVIRONMENT = 'beta';
      const mockTokens = [createMockToken()];
      mockHandleFetch.mockResolvedValueOnce(mockTokens);

      renderHookWithProvider(() => useRampTokens(), {
        state: createMockState(UnifiedRampRoutingType.DEPOSIT, 'us-ca'),
      });

      await waitFor(() => {
        expect(mockHandleFetch).toHaveBeenCalledWith(
          'https://on-ramp-cache.api.cx.metamask.io/regions/us-ca/tokens?action=deposit&sdk=2.1.5',
        );
      });
    });

    it('uses production URL for rc environment', async () => {
      process.env.METAMASK_ENVIRONMENT = 'rc';
      const mockTokens = [createMockToken()];
      mockHandleFetch.mockResolvedValueOnce(mockTokens);

      renderHookWithProvider(() => useRampTokens(), {
        state: createMockState(UnifiedRampRoutingType.AGGREGATOR, 'us-ca'),
      });

      await waitFor(() => {
        expect(mockHandleFetch).toHaveBeenCalledWith(
          'https://on-ramp-cache.api.cx.metamask.io/regions/us-ca/tokens?action=buy&sdk=2.1.5',
        );
      });
    });

    it('uses staging URL for dev environment', async () => {
      process.env.METAMASK_ENVIRONMENT = 'dev';
      const mockTokens = [createMockToken()];
      mockHandleFetch.mockResolvedValueOnce(mockTokens);

      renderHookWithProvider(() => useRampTokens(), {
        state: createMockState(UnifiedRampRoutingType.DEPOSIT, 'us-ca'),
      });

      await waitFor(() => {
        expect(mockHandleFetch).toHaveBeenCalledWith(
          'https://on-ramp-cache.uat-api.cx.metamask.io/regions/us-ca/tokens?action=deposit&sdk=2.1.5',
        );
      });
    });

    it('uses staging URL for exp environment', async () => {
      process.env.METAMASK_ENVIRONMENT = 'exp';
      const mockTokens = [createMockToken()];
      mockHandleFetch.mockResolvedValueOnce(mockTokens);

      renderHookWithProvider(() => useRampTokens(), {
        state: createMockState(UnifiedRampRoutingType.AGGREGATOR, 'us-ca'),
      });

      await waitFor(() => {
        expect(mockHandleFetch).toHaveBeenCalledWith(
          'https://on-ramp-cache.uat-api.cx.metamask.io/regions/us-ca/tokens?action=buy&sdk=2.1.5',
        );
      });
    });

    it('uses staging URL for test environment', async () => {
      process.env.METAMASK_ENVIRONMENT = 'test';
      const mockTokens = [createMockToken()];
      mockHandleFetch.mockResolvedValueOnce(mockTokens);

      renderHookWithProvider(() => useRampTokens(), {
        state: createMockState(UnifiedRampRoutingType.DEPOSIT, 'us-ca'),
      });

      await waitFor(() => {
        expect(mockHandleFetch).toHaveBeenCalledWith(
          'https://on-ramp-cache.uat-api.cx.metamask.io/regions/us-ca/tokens?action=deposit&sdk=2.1.5',
        );
      });
    });

    it('uses staging URL for e2e environment', async () => {
      process.env.METAMASK_ENVIRONMENT = 'e2e';
      const mockTokens = [createMockToken()];
      mockHandleFetch.mockResolvedValueOnce(mockTokens);

      renderHookWithProvider(() => useRampTokens(), {
        state: createMockState(UnifiedRampRoutingType.AGGREGATOR, 'us-ca'),
      });

      await waitFor(() => {
        expect(mockHandleFetch).toHaveBeenCalledWith(
          'https://on-ramp-cache.uat-api.cx.metamask.io/regions/us-ca/tokens?action=buy&sdk=2.1.5',
        );
      });
    });
  });

  describe('returns null for invalid scenarios', () => {
    it('returns null when no region detected', () => {
      const { result } = renderHookWithProvider(() => useRampTokens(), {
        state: createMockState(UnifiedRampRoutingType.AGGREGATOR),
      });

      expect(result.current.tokens).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(mockHandleFetch).not.toHaveBeenCalled();
    });

    it('returns null for UNSUPPORTED routing decision', () => {
      const { result } = renderHookWithProvider(() => useRampTokens(), {
        state: createMockState(UnifiedRampRoutingType.UNSUPPORTED, 'us-ca'),
      });

      expect(result.current.tokens).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(mockHandleFetch).not.toHaveBeenCalled();
    });

    it('returns null for ERROR routing decision', () => {
      const { result } = renderHookWithProvider(() => useRampTokens(), {
        state: createMockState(UnifiedRampRoutingType.ERROR, 'us-ca'),
      });

      expect(result.current.tokens).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(mockHandleFetch).not.toHaveBeenCalled();
    });

    it('returns null for null routing decision', () => {
      const { result } = renderHookWithProvider(() => useRampTokens(), {
        state: createMockState(null, 'us-ca'),
      });

      expect(result.current.tokens).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(mockHandleFetch).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('sets error state when fetch fails', async () => {
      const mockError = new Error('Network error');
      mockHandleFetch.mockRejectedValueOnce(mockError);

      const { result } = renderHookWithProvider(() => useRampTokens(), {
        state: createMockState(UnifiedRampRoutingType.AGGREGATOR, 'us-ca'),
      });

      await waitFor(() => {
        expect(result.current.error).toEqual(mockError);
      });

      expect(result.current.tokens).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('logs error when fetch fails', async () => {
      const mockError = new Error('API error');
      mockHandleFetch.mockRejectedValueOnce(mockError);

      renderHookWithProvider(() => useRampTokens(), {
        state: createMockState(UnifiedRampRoutingType.DEPOSIT, 'us-ca'),
      });

      await waitFor(() => {
        expect(mockLoggerError).toHaveBeenCalledWith(
          mockError,
          'useRampTokens::fetchTokens failed',
        );
      });
    });

    it('sets error to null at start of fetch attempt', async () => {
      const mockTokens = [createMockToken()];
      mockHandleFetch.mockResolvedValueOnce(mockTokens);

      const { result } = renderHookWithProvider(() => useRampTokens(), {
        state: createMockState(UnifiedRampRoutingType.AGGREGATOR, 'us-ca'),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Error should be null during fetch
      expect(result.current.error).toBeNull();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tokens).toEqual(mockTokens);
    });
  });

  describe('loading state', () => {
    it('sets loading to false after successful fetch', async () => {
      const mockTokens = [createMockToken()];
      mockHandleFetch.mockResolvedValueOnce(mockTokens);

      const { result } = renderHookWithProvider(() => useRampTokens(), {
        state: createMockState(UnifiedRampRoutingType.DEPOSIT, 'us-ca'),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tokens).toEqual(mockTokens);
    });

    it('sets loading to false after failed fetch', async () => {
      const mockError = new Error('Fetch error');
      mockHandleFetch.mockRejectedValueOnce(mockError);

      const { result } = renderHookWithProvider(() => useRampTokens(), {
        state: createMockState(UnifiedRampRoutingType.AGGREGATOR, 'us-ca'),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toEqual(mockError);
    });
  });

  describe('returns correct token data structure', () => {
    it('returns tokens with supported field', async () => {
      const mockTokens = [
        createMockToken({ supported: true }),
        createMockToken({ symbol: 'USDC', supported: false }),
      ];
      mockHandleFetch.mockResolvedValueOnce(mockTokens);

      const { result } = renderHookWithProvider(() => useRampTokens(), {
        state: createMockState(UnifiedRampRoutingType.AGGREGATOR, 'us-ca'),
      });

      await waitFor(() => {
        expect(result.current.tokens).toEqual(mockTokens);
      });

      expect(result.current.tokens?.[0].supported).toBe(true);
      expect(result.current.tokens?.[1].supported).toBe(false);
    });
  });
});
