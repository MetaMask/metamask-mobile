import { renderHook, act } from '@testing-library/react-hooks';
import { useOndoAccountPicker } from './useOndoAccountPicker';
import Engine from '../../../../core/Engine';

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({}),
}));

jest.mock('../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('../../../../core/Analytics', () => ({
  MetaMetricsEvents: { SWITCHED_ACCOUNT: 'SWITCHED_ACCOUNT' },
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => [{ id: 'account-1' }, { id: 'account-2' }]),
}));

jest.mock('../../../../selectors/accountsController', () => ({
  selectInternalAccounts: jest.fn(),
}));

const mockNavigate = jest.fn();
const mockUnsubscribe = jest.fn();
let blurCallback: (() => void) | undefined;
const mockAddListener = jest.fn((event: string, cb: () => void) => {
  if (event === 'blur') blurCallback = cb;
  return mockUnsubscribe;
});

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    addListener: mockAddListener,
  }),
}));

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      AccountTreeController: { setSelectedAccountGroup: jest.fn() },
    },
    controllerMessenger: { subscribe: jest.fn(), unsubscribe: jest.fn() },
  },
}));

const mockSetSelectedAccountGroup = Engine.context.AccountTreeController
  .setSelectedAccountGroup as jest.MockedFunction<
  typeof Engine.context.AccountTreeController.setSelectedAccountGroup
>;

const CAMPAIGN_ID = 'campaign-123';

const MOCK_PICKER = {
  row: {
    tokenAsset: 'eip155:1/erc20:0xabc',
    tokenSymbol: 'USDC',
    tokenName: 'USD Coin',
  },
  entries: [{ group: { id: 'group-1' }, balance: '100' }],
  tokenDecimals: 6,
} as never;

const MOCK_GROUP = { id: 'group-1' } as never;

describe('useOndoAccountPicker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    blurCallback = undefined;
  });

  it('initializes pendingPicker as null', () => {
    const { result } = renderHook(() => useOndoAccountPicker(CAMPAIGN_ID));
    expect(result.current.pendingPicker).toBeNull();
  });

  it('registers a blur listener on mount', () => {
    renderHook(() => useOndoAccountPicker(CAMPAIGN_ID));
    expect(mockAddListener).toHaveBeenCalledWith('blur', expect.any(Function));
  });

  it('calls the unsubscribe function on unmount', () => {
    const { unmount } = renderHook(() => useOndoAccountPicker(CAMPAIGN_ID));
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('clears pendingPicker when the screen blurs', () => {
    const { result } = renderHook(() => useOndoAccountPicker(CAMPAIGN_ID));

    act(() => {
      result.current.setPendingPicker(MOCK_PICKER);
    });
    expect(result.current.pendingPicker).toEqual(MOCK_PICKER);

    act(() => {
      blurCallback?.();
    });
    expect(result.current.pendingPicker).toBeNull();
  });

  it('setPendingPicker updates pendingPicker', () => {
    const { result } = renderHook(() => useOndoAccountPicker(CAMPAIGN_ID));

    act(() => {
      result.current.setPendingPicker(MOCK_PICKER);
    });

    expect(result.current.pendingPicker).toEqual(MOCK_PICKER);
  });

  it('handleGroupSelect is a no-op when pendingPicker is null', () => {
    const { result } = renderHook(() => useOndoAccountPicker(CAMPAIGN_ID));

    act(() => {
      result.current.handleGroupSelect(MOCK_GROUP);
    });

    expect(mockSetSelectedAccountGroup).not.toHaveBeenCalled();
  });

  it('handleGroupSelect calls setSelectedAccountGroup with the group id', () => {
    const { result } = renderHook(() => useOndoAccountPicker(CAMPAIGN_ID));

    act(() => {
      result.current.setPendingPicker(MOCK_PICKER);
    });
    act(() => {
      result.current.handleGroupSelect(MOCK_GROUP);
    });

    expect(mockSetSelectedAccountGroup).toHaveBeenCalledWith('group-1');
  });

  it('handleGroupSelect fires SWITCHED_ACCOUNT trackEvent when a group is selected', () => {
    const { result } = renderHook(() => useOndoAccountPicker(CAMPAIGN_ID));

    act(() => {
      result.current.setPendingPicker(MOCK_PICKER);
    });
    act(() => {
      result.current.handleGroupSelect(MOCK_GROUP);
    });

    expect(mockCreateEventBuilder).toHaveBeenCalledWith('SWITCHED_ACCOUNT');
    const builderInstance = mockCreateEventBuilder.mock.results[0].value;
    expect(builderInstance.addProperties).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'Rewards' }),
    );
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it('exposes a sheetRef that starts as null', () => {
    const { result } = renderHook(() => useOndoAccountPicker(CAMPAIGN_ID));
    expect(result.current.sheetRef.current).toBeNull();
  });

  describe('handleGroupSelect navigation', () => {
    it('navigates and clears pendingPicker immediately when sheetRef is null', () => {
      const { result } = renderHook(() => useOndoAccountPicker(CAMPAIGN_ID));

      act(() => {
        result.current.setPendingPicker(MOCK_PICKER);
      });
      act(() => {
        result.current.handleGroupSelect(MOCK_GROUP);
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        'RewardsOndoRwaAssetSelector',
        expect.objectContaining({
          mode: 'swap',
          srcTokenAsset: MOCK_PICKER.row.tokenAsset,
          srcTokenSymbol: MOCK_PICKER.row.tokenSymbol,
          srcTokenName: MOCK_PICKER.row.tokenName,
          srcTokenDecimals: MOCK_PICKER.tokenDecimals,
          campaignId: CAMPAIGN_ID,
        }),
      );
      expect(result.current.pendingPicker).toBeNull();
    });

    it('defers navigation via onCloseBottomSheet when sheetRef is set', () => {
      const { result } = renderHook(() => useOndoAccountPicker(CAMPAIGN_ID));

      const mockOnCloseBottomSheet = jest.fn((cb: () => void) => cb());
      act(() => {
        result.current.sheetRef.current = {
          onCloseBottomSheet: mockOnCloseBottomSheet,
        } as never;
      });
      act(() => {
        result.current.setPendingPicker(MOCK_PICKER);
      });
      act(() => {
        result.current.handleGroupSelect(MOCK_GROUP);
      });

      expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(
        'RewardsOndoRwaAssetSelector',
        expect.objectContaining({ mode: 'swap', campaignId: CAMPAIGN_ID }),
      );
      expect(result.current.pendingPicker).toBeNull();
    });
  });
});
