import { renderHook } from '@testing-library/react-hooks';
import { useNavigation } from '@react-navigation/native';
import { BackHandler } from 'react-native';
import Device from '../../../../../util/device';
import Logger from '../../../../../util/Logger';
import { useConfirmActions } from '../useConfirmActions';
import { useFullScreenConfirmation } from './useFullScreenConfirmation';
import useClearConfirmationOnBackSwipe from './useClearConfirmationOnBackSwipe';
import { useConfirmationContext } from '../../context/confirmation-context';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../useConfirmActions', () => ({
  useConfirmActions: jest.fn(),
}));

jest.mock('../../../../../util/device', () => ({
  isIos: jest.fn(),
  isAndroid: jest.fn(),
}));

jest.mock('./useFullScreenConfirmation', () => ({
  useFullScreenConfirmation: jest.fn(),
}));

jest.mock('../../context/confirmation-context', () => ({
  useConfirmationContext: jest.fn(),
}));

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

describe('useClearConfirmationOnBackSwipe', () => {
  const mockUnsubscribe = jest.fn();
  const mockAddListener = jest.fn().mockReturnValue(mockUnsubscribe);
  const mockBackHandlerRemove = jest.fn();
  const mockOnReject = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useNavigation as jest.Mock).mockReturnValue({
      addListener: mockAddListener,
    });

    (useConfirmActions as jest.Mock).mockReturnValue({
      onReject: mockOnReject,
    });

    (useConfirmationContext as jest.Mock).mockReturnValue({
      isConfirmationSubmittingRef: { current: false },
    });

    jest.spyOn(BackHandler, 'addEventListener').mockReturnValue({
      remove: mockBackHandlerRemove,
    });
  });

  it('does not set up back handler if confirmation is not standalone', () => {
    (useFullScreenConfirmation as jest.Mock).mockReturnValue({
      isFullScreenConfirmation: false,
    });

    renderHook(() => useClearConfirmationOnBackSwipe());

    expect(mockAddListener).not.toHaveBeenCalled();
    expect(mockOnReject).not.toHaveBeenCalled();
  });

  describe('iOS behavior', () => {
    beforeEach(() => {
      (Device.isIos as jest.Mock).mockReturnValue(true);
      (Device.isAndroid as jest.Mock).mockReturnValue(false);
      (useFullScreenConfirmation as jest.Mock).mockReturnValue({
        isFullScreenConfirmation: true,
      });
    });

    it('adds a gestureEnd listener when mounted', () => {
      renderHook(() => useClearConfirmationOnBackSwipe());

      expect(mockAddListener).toHaveBeenCalledTimes(1);
      expect(mockAddListener).toHaveBeenCalledWith(
        'gestureEnd',
        expect.any(Function),
      );
    });

    it('calls onReject when gestureEnd event is triggered', () => {
      renderHook(() => useClearConfirmationOnBackSwipe());
      const gestureEndCallback = mockAddListener.mock.calls[0][1];
      gestureEndCallback();

      expect(mockOnReject).toHaveBeenCalledTimes(1);
      expect(mockOnReject).toHaveBeenCalledWith();
    });

    it('calls onReject with skipNavigation when beforeRemove follows a gestureStart event', () => {
      renderHook(() =>
        useClearConfirmationOnBackSwipe({ rejectOnBeforeRemove: true }),
      );
      const gestureStartCallback = mockAddListener.mock.calls.find(
        ([eventName]) => eventName === 'gestureStart',
      )?.[1];
      const beforeRemoveCallback = mockAddListener.mock.calls.find(
        ([eventName]) => eventName === 'beforeRemove',
      )?.[1];

      gestureStartCallback();
      beforeRemoveCallback();

      expect(mockOnReject).toHaveBeenCalledTimes(1);
      expect(mockOnReject).toHaveBeenCalledWith(undefined, true);
    });

    it('does not reject on beforeRemove without a gestureStart event', () => {
      renderHook(() =>
        useClearConfirmationOnBackSwipe({ rejectOnBeforeRemove: true }),
      );
      const beforeRemoveCallback = mockAddListener.mock.calls.find(
        ([eventName]) => eventName === 'beforeRemove',
      )?.[1];

      beforeRemoveCallback();

      expect(mockOnReject).not.toHaveBeenCalled();
    });

    it('calls onReject with skipNavigation on beforeRemove without gesture when configured', () => {
      renderHook(() =>
        useClearConfirmationOnBackSwipe({
          rejectOnBeforeRemove: true,
          rejectOnBeforeRemoveWithoutGesture: true,
        }),
      );
      const beforeRemoveCallback = mockAddListener.mock.calls.find(
        ([eventName]) => eventName === 'beforeRemove',
      )?.[1];

      beforeRemoveCallback();

      expect(mockOnReject).toHaveBeenCalledTimes(1);
      expect(mockOnReject).toHaveBeenCalledWith(undefined, true);
    });

    it('does not reject on beforeRemove when confirmation is submitting', () => {
      (useConfirmationContext as jest.Mock).mockReturnValue({
        isConfirmationSubmittingRef: { current: true },
      });
      renderHook(() =>
        useClearConfirmationOnBackSwipe({
          rejectOnBeforeRemove: true,
          rejectOnBeforeRemoveWithoutGesture: true,
        }),
      );
      const beforeRemoveCallback = mockAddListener.mock.calls.find(
        ([eventName]) => eventName === 'beforeRemove',
      )?.[1];

      beforeRemoveCallback();

      expect(mockOnReject).not.toHaveBeenCalled();
    });

    it('does not reject on gestureEnd when confirmation is submitting', () => {
      const mockOnBeforeReject = jest.fn();
      (useConfirmationContext as jest.Mock).mockReturnValue({
        isConfirmationSubmittingRef: { current: true },
      });
      renderHook(() =>
        useClearConfirmationOnBackSwipe({
          rejectOnBeforeRemove: true,
          onBeforeReject: mockOnBeforeReject,
        }),
      );
      const gestureEndCallback = mockAddListener.mock.calls.find(
        ([eventName]) => eventName === 'gestureEnd',
      )?.[1];

      gestureEndCallback();

      expect(mockOnBeforeReject).not.toHaveBeenCalled();
      expect(mockOnReject).not.toHaveBeenCalled();
    });

    it('reads the submitting ref at beforeRemove event time', () => {
      const isConfirmationSubmittingRef = { current: false };
      (useConfirmationContext as jest.Mock).mockReturnValue({
        isConfirmationSubmittingRef,
      });
      renderHook(() =>
        useClearConfirmationOnBackSwipe({
          rejectOnBeforeRemove: true,
          rejectOnBeforeRemoveWithoutGesture: true,
        }),
      );
      const beforeRemoveCallback = mockAddListener.mock.calls.find(
        ([eventName]) => eventName === 'beforeRemove',
      )?.[1];

      isConfirmationSubmittingRef.current = true;
      beforeRemoveCallback();

      expect(mockOnReject).not.toHaveBeenCalled();
    });

    it('does not reject on beforeRemove after a gestureCancel event', () => {
      renderHook(() =>
        useClearConfirmationOnBackSwipe({ rejectOnBeforeRemove: true }),
      );
      const gestureStartCallback = mockAddListener.mock.calls.find(
        ([eventName]) => eventName === 'gestureStart',
      )?.[1];
      const gestureCancelCallback = mockAddListener.mock.calls.find(
        ([eventName]) => eventName === 'gestureCancel',
      )?.[1];
      const beforeRemoveCallback = mockAddListener.mock.calls.find(
        ([eventName]) => eventName === 'beforeRemove',
      )?.[1];

      gestureStartCallback();
      gestureCancelCallback();
      beforeRemoveCallback();

      expect(mockOnReject).not.toHaveBeenCalled();
    });

    it('does not reject twice when multiple dismissal events are triggered', () => {
      renderHook(() =>
        useClearConfirmationOnBackSwipe({ rejectOnBeforeRemove: true }),
      );
      const gestureStartCallback = mockAddListener.mock.calls.find(
        ([eventName]) => eventName === 'gestureStart',
      )?.[1];
      const gestureEndCallback = mockAddListener.mock.calls.find(
        ([eventName]) => eventName === 'gestureEnd',
      )?.[1];
      const beforeRemoveCallback = mockAddListener.mock.calls.find(
        ([eventName]) => eventName === 'beforeRemove',
      )?.[1];

      gestureStartCallback();
      beforeRemoveCallback();
      gestureEndCallback();

      expect(mockOnReject).toHaveBeenCalledTimes(1);
    });

    it('calls onReject without skipNavigation when gestureEnd is triggered for rejectOnBeforeRemove by default', () => {
      renderHook(() =>
        useClearConfirmationOnBackSwipe({ rejectOnBeforeRemove: true }),
      );
      const gestureEndCallback = mockAddListener.mock.calls.find(
        ([eventName]) => eventName === 'gestureEnd',
      )?.[1];
      const beforeRemoveCallback = mockAddListener.mock.calls.find(
        ([eventName]) => eventName === 'beforeRemove',
      )?.[1];

      gestureEndCallback();
      beforeRemoveCallback();

      expect(mockOnReject).toHaveBeenCalledTimes(1);
      expect(mockOnReject).toHaveBeenCalledWith(undefined, false);
    });

    it('calls onReject with skipNavigation when gestureEnd is configured to skip navigation', () => {
      renderHook(() =>
        useClearConfirmationOnBackSwipe({
          rejectOnBeforeRemove: true,
          skipNavigationOnGestureEnd: true,
        }),
      );
      const gestureEndCallback = mockAddListener.mock.calls.find(
        ([eventName]) => eventName === 'gestureEnd',
      )?.[1];
      const beforeRemoveCallback = mockAddListener.mock.calls.find(
        ([eventName]) => eventName === 'beforeRemove',
      )?.[1];

      gestureEndCallback();
      beforeRemoveCallback();

      expect(mockOnReject).toHaveBeenCalledTimes(1);
      expect(mockOnReject).toHaveBeenCalledWith(undefined, true);
    });

    it('logs onBeforeReject errors and still rejects the confirmation', () => {
      const mockError = new Error('cleanup failed');
      const mockOnBeforeReject = jest.fn(() => {
        throw mockError;
      });
      renderHook(() =>
        useClearConfirmationOnBackSwipe({
          rejectOnBeforeRemove: true,
          onBeforeReject: mockOnBeforeReject,
        }),
      );
      const gestureEndCallback = mockAddListener.mock.calls.find(
        ([eventName]) => eventName === 'gestureEnd',
      )?.[1];

      gestureEndCallback();

      expect(Logger.error).toHaveBeenCalledTimes(1);
      expect(Logger.error).toHaveBeenCalledWith(
        mockError,
        'useClearConfirmationOnBackSwipe: onBeforeReject failed',
      );
      expect(mockOnReject).toHaveBeenCalledTimes(1);
      expect(mockOnReject).toHaveBeenCalledWith(undefined, false);
    });

    it('calls onBeforeReject before rejecting the confirmation', () => {
      const mockOnBeforeReject = jest.fn();
      renderHook(() =>
        useClearConfirmationOnBackSwipe({
          rejectOnBeforeRemove: true,
          onBeforeReject: mockOnBeforeReject,
        }),
      );
      const gestureEndCallback = mockAddListener.mock.calls.find(
        ([eventName]) => eventName === 'gestureEnd',
      )?.[1];

      gestureEndCallback();

      expect(mockOnBeforeReject).toHaveBeenCalledTimes(1);
      expect(mockOnReject).toHaveBeenCalledTimes(1);
      expect(mockOnBeforeReject.mock.invocationCallOrder[0]).toBeLessThan(
        mockOnReject.mock.invocationCallOrder[0],
      );
    });

    it('calls unsubscribe when unmounted', () => {
      const { unmount } = renderHook(() => useClearConfirmationOnBackSwipe());
      unmount();

      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });

    it('does not set up Android back handler', () => {
      renderHook(() => useClearConfirmationOnBackSwipe());

      expect(BackHandler.addEventListener).not.toHaveBeenCalled();
    });
  });

  describe('Android behavior', () => {
    beforeEach(() => {
      (Device.isIos as jest.Mock).mockReturnValue(false);
      (Device.isAndroid as jest.Mock).mockReturnValue(true);
      (useFullScreenConfirmation as jest.Mock).mockReturnValue({
        isFullScreenConfirmation: true,
      });
    });

    it('adds a hardware back press listener when mounted', () => {
      renderHook(() => useClearConfirmationOnBackSwipe());

      expect(BackHandler.addEventListener).toHaveBeenCalledWith(
        'hardwareBackPress',
        expect.any(Function),
      );
    });

    it('calls onReject when hardware back press is triggered', () => {
      renderHook(() => useClearConfirmationOnBackSwipe());
      const backHandlerCallback = (BackHandler.addEventListener as jest.Mock)
        .mock.calls[0][1];
      const result = backHandlerCallback();

      expect(mockOnReject).toHaveBeenCalledTimes(1);
      expect(mockOnReject).toHaveBeenCalledWith();
      expect(result).toBe(true);
    });

    it('removes back handler listener when unmounted', () => {
      const { unmount } = renderHook(() => useClearConfirmationOnBackSwipe());
      unmount();

      expect(mockBackHandlerRemove).toHaveBeenCalledTimes(1);
    });

    it('adds a gestureEnd listener when mounted', () => {
      renderHook(() => useClearConfirmationOnBackSwipe());

      expect(mockAddListener).toHaveBeenCalledTimes(1);
      expect(mockAddListener).toHaveBeenCalledWith(
        'gestureEnd',
        expect.any(Function),
      );
    });

    it('calls onReject when gestureEnd event is triggered', () => {
      renderHook(() => useClearConfirmationOnBackSwipe());
      const gestureEndCallback = mockAddListener.mock.calls[0][1];
      gestureEndCallback();

      expect(mockOnReject).toHaveBeenCalledTimes(1);
      expect(mockOnReject).toHaveBeenCalledWith();
    });
  });
});
