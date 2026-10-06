import React, {
  useCallback,
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
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import type { Theme } from '@metamask/design-tokens';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Tag,
  TagSeverity,
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
import { selectCurrencyRates } from '../../../../selectors/currencyRateController';
import Price from '../../AssetOverview/Price/Price';
import PriceChartContext, {
  PriceChartProvider,
} from '../../AssetOverview/PriceChart/PriceChart.context';
import { calcUsdAmountFromFiat } from '../../Bridge/utils/exchange-rates';
import { useIsPriceAlertsChainSupported } from '../../Assets/PriceAlerts/hooks/useIsPriceAlertsChainSupported';
import WatchlistStarButton from '../../Assets/watchlist/components/WatchlistStarButton';
import ShareTokenBottomSheet from '../components/ShareTokenBottomSheet';
import type { SecurityVerdict } from '../components/V1/SecurityPill/SecurityPill';
import SecuritySocialSection from '../components/V1/SecuritySocialSection/SecuritySocialSection';
import StatBar from '../components/V1/StatBar/StatBar';
import StatExplainerSheet from '../components/V1/StatBar/StatExplainerSheet';
import type { TokenStatKey } from '../components/V1/StatBar/StatBar.types';
import OverviewTab from '../components/tabs/OverviewTab';
import TokenDetailsActionsSection from '../components/sections/TokenDetailsActionsSection';
import TokenDetailsV1TabBar, {
  HIDDEN_TAB_PAGE_STYLE,
  useTokenDetailsV1ScrollStabilization,
  useTokenDetailsV1Tabs,
} from '../components/TokenDetailsV1TabBar';
import { TokenDetailsInlineHeader } from '../components/TokenDetailsInlineHeader';
import {
  TOKEN_DETAILS_V1_TABS,
  type TokenDetailsRouteParams,
  type TokenDetailsVariant,
  type TokenDetailsV1TabKey,
} from '../constants/constants';
import { useLivePriceHeaderDescription } from '../hooks/useLivePriceHeaderDescription';
import { useTokenCaipAssetId } from '../hooks/useTokenCaipAssetId';
import { useTokenPrice } from '../hooks/useTokenPrice';
import { useTokenSecurityData } from '../hooks/useTokenSecurityData';
import { useTokenStatBarStats } from '../hooks/useTokenStatBarStats';

export const TOKEN_DETAILS_V1_TEST_ID = 'token-details-v1';
export const TOKEN_DETAILS_V1_AGE_CHIP_TEST_ID = 'token-details-v1-age-chip';
export const TOKEN_DETAILS_V1_SCROLL_VIEW_TEST_ID =
  'token-details-v1-scroll-view';
export const TOKEN_DETAILS_V1_TAB_PANEL_TEST_ID_PREFIX =
  'token-details-v1-tab-panel';
export const TOKEN_DETAILS_V1_TAB_CONTENT_TEST_ID =
  'token-details-v1-tab-content';

/**
 * Direct-child index of the tab bar inside the body ScrollView — registered in
 * `stickyHeaderIndices` so the tab bar docks below the nav header when the
 * price hero (with the security/social row), chart, stat bar, action tiles and
 * tab content scroll under it.
 */
export const TOKEN_DETAILS_TAB_BAR_STICKY_INDEX = 3;

/**
 * TODO(ASSETS-4018): replace with the real verdict and flag count once
 * security data is available. Change these values locally to preview the other
 * states; the count is only rendered for `medium_risk`.
 */
const MOCK_SECURITY_VERDICT: SecurityVerdict = 'screened';
const MOCK_SECURITY_FLAG_COUNT = 1;

/**
 * TODO(ASSETS-4016): replace with the token's real age once the API platform
 * exposes it. Change locally to preview other labels ("5h", "3w", …).
 */
const MOCK_TOKEN_AGE_LABEL = '3d';

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
 * Lightweight placeholder panel for the Security / Feed tabs. Their content
 * ships with follow-up stories (ASSETS-4022 / ASSETS-4021) — the tab bar is
 * rendered "as is" so navigation and layout stay final.
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
    testID={`${TOKEN_DETAILS_V1_TAB_PANEL_TEST_ID_PREFIX}-${tab}`}
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

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;
  return StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      minHeight: '100%',
    },
  });
};

export { resolveSwipeTargetTab } from '../components/TokenDetailsV1TabBar';

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
  const { trackEvent, createEventBuilder } = useAnalytics();
  const shareSheetRef = useRef<ShareTokenBottomSheetControllerRef>(null);

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const caip19AssetId = useTokenCaipAssetId(token);

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

  const { securityData } = useTokenSecurityData({
    assetId: caip19AssetId,
    prefetchedData: token.securityData,
  });

  const statBarStats = useTokenStatBarStats();

  /** Which stat's explainer is open, or `null` for none. */
  const [explainedStat, setExplainedStat] = useState<TokenStatKey | null>(null);

  const handleStatPress = useCallback((statKey: TokenStatKey) => {
    setExplainedStat(statKey);
  }, []);

  const handleExplainerClose = useCallback(() => {
    setExplainedStat(null);
  }, []);

  const isNativeToken = Boolean(token.isETH || token.isNative);
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

  const {
    currentPrice,
    priceDiff,
    comparePrice,
    prices,
    isLoading: isPriceLoading,
    timePeriod,
    setTimePeriod,
    chartNavigationButtons,
    currentCurrency,
    hasInsufficientCoverage,
  } = useTokenPrice({ token });

  const { description: headerDescription, onScrollOffset } =
    useLivePriceHeaderDescription({ currentPrice, currentCurrency });

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      onScrollOffset(event.nativeEvent.contentOffset.y);
    },
    [onScrollOffset],
  );

  const {
    scrollViewRef,
    handleScroll: onScrollViewScroll,
    handleTabBarLayout,
    handleScrollViewLayout,
    tabContentContainerStyle,
    clampScrollToTabBar,
  } = useTokenDetailsV1ScrollStabilization({ onScroll: handleScroll });

  const { activeTab, activateTab, mountedTabs, swipeGesture } =
    useTokenDetailsV1Tabs({ onTabChange: clampScrollToTabBar });

  const renderTabPage = useCallback(
    (tab: TokenDetailsV1TabKey) => {
      if (!mountedTabs.has(tab)) {
        return null;
      }
      if (tab === 'overview') {
        return (
          <OverviewTab
            token={token}
            assetId={caip19AssetId}
            currentCurrency={currentCurrency}
            securityData={securityData}
          />
        );
      }
      return <TokenDetailsV1TabPlaceholder tab={tab} />;
    },
    [mountedTabs, token, caip19AssetId, currentCurrency, securityData],
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
      <View style={styles.wrapper} testID={TOKEN_DETAILS_V1_TEST_ID}>
        <TokenDetailsInlineHeader
          token={token}
          securityData={securityData}
          onBackPress={handleBackPress}
          onSharePress={shareUrl ? handleShare : undefined}
          starButton={starButton}
          onPriceAlertPress={
            isPriceAlertsSupported ? handlePriceAlertPress : undefined
          }
          description={headerDescription}
          titleEndAccessory={
            <Tag
              severity={TagSeverity.Neutral}
              twClassName="self-center shrink-0"
              testID={TOKEN_DETAILS_V1_AGE_CHIP_TEST_ID}
              accessibilityLabel={`Token age ${MOCK_TOKEN_AGE_LABEL}`}
            >
              {MOCK_TOKEN_AGE_LABEL}
            </Tag>
          }
        />

        {/* The tab bar is a direct ScrollView child registered in
            `stickyHeaderIndices`, so it docks right below the nav header
            while the price hero, chart and tab content scroll under it. */}
        <PriceChartContext.Consumer>
          {({ isChartBeingTouched }) => (
            <ScrollView
              ref={scrollViewRef}
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              stickyHeaderIndices={[TOKEN_DETAILS_TAB_BAR_STICKY_INDEX]}
              onScroll={onScrollViewScroll}
              onLayout={handleScrollViewLayout}
              scrollEventThrottle={16}
              scrollEnabled={!isChartBeingTouched}
              testID={TOKEN_DETAILS_V1_SCROLL_VIEW_TEST_ID}
            >
              <Price
                asset={token}
                prices={prices}
                timePeriod={timePeriod}
                chartNavigationButtons={chartNavigationButtons}
                setTimePeriod={setTimePeriod}
                currentPrice={currentPrice}
                priceDiff={priceDiff}
                comparePrice={comparePrice}
                currentCurrency={currentCurrency}
                isLoading={isPriceLoading}
                hasInsufficientCoverage={hasInsufficientCoverage}
              >
                <Box twClassName="px-4">
                  <SecuritySocialSection
                    securityVerdict={MOCK_SECURITY_VERDICT}
                    securityFlagCount={MOCK_SECURITY_FLAG_COUNT}
                    externalLinks={securityData?.metadata?.externalLinks}
                    contractAddress={token.isNative ? null : token.address}
                    onSecurityPress={() => activateTab('security')}
                  />
                </Box>
                <Box twClassName="py-4">
                  <StatBar
                    variant={variant}
                    stats={statBarStats}
                    onStatPress={handleStatPress}
                  />
                </Box>
              </Price>

              <TokenDetailsActionsSection
                token={token}
                networkName={networkConfigurationByChainId?.name}
                severity={securityData?.resultType}
              />

              <TokenDetailsV1TabBar
                activeTab={activeTab}
                onTabPress={activateTab}
                onLayout={handleTabBarLayout}
              />

              <GestureDetector gesture={swipeGesture}>
                <View
                  collapsable={false}
                  style={tabContentContainerStyle}
                  testID={TOKEN_DETAILS_V1_TAB_CONTENT_TEST_ID}
                >
                  {TOKEN_DETAILS_V1_TABS.map((tab) => {
                    const isActive = tab === activeTab;
                    return (
                      <View
                        key={tab}
                        collapsable={false}
                        style={isActive ? undefined : HIDDEN_TAB_PAGE_STYLE}
                        pointerEvents={isActive ? 'auto' : 'none'}
                        testID={`${TOKEN_DETAILS_V1_TAB_CONTENT_TEST_ID}-page-${tab}`}
                      >
                        {renderTabPage(tab)}
                      </View>
                    );
                  })}
                </View>
              </GestureDetector>
            </ScrollView>
          )}
        </PriceChartContext.Consumer>

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

        {explainedStat && (
          <StatExplainerSheet
            statKey={explainedStat}
            onClose={handleExplainerClose}
          />
        )}
      </View>
    </PriceChartProvider>
  );
};

export default TokenDetailsV1;
