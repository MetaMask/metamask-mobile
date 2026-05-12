import { renderHook, waitFor } from '@testing-library/react-native';
import { usePopularTokens } from './usePopularTokens';
import {
  createMockPopularToken,
  createMockIncludeAsset,
} from '../testUtils/fixtures';
import { IncludeAsset, PopularToken, SecurityDataType } from '../types';

const mockPopularTokens = [
  createMockPopularToken({
    symbol: 'TEST',
    name: 'Test Token',
    isVerified: true,
  }),
  createMockPopularToken({
    symbol: 'ANOT',
    name: 'Another Token',
    noFee: { isSource: true, isDestination: false },
  }),
];

describe('usePopularTokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('fetching', () => {
    it('fetches popular tokens on initial render', async () => {
      const fetchTokensMock = jest
        .fn()
        .mockResolvedValueOnce(mockPopularTokens);

      const { result } = renderHook(() =>
        usePopularTokens({
          fetchTokens: fetchTokensMock,
          includeAssets: [],
        }),
      );

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.popularTokens).toEqual(mockPopularTokens);
      expect(result.current.popularTokens[0].isVerified).toBe(true);
      expect(fetchTokensMock).toHaveBeenCalledTimes(1);
      expect(fetchTokensMock).toHaveBeenCalledWith(expect.any(AbortSignal));
    });

    it('uses includeAssets as a placeholder when fetchTokens is loading', async () => {
      jest.useFakeTimers();

      const fetchTokensMock = jest
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise((resolve) =>
              setTimeout(() => resolve(mockPopularTokens), 10000),
            ),
        );

      const mockIncludeAssets = [createMockIncludeAsset()];

      const { result } = renderHook(() =>
        usePopularTokens({
          fetchTokens: fetchTokensMock,
          includeAssets: mockIncludeAssets,
        }),
      );

      jest.advanceTimersByTime(5000);
      await waitFor(() => expect(result.current.isLoading).toBe(true));
      expect(result.current.popularTokens).toEqual(mockIncludeAssets);

      jest.advanceTimersByTime(5000 + 1000);
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(fetchTokensMock).toHaveBeenCalledTimes(1);
      expect(result.current.popularTokens).toEqual(mockPopularTokens);
      expect(fetchTokensMock).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });

    it('uses includeAssets as a placeholder when fetchTokens returns undefined', async () => {
      const fetchTokensMock = jest.fn().mockResolvedValueOnce(undefined);
      const mockIncludeAssets = [createMockIncludeAsset()];

      const { result } = renderHook(() =>
        usePopularTokens({
          fetchTokens: fetchTokensMock,
          includeAssets: mockIncludeAssets,
        }),
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.popularTokens).toEqual(mockIncludeAssets);
      expect(fetchTokensMock).toHaveBeenCalledTimes(1);
    });

    it('uses fetchTokens result as popularTokens', async () => {
      const fetchTokensMock = jest
        .fn()
        .mockResolvedValueOnce(mockPopularTokens);
      const mockIncludeAssets = [createMockIncludeAsset()];

      const { result } = renderHook(() =>
        usePopularTokens({
          fetchTokens: fetchTokensMock,
          includeAssets: mockIncludeAssets,
        }),
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.popularTokens).toEqual(mockPopularTokens);
      expect(fetchTokensMock).toHaveBeenCalledTimes(1);
    });

    it('preserves securityData in the response', async () => {
      const tokenWithSecurity = createMockPopularToken({
        symbol: 'SAFE',
        securityData: {
          type: SecurityDataType.Warning,
          metadata: {
            features: [
              {
                featureId: 'HONEYPOT',
                type: SecurityDataType.Warning,
                description: 'Honeypot risk',
              },
            ],
          },
        },
      });

      const fetchTokensMock = jest
        .fn()
        .mockResolvedValueOnce([tokenWithSecurity]);

      const { result } = renderHook(() =>
        usePopularTokens({
          fetchTokens: fetchTokensMock,
          includeAssets: [],
        }),
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.popularTokens[0].securityData).toEqual(
        tokenWithSecurity.securityData,
      );
    });
  });

  describe('race conditions', () => {
    it('prevents race conditions when parameters change rapidly', async () => {
      const chain1Tokens = [mockPopularTokens[0]];
      const chain2Tokens = [mockPopularTokens[1]];
      const abortSpy = jest.spyOn(AbortController.prototype, 'abort');

      let resolveChain1: ((value: unknown) => void) | undefined;
      const chain1Promise = new Promise((resolve) => {
        resolveChain1 = resolve;
      });

      const fetchTokensMock = jest
        .fn()
        .mockImplementationOnce(() => chain1Promise);

      const { result, rerender } = renderHook(
        ({
          fetchTokens,
          includeAssets,
        }: {
          fetchTokens?: () => Promise<PopularToken[]>;
          includeAssets?: IncludeAsset[];
        }) =>
          usePopularTokens({
            fetchTokens: fetchTokens ?? fetchTokensMock,
            includeAssets: includeAssets ?? [],
          }),
        { initialProps: { fetchTokens: fetchTokensMock, includeAssets: [] } },
      );

      expect(result.current.isLoading).toBe(true);

      rerender({
        fetchTokens: jest.fn().mockResolvedValueOnce(chain2Tokens),
        includeAssets: [],
      });

      await waitFor(() => expect(result.current.isLoading).toBe(true));
      expect(abortSpy).toHaveBeenCalled();
      await waitFor(() =>
        expect(result.current.popularTokens).toEqual(chain2Tokens),
      );
      expect(result.current.isLoading).toBe(false);

      resolveChain1?.(chain1Tokens);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should STILL show chain 2 tokens
      expect(result.current.popularTokens).toEqual(chain2Tokens);
    });

    it('keeps isLoading true until the latest fetch completes when a prior fetch is aborted', async () => {
      const chain2Tokens = [mockPopularTokens[1]];

      const fetchThatRejectsOnAbort = (signal?: AbortSignal) =>
        new Promise<PopularToken[] | undefined>((resolve, reject) => {
          if (signal?.aborted) {
            reject(new DOMException('Aborted', 'AbortError'));
            return;
          }
          const onAbort = () =>
            reject(new DOMException('Aborted', 'AbortError'));
          signal?.addEventListener('abort', onAbort, { once: true });
        });

      let resolveSlow: ((value: PopularToken[]) => void) | undefined;
      const slowSecondFetch = jest.fn(
        () =>
          new Promise<PopularToken[]>((resolve) => {
            resolveSlow = resolve;
          }),
      );

      const { result, rerender } = renderHook(
        ({
          fetchTokens,
        }: {
          fetchTokens?: (
            signal?: AbortSignal,
          ) => Promise<PopularToken[] | undefined>;
        }) =>
          usePopularTokens({
            fetchTokens: fetchTokens ?? fetchThatRejectsOnAbort,
            includeAssets: [],
          }),
        {
          initialProps: {
            fetchTokens: fetchThatRejectsOnAbort,
          },
        },
      );

      expect(result.current.isLoading).toBe(true);

      rerender({ fetchTokens: slowSecondFetch });

      await waitFor(() => expect(result.current.isLoading).toBe(true));

      resolveSlow?.(chain2Tokens);

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.popularTokens).toEqual(chain2Tokens);
      expect(slowSecondFetch).toHaveBeenCalledTimes(1);
    });
  });
});
