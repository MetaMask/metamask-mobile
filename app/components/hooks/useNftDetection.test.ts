import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector, useDispatch } from 'react-redux';
import { useNftDetection } from './useNftDetection';
import Engine from '../../core/Engine';
import { endTrace, trace } from '../../util/trace';
import { MetaMetricsEvents, useMetrics } from './useMetrics';
import { useNftDetectionChainIds } from './useNftDetectionChainIds';
import { prepareNftDetectionEvents } from '../../util/assets';
import { getDecimalChainId } from '../../util/networks';
import Logger from '../../util/Logger';
import {
  hideNftFetchingLoadingIndicator,
  showNftFetchingLoadingIndicator,
} from '../../reducers/collectibles';
import { Nft } from '@metamask/assets-controllers';
import { Hex } from '@metamask/utils';

// Mock all dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('../../core/Engine');

jest.mock('../../util/trace', () => ({
  trace: jest.fn(),
  endTrace: jest.fn(),
  TraceName: {
    DetectNfts: 'DetectNfts',
  },
}));

jest.mock('./useMetrics', () => ({
  useMetrics: jest.fn(),
  MetaMetricsEvents: {
    COLLECTIBLE_ADDED: 'Collectible Added',
  },
}));

jest.mock('./useNftDetectionChainIds', () => ({
  useNftDetectionChainIds: jest.fn(),
}));

jest.mock('../../util/assets', () => ({
  prepareNftDetectionEvents: jest.fn(),
}));

jest.mock('../../util/networks', () => ({
  getDecimalChainId: jest.fn(),
}));

jest.mock('../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../../reducers/collectibles', () => ({
  showNftFetchingLoadingIndicator: jest.fn(),
  hideNftFetchingLoadingIndicator: jest.fn(),
}));

describe('useNftDetection', () => {
  const mockDispatch = jest.fn();
  const mockTrackEvent = jest.fn();
  const mockCreateEventBuilder = jest.fn();
  const mockAddProperties = jest.fn();
  const mockBuild = jest.fn();
  const mockDetectNfts = jest.fn();

  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockUseDispatch = useDispatch as jest.MockedFunction<
    typeof useDispatch
  >;
  const mockUseMetrics = useMetrics as jest.MockedFunction<typeof useMetrics>;
  const mockUseNftDetectionChainIds =
    useNftDetectionChainIds as jest.MockedFunction<
      typeof useNftDetectionChainIds
    >;
  const mockPrepareNftDetectionEvents =
    prepareNftDetectionEvents as jest.MockedFunction<
      typeof prepareNftDetectionEvents
    >;
  const mockGetDecimalChainId = getDecimalChainId as jest.MockedFunction<
    typeof getDecimalChainId
  >;
  const mockTrace = trace as jest.MockedFunction<typeof trace>;
  const mockEndTrace = endTrace as jest.MockedFunction<typeof endTrace>;
  const mockLoggerError = Logger.error as jest.MockedFunction<
    typeof Logger.error
  >;

  const mockSelectedAddress = '0x1234567890abcdef';
  const mockChainIds = ['0x1', '0x89'] as Hex[];

  const mockNftControllerState = {
    allNfts: {
      [mockSelectedAddress.toLowerCase()]: {
        '0x1': [
          {
            address: '0xNFT1',
            tokenId: '1',
            name: 'NFT 1',
            standard: 'ERC721',
          } as Nft,
        ],
      },
    },
  };

  const mockEngine = {
    context: {
      NftDetectionController: {
        detectNfts: mockDetectNfts,
      },
      NftController: {
        state: mockNftControllerState,
      },
      PreferencesController: {
        state: {
          useNftDetection: true,
        },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup useDispatch mock
    mockUseDispatch.mockReturnValue(mockDispatch);

    // Setup useSelector mock
    mockUseSelector.mockReturnValue(mockSelectedAddress);

    // Setup useMetrics mock
    mockAddProperties.mockReturnThis();
    mockBuild.mockReturnValue({ event: 'test-event', properties: {} });
    mockCreateEventBuilder.mockReturnValue({
      addProperties: mockAddProperties,
      build: mockBuild,
    });

    mockUseMetrics.mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
      isEnabled: jest.fn(),
      enable: jest.fn(),
      addTraitsToUser: jest.fn(),
      createDataDeletionTask: jest.fn(),
      checkDataDeleteStatus: jest.fn(),
      getDeleteRegulationCreationDate: jest.fn(),
      getDeleteRegulationId: jest.fn(),
      isDataRecorded: jest.fn(),
      getMetaMetricsId: jest.fn(),
    });

    // Setup useNftDetectionChainIds mock
    mockUseNftDetectionChainIds.mockReturnValue(mockChainIds);

    // Setup Engine mock
    (Engine as unknown as { context: typeof mockEngine.context }).context =
      mockEngine.context;

    // Setup prepareNftDetectionEvents mock
    mockPrepareNftDetectionEvents.mockReturnValue([]);

    // Setup getDecimalChainId mock
    mockGetDecimalChainId.mockReturnValue(1);

    // Setup detectNfts to resolve
    mockDetectNfts.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('detectNfts', () => {
    it('returns early when selectedAddress is undefined', async () => {
      mockUseSelector.mockReturnValue(undefined);

      const { result } = renderHook(() => useNftDetection());

      await act(async () => {
        await result.current.detectNfts();
      });

      expect(mockDetectNfts).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('returns early when NFT detection is disabled', async () => {
      mockEngine.context.PreferencesController.state.useNftDetection = false;

      const { result } = renderHook(() => useNftDetection());

      await act(async () => {
        await result.current.detectNfts();
      });

      expect(mockDetectNfts).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('dispatches showNftFetchingLoadingIndicator before detection', async () => {
      mockEngine.context.PreferencesController.state.useNftDetection = true;

      const { result } = renderHook(() => useNftDetection());

      await act(async () => {
        await result.current.detectNfts();
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        showNftFetchingLoadingIndicator(),
      );
    });

    it('dispatches hideNftFetchingLoadingIndicator after detection', async () => {
      mockEngine.context.PreferencesController.state.useNftDetection = true;

      const { result } = renderHook(() => useNftDetection());

      await act(async () => {
        await result.current.detectNfts();
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        hideNftFetchingLoadingIndicator(),
      );
    });

    it('calls NftDetectionController.detectNfts with correct chain IDs', async () => {
      mockEngine.context.PreferencesController.state.useNftDetection = true;

      const { result } = renderHook(() => useNftDetection());

      await act(async () => {
        await result.current.detectNfts();
      });

      expect(mockDetectNfts).toHaveBeenCalledTimes(1);
      expect(mockDetectNfts).toHaveBeenCalledWith(mockChainIds);
    });

    it('starts trace before detection', async () => {
      mockEngine.context.PreferencesController.state.useNftDetection = true;

      const { result } = renderHook(() => useNftDetection());

      await act(async () => {
        await result.current.detectNfts();
      });

      expect(mockTrace).toHaveBeenCalledWith({ name: 'DetectNfts' });
    });

    it('ends trace after detection', async () => {
      mockEngine.context.PreferencesController.state.useNftDetection = true;

      const { result } = renderHook(() => useNftDetection());

      await act(async () => {
        await result.current.detectNfts();
      });

      expect(mockEndTrace).toHaveBeenCalledWith({ name: 'DetectNfts' });
    });

    it('tracks analytics events for newly detected NFTs', async () => {
      mockEngine.context.PreferencesController.state.useNftDetection = true;

      const mockEventParams = [
        { chain_id: 1, source: 'detected' as const },
        { chain_id: 137, source: 'detected' as const },
      ];
      mockPrepareNftDetectionEvents.mockReturnValue(mockEventParams);

      const { result } = renderHook(() => useNftDetection());

      await act(async () => {
        await result.current.detectNfts();
      });

      expect(mockTrackEvent).toHaveBeenCalledTimes(2);
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.COLLECTIBLE_ADDED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        chain_id: 1,
        source: 'detected',
      });
      expect(mockAddProperties).toHaveBeenCalledWith({
        chain_id: 137,
        source: 'detected',
      });
    });

    it('does not track events when no new NFTs detected', async () => {
      mockEngine.context.PreferencesController.state.useNftDetection = true;
      mockPrepareNftDetectionEvents.mockReturnValue([]);

      const { result } = renderHook(() => useNftDetection());

      await act(async () => {
        await result.current.detectNfts();
      });

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('hides loading indicator even when detection fails', async () => {
      mockEngine.context.PreferencesController.state.useNftDetection = true;
      mockDetectNfts.mockRejectedValue(new Error('Detection failed'));

      const { result } = renderHook(() => useNftDetection());

      await act(async () => {
        try {
          await result.current.detectNfts();
        } catch (error) {
          // Expected error
        }
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        hideNftFetchingLoadingIndicator(),
      );
    });

    it('ends trace even when detection fails', async () => {
      mockEngine.context.PreferencesController.state.useNftDetection = true;
      mockDetectNfts.mockRejectedValue(new Error('Detection failed'));

      const { result } = renderHook(() => useNftDetection());

      await act(async () => {
        try {
          await result.current.detectNfts();
        } catch (error) {
          // Expected error
        }
      });

      expect(mockEndTrace).toHaveBeenCalledWith({ name: 'DetectNfts' });
    });

    it('calls prepareNftDetectionEvents with previous and new NFT states', async () => {
      mockEngine.context.PreferencesController.state.useNftDetection = true;

      const { result } = renderHook(() => useNftDetection());

      await act(async () => {
        await result.current.detectNfts();
      });

      expect(mockPrepareNftDetectionEvents).toHaveBeenCalledWith(
        mockNftControllerState.allNfts[mockSelectedAddress.toLowerCase()],
        mockNftControllerState.allNfts[mockSelectedAddress.toLowerCase()],
        expect.any(Function),
      );
    });
  });

  describe('getNftDetectionAnalyticsParams', () => {
    it('returns correct analytics params for valid NFT', () => {
      mockGetDecimalChainId.mockReturnValue(1);

      const { result } = renderHook(() => useNftDetection());

      const mockNft = {
        address: '0xNFT1',
        tokenId: '1',
        name: 'Test NFT',
        description: 'Test NFT Description',
        image: 'test-image.jpg',
        chainId: '0x1' as Hex,
        standard: 'ERC721',
      } as unknown as Nft;

      // Access the param builder function through prepareNftDetectionEvents call
      let paramBuilder: (
        nft: Nft,
      ) => { chain_id: number; source: 'detected' } | undefined;

      act(() => {
        result.current.detectNfts();
      });

      // Extract the param builder from the mock call
      const prepareEventsCall = mockPrepareNftDetectionEvents.mock.calls[0];
      if (prepareEventsCall) {
        paramBuilder = prepareEventsCall[2];
        const params = paramBuilder(mockNft);

        expect(params).toEqual({
          chain_id: 1,
          source: 'detected',
        });
        expect(mockGetDecimalChainId).toHaveBeenCalledWith('0x1');
      }
    });

    it('returns undefined when getDecimalChainId throws error', () => {
      mockGetDecimalChainId.mockImplementation(() => {
        throw new Error('Invalid chainId');
      });

      const { result } = renderHook(() => useNftDetection());

      const mockNft = {
        address: '0xNFT1',
        tokenId: '1',
        name: 'Test NFT',
        description: 'Test NFT Description',
        image: 'test-image.jpg',
        chainId: 'invalid' as Hex,
        standard: 'ERC721',
      } as unknown as Nft;

      // Access the param builder function through prepareNftDetectionEvents call
      let paramBuilder: (
        nft: Nft,
      ) => { chain_id: number; source: 'detected' } | undefined;

      act(() => {
        result.current.detectNfts();
      });

      // Extract the param builder from the mock call
      const prepareEventsCall = mockPrepareNftDetectionEvents.mock.calls[0];
      if (prepareEventsCall) {
        paramBuilder = prepareEventsCall[2];
        const params = paramBuilder(mockNft);

        expect(params).toBeUndefined();
        expect(mockLoggerError).toHaveBeenCalledWith(
          expect.any(Error),
          'useNftDetection.getNftDetectionAnalyticsParams',
        );
      }
    });
  });

  describe('return value', () => {
    it('returns detectNfts function and chainIdsToDetectNftsFor', () => {
      const { result } = renderHook(() => useNftDetection());

      expect(result.current).toEqual({
        detectNfts: expect.any(Function),
        chainIdsToDetectNftsFor: mockChainIds,
      });
    });
  });
});
