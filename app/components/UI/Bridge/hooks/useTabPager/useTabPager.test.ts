import { useState } from 'react';
import { act, renderHook } from '@testing-library/react-native';
import type {
  default as PagerView,
  PagerViewOnPageSelectedEvent,
  PageScrollStateChangedNativeEvent,
} from 'react-native-pager-view';
import { useTabPager } from './index';

type Tab = 'a' | 'b' | 'c';

interface HarnessProps {
  tabKeys: readonly Tab[];
  pendingTab?: Tab;
  mountTransitionPages?: boolean;
}

const pageSelected = (position: number) =>
  ({ nativeEvent: { position } }) as PagerViewOnPageSelectedEvent;

const scrollState = (
  pageScrollState: PageScrollStateChangedNativeEvent['nativeEvent']['pageScrollState'],
) =>
  ({ nativeEvent: { pageScrollState } }) as PageScrollStateChangedNativeEvent;

const renderTabPager = (
  initialProps: HarnessProps,
  initialTab: Tab = initialProps.tabKeys[0],
) => {
  const pager = {
    setPage: jest.fn(),
    setPageWithoutAnimation: jest.fn(),
  };
  const hook = renderHook(
    ({ tabKeys, pendingTab, mountTransitionPages = true }: HarnessProps) => {
      const [selectedTab, setSelectedTab] = useState<Tab>(initialTab);
      const [renderedTab, setRenderedTab] = useState<Tab>(initialTab);
      const result = useTabPager({
        tabKeys,
        selectedTab,
        renderedTab,
        setSelectedTab,
        setRenderedTab,
        pendingTab,
        mountTransitionPages,
      });
      (result.pagerRef as { current: unknown }).current = pager;
      return { ...result, selectedTab, renderedTab, setSelectedTab };
    },
    { initialProps },
  );
  pager.setPageWithoutAnimation.mockClear();
  return { ...hook, pager: pager as unknown as jest.Mocked<PagerView> };
};

const TABS: readonly Tab[] = ['a', 'b', 'c'];

describe('useTabPager', () => {
  it('points the active index at the selected tab', () => {
    const { result } = renderTabPager({ tabKeys: TABS }, 'b');

    expect(result.current.activeIndex).toBe(1);
    expect(result.current.renderedIndex).toBe(1);
    expect([...result.current.mountedTabs]).toEqual(['b']);
  });

  it('points the active index at a pending tab that is visible', () => {
    const { result } = renderTabPager({ tabKeys: TABS, pendingTab: 'c' });

    expect(result.current.activeIndex).toBe(2);
  });

  it('ignores a pending tab that is not visible', () => {
    const { result } = renderTabPager({ tabKeys: ['a', 'b'], pendingTab: 'c' });

    expect(result.current.activeIndex).toBe(0);
  });

  it('keeps the outgoing page mounted until the pager settles after a tab press', () => {
    const { result, pager } = renderTabPager({ tabKeys: TABS });

    act(() => result.current.handleTabPress(2));

    expect(pager.setPage).toHaveBeenCalledWith(2);
    expect(pager.setPageWithoutAnimation).not.toHaveBeenCalled();
    expect(result.current.selectedTab).toBe('c');
    expect(result.current.renderedTab).toBe('c');
    expect([...result.current.mountedTabs].sort()).toEqual(['a', 'c']);

    act(() => result.current.handlePageScrollStateChanged(scrollState('idle')));

    expect([...result.current.mountedTabs]).toEqual(['c']);
  });

  it('mounts only the rendered page on a tab press when transition pages are off', () => {
    const { result } = renderTabPager({
      tabKeys: TABS,
      mountTransitionPages: false,
    });

    act(() => result.current.handleTabPress(1));

    expect([...result.current.mountedTabs]).toEqual(['b']);
  });

  it('ignores a press on the selected tab or an unknown index', () => {
    const { result, pager } = renderTabPager({ tabKeys: TABS });

    act(() => result.current.handleTabPress(0));
    act(() => result.current.handleTabPress(5));

    expect(pager.setPage).not.toHaveBeenCalled();
    expect(result.current.selectedTab).toBe('a');
  });

  it('moves only the tabs bar mid-drag and commits the page once idle', () => {
    const { result, pager } = renderTabPager({ tabKeys: TABS }, 'b');

    act(() =>
      result.current.handlePageScrollStateChanged(scrollState('dragging')),
    );

    expect([...result.current.mountedTabs].sort()).toEqual(['a', 'b', 'c']);

    act(() => result.current.handlePageSelected(pageSelected(2)));

    expect(result.current.selectedTab).toBe('c');
    expect(result.current.renderedTab).toBe('b');

    act(() => result.current.handlePageScrollStateChanged(scrollState('idle')));

    expect(result.current.renderedTab).toBe('c');
    expect([...result.current.mountedTabs]).toEqual(['c']);
    expect(pager.setPageWithoutAnimation).not.toHaveBeenCalled();
  });

  it('does not mount neighbours on drag when transition pages are off', () => {
    const { result } = renderTabPager(
      { tabKeys: TABS, mountTransitionPages: false },
      'b',
    );

    act(() =>
      result.current.handlePageScrollStateChanged(scrollState('dragging')),
    );

    expect([...result.current.mountedTabs]).toEqual(['b']);
  });

  it('drops the neighbours when a drag settles back on the rendered page', () => {
    const { result } = renderTabPager({ tabKeys: TABS }, 'b');

    act(() =>
      result.current.handlePageScrollStateChanged(scrollState('dragging')),
    );
    act(() => result.current.handlePageSelected(pageSelected(1)));
    act(() => result.current.handlePageScrollStateChanged(scrollState('idle')));

    expect(result.current.renderedTab).toBe('b');
    expect([...result.current.mountedTabs]).toEqual(['b']);
  });

  it('snaps the pager without animation when the selected tab changes externally', () => {
    const { result, pager } = renderTabPager({ tabKeys: TABS });

    act(() => result.current.setSelectedTab('c'));

    expect(pager.setPageWithoutAnimation).toHaveBeenCalledWith(2);
  });

  it('changes the pager key and drops transition pages when the tab set changes', () => {
    const { result, rerender } = renderTabPager({ tabKeys: TABS });
    const initialKey = result.current.pagerKey;
    act(() => result.current.handleTabPress(1));

    rerender({ tabKeys: ['a', 'b'] });

    expect(result.current.pagerKey).not.toBe(initialKey);
    expect([...result.current.mountedTabs]).toEqual(['b']);
  });
});
