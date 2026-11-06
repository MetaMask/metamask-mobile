import React, {
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  type RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import { Box, IconName } from '@metamask/design-system-react-native';
import BridgeOrderTypeSelector, {
  BridgeOrderTypeSheet,
} from './BridgeOrderTypeSelector';
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
import type { QuoteParams } from '../../providers/SwapQuotesProvider/utils';
import { selectSourceWalletAddress } from '../../../../../selectors/bridge';
import type { BridgeRouteParams } from '../../hooks/useSwapBridgeNavigation';
import { useInitialSourceToken } from '../../hooks/useInitialSourceToken';
import { useInitialDestToken } from '../../hooks/useInitialDestToken';
import { useReconcileInputsForNonMarketSwapTab } from '../../hooks/useReconcileInputsForNonMarketSwapTab';
import { OrdersTabKey } from '../../components/OrdersTabs';
import { useTrackSwapPageViewed } from '../../hooks/useTrackSwapPageViewed';
import { MetaMetricsSwapsEventSource } from '@metamask/bridge-controller';
import HeaderRootGlass from '../../../../../component-library/components-temp/HeaderRootGlass';
import HubProfileButton from '../../../../Nav/Main/FixedTabNav/HubProfileButton';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import FixedTabPillRow, {
  useFixedTabPillPlacement,
} from '../../../../Nav/Main/FixedTabNav/FixedTabPillRow';
import { ScrollingChromeProvider } from '../../../../Nav/Main/FixedTabNav/ScrollingChrome';
import { FixedHubChrome } from '../../../../Nav/Main/FixedTabNav/FixedHubChrome';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';

const BridgeView = () => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const { active: isTradeHubTab } = useFixedTabPillPlacement(0);
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
  // disabled, only Market remains and the selector is hidden entirely below.
  const tabs = useMemo(() => {
    const visibleTabs = [
      {
        key: BridgeTabKey.Market,
        label: strings('bridge.tabs.market'),
        testID: BridgeViewSelectorsIDs.MARKET_TAB,
        showNewBadge: false,
      },
    ];

    if (isLimitOrderTabEnabled) {
      visibleTabs.push({
        key: BridgeTabKey.Limit,
        label: strings('bridge.tabs.limit'),
        testID: BridgeViewSelectorsIDs.LIMIT_TAB,
        showNewBadge: true,
      });
    }

    if (isRecurringBuyTabEnabled) {
      visibleTabs.push({
        key: BridgeTabKey.Recurring,
        label: strings('bridge.tabs.recurring'),
        testID: BridgeViewSelectorsIDs.RECURRING_TAB,
        showNewBadge: false,
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

  const handleTabPress = useCallback(
    (index: number) => {
      const nextTab = (tabs[index]?.key as BridgeTabKey) ?? BridgeTabKey.Market;
      setSelectedTab(nextTab);
      startTransition(() => setRenderedTab(nextTab));
    },
    [tabs, setRenderedTab, setSelectedTab],
  );

  const handleSelectTabKey = useCallback(
    (key: BridgeTabKey) => {
      setSelectedTab(key);
      startTransition(() => setRenderedTab(key));
    },
    [setRenderedTab, setSelectedTab],
  );

  const goToPreviousTab = useCallback(() => {
    if (activeIndex > 0) {
      handleTabPress(activeIndex - 1);
    } else {
      handleBack();
    }
  }, [activeIndex, handleTabPress, handleBack]);

  const goToNextTab = useCallback(() => {
    if (activeIndex < tabs.length - 1) {
      handleTabPress(activeIndex + 1);
    }
  }, [activeIndex, tabs.length, handleTabPress]);

  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .withTestId(BridgeViewSelectorsIDs.TABS_SWIPE_GESTURE)
        .activeOffsetX([-50, 50])
        .failOffsetY([-15, 15])
        .maxPointers(1)
        .onEnd((gestureEvent) => {
          'worklet';
          const { translationX, velocityX } = gestureEvent;

          if (Math.abs(translationX) > 50 || Math.abs(velocityX) > 500) {
            if (translationX > 0) {
              scheduleOnRN(goToPreviousTab);
            } else {
              scheduleOnRN(goToNextTab);
            }
          }
        }),
    [goToPreviousTab, goToNextTab],
  );

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

  const fixedChrome = (
    <>
      {isTradeHubTab ? (
        <HeaderRootGlass
          isGlass={isGlassHeader}
          isFloating={false}
          includesTopInset
          endButtonIconProps={endButtonIconProps}
        >
          <HubProfileButton />
        </HeaderRootGlass>
      ) : (
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
      )}
      <FixedTabPillRow />
    </>
  );

  // The order-type selector scrolls away with the content rather than pinning
  // under the header. The sheet it opens must NOT render inside the scroll
  // content: the design-system `BottomSheet` is absolutely positioned over its
  // nearest ancestor, so it is hoisted to the screen root below, where it
  // anchors to the bottom edge of the screen.
  //
  // `orderTypeSheetSession` increments on every trigger press and is used as
  // the sheet's React key. Pressing the trigger while a previous sheet is
  // still animating closed (e.g. right after picking an option) therefore
  // remounts a fresh, fully-open sheet instead of being swallowed by the
  // already-open state, and the previous sheet's onClose is ignored because
  // its session no longer matches.
  const [orderTypeSheetSession, setOrderTypeSheetSession] =
    useState<number>(-1);
  const openOrderTypeSheet = useCallback(
    () => setOrderTypeSheetSession((session) => session + 1),
    [],
  );
  const closeOrderTypeSheet = useCallback(
    () => setOrderTypeSheetSession(-1),
    [],
  );

  const scrollingChrome = showTabsBar ? (
    <Box testID={BridgeViewSelectorsIDs.TABS_BAR}>
      <BridgeOrderTypeSelector
        options={tabs}
        selectedKey={selectedTab}
        onOpenSheet={openOrderTypeSheet}
      />
    </Box>
  ) : null;

  return (
    <Box twClassName="flex-1 bg-default">
      {isTradeHubTab ? <FixedHubChrome>{fixedChrome}</FixedHubChrome> : null}
      <ScrollingChromeProvider
        value={
          isTradeHubTab ? (
            scrollingChrome
          ) : (
            <>
              {fixedChrome}
              {scrollingChrome}
            </>
          )
        }
      >
        <GestureDetector gesture={swipeGesture}>
          <Box
            twClassName="flex-1"
            testID={BridgeViewSelectorsIDs.TABS_CONTENT}
          >
            {renderedTab === BridgeTabKey.Market ? (
              <BridgeMarketView location={location} />
            ) : null}
            {renderedTab === BridgeTabKey.Limit ? (
              <BridgeLimitOrderView location={location} />
            ) : null}
            {renderedTab === BridgeTabKey.Recurring ? (
              <BridgeRecurringBuyView location={location} />
            ) : null}
          </Box>
        </GestureDetector>
      </ScrollingChromeProvider>
      {showTabsBar && orderTypeSheetSession >= 0 ? (
        <BridgeOrderTypeSheet
          key={orderTypeSheetSession}
          options={tabs}
          selectedKey={selectedTab}
          onClose={closeOrderTypeSheet}
          onSelect={handleSelectTabKey}
        />
      ) : null}
    </Box>
  );
};

export default BridgeView;
