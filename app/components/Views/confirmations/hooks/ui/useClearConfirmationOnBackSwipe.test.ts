import { renderHook } from '@testing-library/react-hooks';
import { useNavigation } from '@react-navigation/native';
import { BackHandler } from 'react-native';
import Device from '../../../../../util/device';
import { useConfirmActions } from '../useConfirmActions';
import { useFullScreenConfirmation } from './useFullScreenConfirmation';
import useClearConfirmationOnBackSwipe from './useClearConfirmationOnBackSwipe';

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
    });
  });
});
