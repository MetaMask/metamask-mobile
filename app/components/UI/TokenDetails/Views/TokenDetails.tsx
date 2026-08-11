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
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ActivityIndicator, AppState, StyleSheet, View } from 'react-native';
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
} from '../components/abTestConfig';
import { useStickyQuickBuy } from '../hooks/useStickyQuickBuy';
import AssetOverviewContent from '../components/AssetOverviewContent';
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
import { TextColor } from '../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../locales/i18n';

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
      stickyButtonsShown:
        | 'both'
        | 'buy'
        | 'swap'
        | 'swap_earn'
        | 'earn_buy'
        | 'earn'
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
    shown: 'both' | 'buy' | 'swap' | 'swap_earn' | 'earn_buy' | 'earn' | null,
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
  const { trackEvent, createEventBuilder } = useAnalytics();
  const [isInsightsDisclaimerVisible, setIsInsightsDisclaimerVisible] =
    useState(false);
  const [isShareSheetVisible, setIsShareSheetVisible] = useState(false);
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

    setIsShareSheetVisible(true);
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
  } = useTokenPrice({ token });

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
  const privacyMode = useSelector(selectPrivacyMode);
  const moneyAssetOverviewCtas = useMoneyAssetOverviewCtas({
    asset: token,
    balanceFiatUsd,
    hasBalance: hasBalanceValue,
  });
  const isMoneyFooterCtaActive =
    moneyAssetOverviewCtas.isFooterCtaLoading ||
    moneyAssetOverviewCtas.isFooterCtaVisible;
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

  // End AssetDetails when the screen is past the full-screen loader (interactive).
  const assetDetailsEndedRef = useRef(false);
  useEffect(() => {
    assetDetailsEndedRef.current = false;
  }, [token.chainId, token.address, token.symbol]);
  useEffect(() => {
    if (txLoading || assetDetailsEndedRef.current) {
      return;
    }
    assetDetailsEndedRef.current = true;
    endTrace({ name: TraceName.AssetDetails });
  }, [txLoading]);

  const hasTransactions =
    transactions.length > 0 ||
    submittedTxs.length > 0 ||
    confirmedTxs.length > 0;

  const handleMarketInsightsDisclaimerPress = useCallback(() => {
    setIsInsightsDisclaimerVisible(true);
  }, []);

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleCopyAddress = useCallback(() => {
    trackActionTapped(TokenDetailsAction.CopyTokenAddress);
  }, [trackActionTapped]);

  const isNativeToken = Boolean(token.isETH || token.isNative);

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

  const balancePriceChangeOverride = useMemo(() => {
    if (
      !(
        moneyAssetOverviewCtas.isBalanceCtaVisible &&
        moneyAssetOverviewCtas.apyPercent !== undefined
      )
    ) {
      return undefined;
    }
    return strings('money.asset_overview.balance_cta.earn_apy', {
      apy: moneyAssetOverviewCtas.apyPercent,
    });
  }, [
    moneyAssetOverviewCtas.apyPercent,
    moneyAssetOverviewCtas.isBalanceCtaVisible,
  ]);

  const balancePriceChangeOverrideColor =
    moneyAssetOverviewCtas.isBalanceCtaVisible ? TextColor.Success : undefined;

  const activityHeaderAsset = useMemo(
    () => ({
      ...token,
      hasBalanceError: token.hasBalanceError ?? false,
    }),
    [token],
  );

  const header = useMemo(
    () => (
      <>
        <AssetOverviewContent
          token={token}
          balance={balance}
          balanceCta={moneyBalanceCta}
          balanceDescription={moneyBalanceDescription}
          balancePriceChangeOverride={balancePriceChangeOverride}
          balancePriceChangeOverrideColor={balancePriceChangeOverrideColor}
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
          ///: BEGIN:ONLY_INCLUDE_IF(tron)
          stakedTrxAsset={stakedTrxAsset}
          inLockPeriodBalance={inLockPeriodBalance}
          readyForWithdrawalBalance={readyForWithdrawalBalance}
          ///: END:ONLY_INCLUDE_IF
        />
        {(txLoading || hasTransactions) && (
          <ActivityHeader asset={activityHeaderAsset} />
        )}
      </>
    ),
    [
      token,
      balance,
      moneyBalanceCta,
      moneyBalanceDescription,
      balancePriceChangeOverride,
      balancePriceChangeOverrideColor,
      fiatBalance,
      tokenFormattedBalance,
      currentPrice,
      priceDiff,
      comparePrice,
      prices,
      isLoading,
      hasInsufficientCoverage,
      timePeriod,
      setTimePeriod,
      chartNavigationButtons,
      currentCurrency,
      handleBuy,
      handleSend,
      onReceive,
      onMarketInsightsDisplayResolved,
      handleMarketInsightsDisclaimerPress,
      securityData,
      isSecurityDataLoading,
      securityDataError,
      handlePriceDirectionChange,
      useAmbientColor,
      onCtaClicked,
      chartPricePositive,
      onPerpsMarketResolved,
      ///: BEGIN:ONLY_INCLUDE_IF(tron)
      stakedTrxAsset,
      inLockPeriodBalance,
      readyForWithdrawalBalance,
      ///: END:ONLY_INCLUDE_IF
      txLoading,
      hasTransactions,
      activityHeaderAsset,
    ],
  );

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

      {txLoading ? (
        renderLoader()
      ) : txIsNonEvmAsset ? (
        <MultichainTransactionsView
          header={header}
          transactions={transactions}
          navigation={navigation}
          selectedAddress={selectedAddress}
          chainId={token.chainId as SupportedCaipChainId}
          bridgeArrivalTransactions={bridgeArrivalTxs}
          enableRefresh
          showDisclaimer
          location={TransactionDetailLocation.AssetDetails}
        />
      ) : (
        <Transactions
          header={header}
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
      {!txLoading && (
        <TokenDetailsStickyFooter
          token={token}
          securityData={securityData}
          balanceFiatUsd={balanceFiatUsd}
          networkName={networkName}
          currentTokenBalance={balance}
          hasTokenBalance={hasBalanceValue}
          moneyEarnCta={
            isMoneyFooterCtaActive
              ? {
                  isLoading: moneyAssetOverviewCtas.isFooterCtaLoading,
                  label: moneyAssetOverviewCtas.footerLabelLocalized,
                  onPress: moneyAssetOverviewCtas.onFooterPress,
                }
              : undefined
          }
          onStickyButtonsResolved={onStickyButtonsResolved}
          sourcePage="TokenDetailsView"
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
      {isShareSheetVisible && shareUrl && (
        <ShareTokenBottomSheet
          shareUrl={shareUrl}
          token={token}
          currentPrice={currentPrice}
          priceDiff={priceDiff}
          comparePrice={comparePrice}
          currentCurrency={currentCurrency}
          securityData={securityData}
          networkName={networkName}
          onClose={() => setIsShareSheetVisible(false)}
        />
      )}
      {!isMoneyFooterCtaActive && quickBuySheet}
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
   * Collect analytics inputs in refs so child resolutions do not re-render
   * RouteWrapper. Fire TOKEN_DETAILS_OPENED once all three have settled.
   */
  const tokenKey = `${token.chainId ?? ''}:${token.address ?? ''}:${token.symbol ?? ''}`;
  const insightsRef = useRef<{
    tokenKey: string;
    isDisplayed: boolean;
    severity: string | undefined;
  } | null>(null);
  const perpsRef = useRef<{
    hasPerpsMarket: boolean;
    isLoading: boolean;
  }>({ hasPerpsMarket: false, isLoading: true });
  const stickyButtonsRef = useRef<
    | 'both'
    | 'buy'
    | 'swap'
    | 'swap_earn'
    | 'earn_buy'
    | 'earn'
    | null
    | undefined
  >(undefined);
  const openedTrackedRef = useRef(false);
  const prevTokenKeyRef = useRef(tokenKey);

  // Reset analytics refs during render on token change so child effects in the
  // same commit cannot be wiped by a later parent useEffect.
  if (prevTokenKeyRef.current !== tokenKey) {
    prevTokenKeyRef.current = tokenKey;
    insightsRef.current = null;
    perpsRef.current = { hasPerpsMarket: false, isLoading: true };
    stickyButtonsRef.current = undefined;
    openedTrackedRef.current = false;
  }

  const tryTrackTokenDetailsOpened = useCallback(() => {
    if (openedTrackedRef.current) {
      return;
    }
    const insights = insightsRef.current;
    if (!insights || insights.tokenKey !== tokenKey) {
      return;
    }
    if (perpsRef.current.isLoading) {
      return;
    }
    if (stickyButtonsRef.current === undefined) {
      return;
    }
    trackTokenDetailsOpened({
      isMarketInsightsDisplayed: insights.isDisplayed,
      severity: insights.severity,
      hasPerpsMarket: perpsRef.current.hasPerpsMarket,
      stickyButtonsShown: stickyButtonsRef.current ?? undefined,
    });
    openedTrackedRef.current = true;
  }, [tokenKey, trackTokenDetailsOpened]);

  const handleMarketInsightsDisplayResolved = useCallback(
    (payload: { isDisplayed: boolean; severity: string | undefined }) => {
      insightsRef.current = {
        tokenKey,
        ...payload,
      };
      tryTrackTokenDetailsOpened();
    },
    [tokenKey, tryTrackTokenDetailsOpened],
  );

  const handlePerpsMarketResolved = useCallback(
    (result: { hasPerpsMarket: boolean; isLoading: boolean }) => {
      perpsRef.current = result;
      tryTrackTokenDetailsOpened();
    },
    [tryTrackTokenDetailsOpened],
  );

  const handleStickyButtonsResolved = useCallback(
    (
      shown: 'both' | 'buy' | 'swap' | 'swap_earn' | 'earn_buy' | 'earn' | null,
    ) => {
      stickyButtonsRef.current = shown;
      tryTrackTokenDetailsOpened();
    },
    [tryTrackTokenDetailsOpened],
  );

  const handleCtaClicked = useCallback(() => {
    closeSourceRef.current = 'cta_clicked';
    fireClosedRef.current();
  }, []);

  return (
    <TokenDetails
      token={token}
      onMarketInsightsDisplayResolved={handleMarketInsightsDisplayResolved}
      onStickyButtonsResolved={handleStickyButtonsResolved}
      onCtaClicked={handleCtaClicked}
      onPerpsMarketResolved={handlePerpsMarketResolved}
    />
  );
};

export { TokenDetailsRouteWrapper as TokenDetails };
