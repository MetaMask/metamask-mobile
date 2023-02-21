import React, { PureComponent } from 'react';
import {
  ActivityIndicator,
  InteractionManager,
  View,
  StyleSheet,
} from 'react-native';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { swapsUtils } from '@metamask/swaps-controller/';
import {
  TX_UNAPPROVED,
  TX_SUBMITTED,
  TX_SIGNED,
  TX_PENDING,
  TX_CONFIRMED,
} from '../../../constants/transaction';
import AssetOverview from '../../UI/AssetOverview';
import Transactions from '../../UI/Transactions';
import { getNetworkNavbarOptions } from '../../UI/Navbar';
import Engine from '../../../core/Engine';
import { sortTransactions } from '../../../util/activity';
import { safeToChecksumAddress } from '../../../util/address';
import { addAccountTimeFlagFilter } from '../../../util/transactions';
import { toLowerCaseEquals } from '../../../util/general';
import { ThemeContext, mockTheme } from '../../../util/theme';
import {
  findBlockExplorerForRpc,
  isMainnetByChainId,
} from '../../../util/networks';
import Routes from '../../../constants/navigation/Routes';

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
    /* Identities object required to get account name
    */
    identities: PropTypes.object,
    /**
     * A string that represents the selected address
     */
    selectedAddress: PropTypes.string,
    /**
     * A string representing the network name
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
    /**
     * Indicates whether third party API mode is enabled
     */
    thirdPartyApiMode: PropTypes.bool,
    swapsTransactions: PropTypes.object,
    /**
     * Object that represents the current route info like params passed to it
     */
    route: PropTypes.object,
    rpcTarget: PropTypes.string,
    frequentRpcList: PropTypes.array,
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

  updateNavBar = () => {
    const { navigation, route, chainId, rpcTarget, frequentRpcList } =
      this.props;
    const colors = this.context.colors || mockTheme.colors;
    const isNativeToken = route.params.isETH;
    const isMainnet = isMainnetByChainId(chainId);
    const blockExplorer = findBlockExplorerForRpc(rpcTarget, frequentRpcList);

    const shouldShowMoreOptionsInNavBar =
      isMainnet || !isNativeToken || (isNativeToken && blockExplorer);

    navigation.setOptions(
      getNetworkNavbarOptions(
        route.params?.symbol ?? '',
        false,
        navigation,
        colors,
        shouldShowMoreOptionsInNavBar
          ? () =>
              navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
                screen: 'AssetOptions',
                params: {
                  isNativeCurrency: isNativeToken,
                  address: route.params?.address,
                },
              })
          : undefined,
        true,
      ),
    );
  };

  componentDidMount() {
    this.updateNavBar();
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
    this.updateNavBar();
    if (
      prevProps.chainId !== this.props.chainId ||
      prevProps.selectedAddress !== this.props.selectedAddress
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
    const { selectedAddress, chainId } = this.props;
    const {
      transaction: { from, to },
      isTransfer,
      transferInformation,
    } = tx;

    const network = Engine.context.NetworkController.state.network;
    if (
      (safeToChecksumAddress(from) === selectedAddress ||
        safeToChecksumAddress(to) === selectedAddress) &&
      (chainId === tx.chainId || (!tx.chainId && network === tx.networkID)) &&
      tx.status !== 'unapproved'
    ) {
      if (isTransfer)
        return this.props.tokens.find(({ address }) =>
          toLowerCaseEquals(address, transferInformation.contractAddress),
        );
      return true;
    }
    return false;
  };

  noEthFilter = (tx) => {
    const { chainId, swapsTransactions, selectedAddress } = this.props;
    const {
      transaction: { to, from },
      isTransfer,
      transferInformation,
    } = tx;
    const network = Engine.context.NetworkController.state.network;
    if (
      (safeToChecksumAddress(from) === selectedAddress ||
        safeToChecksumAddress(to) === selectedAddress) &&
      (chainId === tx.chainId || (!tx.chainId && network === tx.networkID)) &&
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
    const { selectedAddress } = this.props;
    const addedAccountTime = this.props.identities[selectedAddress]?.importTime;
    this.isNormalizing = true;

    let submittedTxs = [];
    const newPendingTxs = [];
    const confirmedTxs = [];
    const submittedNonces = [];

    const { chainId, transactions } = this.props;
    if (transactions.length) {
      const sortedTransactions = sortTransactions(transactions).filter(
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

      submittedTxs = submittedTxs.filter(({ transaction: { from, nonce } }) => {
        if (!toLowerCaseEquals(from, selectedAddress)) {
          return false;
        }
        const alreadySubmitted = submittedNonces.includes(nonce);
        const alreadyConfirmed = confirmedTxs.find(
          (confirmedTransaction) =>
            toLowerCaseEquals(
              safeToChecksumAddress(confirmedTransaction.transaction.from),
              selectedAddress,
            ) && confirmedTransaction.transaction.nonce === nonce,
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
    this.props.thirdPartyApiMode && (await Engine.refreshTransactionHistory());
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
      selectedAddress,
      chainId,
    } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return (
      <View style={styles.wrapper}>
        {loading ? (
          this.renderLoader()
        ) : (
          <Transactions
            header={
              <View style={styles.assetOverviewWrapper}>
                <AssetOverview
                  navigation={navigation}
                  asset={navigation && params}
                />
              </View>
            }
            assetSymbol={navigation && params.symbol}
            navigation={navigation}
            transactions={transactions}
            submittedTransactions={submittedTxs}
            confirmedTransactions={confirmedTxs}
            selectedAddress={selectedAddress}
            conversionRate={conversionRate}
            currentCurrency={currentCurrency}
            networkType={chainId}
            loading={!transactionsUpdated}
            headerHeight={280}
          />
        )}
      </View>
    );
  };
}

Asset.contextType = ThemeContext;

const mapStateToProps = (state) => ({
  swapsTransactions:
    state.engine.backgroundState.TransactionController.swapsTransactions || {},
  conversionRate:
    state.engine.backgroundState.CurrencyRateController.conversionRate,
  currentCurrency:
    state.engine.backgroundState.CurrencyRateController.currentCurrency,
  selectedAddress:
    state.engine.backgroundState.PreferencesController.selectedAddress,
  identities: state.engine.backgroundState.PreferencesController.identities,
  chainId: state.engine.backgroundState.NetworkController.provider.chainId,
  tokens: state.engine.backgroundState.TokensController.tokens,
  transactions: state.engine.backgroundState.TransactionController.transactions,
  thirdPartyApiMode: state.privacy.thirdPartyApiMode,
  rpcTarget: state.engine.backgroundState.NetworkController.provider.rpcTarget,
  frequentRpcList:
    state.engine.backgroundState.PreferencesController.frequentRpcList,
});

export default connect(mapStateToProps)(Asset);
