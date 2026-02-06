import { renderHook, waitFor } from '@testing-library/react-native';
import { usePopularTokens, clearPopularTokensCache } from './usePopularTokens';
import {
  createMockPopularToken,
  createMockIncludeAsset,
  MOCK_CHAIN_IDS,
} from '../testUtils/fixtures';

global.fetch = jest.fn();

const mockPopularTokens = [
  createMockPopularToken({ symbol: 'TEST', name: 'Test Token' }),
  createMockPopularToken({
    symbol: 'ANOT',
    name: 'Another Token',
    noFee: { isSource: true, isDestination: false },
  }),
];

describe('usePopularTokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearPopularTokensCache();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('fetching', () => {
    it('fetches popular tokens on initial render', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => mockPopularTokens,
      });

      const { result } = renderHook(() =>
        usePopularTokens({
          chainIds: [MOCK_CHAIN_IDS.ethereum],
          includeAssets: '[]',
        }),
      );

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.popularTokens).toEqual(mockPopularTokens);
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/getTokens/popular'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chainIds: [MOCK_CHAIN_IDS.ethereum],
            includeAssets: [],
          }),
          signal: expect.any(AbortSignal),
        }),
      );
    });

    it('parses includeAssets correctly', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => mockPopularTokens,
      });
      const mockIncludeAssets = [createMockIncludeAsset()];

      const { result } = renderHook(() =>
        usePopularTokens({
          chainIds: [MOCK_CHAIN_IDS.ethereum],
          includeAssets: JSON.stringify(mockIncludeAssets),
        }),
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/getTokens/popular'),
        expect.objectContaining({
          body: JSON.stringify({
            chainIds: [MOCK_CHAIN_IDS.ethereum],
            includeAssets: mockIncludeAssets,
          }),
        }),
      );
    });
  });

  describe('caching', () => {
    it('uses cached data within 15 minutes', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => mockPopularTokens,
      });

      const { result: result1, unmount: unmount1 } = renderHook(() =>
        usePopularTokens({
          chainIds: [MOCK_CHAIN_IDS.ethereum],
          includeAssets: '[]',
        }),
      );

      await waitFor(() => expect(result1.current.isLoading).toBe(false));
      expect(global.fetch).toHaveBeenCalledTimes(1);
      unmount1();

      const { result: result2 } = renderHook(() =>
        usePopularTokens({
          chainIds: [MOCK_CHAIN_IDS.ethereum],
          includeAssets: '[]',
        }),
      );

      await waitFor(() => expect(result2.current.isLoading).toBe(false));
      expect(result2.current.popularTokens).toEqual(mockPopularTokens);
      expect(global.fetch).toHaveBeenCalledTimes(1); // No new fetch
    });

    it('refetches after cache expires at 15 minutes', async () => {
      jest.useFakeTimers();
      const newMockTokens = [createMockPopularToken({ symbol: 'NEW' })];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ json: async () => mockPopularTokens })
        .mockResolvedValueOnce({ json: async () => newMockTokens });

      const { result: result1, unmount: unmount1 } = renderHook(() =>
        usePopularTokens({
          chainIds: [MOCK_CHAIN_IDS.ethereum],
          includeAssets: '[]',
        }),
      );

      await waitFor(() => expect(result1.current.isLoading).toBe(false));
      expect(global.fetch).toHaveBeenCalledTimes(1);
      unmount1();

      jest.advanceTimersByTime(15 * 60 * 1000 + 1000);

      const { result: result2 } = renderHook(() =>
        usePopularTokens({
          chainIds: [MOCK_CHAIN_IDS.ethereum],
          includeAssets: '[]',
        }),
      );

      await waitFor(() => expect(result2.current.isLoading).toBe(false));
      expect(result2.current.popularTokens).toEqual(newMockTokens);
      expect(global.fetch).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });

    it('uses different cache keys for different chain IDs', async () => {
      const chain1Tokens = [mockPopularTokens[0]];
      const chain2Tokens = [mockPopularTokens[1]];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ json: async () => chain1Tokens })
        .mockResolvedValueOnce({ json: async () => chain2Tokens });

      const { result: result1, unmount: unmount1 } = renderHook(() =>
        usePopularTokens({
          chainIds: [MOCK_CHAIN_IDS.ethereum],
          includeAssets: '[]',
        }),
      );

      await waitFor(() => expect(result1.current.isLoading).toBe(false));
      unmount1();

      const { result: result2 } = renderHook(() =>
        usePopularTokens({
          chainIds: [MOCK_CHAIN_IDS.polygon],
          includeAssets: '[]',
        }),
      );

      await waitFor(() => expect(result2.current.isLoading).toBe(false));
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('uses different cache keys for different includeAssets', async () => {
      const tokens1 = [mockPopularTokens[0]];
      const tokens2 = [mockPopularTokens[1]];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ json: async () => tokens1 })
        .mockResolvedValueOnce({ json: async () => tokens2 });

      const { result: result1, unmount: unmount1 } = renderHook(() =>
        usePopularTokens({
          chainIds: [MOCK_CHAIN_IDS.ethereum],
          includeAssets: '[]',
        }),
      );

      await waitFor(() => expect(result1.current.isLoading).toBe(false));
      unmount1();

      const { result: result2 } = renderHook(() =>
        usePopularTokens({
          chainIds: [MOCK_CHAIN_IDS.ethereum],
          includeAssets: JSON.stringify([createMockIncludeAsset()]),
        }),
      );

      await waitFor(() => expect(result2.current.isLoading).toBe(false));
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('sorts chain IDs in cache key for consistent caching', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => mockPopularTokens,
      });

      const { result: result1, unmount: unmount1 } = renderHook(() =>
        usePopularTokens({
          chainIds: [MOCK_CHAIN_IDS.polygon, MOCK_CHAIN_IDS.ethereum],
          includeAssets: '[]',
        }),
      );

      await waitFor(() => expect(result1.current.isLoading).toBe(false));
      expect(global.fetch).toHaveBeenCalledTimes(1);
      unmount1();

      const { result: result2 } = renderHook(() =>
        usePopularTokens({
          chainIds: [MOCK_CHAIN_IDS.ethereum, MOCK_CHAIN_IDS.polygon],
          includeAssets: '[]',
        }),
      );

      await waitFor(() => expect(result2.current.isLoading).toBe(false));
      expect(global.fetch).toHaveBeenCalledTimes(1); // Cache hit
    });

    it('cleans up expired cache entries automatically', async () => {
      jest.useFakeTimers();

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ json: async () => mockPopularTokens })
        .mockResolvedValueOnce({ json: async () => [mockPopularTokens[0]] });

      const { unmount: unmount1 } = renderHook(() =>
        usePopularTokens({
          chainIds: [MOCK_CHAIN_IDS.ethereum],
          includeAssets: '[]',
        }),
      );

      await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
      unmount1();

      jest.advanceTimersByTime(15 * 60 * 1000 + 1000);

      const { result: result2 } = renderHook(() =>
        usePopularTokens({
          chainIds: [MOCK_CHAIN_IDS.polygon],
          includeAssets: '[]',
        }),
      );

      await waitFor(() => expect(result2.current.isLoading).toBe(false));
      expect(global.fetch).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });
  });

  describe('race conditions', () => {
    it('prevents race conditions when parameters change rapidly', async () => {
      const chain1Tokens = [mockPopularTokens[0]];
      const chain2Tokens = [mockPopularTokens[1]];

      let resolveChain1: ((value: unknown) => void) | undefined;
      const chain1Promise = new Promise((resolve) => {
        resolveChain1 = resolve;
      });

      (global.fetch as jest.Mock).mockImplementationOnce(() => chain1Promise);

      const { result, rerender } = renderHook(
        ({ chainIds }) => usePopularTokens({ chainIds, includeAssets: '[]' }),
        { initialProps: { chainIds: [MOCK_CHAIN_IDS.ethereum] } },
      );

      expect(result.current.isLoading).toBe(true);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => chain2Tokens,
      });

      rerender({ chainIds: [MOCK_CHAIN_IDS.polygon] });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.popularTokens).toEqual(chain2Tokens);

      resolveChain1?.({ json: async () => chain1Tokens });
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should STILL show chain 2 tokens
      expect(result.current.popularTokens).toEqual(chain2Tokens);
    });
  });
});
