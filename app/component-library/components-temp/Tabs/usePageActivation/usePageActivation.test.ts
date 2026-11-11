import { act, renderHook } from '@testing-library/react-native';
import usePageActivation from './usePageActivation';

describe('usePageActivation', () => {
  it('starts on the initial index', () => {
    const { result } = renderHook(() => usePageActivation(2));

    expect(result.current.pageActiveIndex).toBe(2);
  });

  it('activates a first visit immediately, even from a tap', () => {
    const { result } = renderHook(() => usePageActivation(0));

    act(() => result.current.activate(1, true));

    expect(result.current.pageActiveIndex).toBe(1);
  });

  it('activates a swipe to a visited page immediately', () => {
    const { result } = renderHook(() => usePageActivation(0));
    act(() => result.current.activate(1));

    act(() => result.current.activate(0));

    expect(result.current.pageActiveIndex).toBe(0);
  });

  it('waits for the pager to rest when tapping a visited page', () => {
    const { result } = renderHook(() => usePageActivation(0));
    act(() => result.current.activate(1));

    act(() => result.current.activate(0, true));
    expect(result.current.pageActiveIndex).toBe(1);

    act(() => result.current.onPagerRest());
    expect(result.current.pageActiveIndex).toBe(0);
  });

  it('drops a pending activation when another page is chosen first', () => {
    const { result } = renderHook(() => usePageActivation(0));
    act(() => result.current.activate(1));
    act(() => result.current.activate(0, true));

    act(() => result.current.activate(2));
    act(() => result.current.onPagerRest());

    expect(result.current.pageActiveIndex).toBe(2);
  });
});
