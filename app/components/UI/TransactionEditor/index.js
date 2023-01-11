import React, { PureComponent } from 'react';
import { StyleSheet, View } from 'react-native';
import PropTypes from 'prop-types';
import AnimatedTransactionModal from '../AnimatedTransactionModal';
import TransactionReview from '../TransactionReview';
import {
  hexToBN,
  fromWei,
  renderFromWei,
  toHexadecimal,
} from '../../../util/number';
import { isValidAddress, BN, addHexPrefix } from 'ethereumjs-util';
import { strings } from '../../../../locales/i18n';
import { connect } from 'react-redux';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import {
  generateTransferData,
  getNormalizedTxState,
  getTicker,
  getActiveTabUrl,
} from '../../../util/transactions';
import { setTransactionObject } from '../../../actions/transaction';
import Engine from '../../../core/Engine';
import collectiblesTransferInformation from '../../../util/collectibles-transfer';
import { safeToChecksumAddress } from '../../../util/address';
import { shallowEqual } from '../../../util/general';
import EditGasFee1559 from '../EditGasFee1559';
import EditGasFeeLegacy from '../EditGasFeeLegacy';
import { GAS_ESTIMATE_TYPES } from '@metamask/gas-fee-controller';
import AppConstants from '../../../core/AppConstants';
import {
  estimateGas,
  validateAmount,
  getGasAnalyticsParams,
  handleGasFeeSelection,
  handleGetGasLimit,
} from '../../../util/dappTransactions';
import { getLegacyTransactionData } from '../../../core/GasPolling/GasPolling';
const EDIT = 'edit';
const REVIEW = 'review';

const styles = StyleSheet.create({
  keyboardAwareWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
});

/**
 * PureComponent that supports editing and reviewing a transaction
 */
class TransactionEditor extends PureComponent {
  static propTypes = {
    /**
     * List of accounts from the AccountTrackerController
     */
    accounts: PropTypes.object,
    /**
     * A string representing the network name
     */
    networkType: PropTypes.string,
    /**
     * Current mode this transaction editor is in
     */
    mode: PropTypes.oneOf([EDIT, REVIEW]),
    /**
     * Callback triggered when this transaction is cancelled
     */
    onCancel: PropTypes.func,
    /**
     * Callback triggered when this transaction is confirmed
     */
    onConfirm: PropTypes.func,
    /**
     * Called when a user changes modes
     */
    onModeChange: PropTypes.func,
    /**
     * Transaction object associated with this transaction
     */
    transaction: PropTypes.object,
    /**
     * Whether the transaction was confirmed or not
     */
    transactionConfirmed: PropTypes.bool,
    /**
     * Object containing accounts balances
     */
    contractBalances: PropTypes.object,
    /**
     * String containing the selected address
     */
    selectedAddress: PropTypes.string,
    /**
     * Action that sets transaction attributes from object to a transaction
     */
    setTransactionObject: PropTypes.func.isRequired,
    /**
     * Whether was prompted from approval
     */
    promptedFromApproval: PropTypes.bool,
    /**
     * Current selected ticker
     */
    ticker: PropTypes.string,
    /**
     * Active tab URL, the currently active tab url
     */
    activeTabUrl: PropTypes.string,
    /**
     * Estimate type returned by the gas fee controller, can be market-fee, legacy or eth_gasPrice
     */
    gasEstimateType: PropTypes.string,
    /**
     * Gas fee estimates returned by the gas fee controller
     */
    gasFeeEstimates: PropTypes.object,
    /**
     * ETH or fiat, depending on user setting
     */
    primaryCurrency: PropTypes.string,
    /**
     * A string representing the network chainId
     */
    chainId: PropTypes.string,
  };

  state = {
    toFocused: false,
    ensRecipient: undefined,
    ready: false,
    data: undefined,
    amountError: '',
    toAddressError: '',
    over: false,
    gasSelected: AppConstants.GAS_OPTIONS.MEDIUM,
    gasSelectedTemp: AppConstants.GAS_OPTIONS.MEDIUM,
    eip1559GasTransaction: {},
    eip1559GasObject: {},
    legacyGasObject: {},
    dappSuggestedGasPrice: '',
    dappSuggestedEIP1559Gas: '',
    legacyGasTransaction: {},
    gasError: undefined,
  };

  computeGasEstimates = (gasEstimateTypeChanged) => {
    const { gasEstimateType, transaction, setTransactionObject } = this.props;
    const { dappSuggestedGasPrice, dappSuggestedEIP1559Gas } = this.state;

    const gasSelected = gasEstimateTypeChanged
      ? AppConstants.GAS_OPTIONS.MEDIUM
      : this.state.gasSelected;
    const gasSelectedTemp = gasEstimateTypeChanged
      ? AppConstants.GAS_OPTIONS.MEDIUM
      : this.state.gasSelectedTemp;

    const dappSuggestedGas = dappSuggestedGasPrice || dappSuggestedEIP1559Gas;

    if (gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState(
        {
          ready: true,
          advancedGasInserted: Boolean(dappSuggestedGas),
          gasSelected: dappSuggestedGas ? null : gasSelected,
          gasSelectedTemp,
          animateOnChange: true,
          dappSuggestedEIP1559Gas,
          dappSuggestedGasPrice,
        },
        () => {
          this.setState({ animateOnChange: false });
        },
      );
    } else if (this.props.gasEstimateType !== GAS_ESTIMATE_TYPES.NONE) {
      const suggestedGasLimit = fromWei(transaction.gas, 'wei');
      const getGas = (selected) =>
        dappSuggestedGasPrice
          ? fromWei(dappSuggestedGasPrice, 'gwei')
          : gasEstimateType === GAS_ESTIMATE_TYPES.LEGACY
          ? this.props.gasFeeEstimates[selected]
          : this.props.gasFeeEstimates.gasPrice;

      const legacyGasData = getLegacyTransactionData({
        ...this.props,
        transactionState: this.props.transaction,
        gas: {
          suggestedGasPrice: getGas(gasSelected),
          suggestedGasLimit,
        },
      });

      handleGasFeeSelection(
        hexToBN(legacyGasData.suggestedGasLimitHex),
        hexToBN(legacyGasData.suggestedGasPriceHex),
        setTransactionObject,
      );
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState(
        {
          ready: true,
          stopUpdateGas: false,
          advancedGasInserted: Boolean(dappSuggestedGasPrice),
          gasSelected: dappSuggestedGasPrice ? null : gasSelected,
          gasSelectedTemp,
          animateOnChange: true,
          dappSuggestedEIP1559Gas,
          dappSuggestedGasPrice,
        },
        () => {
          this.setState({ animateOnChange: false });
        },
      );
    }
  };

  startPolling = async () => {
    const { GasFeeController } = Engine.context;
    const pollToken = await GasFeeController.getGasFeeEstimatesAndStartPolling(
      this.state.pollToken,
    );
    this.setState({ pollToken });
  };

  componentDidMount = async () => {
    const { transaction, setTransactionObject } = this.props;

    const zeroGas = new BN('00');
    const hasGasPrice = Boolean(transaction.gasPrice);
    const hasGasLimit =
      Boolean(transaction.gas) && !new BN(transaction.gas).eq(zeroGas);
    const hasEIP1559Gas =
      Boolean(transaction.maxFeePerGas) &&
      Boolean(transaction.maxPriorityFeePerGas);
    if (!hasGasLimit) handleGetGasLimit(transaction, setTransactionObject);

    if (!hasGasPrice && !hasEIP1559Gas) {
      this.startPolling();
    } else if (hasEIP1559Gas) {
      this.setState(
        {
          dappSuggestedEIP1559Gas: {
            maxFeePerGas: transaction.maxFeePerGas,
            maxPriorityFeePerGas: transaction.maxPriorityFeePerGas,
          },
        },
        this.startPolling,
      );
    } else if (hasGasPrice) {
      this.setState(
        { dappSuggestedGasPrice: transaction.gasPrice },
        this.startPolling,
      );
    }

    if (transaction && transaction.value) {
      this.handleUpdateAmount(transaction.value, true);
    }
    if (transaction && transaction.assetType === 'ETH') {
      this.handleUpdateReadableValue(fromWei(transaction.value));
    }
    if (transaction && transaction.data) {
      this.setState({ data: transaction.data });
    }
  };

  componentDidUpdate = (prevProps) => {
    const { transaction } = this.props;
    if (transaction.data !== prevProps.transaction.data) {
      this.handleUpdateData(transaction.data);
    }

    const gasEstimateTypeChanged =
      prevProps.gasEstimateType !== this.props.gasEstimateType;

    if (
      (!this.state.stopUpdateGas && !this.state.advancedGasInserted) ||
      gasEstimateTypeChanged
    ) {
      if (
        this.props.gasFeeEstimates &&
        transaction.gas &&
        (!shallowEqual(prevProps.gasFeeEstimates, this.props.gasFeeEstimates) ||
          !transaction.gas.eq(prevProps?.transaction?.gas))
      ) {
        this.computeGasEstimates(gasEstimateTypeChanged);
      }
    }
  };

  componentWillUnmount = () => {
    const { GasFeeController } = Engine.context;
    GasFeeController.stopPolling(this.state.pollToken);
  };

  /**
   * Call callback when transaction is cancelled
   */
  onCancel = () => {
    const { onCancel } = this.props;
    onCancel && onCancel();
  };

  /**
   * Call callback when transaction is confirmed, after being validated
   */
  onConfirm = async () => {
    const { onConfirm, gasEstimateType } = this.props;
    const { gasSelected, eip1559GasTransaction } = this.state;
    !(await this.validate()) &&
      onConfirm &&
      onConfirm({ gasEstimateType, eip1559GasTransaction, gasSelected });
  };

  /**
   * Updates value in transaction state
   * If is an asset transaction it generates data to send and estimates gas again with new value and new data
   *
   * @param {object} amount - BN object containing transaction amount
   * @param {bool} mounting - Whether the view is mounting, in that case it should use the gas from transaction state
   */
  handleUpdateAmount = async (amount, mounting = false) => {
    const {
      transaction: { to, data, assetType, gas: gasLimit },
      transaction,
    } = this.props;
    // If ETH transaction, there is no need to generate new data
    if (assetType === 'ETH') {
      const { gas } = mounting
        ? { gas: gasLimit }
        : await estimateGas({ amount, data, to }, transaction);
      this.props.setTransactionObject({ value: amount, to, gas: hexToBN(gas) });
    }
    // If selectedAsset defined, generates data
    else if (assetType === 'ERC20') {
      const res = await this.handleDataGeneration({ value: amount });
      const gas = mounting ? gasLimit : res.gas;
      this.props.setTransactionObject({
        value: amount,
        to,
        gas: hexToBN(gas),
        data: res.data,
      });
    }
  };

  /**
   * Updates readableValue in state
   *
   * @param {string} readableValue - String containing the readable value
   */
  handleUpdateReadableValue = (readableValue) => {
    this.props.setTransactionObject({ readableValue });
  };

  /**
   * Updates data in transaction state, after gas is estimated according to this data
   *
   * @param {string} data - String containing new data
   */
  handleUpdateData = async (data) => {
    const { transaction } = this.props;
    const { gas } = await estimateGas({ data }, transaction);
    this.setState({ data });
    this.props.setTransactionObject({ gas: hexToBN(gas), data });
  };

  /**
   * Handle data generation is selectedAsset is defined in transaction
   *
   * @param {object} opts? - Optional object to customize data generation, containing selectedAsset, value and to
   * @returns {object} - Object containing data and gas, according to new generated data
   */
  handleDataGeneration = async (opts) => {
    const {
      transaction: { from },
      transaction,
    } = this.props;
    const selectedAsset = opts.selectedAsset
      ? opts.selectedAsset
      : transaction.selectedAsset;
    const assetType = selectedAsset.tokenId ? 'ERC721' : 'ERC20';
    const value = opts.value ? opts.value : transaction.value;
    const to = opts.to ? opts.to : transaction.to;
    const generateData = {
      ERC20: () => {
        // Use raw data when transaction with walletconnect
        // Additional parameters can enrich the transaction information for ERC20, such as orders or goods
        // These additional parameters have been tested on the metamask-extension and Ethereum mainnet
        if (transaction.data) {
          return transaction.data;
        }

        const tokenAmountToSend = selectedAsset && value && value.toString(16);
        return to && tokenAmountToSend
          ? generateTransferData('transfer', {
              toAddress: to,
              amount: tokenAmountToSend,
            })
          : undefined;
      },
      ERC721: () => {
        const address = selectedAsset.address.toLowerCase();
        const collectibleTransferInformation =
          address in collectiblesTransferInformation &&
          collectiblesTransferInformation[address];
        if (!to) return;
        // If not in list,, default to transferFrom
        if (
          !collectibleTransferInformation ||
          (collectibleTransferInformation.tradable &&
            collectibleTransferInformation.method === 'transferFrom')
        ) {
          return generateTransferData('transferFrom', {
            fromAddress: from,
            toAddress: to,
            tokenId: toHexadecimal(selectedAsset.tokenId),
          });
        } else if (
          collectibleTransferInformation.tradable &&
          collectibleTransferInformation.method === 'transfer'
        ) {
          return generateTransferData('transfer', {
            toAddress: to,
            amount: selectedAsset.tokenId.toString(16),
          });
        }
      },
    };
    const data = generateData[assetType]();
    const { gas } = await estimateGas(
      { data, to: selectedAsset.address },
      transaction,
    );
    return { data, gas };
  };

  validateTotal = (totalGas) => {
    let error = '';
    const {
      ticker,
      transaction: { value, from, assetType },
    } = this.props;

    const checksummedFrom = safeToChecksumAddress(from) || '';
    const fromAccount = this.props.accounts[checksummedFrom];
    const { balance } = fromAccount;
    const weiBalance = hexToBN(balance);
    const totalGasValue = hexToBN(totalGas);
    let valueBN = hexToBN('0x0');
    if (assetType === 'ETH') {
      valueBN = hexToBN(value);
    }
    const total = valueBN.add(totalGasValue);
    if (!weiBalance.gte(total)) {
      const amount = renderFromWei(total.sub(weiBalance));
      const tokenSymbol = getTicker(ticker);
      this.setState({ over: true });
      error = strings('transaction.insufficient_amount', {
        amount,
        tokenSymbol,
      });
    }
    return error;
  };

  /**
   * Validates transaction to address
   *
   * @returns {string} - String containing error message whether the transaction to address is valid or not
   */
  validateToAddress = () => {
    let error;
    const {
      transaction: { to },
      promptedFromApproval,
    } = this.props;
    // If it comes from a dapp it could be a contract deployment
    if (promptedFromApproval && !to) return error;
    !to && (error = strings('transaction.required'));
    !to && this.state.toFocused && (error = strings('transaction.required'));
    to &&
      !isValidAddress(to) &&
      (error = strings('transaction.invalid_address'));
    to && to.length !== 42 && (error = strings('transaction.invalid_address'));
    return error;
  };

  review = async () => {
    const { data } = this.state;
    await this.setState({ toFocused: true });
    const validated = !(await this.validate());
    if (validated) {
      if (data && data.substr(0, 2) !== '0x') {
        this.handleUpdateData(addHexPrefix(data));
      }
    }
    this.props?.onModeChange(REVIEW);
  };

  validate = async (totalMaxHex) => {
    const {
      transaction: {
        assetType,
        selectedAsset: { address, tokenId },
      },
      selectedAddress,
      transaction,
      contractBalances,
    } = this.props;

    const totalError = this.validateTotal(
      this.state.eip1559GasTransaction.totalMaxHex ||
        this.state.legacyGasTransaction.totalHex ||
        totalMaxHex,
    );
    const amountError = await validateAmount(
      assetType,
      address,
      tokenId,
      selectedAddress,
      transaction,
      contractBalances,
      false,
    );
    const toAddressError = this.validateToAddress();
    this.setState({ amountError: totalError || amountError, toAddressError });
    return totalError || amountError || toAddressError;
  };

  calculateTempGasFee = (selected) => {
    this.setState({
      stopUpdateGas: !selected,
      gasSelectedTemp: selected,
      gasSelected: selected,
      advancedGasInserted: !selected,
    });
  };

  calculateTempGasFeeLegacy = (selected) => {
    this.setState({
      stopUpdateGas: !selected,
      gasSelectedTemp: selected,
    });
  };

  saveGasEdition = (eip1559GasTransaction, eip1559GasObject) => {
    this.setState(
      {
        stopUpdateGas: false,
        dappSuggestedGasPrice: null,
        dappSuggestedEIP1559Gas: null,
        eip1559GasTransaction,
        eip1559GasObject,
      },
      this.review,
    );
  };

  saveGasEditionLegacy = (
    legacyGasTransaction,
    legacyGasObject,
    gasSelected,
  ) => {
    const { gasEstimateType, setTransactionObject } = this.props;

    if (gasEstimateType !== GAS_ESTIMATE_TYPES.FEE_MARKET) {
      handleGasFeeSelection(
        hexToBN(legacyGasTransaction.suggestedGasLimitHex),
        hexToBN(legacyGasTransaction.suggestedGasPriceHex),
        setTransactionObject,
      );
    }

    this.setState(
      {
        stopUpdateGas: false,
        gasSelected,
        gasSelectedTemp: gasSelected,
        advancedGasInserted: !gasSelected,
        dappSuggestedGasPrice: null,
        dappSuggestedEIP1559Gas: null,
        legacyGasTransaction,
        legacyGasObject,
      },
      this.review,
    );
  };

  cancelGasEdition = () => {
    this.setState({
      stopUpdateGas: false,
      gasSelectedTemp: this.state.gasSelected,
    });
    this.props.onModeChange?.('review');
  };

  renderWarning = () => {
    const { dappSuggestedGasPrice, dappSuggestedEIP1559Gas } = this.state;
    const {
      transaction: { origin },
      gasEstimateType,
    } = this.props;
    if (
      dappSuggestedGasPrice &&
      gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET
    )
      return strings('transaction.dapp_suggested_gas', { origin });
    if (
      dappSuggestedEIP1559Gas ||
      gasEstimateType !== GAS_ESTIMATE_TYPES.FEE_MARKET
    )
      return strings('transaction.dapp_suggested_eip1559_gas', { origin });

    return null;
  };

  onUpdatingValuesStart = () => {
    this.setState({ isAnimating: true });
  };
  onUpdatingValuesEnd = () => {
    this.setState({ isAnimating: false });
  };

  updateTransactionState = async (gas) => {
    const gasError = await this.validate(gas.totalMaxHex || gas.totalHex);
    this.setState({
      eip1559GasTransaction: gas,
      legacyGasTransaction: gas,
      gasError,
    });
  };

  render = () => {
    const {
      mode,
      transactionConfirmed,
      onModeChange,
      gasFeeEstimates,
      primaryCurrency,
      chainId,
      gasEstimateType,
      transaction,
      activeTabUrl,
      networkType,
    } = this.props;
    const {
      ready,
      over,
      gasSelected,
      dappSuggestedGasPrice,
      dappSuggestedEIP1559Gas,
      animateOnChange,
      isAnimating,
      eip1559GasObject,
      eip1559GasTransaction,
      legacyGasObject,
      legacyGasTransaction,
    } = this.state;

    const selectedGasObject = {
      suggestedMaxFeePerGas:
        eip1559GasObject.suggestedMaxFeePerGas ||
        gasFeeEstimates[gasSelected]?.suggestedMaxFeePerGas,
      suggestedMaxPriorityFeePerGas:
        eip1559GasObject.suggestedMaxPriorityFeePerGas ||
        gasFeeEstimates[gasSelected]?.suggestedMaxPriorityFeePerGas,
      suggestedGasLimit:
        eip1559GasObject.suggestedGasLimit ||
        eip1559GasTransaction.suggestedGasLimit,
    };

    const selectedLegacyGasObject = {
      legacyGasLimit: legacyGasObject?.legacyGasLimit,
      suggestedGasPrice: legacyGasObject?.suggestedGasPrice,
    };

    return (
      <React.Fragment>
        {mode === 'review' && (
          <KeyboardAwareScrollView
            contentContainerStyle={styles.keyboardAwareWrapper}
          >
            <AnimatedTransactionModal
              onModeChange={onModeChange}
              ready={ready}
              review={this.review}
            >
              <TransactionReview
                onCancel={this.onCancel}
                onConfirm={this.onConfirm}
                validate={this.validate}
                ready={ready}
                gasSelected={gasSelected}
                transactionConfirmed={transactionConfirmed}
                over={over}
                gasEstimateType={gasEstimateType}
                onUpdatingValuesStart={this.onUpdatingValuesStart}
                onUpdatingValuesEnd={this.onUpdatingValuesEnd}
                animateOnChange={animateOnChange}
                isAnimating={isAnimating}
                dappSuggestedGas={
                  Boolean(dappSuggestedGasPrice) ||
                  Boolean(dappSuggestedEIP1559Gas)
                }
                gasObject={
                  gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET
                    ? eip1559GasObject
                    : legacyGasObject
                }
                dappSuggestedGasPrice={dappSuggestedGasPrice}
                dappSuggestedEIP1559Gas={dappSuggestedEIP1559Gas}
                dappSuggestedGasWarning={
                  Boolean(dappSuggestedGasPrice) &&
                  gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET
                }
                eip1559GasTransaction={eip1559GasTransaction}
                updateTransactionState={this.updateTransactionState}
                gasError={this.state.gasError}
              />
              {/** View fixes layout issue after removing <CustomGas/> */}
              <View />
            </AnimatedTransactionModal>
          </KeyboardAwareScrollView>
        )}

        {mode !== 'review' &&
          (gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET ? (
            <EditGasFee1559
              selectedGasValue={gasSelected}
              gasOptions={gasFeeEstimates}
              onChange={this.calculateTempGasFee}
              selectedGasObject={selectedGasObject}
              primaryCurrency={primaryCurrency}
              chainId={chainId}
              onCancel={this.cancelGasEdition}
              onSave={this.saveGasEdition}
              dappSuggestedGas={
                Boolean(dappSuggestedGasPrice) ||
                Boolean(dappSuggestedEIP1559Gas)
              }
              warning={this.renderWarning()}
              error={eip1559GasTransaction.error}
              over={over}
              onUpdatingValuesStart={this.onUpdatingValuesStart}
              onUpdatingValuesEnd={this.onUpdatingValuesEnd}
              animateOnChange={animateOnChange}
              isAnimating={isAnimating}
              view={'Transaction'}
              analyticsParams={getGasAnalyticsParams(
                transaction,
                activeTabUrl,
                gasEstimateType,
                networkType,
              )}
            />
          ) : (
            <EditGasFeeLegacy
              selected={gasSelected}
              gasEstimateType={gasEstimateType}
              gasOptions={gasFeeEstimates}
              onChange={this.calculateTempGasFeeLegacy}
              primaryCurrency={primaryCurrency}
              chainId={chainId}
              onCancel={this.cancelGasEdition}
              onSave={this.saveGasEditionLegacy}
              error={legacyGasTransaction.error}
              over={over}
              onUpdatingValuesStart={this.onUpdatingValuesStart}
              onUpdatingValuesEnd={this.onUpdatingValuesEnd}
              animateOnChange={animateOnChange}
              isAnimating={isAnimating}
              view={'Transaction'}
              analyticsParams={getGasAnalyticsParams(
                transaction,
                activeTabUrl,
                gasEstimateType,
                networkType,
              )}
              selectedGasObject={selectedLegacyGasObject}
            />
          ))}
      </React.Fragment>
    );
  };
}

const mapStateToProps = (state) => ({
  accounts: state.engine.backgroundState.AccountTrackerController.accounts,
  contractBalances:
    state.engine.backgroundState.TokenBalancesController.contractBalances,
  networkType: state.engine.backgroundState.NetworkController.provider.type,
  selectedAddress:
    state.engine.backgroundState.PreferencesController.selectedAddress,
  ticker: state.engine.backgroundState.NetworkController.provider.ticker,
  transaction: getNormalizedTxState(state),
  activeTabUrl: getActiveTabUrl(state),
  gasFeeEstimates:
    state.engine.backgroundState.GasFeeController.gasFeeEstimates,
  gasEstimateType:
    state.engine.backgroundState.GasFeeController.gasEstimateType,
  currentCurrency:
    state.engine.backgroundState.CurrencyRateController.currentCurrency,
  conversionRate:
    state.engine.backgroundState.CurrencyRateController.conversionRate,
  nativeCurrency:
    state.engine.backgroundState.CurrencyRateController.nativeCurrency,
  primaryCurrency: state.settings.primaryCurrency,
  chainId: state.engine.backgroundState.NetworkController.provider.chainId,
});

const mapDispatchToProps = (dispatch) => ({
  setTransactionObject: (transaction) =>
    dispatch(setTransactionObject(transaction)),
});

export default connect(mapStateToProps, mapDispatchToProps)(TransactionEditor);
