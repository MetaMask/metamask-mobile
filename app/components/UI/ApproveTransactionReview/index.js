import React, { PureComponent } from 'react';
import { View, TouchableOpacity, InteractionManager } from 'react-native';
import Eth from 'ethjs-query';
import ActionView from '../../UI/ActionView';
import PropTypes from 'prop-types';
import { getApproveNavbar } from '../../UI/Navbar';
import { connect } from 'react-redux';
import { getHost } from '../../../util/browser';
import {
  safeToChecksumAddress,
  getAddressAccountType,
  getTokenDetails,
  shouldShowBlockExplorer,
} from '../../../util/address';
import Engine from '../../../core/Engine';
import { strings } from '../../../../locales/i18n';
import { setTransactionObject } from '../../../actions/transaction';
import { GAS_ESTIMATE_TYPES } from '@metamask/gas-fee-controller';
import { hexToBN } from '@metamask/controller-utils';
import {
  fromTokenMinimalUnit,
  renderFromTokenMinimalUnit,
} from '../../../util/number';
import {
  getTicker,
  getNormalizedTxState,
  getActiveTabUrl,
  getMethodData,
  decodeApproveData,
  generateTxWithNewTokenAllowance,
  minimumTokenAllowance,
} from '../../../util/transactions';
import TransactionTypes from '../../../core/TransactionTypes';
import { showAlert } from '../../../actions/alert';
import Analytics from '../../../core/Analytics/Analytics';
import { MetaMetricsEvents } from '../../../core/Analytics';
import AnalyticsV2 from '../../../util/analyticsV2';
import TransactionHeader from '../../UI/TransactionHeader';
import TransactionReviewDetailsCard from '../../UI/TransactionReview/TransactionReviewDetailsCard';
import AppConstants from '../../../core/AppConstants';
import { UINT256_HEX_MAX_VALUE } from '../../../constants/transaction';
import { WALLET_CONNECT_ORIGIN } from '../../../util/walletconnect';
import { withNavigation } from '@react-navigation/compat';
import {
  isTestNet,
  isMultiLayerFeeNetwork,
  fetchEstimatedMultiLayerL1Fee,
} from '../../../util/networks';
import EditPermission from './EditPermission';
import Logger from '../../../util/Logger';
import ButtonLink from '../../../component-library/components/Buttons/Button/variants/ButtonLink';
import { getTokenList } from '../../../reducers/tokens';
import TransactionReview from '../../UI/TransactionReview/TransactionReviewEIP1559Update';
import ClipboardManager from '../../../core/ClipboardManager';
import { ThemeContext, mockTheme } from '../../../util/theme';
import withQRHardwareAwareness from '../QRHardware/withQRHardwareAwareness';
import QRSigningDetails from '../QRHardware/QRSigningDetails';
import Routes from '../../../constants/navigation/Routes';
import formatNumber from '../../../util/formatNumber';
import createStyles from './styles';
import {
  selectChainId,
  selectNetwork,
  selectProviderType,
  selectTicker,
  selectRpcTarget,
} from '../../../selectors/networkController';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import ApproveTransactionHeader from '../ApproveTransactionHeader';
import VerifyContractDetails from './VerifyContractDetails/VerifyContractDetails';
import ShowBlockExplorer from './ShowBlockExplorer';
import { isNetworkBuyNativeTokenSupported } from '../FiatOnRampAggregator/utils';
import { getRampNetworks } from '../../../reducers/fiatOrders';
import CustomSpendCap from '../../../component-library/components-temp/CustomSpendCap';
import {getAccountBalance} from '../../../util/dappTransactions';

import SkeletonText from '../FiatOnRampAggregator/components/SkeletonText';

const { ORIGIN_DEEPLINK, ORIGIN_QR_CODE } = AppConstants.DEEPLINKS;
const POLLING_INTERVAL_ESTIMATED_L1_FEE = 30000;

let intervalIdForEstimatedL1Fee;

const {
  ASSET: { ERC721, ERC1155, ERC20 },
} = TransactionTypes;

/**
 * PureComponent that manages ERC20 approve from the dapp browser
 */
class ApproveTransactionReview extends PureComponent {
  static navigationOptions = ({ navigation }) =>
    getApproveNavbar('approve.title', navigation);

  static propTypes = {
    /**
     * Callback triggered when this transaction is cancelled
     */
    onCancel: PropTypes.func,
    /**
     * Callback triggered when this transaction is confirmed
     */
    onConfirm: PropTypes.func,
    /**
     * Transaction state
     */
    transaction: PropTypes.object.isRequired,
    /**
     * Action that shows the global alert
     */
    showAlert: PropTypes.func,
    /**
     * Current provider ticker
     */
    ticker: PropTypes.string,
    /**
     * Number of tokens
     */
    tokensLength: PropTypes.number,
    /**
     * Number of accounts
     */
    accountsLength: PropTypes.number,
    /**
     * A string representing the network name
     */
    providerType: PropTypes.string,
    /**
     * Function to change the mode
     */
    onModeChange: PropTypes.func,
    /**
     * Error coming from gas component
     */
    gasError: PropTypes.string,
    /**
     * Primary currency, either ETH or Fiat
     */
    primaryCurrency: PropTypes.string,
    /**
     * Active tab URL, the currently active tab url
     */
    activeTabUrl: PropTypes.string,
    /**
     * Object that represents the navigator
     */
    navigation: PropTypes.object,
    /**
     * Network id
     */
    network: PropTypes.string,
    /**
     * True if transaction is over the available funds
     */
    over: PropTypes.bool,
    /**
     * Function to set analytics params
     */
    onSetAnalyticsParams: PropTypes.func,
    /**
     * A string representing the network chainId
     */
    chainId: PropTypes.string,
    /**
     * Estimate type returned by the gas fee controller, can be market-fee, legacy or eth_gasPrice
     */
    gasEstimateType: PropTypes.string,
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
    /**
     * If the gas estimations are ready
     */
    gasEstimationReady: PropTypes.bool,
    /**
     * List of tokens from TokenListController
     */
    tokenList: PropTypes.object,
    /**
     * Whether the transaction was confirmed or not
     */
    transactionConfirmed: PropTypes.bool,
    /**
     * Dispatch set transaction object from transaction action
     */
    setTransactionObject: PropTypes.func,
    /**
     * toggle nickname modal
     */
    toggleModal: PropTypes.func,
    /**
     * The saved nickname of the address
     */
    nickname: PropTypes.string,
    /**
     * Check if nickname is saved
     */
    nicknameExists: PropTypes.bool,
    isSigningQRObject: PropTypes.bool,
    QRState: PropTypes.object,
    /**
     * The selected gas value (low, medium, high). Gas value can be null when the advanced option is modified.
     */
    gasSelected: PropTypes.string,
    /**
     * update gas transaction state to parent
     */
    updateTransactionState: PropTypes.func,
    /**
     * legacy gas object for calculating the legacy transaction
     */
    legacyGasObject: PropTypes.object,
    /**
     * eip1559 gas object for calculating eip1559 transaction
     */
    eip1559GasObject: PropTypes.object,
    showBlockExplorer: PropTypes.func,
    /**
     * function to toggle the verify contract details modal
     */
    showVerifyContractDetails: PropTypes.func,
    savedContactListToArray: PropTypes.array,
    closeVerifyContractDetails: PropTypes.func,
    shouldVerifyContractDetails: PropTypes.bool,
    frequentRpcList: PropTypes.array,
    providerRpcTarget: PropTypes.string,
    /**
     * Boolean that indicates if the native token buy is supported
     */
    isNativeTokenBuySupported: PropTypes.bool,
  };

  state = {
    viewData: false,
    editPermissionVisible: false,
    host: undefined,
    originalApproveAmount: undefined,
    spendLimitUnlimitedSelected: true,
    spendLimitCustomValue: undefined,
    ticker: getTicker(this.props.ticker),
    viewDetails: false,
    spenderAddress: '0x...',
    transaction: this.props.transaction,
    token: {},
    spendLimitCreated: false,
    customSpendValue: null,
    showGasTooltip: false,
    gasTransactionObject: {},
    multiLayerL1FeeTotal: '0x0',
    fetchingUpdateDone: false,
    showBlockExplorerModal: false,
    address: '',
  };

  customSpendLimitInput = React.createRef();
  originIsWalletConnect = this.props.transaction.origin?.startsWith(
    WALLET_CONNECT_ORIGIN,
  );

  originIsMMSDKRemoteConn = this.props.transaction.origin?.startsWith(
    AppConstants.MM_SDK.SDK_REMOTE_ORIGIN,
  );

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
    const { chainId } = this.props;
    const {
      transaction: { origin, to, data, from },
      tokenList,
    } = this.props;
    const { AssetsContractController, TokenBalancesController } =
      Engine.context;

    let host;

    if (this.originIsWalletConnect) {
      host = getHost(origin.split(WALLET_CONNECT_ORIGIN)[1]);
    } else if (this.originIsMMSDKRemoteConn) {
      host = origin.split(AppConstants.MM_SDK.SDK_REMOTE_ORIGIN)[1];
    } else {
      host = getHost(origin);
    }

    let tokenSymbol, tokenDecimals, tokenName, tokenStandard;

    const { spenderAddress, encodedAmount } = decodeApproveData(data);
    const encodedValue = hexToBN(encodedAmount).toString();

    let tokenBalance = await TokenBalancesController.getERC20BalanceOf(
      to,
      from,
    );

    const contract = tokenList[safeToChecksumAddress(to)];
    if (!contract) {
      try {
        const result = await getTokenDetails(to, from, encodedValue);

        const { standard, name, decimals, symbol } = result;

        if (standard === ERC721 || standard === ERC1155) {
          tokenName = name;
          tokenSymbol = symbol;
          tokenStandard = standard;
          tokenDecimals = await AssetsContractController.getERC20TokenDecimals(
            to,
          );
        } else {
          tokenDecimals = decimals;
          tokenSymbol = symbol;
          tokenStandard = standard;
          tokenName = name;
          tokenBalance = renderFromTokenMinimalUnit(tokenBalance, decimals);
        }
      } catch (e) {
        tokenSymbol = 'ERC20 Token';
        tokenDecimals = 18;
      }
    } else {
      tokenSymbol = contract.symbol;
      tokenDecimals = contract.decimals;
    }

    const approveAmount = fromTokenMinimalUnit(
      hexToBN(encodedAmount),
      tokenDecimals,
    );

    const { name: method } = await getMethodData(data);
    const minTokenAllowance = minimumTokenAllowance(tokenDecimals);

    this.setState(
      {
        host,
        method,
        originalApproveAmount: approveAmount,
        token: {
          tokenSymbol,
          tokenDecimals,
          tokenName,
          tokenValue: encodedValue,
          tokenStandard,
          tokenBalance,
        },
        spenderAddress,
        encodedAmount,
        fetchingUpdateDone: true,
        spendLimitCustomValue: minTokenAllowance,
      },
      () => {
        AnalyticsV2.trackEvent(
          MetaMetricsEvents.APPROVAL_STARTED,
          this.getAnalyticsParams(),
        );
      },
    );
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

  getAnalyticsParams = () => {
    try {
      const { activeTabUrl, transaction, onSetAnalyticsParams } = this.props;
      const {
        token: { tokenSymbol },
        originalApproveAmount,
        encodedAmount,
      } = this.state;
      const { NetworkController } = Engine.context;
      const { chainId } = NetworkController?.state?.providerConfig || {};
      const isDapp = !Object.values(AppConstants.DEEPLINKS).includes(
        transaction?.origin,
      );
      const unlimited = encodedAmount === UINT256_HEX_MAX_VALUE;
      const params = {
        account_type: getAddressAccountType(transaction?.from),
        dapp_host_name: transaction?.origin,
        dapp_url: isDapp ? activeTabUrl : undefined,
        chain_id: chainId,
        active_currency: { value: tokenSymbol, anonymous: true },
        number_tokens_requested: {
          value: originalApproveAmount,
          anonymous: true,
        },
        unlimited_permission_requested: unlimited,
        referral_type: isDapp ? 'dapp' : transaction?.origin,
        request_source: this.originIsMMSDKRemoteConn
          ? AppConstants.REQUEST_SOURCES.SDK_REMOTE_CONN
          : this.originIsWalletConnect
          ? AppConstants.REQUEST_SOURCES.WC
          : AppConstants.REQUEST_SOURCES.IN_APP_BROWSER,
      };
      // Send analytics params to parent component so it's available when cancelling and confirming
      onSetAnalyticsParams && onSetAnalyticsParams(params);

      return params;
    } catch (error) {
      return {};
    }
  };

  trackApproveEvent = (event) => {
    const { transaction, tokensLength, accountsLength, providerType } =
      this.props;
    InteractionManager.runAfterInteractions(() => {
      Analytics.trackEventWithParameters(event, {
        view: transaction.origin,
        numberOfTokens: tokensLength,
        numberOfAccounts: accountsLength,
        network: providerType,
      });
    });
  };

  toggleViewData = () => {
    const { viewData } = this.state;
    this.setState({ viewData: !viewData });
  };

  toggleViewDetails = () => {
    const { viewDetails } = this.state;
    Analytics.trackEvent(MetaMetricsEvents.DAPP_APPROVE_SCREEN_VIEW_DETAILS);
    this.setState({ viewDetails: !viewDetails });
  };

  toggleEditPermission = () => {
    const { editPermissionVisible } = this.state;
    !editPermissionVisible &&
      this.trackApproveEvent(
        MetaMetricsEvents.DAPP_APPROVE_SCREEN_EDIT_PERMISSION,
      );
    this.setState({ editPermissionVisible: !editPermissionVisible });
  };

  onPressSpendLimitUnlimitedSelected = () => {
    const {
      token: { tokenDecimals },
    } = this.state;
    const minTokenAllowance = minimumTokenAllowance(tokenDecimals);
    this.setState({
      spendLimitUnlimitedSelected: true,
      spendLimitCustomValue: minTokenAllowance,
    });
  };

  onPressSpendLimitCustomSelected = () => {
    this.setState({ spendLimitUnlimitedSelected: false });
    setTimeout(
      () =>
        this.customSpendLimitInput &&
        this.customSpendLimitInput.current &&
        this.customSpendLimitInput.current.focus(),
      100,
    );
  };

  onSpendLimitCustomValueChange = (value) => {
    this.setState({ spendLimitCustomValue: value });
  };

  copyContractAddress = async (address) => {
    await ClipboardManager.setString(address);
    this.props.showAlert({
      isVisible: true,
      autodismiss: 1500,
      content: 'clipboard-alert',
      data: { msg: strings('transactions.address_copied_to_clipboard') },
    });
    AnalyticsV2.trackEvent(
      MetaMetricsEvents.CONTRACT_ADDRESS_COPIED,
      this.getAnalyticsParams(),
    );
  };

  edit = () => {
    const { onModeChange } = this.props;
    Analytics.trackEvent(MetaMetricsEvents.TRANSACTIONS_EDIT_TRANSACTION);
    onModeChange && onModeChange('edit');
  };

  onEditPermissionSetAmount = () => {
    const {
      token: { tokenDecimals },
      spenderAddress,
      spendLimitUnlimitedSelected,
      originalApproveAmount,
      spendLimitCustomValue,
      transaction,
    } = this.state;

    try {
      const { setTransactionObject } = this.props;
      const newApprovalTransaction = generateTxWithNewTokenAllowance(
        spendLimitUnlimitedSelected
          ? originalApproveAmount
          : spendLimitCustomValue,
        tokenDecimals,
        spenderAddress,
        transaction,
      );

      const { encodedAmount } = decodeApproveData(newApprovalTransaction.data);

      const approveAmount = fromTokenMinimalUnit(
        hexToBN(encodedAmount),
        tokenDecimals,
      );

      this.setState({ customSpendAmount: approveAmount });
      setTransactionObject({
        ...newApprovalTransaction,
        transaction: {
          ...newApprovalTransaction.transaction,
          data: newApprovalTransaction.data,
        },
      });
    } catch (err) {
      Logger.log('Failed to setTransactionObject', err);
    }
    this.toggleEditPermission();
    AnalyticsV2.trackEvent(
      MetaMetricsEvents.APPROVAL_PERMISSION_UPDATED,
      this.getAnalyticsParams(),
    );
  };

  renderEditPermission = () => {
    const {
      host,
      spendLimitUnlimitedSelected,
      spendLimitCustomValue,
      originalApproveAmount,
      token: { tokenSymbol, tokenDecimals },
    } = this.state;
    const minimumSpendLimit = minimumTokenAllowance(tokenDecimals);

    return (
      <EditPermission
        host={host}
        minimumSpendLimit={minimumSpendLimit}
        spendLimitUnlimitedSelected={spendLimitUnlimitedSelected}
        tokenSymbol={tokenSymbol}
        spendLimitCustomValue={spendLimitCustomValue}
        originalApproveAmount={originalApproveAmount}
        onSetApprovalAmount={this.onEditPermissionSetAmount}
        onSpendLimitCustomValueChange={this.onSpendLimitCustomValueChange}
        onPressSpendLimitUnlimitedSelected={
          this.onPressSpendLimitUnlimitedSelected
        }
        onPressSpendLimitCustomSelected={this.onPressSpendLimitCustomSelected}
        toggleEditPermission={this.toggleEditPermission}
      />
    );
  };

  getStyles = () => {
    const colors = this.context.colors || mockTheme.colors;
    return createStyles(colors);
  };

  renderDetails = () => {
    const {
      originalApproveAmount,
      customSpendAmount,
      host,
      multiLayerL1FeeTotal,
      token: {
        tokenStandard,
        tokenSymbol,
        tokenName,
        tokenValue,
        tokenDecimals,
        tokenBalance,
      },
      spenderAddress,
      customSpendValue,
      fetchingUpdateDone,
      spendLimitCreated,
    } = this.state;

    const {
      accounts,
      selectedAddress,
      primaryCurrency,
      tokenBalances,
      gasError,
      activeTabUrl,
      transaction: { origin, from, to },
      network,
      over,
      gasEstimateType,
      onUpdatingValuesStart,
      onUpdatingValuesEnd,
      animateOnChange,
      isAnimating,
      gasEstimationReady,
      transactionConfirmed,
      gasSelected,
      legacyGasObject,
      eip1559GasObject,
      updateTransactionState,
      showBlockExplorer,
      showVerifyContractDetails,
      providerType,
      providerRpcTarget,
      frequentRpcList,
      isNativeTokenBuySupported,
    } = this.props;
    const styles = this.getStyles();
    const isTestNetwork = isTestNet(network);

    const originIsDeeplink =
      origin === ORIGIN_DEEPLINK || origin === ORIGIN_QR_CODE;
    const errorPress = isTestNetwork ? this.goToFaucet : this.buyEth;
    const errorLinkText = isTestNetwork
      ? strings('transaction.go_to_faucet')
      : strings('transaction.buy_more');

    const showFeeMarket =
      !gasEstimateType ||
      gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET ||
      gasEstimateType === GAS_ESTIMATE_TYPES.NONE;

    const hasBlockExplorer = shouldShowBlockExplorer({
      providerType,
      providerRpcTarget,
      frequentRpcList,
    });

    const tokenLabel = `${
      tokenName || tokenSymbol || strings(`spend_limit_edition.nft`)
    } (#${tokenValue})`;

    return (
      <>
        <View style={styles.section} testID={'approve-modal-test-id'}>
          <View style={styles.actionViewWrapper}>
            <ActionView
              confirmButtonMode="confirm"
              cancelText={strings('transaction.reject')}
              confirmText={
                tokenStandard === ERC20 && !spendLimitCreated
                  ? strings('transaction.next')
                  : strings('transactions.approve')
              }
              onCancelPress={this.onCancelPress}
              onConfirmPress={this.onConfirmPress}
              confirmDisabled={
                !customSpendValue || Boolean(gasError) || transactionConfirmed
              }
            >
              <View>
                {from && (
                  <ApproveTransactionHeader
                    origin={origin}
                    url={activeTabUrl}
                    from={from}
                    asset={{
                      address: to,
                      symbol: tokenSymbol,
                      decimals: tokenDecimals,
                      standard: tokenStandard,
                    }}
                  />
                )}
                <Text
                  variant={TextVariant.HeadingMD}
                  style={styles.title}
                  testID={'allow-access'}
                >
                  {strings(
                    `spend_limit_edition.${
                      originIsDeeplink
                        ? 'allow_to_address_access'
                        : spendLimitCreated
                        ? 'review_spend_cap'
                        : 'set_spend_cap'
                    }`,
                  )}
                  {'\n'}
                  {!fetchingUpdateDone && (
                    <Text variant={TextVariant.HeadingMD}>
                      {strings('spend_limit_edition.token')}
                    </Text>
                  )}
                  {tokenStandard === ERC20 && (
                    <Text variant={TextVariant.HeadingMD}>{tokenSymbol}</Text>
                  )}
                      {tokenStandard === ERC721 || tokenStandard === ERC1155 ? (
                    hasBlockExplorer ? (
                      <ButtonLink
                        onPress={showBlockExplorer}
                        label={
                          <Text
                            variant={TextVariant.HeadingMD}
                            style={styles.buttonColor}
                          >
                            {tokenLabel}
                          </Text>
                        }
                      />
                    ) : (
                      <Text variant={TextVariant.HeadingMD}>{tokenLabel}</Text>
                    )
                  ) : null}
                   </Text>

                {tokenStandard !== ERC721 &&
                  tokenStandard !== ERC1155 &&
                  originalApproveAmount && (
                    <View style={styles.tokenAccess}>
                      <Text bold style={styles.tokenKey}>
                        {` ${strings('spend_limit_edition.access_up_to')} `}
                      </Text>
                      <Text numberOfLines={4} style={styles.tokenValue}>
                        {` ${
                          customSpendAmount
                            ? formatNumber(customSpendAmount)
                            : originalApproveAmount &&
                              formatNumber(originalApproveAmount)
                        } ${tokenSymbol}`}
                      </Text>
                    </View>
                  )}

                {fetchingUpdateDone &&
                  tokenStandard !== ERC721 &&
                  tokenStandard !== ERC1155 && (
                    <TouchableOpacity
                      style={styles.actionTouchable}
                      onPress={this.toggleEditPermission}
                    >
                      <Text reset style={styles.editPermissionText}>
                        {strings('spend_limit_edition.edit_permission')}
                      </Text>
                    </TouchableOpacity>
                  )}
                <Text reset style={styles.explanation}>
                  {`${strings(
                    `spend_limit_edition.${
                      originIsDeeplink
                        ? 'you_trust_this_address'
                        : 'you_trust_this_site'
                    }`,
                  )}`}
                </Text>
                {(tokenStandard === ERC721 || tokenStandard === ERC1155) && (
                  <Text reset style={styles.explanation}>
                    {`${strings(
                      `spend_limit_edition.${
                        originIsDeeplink
                          ? 'you_trust_this_address'
                          : 'you_trust_this_site'
                      }`,
                    )}`}
                  </Text>
                )}
                <ButtonLink
                  variant={TextVariant.BodyMD}
                  onPress={showVerifyContractDetails}
                  style={styles.verifyContractLink}
                  label={strings(
                    'contract_allowance.token_allowance.verify_third_party_details',
                  )}
                />
                <View style={styles.paddingHorizontal}>
                  <View style={styles.section}>
                    {tokenStandard === undefined ? (
                      <SkeletonText style={styles.skeletalView} />
                    ) : tokenStandard === ERC20 ? (
                      <>
                        <CustomSpendCap
                          ticker={tokenSymbol}
                          dappProposedValue={originalApproveAmount}
                          accountBalance={tokenBalance}
                          domain={host}
                          disableEdit={spendLimitCreated}
                          editValue={this.goBackToSpendLimit}
                          onInputChanged={(value) =>
                            this.setState({ customSpendValue: value })
                          }
                        />
                        {spendLimitCreated && (
                          <View style={styles.transactionWrapper}>
                            <TransactionReview
                              gasSelected={gasSelected}
                              primaryCurrency={primaryCurrency}
                              hideTotal
                              noMargin
                              onEdit={this.edit}
                              chainId={this.props.chainId}
                              onUpdatingValuesStart={onUpdatingValuesStart}
                              onUpdatingValuesEnd={onUpdatingValuesEnd}
                              animateOnChange={animateOnChange}
                              isAnimating={isAnimating}
                              gasEstimationReady={gasEstimationReady}
                              legacy={!showFeeMarket}
                              gasObject={
                                !showFeeMarket
                                  ? legacyGasObject
                                  : eip1559GasObject
                              }
                              updateTransactionState={updateTransactionState}
                              onlyGas
                              multiLayerL1FeeTotal={multiLayerL1FeeTotal}
                            />
                          </View>
                        )}
                      </>
                    ) : (
                      <TransactionReview
                        gasSelected={gasSelected}
                        primaryCurrency={primaryCurrency}
                        hideTotal
                        noMargin
                        onEdit={this.edit}
                        chainId={this.props.chainId}
                        onUpdatingValuesStart={onUpdatingValuesStart}
                        onUpdatingValuesEnd={onUpdatingValuesEnd}
                        animateOnChange={animateOnChange}
                        isAnimating={isAnimating}
                        gasEstimationReady={gasEstimationReady}
                        legacy={!showFeeMarket}
                        gasObject={
                          !showFeeMarket ? legacyGasObject : eip1559GasObject
                        }
                        updateTransactionState={updateTransactionState}
                        onlyGas
                        multiLayerL1FeeTotal={multiLayerL1FeeTotal}
                      />
                    )}
                    {gasError && (
                      <View style={styles.errorWrapper}>
                        {isTestNetwork || isNativeTokenBuySupported ? (
                          <TouchableOpacity onPress={errorPress}>
                            <Text reset style={styles.error}>
                              {gasError}
                            </Text>

                            {over && (
                              <Text
                                reset
                                style={[styles.error, styles.underline]}
                              >
                                {errorLinkText}
                              </Text>
                            )}
                          </TouchableOpacity>
                        ) : (
                          <Text reset style={styles.error}>
                            {gasError}
                          </Text>
                        )}
                      </View>
                    )}
                    {!gasError && (
                      <TouchableOpacity
                        style={styles.actionTouchable}
                        onPress={this.toggleViewDetails}
                      >
                        <View style={styles.iconContainer}>
                          <Text reset style={styles.viewDetailsText}>
                            {strings(
                              'spend_limit_edition.view_transaction_details',
                            )}
                          </Text>
                          <IonicIcon
                            name="ios-arrow-down"
                            size={16}
                            style={styles.iconDropdown}
                          />
                        </View>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            </ActionView>
          </View>
        </View>
      </>
    );
  };

  renderTransactionReview = () => {
    const { nickname, nicknameExists } = this.props;
    const {
      host,
      method,
      viewData,
      originalApproveAmount,
      spendLimitUnlimitedSelected,
      spendLimitCustomValue,
      token: { tokenStandard, tokenSymbol, tokenValue, tokenName },
    } = this.state;
    const {
      transaction: { to, data },
    } = this.props;
    const allowance =
      (!spendLimitUnlimitedSelected && spendLimitCustomValue) ||
      originalApproveAmount;
    return (
      <TransactionReviewDetailsCard
        toggleViewDetails={this.toggleViewDetails}
        toggleViewData={this.toggleViewData}
        copyContractAddress={this.copyContractAddress}
        nickname={nickname}
        nicknameExists={nicknameExists}
        address={to}
        host={host}
        allowance={allowance}
        tokenSymbol={tokenSymbol}
        data={data}
        tokenValue={tokenValue}
        tokenName={tokenName}
        tokenStandard={tokenStandard}
        method={method}
        displayViewData={viewData}
      />
    );
  };

  renderVerifyContractDetails = () => {
    const {
      providerType,
      providerRpcTarget,
      savedContactListToArray,
      toggleModal,
      closeVerifyContractDetails,
      frequentRpcList,
    } = this.props;
    const {
      transaction: { to },
      showBlockExplorerModal,
      spenderAddress,
      token: { tokenSymbol },
    } = this.state;

    const toggleBlockExplorerModal = (address) => {
      closeVerifyContractDetails();
      this.setState({
        showBlockExplorerModal: !showBlockExplorerModal,
        address,
      });
    };

    // console.log('spenderAddress', to)
    const showNickname = (address) => {
      toggleModal(address);
    };

    return (
      <VerifyContractDetails
        closeVerifyContractView={closeVerifyContractDetails}
        toggleBlockExplorer={toggleBlockExplorerModal}
        contractAddress={spenderAddress}
        tokenAddress={to}
        showNickname={showNickname}
        savedContactListToArray={savedContactListToArray}
        copyAddress={this.copyContractAddress}
        providerType={providerType}
        tokenSymbol={tokenSymbol}
        providerRpcTarget={providerRpcTarget}
        frequentRpcList={frequentRpcList}
        tokenStandard={this.state.token?.tokenStandard}
      />
    );
  };

  renderBlockExplorerView = () => {
    const {
      providerType,
      showVerifyContractDetails,
      frequentRpcList,
      providerRpcTarget,
    } = this.props;
    const { showBlockExplorerModal, address } = this.state;

    const styles = this.getStyles();
    const closeModal = () => {
      showVerifyContractDetails();
      this.setState({
        showBlockExplorerModal: !showBlockExplorerModal,
      });
    };

    return (
      <ShowBlockExplorer
        setIsBlockExplorerVisible={closeModal}
        type={providerType}
        address={address}
        headerWrapperStyle={styles.headerWrapper}
        headerTextStyle={styles.headerText}
        iconStyle={styles.icon}
        providerRpcTarget={providerRpcTarget}
        frequentRpcList={frequentRpcList}
      />
    );
  };

  buyEth = () => {
    const { navigation } = this.props;
    /* this is kinda weird, we have to reject the transaction to collapse the modal */
    this.onCancelPress();
    try {
      navigation.navigate('FiatOnRampAggregator');
    } catch (error) {
      Logger.error(error, 'Navigation: Error when navigating to buy ETH.');
    }
    InteractionManager.runAfterInteractions(() => {
      Analytics.trackEvent(MetaMetricsEvents.RECEIVE_OPTIONS_PAYMENT_REQUEST);
    });
  };

  onCancelPress = () => {
    const { onCancel } = this.props;
    onCancel && onCancel();
  };

  onConfirmPress = () => {
    const {
      spendLimitCreated,
      token: { tokenStandard },
    } = this.state;
    const { onConfirm } = this.props;

    if (tokenStandard === ERC20 && !spendLimitCreated) {
      return this.setState({ spendLimitCreated: true });
    }

    if (tokenStandard === ERC20 && spendLimitCreated) {
      return onConfirm && onConfirm();
    }

    return onConfirm && onConfirm();
  };

  goToFaucet = () => {
    InteractionManager.runAfterInteractions(() => {
      this.onCancelPress();
      this.props.navigation.navigate(Routes.BROWSER.VIEW, {
        newTabUrl: AppConstants.URLS.MM_FAUCET,
        timestamp: Date.now(),
      });
    });
  };

  renderQRDetails() {
    const { host, spenderAddress } = this.state;
    const {
      activeTabUrl,
      transaction: { origin, from },
      QRState,
    } = this.props;
    const styles = this.getStyles();
    return (
      <View style={styles.actionViewQRObject} testID={'qr-details'}>
        <TransactionHeader
          currentPageInformation={{
            origin,
            spenderAddress,
            title: host,
            url: activeTabUrl,
          }}
        />
        <QRSigningDetails
          QRState={QRState}
          tighten
          showHint={false}
          showCancelButton
          bypassAndroidCameraAccessCheck={false}
          fromAddress={from}
        />
      </View>
    );
  }

  render = () => {
    const { viewDetails, editPermissionVisible, showBlockExplorerModal } =
      this.state;
    const { isSigningQRObject, shouldVerifyContractDetails } = this.props;

    return (
      <View>
        {viewDetails
          ? this.renderTransactionReview()
          : shouldVerifyContractDetails
          ? this.renderVerifyContractDetails()
          : showBlockExplorerModal
          ? this.renderBlockExplorerView()
          : editPermissionVisible
          ? this.renderEditPermission()
          : isSigningQRObject
          ? this.renderQRDetails()
          : this.renderDetails()}
      </View>
    );
  };
}

const mapStateToProps = (state) => ({
  accounts: state.engine.backgroundState.AccountTrackerController.accounts,
  ticker: selectTicker(state),
  frequentRpcList:
    state.engine.backgroundState.PreferencesController.frequentRpcList,
  selectedAddress:
    state.engine.backgroundState.PreferencesController.selectedAddress,
  provider: state.engine.backgroundState.NetworkController.provider,
  transaction: getNormalizedTxState(state),
  accountsLength: Object.keys(
    state.engine.backgroundState.AccountTrackerController.accounts || {},
  ).length,
  tokensLength: state.engine.backgroundState.TokensController.tokens.length,
  providerType: selectProviderType(state),
  tokenBalances:
    state.engine.backgroundState.TokenBalancesController.contractBalances,
  providerRpcTarget: selectRpcTarget(state),
  primaryCurrency: state.settings.primaryCurrency,
  activeTabUrl: getActiveTabUrl(state),
  network: selectNetwork(state),
  chainId: selectChainId(state),
  tokenList: getTokenList(state),
  isNativeTokenBuySupported: isNetworkBuyNativeTokenSupported(
    selectChainId(state),
    getRampNetworks(state),
  ),
  tokenBalances: state.engine.backgroundState.TokenBalancesController.contractBalances,
});

const mapDispatchToProps = (dispatch) => ({
  setTransactionObject: (transaction) =>
    dispatch(setTransactionObject(transaction)),
  showAlert: (config) => dispatch(showAlert(config)),
});

ApproveTransactionReview.contextType = ThemeContext;

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(withNavigation(withQRHardwareAwareness(ApproveTransactionReview)));
