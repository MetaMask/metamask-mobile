import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { selectTokenDetailsV2Enabled } from '../../../../selectors/featureFlagController/tokenDetailsV2';
import { selectTokenListLayoutV2Enabled } from '../../../../selectors/featureFlagController/tokenListLayout';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import Asset from '../../../Views/Asset';
import {
  TokenDetailsSource,
  type TokenDetailsRouteParams,
} from '../constants/constants';
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
import { TraceName, endTrace } from '../../../../util/trace';
import {
  isNetworkRampNativeTokenSupported,
  isNetworkRampSupported,
} from '../../Ramp/Aggregator/utils';
import { getRampNetworks } from '../../../../reducers/fiatOrders';
import AppConstants from '../../../../core/AppConstants';
import { getIsSwapsAssetAllowed } from '../../../Views/Asset/utils';
import ActivityHeader from '../../../Views/Asset/ActivityHeader';
import Transactions from '../../Transactions';
import MultichainTransactionsView from '../../../Views/MultichainTransactionsView/MultichainTransactionsView';
import { TransactionDetailLocation } from '../../../../core/Analytics/events/transactions';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../../component-library/components/BottomSheets/BottomSheetFooter';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button';
import { strings } from '../../../../../locales/i18n';
import { useTokenDetailsABTest } from '../hooks/useTokenDetailsABTest';
import { useRWAToken } from '../../Bridge/hooks/useRWAToken';
import { BridgeToken } from '../../Bridge/types';

export {
  TokenDetailsSource,
  type TokenDetailsRouteParams,
} from '../constants/constants';

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
 * TokenDetails component - Clean orchestrator that fetches data and sets layout.
 * All business logic is delegated to hooks and presentation to AssetOverviewContent.
 */
const TokenDetails: React.FC<{ token: TokenDetailsRouteParams }> = ({
  token,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // A/B test hook for layout selection
  const { useNewLayout } = useTokenDetailsABTest();
  const { isTokenTradingOpen } = useRWAToken();

  useEffect(() => {
    endTrace({ name: TraceName.AssetDetails });
  }, []);

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
    readyForWithdrawalTrxAsset,
    stakingRewardsTrxAsset,
    inLockPeriodTrxAsset,
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

  const chainIdForRamp = token.chainId ?? '';
  const isRampAvailable = isNativeToken
    ? isNetworkRampNativeTokenSupported(chainIdForRamp, rampNetworks)
    : isNetworkRampSupported(chainIdForRamp, rampNetworks);

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
        displayBuyButton={isRampAvailable}
        displaySwapsButton={displaySwapsButton}
        currentCurrency={currentCurrency}
        onBuy={onBuy}
        onSend={onSend}
        onReceive={onReceive}
        goToSwaps={goToSwaps}
        ///: BEGIN:ONLY_INCLUDE_IF(tron)
        isTronNative={isTronNative}
        stakedTrxAsset={stakedTrxAsset}
        readyForWithdrawalTrxAsset={readyForWithdrawalTrxAsset}
        stakingRewardsTrxAsset={stakingRewardsTrxAsset}
        inLockPeriodTrxAsset={inLockPeriodTrxAsset}
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
          location={TransactionDetailLocation.AssetDetails}
        />
      )}
      {networkModal}
      {useNewLayout &&
        !txLoading &&
        displaySwapsButton &&
        isTokenTradingOpen(token as BridgeToken) && (
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
 * Fires TOKEN_DETAILS_OPENED for both V2 and legacy Asset view.
 * Includes ab_tests property when navigating from the token list and the
 * token list layout A/B test is active.
 */
const useTokenDetailsOpenedTracking = (params: TokenDetailsRouteParams) => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { variantName, isTestActive } = useTokenDetailsABTest();
  const isTokenListV2 = useSelector(selectTokenListLayoutV2Enabled);

  useEffect(() => {
    const source = params.source ?? TokenDetailsSource.Unknown;
    const hasBalance =
      params.balance !== undefined &&
      params.balance !== null &&
      params.balance !== '0' &&
      params.balance !== '';

    const isFromTokenList =
      source === TokenDetailsSource.MobileTokenList ||
      source === TokenDetailsSource.MobileTokenListPage;

    const eventProperties = {
      source,
      chain_id: params.chainId,
      token_symbol: params.symbol,
      token_address: params.address,
      token_name: params.name,
      has_balance: hasBalance,
      // A/B test attribution — each experiment is independent
      ...((isTestActive || isFromTokenList) && {
        ab_tests: {
          ...(isTestActive && {
            assetsASSETS2493AbtestTokenDetailsLayout: variantName,
          }),
          ...(isFromTokenList && {
            assetsASSETS2621AbtestTokenListLayout: isTokenListV2 ? 'v2' : 'v1',
          }),
        },
      }),
    };
    const event = createEventBuilder(MetaMetricsEvents.TOKEN_DETAILS_OPENED)
      .addProperties(eventProperties)
      .build();
    trackEvent(event);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};

/**
 * Feature flag wrapper that toggles between new TokenDetails (V2) and legacy Asset view.
 */
const TokenDetailsFeatureFlagWrapper: React.FC<TokenDetailsProps> = (props) => {
  const isTokenDetailsV2Enabled = useSelector(selectTokenDetailsV2Enabled);

  useTokenDetailsOpenedTracking(props.route.params);

  return isTokenDetailsV2Enabled ? (
    <TokenDetails token={props.route.params} />
  ) : (
    <Asset {...props} />
  );
};

export { TokenDetailsFeatureFlagWrapper as TokenDetails };
