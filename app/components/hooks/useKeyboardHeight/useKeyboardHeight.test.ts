import { renderHook, act } from '@testing-library/react-native';
import { Keyboard } from 'react-native';
import { useKeyboardHeight } from './useKeyboardHeight';

describe('useKeyboardHeight', () => {
  let showListener: (e: { endCoordinates: { height: number } }) => void;
  let hideListener: () => void;
  let mockRemove1: jest.Mock;
  let mockRemove2: jest.Mock;

  beforeEach(() => {
    mockRemove1 = jest.fn();
    mockRemove2 = jest.fn();

    jest
      .spyOn(Keyboard, 'addListener')
      .mockImplementation(
        (
          eventName: string,
          callback: Parameters<typeof Keyboard.addListener>[1],
        ) => {
          if (eventName === 'keyboardDidShow') {
            showListener = callback as typeof showListener;
            return { remove: mockRemove1 } as unknown as ReturnType<
              typeof Keyboard.addListener
            >;
          }
          if (eventName === 'keyboardDidHide') {
            hideListener = callback as typeof hideListener;
            return { remove: mockRemove2 } as unknown as ReturnType<
              typeof Keyboard.addListener
            >;
          }
          return { remove: jest.fn() } as unknown as ReturnType<
            typeof Keyboard.addListener
          >;
        },
      );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

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

    act(() => {
      showListener({ endCoordinates: { height: 300 } });
    });
    expect(result.current).toBe(300);

    act(() => {
      hideListener();
    });
    expect(result.current).toBe(0);
  });

  it('should handle multiple height changes', () => {
    const { result } = renderHook(() => useKeyboardHeight());

    act(() => {
      showListener({ endCoordinates: { height: 250 } });
    });
    expect(result.current).toBe(250);

    act(() => {
      showListener({ endCoordinates: { height: 400 } });
    });
    expect(result.current).toBe(400);
  });

  it('should remove listeners on unmount', () => {
    const { unmount } = renderHook(() => useKeyboardHeight());
    unmount();
    expect(mockRemove1).toHaveBeenCalledTimes(1);
    expect(mockRemove2).toHaveBeenCalledTimes(1);
  });
});
