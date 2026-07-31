import { renderHook } from '@testing-library/react-hooks';
import { useNavigation } from '@react-navigation/native';
import { BackHandler } from 'react-native';
import Device from '../../../../../util/device';
import { useConfirmActions } from '../useConfirmActions';
import { useFullScreenConfirmation } from './useFullScreenConfirmation';
import useClearConfirmationOnBackSwipe from './useClearConfirmationOnBackSwipe';
import { useConfirmationContext } from '../../context/confirmation-context';
import type { PreventRemoveCallback } from '../../../../../util/navigation/usePreventRemove';

const mockUsePreventRemove = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../../../util/navigation/usePreventRemove', () => ({
  usePreventRemove: (...args: unknown[]) => mockUsePreventRemove(...args),
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
  const mockDispatch = jest.fn();
  const mockBackHandlerRemove = jest.fn();
  const mockOnReject = jest.fn();
  const mockAction = { type: 'GO_BACK' };

  const getPreventRemoveCallback = (): PreventRemoveCallback => {
    const lastCall =
      mockUsePreventRemove.mock.calls[
        mockUsePreventRemove.mock.calls.length - 1
      ];
    return lastCall[1] as PreventRemoveCallback;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (useNavigation as jest.Mock).mockReturnValue({
      goBack: jest.fn(),
      dispatch: mockDispatch,
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

  it('does not prevent remove when confirmation is not full screen', () => {
    (useFullScreenConfirmation as jest.Mock).mockReturnValue({
      isFullScreenConfirmation: false,
    });

    renderHook(() => useClearConfirmationOnBackSwipe());

    expect(mockUsePreventRemove).toHaveBeenCalledWith(
      false,
      expect.any(Function),
    );
    expect(mockOnReject).not.toHaveBeenCalled();
  });

  describe('prevent-remove callback', () => {
    beforeEach(() => {
      (Device.isIos as jest.Mock).mockReturnValue(true);
      (Device.isAndroid as jest.Mock).mockReturnValue(false);
      (useFullScreenConfirmation as jest.Mock).mockReturnValue({
        isFullScreenConfirmation: true,
      });
    });

    it('prevents remove when confirmation is full screen', () => {
      renderHook(() => useClearConfirmationOnBackSwipe());

      expect(mockUsePreventRemove).toHaveBeenCalledWith(
        true,
        expect.any(Function),
      );
    });

    it('rejects with skipNavigation and re-dispatches the original action', () => {
      renderHook(() => useClearConfirmationOnBackSwipe());

      getPreventRemoveCallback()({ data: { action: mockAction } });

      expect(mockOnReject).toHaveBeenCalledTimes(1);
      expect(mockOnReject).toHaveBeenCalledWith(undefined, true);
      expect(mockDispatch).toHaveBeenCalledWith(mockAction);
    });

    it('does not reject when confirmation is submitting', () => {
      (useConfirmationContext as jest.Mock).mockReturnValue({
        mmPayRequestInProgressNavHandler: { current: false },
        isConfirmationSubmittingRef: { current: true },
      });

      renderHook(() => useClearConfirmationOnBackSwipe());

      getPreventRemoveCallback()({ data: { action: mockAction } });

      expect(mockOnReject).not.toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledWith(mockAction);
    });

    it('reads the submitting ref when the prevent-remove callback runs', () => {
      const isConfirmationSubmittingRef = { current: false };
      (useConfirmationContext as jest.Mock).mockReturnValue({
        mmPayRequestInProgressNavHandler: { current: false },
        isConfirmationSubmittingRef,
      });

      renderHook(() => useClearConfirmationOnBackSwipe());

      isConfirmationSubmittingRef.current = true;
      getPreventRemoveCallback()({ data: { action: mockAction } });

      expect(mockOnReject).not.toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledWith(mockAction);
    });

    it('rejects at most once when the prevent-remove callback runs multiple times', () => {
      renderHook(() => useClearConfirmationOnBackSwipe());
      const callback = getPreventRemoveCallback();

      callback({ data: { action: mockAction } });
      callback({ data: { action: mockAction } });

      expect(mockOnReject).toHaveBeenCalledTimes(1);
    });

    it('runs the MM Pay handler and does not reject or re-dispatch', () => {
      const mockHandler = jest.fn();
      (useConfirmationContext as jest.Mock).mockReturnValue({
        mmPayRequestInProgressNavHandler: { current: mockHandler },
        isConfirmationSubmittingRef: { current: false },
      });

      renderHook(() => useClearConfirmationOnBackSwipe());

      getPreventRemoveCallback()({ data: { action: mockAction } });

      expect(mockHandler).toHaveBeenCalledTimes(1);
      expect(mockOnReject).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('does not set up Android back handler on iOS', () => {
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

    it('rejects with skipNavigation via the prevent-remove callback', () => {
      renderHook(() => useClearConfirmationOnBackSwipe());

      getPreventRemoveCallback()({ data: { action: mockAction } });

      expect(mockOnReject).toHaveBeenCalledTimes(1);
      expect(mockOnReject).toHaveBeenCalledWith(undefined, true);
      expect(mockDispatch).toHaveBeenCalledWith(mockAction);
    });

    it('intercepts hardware back when mmPayRequestInProgressNavHandler is set', () => {
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
