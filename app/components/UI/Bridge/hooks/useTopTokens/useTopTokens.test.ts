import {
  initialState,
  ethChainId,
  ethToken1Address,
  ethToken2Address,
} from '../../_mocks_/initialState';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useTopTokens, memoizedFetchBridgeTokens } from '.';
import { waitFor } from '@testing-library/react-native';
import {
  BridgeClientId,
  BRIDGE_PROD_API_BASE_URL,
  fetchBridgeTokens,
} from '@metamask/bridge-controller';
import { handleFetch } from '@metamask/controller-utils';
import { BridgeToken } from '../../types';
import { cloneDeep } from 'lodash';

// Mock dependencies
jest.mock('@metamask/bridge-controller', () => ({
  ...jest.requireActual('@metamask/bridge-controller'),
  fetchBridgeTokens: jest.fn(),
}));

describe('useTopTokens', () => {
  // Expected tokens from cached TokenListController data for ethChainId
  const expectedCachedToken1: BridgeToken = {
    address: ethToken1Address,
    symbol: 'TOKEN1',
    name: 'Token One',
    image: 'https://token1.com/logo.png',
    decimals: 18,
    chainId: ethChainId,
  };

  const expectedCachedToken2: BridgeToken = {
    address: ethToken2Address,
    symbol: 'HELLO',
    name: 'Hello Token',
    image: 'https://token2.com/logo.png',
    decimals: 18,
    chainId: ethChainId,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty array when no chainId is provided', () => {
    const { result } = renderHookWithProvider(() => useTopTokens({}), {
      state: initialState,
    });

    expect(result.current.topTokens).toEqual([]);
    expect(result.current.pending).toBe(false);
  });

  it('should use cached tokens from TokenListController when available', async () => {
    const { result } = renderHookWithProvider(
      () => useTopTokens({ chainId: ethChainId }),
      { state: initialState },
    );

    // Initial state should be pending
    expect(result.current.pending).toBe(true);

    await waitFor(() => {
      expect(result.current.pending).toBe(false);
      expect(result.current.topTokens).toHaveLength(2); // From cached TokenListController tokens

      // Verify both cached tokens are present and have correct data
      const tokens = result.current.topTokens || [];
      expect(tokens[0]).toMatchObject({
        address: expectedCachedToken1.address,
        symbol: expectedCachedToken1.symbol,
        name: expectedCachedToken1.name,
        image: expectedCachedToken1.image,
        decimals: expectedCachedToken1.decimals,
        chainId: expectedCachedToken1.chainId,
      });

      expect(tokens[1]).toMatchObject({
        address: expectedCachedToken2.address,
        symbol: expectedCachedToken2.symbol,
        name: expectedCachedToken2.name,
        image: expectedCachedToken2.image,
        decimals: expectedCachedToken2.decimals,
        chainId: expectedCachedToken2.chainId,
      });
    });

    // Verify Bridge API was NOT called because cached tokens were used
    expect(fetchBridgeTokens).not.toHaveBeenCalled();
  });

  describe('when no cached tokens are available', () => {
    // Deep clone initial state and remove cached tokens to simulate no cache
    const initialStateNoCache = cloneDeep(initialState);
    initialStateNoCache.engine.backgroundState.TokenListController.tokensChainsCache =
      {};

    it('should fetch tokens from Bridge API when no cached tokens are available', async () => {
      memoizedFetchBridgeTokens.cache.clear?.();

      // Mock Bridge API response with expected tokens
      const mockBridgeResponse = {
        [ethToken1Address.toLowerCase()]: {
          address: ethToken1Address,
          symbol: 'FOO',
          name: 'Foo Token',
          iconUrl: 'https://foo.com/logo.png',
          decimals: 18,
          chainId: ethChainId,
          assetId: 'token1-asset-id',
        },
        [ethToken2Address.toLowerCase()]: {
          address: ethToken2Address,
          symbol: 'BAR',
          name: 'Bar Token',
          iconUrl: 'https://bar.com/logo.png',
          decimals: 18,
          chainId: ethChainId,
          assetId: 'token2-asset-id',
        },
      };

      // Mock the Bridge API call
      (fetchBridgeTokens as jest.Mock).mockResolvedValue(mockBridgeResponse);

      const { result } = renderHookWithProvider(
        () => useTopTokens({ chainId: ethChainId }),
        { state: initialStateNoCache },
      );

      // Initial state should be pending
      expect(result.current.pending).toBe(true);

      await waitFor(() => {
        expect(result.current.pending).toBe(false);
        expect(result.current.topTokens).toHaveLength(2); // From Bridge API

        // Verify tokens from Bridge API are present and have correct data
        const tokens = result.current.topTokens || [];
        expect(tokens[0]).toMatchObject({
          address: ethToken1Address,
          symbol: 'FOO',
          name: 'Foo Token',
          image: 'https://foo.com/logo.png',
          decimals: 18,
          chainId: ethChainId,
        });

        expect(tokens[1]).toMatchObject({
          address: ethToken2Address,
          symbol: 'BAR',
          name: 'Bar Token',
          image: 'https://bar.com/logo.png',
          decimals: 18,
          chainId: ethChainId,
        });
      });

      // Verify Bridge API was called with correct parameters
      expect(fetchBridgeTokens).toHaveBeenCalledWith(
        ethChainId,
        BridgeClientId.MOBILE,
        handleFetch,
        BRIDGE_PROD_API_BASE_URL,
      );
    });

    it('should handle Bridge API errors gracefully', async () => {
      memoizedFetchBridgeTokens.cache.clear?.();

      // Mock Bridge API error
      (fetchBridgeTokens as jest.Mock).mockRejectedValue(
        new Error('Bridge API Error'),
      );

      const { result } = renderHookWithProvider(
        () => useTopTokens({ chainId: ethChainId }),
        { state: initialStateNoCache },
      );

      await waitFor(() => {
        expect(result.current.pending).toBe(false);
        expect(result.current.topTokens).toEqual([]);
      });
    });

    it('should handle missing Bridge token data gracefully', async () => {
      memoizedFetchBridgeTokens.cache.clear?.();

      (fetchBridgeTokens as jest.Mock).mockResolvedValue({});

      const { result } = renderHookWithProvider(
        () => useTopTokens({ chainId: ethChainId }),
        { state: initialStateNoCache },
      );

      await waitFor(() => {
        expect(result.current.pending).toBe(false);
        expect(result.current.topTokens).toEqual([]);
      });
    });
  });
});
