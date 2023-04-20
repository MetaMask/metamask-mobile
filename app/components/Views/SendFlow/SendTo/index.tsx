import React, {
  Fragment,
  useCallback,
  useEffect,
  useState,
  createRef,
} from 'react';
import {
  View,
  TouchableOpacity,
  TextInput,
  InteractionManager,
  ScrollView,
  Platform,
} from 'react-native';
import { toChecksumAddress } from 'ethereumjs-util';
import { hexToBN } from '@metamask/controller-utils';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/FontAwesome';
import Engine from '../../../../core/Engine';
import Analytics from '../../../../core/Analytics/Analytics';
import AddressList from '../AddressList';
import Text from '../../../Base/Text';
import SendToAddressFrom from '../AddressFrom';
import SendToAddressTo from '../AddressTo';
import WarningMessage from '../WarningMessage';
import { getSendFlowTitle } from '../../../UI/Navbar';
import ActionModal from '../../../UI/ActionModal';
import StyledButton from '../../../UI/StyledButton';

import { MetaMetricsEvents } from '../../../../core/Analytics';
import AnalyticsV2 from '../../../../util/analyticsV2';
import { doENSReverseLookup } from '../../../../util/ENSUtils';
import { useStyles } from '../../../hooks/useStyles';
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
import addRecent from '../../../../actions/recents';
import {
  setRecipient,
  newAssetTransaction,
} from '../../../../actions/transaction';
import ErrorMessage from '../ErrorMessage';
import { strings } from '../../../../../locales/i18n';
import {
  ADDRESS_BOOK_NEXT_BUTTON,
  ADD_ADDRESS_MODAL_CONTAINER_ID,
  NO_ETH_MESSAGE,
  SEND_SCREEN,
  ADDRESS_ERROR,
  ADD_ADDRESS_BUTTON_ID,
} from '../../../../constants/test-ids';
import Routes from '../../../../constants/navigation/Routes';
import {
  CONTACT_ALREADY_SAVED,
  SYMBOL_ERROR,
} from '../../../../constants/error';
import { baseStyles } from '../../../../styles/common';
import createStyles from './styles';
import { ADD_ADDRESS_BUTTON } from '../../../../../wdio/screen-objects/testIDs/Screens/SendScreen.testIds';
import { ENTER_ALIAS_INPUT_BOX_ID } from '../../../../../wdio/screen-objects/testIDs/Screens/AddressBook.testids';
import generateTestId from '../../../../../wdio/utils/generateTestId';
import {
  selectChainId,
  selectNetwork,
  selectProviderType,
  selectTicker,
} from '../../../../selectors/networkController';
import { isNetworkBuyNativeTokenSupported } from '../../../UI/FiatOnRampAggregator/utils';
import { getRampNetworks } from '../../../../reducers/fiatOrders';
// import {validateAddressOrENSFromInput} from '../util'
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';

const dummy = () => true;

/**
 * View that wraps the wraps the "Send" screen
 */
const SendTo = () => {
  const { styles, theme } = useStyles(createStyles, {});
  const { colors, themeAppearance } = theme;

  const dispatch = useDispatch();

  const identities = useSelector(
    (state: any) =>
      state.engine.backgroundState.PreferencesController.identities,
  );

  const selectedAddress = useSelector(
    (state: any) =>
      state.engine.backgroundState.PreferencesController.selectedAddress,
  );

  const accounts = useSelector(
    (state: any) =>
      state.engine.backgroundState.AccountTrackerController.accounts,
  );

  const addressBook = useSelector(
    (state: any) =>
      state.engine.backgroundState.AddressBookController.addressBook,
  );

  const chainId = useSelector((state: any) => selectChainId(state));

  const ticker = useSelector((state: any) => selectTicker(state));

  const network = useSelector((state: any) => selectNetwork(state));

  const providerType = useSelector((state: any) => selectProviderType(state));

  const isPaymentRequest = useSelector(
    (state: any) => state.transaction.paymentRequest,
  );

  const addressToInputRef = createRef();
  const [sendToState, setSendToState] = useState({
    accountName: identities[selectedAddress].name,
    accountBalance: '',
    accountAddress: selectedAddress,
    balanceIsZero: false,
    addressError: undefined,
    inputWidth: { width: '99%' },
    toEnsAddressResolved: undefined,
    confusableCollection: [],
    toEnsName: undefined,
    errorContinue: false,
    isOnlyWarning: false,
    toAccount: undefined,
    toSelectedAddressReady: false,
    isFromAddressBook: false,
    toSelectedAddressName: undefined,
    alias: undefined,
    addToAddressBookModalVisible: false,
    addToAddressToAddressBook: false,
  });

  const {
    addressError,
    balanceIsZero,
    accountAddress,
    addToAddressToAddressBook,
    accountBalance,
    accountName,
    inputWidth,
    confusableCollection,
    toEnsAddressResolved,
    toEnsName,
    errorContinue,
    isOnlyWarning,
    toAccount,
    toSelectedAddressReady,
    isFromAddressBook,
    toSelectedAddressName,
    alias,
    addToAddressBookModalVisible,
  } = sendToState;

  const navigation = useNavigation();
  const route = useRoute();

  const updateNavBar = useCallback(() => {
    navigation.setOptions(
      getSendFlowTitle('send.send_to', navigation, route, colors),
    );
  }, [colors, navigation, route]);

  useEffect(() => {
    updateNavBar();
  }, [updateNavBar]);

  const networkAddressBook = addressBook[network] || {};

  /**
   * This returns the address name from the address book or user accounts if the selectedAddress exist there
   * @param {String} account - Address input
  //  * @returns {String | null} - Address or null if toAccount is not in the addressBook or identities array
   */
  const getAddressNameFromBookOrIdentities = (account: string) => {
    if (!account) return;
    const checksummedAddress = toChecksumAddress(account);

    return networkAddressBook[checksummedAddress]
      ? networkAddressBook[checksummedAddress].name
      : identities[checksummedAddress]
      ? identities[checksummedAddress].name
      : null;
  };

  const validateAddressOrENSFromInput = async (account: string) => {
    const {
      addressError: addressHasError,
      toEnsName: ensName,
      addressReady,
      toEnsAddress,
      addToAddressToAddressBook: addToAddressBook,
      toAddressName,
      errorContinue: hasErrorContinue,
      isOnlyWarning: isWarning,
      confusableCollection: confusablesCollection,
    } = await validateAddressOrENS({
      toAccount: account,
      network,
      addressBook,
      identities,
      chainId,
    });

    return {
      addressHasError,
      ensName,
      toSelectedAddressReady: addressReady,
      toEnsAddressResolved: toEnsAddress,
      addToAddressBook,
      toSelectedAddressName: toAddressName,
      hasErrorContinue,
      isWarning,
      confusablesCollection,
    };
  };

  const onToSelectedAddressChange = async (account: string) => {
    const addressName = getAddressNameFromBookOrIdentities(account);

    /**
     * If the address is from addressBook or identities
     * then validation is not necessary since it was already validated
     */
    if (addressName) {
      setSendToState({
        ...sendToState,
        toAccount: account,
        toSelectedAddressReady: true,
        isFromAddressBook: true,
        toSelectedAddressName: addressName,
      });
    } else {
      const {
        addToAddressBook,
        addressHasError,
        confusablesCollection,
        ensName,
        hasErrorContinue,
        isWarning,
        toEnsAddressResolved: toEnsAddress,
        toSelectedAddressName: toAddressName,
        toSelectedAddressReady: addressReady,
      } = await validateAddressOrENSFromInput(account);

      /**
       * Because validateAddressOrENSFromInput is an asynchronous function
       * we are setting the state here synchronously, so it does not block the UI
       * */
      setSendToState({
        ...sendToState,
        toAccount: account,
        isFromAddressBook: false,
        addToAddressToAddressBook: addToAddressBook,
        addressError: addressHasError,
        confusableCollection: confusablesCollection,
        toEnsName: ensName,
        errorContinue: hasErrorContinue,
        isOnlyWarning: isWarning,
        toEnsAddressResolved: toEnsAddress,
        toSelectedAddressName: toAddressName,
        toSelectedAddressReady: addressReady,
      });
    }
  };

  useEffect(() => {
    async function init() {
      navigation.setParams({ providerType, isPaymentRequest });
      const balance = `${renderFromWei(
        accounts[selectedAddress].balance,
      )} ${getTicker(ticker)}`;

      const ens = await doENSReverseLookup(selectedAddress, network);
      setTimeout(() => {
        setSendToState({
          ...sendToState,
          accountName: ens || accountName,
          accountBalance: balance,
          inputWidth: { width: '100%' },
          balanceIsZero: hexToBN(accounts[selectedAddress].balance).isZero(),
        });
      }, 100);
      if (!Object.keys(networkAddressBook).length) {
        setTimeout(() => {
          addressToInputRef?.current?.focus();
        }, 500);
      }
      //Fills in to address and sets the transaction if coming from QR code scan
      const targetAddress = route.params?.txMeta?.target_address;
      if (targetAddress) {
        dispatch(newAssetTransaction(getEther(ticker)));
        onToSelectedAddressChange(targetAddress);
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleAddToAddressBookModal = () => {
    setSendToState({
      ...sendToState,
      addToAddressBookModalVisible: !addToAddressBookModalVisible,
    });
  };

  const isAddressSaved = () => {
    const checksummedAddress = toChecksumAddress(toAccount);
    return !!(
      networkAddressBook[checksummedAddress] || identities[checksummedAddress]
    );
  };

  const validateToAddress = () => {
    let addressHasError;
    if (isENS(toAccount)) {
      if (!toEnsAddressResolved) {
        addressHasError = strings('transaction.could_not_resolve_ens');
      }
    } else if (!isValidHexAddress(toAccount, { mixedCaseUseChecksum: true })) {
      addressHasError = strings('transaction.invalid_address');
    }
    setSendToState({ ...sendToState, addressError: addressHasError });
    return addressHasError;
  };

  const onChangeAlias = (value: any) => {
    setSendToState({ ...sendToState, alias: value });
  };

  const onSaveToAddressBook = () => {
    const { AddressBookController } = Engine.context;
    const toAddress = toEnsAddressResolved || toAccount;
    AddressBookController.set(toAddress, alias, network);
    toggleAddToAddressBookModal();
    setSendToState({
      ...sendToState,
      toSelectedAddressName: alias,
      addToAddressToAddressBook: false,
      isFromAddressBook: true,
      toAccount: toAddress,
      alias: undefined,
    });
  };

  const onTransactionDirectionSet = async () => {
    if (!isAddressSaved()) {
      const addressHasError = validateToAddress();
      if (addressHasError) return;
    }
    const toAddress = toEnsAddressResolved || toAccount;
    dispatch(addRecent(toAddress));
    dispatch(
      setRecipient(
        accountAddress,
        toAddress,
        toEnsName,
        toSelectedAddressName,
        accountName,
      ),
    );
    InteractionManager.runAfterInteractions(() => {
      Analytics.trackEventWithParameters(
        MetaMetricsEvents.SEND_FLOW_ADDS_RECIPIENT,
        {
          network: providerType,
        },
      );
    });
    navigation.navigate(Routes.SEND_FLOW.AMOUNT);
  };

  const renderAddToAddressBookModal = () => (
    <ActionModal
      modalVisible={addToAddressBookModalVisible}
      confirmText={strings('address_book.save')}
      cancelText={strings('address_book.cancel')}
      onCancelPress={toggleAddToAddressBookModal}
      onRequestClose={toggleAddToAddressBookModal}
      onConfirmPress={onSaveToAddressBook}
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
                  onChangeText={onChangeAlias}
                  placeholder={strings(
                    'address_book.enter_an_alias_placeholder',
                  )}
                  placeholderTextColor={colors.text.muted}
                  spellCheck={false}
                  style={styles.addTextInput}
                  numberOfLines={1}
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

  const goToBuy = () => {
    navigation.navigate(Routes.FIAT_ON_RAMP_AGGREGATOR.ID);
    InteractionManager.runAfterInteractions(() => {
      AnalyticsV2.trackEvent(MetaMetricsEvents.BUY_BUTTON_CLICKED, {
        button_location: 'Send Flow warning',
        button_copy: 'Buy Native Token',
        chain_id_destination: chainId,
      });
    });
  };

  const renderBuyEth = () => {
    if (!allowedToBuy(network)) {
      return null;
    }

    return (
      <>
        <Text bold style={styles.buyEth} onPress={goToBuy}>
          {strings('fiat_on_ramp.buy', {
            ticker: getTicker(ticker),
          })}
        </Text>
      </>
    );
  };

  const renderAddressError = (addressHasError: any) =>
    addressHasError === SYMBOL_ERROR ? (
      <Fragment>
        <Text>{strings('transaction.tokenContractAddressWarning_1')}</Text>
        <Text bold>{strings('transaction.tokenContractAddressWarning_2')}</Text>
        <Text>{strings('transaction.tokenContractAddressWarning_3')}</Text>
      </Fragment>
    ) : (
      addressHasError
    );

  const updateAccountDetails = ({
    address,
    isBalanceZero,
    balance,
    accName,
  }: {
    address: string;
    isBalanceZero: boolean;
    balance: string;
    accName: string;
  }) => {
    setSendToState({
      ...sendToState,
      accountName: accName,
      accountBalance: balance,
      accountAddress: address,
      balanceIsZero: isBalanceZero,
    });
  };

  const updateParentState = (state) => {
    setSendToState({ ...sendToState, ...state });
  };

  const checksummedAddress = toAccount && toChecksumAddress(toAccount);
  const existingContact =
    checksummedAddress &&
    addressBook[network] &&
    addressBook[network][checksummedAddress];
  const displayConfusableWarning =
    !existingContact && confusableCollection && !!confusableCollection.length;
  const displayAsWarning =
    confusableCollection?.length &&
    !confusableCollection.some(hasZeroWidthPoints);
  const explanations =
    displayConfusableWarning &&
    getConfusablesExplanations(confusableCollection);

  return (
    <SafeAreaView
      edges={['bottom']}
      style={styles.wrapper}
      testID={SEND_SCREEN}
    >
      <View style={styles.imputWrapper}>
        <SendToAddressFrom
          updateAccountInfo={updateAccountDetails}
          accountAddress={accountAddress}
          accountName={accountName}
          accountBalance={accountBalance}
        />
        <SendToAddressTo
          inputRef={addressToInputRef}
          addressToReady={toSelectedAddressReady}
          toSelectedAddress={toEnsAddressResolved || toAccount}
          updateParentState={updateParentState}
          toSelectedAddressName={toSelectedAddressName}
          onSubmit={onTransactionDirectionSet}
          inputWidth={inputWidth}
          confusableCollectionArray={
            (!existingContact && confusableCollection) || []
          }
          isFromAddressBook={isFromAddressBook}
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
          onAccountPress={onToSelectedAddressChange}
          onAccountLongPress={dummy}
        />
      ) : (
        <View style={styles.nextActionWrapper}>
          <ScrollView>
            {addressError && addressError !== CONTACT_ALREADY_SAVED && (
              <View style={styles.addressErrorWrapper} testID={ADDRESS_ERROR}>
                <ErrorMessage
                  errorMessage={renderAddressError(addressError)}
                  errorContinue={!!errorContinue}
                  onContinue={onTransactionDirectionSet}
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
                onPress={toggleAddToAddressBookModal}
                testID={ADD_ADDRESS_BUTTON_ID}
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

                      {renderBuyEth()}
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
                onPress={onTransactionDirectionSet}
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
      {renderAddToAddressBookModal()}
    </SafeAreaView>
  );
};

export default SendTo;
