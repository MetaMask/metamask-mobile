import React from 'react';
import Collectibles from './';
import renderWithProvider from '../../../util/test/renderWithProvider';
import Engine from '../../../core/Engine';
import { refreshMetadata, removeNft } from './util';
import { toHex } from '@metamask/controller-utils';

describe('Collectibles', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(<Collectibles />);
    expect(toJSON()).toMatchSnapshot();
  });
});

describe('refreshMetadata', () => {
  const mockAddNft = jest.fn();
  const mockCollectible = {
    address: '0xabc123',
    tokenId: '789',
    chainId: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(Engine.context, {
      NftController: {
        addNft: mockAddNft,
      },
    });
  });

  it('should call NftController.addNft with correct arguments', () => {
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

    refreshMetadata(mockCollectible, mockConfig);

    expect(mockAddNft).toHaveBeenCalledWith(
      '0xabc123',
      '789',
      'specific-network-id',
    );
  });

  it('should handle missing network configuration gracefully', () => {
    refreshMetadata(mockCollectible, {});

    expect(mockAddNft).toHaveBeenCalledWith('0xabc123', '789', undefined);
  });

  it('should handle missing RPC endpoint gracefully', () => {
    const chainIdHex = toHex(1);
    const mockConfigWithoutRpc = {
      [chainIdHex]: {
        rpcEndpoints: [],
        defaultRpcEndpointIndex: 0,
      },
    };

    refreshMetadata(mockCollectible, mockConfigWithoutRpc);

    expect(mockAddNft).toHaveBeenCalledWith('0xabc123', '789', undefined);
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

    refreshMetadata(mockCollectible, mockConfigWithoutDefaultIndex);

    expect(mockAddNft).toHaveBeenCalledWith('0xabc123', '789', undefined);
  });
});

describe('removeNft', () => {
  const mockRemoveAndIgnoreNft = jest.fn();
  const mockRemoveFavoriteCollectible = jest.fn();
  const mockLongPressedCollectible = {
    address: '0xabc123',
    tokenId: '789',
    chainId: 1,
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
    const chainIdHex = toHex('1');
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

    removeNft(mockLongPressedCollectible, mockConfig, '0xdef456');

    expect(mockRemoveAndIgnoreNft).toHaveBeenCalledWith('0xabc123', '789', {
      networkClientId: 'specific-network-id',
      userAddress: '0xdef456',
    });
  });

  it('should handle missing network configuration gracefully', () => {
    removeNft(mockLongPressedCollectible, {}, '0xdef456');

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

    removeNft(mockLongPressedCollectible, mockConfigWithoutRpc, '0xdef456');

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

    removeNft(
      mockLongPressedCollectible,
      mockConfigWithoutDefaultIndex,
      '0xdef456',
    );

    expect(mockRemoveAndIgnoreNft).toHaveBeenCalledWith('0xabc123', '789', {
      networkClientId: undefined,
      userAddress: '0xdef456',
    });
  });
});
