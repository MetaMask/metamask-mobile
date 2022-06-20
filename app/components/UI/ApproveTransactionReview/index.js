import React, { PureComponent } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  InteractionManager,
  Linking,
} from 'react-native';
import ActionView from '../../UI/ActionView';
import PropTypes from 'prop-types';
import { getApproveNavbar } from '../../UI/Navbar';
import { fontStyles } from '../../../styles/common';
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
import { GAS_ESTIMATE_TYPES, util } from '@metamask/controllers';
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
import { ANALYTICS_EVENT_OPTS } from '../../../util/analytics';
import AnalyticsV2 from '../../../util/analyticsV2';
import TransactionHeader from '../../UI/TransactionHeader';
import AccountInfoCard from '../../UI/AccountInfoCard';
import TransactionReviewDetailsCard from '../../UI/TransactionReview/TransactionReviewDetailsCard';
import Device from '../../../util/device';
import AppConstants from '../../../core/AppConstants';
import { UINT256_HEX_MAX_VALUE } from '../../../constants/transaction';
import { WALLET_CONNECT_ORIGIN } from '../../../util/walletconnect';
import { withNavigation } from '@react-navigation/compat';
import { isTestNet, isMainnetByChainId } from '../../../util/networks';
import scaling from '../../../util/scaling';
import EditPermission from './EditPermission';
import Logger from '../../../util/Logger';
import InfoModal from '../Swaps/components/InfoModal';
import Text from '../../Base/Text';
import { getTokenList } from '../../../reducers/tokens';
import TransactionReviewEIP1559 from '../../UI/TransactionReview/TransactionReviewEIP1559';
import ClipboardManager from '../../../core/ClipboardManager';
import { ThemeContext, mockTheme } from '../../../util/theme';
import withQRHardwareAwareness from '../QRHardware/withQRHardwareAwareness';
import QRSigningDetails from '../QRHardware/QRSigningDetails';
import Routes from '../../../constants/navigation/Routes';
import formatNumber from '../../../util/formatNumber';

const { hexToBN } = util;
const createStyles = (colors) =>
  StyleSheet.create({
    section: {
      minWidth: '100%',
      width: '100%',
      paddingVertical: 10,
    },
    title: {
      ...fontStyles.bold,
      fontSize: scaling.scale(24),
      textAlign: 'center',
      color: colors.text.default,
      lineHeight: 34,
      marginVertical: 8,
      paddingHorizontal: 16,
    },
    tokenKey: {
      fontSize: 12,
      marginRight: 5,
    },
    tokenValue: {
      fontSize: 12,
      width: '75%',
    },
    explanation: {
      ...fontStyles.normal,
      fontSize: 14,
      textAlign: 'center',
      color: colors.text.default,
      lineHeight: 20,
      paddingHorizontal: 16,
    },
    tokenAccess: {
      alignItems: 'center',
      marginHorizontal: 14,
      flexDirection: 'row',
    },
    editPermissionText: {
      ...fontStyles.bold,
      color: colors.primary.default,
      fontSize: 12,
      lineHeight: 20,
      textAlign: 'center',
      marginVertical: 10,
      borderWidth: 1,
      borderRadius: 20,
      borderColor: colors.primary.default,
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    viewDetailsText: {
      ...fontStyles.normal,
      color: colors.primary.default,
      fontSize: 12,
      lineHeight: 16,
      marginTop: 8,
      textAlign: 'center',
    },
    actionTouchable: {
      flexDirection: 'column',
      alignItems: 'center',
    },
    addressWrapper: {
      backgroundColor: colors.primary.muted,
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 40,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    address: {
      fontSize: 13,
      marginHorizontal: 8,
      color: colors.text.default,
      ...fontStyles.normal,
      maxWidth: 120,
    },
    errorWrapper: {
      marginTop: 12,
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: colors.error.muted,
      borderColor: colors.error.default,
      borderRadius: 8,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    error: {
      color: colors.text.default,
      fontSize: 12,
      lineHeight: 16,
      ...fontStyles.normal,
      textAlign: 'center',
    },
    underline: {
      textDecorationLine: 'underline',
      ...fontStyles.bold,
    },
    actionViewWrapper: {
      height: Device.isMediumDevice() ? 200 : 280,
    },
    actionViewChildren: {
      height: 300,
    },
    actionViewQRObject: {
      height: 648,
    },
    paddingHorizontal: {
      paddingHorizontal: 16,
    },
    contactWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: 15,
    },
    nickname: {
      ...fontStyles.normal,
      textAlign: 'center',
      color: colors.primary.default,
      marginBottom: 10,
    },
    actionIcon: {
      color: colors.primary.default,
    },
  });

const { ORIGIN_DEEPLINK, ORIGIN_QR_CODE } = AppConstants.DEEPLINKS;

/**
 * PureComponent that manages ERC20 approve from the dapp browser
 */
class ApproveTransactionReview extends PureComponent {
  static navigationOptions = ({ navigation }) =>
    getApproveNavbar('approve.title', navigation);

  static propTypes = {
    /**
     * A string that represents the selected address
     */
    selectedAddress: PropTypes.string,
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
     * Object that represents eip1559 gas
     */
    EIP1559GasData: PropTypes.object,
    /**
     * Object that represents legacy gas
     */
    LegacyGasData: PropTypes.object,
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
  };

  customSpendLimitInput = React.createRef();
  originIsWalletConnect = this.props.transaction.origin?.includes(
    WALLET_CONNECT_ORIGIN,
  );

  componentDidMount = async () => {
    const {
      transaction: { origin, to, data },
      tokenList,
    } = this.props;
    const { AssetsContractController } = Engine.context;
    const host = getHost(
      this.originIsWalletConnect
        ? origin.split(WALLET_CONNECT_ORIGIN)[1]
        : origin,
    );
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
          AnalyticsV2.ANALYTICS_EVENTS.APPROVAL_STARTED,
          this.getAnalyticsParams(),
        );
      },
    );
  };

  getAnalyticsParams = () => {
    try {
      const {
        activeTabUrl,
        transaction,
        onSetAnalyticsParams,
        selectedAddress,
      } = this.props;
      const { tokenSymbol, originalApproveAmount, encodedAmount } = this.state;
      const { NetworkController } = Engine.context;
      const { chainId, type } = NetworkController?.state?.provider || {};
      const isDapp = !Object.values(AppConstants.DEEPLINKS).includes(
        transaction?.origin,
      );
      const unlimited = encodedAmount === UINT256_HEX_MAX_VALUE;
      const params = {
        account_type: getAddressAccountType(selectedAddress),
        dapp_host_name: transaction?.origin,
        dapp_url: isDapp ? activeTabUrl : undefined,
        network_name: type,
        chain_id: chainId,
        active_currency: { value: tokenSymbol, anonymous: true },
        number_tokens_requested: {
          value: originalApproveAmount,
          anonymous: true,
        },
        unlimited_permission_requested: unlimited,
        referral_type: isDapp ? 'dapp' : transaction?.origin,
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
    Analytics.trackEvent(ANALYTICS_EVENT_OPTS.DAPP_APPROVE_SCREEN_VIEW_DETAILS);
    this.setState({ viewDetails: !viewDetails });
  };

  toggleEditPermission = () => {
    const { editPermissionVisible } = this.state;
    !editPermissionVisible &&
      this.trackApproveEvent(
        ANALYTICS_EVENT_OPTS.DAPP_APPROVE_SCREEN_EDIT_PERMISSION,
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
      AnalyticsV2.ANALYTICS_EVENTS.CONTRACT_ADDRESS_COPIED,
      this.getAnalyticsParams(),
    );
  };

  edit = () => {
    const { onModeChange } = this.props;
    Analytics.trackEvent(ANALYTICS_EVENT_OPTS.TRANSACTIONS_EDIT_TRANSACTION);
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
      AnalyticsV2.ANALYTICS_EVENTS.APPROVAL_PERMISSION_UPDATED,
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
    } = this.state;
    const {
      primaryCurrency,
      gasError,
      activeTabUrl,
      transaction: { origin },
      network,
      over,
      EIP1559GasData,
      LegacyGasData,
      gasEstimateType,
      onUpdatingValuesStart,
      onUpdatingValuesEnd,
      animateOnChange,
      isAnimating,
      gasEstimationReady,
      transactionConfirmed,
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
                <AccountInfoCard />
                <View style={styles.section}>
                  {showFeeMarket ? (
                    <TransactionReviewEIP1559
                      totalNative={EIP1559GasData.renderableTotalMinNative}
                      totalConversion={
                        EIP1559GasData.renderableTotalMinConversion
                      }
                      totalMaxNative={EIP1559GasData.renderableTotalMaxNative}
                      gasFeeNative={EIP1559GasData.renderableGasFeeMinNative}
                      gasFeeConversion={
                        EIP1559GasData.renderableGasFeeMinConversion
                      }
                      gasFeeMaxNative={EIP1559GasData.renderableGasFeeMaxNative}
                      gasFeeMaxConversion={
                        EIP1559GasData.renderableGasFeeMaxConversion
                      }
                      primaryCurrency={primaryCurrency}
                      timeEstimate={EIP1559GasData.timeEstimate}
                      timeEstimateColor={EIP1559GasData.timeEstimateColor}
                      timeEstimateId={EIP1559GasData.timeEstimateId}
                      hideTotal
                      noMargin
                      onEdit={this.edit}
                      onUpdatingValuesStart={onUpdatingValuesStart}
                      onUpdatingValuesEnd={onUpdatingValuesEnd}
                      animateOnChange={animateOnChange}
                      isAnimating={isAnimating}
                      gasEstimationReady={gasEstimationReady}
                    />
                  ) : (
                    <TransactionReviewEIP1559
                      totalNative={LegacyGasData.transactionTotalAmount}
                      totalConversion={LegacyGasData.transactionTotalAmountFiat}
                      gasFeeNative={LegacyGasData.transactionFee}
                      gasFeeConversion={LegacyGasData.transactionFeeFiat}
                      primaryCurrency={primaryCurrency}
                      hideTotal
                      noMargin
                      onEdit={this.edit}
                      over={Boolean(LegacyGasData.error)}
                      onUpdatingValuesStart={this.onUpdatingValuesStart}
                      onUpdatingValuesEnd={this.onUpdatingValuesEnd}
                      animateOnChange={animateOnChange}
                      isAnimating={isAnimating}
                      gasEstimationReady={gasEstimationReady}
                      legacy
                    />
                  )}

                  {gasError && (
                    <View style={styles.errorWrapper}>
                      <TouchableOpacity onPress={errorPress}>
                        <Text reset style={styles.error}>
                          {gasError}
                        </Text>

                        {over && (
                          <Text reset style={[styles.error, styles.underline]}>
                            {errorLinkText}
                          </Text>
                        )}
                      </TouchableOpacity>
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
      Analytics.trackEvent(
        ANALYTICS_EVENT_OPTS.RECEIVE_OPTIONS_PAYMENT_REQUEST,
      );
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
      this.props.navigation.navigate(Routes.BROWSER_VIEW, {
        newTabUrl: AppConstants.URLS.MM_FAUCET,
        timestamp: Date.now(),
      });
    });
  };

  renderQRDetails() {
    const { host, spenderAddress } = this.state;
    const {
      activeTabUrl,
      transaction: { origin },
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
  selectedAddress:
    state.engine.backgroundState.PreferencesController.selectedAddress,
  conversionRate:
    state.engine.backgroundState.CurrencyRateController.conversionRate,
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
