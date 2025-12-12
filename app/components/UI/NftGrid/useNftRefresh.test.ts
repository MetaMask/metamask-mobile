import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useNftRefresh } from './useNftRefresh';
import Engine from '../../../core/Engine';
import Logger from '../../../util/Logger';
import { endTrace, trace, TraceName } from '../../../util/trace';
import { MetaMetricsEvents, useMetrics } from '../../hooks/useMetrics';
import { useNftDetectionChainIds } from '../../hooks/useNftDetectionChainIds';
import { prepareNftDetectionEvents } from '../../../util/assets';
import { getDecimalChainId } from '../../../util/networks';
import { Nft } from '@metamask/assets-controllers';
import { Hex } from '@metamask/utils';

jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector) => selector()),
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    NftDetectionController: {
      detectNfts: jest.fn(),
    },
    NftController: {
      state: {
        allNfts: {},
      },
      checkAndUpdateAllNftsOwnershipStatus: jest.fn(),
    },
  },
}));
jest.mock('../../../util/Logger', () => ({
  error: jest.fn(),
}));
jest.mock('../../../util/trace', () => ({
  trace: jest.fn(),
  endTrace: jest.fn(),
  TraceName: {
    DetectNfts: 'DetectNfts',
  },
}));
jest.mock('../../hooks/useMetrics', () => ({
  useMetrics: jest.fn(),
  MetaMetricsEvents: {
    COLLECTIBLE_ADDED: 'COLLECTIBLE_ADDED',
  },
}));
jest.mock('../../hooks/useNftDetectionChainIds', () => ({
  useNftDetectionChainIds: jest.fn(),
}));
jest.mock('../../../util/assets', () => ({
  prepareNftDetectionEvents: jest.fn(),
}));
jest.mock('../../../util/networks', () => ({
  getDecimalChainId: jest.fn(),
}));

jest.mock('../../../selectors/accountsController', () => ({
  selectSelectedInternalAccountFormattedAddress: jest.fn(() => '0x123'),
}));

jest.mock('../../../selectors/networkController', () => ({
  selectEvmNetworkConfigurationsByChainId: jest.fn(() => ({
    '0x1': {
      defaultRpcEndpointIndex: 0,
      rpcEndpoints: [{ networkClientId: 'mainnet-client' }],
    },
    '0x89': {
      defaultRpcEndpointIndex: 0,
      rpcEndpoints: [{ networkClientId: 'polygon-client' }],
    },
  })),
}));

jest.mock('../../../selectors/preferencesController', () => ({
  selectTokenNetworkFilter: jest.fn(() => ({
    '0x1': true,
    '0x89': true,
  })),
}));

describe('useNftRefresh', () => {
  const mockDetectNfts = jest.fn();
  const mockCheckAndUpdateAllNftsOwnershipStatus = jest.fn();
  const mockTrackEvent = jest.fn();
  const mockCreateEventBuilder = jest.fn();
  const mockAddProperties = jest.fn();
  const mockBuild = jest.fn();
  const mockTrace = trace as jest.MockedFunction<typeof trace>;
  const mockEndTrace = endTrace as jest.MockedFunction<typeof endTrace>;
  const mockUseMetrics = useMetrics as jest.MockedFunction<typeof useMetrics>;
  const mockUseNftDetectionChainIds =
    useNftDetectionChainIds as jest.MockedFunction<
      typeof useNftDetectionChainIds
    >;
  const mockPrepareNftDetectionEvents = jest.mocked(prepareNftDetectionEvents);
  const mockGetDecimalChainId = jest.mocked(getDecimalChainId);

  const mockSelectedAddress = '0x1234567890abcdef';
  const mockChainIds = ['0x1', '0x89'] as Hex[];

  const mockPreviousNfts = {
    '0x1': [
      {
        address: '0xNFT1',
        tokenId: '1',
        name: 'NFT 1',
        chainId: '0x1' as Hex,
        standard: 'ERC721',
      } as Nft,
    ],
  };

  const mockNewNfts = {
    '0x1': [
      {
        address: '0xNFT1',
        tokenId: '1',
        name: 'NFT 1',
        chainId: '0x1' as Hex,
        standard: 'ERC721',
      } as Nft,
      {
        address: '0xNFT2',
        tokenId: '2',
        name: 'NFT 2',
        chainId: '0x1' as Hex,
        standard: 'ERC721',
      } as Nft,
    ],
  };

  const mockNftControllerState = {
    allNfts: {
      [mockSelectedAddress.toLowerCase()]: mockNewNfts,
    },
  };

  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDetectNfts.mockResolvedValue(undefined);
    mockCheckAndUpdateAllNftsOwnershipStatus.mockResolvedValue(undefined);
    mockBuild.mockReturnValue({ event: 'mock-event' });
    mockAddProperties.mockReturnValue({ build: mockBuild });
    mockCreateEventBuilder.mockReturnValue({
      addProperties: mockAddProperties,
      build: mockBuild,
    });
    mockUseMetrics.mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
      isEnabled: jest.fn().mockReturnValue(true),
      enable: jest.fn(),
      addTraitsToUser: jest.fn(),
      createDataDeletionTask: jest.fn(),
      checkDataDeleteStatus: jest.fn(),
      getMetaMetricsId: jest.fn(),
      isDataRecorded: jest.fn().mockReturnValue(true),
      getDeleteRegulationId: jest.fn(),
      getDeleteRegulationCreationDate: jest.fn(),
    } as ReturnType<typeof useMetrics>);

    mockUseNftDetectionChainIds.mockReturnValue(mockChainIds);
    mockGetDecimalChainId.mockReturnValue(1);
    mockPrepareNftDetectionEvents.mockReturnValue([
      { chain_id: 1, source: 'detected' as const },
    ]);

    (
      Engine.context.NftDetectionController.detectNfts as jest.Mock
    ).mockImplementation(mockDetectNfts);
    Engine.context.NftController.state = mockNftControllerState;
    (
      Engine.context.NftController
        .checkAndUpdateAllNftsOwnershipStatus as jest.Mock
    ).mockImplementation(mockCheckAndUpdateAllNftsOwnershipStatus);

    // Mock useSelector
    const {
      selectSelectedInternalAccountFormattedAddress,
    } = require('../../../selectors/accountsController');
    const { selectEvmNetworkConfigurationsByChainId } = require(
      '../../../selectors/networkController',
    );
    const { selectTokenNetworkFilter } = require(
      '../../../selectors/preferencesController',
    );

    mockUseSelector.mockImplementation((selector: any) => {
      if (selector === selectSelectedInternalAccountFormattedAddress) {
        return mockSelectedAddress;
      }
      if (selector === selectEvmNetworkConfigurationsByChainId) {
        return {
          '0x1': {
            defaultRpcEndpointIndex: 0,
            rpcEndpoints: [{ networkClientId: 'mainnet-client' }],
          },
          '0x89': {
            defaultRpcEndpointIndex: 0,
            rpcEndpoints: [{ networkClientId: 'polygon-client' }],
          },
        };
      }
      if (selector === selectTokenNetworkFilter) {
        return {
          '0x1': true,
          '0x89': true,
        };
      }
      return selector({});
    });
  });

  it('returns refreshing and onRefresh', () => {
    const { result } = renderHook(() => useNftRefresh());

    expect(result.current.refreshing).toBe(false);
    expect(result.current.onRefresh).toBeDefined();
    expect(typeof result.current.onRefresh).toBe('function');
  });

  it('sets refreshing to false after refresh completes', async () => {
    const { result } = renderHook(() => useNftRefresh());

    expect(result.current.refreshing).toBe(false);

    await act(async () => {
      await result.current.onRefresh();
    });

    expect(result.current.refreshing).toBe(false);
  });

  it('returns early if no address is selected', async () => {
    const {
      selectSelectedInternalAccountFormattedAddress,
    } = require('../../../selectors/accountsController');

    mockUseSelector.mockImplementation((selector: any) => {
      if (selector === selectSelectedInternalAccountFormattedAddress) {
        return null;
      }
      return selector({});
    });

    const { result } = renderHook(() => useNftRefresh());

    await act(async () => {
      await result.current.onRefresh();
    });

    expect(mockDetectNfts).not.toHaveBeenCalled();
    expect(mockCheckAndUpdateAllNftsOwnershipStatus).not.toHaveBeenCalled();
  });

  it('calls NftDetectionController.detectNfts with correct chainIds', async () => {
    const { result } = renderHook(() => useNftRefresh());

    await act(async () => {
      await result.current.onRefresh();
    });

    expect(mockDetectNfts).toHaveBeenCalledWith(mockChainIds);
  });

  it('calls NftController.checkAndUpdateAllNftsOwnershipStatus for each network', async () => {
    const { result } = renderHook(() => useNftRefresh());

    await act(async () => {
      await result.current.onRefresh();
    });

    expect(mockCheckAndUpdateAllNftsOwnershipStatus).toHaveBeenCalledWith(
      'mainnet-client',
    );
    expect(mockCheckAndUpdateAllNftsOwnershipStatus).toHaveBeenCalledWith(
      'polygon-client',
    );
    expect(mockCheckAndUpdateAllNftsOwnershipStatus).toHaveBeenCalledTimes(2);
  });

  it('calls prepareNftDetectionEvents with previous and new NFT states', async () => {
    // Set initial state to previous NFTs
    Engine.context.NftController.state = {
      allNfts: {
        [mockSelectedAddress.toLowerCase()]: mockPreviousNfts,
      },
    };

    // Make detectNfts update the state to new NFTs
    mockDetectNfts.mockImplementation(async () => {
      Engine.context.NftController.state = {
        allNfts: {
          [mockSelectedAddress.toLowerCase()]: mockNewNfts,
        },
      };
    });

    const { result } = renderHook(() => useNftRefresh());

    await act(async () => {
      await result.current.onRefresh();
    });

    expect(mockPrepareNftDetectionEvents).toHaveBeenCalledWith(
      mockPreviousNfts,
      mockNewNfts,
      expect.any(Function),
    );
  });

  it('tracks analytics events for newly detected NFTs', async () => {
    // Set initial state to previous NFTs
    Engine.context.NftController.state = {
      allNfts: {
        [mockSelectedAddress.toLowerCase()]: mockPreviousNfts,
      },
    };

    // Make detectNfts update the state to new NFTs
    mockDetectNfts.mockImplementation(async () => {
      Engine.context.NftController.state = {
        allNfts: {
          [mockSelectedAddress.toLowerCase()]: mockNewNfts,
        },
      };
    });

    const { result } = renderHook(() => useNftRefresh());

    await act(async () => {
      await result.current.onRefresh();
    });

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.COLLECTIBLE_ADDED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      chain_id: 1,
      source: 'detected',
    });
    expect(mockTrackEvent).toHaveBeenCalledWith({ event: 'mock-event' });
  });

  it('calls trace and endTrace correctly', async () => {
    const { result } = renderHook(() => useNftRefresh());

    await act(async () => {
      await result.current.onRefresh();
    });

    expect(mockTrace).toHaveBeenCalledWith({ name: TraceName.DetectNfts });
    expect(mockEndTrace).toHaveBeenCalledWith({ name: TraceName.DetectNfts });
  });

  it('handles errors gracefully', async () => {
    const mockError = new Error('Detection failed');
    mockDetectNfts.mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useNftRefresh());

    await act(async () => {
      await result.current.onRefresh();
    });

    // Should still set refreshing to false even if error occurs
    expect(result.current.refreshing).toBe(false);
    expect(mockEndTrace).toHaveBeenCalled();
  });

  it('handles empty network client IDs', async () => {
    const {
      selectSelectedInternalAccountFormattedAddress,
    } = require('../../../selectors/accountsController');
    const { selectTokenNetworkFilter } = require(
      '../../../selectors/preferencesController',
    );

    mockUseSelector.mockImplementation((selector: any) => {
      if (selector === selectSelectedInternalAccountFormattedAddress) {
        return mockSelectedAddress;
      }
      if (selector === selectTokenNetworkFilter) {
        return {}; // Empty filter
      }
      return selector({});
    });

    const { result } = renderHook(() => useNftRefresh());

    await act(async () => {
      await result.current.onRefresh();
    });

    // Should still call detectNfts even with no network client IDs
    expect(mockDetectNfts).toHaveBeenCalled();
    expect(mockCheckAndUpdateAllNftsOwnershipStatus).not.toHaveBeenCalled();
  });

  it('handles network configurations without networkClientId', async () => {
    const {
      selectSelectedInternalAccountFormattedAddress,
    } = require('../../../selectors/accountsController');
    const { selectEvmNetworkConfigurationsByChainId } = require(
      '../../../selectors/networkController',
    );
    const { selectTokenNetworkFilter } = require(
      '../../../selectors/preferencesController',
    );

    mockUseSelector.mockImplementation((selector: any) => {
      if (selector === selectSelectedInternalAccountFormattedAddress) {
        return mockSelectedAddress;
      }
      if (selector === selectEvmNetworkConfigurationsByChainId) {
        return {
          '0x1': {
            defaultRpcEndpointIndex: 0,
            rpcEndpoints: [{ networkClientId: undefined }], // No networkClientId
          },
        };
      }
      if (selector === selectTokenNetworkFilter) {
        return { '0x1': true };
      }
      return selector({});
    });

    const { result } = renderHook(() => useNftRefresh());

    await act(async () => {
      await result.current.onRefresh();
    });

    // Should not call checkAndUpdateAllNftsOwnershipStatus for invalid network
    expect(mockCheckAndUpdateAllNftsOwnershipStatus).not.toHaveBeenCalled();
  });

  it('does not track events when prepareNftDetectionEvents returns empty array', async () => {
    mockPrepareNftDetectionEvents.mockReturnValueOnce([]);

    const { result } = renderHook(() => useNftRefresh());

    await act(async () => {
      await result.current.onRefresh();
    });

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('handles getNftDetectionAnalyticsParams error gracefully', async () => {
    mockGetDecimalChainId.mockImplementationOnce(() => {
      throw new Error('Invalid chain ID');
    });

    mockPrepareNftDetectionEvents.mockImplementationOnce(
      (_prev, _next, getAnalyticsParams) => {
        const mockNft = {
          address: '0xNFT1',
          tokenId: '1',
          name: 'NFT 1',
          chainId: '0x1' as Hex,
          standard: 'ERC721',
        } as Nft;
        getAnalyticsParams(mockNft);
        return [];
      },
    );

    // Set initial state to previous NFTs
    Engine.context.NftController.state = {
      allNfts: {
        [mockSelectedAddress.toLowerCase()]: mockPreviousNfts,
      },
    };

    // Make detectNfts update the state to new NFTs
    mockDetectNfts.mockImplementation(async () => {
      Engine.context.NftController.state = {
        allNfts: {
          [mockSelectedAddress.toLowerCase()]: mockNewNfts,
        },
      };
    });

    const { result } = renderHook(() => useNftRefresh());

    await act(async () => {
      await result.current.onRefresh();
    });

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'useNftRefresh.getNftDetectionAnalyticsParams',
    );
  });
});

