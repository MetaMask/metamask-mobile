import { formatAddressToAssetId } from '@metamask/bridge-controller';
import { Theme } from '@metamask/design-tokens';
import {
  AVAILABLE_MULTICHAIN_NETWORK_CONFIGURATIONS,
  SupportedCaipChainId,
} from '@metamask/multichain-network-controller';
import {
  isCaipAssetType,
  parseCaipAssetType,
  type CaipAssetType,
} from '@metamask/utils';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AppState,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { TransactionDetailLocation } from '../../../../core/Analytics/events/transactions';
import { useABTest } from '../../../../hooks/useABTest';
import { useAddNetworkIfMissingQuery } from '../../../hooks/useAddNetworkIfMissing/useAddNetworkIfMissing';
import { RootState } from '../../../../reducers';
import {
  selectNetworkConfigurationByChainId,
  selectNetworkConfigurations,
} from '../../../../selectors/networkController';
import { selectCurrencyRates } from '../../../../selectors/currencyRateController';
import { calcUsdAmountFromFiat } from '../../Bridge/utils/exchange-rates';
import { TraceName, endTrace } from '../../../../util/trace';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { useStyles } from '../../../hooks/useStyles';
import ActivityHeader from '../../../Views/Asset/ActivityHeader';
import MultichainTransactionsView from '../../../Views/MultichainTransactionsView/MultichainTransactionsView';
import { TokenOverviewSelectorsIDs } from '../../AssetOverview/TokenOverview.testIds';
import { MarketInsightsDisclaimerBottomSheet } from '../../MarketInsights';
import Transactions from '../../Transactions';
import {
  AMBIENT_PRICE_COLOR_AB_KEY,
  AMBIENT_PRICE_COLOR_VARIANTS,
  EARN_MONEY_DEPOSIT_FOOTER_CTA_VISIBILITY_AB_KEY,
  EARN_MONEY_DEPOSIT_FOOTER_CTA_VISIBILITY_VARIANTS,
} from '../components/abTestConfig';
import { useStickyQuickBuy } from '../hooks/useStickyQuickBuy';
import {
  SWAPS5094_QUICK_BUY_ENTRYPOINTS_AB_KEY,
  SWAPS5094_QUICK_BUY_ENTRYPOINTS_EXPOSURE_METADATA,
  SWAPS5094_QUICK_BUY_ENTRYPOINTS_VARIANTS,
} from '../../QuickBuy/abTestConfig';
import AssetOverviewContent from '../components/AssetOverviewContent';
import TokenDetailsTabBar, {
  TokenDetailsTab,
} from '../components/TokenDetailsTabBar';
import TokenDetailsFeed from '../components/TokenDetailsFeed';
import { TokenDetailsInlineHeader } from '../components/TokenDetailsInlineHeader';
import ShareTokenBottomSheet from '../components/ShareTokenBottomSheet';
import TokenDetailsStickyFooter from '../components/TokenDetailsStickyFooter';
import {
  TokenDetailsSource,
  TokenDetailsAction,
  type TokenDetailsRouteParams,
  type TokenDetailsExitAction,
} from '../constants/constants';
import { useTokenActions } from '../hooks/useTokenActions';
import { useTokenBalance } from '../hooks/useTokenBalance';
import { useTokenDetailsActionTracking } from '../hooks/useTokenDetailsActionTracking';
import { useTokenPrice } from '../hooks/useTokenPrice';
import { useTokenSecurityData } from '../hooks/useTokenSecurityData';
import { useTokenTransactions } from '../hooks/useTokenTransactions';
import Routes from '../../../../constants/navigation/Routes';
import { useIsPriceAlertsChainSupported } from '../../Assets/PriceAlerts/hooks/useIsPriceAlertsChainSupported';
import WatchlistStarButton from '../../Assets/watchlist/components/WatchlistStarButton';
import {
  MoneyAssetOverviewBalanceCta,
  MoneyAssetOverviewBalanceCtaSkeleton,
  MoneyAssetOverviewBalanceDescription,
  MoneyAssetOverviewBalanceDescriptionSkeleton,
} from '../../Money/components/MoneyAssetOverviewBalanceCta';
import { useMoneyAssetOverviewCtas } from '../../Money/hooks/useMoneyAssetOverviewCtas';
import { selectPrivacyMode } from '../../../../selectors/preferencesController';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../selectors/accountsController';
import { selectBridgeRecurringBuyFeatureFlags } from '../../../../selectors/bridge/featureFlags';
import { selectSocialLeaderboardEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';
import {
  selectTokenDetailsTabsEnabled,
  TOKEN_DETAILS_TABS_MOCK_ENABLED,
} from '../../../../selectors/featureFlagController/tokenDetailsTabs';
import { useSocialFeed } from '../../SocialFeed/data/useSocialFeed';
import {
  SOCIAL_V1_AB_KEY,
  SOCIAL_V1_EXPOSURE_METADATA,
  SOCIAL_V1_VARIANTS,
} from '../../../Views/SocialLeaderboard/SocialV1View/abTestConfig';
import { TextColor } from '../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../locales/i18n';
import { useLatestOpenRecurringOrderForAsset } from '../../Bridge/hooks/useLatestOpenRecurringOrderForAsset';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;
  return StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    listContainer: {
      flex: 1,
    },
    stickyTabBar: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1,
      elevation: 1,
      backgroundColor: colors.background.default,
    },
  });
};

/**
 * Fires TOKEN_DETAILS_OPENED for the Token Details view.
 */
const useTokenDetailsOpenedTracking = (params: TokenDetailsRouteParams) => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const lastTrackedTokenKeyRef = useRef<string | null>(null);

  return useCallback(
    ({
      isMarketInsightsDisplayed,
      severity,
      hasPerpsMarket,
      stickyButtonsShown,
    }: {
      isMarketInsightsDisplayed: boolean;
      severity: string | undefined;
      hasPerpsMarket: boolean;
      stickyButtonsShown:
        | 'both'
        | 'buy'
        | 'swap'
        | 'money_swap'
        | 'money'
        | 'buy_sell'
        | undefined;
    }) => {
      const source = params.source ?? TokenDetailsSource.Unknown;
      const tokenTrackingKey = `${params.chainId ?? ''}:${params.address ?? ''}:${params.symbol ?? ''}:${source}`;

      if (lastTrackedTokenKeyRef.current === tokenTrackingKey) {
        return;
      }

      const hasBalance =
        params.balance !== undefined &&
        params.balance !== null &&
        params.balance !== '0' &&
        params.balance !== '';

      const eventProperties = {
        source,
        chain_id: params.chainId,
        token_symbol: params.symbol,
        token_address: params.address,
        token_name: params.name,
        has_balance: hasBalance,
        market_insights_displayed: isMarketInsightsDisplayed,
        severity,
        has_perps_market: hasPerpsMarket,
        ...(stickyButtonsShown !== undefined && {
          sticky_buttons_shown: stickyButtonsShown,
        }),
      };
      const event = createEventBuilder(MetaMetricsEvents.TOKEN_DETAILS_OPENED)
        .addProperties(eventProperties)
        .build();
      trackEvent(event);
      lastTrackedTokenKeyRef.current = tokenTrackingKey;
    },
    [
      createEventBuilder,
      params.address,
      params.balance,
      params.chainId,
      params.name,
      params.source,
      params.symbol,
      trackEvent,
    ],
  );
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
 * TokenDetails component - Clean orchestrator that fetches data and sets layout.
 * All business logic is delegated to hooks and presentation to AssetOverviewContent.
 */
const TokenDetails: React.FC<{
  token: TokenDetailsRouteParams;
  onMarketInsightsDisplayResolved?: (params: {
    isDisplayed: boolean;
    severity: string | undefined;
  }) => void;
  onStickyButtonsResolved?: (
    shown: 'both' | 'buy' | 'swap' | 'money_swap' | 'money' | 'buy_sell' | null,
  ) => void;
  onCtaClicked?: () => void;
  onPerpsMarketResolved?: (result: {
    hasPerpsMarket: boolean;
    isLoading: boolean;
  }) => void;
}> = ({
  token,
  onMarketInsightsDisplayResolved,
  onStickyButtonsResolved,
  onCtaClicked,
  onPerpsMarketResolved,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation<AppNavigationProp>();
  useAddNetworkIfMissingQuery({ chainId: token.chainId });
  const { trackEvent, createEventBuilder } = useAnalytics();
  const [isInsightsDisclaimerVisible, setIsInsightsDisclaimerVisible] =
    useState(false);
  const shareSheetRef = useRef<ShareTokenBottomSheetControllerRef>(null);
  const { variant: quickBuyEntrypointVariant } = useABTest(
    SWAPS5094_QUICK_BUY_ENTRYPOINTS_AB_KEY,
    SWAPS5094_QUICK_BUY_ENTRYPOINTS_VARIANTS,
    SWAPS5094_QUICK_BUY_ENTRYPOINTS_EXPOSURE_METADATA,
  );
  const { onQuickBuyPress, openQuickBuy, quickBuySheet } = useStickyQuickBuy({
    token,
    source: 'asset_details',
  });
  const { variant: ambientColorVariant } = useABTest(
    AMBIENT_PRICE_COLOR_AB_KEY,
    AMBIENT_PRICE_COLOR_VARIANTS,
  );
  const useAmbientColor = ambientColorVariant.useAmbientPriceColor;
  const { variant: moneyFooterCtaVariant } = useABTest(
    EARN_MONEY_DEPOSIT_FOOTER_CTA_VISIBILITY_AB_KEY,
    EARN_MONEY_DEPOSIT_FOOTER_CTA_VISIBILITY_VARIANTS,
  );

  const caip19AssetId = useMemo((): CaipAssetType | null => {
    try {
      if (token.caipAssetId && isCaipAssetType(token.caipAssetId)) {
        return token.caipAssetId;
      }
      if (isCaipAssetType(token.address)) {
        return token.address as CaipAssetType;
      }
      if (!token.chainId) return null;
      const formatted = formatAddressToAssetId(token.address, token.chainId);
      if (formatted) return formatted as CaipAssetType;
      // For non-EVM native tokens (e.g. Bitcoin), formatAddressToAssetId returns
      // undefined for addresses like "native". Fall back to the chain's native
      // currency CAIP-19 id from the multichain network configurations.
      const nonEvmConfig =
        AVAILABLE_MULTICHAIN_NETWORK_CONFIGURATIONS[
          token.chainId as SupportedCaipChainId
        ];
      return (nonEvmConfig?.nativeCurrency as CaipAssetType) ?? null;
    } catch {
      return null;
    }
  }, [token.caipAssetId, token.address, token.chainId]);

  const shareUrl = useMemo(
    () =>
      caip19AssetId
        ? `https://link.metamask.io/asset?assetId=${encodeURIComponent(caip19AssetId)}`
        : null,
    [caip19AssetId],
  );

  const walletAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const recurringBuyFeatureFlags = useSelector(
    selectBridgeRecurringBuyFeatureFlags,
  );
  const isRecurringOrderLookupEnabled = useMemo(() => {
    if (!recurringBuyFeatureFlags?.enabled || !caip19AssetId) {
      return false;
    }

    try {
      const { chainId } = parseCaipAssetType(caip19AssetId);
      return recurringBuyFeatureFlags.enabledChainIds?.includes(chainId);
    } catch {
      return false;
    }
  }, [caip19AssetId, recurringBuyFeatureFlags]);
  const { order: latestOpenRecurringOrder } =
    useLatestOpenRecurringOrderForAsset({
      walletAddress,
      assetId: caip19AssetId,
      enabled: isRecurringOrderLookupEnabled,
    });

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

  const isPriceAlertsChainSupported =
    useIsPriceAlertsChainSupported(caip19AssetId);

  const {
    securityData,
    isLoading: isSecurityDataLoading,
    error: securityDataError,
  } = useTokenSecurityData({
    assetId: caip19AssetId,
    prefetchedData: token.securityData,
  });

  const networkConfigurationByChainId = useSelector((state: RootState) =>
    selectNetworkConfigurationByChainId(state, token.chainId),
  );
  const networkName = networkConfigurationByChainId?.name;

  const networkConfigurationsByChainId = useSelector(
    selectNetworkConfigurations,
  );
  const evmMultiChainCurrencyRates = useSelector(selectCurrencyRates);

  const {
    currentPrice,
    priceDiff,
    comparePrice,
    prices,
    isLoading,
    currentCurrency,
    timePeriod,
    setTimePeriod,
    chartNavigationButtons,
    hasInsufficientCoverage,
    historicalPricesApiMs,
    exchangeRateApiMs,
  } = useTokenPrice({ token });

  const hasEndedAssetDetailsTraceRef = useRef(false);

  useEffect(() => {
    if (hasEndedAssetDetailsTraceRef.current || isLoading) {
      return;
    }
    hasEndedAssetDetailsTraceRef.current = true;
    endTrace({
      name: TraceName.AssetDetails,
      data: {
        ...(caip19AssetId ? { asset_id: caip19AssetId } : {}),
        ...(historicalPricesApiMs !== undefined
          ? { historical_prices_api_ms: historicalPricesApiMs }
          : {}),
        ...(exchangeRateApiMs !== undefined
          ? { exchange_rate_api_ms: exchangeRateApiMs }
          : {}),
      },
    });
  }, [isLoading, caip19AssetId, historicalPricesApiMs, exchangeRateApiMs]);

  // If the screen unmounts before price data finishes loading, close the
  // pending span here instead of leaving it open. Otherwise it stays pending
  // until the next `AssetDetails` trace is started (e.g. opening another
  // asset), which silently finishes it as a normal completion with a
  // duration measuring time-until-next-open and no API timing data,
  // skewing Asset Details performance metrics.
  useEffect(
    () => () => {
      if (hasEndedAssetDetailsTraceRef.current) {
        return;
      }
      hasEndedAssetDetailsTraceRef.current = true;
      endTrace({ name: TraceName.AssetDetails });
    },
    [],
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

  const [chartPricePositive, setChartPricePositive] = useState<boolean | null>(
    null,
  );
  const handlePriceDirectionChange = useCallback((isPositive: boolean) => {
    setChartPricePositive(isPositive);
  }, []);

  const {
    balance,
    fiatBalance,
    balanceFiatUsd,
    tokenFormattedBalance,
    ///: BEGIN:ONLY_INCLUDE_IF(tron)
    stakedTrxAsset,
    inLockPeriodBalance,
    readyForWithdrawalBalance,
    ///: END:ONLY_INCLUDE_IF
  } = useTokenBalance(token, { calculateUsdBalance: true });

  const hasBalanceValue = Boolean(balance) && balance !== '0';
  const isNativeToken = Boolean(token.isETH || token.isNative);
  const privacyMode = useSelector(selectPrivacyMode);
  const moneyAssetOverviewCtas = useMoneyAssetOverviewCtas({
    asset: token,
    balanceFiatUsd,
    hasBalance: hasBalanceValue,
  });
  const isMoneyFooterCtaActive =
    moneyFooterCtaVariant.showMoneyDepositFooterCta &&
    (moneyAssetOverviewCtas.isFooterCtaLoading ||
      moneyAssetOverviewCtas.isFooterCtaVisible);
  const trackActionTapped = useTokenDetailsActionTracking({
    token,
    hasBalance: hasBalanceValue,
    severity: securityData?.resultType,
  });

  const { onBuy, onSend, onReceive } = useTokenActions({
    token,
    networkName,
  });

  const { moneyBalanceCta, moneyBalanceDescription } = useMemo(() => {
    if (moneyAssetOverviewCtas.isBalanceCtaLoading) {
      return {
        moneyBalanceCta: <MoneyAssetOverviewBalanceCtaSkeleton />,
        moneyBalanceDescription: (
          <MoneyAssetOverviewBalanceDescriptionSkeleton />
        ),
      };
    }

    if (
      !moneyAssetOverviewCtas.isBalanceCtaVisible ||
      moneyAssetOverviewCtas.apyPercent === undefined ||
      moneyAssetOverviewCtas.projectedEarningsFormatted === undefined
    ) {
      return {
        moneyBalanceCta: undefined,
        moneyBalanceDescription: undefined,
      };
    }

    return {
      moneyBalanceCta: (
        <MoneyAssetOverviewBalanceCta
          onStartEarning={moneyAssetOverviewCtas.onBalancePress}
        />
      ),
      moneyBalanceDescription: (
        <MoneyAssetOverviewBalanceDescription
          privacyMode={privacyMode}
          projectedEarnings={moneyAssetOverviewCtas.projectedEarningsFormatted}
          tokenSymbol={token.symbol}
        />
      ),
    };
  }, [
    moneyAssetOverviewCtas.apyPercent,
    moneyAssetOverviewCtas.isBalanceCtaLoading,
    moneyAssetOverviewCtas.isBalanceCtaVisible,
    moneyAssetOverviewCtas.onBalancePress,
    moneyAssetOverviewCtas.projectedEarningsFormatted,
    privacyMode,
    token.symbol,
  ]);

  const handleBuy = useCallback(() => {
    onCtaClicked?.();
    onBuy();
  }, [onBuy, onCtaClicked]);

  const handleSend = useCallback(async () => {
    onCtaClicked?.();
    await onSend();
  }, [onSend, onCtaClicked]);

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

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleCopyAddress = useCallback(() => {
    trackActionTapped(TokenDetailsAction.CopyTokenAddress);
  }, [trackActionTapped]);

  const handleMarketInsightsDisclaimerPress = useCallback(() => {
    setIsInsightsDisclaimerVisible(true);
  }, []);

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

  const moneyDepositCta = useMemo(
    () =>
      isMoneyFooterCtaActive
        ? {
            isLoading: moneyAssetOverviewCtas.isFooterCtaLoading,
            label: moneyAssetOverviewCtas.footerLabelLocalized,
            onPress: moneyAssetOverviewCtas.onFooterPress,
          }
        : undefined,
    [
      isMoneyFooterCtaActive,
      moneyAssetOverviewCtas.isFooterCtaLoading,
      moneyAssetOverviewCtas.footerLabelLocalized,
      moneyAssetOverviewCtas.onFooterPress,
    ],
  );

  const {
    transactions,
    submittedTxs,
    confirmedTxs,
    loading: txLoading,
    transactionsUpdated,
    selectedAddress,
    conversionRate,
    currentCurrency: txCurrentCurrency,
    isNonEvmAsset: txIsNonEvmAsset,
    bridgeArrivalTxs,
  } = useTokenTransactions(token);

  const hasTransactions =
    transactions.length > 0 ||
    submittedTxs.length > 0 ||
    confirmedTxs.length > 0;

  // Token details tabs (Overview / Feed). The tab bar scrolls
  // with the header; once it reaches the top of the list a pinned copy takes
  // over so it stays fixed while the content keeps scrolling underneath.
  // ASSETS-4021 ships the Feed tab with Social V1. The mock constant forces
  // the shell on until that flag is the only gate.
  const { variant: socialV1Variant } = useABTest(
    SOCIAL_V1_AB_KEY,
    SOCIAL_V1_VARIANTS,
    SOCIAL_V1_EXPOSURE_METADATA,
  );
  const areTabsEnabled =
    useSelector(selectTokenDetailsTabsEnabled) &&
    (TOKEN_DETAILS_TABS_MOCK_ENABLED || socialV1Variant.useSocialV1);
  const isSocialFeedEnabled = useSelector(selectSocialLeaderboardEnabled);
  const tokenFeedSource = useMemo(
    () =>
      areTabsEnabled && isSocialFeedEnabled && caip19AssetId
        ? { kind: 'token' as const, assetId: caip19AssetId }
        : null,
    [areTabsEnabled, caip19AssetId, isSocialFeedEnabled],
  );
  const { posts: feedPosts } = useSocialFeed(tokenFeedSource);
  // An empty feed has nothing to open, so the Feed tab stays off the bar.
  const showFeedTab = feedPosts.length > 0;
  const [activeTab, setActiveTab] = useState<TokenDetailsTab>(
    TokenDetailsTab.Overview,
  );
  const [isTabBarStuck, setIsTabBarStuck] = useState(false);
  const isTabBarStuckRef = useRef(false);
  const tabBarOffsetRef = useRef<number | null>(null);
  const showTokenDetailsTabs = areTabsEnabled && showFeedTab;
  const isOverviewTab =
    !showTokenDetailsTabs || activeTab === TokenDetailsTab.Overview;

  useEffect(() => {
    if (!showFeedTab && activeTab === TokenDetailsTab.Feed) {
      setActiveTab(TokenDetailsTab.Overview);
    }
  }, [activeTab, showFeedTab]);

  const handleHeroLayout = useCallback((event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout;
    tabBarOffsetRef.current = y + height;
  }, []);

  const updateTabBarStuck = useCallback((offsetY: number) => {
    const threshold = tabBarOffsetRef.current;
    if (threshold === null) {
      return;
    }
    const nextIsStuck = offsetY >= threshold;
    if (nextIsStuck !== isTabBarStuckRef.current) {
      isTabBarStuckRef.current = nextIsStuck;
      setIsTabBarStuck(nextIsStuck);
    }
  }, []);

  const handleListScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      updateTabBarStuck(event.nativeEvent.contentOffset.y);
    },
    [updateTabBarStuck],
  );

  const renderTabBar = (testID?: string) =>
    showTokenDetailsTabs ? (
      <TokenDetailsTabBar
        activeTab={activeTab}
        onTabPress={setActiveTab}
        testID={testID}
      />
    ) : undefined;

  const renderHeader = () => (
    <>
      <AssetOverviewContent
        token={token}
        balance={balance}
        balanceCta={moneyBalanceCta}
        balanceDescription={moneyBalanceDescription}
        balancePriceChangeOverride={
          moneyAssetOverviewCtas.isBalanceCtaVisible &&
          moneyAssetOverviewCtas.apyPercent !== undefined
            ? strings('money.asset_overview.balance_cta.earn_apy', {
                apy: moneyAssetOverviewCtas.apyPercent,
              })
            : undefined
        }
        balancePriceChangeOverrideColor={
          moneyAssetOverviewCtas.isBalanceCtaVisible
            ? TextColor.Success
            : undefined
        }
        mainBalance={fiatBalance ?? ''}
        secondaryBalance={tokenFormattedBalance}
        currentPrice={currentPrice}
        priceDiff={priceDiff}
        comparePrice={comparePrice}
        prices={prices}
        isLoading={isLoading}
        hasInsufficientCoverage={hasInsufficientCoverage}
        timePeriod={timePeriod}
        setTimePeriod={setTimePeriod}
        chartNavigationButtons={chartNavigationButtons}
        currentCurrency={currentCurrency}
        onBuy={handleBuy}
        onSend={handleSend}
        onReceive={onReceive}
        onMarketInsightsDisplayResolved={onMarketInsightsDisplayResolved}
        onMarketInsightsDisclaimerPress={handleMarketInsightsDisclaimerPress}
        securityData={securityData}
        isSecurityDataLoading={isSecurityDataLoading}
        hasSecurityDataError={Boolean(securityDataError)}
        onPriceDirectionChange={handlePriceDirectionChange}
        useAmbientColor={useAmbientColor}
        onExitAction={onCtaClicked}
        isPricePositive={chartPricePositive}
        onPerpsMarketResolved={onPerpsMarketResolved}
        recurringOrder={latestOpenRecurringOrder}
        tabBar={renderTabBar()}
        showOverviewSections={isOverviewTab}
        onHeroLayout={showTokenDetailsTabs ? handleHeroLayout : undefined}
        ///: BEGIN:ONLY_INCLUDE_IF(tron)
        stakedTrxAsset={stakedTrxAsset}
        inLockPeriodBalance={inLockPeriodBalance}
        readyForWithdrawalBalance={readyForWithdrawalBalance}
        ///: END:ONLY_INCLUDE_IF
      />
      {isOverviewTab && (txLoading || hasTransactions) && (
        <ActivityHeader
          asset={{
            ...token,
            hasBalanceError: token.hasBalanceError ?? false,
          }}
        />
      )}
      {!isOverviewTab && <TokenDetailsFeed assetId={caip19AssetId} />}
    </>
  );

  // Non-overview tabs own their own content, so the activity list is emptied.
  const listTransactions = isOverviewTab ? transactions : [];
  const listSubmittedTxs = isOverviewTab ? submittedTxs : [];
  const listConfirmedTxs = isOverviewTab ? confirmedTxs : [];
  const listBridgeArrivalTxs = isOverviewTab ? bridgeArrivalTxs : [];

  return (
    <View style={styles.wrapper}>
      <TokenDetailsInlineHeader
        token={token}
        securityData={securityData}
        onBackPress={handleBackPress}
        onSharePress={handleShare}
        starButton={starButton}
        onPriceAlertPress={
          isPriceAlertsChainSupported &&
          (currentPriceUsd ?? 0) > 0 &&
          caip19AssetId
            ? handlePriceAlertPress
            : undefined
        }
        onCopyAddress={handleCopyAddress}
      />

      <View style={styles.listContainer}>
        {txIsNonEvmAsset ? (
          <MultichainTransactionsView
            header={renderHeader()}
            transactions={listTransactions}
            navigation={navigation}
            selectedAddress={selectedAddress}
            chainId={token.chainId as SupportedCaipChainId}
            bridgeArrivalTransactions={listBridgeArrivalTxs}
            enableRefresh
            showDisclaimer={isOverviewTab}
            hideEmptyState={!isOverviewTab}
            onScroll={showTokenDetailsTabs ? handleListScroll : undefined}
            location={TransactionDetailLocation.AssetDetails}
          />
        ) : (
          <Transactions
            header={renderHeader()}
            assetSymbol={token.symbol}
            navigation={navigation}
            transactions={listTransactions}
            submittedTransactions={listSubmittedTxs}
            confirmedTransactions={listConfirmedTxs}
            selectedAddress={selectedAddress}
            conversionRate={conversionRate}
            currentCurrency={txCurrentCurrency}
            networkType={token.chainId}
            loading={!transactionsUpdated}
            headerHeight={280}
            tokenChainId={token.chainId}
            skipScrollOnClick
            hideEmptyState
            onScrollThroughContent={
              showTokenDetailsTabs ? updateTabBarStuck : undefined
            }
            location={TransactionDetailLocation.AssetDetails}
          />
        )}
        {showTokenDetailsTabs && isTabBarStuck && (
          <View style={styles.stickyTabBar} pointerEvents="box-none">
            {renderTabBar(TokenOverviewSelectorsIDs.TABS_BAR_STICKY)}
          </View>
        )}
      </View>
      <TokenDetailsStickyFooter
        token={token}
        securityData={securityData}
        balanceFiatUsd={balanceFiatUsd}
        networkName={networkName}
        currentTokenBalance={balance}
        hasTokenBalance={hasBalanceValue}
        moneyDepositCta={moneyDepositCta}
        onStickyButtonsResolved={onStickyButtonsResolved}
        sourcePage="TokenDetailsView"
        useAmbientColor={useAmbientColor}
        onSwapPress={onCtaClicked}
        onBuyPress={onCtaClicked}
        onQuickBuyPress={onQuickBuyPress}
        quickBuyTestID={TokenOverviewSelectorsIDs.QUICK_BUY_BUTTON}
        quickBuyEntrypointLayout={quickBuyEntrypointVariant.footerLayout}
        onOpenQuickBuy={openQuickBuy}
      />

      {isInsightsDisclaimerVisible && (
        <MarketInsightsDisclaimerBottomSheet
          onClose={() => setIsInsightsDisclaimerVisible(false)}
        />
      )}
      {shareUrl && (
        <ShareTokenBottomSheetController
          ref={shareSheetRef}
          shareUrl={shareUrl}
          token={token}
          currentPrice={currentPrice}
          priceDiff={priceDiff}
          comparePrice={comparePrice}
          currentCurrency={currentCurrency}
          securityData={securityData}
          networkName={networkName}
        />
      )}
      {quickBuySheet}
    </View>
  );
};

/**
 * TokenDetailsRouteWrapper screen
 * Reads token from React Navigation route.params and renders TokenDetails.
 */
export const TokenDetailsRouteWrapper: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation<AppNavigationProp>();
  const token = route.params as TokenDetailsRouteParams;

  const [perpsMarket, setPerpsMarket] = useState<{
    hasPerpsMarket: boolean;
    isLoading: boolean;
  }>({ hasPerpsMarket: false, isLoading: true });
  const { hasPerpsMarket, isLoading: isPerpsMarketLoading } = perpsMarket;

  // undefined = not yet resolved; null = footer won't render; string = resolved value
  const [resolvedStickyButtons, setResolvedStickyButtons] = useState<
    | 'both'
    | 'buy'
    | 'swap'
    | 'money_swap'
    | 'money'
    | 'buy_sell'
    | null
    | undefined
  >(undefined);

  const trackTokenDetailsOpened = useTokenDetailsOpenedTracking(token);

  const { trackEvent, createEventBuilder } = useAnalytics();
  const openedAtRef = useRef<number>(Date.now());
  const closeSourceRef = useRef<TokenDetailsExitAction | null>(null);

  const firedRef = useRef(false);

  const fireClosedRef = useRef<() => void>(() => undefined);
  useLayoutEffect(() => {
    fireClosedRef.current = () => {
      if (firedRef.current) return;
      firedRef.current = true;

      trackEvent(
        createEventBuilder(MetaMetricsEvents.TOKEN_DETAILS_CLOSED)
          .addProperties({
            chain_id: token.chainId,
            token_symbol: token.symbol,
            token_address: token.address,
            exit_action: closeSourceRef.current ?? 'back_navigation',
            time_on_screen_ms: Date.now() - openedAtRef.current,
          })
          .build(),
      );
    };
  });

  useEffect(() => {
    // On iOS, `inactive` is transient (Control Center, notifications, Face ID, etc.)
    // and does not background the app. Only `background` means the user left the app.
    // Returning from background may pass through `inactive` before `active`; preserve
    // `lastAppState` across that intermediate state (see AppStateEventListener).
    let lastAppState = AppState.currentState;

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const prevAppState = lastAppState;

      if (nextAppState === 'background') {
        closeSourceRef.current = 'app_backgrounded';
        fireClosedRef.current();
      } else if (nextAppState === 'active' && prevAppState === 'background') {
        closeSourceRef.current = null;
        openedAtRef.current = Date.now();
        firedRef.current = false;
      }

      if (!(nextAppState === 'inactive' && prevAppState === 'background')) {
        lastAppState = nextAppState;
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Fire on back-button / stack pop (screen actually removed, not just blurred by a modal)
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      fireClosedRef.current();
    });

    return unsubscribe;
  }, [navigation]);

  // Fire on CTA-driven blur (screen stays in stack but loses focus to a new route)
  useFocusEffect(
    useCallback(() => {
      closeSourceRef.current = null;
      openedAtRef.current = Date.now();
      firedRef.current = false;

      return () => {
        if (closeSourceRef.current === 'cta_clicked') {
          fireClosedRef.current();
        }
      };
    }, []),
  );

  /**
   * Defer TOKEN_DETAILS_OPENED until both market insights and perps market
   * data have settled. Using plain state instead of ref+nonce keeps
   * `handleMarketInsightsDisplayResolved` stable (setState identity is
   * guaranteed by React) so the child effect in AssetOverviewContent
   * doesn't re-trigger.
   */
  const [pendingInsights, setPendingInsights] = useState<{
    tokenKey: string;
    isDisplayed: boolean;
    severity: string | undefined;
  } | null>(null);

  const tokenKey = `${token.chainId ?? ''}:${token.address ?? ''}:${token.symbol ?? ''}`;

  // Reset perps market state when the token changes so stale results from a
  // previously viewed token never reach TOKEN_DETAILS_OPENED for the new one.
  const prevTokenKeyRef = useRef<string | null>(null);
  if (prevTokenKeyRef.current !== tokenKey) {
    prevTokenKeyRef.current = tokenKey;
    if (perpsMarket.hasPerpsMarket || !perpsMarket.isLoading) {
      setPerpsMarket({ hasPerpsMarket: false, isLoading: true });
    }
  }

  const handleMarketInsightsDisplayResolved = useCallback(
    (payload: { isDisplayed: boolean; severity: string | undefined }) => {
      setPendingInsights({
        tokenKey,
        ...payload,
      });
    },
    [tokenKey],
  );

  useEffect(() => {
    if (!pendingInsights) {
      return;
    }
    if (pendingInsights.tokenKey !== tokenKey) {
      // Ignore stale payloads from a previously viewed token.
      setPendingInsights(null);
      return;
    }
    if (isPerpsMarketLoading) {
      return;
    }
    if (resolvedStickyButtons === undefined) {
      // Wait until sticky buttons have settled before firing the event.
      return;
    }
    trackTokenDetailsOpened({
      isMarketInsightsDisplayed: pendingInsights.isDisplayed,
      severity: pendingInsights.severity,
      hasPerpsMarket,
      stickyButtonsShown: resolvedStickyButtons ?? undefined,
    });
    setPendingInsights(null);
  }, [
    pendingInsights,
    hasPerpsMarket,
    isPerpsMarketLoading,
    resolvedStickyButtons,
    tokenKey,
    trackTokenDetailsOpened,
  ]);

  const handleCtaClicked = useCallback(() => {
    closeSourceRef.current = 'cta_clicked';
    fireClosedRef.current();
  }, []);

  return (
    <TokenDetails
      token={token}
      onMarketInsightsDisplayResolved={handleMarketInsightsDisplayResolved}
      onStickyButtonsResolved={setResolvedStickyButtons}
      onCtaClicked={handleCtaClicked}
      onPerpsMarketResolved={setPerpsMarket}
    />
  );
};

export { TokenDetailsRouteWrapper as TokenDetails };
