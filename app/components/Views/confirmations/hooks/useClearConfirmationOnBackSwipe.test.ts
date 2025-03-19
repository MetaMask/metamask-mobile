import { renderHook } from '@testing-library/react-hooks';
import { useNavigation } from '@react-navigation/native';
import useClearConfirmationOnBackSwipe from './useClearConfirmationOnBackSwipe';
import { useConfirmActions } from './useConfirmActions';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('./useConfirmActions', () => ({
  useConfirmActions: jest.fn(),
}));

describe('useClearConfirmationOnBackSwipe', () => {
  const mockUnsubscribe = jest.fn();
  const mockAddListener = jest.fn().mockReturnValue(mockUnsubscribe);
  const mockOnReject = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useNavigation as jest.Mock).mockReturnValue({
      addListener: mockAddListener,
    });

    (useConfirmActions as jest.Mock).mockReturnValue({
      onReject: mockOnReject,
    });
  });

  it('should add a gestureEnd listener when mounted', () => {
    renderHook(() => useClearConfirmationOnBackSwipe());

    expect(mockAddListener).toHaveBeenCalledTimes(1);
    expect(mockAddListener).toHaveBeenCalledWith('gestureEnd', expect.any(Function));
  });

  it('should call onReject when gestureEnd event is triggered', () => {
    renderHook(() => useClearConfirmationOnBackSwipe());

    // Get the callback function that was passed to addListener
    const gestureEndCallback = mockAddListener.mock.calls[0][1];

    // Simulate the gestureEnd event
    gestureEndCallback();

    expect(mockOnReject).toHaveBeenCalledTimes(1);
  });

  it('should call unsubscribe when unmounted', () => {
    const { unmount } = renderHook(() => useClearConfirmationOnBackSwipe());

    // Unmount the hook
    unmount();

    // Verify that the unsubscribe function was called
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
