import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
  StyleSheet,
  View,
  InteractionManager,
  Animated,
  ScrollView,
} from 'react-native';
import Eth from 'ethjs-query';
import {
  isMultiLayerFeeNetwork,
  fetchEstimatedMultiLayerL1Fee,
} from '../../../util/networks';
import Engine from '../../../core/Engine';
import Logger from '../../../util/Logger';
import { fontStyles } from '../../../styles/common';
import { connect } from 'react-redux';
import { strings } from '../../../../locales/i18n';
import {
  getTransactionReviewActionKey,
  getNormalizedTxState,
  APPROVE_FUNCTION_SIGNATURE,
  decodeTransferData,
  getTicker,
} from '../../../util/transactions';
import {
  weiToFiat,
  balanceToFiat,
  renderFromTokenMinimalUnit,
  renderFromWei,
  fromTokenMinimalUnit,
  isZeroValue,
  hexToBN,
} from '../../../util/number';
import { safeToChecksumAddress } from '../../../util/address';
import Device from '../../../util/device';
import TransactionReviewInformation from './TransactionReviewInformation';
import TransactionReviewSummary from './TransactionReviewSummary';
import TransactionReviewData from './TransactionReviewData';
import Analytics from '../../../core/Analytics/Analytics';
import { MetaMetricsEvents } from '../../../core/Analytics';
import TransactionHeader from '../TransactionHeader';
import AccountFromToInfoCard from '../AccountFromToInfoCard';
import ActionView from '../ActionView';
import { WALLET_CONNECT_ORIGIN } from '../../../util/walletconnect';
import { ThemeContext, mockTheme } from '../../../util/theme';
import withQRHardwareAwareness from '../QRHardware/withQRHardwareAwareness';
import QRSigningDetails from '../QRHardware/QRSigningDetails';
import { withNavigation } from '@react-navigation/compat';
import {
  selectChainId,
  selectTicker,
} from '../../../selectors/networkController';
import {
  selectConversionRate,
  selectCurrentCurrency,
} from '../../../selectors/currencyRateController';
import { selectTokenList } from '../../../selectors/tokenListController';
import { selectTokens } from '../../../selectors/tokensController';
import { selectContractExchangeRates } from '../../../selectors/tokenRatesController';
import { selectAccounts } from '../../../selectors/accountTrackerController';
import ApproveTransactionHeader from '../ApproveTransactionHeader';
import AppConstants from '../../../core/AppConstants';

const POLLING_INTERVAL_ESTIMATED_L1_FEE = 30000;

let intervalIdForEstimatedL1Fee;

const createStyles = (colors) =>
  StyleSheet.create({
    tabUnderlineStyle: {
      height: 2,
      backgroundColor: colors.primary.default,
    },
    tabStyle: {
      paddingBottom: 0,
      backgroundColor: colors.background.default,
    },
    textStyle: {
      fontSize: 12,
      letterSpacing: 0.5,
      ...fontStyles.bold,
    },
    actionViewWrapper: {
      height: Device.isMediumDevice() ? 170 : 290,
    },
    actionViewChildren: {
      height: 220,
    },
    accountTransactionWrapper: {
      flex: 1,
    },
    actionViewQRObject: {
      height: 624,
    },
    accountInfoCardWrapper: {
      paddingBottom: 12,
    },
    transactionData: {
      position: 'absolute',
      width: '100%',
      height: '100%',
    },
    hidden: {
      opacity: 0,
      height: 0,
    },
    accountWrapper: {
      marginTop: -24,
      marginBottom: 24,
    },
  });

/**
 * PureComponent that supports reviewing a transaction
 */
class TransactionReview extends PureComponent {
  static propTypes = {
    /**
     * Balance of all the accounts
     */
    accounts: PropTypes.object,
    /**
     * Callback triggered when this transaction is cancelled
     */
    onCancel: PropTypes.func,
    /**
     * Called when a user changes modes
     */
    onModeChange: PropTypes.func,
    /**
     * Callback triggered when this transaction is cancelled
     */
    onConfirm: PropTypes.func,
    /**
     * Indicates whether hex data should be shown in transaction editor
     */
    showHexData: PropTypes.bool,
    /**
     * Whether the transaction was confirmed or not
     */
    transactionConfirmed: PropTypes.bool,
    /**
     * Transaction object associated with this transaction
     */
    transaction: PropTypes.object,
    /**
     * Callback to validate transaction in parent state
     */
    validate: PropTypes.func,
    /**
     * Browser/tab information
     */
    browser: PropTypes.object,
    /**
     * ETH to current currency conversion rate
     */
    conversionRate: PropTypes.number,
    /**
     * Currency code of the currently-active currency
     */
    currentCurrency: PropTypes.string,
    /**
     * Object containing token exchange rates in the format address => exchangeRate
     */
    contractExchangeRates: PropTypes.object,
    /**
     * Array of ERC20 assets
     */
    tokens: PropTypes.array,
    /**
     * Current provider ticker
     */
    ticker: PropTypes.string,
    /**
     * Chain id
     */
    chainId: PropTypes.string,
    /**
     * ETH or fiat, depending on user setting
     */
    primaryCurrency: PropTypes.string,
    /**
     * Whether or not basic gas estimates have been fetched
     */
    ready: PropTypes.bool,
    /**
     * Height of custom gas and data modal
     */
    customGasHeight: PropTypes.number,
    /**
     * Drives animated values
     */
    animate: PropTypes.func,
    /**
     * Generates a transform style unique to the component
     */
    generateTransform: PropTypes.func,
    /**
     * Saves the height of TransactionReviewData
     */
    saveTransactionReviewDataHeight: PropTypes.func,
    /**
     * Hides or shows TransactionReviewData
     */
    hideData: PropTypes.bool,
    /**
     * True if transaction is over the available funds
     */
    over: PropTypes.bool,
    gasEstimateType: PropTypes.string,
    EIP1559GasData: PropTypes.object,
    /**
     * Function to call when update animation starts
     */
    onUpdatingValuesStart: PropTypes.func,
    /**
     * Function to call when update animation ends
     */
    onUpdatingValuesEnd: PropTypes.func,
    /**
     * If the values should animate upon update or not
     */
    animateOnChange: PropTypes.bool,
    /**
     * Boolean to determine if the animation is happening
     */
    isAnimating: PropTypes.bool,
    dappSuggestedGas: PropTypes.bool,
    /**
     * List of tokens from TokenListController
     */
    tokenList: PropTypes.object,
    /**
     * Object that represents the navigator
     */
    navigation: PropTypes.object,
    /**
     * If it's a eip1559 network and dapp suggest legact gas then it should show a warning
     */
    dappSuggestedGasWarning: PropTypes.bool,
    isSigningQRObject: PropTypes.bool,
    QRState: PropTypes.object,
    /**
     * Returns the selected gas type
     * @returns {string}
     */
    gasSelected: PropTypes.string,
  };

  state = {
    toFocused: false,
    actionKey: strings('transactions.tx_review_confirm'),
    showHexData: false,
    dataVisible: false,
    error: undefined,
    assetAmount: undefined,
    conversionRate: undefined,
    fiatValue: undefined,
    multiLayerL1FeeTotal: '0x0',
    senderBalanceIsZero: true,
  };

  fetchEstimatedL1Fee = async () => {
    const { transaction, chainId } = this.props;
    if (!transaction?.transaction) {
      return;
    }
    try {
      const eth = new Eth(Engine.context.NetworkController.provider);
      const result = await fetchEstimatedMultiLayerL1Fee(eth, {
        txParams: transaction.transaction,
        chainId,
      });
      this.setState({
        multiLayerL1FeeTotal: result,
      });
    } catch (e) {
      Logger.error(e, 'fetchEstimatedMultiLayerL1Fee call failed');
      this.setState({
        multiLayerL1FeeTotal: '0x0',
      });
    }
  };

  componentDidMount = async () => {
    const {
      accounts,
      validate,
      transaction,
      transaction: { data, to, value, from },
      tokens,
      chainId,
      tokenList,
      ready,
    } = this.props;
    let { showHexData } = this.props;
    let assetAmount, conversionRate, fiatValue;
    showHexData = showHexData || data;
    const approveTransaction =
      data &&
      data.substr(0, 10) === APPROVE_FUNCTION_SIGNATURE &&
      (!value || isZeroValue(value));
    const error = ready && validate && (await validate());
    const actionKey = await getTransactionReviewActionKey(transaction, chainId);
    if (approveTransaction) {
      let contract = tokenList[safeToChecksumAddress(to)];
      if (!contract) {
        contract = tokens.find(
          ({ address }) => address === safeToChecksumAddress(to),
        );
      }
      const symbol = (contract && contract.symbol) || 'ERC20';
      assetAmount = `${decodeTransferData('transfer', data)[1]} ${symbol}`;
    } else {
      [assetAmount, conversionRate, fiatValue] = this.getRenderValues()();
    }
    const senderBalance = accounts[safeToChecksumAddress(from)]?.balance;
    const senderBalanceIsZero = hexToBN(senderBalance).isZero();
    this.setState({
      error,
      actionKey,
      showHexData,
      assetAmount,
      conversionRate,
      fiatValue,
      approveTransaction,
      senderBalanceIsZero,
    });
    InteractionManager.runAfterInteractions(() => {
      Analytics.trackEvent(MetaMetricsEvents.TRANSACTIONS_CONFIRM_STARTED);
    });
    if (isMultiLayerFeeNetwork(chainId)) {
      this.fetchEstimatedL1Fee();
      intervalIdForEstimatedL1Fee = setInterval(
        this.fetchEstimatedL1Fee,
        POLLING_INTERVAL_ESTIMATED_L1_FEE,
      );
    }
  };

  componentWillUnmount = async () => {
    clearInterval(intervalIdForEstimatedL1Fee);
  };

  async componentDidUpdate(prevProps) {
    if (this.props.ready !== prevProps.ready) {
      const error = this.props.validate && (await this.props.validate());
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({ error });
    }
  }

  getRenderValues = () => {
    const {
      transaction: { value, selectedAsset, assetType },
      currentCurrency,
      contractExchangeRates,
      ticker,
    } = this.props;
    const values = {
      ETH: () => {
        const assetAmount = `${renderFromWei(value)} ${getTicker(ticker)}`;
        const conversionRate = this.props.conversionRate;
        const fiatValue = weiToFiat(value, conversionRate, currentCurrency);
        return [assetAmount, conversionRate, fiatValue];
      },
      ERC20: () => {
        const assetAmount = `${renderFromTokenMinimalUnit(
          value,
          selectedAsset.decimals,
        )} ${selectedAsset.symbol}`;
        const conversionRate = contractExchangeRates[selectedAsset.address];
        const fiatValue = balanceToFiat(
          (value && fromTokenMinimalUnit(value, selectedAsset.decimals)) || 0,
          this.props.conversionRate,
          conversionRate,
          currentCurrency,
        );
        return [assetAmount, conversionRate, fiatValue];
      },
      ERC721: () => {
        const assetAmount = strings('unit.token_id') + selectedAsset.tokenId;
        const conversionRate = true;
        const fiatValue = selectedAsset.name;
        return [assetAmount, conversionRate, fiatValue];
      },
      default: () => [undefined, undefined, undefined],
    };
    return values[assetType] || values.default;
  };

  edit = () => {
    const { onModeChange } = this.props;
    Analytics.trackEvent(MetaMetricsEvents.TRANSACTIONS_EDIT_TRANSACTION);
    onModeChange && onModeChange('edit');
  };

  getStyles = () => {
    const colors = this.context?.colors || mockTheme.colors;
    return createStyles(colors);
  };

  toggleDataView = () => {
    const { animate } = this.props;
    if (this.state.dataVisible) {
      animate({
        modalEndValue: 1,
        xTranslationName: 'reviewToData',
        xTranslationEndValue: 0,
      });
      this.setState({ dataVisible: false });
      return;
    }
    animate({
      modalEndValue: 0,
      xTranslationName: 'reviewToData',
      xTranslationEndValue: 1,
    });
    this.setState({ dataVisible: true });
  };

  getUrlFromBrowser() {
    const { browser, transaction } = this.props;
    let url;
    if (
      transaction.origin &&
      transaction.origin.startsWith(WALLET_CONNECT_ORIGIN)
    ) {
      return transaction.origin.split(WALLET_CONNECT_ORIGIN)[1];
    } else if (
      transaction.origin &&
      transaction.origin.startsWith(AppConstants.MM_SDK.SDK_REMOTE_ORIGIN)
    ) {
      return transaction.origin.split(AppConstants.MM_SDK.SDK_REMOTE_ORIGIN)[1];
    }

    browser.tabs.forEach((tab) => {
      if (tab.id === browser.activeTab) {
        url = tab.url;
      }
    });
    return url;
  }

  renderTransactionReview = () => {
    const {
      transactionConfirmed,
      primaryCurrency,
      ready,
      generateTransform,
      hideData,
      saveTransactionReviewDataHeight,
      customGasHeight,
      over,
      gasEstimateType,
      EIP1559GasData,
      onUpdatingValuesStart,
      onUpdatingValuesEnd,
      animateOnChange,
      isAnimating,
      dappSuggestedGas,
      navigation,
      dappSuggestedGasWarning,
      gasSelected,
      chainId,
      transaction,
      transaction: { to, origin, from, ensRecipient },
    } = this.props;
    const {
      actionKey,
      error,
      assetAmount,
      conversionRate,
      fiatValue,
      approveTransaction,
      multiLayerL1FeeTotal,
      senderBalanceIsZero,
    } = this.state;
    const url = this.getUrlFromBrowser();
    const styles = this.getStyles();

    return (
      <>
        <Animated.View
          style={generateTransform('reviewToData', [
            0,
            -Device.getDeviceWidth(),
          ])}
        >
          {from && (
            <ApproveTransactionHeader
              currentEnsName={ensRecipient}
              origin={origin}
              url={url}
              from={from}
              asset={transaction?.selectedAsset}
            />
          )}
          <TransactionReviewSummary
            actionKey={actionKey}
            assetAmount={assetAmount}
            conversionRate={conversionRate}
            fiatValue={fiatValue}
            approveTransaction={approveTransaction}
            primaryCurrency={primaryCurrency}
            chainId={chainId}
          />
          {to && (
            <View style={styles.accountWrapper}>
              <AccountFromToInfoCard
                transactionState={transaction}
                layout="vertical"
              />
            </View>
          )}
          <View style={styles.actionViewWrapper}>
            <ActionView
              confirmButtonMode="confirm"
              cancelText={strings('transaction.reject')}
              onCancelPress={this.props.onCancel}
              onConfirmPress={this.props.onConfirm}
              confirmed={transactionConfirmed}
              confirmDisabled={
                senderBalanceIsZero ||
                transactionConfirmed ||
                Boolean(error) ||
                isAnimating
              }
            >
              <View style={styles.actionViewChildren}>
                <ScrollView nestedScrollEnabled>
                  <View
                    style={styles.accountTransactionWrapper}
                    onStartShouldSetResponder={() => true}
                  >
                    <View style={styles.accountInfoCardWrapper}>
                      <TransactionReviewInformation
                        navigation={navigation}
                        error={error}
                        edit={this.edit}
                        ready={ready}
                        assetAmount={assetAmount}
                        fiatValue={fiatValue}
                        toggleDataView={this.toggleDataView}
                        over={over}
                        onCancelPress={this.props.onCancel}
                        gasEstimateType={gasEstimateType}
                        EIP1559GasData={EIP1559GasData}
                        origin={dappSuggestedGas ? url : null}
                        gasSelected={gasSelected}
                        originWarning={dappSuggestedGasWarning}
                        onUpdatingValuesStart={onUpdatingValuesStart}
                        onUpdatingValuesEnd={onUpdatingValuesEnd}
                        animateOnChange={animateOnChange}
                        isAnimating={isAnimating}
                        multiLayerL1FeeTotal={multiLayerL1FeeTotal}
                      />
                    </View>
                  </View>
                </ScrollView>
              </View>
            </ActionView>
          </View>
        </Animated.View>
        <Animated.View
          style={[
            styles.transactionData,
            generateTransform('reviewToData', [Device.getDeviceWidth(), 0]),
            hideData && styles.hidden,
          ]}
        >
          <TransactionReviewData
            actionKey={actionKey}
            toggleDataView={this.toggleDataView}
            saveTransactionReviewDataHeight={saveTransactionReviewDataHeight}
            customGasHeight={customGasHeight}
          />
        </Animated.View>
      </>
    );
  };

  renderQRDetails() {
    const currentPageInformation = { url: this.getUrlFromBrowser() };
    const {
      QRState,
      transaction: { from },
    } = this.props;

    const styles = this.getStyles();
    return (
      <View style={styles.actionViewQRObject}>
        <TransactionHeader currentPageInformation={currentPageInformation} />
        <QRSigningDetails
          QRState={QRState}
          tighten
          showCancelButton
          showHint={false}
          bypassAndroidCameraAccessCheck={false}
          fromAddress={from}
        />
      </View>
    );
  }

  render() {
    const { isSigningQRObject } = this.props;
    return isSigningQRObject
      ? this.renderQRDetails()
      : this.renderTransactionReview();
  }
}

const mapStateToProps = (state) => ({
  tokens: selectTokens(state),
  accounts: selectAccounts(state),
  conversionRate: selectConversionRate(state),
  currentCurrency: selectCurrentCurrency(state),
  contractExchangeRates: selectContractExchangeRates(state),
  ticker: selectTicker(state),
  chainId: selectChainId(state),
  showHexData: state.settings.showHexData,
  transaction: getNormalizedTxState(state),
  browser: state.browser,
  primaryCurrency: state.settings.primaryCurrency,
  tokenList: selectTokenList(state),
});

TransactionReview.contextType = ThemeContext;

export default connect(mapStateToProps)(
  withNavigation(withQRHardwareAwareness(TransactionReview)),
);
