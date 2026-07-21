import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector, useDispatch } from 'react-redux';
import { useNftDetection } from './useNftDetection';
import Engine from '../../core/Engine';
import { endTrace, trace } from '../../util/trace';
import { MetaMetricsEvents } from '../../core/Analytics';
import { useAnalytics } from './useAnalytics/useAnalytics';
import { createMockUseAnalyticsHook } from '../../util/test/analyticsMock';
import { useNftDetectionChainIds } from './useNftDetectionChainIds';
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

jest.mock('./useAnalytics/useAnalytics');
jest.mock('../../core/Analytics', () => ({
  MetaMetricsEvents: {
    COLLECTIBLE_ADDED: 'Collectible Added',
  },
}));

jest.mock('./useNftDetectionChainIds', () => ({
  useNftDetectionChainIds: jest.fn(),
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
  const mockUseAnalytics = jest.mocked(useAnalytics);
  const mockUseNftDetectionChainIds =
    useNftDetectionChainIds as jest.MockedFunction<
      typeof useNftDetectionChainIds
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

  const existingNft: Nft = {
    address: '0xNFT1',
    tokenId: '1',
    name: 'NFT 1',
    standard: 'ERC721',
  } as Nft;

  const newlyDetectedNft: Nft = {
    address: '0xNFT2',
    tokenId: '2',
    name: 'NFT 2',
    standard: 'ERC721',
    chainId: '0x1' as Hex,
  } as unknown as Nft;

  interface MockNftState {
    allNfts: Record<string, Record<string, Nft[]>>;
  }

  // State BEFORE detection — used as pre-await snapshot
  const mockNftControllerStateBefore: MockNftState = {
    allNfts: {
      [mockSelectedAddress.toLowerCase()]: {
        '0x1': [existingNft],
      },
    },
  };

  // State AFTER detection — returned after await resolves
  const mockNftControllerStateAfter: MockNftState = {
    allNfts: {
      [mockSelectedAddress.toLowerCase()]: {
        '0x1': [existingNft, newlyDetectedNft],
      },
    },
  };

  const mockEngine: {
    context: {
      NftDetectionController: { detectNfts: jest.Mock };
      NftController: { state: MockNftState };
      PreferencesController: { state: { useNftDetection: boolean } };
    };
  } = {
    context: {
      NftDetectionController: {
        detectNfts: mockDetectNfts,
      },
      NftController: {
        state: mockNftControllerStateBefore,
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

    mockUseDispatch.mockReturnValue(mockDispatch);
    mockUseSelector.mockReturnValue(mockSelectedAddress);

    mockAddProperties.mockReturnThis();
    mockBuild.mockReturnValue({ event: 'test-event', properties: {} });
    mockCreateEventBuilder.mockReturnValue({
      addProperties: mockAddProperties,
      build: mockBuild,
    });

    mockUseAnalytics.mockReturnValue(
      createMockUseAnalyticsHook({
        trackEvent: mockTrackEvent,
        createEventBuilder: mockCreateEventBuilder,
      }),
    );

    mockUseNftDetectionChainIds.mockReturnValue(mockChainIds);

    // Reset to "before" state
    mockEngine.context.NftController.state = mockNftControllerStateBefore;
    mockEngine.context.PreferencesController.state.useNftDetection = true;

    (Engine as unknown as { context: typeof mockEngine.context }).context =
      mockEngine.context;

    mockGetDecimalChainId.mockReturnValue(1);

    // When detectNfts resolves, simulate controller state having been updated
    mockDetectNfts.mockImplementation(async () => {
      mockEngine.context.NftController.state = mockNftControllerStateAfter;
    });
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

    it('dispatches showNftFetchingLoadingIndicator before detection by default', async () => {
      const { result } = renderHook(() => useNftDetection());

      await act(async () => {
        await result.current.detectNfts();
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        showNftFetchingLoadingIndicator(),
      );
    });

    it('dispatches hideNftFetchingLoadingIndicator after detection by default', async () => {
      const { result } = renderHook(() => useNftDetection());

      await act(async () => {
        await result.current.detectNfts();
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        hideNftFetchingLoadingIndicator(),
      );
    });

    it('does not dispatch loading indicators when showLoadingIndicator is false', async () => {
      const { result } = renderHook(() => useNftDetection());

      await act(async () => {
        await result.current.detectNfts(true, false);
      });

      expect(mockDispatch).not.toHaveBeenCalledWith(
        showNftFetchingLoadingIndicator(),
      );
      expect(mockDispatch).not.toHaveBeenCalledWith(
        hideNftFetchingLoadingIndicator(),
      );
    });

    it('calls NftDetectionController.detectNfts with firstPageOnly true by default', async () => {
      const { result } = renderHook(() => useNftDetection());

      await act(async () => {
        await result.current.detectNfts();
      });

      expect(mockDetectNfts).toHaveBeenCalledTimes(1);
      expect(mockDetectNfts).toHaveBeenCalledWith(mockChainIds, {
        firstPageOnly: true,
        signal: expect.any(AbortSignal),
      });
    });

    it('calls NftDetectionController.detectNfts with firstPageOnly false when specified', async () => {
      const { result } = renderHook(() => useNftDetection());

      await act(async () => {
        await result.current.detectNfts(false);
      });

      expect(mockDetectNfts).toHaveBeenCalledTimes(1);
      expect(mockDetectNfts).toHaveBeenCalledWith(mockChainIds, {
        firstPageOnly: false,
        signal: expect.any(AbortSignal),
      });
    });

    it('aborts previous detection when detectNfts is called again', async () => {
      let firstAbortSignal: AbortSignal | undefined;
      let secondAbortSignal: AbortSignal | undefined;

      mockDetectNfts.mockImplementation(
        async (_chainIds: Hex[], options?: { signal?: AbortSignal }) => {
          if (!firstAbortSignal) {
            firstAbortSignal = options?.signal;
          } else if (!secondAbortSignal) {
            secondAbortSignal = options?.signal;
          }
        },
      );

      const { result } = renderHook(() => useNftDetection());

      await act(async () => {
        await result.current.detectNfts();
      });

      await act(async () => {
        await result.current.detectNfts();
      });

      expect(firstAbortSignal).toBeDefined();
      expect(firstAbortSignal?.aborted).toBe(true);
      expect(secondAbortSignal).toBeDefined();
      expect(secondAbortSignal?.aborted).toBe(false);
    });

    it('starts trace before detection', async () => {
      const { result } = renderHook(() => useNftDetection());

      await act(async () => {
        await result.current.detectNfts();
      });

      expect(mockTrace).toHaveBeenCalledWith({ name: 'DetectNfts' });
    });

    it('ends trace after detection', async () => {
      const { result } = renderHook(() => useNftDetection());

      await act(async () => {
        await result.current.detectNfts();
      });

      expect(mockEndTrace).toHaveBeenCalledWith({ name: 'DetectNfts' });
    });

    it('tracks COLLECTIBLE_ADDED event for each newly detected NFT', async () => {
      mockGetDecimalChainId.mockReturnValue(1);

      const { result } = renderHook(() => useNftDetection());

      await act(async () => {
        await result.current.detectNfts();
      });

      // newlyDetectedNft (0xNFT2:2) was not in the pre-detection snapshot
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.COLLECTIBLE_ADDED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        chain_id: 1,
        source: 'detected',
      });
    });

    it('does not track events for NFTs that already existed before detection', async () => {
      // After detection state is the same as before — no new NFTs
      mockDetectNfts.mockImplementation(async () => {
        mockEngine.context.NftController.state = mockNftControllerStateBefore;
      });

      const { result } = renderHook(() => useNftDetection());

      await act(async () => {
        await result.current.detectNfts();
      });

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('does not track events when no NFTs exist after detection', async () => {
      mockDetectNfts.mockImplementation(async () => {
        mockEngine.context.NftController.state = {
          allNfts: { [mockSelectedAddress.toLowerCase()]: {} },
        };
      });

      const { result } = renderHook(() => useNftDetection());

      await act(async () => {
        await result.current.detectNfts();
      });

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('hides loading indicator even when detection fails', async () => {
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
  });

  describe('getNftDetectionAnalyticsParams', () => {
    it('returns correct analytics params for a valid NFT via trackEvent', async () => {
      mockGetDecimalChainId.mockReturnValue(137);

      // Set up state so newlyDetectedNft is on chain 0x89
      mockEngine.context.NftController.state = {
        allNfts: { [mockSelectedAddress.toLowerCase()]: {} },
      };
      mockDetectNfts.mockImplementation(async () => {
        mockEngine.context.NftController.state = {
          allNfts: {
            [mockSelectedAddress.toLowerCase()]: {
              '0x89': [
                {
                  address: '0xNFT3',
                  tokenId: '3',
                  chainId: '0x89' as Hex,
                  standard: 'ERC721',
                } as unknown as Nft,
              ],
            },
          },
        };
      });

      const { result } = renderHook(() => useNftDetection());

      await act(async () => {
        await result.current.detectNfts();
      });

      expect(mockGetDecimalChainId).toHaveBeenCalledWith('0x89');
      expect(mockAddProperties).toHaveBeenCalledWith({
        chain_id: 137,
        source: 'detected',
      });
    });

    it('skips event when getDecimalChainId throws', async () => {
      mockGetDecimalChainId.mockImplementation(() => {
        throw new Error('Invalid chainId');
      });

      mockEngine.context.NftController.state = {
        allNfts: { [mockSelectedAddress.toLowerCase()]: {} },
      };
      mockDetectNfts.mockImplementation(async () => {
        mockEngine.context.NftController.state = {
          allNfts: {
            [mockSelectedAddress.toLowerCase()]: {
              '0x1': [
                {
                  address: '0xNFT4',
                  tokenId: '4',
                  chainId: 'invalid' as Hex,
                  standard: 'ERC721',
                } as unknown as Nft,
              ],
            },
          },
        };
      });

      const { result } = renderHook(() => useNftDetection());

      await act(async () => {
        await result.current.detectNfts();
      });

      expect(mockTrackEvent).not.toHaveBeenCalled();
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.any(Error),
        'useNftDetection.getNftDetectionAnalyticsParams',
      );
    });
  });

  describe('abortDetection', () => {
    it('aborts in-progress detection', async () => {
      let capturedSignal: AbortSignal | undefined;

      mockDetectNfts.mockImplementation(
        async (_chainIds: Hex[], options?: { signal?: AbortSignal }) => {
          capturedSignal = options?.signal;
        },
      );

      const { result } = renderHook(() => useNftDetection());

      await act(async () => {
        await result.current.detectNfts();
      });

      act(() => {
        result.current.abortDetection();
      });

      expect(capturedSignal).toBeDefined();
      expect(capturedSignal?.aborted).toBe(true);
    });

    it('does nothing when no detection is in progress', () => {
      const { result } = renderHook(() => useNftDetection());

      expect(() => {
        act(() => {
          result.current.abortDetection();
        });
      }).not.toThrow();
    });
  });

  describe('return value', () => {
    it('returns detectNfts, abortDetection functions and chainIdsToDetectNftsFor', () => {
      const { result } = renderHook(() => useNftDetection());

      expect(result.current).toEqual({
        detectNfts: expect.any(Function),
        abortDetection: expect.any(Function),
        chainIdsToDetectNftsFor: mockChainIds,
      });
    });
  });
});
