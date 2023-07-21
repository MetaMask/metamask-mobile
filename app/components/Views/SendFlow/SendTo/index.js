import React, { Fragment, PureComponent } from 'react';
import {
  View,
  InteractionManager,
  ScrollView,
  Alert,
  Platform,
  BackHandler,
} from 'react-native';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { toChecksumAddress } from 'ethereumjs-util';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/FontAwesome';
import Engine from '../../../../core/Engine';
import Analytics from '../../../../core/Analytics/Analytics';
import AddressList from './../AddressList';
import Text from '../../../Base/Text';
import WarningMessage from '../WarningMessage';
import { getSendFlowTitle } from '../../../UI/Navbar';
import StyledButton from '../../../UI/StyledButton';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import AnalyticsV2 from '../../../../util/analyticsV2';
import { handleNetworkSwitch } from '../../../../util/networks';
import {
  isENS,
  isValidHexAddress,
  validateAddressOrENS,
} from '../../../../util/address';
import { getEther, getTicker } from '../../../../util/transactions';
import {
  getConfusablesExplanations,
  hasZeroWidthPoints,
} from '../../../../util/confusables';
import { mockTheme, ThemeContext } from '../../../../util/theme';
import { showAlert } from '../../../../actions/alert';
import {
  newAssetTransaction,
  resetTransaction,
  setRecipient,
  setSelectedAsset,
} from '../../../../actions/transaction';
import ErrorMessage from '../ErrorMessage';
import { strings } from '../../../../../locales/i18n';
import {
  ADDRESS_BOOK_NEXT_BUTTON,
  NO_ETH_MESSAGE,
  ADDRESS_ERROR,
} from '../../../../constants/test-ids';
import Routes from '../../../../constants/navigation/Routes';
import {
  CONTACT_ALREADY_SAVED,
  NetworkSwitchErrorType,
  SYMBOL_ERROR,
} from '../../../../constants/error';
import createStyles from './styles';
import {
  ADD_ADDRESS_BUTTON,
  SEND_SCREEN_ID,
} from '../../../../../wdio/screen-objects/testIDs/Screens/SendScreen.testIds';
import generateTestId from '../../../../../wdio/utils/generateTestId';
import {
  selectChainId,
  selectNetwork,
  selectProviderType,
  selectTicker,
} from '../../../../selectors/networkController';
import {
  selectFrequentRpcList,
  selectIdentities,
  selectSelectedAddress,
} from '../../../../selectors/preferencesController';
import AddToAddressBookWrapper from '../../../UI/AddToAddressBookWrapper';
import { isNetworkBuyNativeTokenSupported } from '../../../UI/Ramp/utils';
import { getRampNetworks } from '../../../../reducers/fiatOrders';
import SendFlowAddressFrom from '../AddressFrom';
import SendFlowAddressTo from '../AddressTo';

const dummy = () => true;

/**
 * View that wraps the wraps the "Send" screen
 */
class SendFlow extends PureComponent {
  static propTypes = {
    /**
     * Map representing the address book
     */
    addressBook: PropTypes.object,
    /**
     * Network provider chain id
     */
    chainId: PropTypes.string,
    /**
     * Network id
     */
    network: PropTypes.string,
    /**
     * Object that represents the navigator
     */
    navigation: PropTypes.object,
    /**
     * Start transaction with asset
     */
    newAssetTransaction: PropTypes.func.isRequired,
    /**
     * Selected address as string
     */
    selectedAddress: PropTypes.string,
    /**
     * List of accounts from the PreferencesController
     */
    identities: PropTypes.object,
    /**
     * Current provider ticker
     */
    ticker: PropTypes.string,
    /**
     * Action that sets transaction to and ensRecipient in case is available
     */
    setRecipient: PropTypes.func,
    /**
     * Set selected in transaction state
     */
    setSelectedAsset: PropTypes.func,
    /**
     * Show alert
     */
    showAlert: PropTypes.func,
    /**
     * Network provider type as mainnet
     */
    providerType: PropTypes.string,
    /**
     * Object that represents the current route info like params passed to it
     */
    route: PropTypes.object,
    /**
     * Indicates whether the current transaction is a deep link transaction
     */
    isPaymentRequest: PropTypes.bool,
    /**
     * Frequent RPC list from PreferencesController
     */
    frequentRpcList: PropTypes.array,
    /**
     * Boolean that indicates if the network supports buy
     */
    isNativeTokenBuySupported: PropTypes.bool,
    updateParentState: PropTypes.func,
    /**
     * Resets transaction state
     */
    resetTransaction: PropTypes.func,
  };

  addressToInputRef = React.createRef();

  state = {
    addressError: undefined,
    balanceIsZero: false,
    fromSelectedAddress: this.props.selectedAddress,
    toAccount: undefined,
    toSelectedAddressName: undefined,
    toSelectedAddressReady: false,
    toEnsName: undefined,
    toEnsAddressResolved: undefined,
    confusableCollection: [],
    inputWidth: { width: '99%' },
  };

  updateNavBar = () => {
    const { navigation, route, resetTransaction } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    navigation.setOptions(
      getSendFlowTitle(
        'send.send_to',
        navigation,
        route,
        colors,
        resetTransaction,
      ),
    );
  };

  componentDidMount = async () => {
    const {
      addressBook,
      ticker,
      network,
      navigation,
      providerType,
      route,
      isPaymentRequest,
    } = this.props;
    this.updateNavBar();
    // For analytics
    navigation.setParams({ providerType, isPaymentRequest });
    const networkAddressBook = addressBook[network] || {};
    if (!Object.keys(networkAddressBook).length) {
      setTimeout(() => {
        this.addressToInputRef &&
          this.addressToInputRef.current &&
          this.addressToInputRef.current.focus();
      }, 500);
    }
    //Fills in to address and sets the transaction if coming from QR code scan
    const targetAddress = route.params?.txMeta?.target_address;
    if (targetAddress) {
      this.props.newAssetTransaction(getEther(ticker));
      this.onToSelectedAddressChange(targetAddress);
    }

    // Disabling back press for not be able to exit the send flow without reseting the transaction object
    this.hardwareBackPress = () => true;
    BackHandler.addEventListener('hardwareBackPress', this.hardwareBackPress);
  };

  componentDidUpdate = () => {
    this.updateNavBar();
  };

  componentWillUnmount() {
    BackHandler.removeEventListener(
      'hardwareBackPress',
      this.hardwareBackPress,
    );
  }

  isAddressSaved = () => {
    const { toAccount } = this.state;
    const { addressBook, network, identities } = this.props;
    const networkAddressBook = addressBook[network] || {};
    const checksummedAddress = toChecksumAddress(toAccount);
    return !!(
      networkAddressBook[checksummedAddress] || identities[checksummedAddress]
    );
  };

  validateToAddress = () => {
    const { toAccount, toEnsAddressResolved } = this.state;
    let addressError;
    if (isENS(toAccount)) {
      if (!toEnsAddressResolved) {
        addressError = strings('transaction.could_not_resolve_ens');
      }
    } else if (!isValidHexAddress(toAccount, { mixedCaseUseChecksum: true })) {
      addressError = strings('transaction.invalid_address');
    }
    this.setState({ addressError });
    return addressError;
  };

  handleNetworkSwitch = (chainId) => {
    try {
      const { NetworkController, CurrencyRateController } = Engine.context;
      const { showAlert, frequentRpcList } = this.props;
      const network = handleNetworkSwitch(chainId, frequentRpcList, {
        networkController: NetworkController,
        currencyRateController: CurrencyRateController,
      });

      if (!network) return;

      showAlert({
        isVisible: true,
        autodismiss: 5000,
        content: 'clipboard-alert',
        data: { msg: strings('send.warn_network_change') + network },
      });
    } catch (e) {
      let alertMessage;
      switch (e.message) {
        case NetworkSwitchErrorType.missingNetworkId:
          alertMessage = strings('send.network_missing_id');
          break;
        default:
          alertMessage = strings('send.network_not_found_description', {
            chain_id: chainId,
          });
      }
      Alert.alert(strings('send.network_not_found_title'), alertMessage);
    }
  };

  onTransactionDirectionSet = async () => {
    const { setRecipient, navigation, providerType } = this.props;
    const {
      fromSelectedAddress,
      toAccount,
      toEnsName,
      toSelectedAddressName,
      toEnsAddressResolved,
    } = this.state;
    if (!this.isAddressSaved()) {
      const addressError = this.validateToAddress();
      if (addressError) return;
    }

    const toAddress = toEnsAddressResolved || toAccount;
    setRecipient(
      fromSelectedAddress,
      toAddress,
      toEnsName,
      toSelectedAddressName,
    );
    InteractionManager.runAfterInteractions(() => {
      Analytics.trackEventWithParameters(
        MetaMetricsEvents.SEND_FLOW_ADDS_RECIPIENT,
        {
          network: providerType,
        },
      );
    });
    navigation.navigate('Amount');
  };

  onToInputFocus = () => {
    const { toInputHighlighted } = this.state;
    this.setState({ toInputHighlighted: !toInputHighlighted });
  };

  goToBuy = () => {
    this.props.navigation.navigate(Routes.FIAT_ON_RAMP_AGGREGATOR.ID);
    InteractionManager.runAfterInteractions(() => {
      AnalyticsV2.trackEvent(MetaMetricsEvents.BUY_BUTTON_CLICKED, {
        button_location: 'Send Flow warning',
        button_copy: 'Buy Native Token',
        chain_id_destination: this.props.chainId,
      });
    });
  };

  renderBuyEth = () => {
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    if (!this.props.isNativeTokenBuySupported) {
      return null;
    }

    return (
      <>
        <Text bold style={styles.buyEth} onPress={this.goToBuy}>
          {strings('fiat_on_ramp.buy', {
            ticker: getTicker(this.props.ticker),
          })}
        </Text>
      </>
    );
  };

  renderAddressError = (addressError) =>
    addressError === SYMBOL_ERROR ? (
      <Fragment>
        <Text>{strings('transaction.tokenContractAddressWarning_1')}</Text>
        <Text bold>{strings('transaction.tokenContractAddressWarning_2')}</Text>
        <Text>{strings('transaction.tokenContractAddressWarning_3')}</Text>
      </Fragment>
    ) : (
      addressError
    );

  updateParentState = (state) => {
    this.setState({ ...state });
  };

  fromAccountBalanceState = (value) => {
    this.setState({ balanceIsZero: value });
  };

  getAddressNameFromBookOrIdentities = (toAccount) => {
    const { addressBook, identities, network } = this.props;
    if (!toAccount) return;

    const networkAddressBook = addressBook[network] || {};

    const checksummedAddress = toChecksumAddress(toAccount);

    return networkAddressBook[checksummedAddress]
      ? networkAddressBook[checksummedAddress].name
      : identities[checksummedAddress]
      ? identities[checksummedAddress].name
      : null;
  };

  validateAddressOrENSFromInput = async (toAccount) => {
    const { addressBook, identities, chainId, network } = this.props;
    const {
      addressError,
      toEnsName,
      addressReady,
      toEnsAddress,
      addToAddressToAddressBook,
      toAddressName,
      errorContinue,
      isOnlyWarning,
      confusableCollection,
    } = await validateAddressOrENS({
      toAccount,
      network,
      addressBook,
      identities,
      chainId,
    });

    this.setState({
      addressError,
      toEnsName,
      toSelectedAddressReady: addressReady,
      toEnsAddressResolved: toEnsAddress,
      addToAddressToAddressBook,
      toSelectedAddressName: toAddressName,
      errorContinue,
      isOnlyWarning,
      confusableCollection,
    });
  };

  onToSelectedAddressChange = (toAccount) => {
    const addressName = this.getAddressNameFromBookOrIdentities(toAccount);

    /**
     * If the address is from addressBook or identities
     * then validation is not necessary since it was already validated
     */
    if (addressName) {
      this.setState({
        toAccount,
        toSelectedAddressReady: true,
        isFromAddressBook: true,
        toSelectedAddressName: addressName,
      });
    } else {
      this.validateAddressOrENSFromInput(toAccount);
      /**
       * Because validateAddressOrENSFromInput is an asynchronous function
       * we are setting the state here synchronously, so it does not block the UI
       * */
      this.setState({
        toAccount,
        isFromAddressBook: false,
      });
    }
  };

  render = () => {
    const { ticker, addressBook, network } = this.props;
    const {
      toAccount,
      toSelectedAddressReady,
      toSelectedAddressName,
      addressError,
      balanceIsZero,
      inputWidth,
      errorContinue,
      isOnlyWarning,
      confusableCollection,
      toEnsAddressResolved,
    } = this.state;

    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    const checksummedAddress = toAccount && toChecksumAddress(toAccount);
    const existingAddressName = this.getAddressNameFromBookOrIdentities(
      toEnsAddressResolved || toAccount,
    );
    const existingContact =
      checksummedAddress &&
      addressBook[network] &&
      addressBook[network][checksummedAddress];
    const displayConfusableWarning =
      !existingContact && confusableCollection && !!confusableCollection.length;
    const displayAsWarning =
      confusableCollection &&
      confusableCollection.length &&
      !confusableCollection.some(hasZeroWidthPoints);
    const explanations =
      displayConfusableWarning &&
      getConfusablesExplanations(confusableCollection);

    return (
      <SafeAreaView
        edges={['bottom']}
        style={styles.wrapper}
        {...generateTestId(Platform, SEND_SCREEN_ID)}
      >
        <View style={styles.imputWrapper}>
          <SendFlowAddressFrom
            fromAccountBalanceState={this.fromAccountBalanceState}
          />
          <SendFlowAddressTo
            inputRef={this.addressToInputRef}
            addressToReady={toSelectedAddressReady}
            toSelectedAddress={toEnsAddressResolved || toAccount}
            updateParentState={this.updateParentState}
            toSelectedAddressName={toSelectedAddressName}
            onSubmit={this.onTransactionDirectionSet}
            inputWidth={inputWidth}
            confusableCollectionArray={
              (!existingContact && confusableCollection) || []
            }
            isFromAddressBook={existingAddressName?.length > 0}
            onToSelectedAddressChange={this.onToSelectedAddressChange}
            highlighted={false}
          />
        </View>

        {!toSelectedAddressReady && !!toAccount && (
          <View style={styles.warningContainer}>
            <WarningMessage
              warningMessage={
                toAccount.substring(0, 2) === '0x'
                  ? strings('transaction.address_invalid')
                  : strings('transaction.ens_not_found')
              }
            />
          </View>
        )}

        {!toSelectedAddressReady ? (
          <AddressList
            inputSearch={toAccount}
            onAccountPress={this.onToSelectedAddressChange}
            onAccountLongPress={dummy}
          />
        ) : (
          <View style={styles.nextActionWrapper}>
            <ScrollView>
              {addressError && addressError !== CONTACT_ALREADY_SAVED && (
                <View style={styles.addressErrorWrapper} testID={ADDRESS_ERROR}>
                  <ErrorMessage
                    errorMessage={this.renderAddressError(addressError)}
                    errorContinue={!!errorContinue}
                    onContinue={this.onTransactionDirectionSet}
                    isOnlyWarning={!!isOnlyWarning}
                  />
                </View>
              )}
              {displayConfusableWarning && (
                <View
                  style={[
                    styles.confusabeError,
                    displayAsWarning && styles.confusabeWarning,
                  ]}
                >
                  <View style={styles.warningIcon}>
                    <Icon
                      size={16}
                      color={
                        displayAsWarning
                          ? colors.warning.default
                          : colors.error.default
                      }
                      name="exclamation-triangle"
                    />
                  </View>
                  <View>
                    <Text style={styles.confusableTitle}>
                      {strings('transaction.confusable_title')}
                    </Text>
                    <Text style={styles.confusableMsg}>
                      {strings('transaction.confusable_msg')}{' '}
                      {explanations.join(', ')}.
                    </Text>
                  </View>
                </View>
              )}
              <AddToAddressBookWrapper
                setToAddressName={(toSelectedAddressName) =>
                  this.setState({ toSelectedAddressName })
                }
                address={toEnsAddressResolved || toAccount}
                defaultNull
              >
                <Text
                  style={styles.myAccountsText}
                  {...generateTestId(Platform, ADD_ADDRESS_BUTTON)}
                >
                  {strings('address_book.add_this_address')}
                </Text>
              </AddToAddressBookWrapper>
              {balanceIsZero && (
                <View style={styles.warningContainer}>
                  <WarningMessage
                    warningMessage={
                      <>
                        {strings('transaction.not_enough_for_gas', {
                          ticker: getTicker(ticker),
                        })}

                        {this.renderBuyEth()}
                      </>
                    }
                  />
                </View>
              )}
            </ScrollView>
          </View>
        )}

        {!errorContinue && (
          <View style={styles.footerContainer} testID={NO_ETH_MESSAGE}>
            {!errorContinue && (
              <View style={styles.buttonNextWrapper}>
                <StyledButton
                  type={'confirm'}
                  containerStyle={styles.buttonNext}
                  onPress={this.onTransactionDirectionSet}
                  testID={ADDRESS_BOOK_NEXT_BUTTON}
                  //To selectedAddressReady needs to be calculated on this component, needing a bigger refactor
                  //Will be here just to ensure that we don't break existing conditions
                  disabled={
                    !(
                      (isValidHexAddress(toEnsAddressResolved) ||
                        isValidHexAddress(toAccount)) &&
                      toSelectedAddressReady
                    )
                  }
                >
                  {strings('address_book.next')}
                </StyledButton>
              </View>
            )}
          </View>
        )}
      </SafeAreaView>
    );
  };
}

SendFlow.contextType = ThemeContext;

const mapStateToProps = (state) => ({
  addressBook: state.engine.backgroundState.AddressBookController.addressBook,
  chainId: selectChainId(state),
  selectedAddress: selectSelectedAddress(state),
  selectedAsset: state.transaction.selectedAsset,
  identities: selectIdentities(state),
  ticker: selectTicker(state),
  network: selectNetwork(state),
  providerType: selectProviderType(state),
  isPaymentRequest: state.transaction.paymentRequest,
  frequentRpcList: selectFrequentRpcList(state),
  isNativeTokenBuySupported: isNetworkBuyNativeTokenSupported(
    selectChainId(state),
    getRampNetworks(state),
  ),
});

const mapDispatchToProps = (dispatch) => ({
  setRecipient: (
    from,
    to,
    ensRecipient,
    transactionToName,
    transactionFromName,
  ) =>
    dispatch(
      setRecipient(
        from,
        to,
        ensRecipient,
        transactionToName,
        transactionFromName,
      ),
    ),
  newAssetTransaction: (selectedAsset) =>
    dispatch(newAssetTransaction(selectedAsset)),
  setSelectedAsset: (selectedAsset) =>
    dispatch(setSelectedAsset(selectedAsset)),
  showAlert: (config) => dispatch(showAlert(config)),
  resetTransaction: () => dispatch(resetTransaction()),
});

export default connect(mapStateToProps, mapDispatchToProps)(SendFlow);
