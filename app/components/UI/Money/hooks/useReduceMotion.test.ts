import { AccessibilityInfo } from 'react-native';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useReduceMotion } from './useReduceMotion';

describe('useReduceMotion', () => {
  const mockRemove = jest.fn();
  let capturedListener: ((enabled: boolean) => void) | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    capturedListener = undefined;

    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(false);

    jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      .mockImplementation((_event, listener) => {
        capturedListener = listener as unknown as (enabled: boolean) => void;
        return { remove: mockRemove } as never;
      });
  });

  it('defaults to true before the initial value resolves', () => {
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockReturnValue(new Promise(() => undefined));

    const { result } = renderHook(() => useReduceMotion());

    expect(result.current).toBe(true);
  });

  it('resolves to false once the check reports reduce motion is off', async () => {
    const { result } = renderHook(() => useReduceMotion());

    await waitFor(() => expect(result.current).toBe(false));
  });

  it('resolves to true when reduce motion is enabled', async () => {
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true);

    const { result } = renderHook(() => useReduceMotion());

    await waitFor(() => expect(result.current).toBe(true));
  });

  it('updates when the reduceMotionChanged event fires', async () => {
    const { result } = renderHook(() => useReduceMotion());

    await waitFor(() => expect(result.current).toBe(false));

    act(() => {
      capturedListener?.(true);
    });

    expect(result.current).toBe(true);
  });

  it('removes the listener on unmount', () => {
    const { unmount } = renderHook(() => useReduceMotion());

    unmount();

    expect(mockRemove).toHaveBeenCalledTimes(1);
  });
});
