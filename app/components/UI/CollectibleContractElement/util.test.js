import Engine from '../../../core/Engine';
import { removeNft } from './util';
import { toHex } from '@metamask/controller-utils';

describe('removeNft', () => {
  const mockRemoveAndIgnoreNft = jest.fn();
  const mockRemoveFavoriteCollectible = jest.fn();
  const mockLongPressedCollectible = {
    current: {
      address: '0xabc123',
      tokenId: '789',
      chainId: 1,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(Engine.context, {
      NftController: {
        removeAndIgnoreNft: mockRemoveAndIgnoreNft,
      },
    });
  });

  it('should call NftController.removeAndIgnoreNft with correct arguments', () => {
    const chainIdHex = toHex(1);
    const mockConfig = {
      [chainIdHex]: {
        rpcEndpoints: [
          {
            networkClientId: 'specific-network-id',
          },
        ],
        defaultRpcEndpointIndex: 0,
      },
    };

    removeNft({
      selectedAddress: '0xdef456',
      chainId: 1,
      longPressedCollectible: mockLongPressedCollectible,
      removeFavoriteCollectible: mockRemoveFavoriteCollectible,
      networkConfigurations: mockConfig,
    });

    expect(mockRemoveFavoriteCollectible).toHaveBeenCalledWith(
      '0xdef456',
      1,
      mockLongPressedCollectible.current,
    );

    expect(mockRemoveAndIgnoreNft).toHaveBeenCalledWith('0xabc123', '789', {
      networkClientId: 'specific-network-id',
      userAddress: '0xdef456',
    });
  });

  it('should handle missing network configuration gracefully', () => {
    removeNft({
      selectedAddress: '0xdef456',
      chainId: 1,
      longPressedCollectible: mockLongPressedCollectible,
      removeFavoriteCollectible: mockRemoveFavoriteCollectible,
      networkConfigurations: {},
    });

    expect(mockRemoveFavoriteCollectible).toHaveBeenCalledWith(
      '0xdef456',
      1,
      mockLongPressedCollectible.current,
    );

    expect(mockRemoveAndIgnoreNft).toHaveBeenCalledWith('0xabc123', '789', {
      networkClientId: undefined,
      userAddress: '0xdef456',
    });
  });

  it('should handle missing RPC endpoint gracefully', () => {
    const chainIdHex = toHex(1);
    const mockConfigWithoutRpc = {
      [chainIdHex]: {
        rpcEndpoints: [],
        defaultRpcEndpointIndex: 0,
      },
    };

    removeNft({
      selectedAddress: '0xdef456',
      chainId: 1,
      longPressedCollectible: mockLongPressedCollectible,
      removeFavoriteCollectible: mockRemoveFavoriteCollectible,
      networkConfigurations: mockConfigWithoutRpc,
    });

    expect(mockRemoveFavoriteCollectible).toHaveBeenCalledWith(
      '0xdef456',
      1,
      mockLongPressedCollectible.current,
    );

    expect(mockRemoveAndIgnoreNft).toHaveBeenCalledWith('0xabc123', '789', {
      networkClientId: undefined,
      userAddress: '0xdef456',
    });
  });

  it('should handle missing defaultRpcEndpointIndex gracefully', () => {
    const chainIdHex = toHex(1);
    const mockConfigWithoutDefaultIndex = {
      [chainIdHex]: {
        rpcEndpoints: [
          {
            networkClientId: 'specific-network-id',
          },
        ],
      },
    };

    removeNft({
      selectedAddress: '0xdef456',
      chainId: 1,
      longPressedCollectible: mockLongPressedCollectible,
      removeFavoriteCollectible: mockRemoveFavoriteCollectible,
      networkConfigurations: mockConfigWithoutDefaultIndex,
    });

    expect(mockRemoveFavoriteCollectible).toHaveBeenCalledWith(
      '0xdef456',
      1,
      mockLongPressedCollectible.current,
    );

    expect(mockRemoveAndIgnoreNft).toHaveBeenCalledWith('0xabc123', '789', {
      networkClientId: undefined,
      userAddress: '0xdef456',
    });
  });
});
