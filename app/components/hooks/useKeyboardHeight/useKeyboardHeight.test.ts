import { renderHook, act } from '@testing-library/react-hooks';
import { Keyboard } from 'react-native';
import { useKeyboardHeight } from './useKeyboardHeight';

describe('useKeyboardHeight', () => {
  let mockSubscription: { remove: jest.Mock };
  let showListener: (e: { endCoordinates: { height: number } }) => void;
  let hideListener: () => void;

  beforeEach(() => {
    mockSubscription = { remove: jest.fn() };
    jest
      .spyOn(Keyboard, 'addListener')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue(mockSubscription as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const getListeners = () => {
    const calls = (Keyboard.addListener as jest.Mock).mock.calls;
    showListener = calls.find((call) => call[0] === 'keyboardDidShow')?.[1];
    hideListener = calls.find((call) => call[0] === 'keyboardDidHide')?.[1];
  };

  it('should initialize with height of 0', () => {
    const { result } = renderHook(() => useKeyboardHeight());
    expect(result.current).toBe(0);
  });

  it('should register keyboard listeners', () => {
    renderHook(() => useKeyboardHeight());
    expect(Keyboard.addListener).toHaveBeenCalledWith(
      'keyboardDidShow',
      expect.any(Function),
    );
    expect(Keyboard.addListener).toHaveBeenCalledWith(
      'keyboardDidHide',
      expect.any(Function),
    );
  });

  it('should update height on show and reset on hide', () => {
    const { result } = renderHook(() => useKeyboardHeight());
    getListeners();

    act(() => showListener({ endCoordinates: { height: 300 } }));
    expect(result.current).toBe(300);

    act(() => hideListener());
    expect(result.current).toBe(0);
  });

  it('should handle multiple height changes', () => {
    const { result } = renderHook(() => useKeyboardHeight());
    getListeners();

    act(() => showListener({ endCoordinates: { height: 250 } }));
    expect(result.current).toBe(250);

    act(() => showListener({ endCoordinates: { height: 400 } }));
    expect(result.current).toBe(400);
  });

  it('should remove listeners on unmount', () => {
    const { unmount } = renderHook(() => useKeyboardHeight());
    unmount();
    expect(mockSubscription.remove).toHaveBeenCalledTimes(2);
  });
});
