import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Theme } from '@metamask/design-tokens';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../hooks/useStyles';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { isNonEvmChainId } from '../../../../core/Multichain/utils';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import type { RootState } from '../../../../reducers';
import {
  selectNetworkConfigurationByChainId,
  selectNetworkConfigurations,
} from '../../../../selectors/networkController';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import { selectSocialLeaderboardEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';
import { selectTokenDetailsTechnicalIndicatorsEnabled } from '../../../../selectors/featureFlagController/tokenDetailsTechnicalIndicators';
import type { CopyTradeOrigin } from '../../../../util/social/copyTradeIntent';
import Price from '../../AssetOverview/Price/Price';
import {
  QuickBuy,
  TOP_TRADERS_QUICK_BUY_FEATURES,
  type QuickBuyTarget,
  type QuickBuyTradeMode,
} from '../../QuickBuy';
import {
  PostTradeShareOwner,
  usePostTradeShareReopen,
} from '../../../Views/SocialLeaderboard/PostTradeShareBottomSheet';
import type { SocialV1FeedItem } from '../../SocialFeed/types';
import { chainNameToId } from '../../SocialFeed/utils/chainMapping';
import PriceChartContext, {
  PriceChartProvider,
} from '../../AssetOverview/PriceChart/PriceChart.context';
import { resolveTokenContractAddress } from '../../AssetOverview/utils/getTokenDetails';
import { calcUsdAmountFromFiat } from '../../Bridge/utils/exchange-rates';
import { useIsPriceAlertsChainSupported } from '../../Assets/PriceAlerts/hooks/useIsPriceAlertsChainSupported';
import WatchlistStarButton from '../../Assets/watchlist/components/WatchlistStarButton';
import ShareTokenBottomSheet from '../components/ShareTokenBottomSheet';
import { SECURITY_ATTRIBUTION_EXPLAINER } from '../components/V1/SecurityAttribution/SecurityAttribution';
import SecuritySocialSection from '../components/V1/SecuritySocialSection/SecuritySocialSection';
import SecurityTab from '../components/V1/SecurityTab/SecurityTab';
import { EXPLAINER_KEYS_BY_ROW } from '../components/V1/SecurityTab/SecurityTab.constants';
import type { SecurityRowKey } from '../components/V1/SecurityTab/SecurityTab.types';
import StatBar from '../components/V1/StatBar/StatBar';
import TokenAgeChip from '../components/V1/TokenAgeChip/TokenAgeChip';
import TokenExplainerSheet from '../components/V1/TokenExplainerSheet/TokenExplainerSheet';
import type { ExplainerCopy } from '../components/V1/TokenExplainerSheet/TokenExplainerSheet.types';
import OverviewTab from '../components/tabs/OverviewTab';
import {
  TokenDetailsScrollProvider,
  useTokenDetailsScroll,
} from '../components/tokenDetailsScroll';
import TokenDetailsFeedTab from '../components/tabs/FeedTab';
import { useTokenHolders } from '../components/tabs/holders/useTokenHolders';
import TokenDetailsHoldersTab from '../components/tabs/HoldersTab';
import TokenDetailsActionsSection from '../components/sections/TokenDetailsActionsSection';
import TokenDetailsV1TabBar, {
  usePinnedTokenDetailsV1TabBar,
  HIDDEN_TAB_PAGE_STYLE,
  useTokenDetailsV1ScrollStabilization,
  useTokenDetailsV1Tabs,
} from '../components/TokenDetailsV1TabBar';
import { TokenDetailsInlineHeader } from '../components/TokenDetailsInlineHeader';
import TraderPositionPnlSection from '../TraderPositionPnl/TraderPositionPnlSection';
import {
  TokenDetailsSource,
  type TokenDetailsRouteParams,
  type TokenDetailsVariant,
  type TokenDetailsV1TabKey,
} from '../constants/constants';
import {
  selectMemecoinTdpV1TabConfigOrder,
  selectMemecoinTdpV1TokenApiBaseUrl,
} from '../../../../selectors/featureFlagController/assetsMemecoinTdpV1';
import { getTdpAnalyticsBase } from '../analytics/getTdpAnalyticsBase';
import { useLivePriceHeaderDescription } from '../hooks/useLivePriceHeaderDescription';
import { useTokenCaipAssetId } from '../hooks/useTokenCaipAssetId';
import { useTokenPrice } from '../hooks/useTokenPrice';
import {
  useLiveQuote,
  useWatchAssetPrice,
} from '../../../../hooks/assets/market-stats-live-prices';
import { useElapsedTime } from '../hooks/useElapsedTime';
import { useSecurityFacts } from '../hooks/useSecurityFacts';
import { useTokenSecurityQuery } from '../../Tokens/hooks/useTokenSecurityQuery';
import { useTokenMarketData } from '../hooks/useTokenMarketData';
import { useTokenStats } from '../hooks/useTokenStats';
import { useTokenAssetDetails } from '../queries/tokenAssetQuery';
import { formatTokenAge } from '../utils/formatTokenAge';
import { useHeaderGlassInset } from '../../../../component-library/components-temp/HeaderGlass';
import { selectTokenDetailsBrandRefreshEnabled } from '../../../../selectors/featureFlagController/tokenDetailsBrandRefresh';
import { TokenDetailsIds } from '../testIds';

const AGE_EXPLAINER_COPY: ExplainerCopy = {
  title: 'token_details_v1.age.explainer.title',
  description: 'token_details_v1.age.explainer.description',
};

interface ShareTokenBottomSheetControllerRef {
  open: () => void;
}

const ShareTokenBottomSheetController = forwardRef<
  ShareTokenBottomSheetControllerRef,
  Omit<React.ComponentProps<typeof ShareTokenBottomSheet>, 'onClose'>
>((props, ref) => {
  const [isVisible, setIsVisible] = useState(false);

  useImperativeHandle(ref, () => ({ open: () => setIsVisible(true) }), []);

  return isVisible ? (
    <ShareTokenBottomSheet {...props} onClose={() => setIsVisible(false)} />
  ) : null;
});

ShareTokenBottomSheetController.displayName = 'ShareTokenBottomSheetController';

/**
 * Lightweight placeholder panel for the Feed tab, whose content ships with
 * ASSETS-4021 — the tab bar is rendered "as is" so navigation and layout stay
 * final.
 */
const TokenDetailsV1TabPlaceholder = ({
  tab,
}: {
  tab: TokenDetailsV1TabKey;
}) => (
  <Box
    flexDirection={BoxFlexDirection.Column}
    alignItems={BoxAlignItems.Center}
    twClassName="py-8"
    testID={`${TokenDetailsIds.tabPanelPrefix}-${tab}`}
  >
    <Text
      variant={TextVariant.BodyMd}
      color={TextColor.TextAlternative}
      twClassName="text-center"
    >
      {strings('token_details_v1.tab_placeholder')}
    </Text>
  </Box>
);

/** Shown when the remote tab config and the runtime gates between them leave nothing. */
const FALLBACK_TAB: TokenDetailsV1TabKey = 'overview';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;
  return StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    content: {
      flex: 1,
      isolation: 'isolate',
    },
    scroll: {
      flex: 1,
    },
    scrollArea: {
      flex: 1,
    },
    pinnedTabBar: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
    },
  });
};

export { resolveSwipeTargetTab } from '../components/TokenDetailsV1TabBar';

/**
 * Fires TOKEN_DETAILS_OPENED once per Token Details V1 open.
 *
 * Mirrors the legacy `useTokenDetailsOpenedTracking`, deduping by
 * `chainId:address:symbol:source` so a re-render never re-fires. The V1 page
 * previously fired only TOKEN_DETAILS_SHARED and never TOKEN_DETAILS_OPENED.
 */
const useTokenDetailsV1OpenedTracking = (
  token: TokenDetailsRouteParams,
  variant: TokenDetailsVariant,
) => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const lastTrackedTokenKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const source = token.source ?? TokenDetailsSource.Unknown;
    const tokenTrackingKey = `${token.chainId ?? ''}:${token.address ?? ''}:${token.symbol ?? ''}:${source}`;

    if (lastTrackedTokenKeyRef.current === tokenTrackingKey) {
      return;
    }

    const hasBalance =
      token.balance !== undefined &&
      token.balance !== null &&
      token.balance !== '0' &&
      token.balance !== '';

    trackEvent(
      createEventBuilder(MetaMetricsEvents.TOKEN_DETAILS_OPENED)
        .addProperties({
          ...getTdpAnalyticsBase(token, variant),
          source,
          token_symbol: token.symbol,
          token_address: token.address,
          token_name: token.name,
          has_balance: hasBalance,
        })
        .build(),
    );
    lastTrackedTokenKeyRef.current = tokenTrackingKey;
  }, [createEventBuilder, token, trackEvent, variant]);
};

interface TokenDetailsV1Props {
  token: TokenDetailsRouteParams;
  /** Asset category this page renders for, which decides the stat bar's stats. */
  variant: TokenDetailsVariant;
}

export const TokenDetailsV1: React.FC<TokenDetailsV1Props> = ({
  token,
  variant,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation<AppNavigationProp>();
  const isFocused = useIsFocused();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const shareSheetRef = useRef<ShareTokenBottomSheetControllerRef>(null);

  useTokenDetailsV1OpenedTracking(token, variant);

  const analyticsBase = useMemo(
    () => getTdpAnalyticsBase(token, variant),
    [token, variant],
  );

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const caip19AssetId = useTokenCaipAssetId(token);

  // Shared with the Overview tab and the variant check, so the three land on
  // one react-query entry rather than fetching `/v2/assets` once each.
  const tokenApiBaseUrl = useSelector(selectMemecoinTdpV1TokenApiBaseUrl);
  const { asset: tokenAsset } = useTokenAssetDetails(
    caip19AssetId,
    tokenApiBaseUrl,
  );
  const launchedAt = tokenAsset?.launchpadData?.launchedAt;

  const shareUrl = useMemo(
    () =>
      caip19AssetId
        ? `https://link.metamask.io/asset?assetId=${encodeURIComponent(
            caip19AssetId,
          )}`
        : null,
    [caip19AssetId],
  );

  const handleShare = useCallback(() => {
    if (!shareUrl) {
      return;
    }

    trackEvent(
      createEventBuilder(MetaMetricsEvents.TOKEN_DETAILS_SHARED)
        .addProperties({
          chain_id: token.chainId,
          token_symbol: token.symbol,
          token_address: token.address,
        })
        .build(),
    );

    shareSheetRef.current?.open();
  }, [
    shareUrl,
    createEventBuilder,
    token.address,
    token.chainId,
    token.symbol,
    trackEvent,
  ]);

  /**
   * Read off the entry the token list badges already populate, rather than the
   * `securityData` route param: that param is a snapshot taken at tap time and
   * never revalidates, and carries no indication of when it was fetched.
   */
  const {
    data: fetchedSecurityData,
    isPending: isSecurityDataLoading,
    error: securityDataError,
    dataUpdatedAt: securityDataUpdatedAt,
  } = useTokenSecurityQuery(caip19AssetId);

  // `undefined` before the first fetch resolves, which the consumers below and
  // `useSecurityFacts` treat the same as "no data".
  const securityData = fetchedSecurityData ?? null;

  // Resolved once here and shared with the Overview tab's market details list,
  // so the screen does not fetch the same data from two places.
  const selectedCurrency = useSelector(selectCurrentCurrency);
  const { marketData, isLoading: isMarketDataLoading } =
    useTokenMarketData(caip19AssetId);
  const traderPositionTokenKey = `${token.chainId ?? ''}:${token.address ?? ''}:${token.symbol ?? ''}`;

  const tokenStats = useTokenStats({
    marketData,
    isMarketDataLoading,
    securityData,
    tokenApiHoldersCount: tokenAsset?.holders?.count,
    currentCurrency: selectedCurrency,
  });

  /**
   * Copy for whichever definition sheet is open, or `null` for none.
   *
   * The stat bar and the Security tab render the same sheet, so they share one
   * piece of state rather than a key each: two keys would let both mount at
   * once. It is held here rather than inside `SecurityTab` because the sheet
   * has to mount outside the page `ScrollView` — see the note on
   * `SecurityTabProps.onExplain`.
   */
  const [explainerCopy, setExplainerCopy] = useState<ExplainerCopy | null>(
    null,
  );

  /**
   * Opens the definition for a tapped label, from either surface.
   *
   * One handler rather than one each: the stat bar's keys and the Security
   * tab's rows are both `SecurityRowKey` now, so there is nothing left to tell
   * apart.
   */
  const handleRowExplain = useCallback((rowKey: SecurityRowKey) => {
    setExplainerCopy(EXPLAINER_KEYS_BY_ROW[rowKey]);
  }, []);

  const handleExplainerClose = useCallback(() => setExplainerCopy(null), []);

  const handleAgePress = useCallback(() => {
    setExplainerCopy(AGE_EXPLAINER_COPY);
  }, []);

  const handleAttributionPress = useCallback(() => {
    setExplainerCopy(SECURITY_ATTRIBUTION_EXPLAINER);
  }, []);

  const isNativeToken = Boolean(token.isETH || token.isNative);

  /**
   * Resolve `token.address` once through the same normalizer the header uses,
   * so the security-row chip shows the bare contract address (not the full
   * CAIP-19 asset id that Solana tokens carry in `token.address`).
   */
  const contractAddress = useMemo(
    () => (isNativeToken ? null : resolveTokenContractAddress(token)),
    [token, isNativeToken],
  );

  const hasBalanceValue = useMemo(() => {
    if (token.balance === undefined || token.balance === null) return false;
    return Number(token.balance) > 0;
  }, [token.balance]);

  const starButton = useMemo(
    () => (
      <WatchlistStarButton
        assetId={caip19AssetId}
        assetType={isNativeToken ? 'native' : 'erc20'}
        hasBalance={hasBalanceValue}
        source="token_details"
      />
    ),
    [caip19AssetId, isNativeToken, hasBalanceValue],
  );

  const networkConfigurationByChainId = useSelector((state: RootState) =>
    selectNetworkConfigurationByChainId(state, token.chainId),
  );
  const networkConfigurationsByChainId = useSelector(
    selectNetworkConfigurations,
  );
  const evmMultiChainCurrencyRates = useSelector(selectCurrencyRates);

  const quotedPrice = useTokenPrice({ token });
  const liveQuote = useLiveQuote(caip19AssetId);
  useWatchAssetPrice(caip19AssetId);
  const currentPrice = liveQuote?.price ?? quotedPrice.currentPrice;
  let { priceDiff, comparePrice } = quotedPrice;
  if (
    liveQuote?.pricePercentChange1d !== undefined &&
    quotedPrice.timePeriod === '1d' &&
    currentPrice > 0
  ) {
    comparePrice = currentPrice / (1 + liveQuote.pricePercentChange1d / 100);
    priceDiff = currentPrice - comparePrice;
  }
  const {
    prices,
    isLoading: isPriceLoading,
    timePeriod,
    setTimePeriod,
    currentCurrency,
    hasInsufficientCoverage,
  } = quotedPrice;

  const { description: headerDescription, onScrollOffset } =
    useLivePriceHeaderDescription({ currentPrice, currentCurrency });

  // The paginated tabs (Feed, Holders) have no scroll of their own, so they
  // read this page's instead of measuring their own footer on a timer.
  const pageScroll = useTokenDetailsScroll();
  const { onScroll: onPageScroll } = pageScroll;
  const isGlassHeader =
    useSelector(selectTokenDetailsBrandRefreshEnabled) === true;
  const headerScrollY = useSharedValue(0);
  const safeAreaInsets = useSafeAreaInsets();
  const { inset: headerInset, onLayout: handleHeaderLayout } =
    useHeaderGlassInset(isGlassHeader, safeAreaInsets.top);

  // The docked tab bar is a copy laid over the page, outside the ScrollView,
  // rather than a sticky header. See `usePinnedTokenDetailsV1TabBar`.
  const pinnedTabBar = usePinnedTokenDetailsV1TabBar(headerScrollY);
  const { onScrollOffset: onPinnedTabBarScroll, onTabBarOffsetY } =
    pinnedTabBar;

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const scrollOffset = event.nativeEvent.contentOffset.y;
      headerScrollY.set(scrollOffset);
      onPinnedTabBarScroll(scrollOffset);
      onScrollOffset(scrollOffset);
      onPageScroll(event);
    },
    [headerScrollY, onPageScroll, onPinnedTabBarScroll, onScrollOffset],
  );

  const {
    scrollViewRef,
    handleScroll: onScrollViewScroll,
    handleTabBarLayout,
    clampScrollToTabBar,
    scrollToTabBar,
  } = useTokenDetailsV1ScrollStabilization({ onScroll: handleScroll });

  // A tab shorter than the space under the docked tab bar cannot hold the
  // page at that offset, so switching to one (an empty or still-loading feed,
  // a short holders list) would snap the scroll back up toward the top. The
  // tab area is kept at least that tall so a switch only ever scrolls as far
  // as the clamp asks.
  const [viewportHeight, setViewportHeight] = useState(0);
  const [tabBarHeight, setTabBarHeight] = useState(0);
  const { onLayout: onPageScrollLayout } = pageScroll;
  const handleScrollViewLayout = useCallback(
    (event: LayoutChangeEvent) => {
      setViewportHeight(event.nativeEvent.layout.height);
      onPageScrollLayout(event);
    },
    [onPageScrollLayout],
  );
  const handleTabBarContainerLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { y, height } = event.nativeEvent.layout;
      setTabBarHeight(height);
      onTabBarOffsetY(y);
      handleTabBarLayout(event);
    },
    [handleTabBarLayout, onTabBarOffsetY],
  );
  const [footerHeight, setFooterHeight] = useState(0);
  const handleFooterLayout = useCallback((height: number) => {
    setFooterHeight((current) => (current === height ? current : height));
  }, []);
  const tabContentStyle = useMemo(() => {
    const minHeight = viewportHeight - tabBarHeight - footerHeight;
    return {
      minHeight: Number.isFinite(minHeight) ? Math.max(0, minHeight) : 0,
    };
  }, [viewportHeight, tabBarHeight, footerHeight]);

  const socialEnabled = useSelector(selectSocialLeaderboardEnabled);
  const isTechnicalIndicatorsEnabled = useSelector(
    selectTokenDetailsTechnicalIndicatorsEnabled,
  );
  const showSocialTabs = socialEnabled && Boolean(caip19AssetId);

  const [copyTrade, setCopyTrade] = useState<{
    target: QuickBuyTarget;
    copyTradeOrigin?: CopyTradeOrigin;
    tradeMode?: QuickBuyTradeMode;
    traderAddress?: string;
  } | null>(null);
  const handleFeedCopyTrade = useCallback(
    (item: SocialV1FeedItem, commentId?: string) => {
      if (item.variant !== 'spotOpen' && item.variant !== 'spotShare') {
        return;
      }
      const chain = chainNameToId(item.asset.avatar.chain);
      const tokenAddress = item.asset.avatar.tokenAddress.trim();
      if (!chain || !tokenAddress) {
        return;
      }
      setCopyTrade({
        target: {
          tokenAddress,
          tokenSymbol: item.asset.symbol,
          tokenName: item.asset.name ?? item.asset.symbol,
          chain,
        },
        copyTradeOrigin: commentId ? { commentId } : undefined,
        traderAddress: item.author.address,
      });
    },
    [],
  );
  const closeCopyTrade = useCallback(() => setCopyTrade(null), []);
  const copyTradeTraderAddress = copyTrade?.traderAddress;
  const copyTradeAnalyticsContext = useMemo(
    () => ({
      source: 'trader_feed' as const,
      isCopyTrade: true,
      ...(copyTradeTraderAddress
        ? { traderAddress: copyTradeTraderAddress }
        : {}),
    }),
    [copyTradeTraderAddress],
  );
  const handlePostTradeShareReopen = useCallback(
    (
      target: QuickBuyTarget,
      copyTradeOrigin?: CopyTradeOrigin,
      tradeMode?: QuickBuyTradeMode,
      traderAddress?: string,
    ) => {
      setCopyTrade({ target, copyTradeOrigin, tradeMode, traderAddress });
    },
    [],
  );
  usePostTradeShareReopen(
    handlePostTradeShareReopen,
    isFocused ? PostTradeShareOwner.tokenDetails : undefined,
  );
  // Reads the same query the tab itself renders from: identical key, so
  // react-query serves both from one fetch rather than requesting twice.
  const {
    rows: holderRows,
    isLoading: isHoldersLoading,
    error: holdersError,
  } = useTokenHolders({
    // `useTokenCaipAssetId` reports "no id" as null; the hook's absent case.
    assetId: caip19AssetId ?? undefined,
    enabled: showSocialTabs,
  });
  // A token nobody holds has no Holders tab. It stays through the first fetch
  // so the tab bar does not shift under a thumb, and through an error so a
  // network blip does not quietly remove the feature -- the tab keeps its own
  // retry. Only a loaded, empty list hides it.
  const showHoldersTab =
    showSocialTabs &&
    (isHoldersLoading || Boolean(holdersError) || holderRows.length > 0);

  // Order and membership come from the remote config, which lets the tab
  // layout be reshuffled without a release. It only ever takes tabs away: a
  // tab it lists still has to clear the two gates above.
  const tabConfigOrder = useSelector(selectMemecoinTdpV1TabConfigOrder);

  const visibleTabs = useMemo<TokenDetailsV1TabKey[]>(() => {
    const tabs = tabConfigOrder.filter((tab) => {
      if (tab === 'feed') {
        return showSocialTabs;
      }
      if (tab === 'holders') {
        return showHoldersTab;
      }
      return true;
    });

    // A config naming only gated tabs can leave nothing at all, which would
    // strand the reader on an empty tab strip with no panel under it. Overview
    // is the backstop because it is the one tab no gate can take away.
    return tabs.length > 0 ? tabs : [FALLBACK_TAB];
  }, [tabConfigOrder, showHoldersTab, showSocialTabs]);
  // Whichever tab survives first is where the page lands, so reordering the
  // config moves the landing tab with it. An empty feed still keeps its tab;
  // an empty holders list does not.
  const landingTab = visibleTabs[0];
  const userPickedTabRef = useRef(false);
  const applyingLandingTabRef = useRef(false);
  const handleTabChange = useCallback(() => {
    if (!applyingLandingTabRef.current) {
      userPickedTabRef.current = true;
    }
    clampScrollToTabBar();
  }, [clampScrollToTabBar]);
  const { activeTab, activateTab, mountedTabs, swipeGesture } =
    useTokenDetailsV1Tabs({
      initialTab: landingTab,
      onTabChange: handleTabChange,
      tabs: visibleTabs,
    });
  // An empty feed has its own 48px padding. The short-tab spacer and the
  // sticky-footer reservation exist for interactive tab content, and they
  // leave a blank scroll under this state. A position footer is taller than
  // Buy alone, so its measured height is added to that 48px gap.
  const [feedIsEmpty, setFeedIsEmpty] = useState(false);
  const handleFeedEmptyChange = useCallback((isEmpty: boolean) => {
    setFeedIsEmpty((current) => (current === isEmpty ? current : isEmpty));
  }, []);
  const isEmptyFeed = activeTab === 'feed' && feedIsEmpty;
  const scrollContentStyle = useMemo(
    () => ({
      paddingBottom: isEmptyFeed ? footerHeight + 48 : footerHeight,
      ...(isGlassHeader ? { paddingTop: headerInset } : {}),
    }),
    [footerHeight, headerInset, isGlassHeader, isEmptyFeed],
  );

  useEffect(() => {
    if (!visibleTabs.includes(activeTab)) {
      applyingLandingTabRef.current = true;
      activateTab(visibleTabs[0]);
      applyingLandingTabRef.current = false;
      return;
    }
    if (!userPickedTabRef.current && activeTab !== landingTab) {
      applyingLandingTabRef.current = true;
      activateTab(landingTab);
      applyingLandingTabRef.current = false;
    }
  }, [activeTab, activateTab, landingTab, visibleTabs]);

  // Explicit tab taps emit exactly one TOKEN_DETAILS_TAB_VIEWED. Swipe-driven
  // tab changes call `activateTab` internally and the pill routes through
  // `handleSecurityPress` (its own event), so neither double-fires here.
  const handleTabPress = useCallback(
    (tab: TokenDetailsV1TabKey) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.TOKEN_DETAILS_TAB_VIEWED)
          .addProperties({
            ...analyticsBase,
            tab_name: tab,
          })
          .build(),
      );
      activateTab(tab);
    },
    [activateTab, analyticsBase, createEventBuilder, trackEvent],
  );

  const securityFacts = useSecurityFacts({
    securityData,
    isLoading: isSecurityDataLoading,
    error: securityDataError,
  });

  const securityFetchedMinutesAgo = useElapsedTime({
    since: securityDataUpdatedAt,
  });

  /**
   * The pill emits its own verdict event rather than TOKEN_DETAILS_TAB_VIEWED,
   * so it calls `activateTab` directly instead of `handleTabPress`.
   *
   * Selecting the tab alone would leave the reader looking at the price hero
   * while the thing they asked for sat a chart's height below the fold, so the
   * verdict pill scrolls the page as well as switching tabs.
   *
   * Withheld when the config leaves the Security tab out, which renders the
   * pill as static text. The verdict still reads, it just stops offering a
   * destination the page no longer has.
   */
  const handleSecurityPress = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.TOKEN_DETAILS_SECURITY_PILL_CLICKED)
        .addProperties({
          ...analyticsBase,
          // The exact verdict feeding the SecurityPill below.
          verdict: securityFacts.verdict,
        })
        .build(),
    );
    activateTab('security');
    scrollToTabBar();
  }, [
    activateTab,
    analyticsBase,
    createEventBuilder,
    scrollToTabBar,
    securityFacts.verdict,
    trackEvent,
  ]);

  /**
   * No payload rides along: the detail screen subscribes to the same query
   * entry this tab just read, so it renders from cache without a request and
   * stays in step if that entry revalidates.
   */
  const handleOpenContractSecurity = useCallback(() => {
    navigation.navigate(Routes.CONTRACT_SECURITY, {
      token,
      tdpVersion: analyticsBase.tdp_version,
      tokenCategory: analyticsBase.token_category,
    });
  }, [navigation, token, analyticsBase]);

  // `isActive` reaches the paginated tabs: every mounted tab sees the page's
  // scroll, and a hidden one must not page itself in behind the active tab.
  const renderTabPage = useCallback(
    (tab: TokenDetailsV1TabKey, isActive: boolean) => {
      if (!mountedTabs.has(tab)) {
        return null;
      }
      if (tab === 'overview') {
        return (
          <OverviewTab
            token={token}
            assetId={caip19AssetId}
            securityData={securityData}
            marketData={marketData}
          />
        );
      }
      if (tab === 'security') {
        return (
          <SecurityTab
            facts={securityFacts}
            stats={tokenStats}
            onExplain={handleRowExplain}
            onOpenContractDetails={handleOpenContractSecurity}
            onExplainAttribution={handleAttributionPress}
            fetchedMinutesAgo={securityFetchedMinutesAgo}
          />
        );
      }
      if (tab === 'feed' && showSocialTabs && caip19AssetId) {
        return (
          <TokenDetailsFeedTab
            assetId={caip19AssetId}
            token={token}
            isActive={isActive}
            onCopyTrade={handleFeedCopyTrade}
            hasBalance={hasBalanceValue}
            onEmptyChange={handleFeedEmptyChange}
          />
        );
      }
      if (tab === 'holders' && showSocialTabs && caip19AssetId) {
        return (
          <TokenDetailsHoldersTab assetId={caip19AssetId} isActive={isActive} />
        );
      }
      return <TokenDetailsV1TabPlaceholder tab={tab} />;
    },
    [
      mountedTabs,
      token,
      caip19AssetId,
      securityData,
      marketData,
      securityFacts,
      securityFetchedMinutesAgo,
      tokenStats,
      handleRowExplain,
      handleAttributionPress,
      handleOpenContractSecurity,
      showSocialTabs,
      hasBalanceValue,
      handleFeedEmptyChange,
      handleFeedCopyTrade,
    ],
  );

  const currentPriceUsd = useMemo(() => {
    if (!Number.isFinite(currentPrice)) {
      return null;
    }
    return (
      calcUsdAmountFromFiat({
        tokenFiatValue: currentPrice,
        chainId: token.chainId ?? undefined,
        networkConfigurationsByChainId,
        evmMultiChainCurrencyRates,
      }) ?? null
    );
  }, [
    currentPrice,
    token.chainId,
    networkConfigurationsByChainId,
    evmMultiChainCurrencyRates,
  ]);

  const isPriceAlertsChainSupported =
    useIsPriceAlertsChainSupported(caip19AssetId);
  const isPriceAlertsSupported =
    isPriceAlertsChainSupported &&
    (currentPriceUsd ?? 0) > 0 &&
    !isNonEvmChainId(token.chainId as string);

  const handlePriceAlertPress = useCallback(() => {
    if (!caip19AssetId) {
      return;
    }
    navigation.navigate(Routes.MANAGE_PRICE_ALERTS, {
      symbol: token.symbol,
      ticker: token.ticker,
      currentPrice: currentPriceUsd ?? 0,
      currentCurrency: 'usd',
      assetId: caip19AssetId,
    });
  }, [navigation, token.symbol, token.ticker, currentPriceUsd, caip19AssetId]);

  return (
    <PriceChartProvider>
      <View style={styles.wrapper} testID={TokenDetailsIds.v1}>
        <View style={styles.content}>
          <TokenDetailsInlineHeader
            token={token}
            securityData={securityData}
            tdpVersion="v3"
            hideContractAddress
            onBackPress={handleBackPress}
            onSharePress={shareUrl ? handleShare : undefined}
            starButton={starButton}
            onPriceAlertPress={
              isPriceAlertsSupported ? handlePriceAlertPress : undefined
            }
            description={headerDescription}
            titleEndAccessory={
              formatTokenAge(launchedAt) != null ? (
                <TokenAgeChip
                  launchedAtSeconds={launchedAt}
                  onPress={handleAgePress}
                />
              ) : undefined
            }
            isGlass={isGlassHeader}
            onLayout={handleHeaderLayout}
            scrollY={headerScrollY}
          />
          {/* The in-flow tab bar scrolls with the page and takes taps until it
            reaches the top. From there a copy laid over the page, outside the
            ScrollView, docks it below the nav header and takes the taps
            instead. See `usePinnedTokenDetailsV1TabBar`. */}
          <PriceChartContext.Consumer>
            {({ isChartBeingTouched }) => (
              <View style={styles.scrollArea}>
                <ScrollView
                  ref={scrollViewRef}
                  style={styles.scroll}
                  contentContainerStyle={scrollContentStyle}
                  onScroll={onScrollViewScroll}
                  scrollEventThrottle={16}
                  scrollEnabled={!isChartBeingTouched}
                  onLayout={handleScrollViewLayout}
                  onContentSizeChange={pageScroll.onContentSizeChange}
                  testID={TokenDetailsIds.scrollView}
                >
                  <Price.Provider
                    asset={token}
                    prices={prices}
                    timePeriod={timePeriod}
                    setTimePeriod={setTimePeriod}
                    currentPrice={currentPrice}
                    priceDiff={priceDiff}
                    comparePrice={comparePrice}
                    currentCurrency={currentCurrency}
                    isLoading={isPriceLoading}
                    hasInsufficientCoverage={hasInsufficientCoverage}
                  >
                    <Price.Header showPeriodLabel={false} />

                    <Box twClassName="px-4">
                      <SecuritySocialSection
                        securityVerdict={securityFacts.verdict}
                        securityRiskCount={securityFacts.risks.length}
                        externalLinks={securityData?.metadata?.externalLinks}
                        contractAddress={contractAddress}
                        onSecurityPress={
                          visibleTabs.includes('security')
                            ? handleSecurityPress
                            : undefined
                        }
                      />
                    </Box>
                    {/* The interval bar above the chart adds 8px of its own top padding. */}
                    <Box
                      twClassName={
                        isTechnicalIndicatorsEnabled ? 'pt-4 pb-2' : 'py-4'
                      }
                    >
                      <StatBar
                        variant={variant}
                        stats={tokenStats}
                        onStatPress={handleRowExplain}
                      />
                    </Box>

                    <Price.Chart uniformSpacing />
                  </Price.Provider>

                  <TokenDetailsActionsSection
                    token={token}
                    networkName={networkConfigurationByChainId?.name}
                    severity={securityData?.resultType}
                    tdpVersion="v3"
                  />

                  <View
                    {...pinnedTabBar.inFlowProps}
                    onLayout={handleTabBarContainerLayout}
                    testID={TokenDetailsIds.tabBarSlot}
                  >
                    <TokenDetailsV1TabBar
                      activeTab={activeTab}
                      onTabPress={handleTabPress}
                      tabs={visibleTabs}
                    />
                  </View>

                  <GestureDetector gesture={swipeGesture}>
                    <View
                      collapsable={false}
                      style={isEmptyFeed ? undefined : tabContentStyle}
                      testID={TokenDetailsIds.tabContent}
                    >
                      <TokenDetailsScrollProvider value={pageScroll.value}>
                        {visibleTabs.map((tab) => {
                          const isActive = tab === activeTab;
                          return (
                            <View
                              key={tab}
                              collapsable={false}
                              style={
                                isActive ? undefined : HIDDEN_TAB_PAGE_STYLE
                              }
                              pointerEvents={isActive ? 'auto' : 'none'}
                              testID={TokenDetailsIds.tabPage(tab)}
                            >
                              {renderTabPage(tab, isActive)}
                            </View>
                          );
                        })}
                      </TokenDetailsScrollProvider>
                    </View>
                  </GestureDetector>
                </ScrollView>
                <Animated.View
                  style={[styles.pinnedTabBar, pinnedTabBar.pinnedStyle]}
                  {...pinnedTabBar.pinnedProps}
                  testID={TokenDetailsIds.pinnedTabBarOverlay}
                >
                  <TokenDetailsV1TabBar
                    activeTab={activeTab}
                    onTabPress={handleTabPress}
                    topInset={isGlassHeader ? headerInset : 0}
                    tabs={visibleTabs}
                    isPinnedCopy
                  />
                </Animated.View>
              </View>
            )}
          </PriceChartContext.Consumer>
        </View>

        {/* Outside the isolated content, so its sheets open above the glass header. */}
        <TraderPositionPnlSection
          token={token}
          tokenKey={traderPositionTokenKey}
          securityData={securityData}
          // Measured on the first layout. Attaching this only after the feed
          // is known empty misses that layout, leaves the height at 0, and the
          // create-post button stays under the position bar.
          onFooterLayout={handleFooterLayout}
        />

        {/* Both sheets sit outside the ScrollView on purpose: the design
            system `BottomSheet` is positioned `absolute inset-0` against its
            nearest positioned ancestor instead of being portalled, so mounting
            one inside the scroll content would clip it to the viewport and
            scroll it away with the page. */}
        {explainerCopy && (
          <TokenExplainerSheet
            title={strings(explainerCopy.title)}
            description={strings(explainerCopy.description)}
            onClose={handleExplainerClose}
          />
        )}

        {shareUrl && (
          <ShareTokenBottomSheetController
            ref={shareSheetRef}
            shareUrl={shareUrl}
            token={token}
            currentPrice={currentPrice ?? 0}
            priceDiff={priceDiff ?? 0}
            comparePrice={comparePrice ?? 0}
            currentCurrency={currentCurrency ?? 'usd'}
            securityData={securityData}
            networkName={networkConfigurationByChainId?.name}
          />
        )}

        <QuickBuy.Root
          isVisible={copyTrade !== null}
          target={copyTrade?.target ?? null}
          onClose={closeCopyTrade}
          features={TOP_TRADERS_QUICK_BUY_FEATURES}
          initialTradeMode={copyTrade?.tradeMode ?? 'buy'}
          analyticsContext={copyTradeAnalyticsContext}
          copyTradeOrigin={copyTrade?.copyTradeOrigin}
          postTradeShare
          postTradeShareOwner={PostTradeShareOwner.tokenDetails}
        />
      </View>
    </PriceChartProvider>
  );
};

export default TokenDetailsV1;
