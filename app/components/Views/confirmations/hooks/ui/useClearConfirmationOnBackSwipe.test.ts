import { renderHook } from '@testing-library/react-hooks';
import { useNavigation } from '@react-navigation/native';
import { BackHandler } from 'react-native';
import Device from '../../../../../util/device';
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

describe('useClearConfirmationOnBackSwipe', () => {
  const mockUnsubscribe = jest.fn();
  const mockAddListener = jest.fn().mockReturnValue(mockUnsubscribe);
  const mockBackHandlerRemove = jest.fn();
  const mockOnReject = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useNavigation as jest.Mock).mockReturnValue({
      addListener: mockAddListener,
      goBack: jest.fn(),
    });

    (useConfirmActions as jest.Mock).mockReturnValue({
      onReject: mockOnReject,
    });

    (useConfirmationContext as jest.Mock).mockReturnValue({
      mmPayRequestInProgressNavHandler: { current: false },
      isConfirmationSubmittingRef: { current: false },
    });

    jest.spyOn(BackHandler, 'addEventListener').mockReturnValue({
      remove: mockBackHandlerRemove,
    });
  });

  it('does not set up listeners if confirmation is not full screen', () => {
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

    it('adds a beforeRemove listener when mounted', () => {
      renderHook(() => useClearConfirmationOnBackSwipe());

      expect(mockAddListener).toHaveBeenCalledTimes(1);
      expect(mockAddListener).toHaveBeenCalledWith(
        'beforeRemove',
        expect.any(Function),
      );
    });

    it('calls onReject with skipNavigation when beforeRemove is triggered', () => {
      renderHook(() => useClearConfirmationOnBackSwipe());
      const beforeRemoveCallback = mockAddListener.mock.calls.find(
        ([eventName]: [string]) => eventName === 'beforeRemove',
      )?.[1];

      beforeRemoveCallback({ preventDefault: jest.fn() });

      expect(mockOnReject).toHaveBeenCalledTimes(1);
      expect(mockOnReject).toHaveBeenCalledWith(undefined, true);
    });

    it('does not reject on beforeRemove when confirmation is submitting', () => {
      (useConfirmationContext as jest.Mock).mockReturnValue({
        mmPayRequestInProgressNavHandler: { current: false },
        isConfirmationSubmittingRef: { current: true },
      });

      renderHook(() => useClearConfirmationOnBackSwipe());
      const beforeRemoveCallback = mockAddListener.mock.calls.find(
        ([eventName]: [string]) => eventName === 'beforeRemove',
      )?.[1];

      beforeRemoveCallback({ preventDefault: jest.fn() });

      expect(mockOnReject).not.toHaveBeenCalled();
    });

    it('reads the submitting ref at beforeRemove event time', () => {
      const isConfirmationSubmittingRef = { current: false };
      (useConfirmationContext as jest.Mock).mockReturnValue({
        mmPayRequestInProgressNavHandler: { current: false },
        isConfirmationSubmittingRef,
      });

      renderHook(() => useClearConfirmationOnBackSwipe());
      const beforeRemoveCallback = mockAddListener.mock.calls.find(
        ([eventName]: [string]) => eventName === 'beforeRemove',
      )?.[1];

      isConfirmationSubmittingRef.current = true;
      beforeRemoveCallback({ preventDefault: jest.fn() });

      expect(mockOnReject).not.toHaveBeenCalled();
    });

    it('does not reject twice when beforeRemove fires multiple times', () => {
      renderHook(() => useClearConfirmationOnBackSwipe());
      const beforeRemoveCallback = mockAddListener.mock.calls.find(
        ([eventName]: [string]) => eventName === 'beforeRemove',
      )?.[1];

      beforeRemoveCallback({ preventDefault: jest.fn() });
      beforeRemoveCallback({ preventDefault: jest.fn() });

      expect(mockOnReject).toHaveBeenCalledTimes(1);
    });

    it('intercepts beforeRemove when mmPayRequestInProgressNavHandler is true', () => {
      const mockPreventDefault = jest.fn();
      (useConfirmationContext as jest.Mock).mockReturnValue({
        mmPayRequestInProgressNavHandler: { current: true },
        isConfirmationSubmittingRef: { current: false },
      });

      renderHook(() => useClearConfirmationOnBackSwipe());
      const beforeRemoveCallback = mockAddListener.mock.calls.find(
        ([eventName]: [string]) => eventName === 'beforeRemove',
      )?.[1];

      beforeRemoveCallback({ preventDefault: mockPreventDefault });

      expect(mockPreventDefault).toHaveBeenCalledTimes(1);
      expect(mockOnReject).not.toHaveBeenCalled();
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
      expect(mockOnReject).toHaveBeenCalledWith(undefined, false);
      expect(result).toBe(true);
    });

    it('does not reject on hardware back when confirmation is submitting', () => {
      (useConfirmationContext as jest.Mock).mockReturnValue({
        mmPayRequestInProgressNavHandler: { current: false },
        isConfirmationSubmittingRef: { current: true },
      });

      renderHook(() => useClearConfirmationOnBackSwipe());
      const backHandlerCallback = (BackHandler.addEventListener as jest.Mock)
        .mock.calls[0][1];
      backHandlerCallback();

      expect(mockOnReject).not.toHaveBeenCalled();
    });

    it('removes back handler listener when unmounted', () => {
      const { unmount } = renderHook(() => useClearConfirmationOnBackSwipe());
      unmount();

      expect(mockBackHandlerRemove).toHaveBeenCalledTimes(1);
    });

    it('adds a beforeRemove listener when mounted', () => {
      renderHook(() => useClearConfirmationOnBackSwipe());

      expect(mockAddListener).toHaveBeenCalledWith(
        'beforeRemove',
        expect.any(Function),
      );
    });

    it('calls onReject with skipNavigation when beforeRemove is triggered', () => {
      renderHook(() => useClearConfirmationOnBackSwipe());
      const beforeRemoveCallback = mockAddListener.mock.calls.find(
        ([eventName]: [string]) => eventName === 'beforeRemove',
      )?.[1];

      beforeRemoveCallback({ preventDefault: jest.fn() });

      expect(mockOnReject).toHaveBeenCalledTimes(1);
      expect(mockOnReject).toHaveBeenCalledWith(undefined, true);
    });

    it('intercepts hardware back when mmPayRequestInProgressNavHandler is true', () => {
      (useConfirmationContext as jest.Mock).mockReturnValue({
        mmPayRequestInProgressNavHandler: { current: true },
        isConfirmationSubmittingRef: { current: false },
      });

      renderHook(() => useClearConfirmationOnBackSwipe());
      const backHandlerCallback = (BackHandler.addEventListener as jest.Mock)
        .mock.calls[0][1];
      const result = backHandlerCallback();

      expect(result).toBe(true);
      expect(mockOnReject).not.toHaveBeenCalled();
    });
  });
});
