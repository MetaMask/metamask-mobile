import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { selectTokenDetailsV2Enabled } from '../../../../selectors/featureFlagController/tokenDetailsV2';
import { useTokenDetailsABTest } from '../hooks/useTokenDetailsABTest';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import Asset from '../../../Views/Asset';
import { TokenI } from '../../Tokens/types';
import { Theme } from '@metamask/design-tokens';
import { useStyles } from '../../../hooks/useStyles';
import { RootState } from '../../../../reducers';
import { selectNetworkConfigurationByChainId } from '../../../../selectors/networkController';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import { isMainnetByChainId } from '../../../../util/networks';
import useBlockExplorer from '../../../hooks/useBlockExplorer';
import { TokenDetailsInlineHeader } from '../components/TokenDetailsInlineHeader';
import AssetOverviewContent from '../components/AssetOverviewContent';
import { useTokenPrice } from '../hooks/useTokenPrice';
import { useTokenBalance } from '../hooks/useTokenBalance';
import { useTokenActions } from '../hooks/useTokenActions';
import { useTokenTransactions } from '../hooks/useTokenTransactions';
import { selectPerpsEnabledFlag } from '../../Perps';
import { selectMerklCampaignClaimingEnabledFlag } from '../../Earn/selectors/featureFlags';
import { TraceName, endTrace } from '../../../../util/trace';
import {
  isNetworkRampNativeTokenSupported,
  isNetworkRampSupported,
} from '../../Ramp/Aggregator/utils';
import { getRampNetworks } from '../../../../reducers/fiatOrders';
import {
  selectDepositActiveFlag,
  selectDepositMinimumVersionFlag,
} from '../../../../selectors/featureFlagController/deposit';
import { getVersion } from 'react-native-device-info';
import compareVersions from 'compare-versions';
import AppConstants from '../../../../core/AppConstants';
import { getIsSwapsAssetAllowed } from '../../../Views/Asset/utils';
import ActivityHeader from '../../../Views/Asset/ActivityHeader';
import Transactions from '../../Transactions';
import MultichainTransactionsView from '../../../Views/MultichainTransactionsView/MultichainTransactionsView';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../../component-library/components/BottomSheets/BottomSheetFooter';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button';
import { strings } from '../../../../../locales/i18n';

/**
 * Valid source values for TOKEN_DETAILS_OPENED event tracking
 */
export type TokenDetailsSource =
  | 'mobile-token-list' // Home page token list (default view)
  | 'mobile-token-list-page' // Full page token list view
  | 'trending' // Trending tokens flow
  | 'swap' // Swap/Bridge token selector
  | 'unknown'; // Fallback when source can't be determined

interface TokenDetailsRouteParams extends TokenI {
  /**
   * Source from which the user navigated to token details
   * Used for analytics tracking
   */
  source?: TokenDetailsSource;
  /**
   * @deprecated Use `source: 'trending'` instead
   * Legacy flag from trending flow navigation
   */
  isFromTrending?: boolean;
  scrollToMerklRewards?: boolean;
}

interface TokenDetailsProps {
  route: {
    params: TokenDetailsRouteParams;
  };
}

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
    bottomSheetFooter: {
      backgroundColor: colors.background.default,
      paddingHorizontal: 16,
      paddingTop: 16,
    },
  });
};

/**
 * Determines the source from which the user navigated to token details
 * Checks explicit source param first, then infers from legacy flags
 */
const getNavigationSource = (params: TokenDetailsRouteParams): TokenDetailsSource => {
  // Prefer explicit source if provided
  if (params.source) {
    return params.source;
  }
  // Infer from legacy flags
  if (params.isFromTrending) {
    return 'trending';
  }
  // Default to mobile-token-list (home page) - the most common entry point
  return 'mobile-token-list';
};

/**
 * TokenDetails component - Clean orchestrator that fetches data and sets layout.
 * All business logic is delegated to hooks and presentation to AssetOverviewContent.
 */
const TokenDetails: React.FC<{ token: TokenDetailsRouteParams }> = ({ token }) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { trackEvent, createEventBuilder } = useMetrics();

  // A/B test hook for layout selection
  const { useNewLayout, variantName, isTestActive } = useTokenDetailsABTest();

  // Track page view once per token
  const hasTrackedPageView = useRef(false);

  useEffect(() => {
    endTrace({ name: TraceName.AssetDetails });
  }, []);

  // Determine source for analytics (where user navigated from)
  const navigationSource = getNavigationSource(token);

  // Track TOKEN_DETAILS_OPENED event on mount
  // This ensures the event fires regardless of entry point (token list, trending, swap, etc.)
  useEffect(() => {
    if (hasTrackedPageView.current) return;
    hasTrackedPageView.current = true;

    // Determine if user has a balance for this token
    const hasBalance = Boolean(token.balance && parseFloat(token.balance) > 0);

    // 🔧 DEBUG: Log event properties for testing - REMOVE BEFORE COMMIT!
    console.log('🔍 [A/B Test] TOKEN_DETAILS_OPENED event fired:', {
      source: navigationSource,
      chain_id: token.chainId,
      token_symbol: token.symbol,
      has_balance: hasBalance,
      isTestActive,
      variantName,
      useNewLayout,
      ab_tests: isTestActive
        ? { token_details_layout: variantName }
        : 'N/A (test not active)',
    });

    trackEvent(
      createEventBuilder(MetaMetricsEvents.TOKEN_DETAILS_OPENED)
        .addProperties({
          source: navigationSource,
          chain_id: token.chainId,
          token_symbol: token.symbol,
          has_balance: hasBalance,
          // A/B test attribution
          ...(isTestActive && {
            ab_tests: { token_details_layout: variantName },
          }),
        })
        .build(),
    );
  }, [
    navigationSource,
    token.chainId,
    token.symbol,
    token.balance,
    isTestActive,
    variantName,
    trackEvent,
    createEventBuilder,
  ]);

  const networkConfigurationByChainId = useSelector((state: RootState) =>
    selectNetworkConfigurationByChainId(state, token.chainId),
  );
  const networkName = networkConfigurationByChainId?.name;

  const isNativeToken = token.isNative ?? token.isETH;
  const isMainnet = isMainnetByChainId(token.chainId);
  const { getBlockExplorerUrl } = useBlockExplorer(token.chainId);

  const shouldShowMoreOptionsInNavBar =
    isMainnet ||
    !isNativeToken ||
    (isNativeToken && getBlockExplorerUrl(token.address, token.chainId));

  const openAssetOptions = () => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: 'AssetOptions',
      params: {
        isNativeCurrency: isNativeToken,
        address: token.address,
        chainId: token.chainId,
        asset: token,
      },
    });
  };

  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  const isMerklCampaignClaimingEnabled = useSelector(
    selectMerklCampaignClaimingEnabledFlag,
  );

  const {
    currentPrice,
    priceDiff,
    comparePrice,
    prices,
    isLoading,
    timePeriod,
    setTimePeriod,
    chartNavigationButtons,
    currentCurrency,
  } = useTokenPrice({ token });

  const {
    balance,
    fiatBalance,
    tokenFormattedBalance,
    ///: BEGIN:ONLY_INCLUDE_IF(tron)
    isTronNative,
    stakedTrxAsset,
    ///: END:ONLY_INCLUDE_IF
  } = useTokenBalance(token);

  const {
    onBuy,
    onSend,
    onReceive,
    goToSwaps,
    handleBuyPress,
    handleSellPress,
    networkModal,
  } = useTokenActions({
    token,
    networkName,
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

  const isSwapsAssetAllowed = getIsSwapsAssetAllowed({
    asset: {
      isETH: token.isETH ?? false,
      isNative: token.isNative ?? false,
      address: token.address ?? '',
      chainId: token.chainId ?? '',
    },
  });
  const displaySwapsButton = isSwapsAssetAllowed && AppConstants.SWAPS.ACTIVE;

  const rampNetworks = useSelector(getRampNetworks);
  const depositMinimumVersionFlag = useSelector(
    selectDepositMinimumVersionFlag,
  );
  const depositActiveFlag = useSelector(selectDepositActiveFlag);

  const isDepositEnabled = (() => {
    if (!depositMinimumVersionFlag) return false;
    const currentVersion = getVersion();
    return (
      depositActiveFlag &&
      compareVersions.compare(currentVersion, depositMinimumVersionFlag, '>=')
    );
  })();

  const chainIdForRamp = token.chainId ?? '';
  const isRampAvailable = isNativeToken
    ? isNetworkRampNativeTokenSupported(chainIdForRamp, rampNetworks)
    : isNetworkRampSupported(chainIdForRamp, rampNetworks);

  const displayBuyButton = isDepositEnabled || isRampAvailable;

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
        isMerklCampaignClaimingEnabled={isMerklCampaignClaimingEnabled}
        displayBuyButton={displayBuyButton}
        displaySwapsButton={displaySwapsButton}
        currentCurrency={currentCurrency}
        onBuy={onBuy}
        onSend={onSend}
        onReceive={onReceive}
        goToSwaps={goToSwaps}
        ///: BEGIN:ONLY_INCLUDE_IF(tron)
        isTronNative={isTronNative}
        stakedTrxAsset={stakedTrxAsset}
        ///: END:ONLY_INCLUDE_IF
      />
      <ActivityHeader
        asset={{
          ...token,
          hasBalanceError: token.hasBalanceError ?? false,
        }}
      />
    </>
  );

  const renderLoader = () => (
    <View style={styles.loader}>
      <ActivityIndicator style={styles.loader} size="small" />
    </View>
  );
  return (
    <View style={styles.wrapper}>
      <TokenDetailsInlineHeader
        title={token.symbol}
        networkName={networkName ?? ''}
        onBackPress={() => navigation.goBack()}
        onOptionsPress={
          shouldShowMoreOptionsInNavBar && !useNewLayout
            ? openAssetOptions
            : undefined
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
        />
      )}
      {networkModal}
      {useNewLayout && !txLoading && displaySwapsButton && (
        <BottomSheetFooter
          style={{
            ...styles.bottomSheetFooter,
            paddingBottom: insets.bottom + 6,
          }}
          buttonPropsArray={[
            {
              variant: ButtonVariants.Primary,
              label: strings('asset_overview.buy_button'),
              size: ButtonSize.Lg,
              onPress: handleBuyPress,
            },
            // Only show Sell button if user has balance of this token
            ...(balance && parseFloat(String(balance)) > 0
              ? [
                  {
                    variant: ButtonVariants.Primary,
                    label: strings('asset_overview.sell_button'),
                    size: ButtonSize.Lg,
                    onPress: handleSellPress,
                  },
                ]
              : []),
          ]}
          buttonsAlignment={ButtonsAlignment.Horizontal}
        />
      )}
    </View>
  );
};

/**
 * Feature flag wrapper that toggles between new TokenDetails (V2) and legacy Asset view.
 */
const TokenDetailsFeatureFlagWrapper: React.FC<TokenDetailsProps> = (props) => {
  const isTokenDetailsV2Enabled = useSelector(selectTokenDetailsV2Enabled);

  return isTokenDetailsV2Enabled ? (
    <TokenDetails token={props.route.params as TokenDetailsRouteParams} />
  ) : (
    <Asset {...props} />
  );
};

export { TokenDetailsFeatureFlagWrapper as TokenDetails };
