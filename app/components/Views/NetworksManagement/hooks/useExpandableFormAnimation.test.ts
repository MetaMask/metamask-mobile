import { renderHook, act } from '@testing-library/react-native';
import { Easing, type LayoutChangeEvent } from 'react-native';
import { useExpandableFormAnimation } from './useExpandableFormAnimation';

jest.useFakeTimers();
afterAll(() => jest.useRealTimers());

const layoutEvent = (height: number) =>
  ({ nativeEvent: { layout: { height } } }) as unknown as LayoutChangeEvent;

const flush = (ms = 500) => act(() => jest.advanceTimersByTime(ms));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const v = (animated: unknown): number => (animated as any).__getValue();

const setup = (
  expanded: boolean,
  opts?: Parameters<typeof useExpandableFormAnimation>[1],
) =>
  renderHook(
    ({ exp }) => useExpandableFormAnimation(exp, ...(opts ? [opts] : [])),
    { initialProps: { exp: expanded } },
  );

const expandTo = (
  result: ReturnType<typeof setup>['result'],
  height: number,
) => {
  act(() => result.current.onContentLayout(layoutEvent(height)));
  flush();
};

describe('useExpandableFormAnimation', () => {
  it('returns the expected API shape', () => {
    const { result } = setup(false);

    expect(result.current.contentWrapperStyle).toBeDefined();
    expect(result.current.toggleButtonStyle).toBeDefined();
    expect(typeof result.current.onContentLayout).toBe('function');
  });

  it('starts collapsed at height 0, opacity 0', () => {
    const { result } = setup(false);
    flush();

    expect(v(result.current.contentWrapperStyle.height)).toBe(0);
    expect(v(result.current.contentWrapperStyle.opacity)).toBe(0);
  });

  it('expands to measured height when expanded and layout fires', () => {
    const { result } = setup(true);
    expandTo(result, 300);

    expect(v(result.current.contentWrapperStyle.height)).toBe(300);
    expect(v(result.current.contentWrapperStyle.opacity)).toBe(1);
  });

  it('does not expand on layout when collapsed', () => {
    const { result } = setup(false);
    expandTo(result, 200);

    expect(v(result.current.contentWrapperStyle.height)).toBe(0);
  });

  it('ignores zero-height layout events', () => {
    const { result } = setup(true);
    expandTo(result, 0);

    expect(v(result.current.contentWrapperStyle.height)).toBe(0);
  });

  it('expands via useEffect when toggled true after layout measured', () => {
    const { result, rerender } = setup(false);
    act(() => result.current.onContentLayout(layoutEvent(400)));

    act(() => rerender({ exp: true }));
    flush();

    expect(v(result.current.contentWrapperStyle.height)).toBe(400);
    expect(v(result.current.contentWrapperStyle.opacity)).toBe(1);
  });

  it('collapses when toggled false', () => {
    const { result, rerender } = setup(true);
    expandTo(result, 300);

    act(() => rerender({ exp: false }));
    flush();

    expect(v(result.current.contentWrapperStyle.height)).toBe(0);
    expect(v(result.current.contentWrapperStyle.opacity)).toBe(0);
  });

  it('handles expand → collapse → re-expand cycle', () => {
    const { result, rerender } = setup(false);
    act(() => result.current.onContentLayout(layoutEvent(250)));

    act(() => rerender({ exp: true }));
    flush();
    expect(v(result.current.contentWrapperStyle.height)).toBe(250);

    act(() => rerender({ exp: false }));
    flush();
    expect(v(result.current.contentWrapperStyle.height)).toBe(0);

    act(() => rerender({ exp: true }));
    flush();
    expect(v(result.current.contentWrapperStyle.height)).toBe(250);
  });

  it('uses the latest measured height after multiple layouts', () => {
    const { result, rerender } = setup(false);
    act(() => result.current.onContentLayout(layoutEvent(200)));
    act(() => result.current.onContentLayout(layoutEvent(350)));

    act(() => rerender({ exp: true }));
    flush();

    expect(v(result.current.contentWrapperStyle.height)).toBe(350);
  });

  it('respects custom duration and easing', () => {
    const { result } = setup(true, { duration: 100, easing: Easing.linear });
    act(() => result.current.onContentLayout(layoutEvent(200)));
    act(() => jest.advanceTimersByTime(110));

    expect(v(result.current.contentWrapperStyle.height)).toBe(200);
    expect(v(result.current.contentWrapperStyle.opacity)).toBe(1);
  });

  it('sets overflow hidden on both styles', () => {
    const { result } = setup(false);

    expect(result.current.contentWrapperStyle.overflow).toBe('hidden');
    expect(result.current.toggleButtonStyle.overflow).toBe('hidden');
  });

  it('toggleButtonStyle fades out and shrinks when expanded', () => {
    const { result } = setup(false);

    expect(v(result.current.toggleButtonStyle.maxHeight)).toBe(56);
    expect(v(result.current.toggleButtonStyle.opacity)).toBe(1);

    const { result: expResult } = setup(true);
    expandTo(expResult, 300);

    expect(v(expResult.current.toggleButtonStyle.maxHeight)).toBe(0);
    expect(v(expResult.current.toggleButtonStyle.opacity)).toBe(0);
  });
});
