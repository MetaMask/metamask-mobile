import {
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  default as PagerView,
  PagerViewOnPageSelectedEvent,
  PageScrollStateChangedNativeEvent,
} from 'react-native-pager-view';

export interface UseTabPagerOptions<TabKey extends string> {
  /**
   * Keys of the visible tabs, in pager order.
   */
  tabKeys: readonly TabKey[];
  /**
   * Tab highlighted in the tabs bar. Follows a drag before it settles.
   */
  selectedTab: TabKey;
  /**
   * Tab whose page content is committed. Only changes once the pager settles.
   */
  renderedTab: TabKey;
  setSelectedTab: (tab: TabKey) => void;
  setRenderedTab: (tab: TabKey) => void;
  /**
   * Tab requested from outside (e.g. a deep link) that the session hasn't
   * switched to yet. It wins over `selectedTab` while it's set.
   */
  pendingTab?: TabKey;
  /**
   * Keeps the outgoing page and the pages a drag can reveal mounted while the
   * pager moves. When `false`, only `renderedTab` is mounted and the incoming
   * page fills in once the pager settles.
   */
  mountTransitionPages: boolean;
}

/**
 * Drives a `PagerView` whose pages are keyed tabs, deferring the page content
 * swap until the pager is idle so the tabs bar stays responsive mid-swipe.
 *
 * @param options - See {@link UseTabPagerOptions}.
 * @returns Props and handlers to wire into `PagerView` and the tabs bar.
 */
export const useTabPager = <TabKey extends string>({
  tabKeys,
  selectedTab,
  renderedTab,
  setSelectedTab,
  setRenderedTab,
  pendingTab,
  mountTransitionPages,
}: UseTabPagerOptions<TabKey>) => {
  const pagerRef = useRef<PagerView>(null);
  // Set when a tab press or a pager swipe already moved the pager, so the
  // sync effect below only snaps it for external tab changes (deep links,
  // feature flag fallback).
  const isPagerDrivenChangeRef = useRef(false);
  const settledPageRef = useRef<number | null>(null);
  // Pages besides `renderedTab` that stay mounted until the pager is idle:
  // the outgoing page while a tab press slides it away, and the neighbours
  // a drag can reveal.
  const [outgoingTab, setOutgoingTab] = useState<TabKey | null>(null);
  const [previewTabs, setPreviewTabs] = useState<TabKey[]>([]);

  // The native pager tracks its page by index only, so when the tab set
  // changes (feature flag flip) the pager is remounted on `activeIndex`.
  // Otherwise it keeps an index that now points at a different tab, or past
  // the last one, and reports that index back through `onPageSelected`.
  const pagerKey = tabKeys.join('|');

  // The pager mounts, and locks in `initialPage`, before the session moves to
  // a pending tab, so a pending tab wins over the session tab.
  const activeTab =
    pendingTab && tabKeys.includes(pendingTab) ? pendingTab : selectedTab;

  const activeIndex = useMemo(
    () => Math.max(tabKeys.indexOf(activeTab), 0),
    [tabKeys, activeTab],
  );

  const renderedIndex = useMemo(
    () => Math.max(tabKeys.indexOf(renderedTab), 0),
    [tabKeys, renderedTab],
  );

  const moveTabsBarTo = useCallback(
    (nextTab: TabKey) => {
      if (nextTab === selectedTab) {
        return;
      }
      isPagerDrivenChangeRef.current = true;
      setSelectedTab(nextTab);
    },
    [selectedTab, setSelectedTab],
  );

  const handleTabPress = useCallback(
    (index: number) => {
      const nextTab = tabKeys[index];
      if (nextTab === undefined || nextTab === selectedTab) {
        return;
      }
      settledPageRef.current = index;
      if (mountTransitionPages) {
        setOutgoingTab(renderedTab);
      }
      moveTabsBarTo(nextTab);
      pagerRef.current?.setPage(index);
      startTransition(() => setRenderedTab(nextTab));
    },
    [
      tabKeys,
      selectedTab,
      mountTransitionPages,
      renderedTab,
      moveTabsBarTo,
      setRenderedTab,
    ],
  );

  // iOS reports the page as soon as a drag crosses the halfway point, while
  // the finger is still down, so only the tabs bar follows it here. The page
  // content is committed once the pager is idle.
  const handlePageSelected = useCallback(
    (event: PagerViewOnPageSelectedEvent) => {
      const { position } = event.nativeEvent;
      settledPageRef.current = position;
      const nextTab = tabKeys[position];
      if (nextTab) {
        moveTabsBarTo(nextTab);
      }
    },
    [tabKeys, moveTabsBarTo],
  );

  const handlePageScrollStateChanged = useCallback(
    (event: PageScrollStateChangedNativeEvent) => {
      const { pageScrollState } = event.nativeEvent;

      if (pageScrollState === 'dragging') {
        // Mount both neighbours up front so the page sliding in is already
        // filled in, and stays mounted if the drag changes direction.
        if (mountTransitionPages) {
          setPreviewTabs(
            [tabKeys[renderedIndex - 1], tabKeys[renderedIndex + 1]].filter(
              (tab): tab is TabKey => tab !== undefined,
            ),
          );
        }
        return;
      }

      if (pageScrollState !== 'idle') {
        return;
      }

      setOutgoingTab(null);
      const settledTab =
        settledPageRef.current === null
          ? undefined
          : tabKeys[settledPageRef.current];
      if (settledTab && settledTab !== renderedTab) {
        moveTabsBarTo(settledTab);
        // Keeps the settled page mounted until the deferred `renderedTab`
        // catches up.
        setPreviewTabs([settledTab]);
        startTransition(() => setRenderedTab(settledTab));
      } else {
        setPreviewTabs([]);
      }
    },
    [
      mountTransitionPages,
      tabKeys,
      renderedIndex,
      renderedTab,
      moveTabsBarTo,
      setRenderedTab,
    ],
  );

  useEffect(() => {
    setPreviewTabs((previewed) =>
      previewed.includes(renderedTab)
        ? previewed.filter((tab) => tab !== renderedTab)
        : previewed,
    );
  }, [renderedTab]);

  // A remounted pager never reports the old pager's pending page or idle
  // state, so drop what was tracked for it.
  useLayoutEffect(() => {
    settledPageRef.current = null;
    setOutgoingTab(null);
    setPreviewTabs([]);
  }, [pagerKey]);

  useEffect(() => {
    if (isPagerDrivenChangeRef.current) {
      isPagerDrivenChangeRef.current = false;
      return;
    }
    pagerRef.current?.setPageWithoutAnimation(activeIndex);
  }, [activeIndex]);

  const mountedTabs = useMemo(
    () =>
      new Set<TabKey>(
        [renderedTab, outgoingTab, ...previewTabs].filter(
          (tab): tab is TabKey => tab !== null,
        ),
      ),
    [renderedTab, outgoingTab, previewTabs],
  );

  return {
    pagerRef,
    pagerKey,
    activeIndex,
    renderedIndex,
    mountedTabs,
    handleTabPress,
    handlePageSelected,
    handlePageScrollStateChanged,
  };
};
