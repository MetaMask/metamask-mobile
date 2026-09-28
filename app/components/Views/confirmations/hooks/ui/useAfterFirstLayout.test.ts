import { act, renderHook } from '@testing-library/react-native';
import { useAfterFirstLayout } from './useAfterFirstLayout';

describe('useAfterFirstLayout', () => {
  let frames: FrameRequestCallback[];

  beforeEach(() => {
    frames = [];
    jest
      .spyOn(global, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        frames.push(callback);
        return frames.length;
      });
    jest.spyOn(global, 'cancelAnimationFrame').mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('waits for layout and two frame callbacks before becoming ready', () => {
    const { result } = renderHook(() => useAfterFirstLayout());

    expect(result.current.isReady).toBe(false);
    expect(requestAnimationFrame).not.toHaveBeenCalled();

    act(() => result.current.onLayout());
    expect(result.current.isReady).toBe(false);

    act(() => frames[0](16));
    expect(result.current.isReady).toBe(false);

    act(() => frames[1](32));
    expect(result.current.isReady).toBe(true);
  });

  it('schedules only once across repeated layouts and rerenders', () => {
    const { result, rerender } = renderHook(() => useAfterFirstLayout());

    act(() => {
      result.current.onLayout();
      result.current.onLayout();
    });
    rerender({});
    act(() => frames[0](16));
    act(() => frames[1](32));
    act(() => result.current.onLayout());

    expect(requestAnimationFrame).toHaveBeenCalledTimes(2);
    expect(result.current.isReady).toBe(true);
  });

  it('cancels a pending first frame on unmount', () => {
    const { result, unmount } = renderHook(() => useAfterFirstLayout());
    act(() => result.current.onLayout());

    unmount();
    act(() => frames[0](16));

    expect(cancelAnimationFrame).toHaveBeenCalledWith(1);
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
  });

  it('cancels the second frame when dismissed between callbacks', () => {
    const { result, unmount } = renderHook(() => useAfterFirstLayout());
    act(() => result.current.onLayout());
    act(() => frames[0](16));

    unmount();
    act(() => frames[1](32));

    expect(cancelAnimationFrame).toHaveBeenCalledWith(2);
    expect(result.current.isReady).toBe(false);
  });
});
