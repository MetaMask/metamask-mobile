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
  getAddressAccountType,
  getTokenDetails,
  shouldShowBlockExplorer,
} from '../../../util/address';
import Engine from '../../../core/Engine';
import { strings } from '../../../../locales/i18n';
import { setTransactionObject } from '../../../actions/transaction';
import { GAS_ESTIMATE_TYPES } from '@metamask/gas-fee-controller';
import {
  fromTokenMinimalUnit,
  hexToBN,
  isNumber,
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
  generateApproveData,
} from '../../../util/transactions';
import Avatar, {
  AvatarSize,
  AvatarVariants,
} from '../../../component-library/components/Avatars/Avatar';
import Identicon from '../../UI/Identicon';
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
  isMainnetByChainId,
} from '../../../util/networks';
import CustomSpendCap from '../../../component-library/components-temp/CustomSpendCap';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import Logger from '../../../util/Logger';
import ButtonLink from '../../../component-library/components/Buttons/Button/variants/ButtonLink';
import TransactionReview from '../../UI/TransactionReview/TransactionReviewEIP1559Update';
import ClipboardManager from '../../../core/ClipboardManager';
import { ThemeContext, mockTheme } from '../../../util/theme';
import withQRHardwareAwareness from '../QRHardware/withQRHardwareAwareness';
import QRSigningDetails from '../QRHardware/QRSigningDetails';
import Routes from '../../../constants/navigation/Routes';
import createStyles from './styles';
import {
  selectChainId,
  selectNetwork,
  selectProviderType,
  selectTicker,
  selectRpcTarget,
} from '../../../selectors/networkController';
import { selectTokenList } from '../../../selectors/tokenListController';
import { selectTokensLength } from '../../../selectors/tokensController';
import { selectAccountsLength } from '../../../selectors/accountTrackerController';
import { selectFrequentRpcList } from '../../../selectors/preferencesController';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import ApproveTransactionHeader from '../ApproveTransactionHeader';
import VerifyContractDetails from './VerifyContractDetails/VerifyContractDetails';
import ShowBlockExplorer from './ShowBlockExplorer';
import { isNetworkBuyNativeTokenSupported } from '../Ramp/utils';
import { getRampNetworks } from '../../../reducers/fiatOrders';
import SkeletonText from '../Ramp/components/SkeletonText';
import InfoModal from '../../../components/UI/Swaps/components/InfoModal';

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
    /**
     * Function to update token allowance state in Approve component
     */
    updateTokenAllowanceState: PropTypes.func,
    /**
     * Token allowance state from Approve component
     */
    tokenAllowanceState: PropTypes.object,
    /**
     * Boolean that indicates gas estimated value is confirmed before approving
     */
    isGasEstimateStatusIn: PropTypes.bool,
  };

  state = {
    viewData: false,
    host: undefined,
    originalApproveAmount: undefined,
    spendLimitCustomValue: undefined,
    ticker: getTicker(this.props.ticker),
    viewDetails: false,
    spenderAddress: '0x...',
    transaction: this.props.transaction,
    token: {},
    isReadyToApprove: false,
    tokenSpendValue: '',
    showGasTooltip: false,
    gasTransactionObject: {},
    multiLayerL1FeeTotal: '0x0',
    fetchingUpdateDone: false,
    showBlockExplorerModal: false,
    address: '',
    isCustomSpendInputValid: true,
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
      transaction: { origin, to, data, from, transaction },
      setTransactionObject,
      tokenList,
      tokenAllowanceState,
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

    let tokenSymbol,
      tokenDecimals,
      tokenName,
      tokenStandard,
      tokenBalance,
      createdSpendCap;

    const { spenderAddress, encodedAmount: encodedHexAmount } =
      decodeApproveData(data);
    const encodedDecimalAmount = hexToBN(encodedHexAmount).toString();

    const erc20TokenBalance = await TokenBalancesController.getERC20BalanceOf(
      to,
      from,
    );

    const contract = tokenList[safeToChecksumAddress(to)];

    if (tokenAllowanceState) {
      const {
        tokenSymbol: symbol,
        tokenDecimals: decimals,
        tokenName: name,
        tokenBalance: balance,
        tokenStandard: standard,
        isReadyToApprove,
      } = tokenAllowanceState;
      tokenSymbol = symbol;
      tokenDecimals = decimals;
      tokenName = name;
      tokenBalance = balance;
      tokenStandard = standard;
      createdSpendCap = isReadyToApprove;
    } else if (!contract) {
      try {
        const result = await getTokenDetails(to, from, encodedDecimalAmount);

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
          tokenBalance = renderFromTokenMinimalUnit(
            erc20TokenBalance,
            decimals,
          );
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
      hexToBN(encodedHexAmount),
      tokenDecimals,
    );

    const { name: method } = await getMethodData(data);
    const minTokenAllowance = minimumTokenAllowance(tokenDecimals);

    const approvalData = generateApproveData({
      spender: spenderAddress,
      value:
        tokenStandard === ERC721 || tokenStandard === ERC1155
          ? encodedHexAmount
          : '0',
    });

    setTransactionObject({
      transaction: {
        ...transaction,
        data: approvalData,
      },
    });

    const token = Object.values(tokenList).filter(
      (token) => token.address === to,
    );

    this.setState(
      {
        host,
        method,
        originalApproveAmount: approveAmount,
        token: {
          tokenSymbol,
          tokenDecimals,
          tokenName,
          tokenValue: encodedDecimalAmount,
          tokenStandard,
          tokenBalance,
          tokenImage: token[0]?.iconUrl,
        },
        spenderAddress,
        encodedHexAmount,
        fetchingUpdateDone: true,
        isReadyToApprove: createdSpendCap,
        tokenSpendValue: tokenAllowanceState
          ? tokenAllowanceState?.tokenSpendValue
          : '',
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

  componentDidUpdate = (_, prevState) => {
    const { transaction, setTransactionObject } = this.props;
    const {
      tokenSpendValue,
      spenderAddress,
      token: { tokenDecimals },
    } = this.state;

    if (prevState?.tokenSpendValue !== tokenSpendValue) {
      const newApprovalTransaction = generateTxWithNewTokenAllowance(
        tokenSpendValue || '0',
        tokenDecimals,
        spenderAddress,
        transaction,
      );

      setTransactionObject({
        ...newApprovalTransaction,
        transaction: {
          ...newApprovalTransaction.transaction,
          data: newApprovalTransaction.data,
        },
      });
    }
  };

  componentWillUnmount = async () => {
    clearInterval(intervalIdForEstimatedL1Fee);
  };

  getAnalyticsParams = () => {
    try {
      const { activeTabUrl, chainId, transaction, onSetAnalyticsParams } =
        this.props;
      const {
        token: { tokenSymbol },
        originalApproveAmount,
        encodedHexAmount,
      } = this.state;
      const isDapp = !Object.values(AppConstants.DEEPLINKS).includes(
        transaction?.origin,
      );
      const unlimited = encodedHexAmount === UINT256_HEX_MAX_VALUE;
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
    const { onModeChange, updateTokenAllowanceState } = this.props;
    const {
      token: {
        tokenName,
        tokenStandard,
        tokenSymbol,
        tokenDecimals,
        tokenBalance,
      },
      tokenSpendValue,
      originalApproveAmount,
    } = this.state;
    Analytics.trackEvent(MetaMetricsEvents.TRANSACTIONS_EDIT_TRANSACTION);

    updateTokenAllowanceState({
      tokenStandard,
      isReadyToApprove: true,
      tokenSpendValue,
      tokenBalance,
      tokenSymbol,
      originalApproveAmount,
      tokenDecimals,
      tokenName,
    });
    onModeChange && onModeChange('edit');
  };

  openLinkAboutGas = () =>
    Linking.openURL(AppConstants.URLS.WHY_TRANSACTION_TAKE_TIME);

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

  getStyles = () => {
    const colors = this.context.colors || mockTheme.colors;
    return createStyles(colors);
  };

  goToSpendCap = () => this.setState({ isReadyToApprove: false });

  handleSetIsCustomSpendInputValid = (value) => {
    this.setState({ isCustomSpendInputValid: value });
  };

  toggleLearnMoreWebPage = (url) => {
    this.setState({
      showBlockExplorerModal: !this.state.showBlockExplorerModal,
      learnMoreURL: url,
    });
  };

  handleCustomSpendOnInputChange = (value) => {
    if (isNumber(value)) {
      this.setState({
        tokenSpendValue: value.replace(/[^0-9.]/g, ''),
      });
    }
  };

  renderDetails = () => {
    const {
      originalApproveAmount,
      multiLayerL1FeeTotal,
      token: {
        tokenStandard,
        tokenSymbol,
        tokenName,
        tokenValue,
        tokenDecimals,
        tokenBalance,
        tokenImage,
      },
      tokenSpendValue,
      fetchingUpdateDone,
      isReadyToApprove,
      isCustomSpendInputValid,
    } = this.state;

    const {
      primaryCurrency,
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
      isGasEstimateStatusIn,
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

    const isERC2OToken = tokenStandard === ERC20;
    const isNonERC20Token = tokenStandard !== ERC20;
    const isERC20SpendCapScreenWithoutValue = isERC2OToken && !tokenSpendValue;

    const shouldDisableConfirmButton =
      !fetchingUpdateDone ||
      isERC20SpendCapScreenWithoutValue ||
      Boolean(gasError) ||
      transactionConfirmed ||
      (!isCustomSpendInputValid && isERC2OToken) ||
      (isNonERC20Token && !isGasEstimateStatusIn);

    const confirmText =
      isERC2OToken && !isReadyToApprove
        ? strings('transaction.next')
        : strings('transactions.approve');

    return (
      <>
        <View style={styles.section} testID={'approve-modal-test-id'}>
          <View style={styles.actionViewWrapper}>
            <ActionView
              confirmButtonMode="confirm"
              cancelText={strings('transaction.reject')}
              confirmText={confirmText}
              onCancelPress={this.onCancelPress}
              onConfirmPress={this.onConfirmPress}
              confirmDisabled={shouldDisableConfirmButton}
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
                        : tokenStandard === ERC721 || tokenStandard === ERC1155
                        ? 'allow_to_access'
                        : 'spend_cap'
                    }`,
                  )}
                </Text>
                <View style={styles.tokenContainer}>
                  {!fetchingUpdateDone && (
                    <Text
                      variant={TextVariant.HeadingMD}
                      style={styles.alignText}
                    >
                      {strings('spend_limit_edition.token')}
                    </Text>
                  )}
                  {isERC2OToken && (
                    <>
                      {tokenImage ? (
                        <Avatar
                          variant={AvatarVariants.Token}
                          size={AvatarSize.Md}
                          imageSource={{ uri: tokenImage }}
                        />
                      ) : (
                        <Identicon address={to} diameter={25} />
                      )}
                      <Text
                        variant={TextVariant.HeadingMD}
                        style={styles.symbol}
                      >
                        {tokenSymbol}
                      </Text>
                    </>
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
                </View>
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
                    {!tokenStandard ? (
                      <SkeletonText style={styles.skeletalView} />
                    ) : (
                      isERC2OToken && (
                        <CustomSpendCap
                          ticker={tokenSymbol}
                          dappProposedValue={originalApproveAmount}
                          tokenSpendValue={tokenSpendValue}
                          accountBalance={tokenBalance}
                          tokenDecimal={tokenDecimals}
                          toggleLearnMoreWebPage={this.toggleLearnMoreWebPage}
                          isEditDisabled={Boolean(isReadyToApprove)}
                          editValue={this.goToSpendCap}
                          onInputChanged={this.handleCustomSpendOnInputChange}
                          isInputValid={this.handleSetIsCustomSpendInputValid}
                        />
                      )
                    )}
                    {((isERC2OToken && isReadyToApprove) ||
                      tokenStandard === ERC721 ||
                      tokenStandard === ERC1155) && (
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
                            !showFeeMarket ? legacyGasObject : eip1559GasObject
                          }
                          updateTransactionState={updateTransactionState}
                          onlyGas
                          multiLayerL1FeeTotal={multiLayerL1FeeTotal}
                        />
                      </View>
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
      tokenSpendValue,
      token: { tokenStandard, tokenSymbol, tokenValue, tokenName },
    } = this.state;
    const {
      transaction: { to, data },
    } = this.props;
    return (
      <TransactionReviewDetailsCard
        toggleViewDetails={this.toggleViewDetails}
        toggleViewData={this.toggleViewData}
        copyContractAddress={this.copyContractAddress}
        nickname={nickname}
        nicknameExists={nicknameExists}
        address={to}
        host={host}
        tokenSpendValue={tokenSpendValue}
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
    const { showBlockExplorerModal, address, learnMoreURL } = this.state;

    const styles = this.getStyles();
    const closeModal = () => {
      !learnMoreURL && showVerifyContractDetails();
      this.setState({
        showBlockExplorerModal: !showBlockExplorerModal,
        learnMoreURL: null,
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
        learnMoreURL={learnMoreURL}
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
      isReadyToApprove,
      token: { tokenStandard },
    } = this.state;
    const { onConfirm } = this.props;

    if (tokenStandard === ERC20 && !isReadyToApprove) {
      AnalyticsV2.trackEvent(
        MetaMetricsEvents.APPROVAL_PERMISSION_UPDATED,
        this.getAnalyticsParams(),
      );
      return this.setState({ isReadyToApprove: true });
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
    const { viewDetails, showBlockExplorerModal } = this.state;
    const { isSigningQRObject, shouldVerifyContractDetails } = this.props;

    return (
      <View>
        {viewDetails
          ? this.renderTransactionReview()
          : shouldVerifyContractDetails
          ? this.renderVerifyContractDetails()
          : showBlockExplorerModal
          ? this.renderBlockExplorerView()
          : isSigningQRObject
          ? this.renderQRDetails()
          : this.renderDetails()}
      </View>
    );
  };
}

const mapStateToProps = (state) => ({
  ticker: selectTicker(state),
  frequentRpcList: selectFrequentRpcList(state),
  transaction: getNormalizedTxState(state),
  tokensLength: selectTokensLength(state),
  accountsLength: selectAccountsLength(state),
  providerType: selectProviderType(state),
  providerRpcTarget: selectRpcTarget(state),
  primaryCurrency: state.settings.primaryCurrency,
  activeTabUrl: getActiveTabUrl(state),
  network: selectNetwork(state),
  chainId: selectChainId(state),
  tokenList: selectTokenList(state),
  isNativeTokenBuySupported: isNetworkBuyNativeTokenSupported(
    selectChainId(state),
    getRampNetworks(state),
  ),
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
