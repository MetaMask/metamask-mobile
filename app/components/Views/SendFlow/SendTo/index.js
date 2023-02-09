import React, { Fragment, PureComponent } from 'react';
import {
  View,
  TouchableOpacity,
  TextInput,
  InteractionManager,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { toChecksumAddress } from 'ethereumjs-util';
import { hexToBN } from '@metamask/controller-utils';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/FontAwesome';
import Engine from '../../../../core/Engine';
import Analytics from '../../../../core/Analytics/Analytics';
import AddressList from './../AddressList';
import { createQRScannerNavDetails } from '../../QRScanner';
import Text from '../../../Base/Text';
import { AddressFrom, AddressTo } from './../AddressInputs';
import WarningMessage from '../WarningMessage';
import { getSendFlowTitle } from '../../../UI/Navbar';
import ActionModal from '../../../UI/ActionModal';
import StyledButton from '../../../UI/StyledButton';
import { allowedToBuy } from '../../../UI/FiatOnRampAggregator';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import AnalyticsV2 from '../../../../util/analyticsV2';
import { doENSReverseLookup } from '../../../../util/ENSUtils';
import { handleNetworkSwitch } from '../../../../util/networks';
import { renderFromWei } from '../../../../util/number';
import {
  isENS,
  isValidHexAddress,
  validateAddressOrENS,
} from '../../../../util/address';
import { getTicker, getEther } from '../../../../util/transactions';
import {
  getConfusablesExplanations,
  hasZeroWidthPoints,
} from '../../../../util/confusables';
import { ThemeContext, mockTheme } from '../../../../util/theme';
import { showAlert } from '../../../../actions/alert';
import addRecent from '../../../../actions/recents';
import {
  setSelectedAsset,
  setRecipient,
  newAssetTransaction,
} from '../../../../actions/transaction';
import ErrorMessage from '../ErrorMessage';
import { strings } from '../../../../../locales/i18n';
import {
  ADDRESS_BOOK_NEXT_BUTTON,
  ADD_ADDRESS_MODAL_CONTAINER_ID,
} from '../../../../constants/test-ids';
import Routes from '../../../../constants/navigation/Routes';
import {
  CONTACT_ALREADY_SAVED,
  SYMBOL_ERROR,
  NetworkSwitchErrorType,
} from '../../../../constants/error';
import { baseStyles } from '../../../../styles/common';
import createStyles from './styles';
import { ADD_ADDRESS_BUTTON } from '../../../../../wdio/screen-objects/testIDs/Screens/SendScreen.testIds';
import { ENTER_ALIAS_INPUT_BOX_ID } from '../../../../../wdio/screen-objects/testIDs/Screens/AddressBook.testids';
import generateTestId from '../../../../../wdio/utils/generateTestId';

const dummy = () => true;

/**
 * View that wraps the wraps the "Send" screen
 */
class SendFlow extends PureComponent {
  static propTypes = {
    /**
     * Map of accounts to information objects including balances
     */
    accounts: PropTypes.object,
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
     * Returns the recent address in a json with the type ADD_RECENT
     */
    addRecent: PropTypes.func,
    /**
     * Frequent RPC list from PreferencesController
     */
    frequentRpcList: PropTypes.array,
  };

  addressToInputRef = React.createRef();

  state = {
    addressError: undefined,
    balanceIsZero: false,
    addToAddressBookModalVisible: false,
    fromSelectedAddress: this.props.selectedAddress,
    fromAccountName: this.props.identities[this.props.selectedAddress].name,
    fromAccountBalance: undefined,
    toAccount: undefined,
    toSelectedAddressName: undefined,
    toSelectedAddressReady: false,
    toEnsName: undefined,
    toEnsAddressResolved: undefined,
    addToAddressToAddressBook: false,
    alias: undefined,
    confusableCollection: [],
    inputWidth: { width: '99%' },
    isFromAddressBook: false,
  };

  updateNavBar = () => {
    const { navigation, route } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    navigation.setOptions(
      getSendFlowTitle('send.send_to', navigation, route, colors),
    );
  };

  componentDidMount = async () => {
    const {
      addressBook,
      selectedAddress,
      accounts,
      ticker,
      network,
      navigation,
      providerType,
      route,
      isPaymentRequest,
    } = this.props;
    const { fromAccountName } = this.state;
    this.updateNavBar();
    // For analytics
    navigation.setParams({ providerType, isPaymentRequest });
    const networkAddressBook = addressBook[network] || {};
    const ens = await doENSReverseLookup(selectedAddress, network);
    const fromAccountBalance = `${renderFromWei(
      accounts[selectedAddress].balance,
    )} ${getTicker(ticker)}`;

    setTimeout(() => {
      this.setState({
        fromAccountName: ens || fromAccountName,
        fromAccountBalance,
        balanceIsZero: hexToBN(accounts[selectedAddress].balance).isZero(),
        inputWidth: { width: '100%' },
      });
    }, 100);
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
  };

  componentDidUpdate = () => {
    this.updateNavBar();
  };

  toggleAddToAddressBookModal = () => {
    const { addToAddressBookModalVisible } = this.state;
    this.setState({
      addToAddressBookModalVisible: !addToAddressBookModalVisible,
    });
  };

  onSelectAccount = async (accountAddress) => {
    const { ticker, accounts, identities } = this.props;
    const { name } = identities[accountAddress];
    const fromAccountBalance = `${renderFromWei(
      accounts[accountAddress].balance,
    )} ${getTicker(ticker)}`;
    const ens = await doENSReverseLookup(accountAddress);
    const fromAccountName = ens || name;
    // If new account doesn't have the asset
    this.props.setSelectedAsset(getEther(ticker));
    this.setState({
      fromAccountName,
      fromAccountBalance,
      fromSelectedAddress: accountAddress,
      balanceIsZero: hexToBN(accounts[accountAddress].balance).isZero(),
    });
  };

  openAccountSelector = () => {
    const { navigation } = this.props;
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.ACCOUNT_SELECTOR,
      params: {
        isSelectOnly: true,
        onSelectAccount: this.onSelectAccount,
      },
    });
  };

  /**
   * This returns the address name from the address book or user accounts if the selectedAddress exist there
   * @param {String} toAccount - Address input
   * @returns {String | null} - Address or null if toAccount is not in the addressBook or identities array
   */
  getAddressNameFromBookOrIdentities = (toAccount) => {
    if (!toAccount) return;

    const { addressBook, network, identities } = this.props;
    const networkAddressBook = addressBook[network] || {};

    const checksummedAddress = toChecksumAddress(toAccount);

    return networkAddressBook[checksummedAddress]
      ? networkAddressBook[checksummedAddress].name
      : identities[checksummedAddress]
      ? identities[checksummedAddress].name
      : null;
  };

  isAddressSaved = () => {
    const { toAccount } = this.state;
    const { addressBook, network, identities } = this.props;
    const networkAddressBook = addressBook[network] || {};
    const checksummedAddress = toChecksumAddress(toAccount);
    return !!(
      networkAddressBook[checksummedAddress] || identities[checksummedAddress]
    );
  };

  /**
   * This set to the state all the information
   *  that come from validating an ENS or address
   * @param {*} toSelectedAddress - The address or the ens writted on the destination input
   */
  validateAddressOrENSFromInput = async (toAccount) => {
    const { network, addressBook, identities, chainId } = this.props;
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

  onToClear = () => {
    this.onToSelectedAddressChange();
  };

  onChangeAlias = (alias) => {
    this.setState({ alias });
  };

  onSaveToAddressBook = () => {
    const { network } = this.props;
    const { toAccount, alias, toEnsAddressResolved } = this.state;
    const { AddressBookController } = Engine.context;
    const toAddress = toEnsAddressResolved || toAccount;
    AddressBookController.set(toAddress, alias, network);
    this.toggleAddToAddressBookModal();

    this.setState({
      toSelectedAddressName: alias,
      addToAddressToAddressBook: false,
      alias: undefined,
      isFromAddressBook: true,
      toAccount: toAddress,
    });
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

  onScan = () => {
    this.props.navigation.navigate(
      ...createQRScannerNavDetails({
        onScanSuccess: (meta) => {
          if (meta.chain_id) {
            this.handleNetworkSwitch(meta.chain_id);
          }
          if (meta.target_address) {
            this.onToSelectedAddressChange(meta.target_address);
          }
        },
        origin: Routes.SEND_FLOW.SEND_TO,
      }),
    );
  };

  onTransactionDirectionSet = async () => {
    const { setRecipient, navigation, providerType, addRecent } = this.props;
    const {
      fromSelectedAddress,
      toAccount,
      toEnsName,
      toSelectedAddressName,
      fromAccountName,
      toEnsAddressResolved,
    } = this.state;
    if (!this.isAddressSaved()) {
      const addressError = this.validateToAddress();
      if (addressError) return;
    }
    const toAddress = toEnsAddressResolved || toAccount;
    addRecent(toAddress);
    setRecipient(
      fromSelectedAddress,
      toAddress,
      toEnsName,
      toSelectedAddressName,
      fromAccountName,
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

  renderAddToAddressBookModal = () => {
    const { addToAddressBookModalVisible, alias } = this.state;
    const colors = this.context.colors || mockTheme.colors;
    const themeAppearance = this.context.themeAppearance || 'light';
    const styles = createStyles(colors);

    return (
      <ActionModal
        modalVisible={addToAddressBookModalVisible}
        confirmText={strings('address_book.save')}
        cancelText={strings('address_book.cancel')}
        onCancelPress={this.toggleAddToAddressBookModal}
        onRequestClose={this.toggleAddToAddressBookModal}
        onConfirmPress={this.onSaveToAddressBook}
        cancelButtonMode={'normal'}
        confirmButtonMode={'confirm'}
        confirmDisabled={!alias}
      >
        <View style={styles.addToAddressBookRoot}>
          <View
            style={styles.addToAddressBookWrapper}
            testID={ADD_ADDRESS_MODAL_CONTAINER_ID}
          >
            <View style={baseStyles.flexGrow}>
              <Text style={styles.addTextTitle}>
                {strings('address_book.add_to_address_book')}
              </Text>
              <Text style={styles.addTextSubtitle}>
                {strings('address_book.enter_an_alias')}
              </Text>
              <View style={styles.addInputWrapper}>
                <View style={styles.input}>
                  <TextInput
                    autoFocus
                    autoCapitalize="none"
                    autoCorrect={false}
                    onChangeText={this.onChangeAlias}
                    placeholder={strings(
                      'address_book.enter_an_alias_placeholder',
                    )}
                    placeholderTextColor={colors.text.muted}
                    spellCheck={false}
                    style={styles.addTextInput}
                    numberOfLines={1}
                    onBlur={this.onBlur}
                    onFocus={this.onInputFocus}
                    onSubmitEditing={this.onFocus}
                    value={alias}
                    keyboardAppearance={themeAppearance}
                    {...generateTestId(Platform, ENTER_ALIAS_INPUT_BOX_ID)}
                  />
                </View>
              </View>
            </View>
          </View>
        </View>
      </ActionModal>
    );
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

    if (!allowedToBuy(this.props.network)) {
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

  render = () => {
    const { ticker, addressBook, network } = this.props;
    const {
      fromSelectedAddress,
      fromAccountName,
      fromAccountBalance,
      toAccount,
      toSelectedAddressReady,
      toSelectedAddressName,
      addToAddressToAddressBook,
      addressError,
      balanceIsZero,
      toInputHighlighted,
      inputWidth,
      errorContinue,
      isOnlyWarning,
      confusableCollection,
      isFromAddressBook,
      toEnsAddressResolved,
    } = this.state;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    const checksummedAddress = toAccount && toChecksumAddress(toAccount);
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
        testID={'send-screen'}
      >
        <View style={styles.imputWrapper}>
          <AddressFrom
            onPressIcon={this.openAccountSelector}
            fromAccountAddress={fromSelectedAddress}
            fromAccountName={fromAccountName}
            fromAccountBalance={fromAccountBalance}
          />
          <AddressTo
            inputRef={this.addressToInputRef}
            highlighted={toInputHighlighted}
            addressToReady={toSelectedAddressReady}
            toSelectedAddress={toEnsAddressResolved || toAccount}
            toAddressName={toSelectedAddressName}
            onToSelectedAddressChange={this.onToSelectedAddressChange}
            onScan={this.onScan}
            onClear={this.onToClear}
            onInputFocus={this.onToInputFocus}
            onInputBlur={this.onToInputFocus}
            onSubmit={this.onTransactionDirectionSet}
            inputWidth={inputWidth}
            confusableCollection={
              (!existingContact && confusableCollection) || []
            }
            isFromAddressBook={isFromAddressBook}
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
                <View
                  style={styles.addressErrorWrapper}
                  testID={'address-error'}
                >
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
              {addToAddressToAddressBook && (
                <TouchableOpacity
                  style={styles.myAccountsTouchable}
                  onPress={this.toggleAddToAddressBookModal}
                  testID={'add-address-button'}
                >
                  <Text
                    style={styles.myAccountsText}
                    {...generateTestId(Platform, ADD_ADDRESS_BUTTON)}
                  >
                    {strings('address_book.add_this_address')}
                  </Text>
                </TouchableOpacity>
              )}
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
          <View style={styles.footerContainer} testID={'no-eth-message'}>
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
        {this.renderAddToAddressBookModal()}
      </SafeAreaView>
    );
  };
}

SendFlow.contextType = ThemeContext;

const mapStateToProps = (state) => ({
  accounts: state.engine.backgroundState.AccountTrackerController.accounts,
  addressBook: state.engine.backgroundState.AddressBookController.addressBook,
  chainId: state.engine.backgroundState.NetworkController.provider.chainId,
  selectedAddress:
    state.engine.backgroundState.PreferencesController.selectedAddress,
  selectedAsset: state.transaction.selectedAsset,
  identities: state.engine.backgroundState.PreferencesController.identities,
  ticker: state.engine.backgroundState.NetworkController.provider.ticker,
  network: state.engine.backgroundState.NetworkController.network,
  providerType: state.engine.backgroundState.NetworkController.provider.type,
  isPaymentRequest: state.transaction.paymentRequest,
  frequentRpcList:
    state.engine.backgroundState.PreferencesController.frequentRpcList,
});

const mapDispatchToProps = (dispatch) => ({
  addRecent: (address) => dispatch(addRecent(address)),
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
});

export default connect(mapStateToProps, mapDispatchToProps)(SendFlow);
