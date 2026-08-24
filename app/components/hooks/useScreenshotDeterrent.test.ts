import { act, renderHook } from '@testing-library/react-native';
import { addScreenshotListener } from 'expo-screen-capture';
import Device from '../../util/device';
import useScreenshotDeterrent from './useScreenshotDeterrent';

jest.mock('expo-screen-capture', () => ({
  addScreenshotListener: jest.fn(),
}));

jest.mock('../../util/device');

// useFocusEffect only runs its callback while the screen is focused. Treating
// it as a plain effect keeps the mount/cleanup semantics the hook relies on.
jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    useFocusEffect: (callback: () => undefined | (() => void)) =>
      useEffect(callback, [callback]),
  };
});

describe('useScreenshotDeterrent', () => {
  const mockRemove = jest.fn();
  let capturedListener: (() => void) | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    capturedListener = undefined;
    jest.mocked(Device.isAndroid).mockReturnValue(false);
    jest
      .mocked(addScreenshotListener)
      .mockImplementation((listener: () => void) => {
        capturedListener = listener;
        return { remove: mockRemove } as unknown as ReturnType<
          typeof addScreenshotListener
        >;
      });
  });

  it('subscribes to screenshots on iOS', () => {
    renderHook(() => useScreenshotDeterrent(jest.fn()));

    expect(addScreenshotListener).toHaveBeenCalledTimes(1);
  });

  it('does not subscribe on Android, where capture is blocked outright', () => {
    jest.mocked(Device.isAndroid).mockReturnValue(true);

    renderHook(() => useScreenshotDeterrent(jest.fn()));

    expect(addScreenshotListener).not.toHaveBeenCalled();
  });

  it('does not warn on a screenshot until it has been enabled', () => {
    const warning = jest.fn();
    renderHook(() => useScreenshotDeterrent(warning));

    act(() => capturedListener?.());

    expect(warning).not.toHaveBeenCalled();
  });

  it('warns on a screenshot once enabled', () => {
    const warning = jest.fn();
    const { result } = renderHook(() => useScreenshotDeterrent(warning));

    act(() => {
      const [setEnabled] = result.current;
      setEnabled(true);
    });
    act(() => capturedListener?.());

    expect(warning).toHaveBeenCalledTimes(1);
  });

  it('stops warning after being disabled again', () => {
    const warning = jest.fn();
    const { result } = renderHook(() => useScreenshotDeterrent(warning));

    act(() => {
      const [setEnabled] = result.current;
      setEnabled(true);
    });
    act(() => {
      const [setEnabled] = result.current;
      setEnabled(false);
    });
    act(() => capturedListener?.());

    expect(warning).not.toHaveBeenCalled();
  });

  it('removes the subscription on unmount', () => {
    const { unmount } = renderHook(() => useScreenshotDeterrent(jest.fn()));

    unmount();

    expect(mockRemove).toHaveBeenCalledTimes(1);
  });

  it('resubscribes when enabled changes so the listener never goes stale', () => {
    const warning = jest.fn();
    const { result } = renderHook(() => useScreenshotDeterrent(warning));

    act(() => {
      const [setEnabled] = result.current;
      setEnabled(true);
    });

    // The old subscription must be torn down, otherwise the previous closure
    // (which still sees enabled === false) would keep receiving screenshots.
    expect(mockRemove).toHaveBeenCalledTimes(1);
    expect(addScreenshotListener).toHaveBeenCalledTimes(2);
  });
});
