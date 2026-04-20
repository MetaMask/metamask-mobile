import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useSelector } from 'react-redux';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import {
  TokenDetailsSource,
  type TokenDetailsRouteParams,
} from '../constants/constants';
import { Theme } from '@metamask/design-tokens';
import { useStyles } from '../../../hooks/useStyles';
import { RootState } from '../../../../reducers';
import { selectNetworkConfigurationByChainId } from '../../../../selectors/networkController';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTokenSecurityData } from '../hooks/useTokenSecurityData';
import { isCaipAssetType, type CaipAssetType } from '@metamask/utils';
import { formatAddressToAssetId } from '@metamask/bridge-controller';
import { TokenDetailsInlineHeader } from '../components/TokenDetailsInlineHeader';
import AssetOverviewContent from '../components/AssetOverviewContent';
import { useTokenPrice } from '../hooks/useTokenPrice';
import { useTokenBalance } from '../hooks/useTokenBalance';
import { useTokenActions } from '../hooks/useTokenActions';
import { useTokenTransactions } from '../hooks/useTokenTransactions';
import { selectPerpsEnabledFlag } from '../../Perps';
import { usePerpsMarketForAsset } from '../../Perps/hooks/usePerpsMarketForAsset';
import { TraceName, endTrace } from '../../../../util/trace';
import ActivityHeader from '../../../Views/Asset/ActivityHeader';
import Transactions from '../../Transactions';
import MultichainTransactionsView from '../../../Views/MultichainTransactionsView/MultichainTransactionsView';
import { TransactionDetailLocation } from '../../../../core/Analytics/events/transactions';
import TokenDetailsStickyFooter from '../components/TokenDetailsStickyFooter';
import { MarketInsightsDisclaimerBottomSheet } from '../../MarketInsights';

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
}> = ({ token, onMarketInsightsDisplayResolved, onStickyButtonsResolved }) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const [isInsightsDisclaimerVisible, setIsInsightsDisclaimerVisible] =
    useState(false);

  const caip19AssetId = useMemo((): CaipAssetType | null => {
    try {
      if (isCaipAssetType(token.address)) {
        return token.address as CaipAssetType;
      }
      if (!token.chainId) return null;
      return (formatAddressToAssetId(token.address, token.chainId) ??
        null) as CaipAssetType | null;
    } catch {
      return null;
    }
  }, [token.address, token.chainId]);

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
  } = useTokenPrice({ token });

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

  const { onBuy, onSend, onReceive } = useTokenActions({
    token,
    networkName,
    currentTokenBalance: balance,
  });

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
        timePeriod={timePeriod}
        setTimePeriod={setTimePeriod}
        chartNavigationButtons={chartNavigationButtons}
        isPerpsEnabled={isPerpsEnabled}
        currentCurrency={currentCurrency}
        onBuy={onBuy}
        onSend={onSend}
        onReceive={onReceive}
        onMarketInsightsDisplayResolved={onMarketInsightsDisplayResolved}
        onMarketInsightsDisclaimerPress={() =>
          setIsInsightsDisclaimerVisible(true)
        }
        securityData={securityData}
        isSecurityDataLoading={isSecurityDataLoading}
        hasSecurityDataError={Boolean(securityDataError)}
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

  const renderLoader = () => (
    <View style={styles.loader}>
      <ActivityIndicator style={styles.loader} size="small" />
    </View>
  );
  return (
    <View style={styles.wrapper}>
      <TokenDetailsInlineHeader onBackPress={() => navigation.goBack()} />

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
      {!txLoading && (
        <TokenDetailsStickyFooter
          token={token}
          securityData={securityData}
          balanceFiatUsd={balanceFiatUsd}
          networkName={networkName}
          currentTokenBalance={balance}
          onStickyButtonsResolved={onStickyButtonsResolved}
        />
      )}
      {isInsightsDisclaimerVisible && (
        <MarketInsightsDisclaimerBottomSheet
          onClose={() => setIsInsightsDisclaimerVisible(false)}
        />
      )}
    </View>
  );
};

/**
 * TokenDetailsRouteWrapper screen
 * Reads token from React Navigation route.params and renders TokenDetails.
 */
export const TokenDetailsRouteWrapper: React.FC = () => {
  const route = useRoute();
  const token = route.params as TokenDetailsRouteParams;

  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  const { hasPerpsMarket, isLoading: isPerpsMarketLoading } =
    usePerpsMarketForAsset(isPerpsEnabled ? token.symbol : null);

  // undefined = not yet resolved; null = footer won't render; string = resolved value
  const [resolvedStickyButtons, setResolvedStickyButtons] = useState<
    'both' | 'buy' | 'swap' | null | undefined
  >(undefined);

  const trackTokenDetailsOpened = useTokenDetailsOpenedTracking(token);

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

  return (
    <TokenDetails
      token={token}
      onMarketInsightsDisplayResolved={handleMarketInsightsDisplayResolved}
      onStickyButtonsResolved={setResolvedStickyButtons}
    />
  );
};

export { TokenDetailsRouteWrapper as TokenDetails };
