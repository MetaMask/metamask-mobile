import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { selectTokenDetailsV2Enabled } from '../../../../selectors/featureFlagController/tokenDetailsV2';
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
import { AssetInlineHeader } from '../components/AssetInlineHeader';
import AssetOverviewContent from '../components/AssetOverviewContent';
import { useTokenPrice } from '../hooks/useTokenPrice';
import { useTokenBalance } from '../hooks/useTokenBalance';
import { useAssetBuyability } from '../hooks/useAssetBuyability';
import { useAssetActions } from '../hooks/useAssetActions';
import { useTokenTransactions } from '../hooks/useTokenTransactions';
import { selectPerpsEnabledFlag } from '../../Perps';
import { selectMerklCampaignClaimingEnabledFlag } from '../../Earn/selectors/featureFlags';
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
import { selectSupportedSwapTokenAddressesForChainId } from '../../../../selectors/tokenSearchDiscoveryDataController';
import { getIsSwapsAssetAllowed } from '../../../Views/Asset/utils';
import ActivityHeader from '../../../Views/Asset/ActivityHeader';
import Transactions from '../../Transactions';
import MultichainTransactionsView from '../../../Views/MultichainTransactionsView/MultichainTransactionsView';

interface TokenDetailsProps {
  route: {
    params: TokenI;
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
  });
};

/**
 * TokenDetails component - Clean orchestrator that fetches data and sets layout.
 * All business logic is delegated to hooks and presentation to AssetOverviewContent.
 */
const TokenDetails: React.FC<{ token: TokenI }> = ({ token }) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();

  // Network configuration
  const networkConfigurationByChainId = useSelector((state: RootState) =>
    selectNetworkConfigurationByChainId(state, token.chainId),
  );
  const networkName = networkConfigurationByChainId?.name;

  // Header options logic
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

  // Feature flags
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  const isMerklCampaignClaimingEnabled = useSelector(
    selectMerklCampaignClaimingEnabledFlag,
  );

  // Price data hook
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
  } = useTokenPrice({ asset: token });

  // Balance data hook
  const {
    balance,
    mainBalance,
    secondaryBalance,
    ///: BEGIN:ONLY_INCLUDE_IF(tron)
    isTronNative,
    stakedTrxAsset,
    ///: END:ONLY_INCLUDE_IF
  } = useTokenBalance(token);

  // Buyability check
  const { isAssetBuyable } = useAssetBuyability(token);

  // Use actions hook for all action handlers
  const { onBuy, onSend, onReceive, goToSwaps, networkModal } = useAssetActions(
    {
      asset: token,
      networkName,
    },
  );

  // Use transactions hook
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

  // Display flags for buttons
  const searchDiscoverySwapsTokens = useSelector((state: RootState) =>
    selectSupportedSwapTokenAddressesForChainId(state, token.chainId as Hex),
  );

  // Ensure asset has required properties for swap check
  const assetForSwapCheck = {
    isETH: token.isETH ?? false,
    isNative: token.isNative ?? false,
    address: token.address ?? '',
    chainId: token.chainId ?? '',
  };
  const isSwapsAssetAllowed = getIsSwapsAssetAllowed({
    asset: assetForSwapCheck,
    searchDiscoverySwapsTokens,
  });
  const displaySwapsButton = isSwapsAssetAllowed && AppConstants.SWAPS.ACTIVE;

  // Deposit/Ramp availability
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

  // Render the header content (AssetOverview + ActivityHeader)
  const renderHeader = () => (
    <>
      <AssetOverviewContent
        asset={token}
        balance={balance}
        mainBalance={mainBalance}
        secondaryBalance={secondaryBalance}
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
        isAssetBuyable={isAssetBuyable}
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

  // Render loader while transactions are loading
  const renderLoader = () => (
    <View style={styles.loader}>
      <ActivityIndicator style={styles.loader} size="small" />
    </View>
  );

  return (
    <View style={styles.wrapper}>
      <AssetInlineHeader
        title={token.symbol}
        networkName={networkName ?? ''}
        onBackPress={() => navigation.goBack()}
        onOptionsPress={
          shouldShowMoreOptionsInNavBar ? openAssetOptions : () => undefined
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
    </View>
  );
};

/**
 * Feature flag wrapper that toggles between new TokenDetails (V2) and legacy Asset view.
 */
const TokenDetailsFeatureFlagWrapper: React.FC<TokenDetailsProps> = (props) => {
  // const isTokenDetailsV2Enabled = useSelector(selectTokenDetailsV2Enabled);
  const isTokenDetailsV2Enabled = true;

  return isTokenDetailsV2Enabled ? (
    <TokenDetails token={props.route.params} />
  ) : (
    <Asset {...props} />
  );
};

export { TokenDetailsFeatureFlagWrapper as TokenDetails };
