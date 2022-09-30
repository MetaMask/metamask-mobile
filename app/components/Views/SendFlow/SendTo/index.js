import React, { PureComponent } from 'react';
import {
  View,
  TouchableOpacity,
  TextInput,
  InteractionManager,
  ScrollView,
  Alert,
} from 'react-native';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { toChecksumAddress } from 'ethereumjs-util';
import { util } from '@metamask/controllers';
import Modal from 'react-native-modal';
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
import AccountList from '../../../UI/AccountList';
import ActionModal from '../../../UI/ActionModal';
import StyledButton from '../../../UI/StyledButton';
import { allowedToBuy } from '../../../UI/FiatOrders';
import AnalyticsV2 from '../../../../util/analyticsV2';
import { ANALYTICS_EVENT_OPTS } from '../../../../util/analytics';
import { doENSLookup, doENSReverseLookup } from '../../../../util/ENSUtils';
import NetworkList, { handleNetworkSwitch } from '../../../../util/networks';
import { renderFromWei } from '../../../../util/number';
import { isENS, isValidHexAddress } from '../../../../util/address';
import { getTicker, getEther } from '../../../../util/transactions';
import {
  collectConfusables,
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
  ADD_ADDRESS_MODAL_CONTAINER_ID,
  ENTER_ALIAS_INPUT_BOX_ID,
} from '../../../../constants/test-ids';
import { NetworkSwitchErrorType } from '../../../../constants/error';
import Routes from '../../../../constants/navigation/Routes';
import { baseStyles } from '../../../../styles/common';
import createStyles from './styles';

const { hexToBN } = util;

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
     * List of keyrings
     */
    keyrings: PropTypes.array,
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
    fromAccountModalVisible: false,
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

  toggleFromAccountModal = () => {
    const { fromAccountModalVisible } = this.state;
    this.setState({ fromAccountModalVisible: !fromAccountModalVisible });
  };

  toggleAddToAddressBookModal = () => {
    const { addToAddressBookModalVisible } = this.state;
    this.setState({
      addToAddressBookModalVisible: !addToAddressBookModalVisible,
    });
  };

  onAccountChange = async (accountAddress) => {
    const { identities, ticker, accounts } = this.props;
    const { name } = identities[accountAddress];
    const { PreferencesController } = Engine.context;
    const fromAccountBalance = `${renderFromWei(
      accounts[accountAddress].balance,
    )} ${getTicker(ticker)}`;
    const ens = await doENSReverseLookup(accountAddress);
    const fromAccountName = ens || name;
    PreferencesController.setSelectedAddress(accountAddress);
    // If new account doesn't have the asset
    this.props.setSelectedAsset(getEther(ticker));
    this.setState({
      fromAccountName,
      fromAccountBalance,
      fromSelectedAddress: accountAddress,
      balanceIsZero: hexToBN(accounts[accountAddress].balance).isZero(),
    });
    this.toggleFromAccountModal();
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

  validateAddressOrENSFromInput = async (toAccount) => {
    const { AssetsContractController } = Engine.context;
    const { addressBook, network, identities, providerType } = this.props;
    const networkAddressBook = addressBook[network] || {};
    let addressError,
      toAddressName,
      toEnsName,
      errorContinue,
      isOnlyWarning,
      confusableCollection,
      toEnsAddressResolved;
    let [addToAddressToAddressBook, toSelectedAddressReady] = [false, false];
    if (isValidHexAddress(toAccount, { mixedCaseUseChecksum: true })) {
      const checksummedAddress = toChecksumAddress(toAccount);
      toSelectedAddressReady = true;
      const ens = await doENSReverseLookup(checksummedAddress);
      if (ens) {
        toAddressName = ens;
        if (
          !networkAddressBook[checksummedAddress] &&
          !identities[checksummedAddress]
        ) {
          addToAddressToAddressBook = true;
        }
      } else if (
        !networkAddressBook[checksummedAddress] &&
        !identities[checksummedAddress]
      ) {
        toAddressName = toAccount;
        // If not in the addressBook nor user accounts
        addToAddressToAddressBook = true;
      }

      // Check if it's token contract address on mainnet
      const networkId = NetworkList[providerType].networkId;
      if (networkId === 1) {
        try {
          const symbol = await AssetsContractController.getERC721AssetSymbol(
            checksummedAddress,
          );
          if (symbol) {
            addressError = (
              <Text>
                <Text>
                  {strings('transaction.tokenContractAddressWarning_1')}
                </Text>
                <Text bold>
                  {strings('transaction.tokenContractAddressWarning_2')}
                </Text>
                <Text>
                  {strings('transaction.tokenContractAddressWarning_3')}
                </Text>
              </Text>
            );
            errorContinue = true;
          }
        } catch (e) {
          // Not a token address
        }
      }

      /**
       * Not using this for now; Import isSmartContractAddress from utils/transaction and use this for checking smart contract: await isSmartContractAddress(toEnsAddressResolved || toAccount);
       * Check if it's smart contract address
       */
      /*
			const smart = false; //

			if (smart) {
				addressError = strings('transaction.smartContractAddressWarning');
				isOnlyWarning = true;
			}
			*/
    } else if (isENS(toAccount)) {
      toEnsName = toAccount;
      confusableCollection = collectConfusables(toEnsName);
      const resolvedAddress = await doENSLookup(toAccount, network);
      if (resolvedAddress) {
        const checksummedAddress = toChecksumAddress(resolvedAddress);
        toAddressName = toAccount;
        toEnsAddressResolved = resolvedAddress;
        toSelectedAddressReady = true;
        if (
          !networkAddressBook[checksummedAddress] &&
          !identities[checksummedAddress]
        ) {
          addToAddressToAddressBook = true;
        }
      } else {
        addressError = strings('transaction.could_not_resolve_ens');
      }
    } else if (toAccount && toAccount.length >= 42) {
      addressError = strings('transaction.invalid_address');
    }

    this.setState({
      addressError,
      addToAddressToAddressBook,
      toSelectedAddressReady,
      toEnsName,
      toSelectedAddressName: toAddressName,
      errorContinue,
      isOnlyWarning,
      confusableCollection,
      toEnsAddressResolved,
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

  validateToAddress = async () => {
    const { toAccount } = this.state;
    const { network } = this.props;
    let addressError;
    if (isENS(toAccount)) {
      const resolvedAddress = await doENSLookup(toAccount, network);
      if (!resolvedAddress) {
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
      const addressError = await this.validateToAddress();
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
        ANALYTICS_EVENT_OPTS.SEND_FLOW_ADDS_RECIPIENT,
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
                    testID={ENTER_ALIAS_INPUT_BOX_ID}
                  />
                </View>
              </View>
            </View>
          </View>
        </View>
      </ActionModal>
    );
  };

  renderFromAccountModal = () => {
    const { identities, keyrings, ticker } = this.props;
    const { fromAccountModalVisible, fromSelectedAddress } = this.state;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return (
      <Modal
        isVisible={fromAccountModalVisible}
        style={styles.bottomModal}
        onBackdropPress={this.toggleFromAccountModal}
        onBackButtonPress={this.toggleFromAccountModal}
        onSwipeComplete={this.toggleFromAccountModal}
        swipeDirection={'down'}
        propagateSwipe
        backdropColor={colors.overlay.default}
        backdropOpacity={1}
      >
        <AccountList
          enableAccountsAddition={false}
          identities={identities}
          selectedAddress={fromSelectedAddress}
          keyrings={keyrings}
          onAccountChange={this.onAccountChange}
          ticker={ticker}
        />
      </Modal>
    );
  };

  onToInputFocus = () => {
    const { toInputHighlighted } = this.state;
    this.setState({ toInputHighlighted: !toInputHighlighted });
  };

  goToBuy = () => {
    this.props.navigation.navigate(Routes.FIAT_ON_RAMP_AGGREGATOR.ID);
    InteractionManager.runAfterInteractions(() => {
      AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.BUY_BUTTON_CLICKED, {
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
            onPressIcon={this.toggleFromAccountModal}
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
              {addressError && (
                <View
                  style={styles.addressErrorWrapper}
                  testID={'address-error'}
                >
                  <ErrorMessage
                    errorMessage={addressError}
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
                  <Text style={styles.myAccountsText}>
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
                  testID={'address-book-next-button'}
                  disabled={!toSelectedAddressReady}
                >
                  {strings('address_book.next')}
                </StyledButton>
              </View>
            )}
          </View>
        )}

        {this.renderFromAccountModal()}
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
  keyrings: state.engine.backgroundState.KeyringController.keyrings,
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
