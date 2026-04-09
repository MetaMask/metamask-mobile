import { renderHook, act } from '@testing-library/react-native';
import { AppState, AppStateStatus, Linking } from 'react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import NavigationService from '../../../../core/NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import { useMusdConversionStaleApprovalCleanup } from './useMusdConversionStaleApprovalCleanup';
import { selectUnapprovedMusdConversions } from '../selectors/musdConversionStatus';

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

jest.mock('../../../../core/NavigationService', () => ({
  __esModule: true,
  default: {
    navigation: {
      getCurrentRoute: jest.fn(),
      goBack: jest.fn(),
    },
  },
}));

jest.mock('../selectors/musdConversionStatus', () => ({
  selectUnapprovedMusdConversions: jest.fn(),
}));

describe('useMusdConversionStaleApprovalCleanup', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockRejectPendingApproval = jest.mocked(Engine.rejectPendingApproval);
  const mockLoggerLog = jest.mocked(Logger.log);
  const mockSelectUnapprovedMusdConversions = jest.mocked(
    selectUnapprovedMusdConversions,
  );
  const mockGetCurrentRoute = jest.mocked(
    NavigationService.navigation.getCurrentRoute,
  );
  const mockGoBack = jest.mocked(NavigationService.navigation.goBack);

  let appStateHandler: ((nextAppState: AppStateStatus) => void) | undefined;
  let linkingUrlHandler: ((event: { url: string }) => void) | undefined;
  let removeAppStateSubscription: jest.Mock;
  let removeLinkingSubscription: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockSelectUnapprovedMusdConversions.mockReturnValue([]);

    removeAppStateSubscription = jest.fn();
    removeLinkingSubscription = jest.fn();
    appStateHandler = undefined;
    linkingUrlHandler = undefined;

    (AppState as unknown as { currentState: AppStateStatus }).currentState =
      'active';

    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_, handler) => {
        appStateHandler = handler as (nextAppState: AppStateStatus) => void;
        return {
          remove: removeAppStateSubscription,
        } as unknown as ReturnType<typeof AppState.addEventListener>;
      });

    jest.spyOn(Linking, 'addEventListener').mockImplementation((_, handler) => {
      linkingUrlHandler = handler as (event: { url: string }) => void;
      return {
        remove: removeLinkingSubscription,
      } as unknown as ReturnType<typeof Linking.addEventListener>;
    });

    mockGetCurrentRoute.mockReturnValue(undefined as never);

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectUnapprovedMusdConversions) {
        return mockSelectUnapprovedMusdConversions({} as never);
      }
      return undefined as ReturnType<typeof selector>;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const simulateDeeplinkWhileBackgrounded = () => {
    linkingUrlHandler?.({ url: 'metamask://some-deeplink' });
  };

  describe('listener lifecycle', () => {
    it('registers AppState and Linking listeners and removes both on unmount', () => {
      const { unmount } = renderHook(() =>
        useMusdConversionStaleApprovalCleanup(),
      );

      expect(AppState.addEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function),
      );
      expect(Linking.addEventListener).toHaveBeenCalledWith(
        'url',
        expect.any(Function),
      );

      unmount();

      expect(removeAppStateSubscription).toHaveBeenCalledTimes(1);
      expect(removeLinkingSubscription).toHaveBeenCalledTimes(1);
    });
  });

  describe('standard stale cleanup (not on confirmation screen)', () => {
    it('rejects stale pending approvals when app returns to active from background', () => {
      mockSelectUnapprovedMusdConversions.mockReturnValue([
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
      mockSelectUnapprovedMusdConversions.mockReturnValue([
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
      mockSelectUnapprovedMusdConversions.mockReturnValue([]);

      renderHook(() => useMusdConversionStaleApprovalCleanup());

      act(() => {
        appStateHandler?.('background');
        appStateHandler?.('active');
      });

      expect(mockLoggerLog).not.toHaveBeenCalled();
      expect(mockRejectPendingApproval).not.toHaveBeenCalled();
    });

    it('uses latest pending approvals after rerender', () => {
      mockSelectUnapprovedMusdConversions
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

  describe('navigation after rejection', () => {
    it('navigates back when confirmation screen is focused after rejecting stale approvals', () => {
      mockSelectUnapprovedMusdConversions.mockReturnValue([
        { id: 'tx-1' } as never,
      ]);
      mockGetCurrentRoute.mockReturnValue({
        name: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
      } as never);

      renderHook(() => useMusdConversionStaleApprovalCleanup());

      act(() => {
        appStateHandler?.('background');
        simulateDeeplinkWhileBackgrounded();
        appStateHandler?.('active');
      });

      jest.runAllTimers();

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('does not navigate back when a different screen is focused after rejection', () => {
      mockSelectUnapprovedMusdConversions.mockReturnValue([
        { id: 'tx-1' } as never,
      ]);
      mockGetCurrentRoute.mockReturnValue({
        name: 'SomeOtherScreen',
      } as never);

      renderHook(() => useMusdConversionStaleApprovalCleanup());

      act(() => {
        appStateHandler?.('background');
        appStateHandler?.('active');
      });

      jest.runAllTimers();

      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('does not navigate back when no stale approvals exist', () => {
      mockSelectUnapprovedMusdConversions.mockReturnValue([]);
      mockGetCurrentRoute.mockReturnValue({
        name: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
      } as never);

      renderHook(() => useMusdConversionStaleApprovalCleanup());

      act(() => {
        appStateHandler?.('background');
        appStateHandler?.('active');
      });

      jest.runAllTimers();

      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });

  describe('screen-aware guard (on confirmation screen without deeplink)', () => {
    it('skips cleanup when on REDESIGNED_CONFIRMATIONS and no deeplink received', () => {
      mockSelectUnapprovedMusdConversions.mockReturnValue([
        { id: 'tx-1' } as never,
      ]);
      mockGetCurrentRoute.mockReturnValue({
        name: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
      } as never);

      renderHook(() => useMusdConversionStaleApprovalCleanup());

      act(() => {
        appStateHandler?.('background');
        appStateHandler?.('active');
      });

      expect(mockLoggerLog).toHaveBeenCalledWith(
        '[mUSD Conversion] Skipping stale approval cleanup — user is in active confirmation flow',
      );
      expect(mockRejectPendingApproval).not.toHaveBeenCalled();
    });

    it('skips cleanup when on TOOLTIP_MODAL and no deeplink received', () => {
      mockSelectUnapprovedMusdConversions.mockReturnValue([
        { id: 'tx-1' } as never,
      ]);
      mockGetCurrentRoute.mockReturnValue({
        name: Routes.SHEET.TOOLTIP_MODAL,
      } as never);

      renderHook(() => useMusdConversionStaleApprovalCleanup());

      act(() => {
        appStateHandler?.('background');
        appStateHandler?.('active');
      });

      expect(mockLoggerLog).toHaveBeenCalledWith(
        '[mUSD Conversion] Skipping stale approval cleanup — user is in active confirmation flow',
      );
      expect(mockRejectPendingApproval).not.toHaveBeenCalled();
    });
  });

  describe('deeplink detection (on confirmation screen with deeplink)', () => {
    it('rejects approvals when on confirmation screen and deeplink received while backgrounded', () => {
      mockSelectUnapprovedMusdConversions.mockReturnValue([
        { id: 'tx-1' } as never,
      ]);
      mockGetCurrentRoute.mockReturnValue({
        name: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
      } as never);

      renderHook(() => useMusdConversionStaleApprovalCleanup());

      act(() => {
        appStateHandler?.('background');
        simulateDeeplinkWhileBackgrounded();
        appStateHandler?.('active');
      });

      expect(mockLoggerLog).toHaveBeenCalledWith(
        '[mUSD Conversion] Incoming deeplink detected while on confirmation screen — rejecting stale approvals',
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

    it('rejects approvals when on tooltip modal and deeplink received while backgrounded', () => {
      mockSelectUnapprovedMusdConversions.mockReturnValue([
        { id: 'tx-1' } as never,
      ]);
      mockGetCurrentRoute.mockReturnValue({
        name: Routes.SHEET.TOOLTIP_MODAL,
      } as never);

      renderHook(() => useMusdConversionStaleApprovalCleanup());

      act(() => {
        appStateHandler?.('background');
        simulateDeeplinkWhileBackgrounded();
        appStateHandler?.('active');
      });

      expect(mockLoggerLog).toHaveBeenCalledWith(
        '[mUSD Conversion] Incoming deeplink detected while on confirmation screen — rejecting stale approvals',
      );
      expect(mockRejectPendingApproval).toHaveBeenCalledTimes(1);
    });

    it('resets the deeplink flag after processing so subsequent returns from browser are not affected', () => {
      mockSelectUnapprovedMusdConversions.mockReturnValue([
        { id: 'tx-1' } as never,
      ]);
      mockGetCurrentRoute.mockReturnValue({
        name: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
      } as never);

      renderHook(() => useMusdConversionStaleApprovalCleanup());

      act(() => {
        appStateHandler?.('background');
        simulateDeeplinkWhileBackgrounded();
        appStateHandler?.('active');
      });

      expect(mockRejectPendingApproval).toHaveBeenCalledTimes(1);
      mockRejectPendingApproval.mockClear();
      mockLoggerLog.mockClear();

      act(() => {
        appStateHandler?.('background');
        appStateHandler?.('active');
      });

      expect(mockLoggerLog).toHaveBeenCalledWith(
        '[mUSD Conversion] Skipping stale approval cleanup — user is in active confirmation flow',
      );
      expect(mockRejectPendingApproval).not.toHaveBeenCalled();
    });

    it('does not set deeplink flag when Linking url event fires while app is not backgrounded', () => {
      mockSelectUnapprovedMusdConversions.mockReturnValue([
        { id: 'tx-1' } as never,
      ]);
      mockGetCurrentRoute.mockReturnValue({
        name: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
      } as never);

      renderHook(() => useMusdConversionStaleApprovalCleanup());

      act(() => {
        linkingUrlHandler?.({ url: 'metamask://some-deeplink' });
      });

      act(() => {
        appStateHandler?.('background');
        appStateHandler?.('active');
      });

      expect(mockLoggerLog).toHaveBeenCalledWith(
        '[mUSD Conversion] Skipping stale approval cleanup — user is in active confirmation flow',
      );
      expect(mockRejectPendingApproval).not.toHaveBeenCalled();
    });

    it('resets deeplink flag when app enters background', () => {
      mockSelectUnapprovedMusdConversions.mockReturnValue([
        { id: 'tx-1' } as never,
      ]);
      mockGetCurrentRoute.mockReturnValue({
        name: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
      } as never);

      renderHook(() => useMusdConversionStaleApprovalCleanup());

      act(() => {
        appStateHandler?.('background');
        simulateDeeplinkWhileBackgrounded();
        appStateHandler?.('background');
        appStateHandler?.('active');
      });

      expect(mockLoggerLog).toHaveBeenCalledWith(
        '[mUSD Conversion] Skipping stale approval cleanup — user is in active confirmation flow',
      );
      expect(mockRejectPendingApproval).not.toHaveBeenCalled();
    });
  });
});
