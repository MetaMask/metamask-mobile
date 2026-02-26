import { renderHook, act } from '@testing-library/react-native';
import { AppState, AppStateStatus } from 'react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { useMusdConversionStaleApprovalCleanup } from './useMusdConversionStaleApprovalCleanup';
import { selectPendingUnapprovedMusdConversions } from '../selectors/musdConversionStatus';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    rejectPendingApproval: jest.fn(),
  },
}));

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
  },
}));

jest.mock('../selectors/musdConversionStatus', () => ({
  selectPendingUnapprovedMusdConversions: jest.fn(),
}));

describe('useMusdConversionStaleApprovalCleanup', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockRejectPendingApproval = jest.mocked(Engine.rejectPendingApproval);
  const mockLoggerLog = jest.mocked(Logger.log);
  const mockSelectPendingUnapprovedMusdConversions = jest.mocked(
    selectPendingUnapprovedMusdConversions,
  );

  let appStateHandler: ((nextAppState: AppStateStatus) => void) | undefined;
  let removeSubscriptionMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectPendingUnapprovedMusdConversions.mockReturnValue([]);

    removeSubscriptionMock = jest.fn();
    appStateHandler = undefined;

    (AppState as unknown as { currentState: AppStateStatus }).currentState =
      'active';

    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_, handler) => {
        appStateHandler = handler as (nextAppState: AppStateStatus) => void;
        return {
          remove: removeSubscriptionMock,
        } as unknown as ReturnType<typeof AppState.addEventListener>;
      });

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPendingUnapprovedMusdConversions) {
        return mockSelectPendingUnapprovedMusdConversions({} as never);
      }
      return undefined as ReturnType<typeof selector>;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('registers app state listener and removes it on unmount', () => {
    const { unmount } = renderHook(() =>
      useMusdConversionStaleApprovalCleanup(),
    );

    expect(AppState.addEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    );

    unmount();

    expect(removeSubscriptionMock).toHaveBeenCalledTimes(1);
  });

  it('rejects stale pending approvals when app returns to active', () => {
    mockSelectPendingUnapprovedMusdConversions.mockReturnValue([
      { id: 'tx-1' } as never,
    ]);

    renderHook(() => useMusdConversionStaleApprovalCleanup());

    act(() => {
      appStateHandler?.('background');
      appStateHandler?.('active');
    });

    expect(mockLoggerLog).toHaveBeenCalledWith(
      '[mUSD Conversion] Rejecting stale pending approvals on foreground',
      {
        count: 1,
        transactionIds: ['tx-1'],
      },
    );
    expect(mockRejectPendingApproval).toHaveBeenCalledTimes(1);
    expect(mockRejectPendingApproval).toHaveBeenCalledWith(
      'tx-1',
      expect.objectContaining({
        data: expect.objectContaining({
          cause: 'useMusdConversionStaleApprovalCleanup',
          transactionId: 'tx-1',
        }),
      }),
      {
        ignoreMissing: true,
        logErrors: false,
      },
    );
  });

  it('does not reject approvals on inactive to active transition', () => {
    mockSelectPendingUnapprovedMusdConversions.mockReturnValue([
      { id: 'tx-1' } as never,
    ]);

    renderHook(() => useMusdConversionStaleApprovalCleanup());

    act(() => {
      appStateHandler?.('inactive');
      appStateHandler?.('active');
    });

    expect(mockLoggerLog).not.toHaveBeenCalled();
    expect(mockRejectPendingApproval).not.toHaveBeenCalled();
  });

  it('does not reject approvals when there are no stale pending approvals', () => {
    mockSelectPendingUnapprovedMusdConversions.mockReturnValue([]);

    renderHook(() => useMusdConversionStaleApprovalCleanup());

    act(() => {
      appStateHandler?.('background');
      appStateHandler?.('active');
    });

    expect(mockLoggerLog).not.toHaveBeenCalled();
    expect(mockRejectPendingApproval).not.toHaveBeenCalled();
  });

  it('uses latest pending approvals after rerender', () => {
    mockSelectPendingUnapprovedMusdConversions
      .mockReturnValueOnce([])
      .mockReturnValue([{ id: 'tx-latest' } as never]);

    const { rerender } = renderHook(() =>
      useMusdConversionStaleApprovalCleanup(),
    );

    rerender({});

    act(() => {
      appStateHandler?.('background');
      appStateHandler?.('active');
    });

    expect(mockRejectPendingApproval).toHaveBeenCalledWith(
      'tx-latest',
      expect.any(Object),
      {
        ignoreMissing: true,
        logErrors: false,
      },
    );
  });
});
