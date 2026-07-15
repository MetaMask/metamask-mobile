import { formatAddressToAssetId } from '@metamask/bridge-controller';
import { Theme } from '@metamask/design-tokens';
import {
  AVAILABLE_MULTICHAIN_NETWORK_CONFIGURATIONS,
  SupportedCaipChainId,
} from '@metamask/multichain-network-controller';
import { isCaipAssetType, type CaipAssetType } from '@metamask/utils';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  AppState,
  Platform,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { TransactionDetailLocation } from '../../../../core/Analytics/events/transactions';
import { useABTest } from '../../../../hooks/useABTest';
import { RootState } from '../../../../reducers';
import {
  selectNetworkConfigurationByChainId,
  selectNetworkConfigurations,
} from '../../../../selectors/networkController';
import { selectCurrencyRates } from '../../../../selectors/currencyRateController';
import { calcUsdAmountFromFiat } from '../../Bridge/utils/exchange-rates';
import { LIGHT_MODE_SUCCESS_GREEN, useTheme } from '../../../../util/theme';
import { AppThemeKey } from '../../../../util/theme/models';
import { TraceName, endTrace } from '../../../../util/trace';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { useStyles } from '../../../hooks/useStyles';
import ActivityHeader from '../../../Views/Asset/ActivityHeader';
import MultichainTransactionsView from '../../../Views/MultichainTransactionsView/MultichainTransactionsView';
import { TokenOverviewSelectorsIDs } from '../../AssetOverview/TokenOverview.testIds';
import { MarketInsightsDisclaimerBottomSheet } from '../../MarketInsights';
import { selectPerpsEnabledFlag } from '../../Perps';
import { usePerpsMarketForAsset } from '../../Perps/hooks/usePerpsMarketForAsset';
import Transactions from '../../Transactions';
import {
  AMBIENT_NEGATIVE_COLOR,
  AMBIENT_PRICE_COLOR_AB_KEY,
  AMBIENT_PRICE_COLOR_VARIANTS,
} from '../components/abTestConfig';
import { useStickyQuickBuy } from '../hooks/useStickyQuickBuy';
import AssetOverviewContent from '../components/AssetOverviewContent';
import { TokenDetailsInlineHeader } from '../components/TokenDetailsInlineHeader';
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
import { selectPriceAlertsEnabled } from '../../../../selectors/featureFlagController/priceAlerts';
import { useIsPriceAlertsChainSupported } from '../../Assets/PriceAlerts/hooks/useIsPriceAlertsChainSupported';
import WatchlistStarButton from '../../Assets/watchlist/components/WatchlistStarButton';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;
  return StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    loader: {
      backgroundColor: colors.background.default,
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
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
      stickyButtonsShown: 'both' | 'buy' | 'swap' | undefined;
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
  onStickyButtonsResolved?: (shown: 'both' | 'buy' | 'swap' | null) => void;
  onCtaClicked?: () => void;
}> = ({
  token,
  onMarketInsightsDisplayResolved,
  onStickyButtonsResolved,
  onCtaClicked,
}) => {
  const { styles, theme } = useStyles(styleSheet, {});
  const { themeAppearance } = useTheme();
  const isLightMode = themeAppearance === AppThemeKey.light;
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const [isInsightsDisclaimerVisible, setIsInsightsDisclaimerVisible] =
    useState(false);
  const { onQuickBuyPress, quickBuySheet } = useStickyQuickBuy({
    token,
    source: 'asset_details',
  });
  const { variant: ambientColorVariant } = useABTest(
    AMBIENT_PRICE_COLOR_AB_KEY,
    AMBIENT_PRICE_COLOR_VARIANTS,
  );
  const useAmbientColor = ambientColorVariant.useAmbientPriceColor;

  const caip19AssetId = useMemo((): CaipAssetType | null => {
    try {
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
  }, [token.address, token.chainId]);

  const isPriceAlertsFeatureEnabled = useSelector(selectPriceAlertsEnabled);
  const handleShare = useCallback(() => {
    if (!caip19AssetId) {
      return;
    }

    const url = `https://link.metamask.io/asset?assetId=${encodeURIComponent(caip19AssetId)}`;

    trackEvent(
      createEventBuilder(MetaMetricsEvents.TOKEN_DETAILS_SHARED)
        .addProperties({
          chain_id: token.chainId,
          token_symbol: token.symbol,
          token_address: token.address,
        })
        .build(),
    );

    // Share only the deep link. iOS renders `url` as a rich link preview;
    // Android needs the link in `message`.
    Share.share(Platform.OS === 'ios' ? { url } : { message: url });
  }, [
    caip19AssetId,
    createEventBuilder,
    token.address,
    token.chainId,
    token.symbol,
    trackEvent,
  ]);

  const isPriceAlertsChainSupported = useIsPriceAlertsChainSupported(
    caip19AssetId,
    { enabled: isPriceAlertsFeatureEnabled },
  );

  const {
    securityData,
    isLoading: isSecurityDataLoading,
    error: securityDataError,
  } = useTokenSecurityData({
    assetId: caip19AssetId,
    prefetchedData: token.securityData,
  });

  useEffect(() => {
    endTrace({ name: TraceName.AssetDetails });
  }, []);

  const networkConfigurationByChainId = useSelector((state: RootState) =>
    selectNetworkConfigurationByChainId(state, token.chainId),
  );
  const networkName = networkConfigurationByChainId?.name;

  const networkConfigurationsByChainId = useSelector(
    selectNetworkConfigurations,
  );
  const evmMultiChainCurrencyRates = useSelector(selectCurrencyRates);

  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);

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
  } = useTokenPrice({ token });

  const currentPriceUsd = useMemo(() => {
    if (!isPriceAlertsFeatureEnabled || !Number.isFinite(currentPrice)) {
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
    isPriceAlertsFeatureEnabled,
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

  const ambientIconColor = useMemo(() => {
    if (!useAmbientColor || chartPricePositive === null) return undefined;

    const successColor = isLightMode
      ? LIGHT_MODE_SUCCESS_GREEN
      : theme.colors.success.default;

    return chartPricePositive ? successColor : AMBIENT_NEGATIVE_COLOR;
  }, [
    useAmbientColor,
    chartPricePositive,
    isLightMode,
    theme.colors.success.default,
  ]);

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
  const trackActionTapped = useTokenDetailsActionTracking({
    token,
    hasBalance: hasBalanceValue,
    severity: securityData?.resultType,
  });

  const { onBuy, onSend, onReceive } = useTokenActions({
    token,
    networkName,
  });

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
  } = useTokenTransactions(token);

  const hasTransactions =
    transactions.length > 0 ||
    submittedTxs.length > 0 ||
    confirmedTxs.length > 0;

  const renderHeader = () => (
    <>
      <AssetOverviewContent
        token={token}
        balance={balance}
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
        isPerpsEnabled={isPerpsEnabled}
        currentCurrency={currentCurrency}
        onBuy={handleBuy}
        onSend={handleSend}
        onReceive={onReceive}
        onMarketInsightsDisplayResolved={onMarketInsightsDisplayResolved}
        onMarketInsightsDisclaimerPress={() =>
          setIsInsightsDisclaimerVisible(true)
        }
        securityData={securityData}
        isSecurityDataLoading={isSecurityDataLoading}
        hasSecurityDataError={Boolean(securityDataError)}
        onPriceDirectionChange={handlePriceDirectionChange}
        useAmbientColor={useAmbientColor}
        onExitAction={onCtaClicked}
        isPricePositive={chartPricePositive}
        ///: BEGIN:ONLY_INCLUDE_IF(tron)
        stakedTrxAsset={stakedTrxAsset}
        inLockPeriodBalance={inLockPeriodBalance}
        readyForWithdrawalBalance={readyForWithdrawalBalance}
        ///: END:ONLY_INCLUDE_IF
      />
      {(txLoading || hasTransactions) && (
        <ActivityHeader
          asset={{
            ...token,
            hasBalanceError: token.hasBalanceError ?? false,
          }}
        />
      )}
    </>
  );

  const isNativeToken = Boolean(token.isETH || token.isNative);

  const renderLoader = () => (
    <View style={styles.loader}>
      <ActivityIndicator style={styles.loader} size="small" />
    </View>
  );
  return (
    <View style={styles.wrapper}>
      <TokenDetailsInlineHeader
        token={token}
        securityData={securityData}
        onBackPress={() => navigation.goBack()}
        onSharePress={handleShare}
        starButton={
          <WatchlistStarButton
            assetId={caip19AssetId}
            assetType={isNativeToken ? 'native' : 'erc20'}
            hasBalance={hasBalanceValue}
            source="token_details"
          />
        }
        onPriceAlertPress={
          isPriceAlertsFeatureEnabled &&
          isPriceAlertsChainSupported &&
          (currentPriceUsd ?? 0) > 0 &&
          caip19AssetId
            ? handlePriceAlertPress
            : undefined
        }
        iconColor={ambientIconColor}
        useAmbientColor={useAmbientColor}
        onCopyAddress={() =>
          trackActionTapped(TokenDetailsAction.CopyTokenAddress)
        }
      />

      {txLoading ? (
        renderLoader()
      ) : txIsNonEvmAsset ? (
        <MultichainTransactionsView
          header={renderHeader()}
          transactions={transactions}
          navigation={navigation}
          selectedAddress={selectedAddress}
          chainId={token.chainId as SupportedCaipChainId}
          enableRefresh
          showDisclaimer
          location={TransactionDetailLocation.AssetDetails}
        />
      ) : (
        <Transactions
          header={renderHeader()}
          assetSymbol={token.symbol}
          navigation={navigation}
          transactions={transactions}
          submittedTransactions={submittedTxs}
          confirmedTransactions={confirmedTxs}
          selectedAddress={selectedAddress}
          conversionRate={conversionRate}
          currentCurrency={txCurrentCurrency}
          networkType={token.chainId}
          loading={!transactionsUpdated}
          headerHeight={280}
          tokenChainId={token.chainId}
          skipScrollOnClick
          hideEmptyState
          location={TransactionDetailLocation.AssetDetails}
        />
      )}
      {!txLoading && !(useAmbientColor && chartPricePositive === null) && (
        <TokenDetailsStickyFooter
          token={token}
          securityData={securityData}
          balanceFiatUsd={balanceFiatUsd}
          networkName={networkName}
          currentTokenBalance={balance}
          onStickyButtonsResolved={onStickyButtonsResolved}
          sourcePage="TokenDetailsView"
          isPricePositive={chartPricePositive}
          useAmbientColor={useAmbientColor}
          onSwapPress={onCtaClicked}
          onBuyPress={onCtaClicked}
          onQuickBuyPress={onQuickBuyPress}
          quickBuyTestID={TokenOverviewSelectorsIDs.QUICK_BUY_BUTTON}
        />
      )}
      {isInsightsDisclaimerVisible && (
        <MarketInsightsDisclaimerBottomSheet
          onClose={() => setIsInsightsDisclaimerVisible(false)}
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
  const navigation = useNavigation();
  const token = route.params as TokenDetailsRouteParams;

  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  const { hasPerpsMarket, isLoading: isPerpsMarketLoading } =
    usePerpsMarketForAsset(isPerpsEnabled ? token.symbol : null);

  // undefined = not yet resolved; null = footer won't render; string = resolved value
  const [resolvedStickyButtons, setResolvedStickyButtons] = useState<
    'both' | 'buy' | 'swap' | null | undefined
  >(undefined);

  const trackTokenDetailsOpened = useTokenDetailsOpenedTracking(token);

  const { trackEvent, createEventBuilder } = useAnalytics();
  const openedAtRef = useRef<number>(Date.now());
  const closeSourceRef = useRef<TokenDetailsExitAction | null>(null);

  const firedRef = useRef(false);

  const fireClosedRef = useRef<() => void>(() => undefined);
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
    if (isPerpsEnabled && isPerpsMarketLoading) {
      return;
    }
    if (resolvedStickyButtons === undefined) {
      // Wait until sticky buttons have settled before firing the event.
      return;
    }
    trackTokenDetailsOpened({
      isMarketInsightsDisplayed: pendingInsights.isDisplayed,
      severity: pendingInsights.severity,
      hasPerpsMarket: isPerpsEnabled ? hasPerpsMarket : false,
      stickyButtonsShown: resolvedStickyButtons ?? undefined,
    });
    setPendingInsights(null);
  }, [
    pendingInsights,
    hasPerpsMarket,
    isPerpsEnabled,
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
    />
  );
};

export { TokenDetailsRouteWrapper as TokenDetails };
