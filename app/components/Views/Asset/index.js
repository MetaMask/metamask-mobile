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
import { strings } from '../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import Routes from '../../../constants/navigation/Routes';
import {
  TX_CONFIRMED,
  TX_PENDING,
  TX_SIGNED,
  TX_SUBMITTED,
  TX_UNAPPROVED,
} from '../../../constants/transaction';
import { MetaMetricsEvents } from '../../../core/Analytics';
import AppConstants from '../../../core/AppConstants';
import {
  swapsLivenessSelector,
  swapsTokensObjectSelector,
} from '../../../reducers/swaps';
import {
  selectChainId,
  selectNetworkConfigurations,
  selectRpcUrl,
} from '../../../selectors/networkController';
import { selectTokens } from '../../../selectors/tokensController';
import { sortTransactions } from '../../../util/activity';
import { safeToChecksumAddress } from '../../../util/address';
import { toLowerCaseEquals } from '../../../util/general';
import {
  findBlockExplorerForRpc,
  isMainnetByChainId,
} from '../../../util/networks';
import { mockTheme, ThemeContext } from '../../../util/theme';
import { addAccountTimeFlagFilter } from '../../../util/transactions';
import AssetOverview from '../../UI/AssetOverview';
import { getNetworkNavbarOptions } from '../../UI/Navbar';
import { isSwapsAllowed } from '../../UI/Swaps/utils';
import Transactions from '../../UI/Transactions';
import ActivityHeader from './ActivityHeader';
import { isNetworkRampNativeTokenSupported } from '../../UI/Ramp/utils';
import { getRampNetworks } from '../../../reducers/fiatOrders';
import Device from '../../../util/device';
import {
  selectConversionRate,
  selectCurrentCurrency,
} from '../../../selectors/currencyRateController';
import {
  selectIdentities,
  selectSelectedAddress,
} from '../../../selectors/preferencesController';
import {
  TOKEN_OVERVIEW_BUY_BUTTON,
  TOKEN_OVERVIEW_SWAP_BUTTON,
} from '../../../../wdio/screen-objects/testIDs/Screens/TokenOverviewScreen.testIds';
import { updateIncomingTransactions } from '../../../util/transaction-controller';
import { withMetricsAwareness } from '../../../components/hooks/useMetrics';
import { store } from '../../../store';

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
    /* Identities object required to get account name
    */
    identities: PropTypes.object,
    /**
     * A string that represents the selected address
     */
    selectedAddress: PropTypes.string,
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
    swapsTransactions: PropTypes.object,
    /**
     * Object that represents the current route info like params passed to it
     */
    route: PropTypes.object,
    rpcUrl: PropTypes.string,
    networkConfigurations: PropTypes.object,
    /**
     * Boolean that indicates if native token is supported to buy
     */
    isNetworkBuyNativeTokenSupported: PropTypes.bool,
    /**
     * Metrics injected by withMetricsAwareness HOC
     */
    metrics: PropTypes.object,
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

  updateNavBar = (contentOffset = 0) => {
    const { navigation, route, chainId, rpcUrl, networkConfigurations } =
      this.props;
    const colors = this.context.colors || mockTheme.colors;
    const isNativeToken = route.params.isETH;
    const isMainnet = isMainnetByChainId(chainId);
    const blockExplorer = findBlockExplorerForRpc(
      rpcUrl,
      networkConfigurations,
    );

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
        contentOffset,
      ),
    );
  };

  onScrollThroughContent = (contentOffset = 0) => {
    this.updateNavBar(contentOffset);
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
    const { networkId } = store.getState().inpageProvider;
    const { selectedAddress, chainId } = this.props;
    const {
      txParams: { from, to },
      isTransfer,
      transferInformation,
    } = tx;

    if (
      (safeToChecksumAddress(from) === selectedAddress ||
        safeToChecksumAddress(to) === selectedAddress) &&
      (chainId === tx.chainId || (!tx.chainId && networkId === tx.networkID)) &&
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
    const { networkId } = store.getState().inpageProvider;

    const { chainId, swapsTransactions, selectedAddress } = this.props;
    const {
      txParams: { to, from },
      isTransfer,
      transferInformation,
    } = tx;
    if (
      (safeToChecksumAddress(from) === selectedAddress ||
        safeToChecksumAddress(to) === selectedAddress) &&
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

      submittedTxs = submittedTxs.filter(({ txParams: { from, nonce } }) => {
        if (!toLowerCaseEquals(from, selectedAddress)) {
          return false;
        }
        const alreadySubmitted = submittedNonces.includes(nonce);
        const alreadyConfirmed = confirmedTxs.find(
          (confirmedTransaction) =>
            toLowerCaseEquals(
              safeToChecksumAddress(confirmedTransaction.txParams.from),
              selectedAddress,
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
      selectedAddress,
      chainId,
    } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);
    const asset = navigation && params;
    const isSwapsFeatureLive = this.props.swapsIsLive;
    const isNetworkAllowed = isSwapsAllowed(chainId);
    const isAssetAllowed =
      asset.isETH || asset.address?.toLowerCase() in this.props.swapsTokens;

    const onBuy = () => {
      navigation.navigate(Routes.RAMP.BUY);

      this.props.metrics.trackEvent(MetaMetricsEvents.BUY_BUTTON_CLICKED, {
        text: 'Buy',
        location: 'Token Screen',
        chain_id_destination: chainId,
      });
    };

    const goToSwaps = () => {
      // Pop asset screen first as it's very slow when trying to load the STX status modal if we don't
      navigation.pop();

      navigation.navigate(Routes.SWAPS, {
        screen: 'SwapsAmountView',
        params: {
          sourceToken: asset.isETH
            ? swapsUtils.NATIVE_SWAPS_TOKEN_ADDRESS
            : asset.address,
        },
      });
    };

    const displaySwapsButton =
      isSwapsFeatureLive &&
      isNetworkAllowed &&
      isAssetAllowed &&
      AppConstants.SWAPS.ACTIVE;

    const displayBuyButton =
      asset.isETH && this.props.isNetworkBuyNativeTokenSupported;

    return (
      <View style={styles.wrapper}>
        {loading ? (
          this.renderLoader()
        ) : (
          <Transactions
            header={
              <>
                <AssetOverview navigation={navigation} asset={asset} />
                <ActivityHeader asset={asset} />
              </>
            }
            assetSymbol={asset.symbol}
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
            onScrollThroughContent={this.onScrollThroughContent}
          />
        )}
        {!asset.balanceError && (displayBuyButton || displaySwapsButton) && (
          <View style={{ ...styles.footer, ...styles.footerBorder }}>
            {displayBuyButton && (
              <Button
                variant={ButtonVariants.Secondary}
                size={ButtonSize.Lg}
                label={strings('asset_overview.buy_button')}
                style={{
                  ...styles.footerButton,
                  ...styles.buyButton,
                  ...(!AppConstants.SWAPS.ACTIVE ? styles.singleButton : {}),
                }}
                onPress={onBuy}
                testID={TOKEN_OVERVIEW_BUY_BUTTON}
              />
            )}
            {displaySwapsButton && (
              <Button
                variant={ButtonVariants.Primary}
                size={ButtonSize.Lg}
                label={strings('asset_overview.swap')}
                style={{
                  ...styles.footerButton,
                  ...styles.swapButton,
                  ...(!asset.isETH &&
                  this.props.isNetworkBuyNativeTokenSupported
                    ? styles.singleButton
                    : {}),
                }}
                onPress={goToSwaps}
                testID={TOKEN_OVERVIEW_SWAP_BUTTON}
              />
            )}
          </View>
        )}
      </View>
    );
  };
}

Asset.contextType = ThemeContext;

const mapStateToProps = (state) => ({
  swapsIsLive: swapsLivenessSelector(state),
  swapsTokens: swapsTokensObjectSelector(state),
  swapsTransactions:
    state.engine.backgroundState.TransactionController.swapsTransactions || {},
  conversionRate: selectConversionRate(state),
  currentCurrency: selectCurrentCurrency(state),
  selectedAddress: selectSelectedAddress(state),
  identities: selectIdentities(state),
  chainId: selectChainId(state),
  tokens: selectTokens(state),
  transactions: state.engine.backgroundState.TransactionController.transactions,
  rpcUrl: selectRpcUrl(state),
  networkConfigurations: selectNetworkConfigurations(state),
  isNetworkBuyNativeTokenSupported: isNetworkRampNativeTokenSupported(
    selectChainId(state),
    getRampNetworks(state),
  ),
});

export default connect(mapStateToProps)(withMetricsAwareness(Asset));
