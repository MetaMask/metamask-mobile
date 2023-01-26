import React, { PureComponent } from 'react';
import {
  View,
  TouchableOpacity,
  InteractionManager,
  Linking,
} from 'react-native';
import Eth from 'ethjs-query';
import ActionView from '../../UI/ActionView';
import PropTypes from 'prop-types';
import { getApproveNavbar } from '../../UI/Navbar';
import { connect } from 'react-redux';
import { getHost } from '../../../util/browser';
import {
  safeToChecksumAddress,
  renderShortAddress,
  getAddressAccountType,
} from '../../../util/address';
import Engine from '../../../core/Engine';
import { strings } from '../../../../locales/i18n';
import { setTransactionObject } from '../../../actions/transaction';
import { GAS_ESTIMATE_TYPES } from '@metamask/gas-fee-controller';
import { hexToBN } from '@metamask/controller-utils';
import { fromTokenMinimalUnit } from '../../../util/number';
import EthereumAddress from '../EthereumAddress';
import {
  getTicker,
  getNormalizedTxState,
  getActiveTabUrl,
  getMethodData,
  decodeApproveData,
  generateTxWithNewTokenAllowance,
  minimumTokenAllowance,
} from '../../../util/transactions';
import Feather from 'react-native-vector-icons/Feather';
import Identicon from '../../UI/Identicon';
import { showAlert } from '../../../actions/alert';
import Analytics from '../../../core/Analytics/Analytics';
import { MetaMetricsEvents } from '../../../core/Analytics';
import AnalyticsV2 from '../../../util/analyticsV2';
import TransactionHeader from '../../UI/TransactionHeader';
import AccountInfoCard from '../../UI/AccountInfoCard';
import TransactionReviewDetailsCard from '../../UI/TransactionReview/TransactionReviewDetailsCard';
import AppConstants from '../../../core/AppConstants';
import { UINT256_HEX_MAX_VALUE } from '../../../constants/transaction';
import { WALLET_CONNECT_ORIGIN } from '../../../util/walletconnect';
import { withNavigation } from '@react-navigation/compat';
import {
  isTestNet,
  isMainnetByChainId,
  isMultiLayerFeeNetwork,
  fetchEstimatedMultiLayerL1Fee,
} from '../../../util/networks';
import EditPermission from './EditPermission';
import Logger from '../../../util/Logger';
import InfoModal from '../Swaps/components/InfoModal';
import Text from '../../Base/Text';
import { getTokenList } from '../../../reducers/tokens';
import TransactionReview from '../../UI/TransactionReview/TransactionReviewEIP1559Update';
import ClipboardManager from '../../../core/ClipboardManager';
import { ThemeContext, mockTheme } from '../../../util/theme';
import withQRHardwareAwareness from '../QRHardware/withQRHardwareAwareness';
import QRSigningDetails from '../QRHardware/QRSigningDetails';
import Routes from '../../../constants/navigation/Routes';
import formatNumber from '../../../util/formatNumber';
import { allowedToBuy } from '../FiatOnRampAggregator';
import { MM_SDK_REMOTE_ORIGIN } from '../../../core/SDKConnect';
import createStyles from './styles';

const { ORIGIN_DEEPLINK, ORIGIN_QR_CODE } = AppConstants.DEEPLINKS;
const POLLING_INTERVAL_ESTIMATED_L1_FEE = 30000;

let intervalIdForEstimatedL1Fee;

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
     * Update contract nickname
     */
    onUpdateContractNickname: PropTypes.func,
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
  };

  state = {
    viewData: false,
    editPermissionVisible: false,
    host: undefined,
    originalApproveAmount: undefined,
    customSpendAmount: null,
    tokenSymbol: undefined,
    spendLimitUnlimitedSelected: true,
    spendLimitCustomValue: undefined,
    ticker: getTicker(this.props.ticker),
    viewDetails: false,
    spenderAddress: '0x...',
    transaction: this.props.transaction,
    token: {},
    showGasTooltip: false,
    gasTransactionObject: {},
    multiLayerL1FeeTotal: '0x0',
  };

  customSpendLimitInput = React.createRef();
  originIsWalletConnect = this.props.transaction.origin?.startsWith(
    WALLET_CONNECT_ORIGIN,
  );

  originIsMMSDKRemoteConn =
    this.props.transaction.origin?.startsWith(MM_SDK_REMOTE_ORIGIN);

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
      transaction: { origin, to, data },
      tokenList,
    } = this.props;
    const { AssetsContractController } = Engine.context;

    let host;

    if (this.originIsWalletConnect) {
      host = getHost(origin.split(WALLET_CONNECT_ORIGIN)[1]);
    } else if (this.originIsMMSDKRemoteConn) {
      host = origin.split(MM_SDK_REMOTE_ORIGIN)[1];
    } else {
      host = getHost(origin);
    }

    let tokenSymbol, tokenDecimals;
    const contract = tokenList[safeToChecksumAddress(to)];
    if (!contract) {
      try {
        tokenDecimals = await AssetsContractController.getERC20TokenDecimals(
          to,
        );
        tokenSymbol = await AssetsContractController.getERC721AssetSymbol(to);
      } catch (e) {
        tokenSymbol = 'ERC20 Token';
        tokenDecimals = 18;
      }
    } else {
      tokenSymbol = contract.symbol;
      tokenDecimals = contract.decimals;
    }
    const { spenderAddress, encodedAmount } = decodeApproveData(data);
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
        tokenSymbol,
        token: { symbol: tokenSymbol, decimals: tokenDecimals },
        spenderAddress,
        encodedAmount,
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
      const { tokenSymbol, originalApproveAmount, encodedAmount } = this.state;
      const { NetworkController } = Engine.context;
      const { chainId } = NetworkController?.state?.provider || {};
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
    const { token } = this.state;
    const minTokenAllowance = minimumTokenAllowance(token.decimals);
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

  copyContractAddress = async () => {
    const { transaction } = this.props;
    await ClipboardManager.setString(transaction.to);
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
      token,
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
        token.decimals,
        spenderAddress,
        transaction,
      );

      const { encodedAmount } = decodeApproveData(newApprovalTransaction.data);

      const approveAmount = fromTokenMinimalUnit(
        hexToBN(encodedAmount),
        token.decimals,
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

  openLinkAboutGas = () =>
    Linking.openURL(
      'https://community.metamask.io/t/what-is-gas-why-do-transactions-take-so-long/3172',
    );

  toggleGasTooltip = () =>
    this.setState((state) => ({ showGasTooltip: !state.showGasTooltip }));

  renderGasTooltip = () => {
    const isMainnet = isMainnetByChainId(this.props.chainId);
    return (
      <InfoModal
        isVisible={this.state.showGasTooltip}
        title={strings(
          `transaction.gas_education_title${isMainnet ? '_ethereum' : ''}`,
        )}
        toggleModal={this.toggleGasTooltip}
        body={
          <View>
            <Text grey infoModal>
              {strings('transaction.gas_education_1')}
              {strings(
                `transaction.gas_education_2${isMainnet ? '_ethereum' : ''}`,
              )}{' '}
              <Text bold>{strings('transaction.gas_education_3')}</Text>
            </Text>
            <Text grey infoModal>
              {strings('transaction.gas_education_4')}
            </Text>
            <TouchableOpacity onPress={this.openLinkAboutGas}>
              <Text grey link infoModal>
                {strings('transaction.gas_education_learn_more')}
              </Text>
            </TouchableOpacity>
          </View>
        }
      />
    );
  };

  renderEditPermission = () => {
    const {
      host,
      spendLimitUnlimitedSelected,
      tokenSymbol,
      spendLimitCustomValue,
      originalApproveAmount,
      token,
    } = this.state;
    const minimumSpendLimit = minimumTokenAllowance(token.decimals);

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

  toggleDisplay = () => this.props.onUpdateContractNickname();

  renderDetails = () => {
    const {
      host,
      tokenSymbol,
      spenderAddress,
      originalApproveAmount,
      customSpendAmount,
      multiLayerL1FeeTotal,
    } = this.state;
    const {
      primaryCurrency,
      gasError,
      activeTabUrl,
      transaction: { origin, from },
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

    return (
      <>
        <View style={styles.section} testID={'approve-modal-test-id'}>
          <TransactionHeader
            currentPageInformation={{
              origin,
              spenderAddress,
              title: host,
              url: activeTabUrl,
            }}
          />
          <Text reset style={styles.title} testID={'allow-access'}>
            {strings(
              `spend_limit_edition.${
                originIsDeeplink ? 'allow_to_address_access' : 'allow_to_access'
              }`,
              { tokenSymbol },
            )}
          </Text>
          {originalApproveAmount && (
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
          <TouchableOpacity
            style={styles.actionTouchable}
            onPress={this.toggleEditPermission}
          >
            <Text reset style={styles.editPermissionText}>
              {strings('spend_limit_edition.edit_permission')}
            </Text>
          </TouchableOpacity>
          <Text reset style={styles.explanation}>
            {`${strings(
              `spend_limit_edition.${
                originIsDeeplink
                  ? 'you_trust_this_address'
                  : 'you_trust_this_site'
              }`,
            )}`}
          </Text>
          <View style={styles.contactWrapper}>
            <Text>{strings('nickname.contract')}: </Text>
            <TouchableOpacity
              style={styles.addressWrapper}
              onPress={this.copyContractAddress}
              testID={'contract-address'}
            >
              <Identicon address={this.state.transaction.to} diameter={20} />
              {this.props.nicknameExists ? (
                <Text numberOfLines={1} style={styles.address}>
                  {this.props.nickname}
                </Text>
              ) : (
                <EthereumAddress
                  address={this.state.transaction.to}
                  style={styles.address}
                  type={'short'}
                />
              )}
              <Feather name="copy" size={18} style={styles.actionIcon} />
            </TouchableOpacity>
          </View>
          <Text style={styles.nickname} onPress={this.toggleDisplay}>
            {this.props.nicknameExists ? 'Edit' : 'Add'}{' '}
            {strings('nickname.nickname')}
          </Text>
          <View style={styles.actionViewWrapper}>
            <ActionView
              confirmButtonMode="confirm"
              cancelText={strings('transaction.reject')}
              confirmText={strings('transactions.approve')}
              onCancelPress={this.onCancelPress}
              onConfirmPress={this.onConfirmPress}
              confirmDisabled={Boolean(gasError) || transactionConfirmed}
            >
              <View style={styles.paddingHorizontal}>
                <AccountInfoCard fromAddress={from} />
                <View style={styles.section}>
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

                  {gasError && (
                    <View style={styles.errorWrapper}>
                      {isTestNetwork || allowedToBuy(network) ? (
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
                      <View>
                        <Text reset style={styles.viewDetailsText}>
                          {strings('spend_limit_edition.view_details')}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </ActionView>
          </View>
        </View>
        {this.renderGasTooltip()}
      </>
    );
  };

  renderTransactionReview = () => {
    const { nickname, nicknameExists } = this.props;
    const {
      host,
      method,
      viewData,
      tokenSymbol,
      originalApproveAmount,
      spendLimitUnlimitedSelected,
      spendLimitCustomValue,
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
        address={renderShortAddress(to)}
        host={host}
        allowance={allowance}
        tokenSymbol={tokenSymbol}
        data={data}
        method={method}
        displayViewData={viewData}
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
    const { onConfirm } = this.props;
    onConfirm && onConfirm();
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
    const { viewDetails, editPermissionVisible } = this.state;
    const { isSigningQRObject } = this.props;
    return (
      <View>
        {viewDetails
          ? this.renderTransactionReview()
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
  ticker: state.engine.backgroundState.NetworkController.provider.ticker,
  transaction: getNormalizedTxState(state),
  accountsLength: Object.keys(
    state.engine.backgroundState.AccountTrackerController.accounts || {},
  ).length,
  tokensLength: state.engine.backgroundState.TokensController.tokens.length,
  providerType: state.engine.backgroundState.NetworkController.provider.type,
  primaryCurrency: state.settings.primaryCurrency,
  activeTabUrl: getActiveTabUrl(state),
  network: state.engine.backgroundState.NetworkController.network,
  chainId: state.engine.backgroundState.NetworkController.provider.chainId,
  tokenList: getTokenList(state),
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
