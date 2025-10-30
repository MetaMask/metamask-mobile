import React, {
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  ScrollView,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  View,
  LayoutChangeEvent,
} from 'react-native';

import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box } from '@metamask/design-system-react-native';

import TabsBar from '../TabsBar';
import { TabsListProps, TabsListRef, TabItem } from './TabsList.types';

// Timing constants for tab transitions and height measurements
// These values are tuned to balance animation smoothness with responsiveness

// Time to wait after scroll ends before measuring height (allows scroll animation to complete)
const SCROLL_SETTLE_DELAY = 200;

// Debounce delay for height measurements of already-loaded tabs (prevents excessive measurements)
const HEIGHT_MEASURE_DELAY = 100;

// Delay for measuring newly-loaded tab content (allows content to render before measuring)
const NEW_TAB_MEASURE_DELAY = 250;

// Delay before preloading adjacent tabs (improves perceived performance without blocking current tab)
const ADJACENT_PRELOAD_DELAY = 500;

// Threshold (in pixels) for considering a tab's height as "changed".
// Value chosen based on UI responsiveness requirements: small height changes (<5px) are
// ignored to prevent unnecessary re-renders.
const HEIGHT_CHANGE_THRESHOLD = 5;

// Initial delay before measuring tab height on first render (allows initial layout to complete)
const INITIAL_MEASURE_DELAY = 50;

const TabsList = forwardRef<TabsListRef, TabsListProps>(
  (
    {
      children,
      initialActiveIndex = 0,
      onChangeTab,
      testID,
      tabsBarProps,
      tabsListContentTwClassName,
      autoHeight = false,
      ...boxProps
    },
    ref,
  ) => {
    const tw = useTailwind();
    const [activeIndex, setActiveIndex] = useState(initialActiveIndex);
    const [containerWidth, setContainerWidth] = useState(
      Dimensions.get('window').width,
    );
    const [loadedTabs, setLoadedTabs] = useState<Set<number>>(new Set());
    const [tabHeights, setTabHeights] = useState<Map<string, number>>(
      new Map(),
    );
    const [scrollViewHeight, setScrollViewHeight] = useState<
      number | undefined
    >(undefined);
    const scrollViewRef = useRef<ScrollView>(null);
    const tabContentRefs = useRef<Map<string, View>>(new Map());
    const isScrolling = useRef(false);
    const isProgrammaticScroll = useRef(false);
    const pendingTabToLoad = useRef<number | null>(null);
    const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
    const loadTabTimeout = useRef<NodeJS.Timeout | null>(null);
    const programmaticScrollTimeout = useRef<NodeJS.Timeout | null>(null);
    const goToTabTimeout = useRef<NodeJS.Timeout | null>(null);
    const measurementTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

    const tabs: TabItem[] = useMemo(
      () =>
        React.Children.map(children, (child, index) => {
          if (React.isValidElement(child)) {
            const props = child.props as {
              tabLabel?: string;
              isDisabled?: boolean;
            };
            const tabLabel = props.tabLabel || `Tab ${index + 1}`;
            const isDisabled = props.isDisabled || false;
            return {
              key: child.key?.toString() || `tab-${index}`,
              label: tabLabel,
              content: child,
              isDisabled,
              isLoaded: false,
            };
          }
          return {
            key: `tab-${index}`,
            label: `Tab ${index + 1}`,
            content: child,
            isDisabled: false,
            isLoaded: false,
          };
        }) || [],
      [children],
    );

    const enabledTabs = useMemo(
      () =>
        tabs
          .map((tab, index) => ({ ...tab, originalIndex: index }))
          .filter((tab) => !tab.isDisabled),
      [tabs],
    );

    const getContentIndexFromTabIndex = useCallback(
      (tabIndex: number): number => {
        if (
          tabIndex < 0 ||
          tabIndex >= tabs.length ||
          tabs[tabIndex]?.isDisabled
        ) {
          return -1;
        }
        return enabledTabs.findIndex(
          (enabledTab) => enabledTab.originalIndex === tabIndex,
        );
      },
      [tabs, enabledTabs],
    );

    const getTabIndexFromContentIndex = useCallback(
      (contentIndex: number): number => {
        if (contentIndex < 0 || contentIndex >= enabledTabs.length) {
          return -1;
        }
        return enabledTabs[contentIndex]?.originalIndex ?? -1;
      },
      [enabledTabs],
    );

    const hasAnyEnabledTabs = useMemo(
      () => tabs.some((tab) => !tab.isDisabled),
      [tabs],
    );

    const shouldShowContent = useMemo(() => {
      if (!hasAnyEnabledTabs) return false;
      if (activeIndex < 0 || activeIndex >= tabs.length) return false;
      return !tabs[activeIndex]?.isDisabled;
    }, [hasAnyEnabledTabs, activeIndex, tabs]);

    useEffect(() => {
      const currentTabKeys = new Set(tabs.map((tab) => tab.key));
      setTabHeights((prev) => {
        const newHeights = new Map(prev);
        let hasChanges = false;

        Array.from(newHeights.keys()).forEach((key) => {
          if (!currentTabKeys.has(key)) {
            newHeights.delete(key);
            hasChanges = true;
          }
        });

        return hasChanges ? newHeights : prev;
      });

      Array.from(tabContentRefs.current.keys()).forEach((key) => {
        if (!currentTabKeys.has(key)) {
          tabContentRefs.current.delete(key);
        }
      });

      Array.from(measurementTimers.current.keys()).forEach((key) => {
        if (!currentTabKeys.has(key)) {
          const timer = measurementTimers.current.get(key);
          if (timer) {
            clearTimeout(timer);
            measurementTimers.current.delete(key);
          }
        }
      });
    }, [tabs]);

    const measureTabHeight = useCallback((tabKey: string) => {
      const tabContentRef = tabContentRefs.current.get(tabKey);
      if (!tabContentRef) return;

      const existingTimer = measurementTimers.current.get(tabKey);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const timer = setTimeout(() => {
        if (tabContentRefs.current.has(tabKey)) {
          tabContentRef.measure(
            (
              _x: number,
              _y: number,
              _width: number,
              height: number,
              _pageX: number,
              _pageY: number,
            ) => {
              if (height > 0 && tabContentRefs.current.has(tabKey)) {
                setTabHeights((prev) => {
                  const currentHeight = prev.get(tabKey);
                  if (
                    !currentHeight ||
                    Math.abs(currentHeight - height) > HEIGHT_CHANGE_THRESHOLD
                  ) {
                    const newHeights = new Map(prev);
                    newHeights.set(tabKey, height);
                    return newHeights;
                  }
                  return prev;
                });
              }
            },
          );
        }
        measurementTimers.current.delete(tabKey);
      }, HEIGHT_MEASURE_DELAY);

      measurementTimers.current.set(tabKey, timer);
    }, []);

    useEffect(() => {
      if (!autoHeight) {
        setScrollViewHeight(undefined);
        return;
      }

      const activeTab = tabs[activeIndex];
      if (!activeTab) {
        setScrollViewHeight(undefined);
        return;
      }

      const currentTabHeight = tabHeights.get(activeTab.key);

      if (currentTabHeight && currentTabHeight > 0) {
        setScrollViewHeight(currentTabHeight);
      } else {
        setScrollViewHeight(undefined);

        if (activeIndex >= 0 && loadedTabs.has(activeIndex)) {
          let isMeasurementRelevant = true;
          let rafCleanup: (() => void) | undefined;

          const timeoutId = setTimeout(() => {
            if (isMeasurementRelevant) {
              const rafId = requestAnimationFrame(() => {
                if (tabContentRefs.current.has(activeTab.key)) {
                  measureTabHeight(activeTab.key);
                }
              });
              rafCleanup = () => cancelAnimationFrame(rafId);
            }
          }, INITIAL_MEASURE_DELAY);

          return () => {
            isMeasurementRelevant = false;
            clearTimeout(timeoutId);
            if (rafCleanup) {
              rafCleanup();
            }
          };
        }
      }
    }, [
      activeIndex,
      tabHeights,
      loadedTabs,
      measureTabHeight,
      tabs,
      autoHeight,
    ]);

    useEffect(() => {
      if (activeIndex >= 0 && activeIndex < tabs.length) {
        setLoadedTabs((prev) => {
          const newLoadedTabs = new Set(prev);
          newLoadedTabs.add(activeIndex);
          return newLoadedTabs.size !== prev.size ? newLoadedTabs : prev;
        });
      }
    }, [activeIndex, tabs.length]);

    useEffect(() => {
      if (!isScrolling.current && activeIndex >= 0) {
        const preloadTimer = setTimeout(() => {
          setLoadedTabs((prev) => {
            const newLoadedTabs = new Set(prev);
            let hasChanges = false;

            if (activeIndex > 0 && !tabs[activeIndex - 1]?.isDisabled) {
              if (!newLoadedTabs.has(activeIndex - 1)) {
                newLoadedTabs.add(activeIndex - 1);
                hasChanges = true;
              }
            }

            if (
              activeIndex < tabs.length - 1 &&
              !tabs[activeIndex + 1]?.isDisabled
            ) {
              if (!newLoadedTabs.has(activeIndex + 1)) {
                newLoadedTabs.add(activeIndex + 1);
                hasChanges = true;
              }
            }

            return hasChanges ? newLoadedTabs : prev;
          });
        }, ADJACENT_PRELOAD_DELAY);

        return () => clearTimeout(preloadTimer);
      }
    }, [activeIndex, tabs]);

    useEffect(
      () => () => {
        if (scrollTimeout.current) {
          clearTimeout(scrollTimeout.current);
          scrollTimeout.current = null;
        }
        if (loadTabTimeout.current) {
          clearTimeout(loadTabTimeout.current);
          loadTabTimeout.current = null;
        }
        if (programmaticScrollTimeout.current) {
          clearTimeout(programmaticScrollTimeout.current);
          programmaticScrollTimeout.current = null;
        }
        if (goToTabTimeout.current) {
          clearTimeout(goToTabTimeout.current);
          goToTabTimeout.current = null;
        }
        Array.from(measurementTimers.current.values()).forEach((timer) => {
          clearTimeout(timer);
        });
        measurementTimers.current.clear();
        tabContentRefs.current.clear();
      },
      [],
    );

    useEffect(() => {
      const currentActiveTabKey = tabs[activeIndex]?.key;

      if (currentActiveTabKey && tabs.length > 0) {
        const newIndexForCurrentTab = tabs.findIndex(
          (tab) => tab.key === currentActiveTabKey,
        );
        if (
          newIndexForCurrentTab >= 0 &&
          !tabs[newIndexForCurrentTab].isDisabled &&
          newIndexForCurrentTab !== activeIndex
        ) {
          setActiveIndex(newIndexForCurrentTab);
          return;
        }
      }

      if (
        activeIndex >= 0 &&
        activeIndex < tabs.length &&
        !tabs[activeIndex]?.isDisabled
      ) {
        return;
      }

      const targetTab = tabs[initialActiveIndex];
      if (targetTab && !targetTab.isDisabled) {
        setActiveIndex(initialActiveIndex);
      } else {
        const firstEnabledIndex = tabs.findIndex((tab) => !tab.isDisabled);
        setActiveIndex(firstEnabledIndex >= 0 ? firstEnabledIndex : -1);
      }
    }, [initialActiveIndex, tabs, activeIndex]);

    useEffect(() => {
      if (scrollViewRef.current && containerWidth > 0) {
        const contentIndex = getContentIndexFromTabIndex(activeIndex);
        if (contentIndex >= 0) {
          scrollViewRef.current.scrollTo({
            x: contentIndex * containerWidth,
            animated: !isScrolling.current,
          });
        }
      }
    }, [activeIndex, containerWidth, getContentIndexFromTabIndex]);

    const handleTabPress = useCallback(
      (tabIndex: number) => {
        if (
          tabIndex < 0 ||
          tabIndex >= tabs.length ||
          tabs[tabIndex]?.isDisabled
        ) {
          return;
        }

        const contentIndex = getContentIndexFromTabIndex(tabIndex);
        if (contentIndex < 0) return;

        const tabChanged = tabIndex !== activeIndex;

        setActiveIndex(tabIndex);

        if (
          (process.env.JEST_WORKER_ID || process.env.E2E) &&
          !loadedTabs.has(tabIndex)
        ) {
          setLoadedTabs((prev) => new Set(prev).add(tabIndex));
        } else if (!loadedTabs.has(tabIndex)) {
          pendingTabToLoad.current = tabIndex;
        }

        isProgrammaticScroll.current = true;

        if (scrollViewRef.current && containerWidth > 0) {
          scrollViewRef.current.scrollTo({
            x: contentIndex * containerWidth,
            animated: true,
          });
        }

        if (onChangeTab && tabChanged) {
          onChangeTab({
            i: tabIndex,
            ref: tabs[tabIndex]?.content || null,
          });
        }

        if (programmaticScrollTimeout.current) {
          clearTimeout(programmaticScrollTimeout.current);
        }
        programmaticScrollTimeout.current = setTimeout(() => {
          isProgrammaticScroll.current = false;
          programmaticScrollTimeout.current = null;
        }, 400);
      },
      [
        activeIndex,
        tabs,
        onChangeTab,
        containerWidth,
        getContentIndexFromTabIndex,
        loadedTabs,
      ],
    );

    const handleScroll = useCallback(
      (scrollEvent: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (isProgrammaticScroll.current) return;

        const { contentOffset } = scrollEvent.nativeEvent;
        if (containerWidth <= 0) return;

        const contentIndex = Math.round(contentOffset.x / containerWidth);
        const newTabIndex = getTabIndexFromContentIndex(contentIndex);

        if (newTabIndex >= 0 && newTabIndex !== activeIndex) {
          setActiveIndex(newTabIndex);

          if (!loadedTabs.has(newTabIndex)) {
            pendingTabToLoad.current = newTabIndex;
          }

          if (onChangeTab) {
            onChangeTab({
              i: newTabIndex,
              ref: tabs[newTabIndex]?.content || null,
            });
          }
        }
      },
      [
        activeIndex,
        containerWidth,
        onChangeTab,
        tabs,
        getTabIndexFromContentIndex,
        loadedTabs,
      ],
    );

    const handleScrollBegin = useCallback(() => {
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }

      if (!isProgrammaticScroll.current) {
        isScrolling.current = true;
      }
    }, []);

    const handleScrollEnd = useCallback(() => {
      scrollTimeout.current = setTimeout(() => {
        isScrolling.current = false;

        if (pendingTabToLoad.current !== null) {
          const tabToLoad = pendingTabToLoad.current;
          pendingTabToLoad.current = null;

          setLoadedTabs((prev) => {
            if (prev.has(tabToLoad)) return prev;
            return new Set(prev).add(tabToLoad);
          });

          if (autoHeight) {
            if (loadTabTimeout.current) {
              clearTimeout(loadTabTimeout.current);
            }
            loadTabTimeout.current = setTimeout(() => {
              const tab = tabs[tabToLoad];
              if (tab) measureTabHeight(tab.key);
              loadTabTimeout.current = null;
            }, NEW_TAB_MEASURE_DELAY);
          }
        } else if (autoHeight) {
          const activeTab = tabs[activeIndex];
          if (activeTab && loadedTabs.has(activeIndex)) {
            const cachedHeight = tabHeights.get(activeTab.key);
            if (cachedHeight && cachedHeight > 0) {
              setScrollViewHeight(cachedHeight);
            }
            if (loadTabTimeout.current) {
              clearTimeout(loadTabTimeout.current);
            }
            loadTabTimeout.current = setTimeout(() => {
              if (tabs[activeIndex]) {
                measureTabHeight(tabs[activeIndex].key);
              }
              loadTabTimeout.current = null;
            }, HEIGHT_MEASURE_DELAY);
          }
        }
      }, SCROLL_SETTLE_DELAY);
    }, [
      activeIndex,
      loadedTabs,
      measureTabHeight,
      tabs,
      tabHeights,
      autoHeight,
    ]);

    const handleLayout = useCallback(
      (layoutEvent: { nativeEvent: { layout: { width: number } } }) => {
        const { width } = layoutEvent.nativeEvent.layout;
        setContainerWidth(width);
      },
      [],
    );

    useImperativeHandle(
      ref,
      () => ({
        goToTabIndex: (tabIndex: number) => {
          if (
            tabIndex < 0 ||
            tabIndex >= tabs.length ||
            tabs[tabIndex]?.isDisabled
          ) {
            return;
          }

          const contentIndex = getContentIndexFromTabIndex(tabIndex);
          if (contentIndex < 0) return;

          const tabChanged = tabIndex !== activeIndex;

          setActiveIndex(tabIndex);

          if (
            (process.env.JEST_WORKER_ID || process.env.E2E) &&
            !loadedTabs.has(tabIndex)
          ) {
            setLoadedTabs((prev) => new Set(prev).add(tabIndex));
          } else if (!loadedTabs.has(tabIndex)) {
            pendingTabToLoad.current = tabIndex;
          }

          isProgrammaticScroll.current = true;

          if (scrollViewRef.current && containerWidth > 0) {
            scrollViewRef.current.scrollTo({
              x: contentIndex * containerWidth,
              animated: true,
            });
          }

          if (onChangeTab && tabChanged) {
            onChangeTab({
              i: tabIndex,
              ref: tabs[tabIndex]?.content || null,
            });
          }

          if (goToTabTimeout.current) {
            clearTimeout(goToTabTimeout.current);
          }
          goToTabTimeout.current = setTimeout(() => {
            isProgrammaticScroll.current = false;
            goToTabTimeout.current = null;
          }, 400);
        },
        getCurrentIndex: () => activeIndex,
      }),
      [
        activeIndex,
        tabs,
        onChangeTab,
        containerWidth,
        getContentIndexFromTabIndex,
        loadedTabs,
      ],
    );

    const tabBarPropsComputed = useMemo(
      () => ({
        tabs,
        activeIndex,
        onTabPress: handleTabPress,
        testID: testID ? `${testID}-bar` : undefined,
        ...tabsBarProps,
      }),
      [tabs, activeIndex, handleTabPress, testID, tabsBarProps],
    );

    const commonScrollViewProps = useMemo(
      () => ({
        ref: scrollViewRef,
        horizontal: true,
        pagingEnabled: true,
        showsHorizontalScrollIndicator: false,
        onScroll: handleScroll,
        onScrollAnimationEnd: handleScrollEnd,
        onScrollBeginDrag: handleScrollBegin,
        onScrollEndDrag: handleScrollEnd,
        onMomentumScrollBegin: handleScrollBegin,
        onMomentumScrollEnd: handleScrollEnd,
        scrollEventThrottle: 16,
        onLayout: handleLayout,
        decelerationRate: 'fast' as const,
        testID: testID ? `${testID}-content` : undefined,
      }),
      [handleScroll, handleScrollEnd, handleScrollBegin, handleLayout, testID],
    );

    const handleAutoHeightLayout = useCallback(
      (enabledTab: (typeof enabledTabs)[0], layoutEvent: LayoutChangeEvent) => {
        const { height } = layoutEvent.nativeEvent.layout;
        if (height > 0) {
          const currentHeight = tabHeights.get(enabledTab.key);

          if (
            !currentHeight ||
            Math.abs(currentHeight - height) > HEIGHT_CHANGE_THRESHOLD
          ) {
            setTabHeights((prev) => {
              const latestHeight = prev.get(enabledTab.key);
              if (
                latestHeight &&
                Math.abs(latestHeight - height) <= HEIGHT_CHANGE_THRESHOLD
              ) {
                return prev;
              }
              const newHeights = new Map(prev);
              newHeights.set(enabledTab.key, height);
              return newHeights;
            });

            if (
              enabledTab.originalIndex === activeIndex &&
              tabContentRefs.current.has(enabledTab.key) &&
              !isScrolling.current &&
              !isProgrammaticScroll.current
            ) {
              setScrollViewHeight(height);
            }
          }
        }
      },
      [activeIndex, tabHeights],
    );

    return (
      <Box
        twClassName={autoHeight ? '' : 'flex-1'}
        testID={testID}
        {...boxProps}
      >
        <TabsBar {...tabBarPropsComputed} />

        {autoHeight ? (
          <View
            style={tw.style(
              'mt-2',
              scrollViewHeight && scrollViewHeight > 0
                ? { height: scrollViewHeight, overflow: 'hidden' }
                : {},
            )}
          >
            <ScrollView {...commonScrollViewProps} style={tw.style('w-full')}>
              {enabledTabs.map((enabledTab) => (
                <View
                  key={enabledTab.key}
                  style={tw.style({ width: containerWidth })}
                >
                  <View
                    style={tw.style(`px-4 ${tabsListContentTwClassName || ''}`)}
                    ref={(viewRef) => {
                      if (viewRef) {
                        tabContentRefs.current.set(enabledTab.key, viewRef);
                      }
                    }}
                    onLayout={(layoutEvent) =>
                      handleAutoHeightLayout(enabledTab, layoutEvent)
                    }
                  >
                    {loadedTabs.has(enabledTab.originalIndex) &&
                    shouldShowContent
                      ? enabledTab.content
                      : null}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : (
          <ScrollView
            {...commonScrollViewProps}
            style={tw.style('flex-1 mt-2')}
          >
            {enabledTabs.map((enabledTab) => (
              <Box
                key={enabledTab.key}
                style={tw.style(
                  `flex-1 px-4 ${tabsListContentTwClassName || ''}`,
                  {
                    width: containerWidth,
                  },
                )}
              >
                {loadedTabs.has(enabledTab.originalIndex) && shouldShowContent
                  ? enabledTab.content
                  : null}
              </Box>
            ))}
          </ScrollView>
        )}
      </Box>
    );
  },
);

TabsList.displayName = 'TabsList';

export default TabsList;
