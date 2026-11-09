import React, {
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  type RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import PagerView, {
  type PagerViewOnPageSelectedEvent,
  type PageScrollStateChangedNativeEvent,
} from 'react-native-pager-view';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box, IconName } from '@metamask/design-system-react-native';
import {
  TabsBar,
  type TabItem,
} from '../../../../../component-library/components-temp/Tabs';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Engine from '../../../../../core/Engine';
import {
  resetBridgeState,
  selectBridgeViewMode,
  selectDestAddress,
  selectDestToken,
  selectSlippage,
  selectSourceAmount,
  selectSourceToken,
  setDestAmount,
  setSelectedQuoteRequestId,
  setBridgeViewMode,
  setLimitOrderCostTolerance,
  setLimitOrderExpirationMinutes,
  setRecurringEveryUnit,
  setRecurringEveryValue,
  setRecurringRepeatCount,
} from '../../../../../core/redux/slices/bridge';
import { BridgeViewMode } from '../../types';
import { useBridgeSession } from '../../hooks/useBridgeSession';
import { useEnsureDestTokenSecurityData } from '../../hooks/useEnsureDestTokenSecurityData';
import {
  selectBridgeLimitOrderTabEnabledFlag,
  selectBridgeRecurringBuyTabEnabledFlag,
} from '../../../../../selectors/bridge/featureFlags';
import { BridgeTabKey } from './BridgeView.constants';
import { BridgeViewSelectorsIDs } from './BridgeView.testIds';
import BridgeMarketView from './BridgeMarketView';
import BridgeLimitOrderView from './BridgeLimitOrderView';
import BridgeRecurringBuyView from './BridgeRecurringBuyView';
import BridgeTabPageSkeleton from './BridgeTabPageSkeleton';
import type { QuoteParams } from '../../providers/SwapQuotesProvider/utils';
import { selectSourceWalletAddress } from '../../../../../selectors/bridge';
import type { BridgeRouteParams } from '../../hooks/useSwapBridgeNavigation';
import { useInitialSourceToken } from '../../hooks/useInitialSourceToken';
import { useInitialDestToken } from '../../hooks/useInitialDestToken';
import { useReconcileInputsForNonMarketSwapTab } from '../../hooks/useReconcileInputsForNonMarketSwapTab';
import { OrdersTabKey } from '../../components/OrdersTabs';
import { useTrackSwapPageViewed } from '../../hooks/useTrackSwapPageViewed';
import { MetaMetricsSwapsEventSource } from '@metamask/bridge-controller';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';
import { getHardwareTier } from '../../../../../util/deviceCapability';

const BridgeView = () => {
  const tw = useTailwind();
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  // Low-RAM devices only ever mount the rendered tab, so the incoming page
  // fills in once the pager settles instead of while it slides.
  const [isLowHardware] = useState(() => getHardwareTier() === 'LOW');
  const pagerRef = useRef<PagerView>(null);
  // Set when a tab press or a pager swipe already moved the pager, so the
  // sync effect below only snaps it for external tab changes (deep links,
  // feature flag fallback).
  const isPagerDrivenChangeRef = useRef(false);
  const settledPageRef = useRef<number | null>(null);
  // Pages besides `renderedTab` that stay mounted until the pager is idle:
  // the outgoing page while a tab press slides it away, and the neighbours
  // a drag can reveal.
  const [outgoingTab, setOutgoingTab] = useState<BridgeTabKey | null>(null);
  const [previewTabs, setPreviewTabs] = useState<BridgeTabKey[]>([]);
  const {
    selectedTab,
    renderedTab,
    setSelectedTab,
    setRenderedTab,
    setLimitOrdersTab,
    setRecurringOrdersTab,
    setQuoteParams,
  } = useBridgeSession();
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<RouteProp<{ params: BridgeRouteParams }, 'params'>>();
  const dispatch = useDispatch();
  const bridgeViewMode = useSelector(selectBridgeViewMode);
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);
  const sourceAmount = useSelector(selectSourceAmount);
  const slippage = useSelector(selectSlippage);
  const walletAddress = useSelector(selectSourceWalletAddress);
  const destAddress = useSelector(selectDestAddress);
  useEnsureDestTokenSecurityData();

  const isLimitOrderTabEnabled = useSelector(
    selectBridgeLimitOrderTabEnabledFlag,
  );
  const isRecurringBuyTabEnabled = useSelector(
    selectBridgeRecurringBuyTabEnabledFlag,
  );
  const initialTab = route.params?.initialTab;
  const initialSourceToken = route.params?.sourceToken;
  const initialSourceAmount = route.params?.sourceAmount;
  const initialDestToken = route.params?.destToken;
  const initialLimitOrderExpirationMinutes =
    route.params?.initialLimitOrderExpirationMinutes;
  const initialLimitOrderPriceTolerance =
    route.params?.initialLimitOrderPriceTolerance;
  const initialRecurringSchedule = route.params?.initialRecurringSchedule;

  /** The entry point location for analytics (e.g. Main View, Token View, Trending Explore) */
  const location =
    route.params?.location ?? MetaMetricsSwapsEventSource.MainView;

  useInitialSourceToken(initialSourceToken, initialSourceAmount);
  useInitialDestToken(initialSourceToken, initialDestToken);
  useReconcileInputsForNonMarketSwapTab({
    renderedTab,
    sourceToken,
    destToken,
  });

  useEffect(() => {
    if (route.params?.bridgeViewMode && bridgeViewMode === undefined) {
      dispatch(setBridgeViewMode(route.params.bridgeViewMode));
    }
  }, [bridgeViewMode, dispatch, route.params?.bridgeViewMode]);

  useLayoutEffect(() => {
    if (!initialTab) {
      return;
    }

    setSelectedTab(initialTab);
    setRenderedTab(initialTab);
    if (initialTab === BridgeTabKey.Limit) {
      setLimitOrdersTab?.(OrdersTabKey.OpenOrders);
    }
    if (initialTab === BridgeTabKey.Recurring) {
      setRecurringOrdersTab?.(OrdersTabKey.OpenOrders);
    }
    navigation.setParams({ initialTab: undefined });
  }, [
    initialTab,
    navigation,
    setLimitOrdersTab,
    setRecurringOrdersTab,
    setRenderedTab,
    setSelectedTab,
  ]);

  // Deep-link presets for the Limit tab override the session values exactly
  // once per deep link. Presets the deep link omits keep whatever the user
  // already picked this app session. Clearing the route params afterwards
  // stops a later re-mount (e.g. tab switch) from re-applying the presets.
  useLayoutEffect(() => {
    if (
      initialLimitOrderExpirationMinutes === undefined &&
      initialLimitOrderPriceTolerance === undefined
    ) {
      return;
    }

    if (initialLimitOrderExpirationMinutes !== undefined) {
      dispatch(
        setLimitOrderExpirationMinutes(initialLimitOrderExpirationMinutes),
      );
    }
    if (initialLimitOrderPriceTolerance !== undefined) {
      dispatch(setLimitOrderCostTolerance(initialLimitOrderPriceTolerance));
    }
    navigation.setParams({
      initialLimitOrderExpirationMinutes: undefined,
      initialLimitOrderPriceTolerance: undefined,
    });
  }, [
    initialLimitOrderExpirationMinutes,
    initialLimitOrderPriceTolerance,
    dispatch,
    navigation,
  ]);

  useLayoutEffect(() => {
    if (!initialRecurringSchedule) {
      return;
    }

    dispatch(setRecurringEveryUnit(initialRecurringSchedule.everyUnit));
    dispatch(setRecurringEveryValue(initialRecurringSchedule.everyValue));
    dispatch(setRecurringRepeatCount(initialRecurringSchedule.repeatCount));
    navigation.setParams({ initialRecurringSchedule: undefined });
  }, [dispatch, initialRecurringSchedule, navigation]);

  const quoteParams = useMemo(
    (): QuoteParams => ({
      srcToken: sourceToken,
      destToken,
      srcAmount: sourceAmount,
      slippage,
      walletAddress,
      destWalletAddress: destAddress,
    }),
    [
      sourceToken,
      destToken,
      sourceAmount,
      slippage,
      walletAddress,
      destAddress,
    ],
  );

  // Update BridgeSessionProvider's quote params
  useEffect(() => {
    setQuoteParams(quoteParams);
  }, [quoteParams, setQuoteParams]);

  useTrackSwapPageViewed(location);

  let headerTitle: string;
  if (bridgeViewMode === BridgeViewMode.Bridge) {
    headerTitle = strings('bridge.title');
  } else {
    headerTitle = strings('swaps.title');
  }

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleSlippageSettingsPress = useCallback(() => {
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.SWAP_DEFAULT_SLIPPAGE_MODAL,
      params: {
        sourceChainId: sourceToken?.chainId,
        destChainId: destToken?.chainId,
      },
    });
  }, [destToken?.chainId, navigation, sourceToken?.chainId]);

  // Slippage only applies to market orders. This follows the rendered tab so
  // the header and the content below it always describe the same tab.
  const endButtonIconProps = useMemo(
    () =>
      renderedTab === BridgeTabKey.Market
        ? [
            {
              iconName: IconName.Setting,
              onPress: handleSlippageSettingsPress,
              testID: BridgeViewSelectorsIDs.SLIPPAGE_SETTINGS_BUTTON,
              accessibilityLabel: strings('bridge.slippage'),
            },
          ]
        : undefined,
    [renderedTab, handleSlippageSettingsPress],
  );

  // Limit and Recurring are still work-in-progress, so each is only added to
  // the tab list once its own feature flag is enabled. When both are
  // disabled, only Market remains and the tabs bar is hidden entirely below.
  const tabs = useMemo<TabItem[]>(() => {
    const visibleTabs: TabItem[] = [
      {
        key: BridgeTabKey.Market,
        label: strings('bridge.tabs.market'),
        content: null,
        testID: BridgeViewSelectorsIDs.MARKET_TAB,
      },
    ];

    if (isLimitOrderTabEnabled) {
      visibleTabs.push({
        key: BridgeTabKey.Limit,
        label: strings('bridge.tabs.limit'),
        content: null,
        testID: BridgeViewSelectorsIDs.LIMIT_TAB,
      });
    }

    if (isRecurringBuyTabEnabled) {
      visibleTabs.push({
        key: BridgeTabKey.Recurring,
        label: strings('bridge.tabs.recurring'),
        content: null,
        testID: BridgeViewSelectorsIDs.RECURRING_TAB,
      });
    }

    return visibleTabs;
  }, [isLimitOrderTabEnabled, isRecurringBuyTabEnabled]);

  const showTabsBar = tabs.length > 1;

  const activeIndex = useMemo(
    () =>
      Math.max(
        tabs.findIndex((tab) => tab.key === selectedTab),
        0,
      ),
    [tabs, selectedTab],
  );

  const renderedIndex = useMemo(
    () =>
      Math.max(
        tabs.findIndex((tab) => tab.key === renderedTab),
        0,
      ),
    [tabs, renderedTab],
  );

  const moveTabsBarTo = useCallback(
    (nextTab: BridgeTabKey) => {
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
      const nextTab = (tabs[index]?.key as BridgeTabKey) ?? BridgeTabKey.Market;
      if (nextTab === selectedTab) {
        return;
      }
      settledPageRef.current = index;
      if (!isLowHardware) {
        setOutgoingTab(renderedTab);
      }
      moveTabsBarTo(nextTab);
      pagerRef.current?.setPage(index);
      startTransition(() => setRenderedTab(nextTab));
    },
    [
      tabs,
      selectedTab,
      isLowHardware,
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
      const nextTab = tabs[position]?.key as BridgeTabKey | undefined;
      if (nextTab) {
        moveTabsBarTo(nextTab);
      }
    },
    [tabs, moveTabsBarTo],
  );

  const handlePageScrollStateChanged = useCallback(
    (event: PageScrollStateChangedNativeEvent) => {
      const { pageScrollState } = event.nativeEvent;

      if (pageScrollState === 'dragging') {
        // Mount both neighbours up front so the page sliding in is already
        // filled in, and stays mounted if the drag changes direction.
        if (!isLowHardware) {
          setPreviewTabs(
            [tabs[renderedIndex - 1]?.key, tabs[renderedIndex + 1]?.key].filter(
              (tab): tab is BridgeTabKey => tab !== undefined,
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
          : (tabs[settledPageRef.current]?.key as BridgeTabKey | undefined);
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
      isLowHardware,
      tabs,
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

  useEffect(() => {
    if (isPagerDrivenChangeRef.current) {
      isPagerDrivenChangeRef.current = false;
      return;
    }
    pagerRef.current?.setPageWithoutAnimation(activeIndex);
  }, [activeIndex]);

  const mountedTabs = useMemo(
    () =>
      new Set<BridgeTabKey>(
        [renderedTab, outgoingTab, ...previewTabs].filter(
          (tab): tab is BridgeTabKey => tab !== null,
        ),
      ),
    [renderedTab, outgoingTab, previewTabs],
  );

  const renderTabPage = (tab: BridgeTabKey) => {
    switch (tab) {
      case BridgeTabKey.Limit:
        return <BridgeLimitOrderView location={location} />;
      case BridgeTabKey.Recurring:
        return <BridgeRecurringBuyView location={location} />;
      default:
        return <BridgeMarketView location={location} />;
    }
  };

  // A tab can disappear if its feature flag flips off while it's active
  // (e.g. remote flag update). Fall back to Market rather than rendering
  // nothing.
  useEffect(() => {
    if (!tabs.some((tab) => tab.key === renderedTab)) {
      setSelectedTab(BridgeTabKey.Market);
      setRenderedTab(BridgeTabKey.Market);
    }
  }, [tabs, renderedTab, setRenderedTab, setSelectedTab]);

  // Stop in-flight quote polling and discard quote-only local state on tab
  // changes without clearing the shared token pair or source amount.
  useEffect(
    () => () => {
      if (Engine.context.BridgeController?.resetState) {
        Engine.context.BridgeController.resetState();
      }
      dispatch(setDestAmount(undefined));
      dispatch(setSelectedQuoteRequestId(undefined));
    },
    [renderedTab, dispatch],
  );

  // Reset the full bridge state (selected tokens, amounts, and controller
  // quote state) when the whole Bridge screen unmounts, i.e. the user
  // leaves Bridge entirely, not just switching tabs within it. This lives
  // here rather than in an individual tab's view so it fires exactly once
  // regardless of which tab is active when the user navigates away.
  useEffect(
    () => () => {
      dispatch(resetBridgeState());
      if (Engine.context.BridgeController?.resetState) {
        Engine.context.BridgeController.resetState();
      }
    },
    [dispatch],
  );

  return (
    <Box twClassName="flex-1 bg-default">
      <HeaderStandardGlass
        isGlass={isGlassHeader}
        isFloating={false}
        title={headerTitle}
        onBack={handleBack}
        backButtonProps={{
          testID: BridgeViewSelectorsIDs.BACK_BUTTON,
          accessibilityLabel: strings('navigation.back'),
        }}
        endButtonIconProps={endButtonIconProps}
        includesTopInset
      />
      {showTabsBar ? (
        <TabsBar
          tabs={tabs}
          activeIndex={activeIndex}
          onTabPress={handleTabPress}
          testID={BridgeViewSelectorsIDs.TABS_BAR}
        />
      ) : null}
      <PagerView
        ref={pagerRef}
        style={tw.style('flex-1 bg-default')}
        initialPage={activeIndex}
        scrollEnabled={showTabsBar}
        onPageSelected={handlePageSelected}
        onPageScrollStateChanged={handlePageScrollStateChanged}
        testID={BridgeViewSelectorsIDs.TABS_CONTENT}
      >
        {tabs.map((tab) => {
          const tabKey = tab.key as BridgeTabKey;
          return (
            // The background covers the native page cell (white on iOS) while
            // a page is empty or still mounting.
            <View
              key={tabKey}
              style={tw.style('flex-1 bg-default')}
              collapsable={false}
            >
              {mountedTabs.has(tabKey) ? (
                renderTabPage(tabKey)
              ) : (
                <BridgeTabPageSkeleton tab={tabKey} />
              )}
            </View>
          );
        })}
      </PagerView>
    </Box>
  );
};

export default BridgeView;
