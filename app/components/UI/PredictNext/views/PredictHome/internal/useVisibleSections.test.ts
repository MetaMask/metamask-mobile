import { act, renderHook } from '@testing-library/react-native';
import type { LayoutChangeEvent } from 'react-native';
import { makeMutable } from 'react-native-reanimated';
import { useVisibleSections } from './useVisibleSections';

type SectionKey = 'nfl' | 'ncaa';
const KEYS: readonly SectionKey[] = ['nfl', 'ncaa'];

const layoutEvent = (layout: {
  y?: number;
  height: number;
}): LayoutChangeEvent =>
  ({
    nativeEvent: { layout: { x: 0, y: 0, width: 0, ...layout } },
  }) as LayoutChangeEvent;

const renderSections = () => {
  const scrollY = makeMutable(0);
  const hook = renderHook(() => useVisibleSections({ keys: KEYS, scrollY }));
  const layout = ({
    viewportHeight,
    nfl,
    ncaa,
  }: {
    viewportHeight: number;
    nfl: { y: number; height: number };
    ncaa: { y: number; height: number };
  }) =>
    act(() => {
      hook.result.current.onViewportLayout(
        layoutEvent({ height: viewportHeight }),
      );
      hook.result.current.onSectionLayout('nfl')(layoutEvent(nfl));
      hook.result.current.onSectionLayout('ncaa')(layoutEvent(ncaa));
    });
  // Reanimated's Jest mock runs reactions and `runOnJS` through the
  // microtask/frame queues, so let them drain before reading the result.
  const scrollTo = (offset: number) =>
    act(async () => {
      scrollY.value = offset;
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    });
  return { hook, layout, scrollTo };
};

describe('useVisibleSections', () => {
  it('treats every section as visible until the viewport and sections are measured', () => {
    const { hook } = renderSections();

    expect(hook.result.current.visibleKeys).toEqual(KEYS);
  });

  it('hides a section that lies entirely below the viewport', () => {
    const { hook, layout } = renderSections();

    layout({
      viewportHeight: 800,
      nfl: { y: 200, height: 300 },
      ncaa: { y: 900, height: 300 },
    });

    expect(hook.result.current.visibleKeys).toEqual(['nfl']);
  });

  it('follows the scroll offset, keeping sections that partially overlap', async () => {
    const { hook, layout, scrollTo } = renderSections();
    layout({
      viewportHeight: 800,
      nfl: { y: 200, height: 300 },
      ncaa: { y: 900, height: 300 },
    });

    await scrollTo(150);
    expect(hook.result.current.visibleKeys).toEqual(['nfl', 'ncaa']);

    await scrollTo(600);
    expect(hook.result.current.visibleKeys).toEqual(['ncaa']);

    await scrollTo(0);
    expect(hook.result.current.visibleKeys).toEqual(['nfl']);
  });

  it('keeps the same array reference when the visible set does not change', async () => {
    const { hook, layout, scrollTo } = renderSections();
    layout({
      viewportHeight: 800,
      nfl: { y: 200, height: 300 },
      ncaa: { y: 900, height: 300 },
    });
    const before = hook.result.current.visibleKeys;

    await scrollTo(10);

    expect(hook.result.current.visibleKeys).toBe(before);
  });
});
