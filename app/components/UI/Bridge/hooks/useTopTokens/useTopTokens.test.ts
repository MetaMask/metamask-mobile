import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useTopTokens } from '.';
import { waitFor } from '@testing-library/react-native';
import { Hex } from '@metamask/utils';
import {
  BridgeClientId,
  BRIDGE_PROD_API_BASE_URL,
  fetchBridgeTokens,
} from '@metamask/bridge-controller';
import { handleFetch } from '@metamask/controller-utils';
import { bridgeTestInitialState } from '../../_mocks_/bridgeInitialState';
import { BridgeToken } from '../../types';

// Mock dependencies
jest.mock('@metamask/bridge-controller', () => ({
  ...jest.requireActual('@metamask/bridge-controller'),
  fetchBridgeTokens: jest.fn(),
}));

describe('useTopTokens', () => {
  const mockChainId = '0x1' as Hex;
  const mockBridgeToken1: BridgeToken = {
    address: '0x0000000000000000000000000000000000000001',
    symbol: 'TOKEN1',
    name: 'Token One',
    image: 'https://token1.com/logo.png',
    decimals: 18,
    chainId: '0x1',
  };

  const mockBridgeToken2: BridgeToken = {
    address: '0x0000000000000000000000000000000000000002',
    symbol: 'HELLO',
    name: 'Hello Token',
    image: 'https://token2.com/logo.png',
    decimals: 18,
    chainId: '0x1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty array when no chainId is provided', () => {
    const { result } = renderHookWithProvider(() => useTopTokens({}), {
      state: bridgeTestInitialState,
    });

    expect(result.current.topTokens).toEqual([]);
    expect(result.current.pending).toBe(false);
  });

  it('should fetch and merge top tokens from Swaps and Bridge APIs', async () => {
    // Mock Bridge API response with both tokens
    const mockBridgeResponse = {
      [mockBridgeToken1.address.toLowerCase()]: {
        address: mockBridgeToken1.address,
        symbol: mockBridgeToken1.symbol,
        name: mockBridgeToken1.name,
        iconUrl: mockBridgeToken1.image,
        decimals: mockBridgeToken1.decimals,
        chainId: mockBridgeToken1.chainId,
        assetId: 'token1-asset-id',
      },
      [mockBridgeToken2.address.toLowerCase()]: {
        address: mockBridgeToken2.address,
        symbol: mockBridgeToken2.symbol,
        name: mockBridgeToken2.name,
        iconUrl: mockBridgeToken2.image,
        decimals: mockBridgeToken2.decimals,
        chainId: mockBridgeToken2.chainId,
        assetId: 'token2-asset-id',
      },
    };

    // Mock the Bridge API call
    (fetchBridgeTokens as jest.Mock).mockResolvedValue(mockBridgeResponse);

    const { result } = renderHookWithProvider(
      () => useTopTokens({ chainId: mockChainId }),
      { state: bridgeTestInitialState },
    );

    // Initial state should be pending
    expect(result.current.pending).toBe(true);

    await waitFor(() => {
      expect(result.current.pending).toBe(false);
      expect(result.current.topTokens).toHaveLength(2); // From initialState's SwapsController.topAssets

      // Verify both tokens are present and have correct data
      const tokens = result.current.topTokens || [];
      expect(tokens[0]).toMatchObject({
        address: mockBridgeToken1.address,
        symbol: mockBridgeToken1.symbol,
        name: mockBridgeToken1.name,
        image: mockBridgeToken1.image,
        decimals: mockBridgeToken1.decimals,
        chainId: mockBridgeToken1.chainId,
      });

      expect(tokens[1]).toMatchObject({
        address: mockBridgeToken2.address,
        symbol: mockBridgeToken2.symbol,
        name: mockBridgeToken2.name,
        image: mockBridgeToken2.image,
        decimals: mockBridgeToken2.decimals,
        chainId: mockBridgeToken2.chainId,
      });
    });

    // Verify Bridge API was called with correct parameters
    expect(fetchBridgeTokens).toHaveBeenCalledWith(
      mockChainId,
      BridgeClientId.MOBILE,
      handleFetch,
      BRIDGE_PROD_API_BASE_URL,
    );
  });

  it('should handle Bridge API errors gracefully', async () => {
    // Mock Bridge API error
    (fetchBridgeTokens as jest.Mock).mockRejectedValue(
      new Error('Bridge API Error'),
    );

    const { result } = renderHookWithProvider(
      () => useTopTokens({ chainId: mockChainId }),
      { state: bridgeTestInitialState },
    );

    await waitFor(() => {
      expect(result.current.pending).toBe(false);
      expect(result.current.topTokens).toEqual([]);
    });
  });

  it('should handle missing Bridge token data gracefully', async () => {
    (fetchBridgeTokens as jest.Mock).mockResolvedValue({});

    const { result } = renderHookWithProvider(
      () => useTopTokens({ chainId: mockChainId }),
      { state: bridgeTestInitialState },
    );

    await waitFor(() => {
      expect(result.current.pending).toBe(false);
      expect(result.current.topTokens).toEqual([]);
    });
  });
});
