import { act, renderHook, waitFor } from '@testing-library/react-native';
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
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

const scrollEvent = (y: number) =>
  ({
    nativeEvent: { contentOffset: { x: 0, y } },
  }) as NativeSyntheticEvent<NativeScrollEvent>;

const renderSections = () => {
  const scrollY = makeMutable(0);
  const hook = renderHook(() => useVisibleSections({ keys: KEYS, scrollY }));
  const layout = ({
    viewportHeight,
    contentY,
    nfl,
    ncaa,
  }: {
    viewportHeight: number;
    contentY?: number;
    nfl: { y: number; height: number };
    ncaa: { y: number; height: number };
  }) =>
    act(() => {
      hook.result.current.onViewportLayout(
        layoutEvent({ height: viewportHeight }),
      );
      if (contentY !== undefined) {
        hook.result.current.onContentLayout(
          layoutEvent({ y: contentY, height: 0 }),
        );
      }
      hook.result.current.onSectionLayout('nfl')(layoutEvent(nfl));
      hook.result.current.onSectionLayout('ncaa')(layoutEvent(ncaa));
    });
  const settleAt = (offset: number) =>
    act(() => {
      hook.result.current.onScrollSettled(scrollEvent(offset));
    });
  const scrollTo = async (
    offset: number,
    expectedVisibleKeys: readonly SectionKey[],
  ) => {
    act(() => {
      scrollY.value = offset;
    });
    await waitFor(() => {
      expect(hook.result.current.visibleKeys).toEqual(expectedVisibleKeys);
    });
  };
  const scrollToRaw = (offset: number) =>
    act(() => {
      scrollY.value = offset;
    });
  return { hook, layout, scrollTo, scrollToRaw, settleAt };
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
    const { layout, scrollTo } = renderSections();
    layout({
      viewportHeight: 800,
      nfl: { y: 200, height: 300 },
      ncaa: { y: 900, height: 300 },
    });

    await scrollTo(150, ['nfl', 'ncaa']);
    await scrollTo(600, ['ncaa']);
    await scrollTo(0, ['nfl']);
  });

  // A one-section-tall viewport, so a few pixels of scroll decide visibility.
  const tightLayout = {
    viewportHeight: 100,
    nfl: { y: 0, height: 100 },
    ncaa: { y: 1000, height: 100 },
  };

  it('coalesces scroll moves below the forwarding threshold', async () => {
    const { hook, layout, scrollTo, scrollToRaw } = renderSections();
    layout(tightLayout);

    await scrollTo(95, ['nfl']);

    // 5px further hides the section, but is too small to leave the UI thread.
    scrollToRaw(100);

    expect(hook.result.current.visibleKeys).toEqual(['nfl']);
  });

  it('recomputes from the exact offset once the scroll settles', async () => {
    const { hook, layout, scrollTo, scrollToRaw, settleAt } = renderSections();
    layout(tightLayout);
    await scrollTo(95, ['nfl']);
    scrollToRaw(100);

    settleAt(100);

    expect(hook.result.current.visibleKeys).toEqual([]);
  });

  it('accumulates small moves so a slow drag still crosses the threshold', async () => {
    const { hook, layout, scrollTo, scrollToRaw } = renderSections();
    layout(tightLayout);
    await scrollTo(95, ['nfl']);

    // Measured against the last forwarded offset, not the last frame, so
    // 4px steps add up instead of being ignored for the whole drag.
    scrollToRaw(99);
    expect(hook.result.current.visibleKeys).toEqual(['nfl']);
    scrollToRaw(103);

    await waitFor(() => {
      expect(hook.result.current.visibleKeys).toEqual([]);
    });
  });

  it('offsets section frames by the content wrapper', async () => {
    const { hook, layout, scrollTo } = renderSections();

    // Identical section frames, but the wrapper starts 200px down.
    layout({ ...tightLayout, contentY: 200 });

    expect(hook.result.current.visibleKeys).toEqual([]);
    await scrollTo(250, ['nfl']);
  });

  it('returns the same layout handler for a key across renders', () => {
    const { hook } = renderSections();
    const before = hook.result.current.onSectionLayout('nfl');

    hook.rerender(undefined);

    expect(hook.result.current.onSectionLayout('nfl')).toBe(before);
  });

  it('keeps the same array reference when recomputing the same visible set', () => {
    const { hook, layout } = renderSections();
    const measuredLayout = {
      viewportHeight: 800,
      nfl: { y: 200, height: 300 },
      ncaa: { y: 900, height: 300 },
    };
    layout(measuredLayout);
    const before = hook.result.current.visibleKeys;

    layout(measuredLayout);

    expect(hook.result.current.visibleKeys).toBe(before);
  });
});
