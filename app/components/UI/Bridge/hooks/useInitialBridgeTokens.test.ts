import { act, waitFor } from '@testing-library/react-native';
import { FeatureId } from '@metamask/bridge-controller';
import { useInitialBridgeTokens } from './useInitialBridgeTokens';
import { createMockPopularToken, MOCK_CHAIN_IDS } from '../testUtils/fixtures';
import { SecurityDataType } from '../types';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { initialState } from '../_mocks_/initialState';
import { CaipChainId } from '@metamask/utils';
import { popularTokensCache } from '../utils/cacheUtils';

let globalFetchSpy: jest.SpyInstance;

const mockGetBearerToken = jest.fn();
jest.mock('../../../../core/Engine', () => ({
  context: {
    AuthenticationController: {
      getBearerToken: () => mockGetBearerToken(),
    },
  },
}));

const mockHasMinimumRequiredVersion = jest.fn();
jest.mock('../../../../util/remoteFeatureFlag', () => ({
  hasMinimumRequiredVersion: () => mockHasMinimumRequiredVersion(),
}));

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

describe('useInitialBridgeTokens', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    mockGetBearerToken.mockResolvedValue('mock-bearer-token');
    globalFetchSpy = jest.spyOn(global, 'fetch');
    mockHasMinimumRequiredVersion.mockReturnValue(true);
    popularTokensCache.clear();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('fetching', () => {
    it('does not fetch popular tokens on initial render', async () => {
      const { result } = renderHookWithProvider(
        () =>
          useInitialBridgeTokens({
            chainIds: [MOCK_CHAIN_IDS.ethereum],
            featureId: FeatureId.UNIFIED_SWAP_BRIDGE,
          }),
        { state: initialState },
      );

      expect(globalFetchSpy).not.toHaveBeenCalled();
      expect(result.current).toStrictEqual({
        includeAssets: [
          expect.objectContaining({
            assetId:
              'eip155:1/erc20:0x0000000000000000000000000000000000000002',
          }),
          expect.objectContaining({
            assetId:
              'eip155:1/erc20:0x0000000000000000000000000000000000000001',
          }),
          expect.objectContaining({
            assetId: 'eip155:1/slip44:60',
          }),
        ],
        fetchPopularTokens: expect.any(Function),
        balancesByAssetId: expect.objectContaining({
          'eip155:1/erc20:0x0000000000000000000000000000000000000002':
            expect.objectContaining({
              balance: '2.0',
            }),
          'eip155:1/erc20:0x0000000000000000000000000000000000000001':
            expect.objectContaining({
              balance: '1.0',
            }),
          'eip155:1/slip44:60': expect.objectContaining({
            balance: '3.0',
          }),
        }),
        searchIncludeAssets: [],
      });
    });

    it('fetches and caches popular tokens', async () => {
      globalFetchSpy.mockResolvedValueOnce({
        json: async () => mockPopularTokens,
      });

      const { result } = renderHookWithProvider(
        () =>
          useInitialBridgeTokens({
            chainIds: [MOCK_CHAIN_IDS.ethereum],
            featureId: FeatureId.UNIFIED_SWAP_BRIDGE,
          }),
        { state: initialState },
      );

      const abortSignal = new AbortController().signal;
      const tokens = await result.current.fetchPopularTokens(abortSignal);
      expect(tokens).toStrictEqual(mockPopularTokens);

      expect(globalFetchSpy).toHaveBeenCalledTimes(1);
      expect(globalFetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/getTokens/popular'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Initial fetch may not have a bearer token
            'Client-Version': expect.any(String),
            'X-Client-Id': 'mobile',
          },
          signal: abortSignal,
        }),
      );
      const [, requestInit] = globalFetchSpy.mock.calls[0] as [
        unknown,
        { body: string },
      ];
      expect(JSON.parse(requestInit.body)).toMatchObject({
        chainIds: [MOCK_CHAIN_IDS.ethereum],
        featureId: FeatureId.UNIFIED_SWAP_BRIDGE,
      });
      expect(JSON.parse(requestInit.body).includeAssets).toHaveLength(3);
      expect(popularTokensCache).toStrictEqual(
        new Map([
          [
            'eip155:1_eip155:1/erc20:0x0000000000000000000000000000000000000002,eip155:1/erc20:0x0000000000000000000000000000000000000001,eip155:1/slip44:60',
            {
              data: mockPopularTokens,
              timestamp: 123,
            },
          ],
        ]),
      );
    });

    it('forwards featureId to the popular tokens request body', async () => {
      globalFetchSpy.mockResolvedValueOnce({
        json: async () => mockPopularTokens,
      });

      const { result } = renderHookWithProvider(
        () =>
          useInitialBridgeTokens({
            chainIds: [MOCK_CHAIN_IDS.ethereum],
            featureId: FeatureId.LIMIT_ORDER,
          }),
        { state: initialState },
      );

      await result.current.fetchPopularTokens();

      const [, requestInit] = globalFetchSpy.mock.calls[0] as [
        unknown,
        { body: string },
      ];
      expect(JSON.parse(requestInit.body).featureId).toBe(FeatureId.LIMIT_ORDER);
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

      globalFetchSpy.mockResolvedValueOnce({
        json: async () => [tokenWithSecurity],
      });

      const { result } = renderHookWithProvider(
        () =>
          useInitialBridgeTokens({
            chainIds: [MOCK_CHAIN_IDS.ethereum],
            featureId: FeatureId.UNIFIED_SWAP_BRIDGE,
          }),
        { state: initialState },
      );

      const abortSignal = new AbortController().signal;
      const tokens = await result.current.fetchPopularTokens(abortSignal);
      expect(tokens).toStrictEqual([tokenWithSecurity]);
    });

    it('fetchPopularTokens returns undefined for malformed responses', async () => {
      // mockedEngine.context.AuthenticationController.getBearerToken.mockReturnValue(
      mockGetBearerToken.mockReturnValue(new Promise(() => undefined));

      globalFetchSpy.mockResolvedValue({
        json: async () => ({
          data: mockPopularTokens,
        }),
      });

      const { result } = renderHookWithProvider(
        () =>
          useInitialBridgeTokens({
            chainIds: [MOCK_CHAIN_IDS.ethereum],
            featureId: FeatureId.UNIFIED_SWAP_BRIDGE,
          }),
        { state: initialState },
      );

      const tokens = await result.current.fetchPopularTokens();
      await waitFor(() => expect(globalFetchSpy).toHaveBeenCalledTimes(1));

      expect(tokens).toBeUndefined();
    });

    it('does not cache malformed top-level responses', async () => {
      mockGetBearerToken.mockReturnValue(new Promise(() => undefined));

      globalFetchSpy
        .mockResolvedValueOnce({
          json: async () => ({
            data: mockPopularTokens,
          }),
        })
        .mockResolvedValueOnce({
          json: async () => mockPopularTokens,
        });

      const { result, unmount, rerender } = renderHookWithProvider(
        (chainIds?: CaipChainId[]) =>
          useInitialBridgeTokens({
            chainIds: chainIds ?? [MOCK_CHAIN_IDS.ethereum],
            featureId: FeatureId.UNIFIED_SWAP_BRIDGE,
          }),
        { state: initialState },
      );

      const tokens = await result.current.fetchPopularTokens();
      await waitFor(() => expect(tokens).toBeUndefined());
      expect(popularTokensCache).toStrictEqual(new Map([]));
      unmount();

      rerender([MOCK_CHAIN_IDS.ethereum]);
      expect(await result.current.fetchPopularTokens()).toStrictEqual(
        mockPopularTokens,
      );

      await waitFor(() => expect(globalFetchSpy).toHaveBeenCalledTimes(2));
      expect(popularTokensCache).toStrictEqual(
        new Map([
          [
            'eip155:1_eip155:1/erc20:0x0000000000000000000000000000000000000002,eip155:1/erc20:0x0000000000000000000000000000000000000001,eip155:1/slip44:60',
            {
              data: mockPopularTokens,
              timestamp: 123,
            },
          ],
        ]),
      );
    });
  });

  describe('caching', () => {
    beforeEach(() => {
      jest.restoreAllMocks();
      mockGetBearerToken.mockResolvedValue('mock-bearer-token');
      globalFetchSpy = jest.spyOn(global, 'fetch');
      mockHasMinimumRequiredVersion.mockReturnValue(true);
    });

    it('uses cached data within 15 minutes', async () => {
      globalFetchSpy.mockResolvedValueOnce({
        json: async () => mockPopularTokens,
      });

      const { result, unmount, rerender } = renderHookWithProvider(
        (chainIds?: CaipChainId[]) =>
          useInitialBridgeTokens({
            chainIds: chainIds ?? [MOCK_CHAIN_IDS.ethereum],
            featureId: FeatureId.UNIFIED_SWAP_BRIDGE,
          }),
        { state: initialState },
      );

      await waitFor(() =>
        expect(result.current.fetchPopularTokens()).resolves.toStrictEqual(
          mockPopularTokens,
        ),
      );
      expect(globalFetchSpy).toHaveBeenCalledTimes(1);
      unmount();

      rerender([MOCK_CHAIN_IDS.ethereum]);

      await waitFor(() =>
        expect(result.current.fetchPopularTokens()).resolves.toStrictEqual(
          mockPopularTokens,
        ),
      );
      expect(globalFetchSpy).toHaveBeenCalledTimes(1); // No new fetch
    });

    it('refetches after cache expires at 15 minutes', async () => {
      jest.useFakeTimers();
      const newMockTokens = [createMockPopularToken({ symbol: 'NEW' })];

      globalFetchSpy
        .mockResolvedValueOnce({ json: async () => mockPopularTokens })
        .mockResolvedValueOnce({ json: async () => newMockTokens });

      const { result, unmount, rerender } = renderHookWithProvider(
        () =>
          useInitialBridgeTokens({
            chainIds: [MOCK_CHAIN_IDS.ethereum],
            featureId: FeatureId.UNIFIED_SWAP_BRIDGE,
          }),
        { state: initialState },
      );

      await waitFor(() =>
        expect(result.current.fetchPopularTokens()).resolves.toStrictEqual(
          mockPopularTokens,
        ),
      );
      expect(globalFetchSpy).toHaveBeenCalledTimes(1);
      unmount();

      jest.advanceTimersByTime(15 * 60 * 1000 + 1000);

      rerender([MOCK_CHAIN_IDS.ethereum]);

      await waitFor(() =>
        expect(result.current.fetchPopularTokens()).resolves.toStrictEqual(
          newMockTokens,
        ),
      );
      expect(globalFetchSpy).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });

    it('uses different cache keys for different chain IDs', async () => {
      const chain1Tokens = [mockPopularTokens[0]];
      const chain2Tokens = [mockPopularTokens[1]];

      globalFetchSpy
        .mockResolvedValueOnce({ json: async () => chain1Tokens })
        .mockResolvedValueOnce({ json: async () => chain2Tokens });

      const { result, rerender } = renderHookWithProvider(
        (chainIds?: CaipChainId[]) =>
          useInitialBridgeTokens({
            chainIds: chainIds ?? [MOCK_CHAIN_IDS.ethereum],
            featureId: FeatureId.UNIFIED_SWAP_BRIDGE,
          }),
        { state: initialState },
      );

      const tokens1 = await result.current.fetchPopularTokens();
      expect(tokens1).toStrictEqual(chain1Tokens);
      expect(globalFetchSpy).toHaveBeenCalledTimes(1);
      expect(popularTokensCache).toStrictEqual(
        new Map([
          [
            'eip155:1_eip155:1/erc20:0x0000000000000000000000000000000000000002,eip155:1/erc20:0x0000000000000000000000000000000000000001,eip155:1/slip44:60',
            {
              data: chain1Tokens,
              timestamp: 123,
            },
          ],
        ]),
      );

      rerender([MOCK_CHAIN_IDS.polygon]);

      const tokens2 = await result.current.fetchPopularTokens();
      await waitFor(() => expect(globalFetchSpy).toHaveBeenCalledTimes(2));
      expect(tokens2).toStrictEqual(chain2Tokens);

      expect(popularTokensCache).toStrictEqual(
        new Map([
          [
            'eip155:1_eip155:1/erc20:0x0000000000000000000000000000000000000002,eip155:1/erc20:0x0000000000000000000000000000000000000001,eip155:1/slip44:60',
            {
              data: chain1Tokens,
              timestamp: 123,
            },
          ],
          [
            'eip155:137_',
            {
              data: chain2Tokens,
              timestamp: 123,
            },
          ],
        ]),
      );
    });

    it('sorts chain IDs in cache key for consistent caching', async () => {
      globalFetchSpy.mockResolvedValueOnce({
        json: async () => mockPopularTokens,
      });

      const { result, unmount, rerender } = renderHookWithProvider(
        (chainIds?: CaipChainId[]) =>
          useInitialBridgeTokens({
            chainIds: chainIds ?? [
              MOCK_CHAIN_IDS.polygon,
              MOCK_CHAIN_IDS.ethereum,
            ],
            featureId: FeatureId.UNIFIED_SWAP_BRIDGE,
          }),
        { state: initialState },
      );

      const tokens = await result.current.fetchPopularTokens();
      await waitFor(() => expect(globalFetchSpy).toHaveBeenCalledTimes(1));
      expect(tokens).toStrictEqual(mockPopularTokens);
      unmount();

      rerender([MOCK_CHAIN_IDS.ethereum, MOCK_CHAIN_IDS.polygon]);

      await waitFor(() =>
        expect(result.current.fetchPopularTokens()).resolves.toStrictEqual(
          mockPopularTokens,
        ),
      );
      expect(globalFetchSpy).toHaveBeenCalledTimes(1); // Cache hit
    });

    it('cleans up expired cache entries automatically', async () => {
      jest.useFakeTimers();

      globalFetchSpy
        .mockResolvedValueOnce({ json: async () => mockPopularTokens })
        .mockResolvedValueOnce({ json: async () => [mockPopularTokens[0]] });

      const { result, unmount, rerender } = renderHookWithProvider(
        (chainIds?: CaipChainId[]) =>
          useInitialBridgeTokens({
            chainIds: chainIds ?? [MOCK_CHAIN_IDS.ethereum],
            featureId: FeatureId.UNIFIED_SWAP_BRIDGE,
          }),
        { state: initialState },
      );

      await act(async () => {
        const tokens1 = await result.current.fetchPopularTokens();
        await waitFor(() => expect(tokens1).toStrictEqual(mockPopularTokens));
        await waitFor(() => expect(globalFetchSpy).toHaveBeenCalledTimes(1));
        unmount();
      });

      jest.advanceTimersByTime(15 * 60 * 1000 + 1000);

      rerender([MOCK_CHAIN_IDS.polygon]);
      await act(async () => {
        const tokens2 = await result.current.fetchPopularTokens();
        await waitFor(() =>
          expect(tokens2).toStrictEqual([mockPopularTokens[0]]),
        );
      });
      expect(globalFetchSpy).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });
  });
});
