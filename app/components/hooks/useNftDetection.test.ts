import {
  renderHookWithProvider,
  DeepPartial,
} from '../../util/test/renderWithProvider';
import { useNftDetection } from './useNftDetection';
import { backgroundState } from '../../util/test/initial-root-state';
import Engine from '../../core/Engine';
import { RootState } from '../../reducers';

jest.mock('../../core/Engine', () => ({
  context: {
    NftDetectionController: {
      detectNfts: jest.fn(),
    },
    NftController: {
      state: {
        allNfts: {},
      },
    },
  },
}));

const mockShowLoadingIndicator = jest.fn(() => ({
  type: 'SHOW_NFT_FETCHING_LOADING',
}));

const mockHideLoadingIndicator = jest.fn(() => ({
  type: 'HIDE_NFT_FETCHING_LOADING',
}));

jest.mock('../../reducers/collectibles', () => ({
  ...jest.requireActual('../../reducers/collectibles'),
  showNftFetchingLoadingIndicator: mockShowLoadingIndicator,
  hideNftFetchingLoadingIndicator: mockHideLoadingIndicator,
}));

jest.mock('./useNftDetectionChainIds', () => ({
  useNftDetectionChainIds: () => ['0x1', '0x89'],
}));

jest.mock('./useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn(() => ({
        build: jest.fn(() => ({})),
      })),
    })),
  }),
  MetaMetricsEvents: {
    COLLECTIBLE_ADDED: 'COLLECTIBLE_ADDED',
  },
}));

jest.mock('../../util/trace', () => ({
  trace: jest.fn(),
  endTrace: jest.fn(),
  TraceName: {
    DetectNfts: 'DetectNfts',
  },
}));

const mockPrepareNftDetectionEvents = jest.fn();
jest.mock('../../util/assets', () => ({
  prepareNftDetectionEvents: mockPrepareNftDetectionEvents,
}));

const mockAddress = '0x1234567890123456789012345678901234567890';

const createMockState = (
  address?: string,
  isNftDetectionEnabled = true,
): DeepPartial<RootState> => ({
  engine: {
    backgroundState: {
      ...backgroundState,
      PreferencesController: {
        ...backgroundState.PreferencesController,
        useNftDetection: isNftDetectionEnabled,
      },
      AccountsController: {
        ...backgroundState.AccountsController,
        internalAccounts: {
          ...backgroundState.AccountsController.internalAccounts,
          accounts: address
            ? {
                'mock-id': {
                  id: 'mock-id',
                  address,
                  type: 'eip155:eoa',
                  metadata: {
                    name: 'Account 1',
                    keyring: { type: 'HD Key Tree' },
                  },
                },
              }
            : {},
          selectedAccount: address ? 'mock-id' : '',
        },
      },
    },
  },
});

describe('useNftDetection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Engine.context.NftController.state.allNfts as Record<string, unknown>) =
      {};
    mockPrepareNftDetectionEvents.mockReturnValue([]);
  });

  it('returns detectNfts function and chainIdsToDetectNftsFor', () => {
    const { result } = renderHookWithProvider(() => useNftDetection(), {
      state: createMockState(mockAddress),
    });

    expect(result.current.detectNfts).toBeDefined();
    expect(typeof result.current.detectNfts).toBe('function');
    expect(result.current.chainIdsToDetectNftsFor).toEqual(['0x1', '0x89']);
  });

  it('returns early without calling NftDetectionController when no address is selected', async () => {
    const mockDetectNfts = jest.fn().mockResolvedValue(undefined);
    Engine.context.NftDetectionController.detectNfts = mockDetectNfts;

    const { result } = renderHookWithProvider(() => useNftDetection(), {
      state: createMockState(),
    });

    await result.current.detectNfts();

    expect(mockDetectNfts).not.toHaveBeenCalled();
    expect(mockShowLoadingIndicator).not.toHaveBeenCalled();
  });

  it('returns early without calling NftDetectionController when NFT detection is disabled', async () => {
    const mockDetectNfts = jest.fn().mockResolvedValue(undefined);
    Engine.context.NftDetectionController.detectNfts = mockDetectNfts;

    const { result } = renderHookWithProvider(() => useNftDetection(), {
      state: createMockState(mockAddress, false),
    });

    await result.current.detectNfts();

    expect(mockDetectNfts).not.toHaveBeenCalled();
    expect(mockShowLoadingIndicator).not.toHaveBeenCalled();
  });

  it('dispatches show and hide loading indicators during detection', async () => {
    const mockDetectNfts = jest.fn().mockResolvedValue(undefined);
    Engine.context.NftDetectionController.detectNfts = mockDetectNfts;

    const { result, store } = renderHookWithProvider(() => useNftDetection(), {
      state: createMockState(mockAddress),
    });

    const dispatchSpy = jest.spyOn(store, 'dispatch');

    await result.current.detectNfts();

    expect(mockShowLoadingIndicator).toHaveBeenCalled();
    expect(mockHideLoadingIndicator).toHaveBeenCalled();
    expect(dispatchSpy).toHaveBeenCalledWith({
      type: 'SHOW_NFT_FETCHING_LOADING',
    });
    expect(dispatchSpy).toHaveBeenCalledWith({
      type: 'HIDE_NFT_FETCHING_LOADING',
    });
  });

  it('calls NftDetectionController.detectNfts with enabled chain IDs', async () => {
    const mockDetectNfts = jest.fn().mockResolvedValue(undefined);
    Engine.context.NftDetectionController.detectNfts = mockDetectNfts;

    const { result } = renderHookWithProvider(() => useNftDetection(), {
      state: createMockState(mockAddress),
    });

    await result.current.detectNfts();

    expect(mockDetectNfts).toHaveBeenCalledWith(['0x1', '0x89']);
    expect(mockDetectNfts).toHaveBeenCalledTimes(1);
  });

  it('hides loading indicator in finally block when detection fails', async () => {
    const mockError = new Error('Detection failed');
    const mockDetectNfts = jest.fn().mockRejectedValue(mockError);
    Engine.context.NftDetectionController.detectNfts = mockDetectNfts;

    const { result, store } = renderHookWithProvider(() => useNftDetection(), {
      state: createMockState(mockAddress),
    });

    const dispatchSpy = jest.spyOn(store, 'dispatch');

    await result.current.detectNfts();

    expect(mockHideLoadingIndicator).toHaveBeenCalled();
    expect(dispatchSpy).toHaveBeenCalledWith({
      type: 'HIDE_NFT_FETCHING_LOADING',
    });
  });

  it('tracks analytics events for each newly detected NFT', async () => {
    const mockDetectNfts = jest.fn().mockResolvedValue(undefined);
    Engine.context.NftDetectionController.detectNfts = mockDetectNfts;

    mockPrepareNftDetectionEvents.mockReturnValueOnce([
      { chain_id: '1', source: 'detected' },
      { chain_id: '137', source: 'detected' },
    ]);

    const { result } = renderHookWithProvider(() => useNftDetection(), {
      state: createMockState(mockAddress),
    });

    await result.current.detectNfts();

    expect(mockPrepareNftDetectionEvents).toHaveBeenCalled();
  });
});
