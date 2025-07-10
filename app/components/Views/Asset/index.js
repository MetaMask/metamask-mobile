import { swapsUtils } from '@metamask/swaps-controller/';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import {
  ActivityIndicator,
  InteractionManager,
  StyleSheet,
  View,
} from 'react-native';
import { connect } from 'react-redux';
import Routes from '../../../constants/navigation/Routes';
import {
  TX_CONFIRMED,
  TX_PENDING,
  TX_SIGNED,
  TX_SUBMITTED,
  TX_UNAPPROVED,
} from '../../../constants/transaction';
import AppConstants from '../../../core/AppConstants';
import {
  getFeatureFlagChainId,
  setSwapsLiveness,
  swapsTokensMultiChainObjectSelector,
  swapsTokensObjectSelector,
} from '../../../reducers/swaps';
import {
  selectChainId,
  selectNetworkClientId,
  selectNetworkConfigurations,
  selectRpcUrl,
} from '../../../selectors/networkController';
import { selectTokens } from '../../../selectors/tokensController';
import { sortTransactions } from '../../../util/activity';
import {
  areAddressesEqual,
  safeToChecksumAddress,
} from '../../../util/address';
import {
  findBlockExplorerForNonEvmChainId,
  findBlockExplorerForRpc,
  isMainnetByChainId,
  isPortfolioViewEnabled,
} from '../../../util/networks';
import { mockTheme, ThemeContext } from '../../../util/theme';
import { addAccountTimeFlagFilter } from '../../../util/transactions';
import AssetOverview from '../../UI/AssetOverview';
import { getNetworkNavbarOptions } from '../../UI/Navbar';
import { isSwapsAllowed } from '../../UI/Swaps/utils';
import Transactions from '../../UI/Transactions';
import ActivityHeader from './ActivityHeader';
import {
  isNetworkRampNativeTokenSupported,
  isNetworkRampSupported,
} from '../../UI/Ramp/Aggregator/utils';
import { getRampNetworks } from '../../../reducers/fiatOrders';
import Device from '../../../util/device';
import {
  selectConversionRate,
  selectCurrentCurrency,
} from '../../../selectors/currencyRateController';
import { selectSelectedInternalAccount } from '../../../selectors/accountsController';
import { updateIncomingTransactions } from '../../../util/transaction-controller';
import { withMetricsAwareness } from '../../../components/hooks/useMetrics';
import { store } from '../../../store';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import {
  selectSwapsTransactions,
  selectTransactions,
} from '../../../selectors/transactionController';
import Logger from '../../../util/Logger';
import { TOKEN_CATEGORY_HASH } from '../../UI/TransactionElement/utils';
import { selectSupportedSwapTokenAddressesForChainId } from '../../../selectors/tokenSearchDiscoveryDataController';
import { isNonEvmChainId } from '../../../core/Multichain/utils';
import { isBridgeAllowed } from '../../UI/Bridge/utils';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { selectSolanaAccountTransactions } from '../../../selectors/multichain';
import { isEvmAccountType } from '@metamask/keyring-api';
///: END:ONLY_INCLUDE_IF
import { getIsSwapsAssetAllowed, getSwapsIsLive } from './utils';
import MultichainTransactionsView from '../MultichainTransactionsView/MultichainTransactionsView';

const createStyles = (colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    assetOverviewWrapper: {
      height: 280,
    },
    loader: {
      backgroundColor: colors.background.default,
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      backgroundColor: colors.background.default,
      paddingBottom: 32,
      elevation: 2,
      paddingTop: 16,
      paddingHorizontal: 16,
    },
    footerBorder: Device.isAndroid()
      ? {
          borderTopWidth: 1,
          borderColor: colors.border.muted,
        }
      : {
          shadowColor: colors.overlay.default,
          shadowOpacity: 0.3,
          shadowOffset: { height: 4, width: 0 },
          shadowRadius: 8,
        },
    footerButton: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: '50%',
    },
    buyButton: {
      marginRight: 8,
    },
    swapButton: {
      marginLeft: 8,
    },
    singleButton: {
      flexBasis: '100%',
      marginRight: 0,
      marginLeft: 0,
    },
  });

/**
 * View that displays a specific asset (Token or ETH)
 * including the overview (Amount, Balance, Symbol, Logo)
 * and also the transaction list
 */
class Asset extends PureComponent {
  static propTypes = {
    /**
    /* navigation object required to access the props
    /* passed by the parent component
    */
    navigation: PropTypes.object,
    /**
    /* conversion rate of ETH - FIAT
    */
    conversionRate: PropTypes.any,
    /**
    /* Selected currency
    */
    currentCurrency: PropTypes.string,
    /**
    /* InternalAccount object required to get account name
    */
    selectedInternalAccount: PropTypes.object,
    /**
     * The chain ID for the current selected network
     */
    chainId: PropTypes.string,
    /**
     * An array that represents the user transactions
     */
    transactions: PropTypes.array,
    /**
     * Array of ERC20 assets
     */
    tokens: PropTypes.array,
    swapsIsLive: PropTypes.bool,
    swapsTokens: PropTypes.object,
    searchDiscoverySwapsTokens: PropTypes.array,
    swapsTransactions: PropTypes.object,
    /**
     * Object that represents the current route info like params passed to it
     */
    route: PropTypes.object,
    rpcUrl: PropTypes.string,
    networkConfigurations: PropTypes.object,
    /**
     * Boolean that indicates if network is supported to buy
     */
    isNetworkRampSupported: PropTypes.bool,
    /**
     * Boolean that indicates if native token is supported to buy
     */
    isNetworkBuyNativeTokenSupported: PropTypes.bool,
    /**
     * Function to set the swaps liveness
     */
    setLiveness: PropTypes.func,
  };

  state = {
    refreshing: false,
    loading: false,
    transactionsUpdated: false,
    submittedTxs: [],
    confirmedTxs: [],
    transactions: [],
  };

  txs = [];
  txsPending = [];
  isNormalizing = false;
  chainId = '';
  filter = undefined;
  navSymbol = undefined;
  navAddress = undefined;
  selectedAddress = toChecksumHexAddress(
    this.props.selectedInternalAccount?.address,
  );

  updateNavBar = (contentOffset = 0) => {
    const {
      route: { params },
      navigation,
      route,
      chainId,
      rpcUrl,
      networkConfigurations,
    } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    const isNativeToken = route.params.isNative ?? route.params.isETH;
    const isMainnet = isMainnetByChainId(chainId);
    const blockExplorer = isNonEvmChainId(chainId)
      ? findBlockExplorerForNonEvmChainId(chainId)
      : findBlockExplorerForRpc(rpcUrl, networkConfigurations);

    const shouldShowMoreOptionsInNavBar =
      isMainnet || !isNativeToken || (isNativeToken && blockExplorer);
    const asset = navigation && params;
    const currentNetworkName =
      this.props.networkConfigurations[asset.chainId]?.name;
    navigation.setOptions(
      getNetworkNavbarOptions(
        route.params?.symbol ?? '',
        false,
        navigation,
        colors,
        // TODO: remove !isNonEvmChainId check once bottom sheet options are fixed for non-EVM chains
        shouldShowMoreOptionsInNavBar && !isNonEvmChainId(chainId)
          ? () =>
              navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
                screen: 'AssetOptions',
                params: {
                  isNativeCurrency: isNativeToken,
                  address: route.params?.address,
                  chainId: route.params?.chainId,
                  asset,
                },
              })
          : undefined,
        true,
        contentOffset,
        currentNetworkName,
      ),
    );
  };

  onScrollThroughContent = (contentOffset = 0) => {
    this.updateNavBar(contentOffset);
  };

  checkLiveness = async (chainId) => {
    try {
      const featureFlags = await swapsUtils.fetchSwapsFeatureFlags(
        getFeatureFlagChainId(chainId),
        AppConstants.SWAPS.CLIENT_ID,
      );
      this.props.setLiveness(chainId, featureFlags);
    } catch (error) {
      Logger.error(error, 'Swaps: error while fetching swaps liveness');
      this.props.setLiveness(chainId, null);
    }
  };

  componentDidMount() {
    this.updateNavBar();

    const tokenChainId = this.props.route?.params?.chainId;
    if (tokenChainId) {
      this.checkLiveness(tokenChainId);
    }

    InteractionManager.runAfterInteractions(() => {
      this.normalizeTransactions();
      this.mounted = true;
    });
    this.navSymbol = (this.props.route.params?.symbol ?? '').toLowerCase();
    this.navAddress = (this.props.route.params?.address ?? '').toLowerCase();

    if (this.navSymbol.toUpperCase() !== 'ETH' && this.navAddress !== '') {
      this.filter = this.noEthFilter;
    } else {
      this.filter = this.ethFilter;
    }
  }

  componentDidUpdate(prevProps) {
    if (
      prevProps.chainId !== this.props.chainId ||
      prevProps.selectedInternalAccount.address !==
        this.props.selectedInternalAccount?.address
    ) {
      this.showLoaderAndNormalize();
    } else {
      this.normalizeTransactions();
    }
  }

  showLoaderAndNormalize() {
    this.setState({ loading: true }, () => {
      this.normalizeTransactions();
    });
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  didTxStatusesChange = (newTxsPending) =>
    this.txsPending.length !== newTxsPending.length;

  ethFilter = (tx) => {
    const { networkId } = store.getState().inpageProvider;
    const { chainId } = this.props;
    const {
      txParams: { from, to },
      isTransfer,
      transferInformation,
      type,
    } = tx;

    if (
      (areAddressesEqual(from, this.selectedAddress) ||
        areAddressesEqual(to, this.selectedAddress)) &&
      (chainId === tx.chainId || (!tx.chainId && networkId === tx.networkID)) &&
      tx.status !== 'unapproved'
    ) {
      if (TOKEN_CATEGORY_HASH[type]) {
        return false;
      }
      if (isTransfer) {
        return this.props.tokens.find(({ address }) =>
          areAddressesEqual(address, transferInformation.contractAddress),
        );
      }

      return true;
    }
    return false;
  };

  noEthFilter = (tx) => {
    const { networkId } = store.getState().inpageProvider;

    const { chainId, swapsTransactions } = this.props;
    const {
      txParams: { to, from },
      isTransfer,
      transferInformation,
    } = tx;
    if (
      (areAddressesEqual(from, this.selectedAddress) ||
        areAddressesEqual(to, this.selectedAddress)) &&
      (chainId === tx.chainId || (!tx.chainId && networkId === tx.networkID)) &&
      tx.status !== 'unapproved'
    ) {
      if (to?.toLowerCase() === this.navAddress) return true;
      if (isTransfer)
        return (
          this.navAddress === transferInformation.contractAddress.toLowerCase()
        );
      if (
        swapsTransactions[tx.id] &&
        (to?.toLowerCase() === swapsUtils.getSwapsContractAddress(chainId) ||
          to?.toLowerCase() === this.navAddress)
      ) {
        const { destinationToken, sourceToken } = swapsTransactions[tx.id];
        return (
          destinationToken.address === this.navAddress ||
          sourceToken.address === this.navAddress
        );
      }
    }
    return false;
  };

  normalizeTransactions() {
    if (this.isNormalizing) return;
    let accountAddedTimeInsertPointFound = false;
    const { selectedInternalAccount } = this.props;
    const addedAccountTime = selectedInternalAccount?.metadata.importTime;
    this.isNormalizing = true;

    let submittedTxs = [];
    const newPendingTxs = [];
    const confirmedTxs = [];
    const submittedNonces = [];

    const { chainId, transactions, route } = this.props;

    const isNonEvmAsset =
      route?.params?.chainId && isNonEvmChainId(route.params.chainId);

    if (transactions.length) {
      if (isNonEvmAsset) {
        const filteredTransactions = transactions.map((tx, index) => {
          const mutableTx = { ...tx };

          if (
            index === transactions.length - 1 &&
            !accountAddedTimeInsertPointFound
          ) {
            mutableTx.insertImportTime = true;
          }

          return mutableTx;
        });

        if (
          (this.txs.length === 0 && !this.state.transactionsUpdated) ||
          this.txs.length !== filteredTransactions.length ||
          this.chainId !== chainId
        ) {
          this.txs = filteredTransactions;
          this.txsPending = [];
          this.setState({
            transactionsUpdated: true,
            loading: false,
            transactions: filteredTransactions,
            submittedTxs: [],
            confirmedTxs: filteredTransactions,
          });
        }
      } else {
        const mutableTransactions = transactions.map((tx) => ({ ...tx }));

        const sortedTransactions = sortTransactions(mutableTransactions).filter(
          (tx, index, self) =>
            self.findIndex((_tx) => _tx.id === tx.id) === index,
        );
        const filteredTransactions = sortedTransactions.filter((tx) => {
          const filterResult = this.filter(tx);
          if (filterResult) {
            tx.insertImportTime = addAccountTimeFlagFilter(
              tx,
              addedAccountTime,
              accountAddedTimeInsertPointFound,
            );
            if (tx.insertImportTime) accountAddedTimeInsertPointFound = true;

            switch (tx.status) {
              case TX_SUBMITTED:
              case TX_SIGNED:
              case TX_UNAPPROVED:
                submittedTxs.push(tx);
                return false;
              case TX_PENDING:
                newPendingTxs.push(tx);
                break;
              case TX_CONFIRMED:
                confirmedTxs.push(tx);
                break;
            }
          }
          return filterResult;
        });

        submittedTxs = submittedTxs.filter(({ txParams: { from, nonce } }) => {
          if (!areAddressesEqual(from, this.selectedAddress)) {
            return false;
          }
          const alreadySubmitted = submittedNonces.includes(nonce);
          const alreadyConfirmed = confirmedTxs.find(
            (confirmedTransaction) =>
              areAddressesEqual(
                safeToChecksumAddress(confirmedTransaction.txParams.from),
                this.selectedAddress,
              ) && confirmedTransaction.txParams.nonce === nonce,
          );
          if (alreadyConfirmed) {
            return false;
          }
          submittedNonces.push(nonce);
          return !alreadySubmitted;
        });

        // If the account added "Insert Point" is not found add it to the last transaction
        if (
          !accountAddedTimeInsertPointFound &&
          filteredTransactions &&
          filteredTransactions.length
        ) {
          filteredTransactions[
            filteredTransactions.length - 1
          ].insertImportTime = true;
        }
        // To avoid extra re-renders we want to set the new txs only when
        // there's a new tx in the history or the status of one of the existing txs changed
        if (
          (this.txs.length === 0 && !this.state.transactionsUpdated) ||
          this.txs.length !== filteredTransactions.length ||
          this.chainId !== chainId ||
          this.didTxStatusesChange(newPendingTxs)
        ) {
          this.txs = filteredTransactions;
          this.txsPending = newPendingTxs;
          this.setState({
            transactionsUpdated: true,
            loading: false,
            transactions: filteredTransactions,
            submittedTxs,
            confirmedTxs,
          });
        }
      }
    } else if (!this.state.transactionsUpdated) {
      this.setState({ transactionsUpdated: true, loading: false });
    }
    this.isNormalizing = false;
    this.chainId = chainId;
  }

  renderLoader = () => {
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return (
      <View style={styles.loader}>
        <ActivityIndicator style={styles.loader} size="small" />
      </View>
    );
  };

  onRefresh = async () => {
    this.setState({ refreshing: true });

    await updateIncomingTransactions();

    this.setState({ refreshing: false });
  };

  render = () => {
    const {
      loading,
      transactions,
      submittedTxs,
      confirmedTxs,
      transactionsUpdated,
    } = this.state;
    const {
      route: { params },
      navigation,
      conversionRate,
      currentCurrency,
      chainId,
    } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);
    const asset = navigation && params;
    const isSwapsFeatureLive = this.props.swapsIsLive;
    const isSwapsNetworkAllowed = isPortfolioViewEnabled()
      ? isSwapsAllowed(asset.chainId)
      : isSwapsAllowed(chainId);

    const isSwapsAssetAllowed = getIsSwapsAssetAllowed({
      asset,
      searchDiscoverySwapsTokens: this.props.searchDiscoverySwapsTokens,
      swapsTokens: this.props.swapsTokens,
    });

    const displaySwapsButton =
      isSwapsNetworkAllowed && isSwapsAssetAllowed && AppConstants.SWAPS.ACTIVE;

    const displayBridgeButton = isPortfolioViewEnabled()
      ? isBridgeAllowed(asset.chainId)
      : isBridgeAllowed(chainId);

    const displayBuyButton = asset.isETH
      ? this.props.isNetworkBuyNativeTokenSupported
      : this.props.isNetworkRampSupported;

    const isNonEvmAsset = asset.chainId && isNonEvmChainId(asset.chainId);

    return (
      <View style={styles.wrapper}>
        {loading ? (
          this.renderLoader()
        ) : isNonEvmAsset ? (
          // For non-EVM assets, render multichain transactions
          <MultichainTransactionsView
            header={
              <>
                <AssetOverview
                  asset={asset}
                  displayBuyButton={displayBuyButton}
                  displaySwapsButton={displaySwapsButton}
                  displayBridgeButton={displayBridgeButton}
                  swapsIsLive={isSwapsFeatureLive}
                  networkName={
                    this.props.networkConfigurations[asset.chainId]?.name
                  }
                />
                <ActivityHeader asset={asset} />
              </>
            }
            transactions={transactions}
            navigation={navigation}
            selectedAddress={this.selectedAddress}
            chainId={asset.chainId}
            enableRefresh
            showDisclaimer
            onScroll={this.onScrollThroughContent}
          />
        ) : (
          // For EVM assets, use the existing Transactions component
          <Transactions
            header={
              <>
                <AssetOverview
                  asset={asset}
                  displayBuyButton={displayBuyButton}
                  displaySwapsButton={displaySwapsButton}
                  displayBridgeButton={displayBridgeButton}
                  swapsIsLive={isSwapsFeatureLive}
                  networkName={
                    this.props.networkConfigurations[asset.chainId]?.name
                  }
                />
                <ActivityHeader asset={asset} />
              </>
            }
            assetSymbol={asset.symbol}
            navigation={navigation}
            transactions={transactions}
            submittedTransactions={submittedTxs}
            confirmedTransactions={confirmedTxs}
            selectedAddress={this.selectedAddress}
            conversionRate={conversionRate}
            currentCurrency={currentCurrency}
            networkType={chainId}
            loading={!transactionsUpdated}
            headerHeight={280}
            onScrollThroughContent={this.onScrollThroughContent}
            tokenChainId={asset.chainId}
          />
        )}
      </View>
    );
  };
}

Asset.contextType = ThemeContext;

let cachedFilteredTransactions = null;
let cacheKey = null;

const mapStateToProps = (state, { route }) => {
  const selectedInternalAccount = selectSelectedInternalAccount(state);
  const evmTransactions = selectTransactions(state);

  let allTransactions = evmTransactions;
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  if (
    selectedInternalAccount &&
    !isEvmAccountType(selectedInternalAccount.type) &&
    route.params?.chainId &&
    isNonEvmChainId(route.params.chainId)
  ) {
    const solanaTransactionData = selectSolanaAccountTransactions(state);
    const solanaTransactions = solanaTransactionData?.transactions || [];

    const assetAddress = route.params?.address?.toLowerCase();
    const assetSymbol = route.params?.symbol?.toLowerCase();
    const isNativeAsset = route.params?.isNative || route.params?.isETH;

    const newCacheKey = JSON.stringify({
      txCount: solanaTransactions.length,
      assetAddress,
      assetSymbol,
      isNativeAsset,
      lastTxId: solanaTransactions[0]?.id,
    });

    let filteredTransactions;
    if (cacheKey === newCacheKey && cachedFilteredTransactions) {
      filteredTransactions = cachedFilteredTransactions;
    } else {
      filteredTransactions = solanaTransactions;

      if (isNativeAsset) {
        filteredTransactions = solanaTransactions.filter((tx) => {
          const txData = tx.from || tx.to || [];

          if (!txData || txData.length === 0) {
            return false;
          }

          const participantsWithAssets = txData.filter(
            (participant) =>
              participant.asset && typeof participant.asset === 'object',
          );

          if (participantsWithAssets.length === 0) {
            return false;
          }

          const allParticipantsAreNativeSol = participantsWithAssets.every(
            (participant) => {
              const assetType = participant.asset.type || '';
              const assetUnit = participant.asset.unit || '';

              const isNativeSol =
                assetUnit.toLowerCase() === 'sol' &&
                assetType.includes('slip44:501') &&
                !assetType.includes('/token:');

              return isNativeSol;
            },
          );

          return allParticipantsAreNativeSol;
        });
      } else if (assetAddress || assetSymbol) {
        filteredTransactions = solanaTransactions.filter((tx) => {
          const txData = tx.from || tx.to || [];

          const involvesToken = txData.some((participant) => {
            if (participant.asset && typeof participant.asset === 'object') {
              const assetType = participant.asset.type || '';
              const assetUnit = participant.asset.unit || '';

              if (
                assetAddress &&
                assetType.toLowerCase().includes(assetAddress)
              ) {
                return true;
              }

              if (assetSymbol && assetUnit.toLowerCase() === assetSymbol) {
                return true;
              }
            }
            return false;
          });

          return involvesToken;
        });
      }

      // Cache the result
      cachedFilteredTransactions = filteredTransactions;
      cacheKey = newCacheKey;
    }

    allTransactions = [...filteredTransactions].sort(
      (a, b) => (b?.time ?? 0) - (a?.time ?? 0),
    );
  }
  ///: END:ONLY_INCLUDE_IF

  return {
    swapsIsLive: getSwapsIsLive(state, route.params.chainId),
    swapsTokens: isPortfolioViewEnabled()
      ? swapsTokensMultiChainObjectSelector(state)
      : swapsTokensObjectSelector(state),
    searchDiscoverySwapsTokens: selectSupportedSwapTokenAddressesForChainId(
      state,
      route.params.chainId,
    ),
    swapsTransactions: selectSwapsTransactions(state),
    conversionRate: selectConversionRate(state),
    currentCurrency: selectCurrentCurrency(state),
    selectedInternalAccount,
    chainId: selectChainId(state),
    tokens: selectTokens(state),
    transactions: allTransactions,
    rpcUrl: selectRpcUrl(state),
    networkConfigurations: selectNetworkConfigurations(state),
    isNetworkRampSupported: isNetworkRampSupported(
      selectChainId(state),
      getRampNetworks(state),
    ),
    isNetworkBuyNativeTokenSupported: isNetworkRampNativeTokenSupported(
      selectChainId(state),
      getRampNetworks(state),
    ),
    networkClientId: selectNetworkClientId(state),
  };
};

const mapDispatchToProps = (dispatch) => ({
  setLiveness: (chainId, featureFlags) =>
    dispatch(setSwapsLiveness(chainId, featureFlags)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(withMetricsAwareness(Asset));
