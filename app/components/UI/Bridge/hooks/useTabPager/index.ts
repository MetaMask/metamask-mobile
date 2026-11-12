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

/**
 * Commits a pressed tab if the pager never reports `idle` after `setPage`.
 * Longer than the native page animation so it only fires when that event is
 * missing.
 */
export const TAB_PRESS_COMMIT_FALLBACK_MS = 600;

export interface UseTabPagerOptions<TabKey extends string> {
  /**
   * Keys of the visible tabs, in pager order.
   */
  tabKeys: readonly TabKey[];
  /**
   * Tab highlighted in the tabs bar. Follows a press or a drag right away.
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
   * Mounts the pages a drag can reveal while the finger is down, and a
   * pressed page before it slides in. When `false`, they show their
   * placeholder until the pager settles.
   */
  mountTransitionPages: boolean;
}

/**
 * Drives a `PagerView` whose pages are keyed tabs. A press or a drag only
 * moves the tabs bar and the pager; the page content swap, and everything
 * keyed on `renderedTab`, waits until the pager is idle so it never competes
 * with the page animation.
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
  // The tab a press or a drag is moving to, until the pager settles. Tracked
  // by key so it still points at the right tab if the tab set changes first.
  const settledTabRef = useRef<TabKey | null>(null);
  const commitFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Page a tab press animates to once the press has committed.
  const pressedPageRef = useRef<number | null>(null);
  // Pages besides `renderedTab` that stay mounted until the pager is idle:
  // the neighbours a drag can reveal, a pressed page, and the settled page
  // until the deferred `renderedTab` catches up.
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

  const cancelCommitFallback = useCallback(() => {
    if (commitFallbackRef.current !== null) {
      clearTimeout(commitFallbackRef.current);
      commitFallbackRef.current = null;
    }
  }, []);

  const commitSettledTab = useCallback(() => {
    cancelCommitFallback();
    const settledTab = settledTabRef.current;
    settledTabRef.current = null;
    if (
      settledTab &&
      settledTab !== renderedTab &&
      tabKeys.includes(settledTab)
    ) {
      moveTabsBarTo(settledTab);
      // Keeps the settled page mounted until the deferred `renderedTab`
      // catches up.
      setPreviewTabs([settledTab]);
      startTransition(() => setRenderedTab(settledTab));
    } else {
      setPreviewTabs([]);
    }
  }, [
    cancelCommitFallback,
    renderedTab,
    tabKeys,
    moveTabsBarTo,
    setRenderedTab,
  ]);

  // The fallback timer and the pager remount below run outside a render, so
  // they read the latest commit through this ref.
  const commitSettledTabRef = useRef(commitSettledTab);
  useLayoutEffect(() => {
    commitSettledTabRef.current = commitSettledTab;
  }, [commitSettledTab]);

  const handleTabPress = useCallback(
    (index: number) => {
      const nextTab = tabKeys[index];
      if (nextTab === undefined || nextTab === selectedTab) {
        return;
      }
      settledTabRef.current = nextTab;
      pressedPageRef.current = index;
      moveTabsBarTo(nextTab);
      if (mountTransitionPages) {
        setPreviewTabs([nextTab]);
      }
      cancelCommitFallback();
      commitFallbackRef.current = setTimeout(
        () => commitSettledTabRef.current(),
        TAB_PRESS_COMMIT_FALLBACK_MS,
      );
    },
    [
      tabKeys,
      selectedTab,
      moveTabsBarTo,
      mountTransitionPages,
      cancelCommitFallback,
    ],
  );

  // iOS reports the page as soon as a drag crosses the halfway point, while
  // the finger is still down, so only the tabs bar follows it here. The page
  // content is committed once the pager is idle.
  const handlePageSelected = useCallback(
    (event: PagerViewOnPageSelectedEvent) => {
      const nextTab = tabKeys[event.nativeEvent.position];
      if (nextTab) {
        settledTabRef.current = nextTab;
        moveTabsBarTo(nextTab);
      }
    },
    [tabKeys, moveTabsBarTo],
  );

  const handlePageScrollStateChanged = useCallback(
    (event: PageScrollStateChangedNativeEvent) => {
      const { pageScrollState } = event.nativeEvent;
      if (pageScrollState === 'dragging') {
        // The drag now owns the pager; its own idle event commits the page.
        cancelCommitFallback();
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

      if (pageScrollState === 'idle') {
        commitSettledTab();
      }
    },
    [
      cancelCommitFallback,
      mountTransitionPages,
      tabKeys,
      renderedIndex,
      commitSettledTab,
    ],
  );

  useEffect(() => {
    setPreviewTabs((previewed) =>
      previewed.includes(renderedTab)
        ? previewed.filter((tab) => tab !== renderedTab)
        : previewed,
    );
  }, [renderedTab]);

  // A remounted pager starts on `activeIndex` without animating and never
  // reports the old pager's idle state, so commit whatever was in flight.
  useLayoutEffect(() => {
    commitSettledTabRef.current();
  }, [pagerKey]);

  // Animates only after the press commits, so the pressed page is already
  // mounted when it starts sliding in.
  useLayoutEffect(() => {
    const page = pressedPageRef.current;
    if (page === null) {
      return;
    }
    pressedPageRef.current = null;
    pagerRef.current?.setPage(page);
  }, [selectedTab]);

  useEffect(() => cancelCommitFallback, [cancelCommitFallback]);

  useEffect(() => {
    if (isPagerDrivenChangeRef.current) {
      isPagerDrivenChangeRef.current = false;
      return;
    }
    pagerRef.current?.setPageWithoutAnimation(activeIndex);
  }, [activeIndex]);

  const mountedTabs = useMemo(
    () => new Set<TabKey>([renderedTab, ...previewTabs]),
    [renderedTab, previewTabs],
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
