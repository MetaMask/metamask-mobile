import { act, renderHook } from '@testing-library/react-native';
import type { LayoutChangeEvent } from 'react-native';
import { usePerpsSectionNearViewport } from './usePerpsSectionNearViewport';

const MARGIN_PX = 200;

const layoutEvent = (y: number, height: number) =>
  ({
    nativeEvent: { layout: { x: 0, y, width: 390, height } },
  }) as LayoutChangeEvent;

describe('usePerpsSectionNearViewport', () => {
  const renderNearViewport = (enabled = true) =>
    renderHook(() =>
      usePerpsSectionNearViewport({ enabled, marginPx: MARGIN_PX }),
    );

  it.each([
    ['on screen', 900, 800, true],
    ['within the margin below the screen', 0, 850, true],
    ['further below the screen than the margin', 0, 700, false],
    ['scrolled past by more than the margin', 1600, 800, false],
  ])('reports a section %s', (_label, scrollY, viewportHeight, expected) => {
    const { result } = renderNearViewport();

    act(() => {
      result.current.handleLayout(layoutEvent(1000, 300));
      result.current.handleScroll(scrollY, viewportHeight);
    });

    expect(result.current.isNearViewport).toBe(expected);
  });

  it('updates as the user scrolls toward and away from the section', () => {
    const { result } = renderNearViewport();
    act(() => {
      result.current.handleLayout(layoutEvent(1000, 300));
      result.current.handleScroll(0, 600);
    });
    expect(result.current.isNearViewport).toBe(false);

    act(() => result.current.handleScroll(400, 600));
    expect(result.current.isNearViewport).toBe(true);

    act(() => result.current.handleScroll(2000, 600));
    expect(result.current.isNearViewport).toBe(false);
  });

  it('ignores a section with no height', () => {
    const { result } = renderNearViewport();

    act(() => {
      result.current.handleLayout(layoutEvent(0, 0));
      result.current.handleScroll(0, 800);
    });

    expect(result.current.isNearViewport).toBe(false);
  });

  it('reports false while disabled', () => {
    const { result } = renderNearViewport(false);

    act(() => {
      result.current.handleLayout(layoutEvent(100, 300));
      result.current.handleScroll(0, 800);
    });

    expect(result.current.isNearViewport).toBe(false);
  });
});
