import React, { PureComponent } from 'react';
import {
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { fontStyles } from '../../../../../styles/common';
import PropTypes from 'prop-types';
import { getEditableOptions } from '../../../../UI/Navbar';
import StyledButton from '../../../../UI/StyledButton';
import Engine from '../../../../../core/Engine';
import { connect } from 'react-redux';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { strings } from '../../../../../../locales/i18n';
import {
  renderShortAddress,
  areAddressesEqual,
  validateAddressOrENS,
  toChecksumAddress,
} from '../../../../../util/address';
import ErrorMessage from '../../../confirmations/legacy/SendFlow/ErrorMessage';
import AntIcon from 'react-native-vector-icons/AntDesign';
import ActionSheet from '@metamask/react-native-actionsheet';
import { mockTheme, ThemeContext } from '../../../../../util/theme';
import {
  CONTACT_ALREADY_SAVED,
  SYMBOL_ERROR,
} from '../../../../../constants/error';
import Routes from '../../../../../constants/navigation/Routes';
import { createQRScannerNavDetails } from '../../../QRTabSwitcher';
import {
  selectEvmChainId,
  selectNetworkConfigurations,
} from '../../../../../selectors/networkController';
import { AddContactViewSelectorsIDs } from '../../../../../../e2e/selectors/Settings/Contacts/AddContactView.selectors';
import { selectInternalAccounts } from '../../../../../selectors/accountsController';
import { selectAddressBook } from '../../../../../selectors/addressBookController';
import NetworkListBottomSheet from '../../../AddAsset/components/NetworkListBottomSheet';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../../component-library/components/Avatars/Avatar';
import { getNetworkImageSource } from '../../../../../util/networks';
import ButtonIcon from '../../../../../component-library/components/Buttons/ButtonIcon';
import {
  IconColor,
  IconName,
} from '../../../../../component-library/components/Icons/Icon';

const createStyles = (colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
      flexDirection: 'column',
    },
    scrollWrapper: {
      flex: 1,
      paddingVertical: 12,
    },
    input: {
      ...fontStyles.normal,
      flex: 1,
      fontSize: 12,
      borderColor: colors.border.default,
      borderRadius: 5,
      borderWidth: 2,
      padding: 10,
      flexDirection: 'row',
      alignItems: 'center',
      color: colors.text.default,
    },
    networkSelector: {
      ...fontStyles.normal,
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderRadius: 5,
      borderWidth: 2,
      borderColor: colors.border.default,
      padding: 10,
    },
    networkSelectorNetworkName: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    networkSelectorNetworkNameLabel: {
      color: colors.text.default,
    },
    resolvedInput: {
      ...fontStyles.normal,
      fontSize: 10,
      color: colors.text.default,
    },
    informationWrapper: {
      flex: 1,
      paddingHorizontal: 24,
    },
    label: {
      fontSize: 14,
      paddingVertical: 12,
      color: colors.text.default,
      ...fontStyles.bold,
    },
    buttonsWrapper: {
      marginVertical: 12,
      flexDirection: 'row',
      alignSelf: 'flex-end',
    },
    buttonsContainer: {
      flex: 1,
      flexDirection: 'column',
      alignSelf: 'flex-end',
    },
    scanIcon: {
      flexDirection: 'column',
      alignItems: 'center',
    },
    iconWrapper: {
      alignItems: 'flex-end',
    },
    textInput: {
      ...fontStyles.normal,
      padding: 0,
      paddingRight: 8,
      color: colors.text.default,
    },
    inputWrapper: {
      flex: 1,
      flexDirection: 'column',
    },
    textInputDisaled: {
      borderColor: colors.transparent,
    },
    actionButton: {
      marginVertical: 4,
    },
  });

const ADD = 'add';
const EDIT = 'edit';

/**
 * View that contains app information
 */
class ContactForm extends PureComponent {
  static propTypes = {
    /**
     * Object that represents the navigator
     */
    navigation: PropTypes.object,
    /**
     * An array containing each account with metadata
     */
    internalAccounts: PropTypes.array,
    /**
     * Map representing the address book
     */
    addressBook: PropTypes.object,
    /**
     * Object that represents the network configuration
     */
    networkConfigurations: PropTypes.object,
    /**
     * The current chain ID of the app
     */
    chainId: PropTypes.string,
    /**
     * Object that represents the current route info like params passed to it
     */
    route: PropTypes.object,
  };

  state = {
    name: null,
    address: null,
    originalContactChainId: '',
    contactChainId: '',
    addressError: null,
    toEnsName: null,
    toEnsAddress: null,
    addressReady: false,
    mode: this.props.route.params?.mode ?? ADD,
    memo: null,
    editable: true,
    inputWidth: Platform.OS === 'android' ? '99%' : undefined,
    openNetworkSelector: false,
  };

  actionSheet = React.createRef();
  addressInput = React.createRef();
  memoInput = React.createRef();

  sheetRef = React.createRef();

  validationTimeoutId = null;

  updateNavBar = () => {
    const { navigation, route } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    navigation.setOptions(
      getEditableOptions(
        strings(`address_book.${route.params?.mode ?? ADD}_contact_title`),
        navigation,
        route,
        colors,
      ),
    );
  };

  componentDidMount = () => {
    const { mode } = this.state;
    const { navigation } = this.props;
    this.updateNavBar();
    // Workaround https://github.com/facebook/react-native/issues/9958
    this.state.inputWidth &&
      setTimeout(() => {
        this.setState({ inputWidth: '100%' });
      }, 100);
    if (mode === EDIT) {
      const { addressBook, internalAccounts } = this.props;
      const completeAndFlattenedAddressBook = Object.entries(addressBook)
        .filter(([addressBookChainId, _]) => addressBookChainId !== '*')
        .map(([_, addressDict]) => Object.values(addressDict))
        .flat();
      const address = this.props.route.params?.address ?? '';
      const contact =
        completeAndFlattenedAddressBook.find(
          (contact) => contact.address === address,
        ) ||
        (address &&
          internalAccounts.find((account) =>
            areAddressesEqual(account.address, address),
          ));
      this.setState({
        address,
        name: contact?.name ?? '',
        memo: contact?.memo ?? '',
        contactChainId: contact?.chainId ?? this.props.chainId ?? '',
        originalContactChainId: contact?.chainId ?? this.props.chainId ?? '',
        addressReady: true,
        editable: false,
      });
      navigation && navigation.setParams({ dispatch: this.onEdit, mode: EDIT });
    }
  };

  componentDidUpdate = () => {
    this.updateNavBar();
  };

  componentWillUnmount = () => {
    if (this.validationTimeoutId) {
      clearTimeout(this.validationTimeoutId);
    }
  };

  onEdit = () => {
    const { navigation } = this.props;
    const { editable } = this.state;
    if (editable) navigation.setParams({ editMode: EDIT });
    else navigation.setParams({ editMode: ADD });

    this.setState({ editable: !editable });
  };

  onDelete = () => {
    this.contactAddressToRemove = this.state.address;
    this.actionSheet && this.actionSheet.show();
  };

  onChangeName = (name) => {
    this.setState({ name });
  };

  validateAddressOrENSFromInput = async (address) => {
    const { addressBook, internalAccounts, chainId } = this.props;
    const { contactChainId } = this.state;

    const {
      addressError,
      toEnsName,
      addressReady,
      toEnsAddress,
      errorContinue,
    } = await validateAddressOrENS(
      address,
      addressBook,
      internalAccounts,
      contactChainId || chainId,
    );

    this.setState({
      addressError,
      toEnsName,
      addressReady,
      toEnsAddress,
      errorContinue,
    });
  };

  onChangeAddress = (address) => {
    this.setState({
      address,
      toEnsName: null,
      toEnsAddress: null,
      addressError: null,
      addressReady: false,
    });

    if (this.validationTimeoutId) {
      clearTimeout(this.validationTimeoutId);
    }

    this.validationTimeoutId = setTimeout(() => {
      this.validateAddressOrENSFromInput(address);
    }, 300);
  };

  onChangeMemo = (memo) => {
    this.setState({ memo });
  };

  jumpToAddressInput = () => {
    const { current } = this.addressInput;
    current && current.focus();
  };

  jumpToMemoInput = () => {
    const { current } = this.memoInput;
    current && current.focus();
  };

  saveContact = () => {
    const {
      name,
      address,
      memo,
      toEnsAddress,
      contactChainId,
      originalContactChainId,
    } = this.state;
    const { navigation, chainId } = this.props;
    const { AddressBookController } = Engine.context;

    const wasChainIdChanged = contactChainId !== originalContactChainId;

    if (!name || !address) return;

    if (wasChainIdChanged) {
      AddressBookController.delete(
        originalContactChainId,
        toChecksumAddress(address),
      );
    }

    AddressBookController.set(
      toChecksumAddress(toEnsAddress || address),
      name,
      contactChainId || chainId,
      memo,
    );
    navigation.pop();
  };

  deleteContact = () => {
    const { AddressBookController } = Engine.context;
    const { navigation, route } = this.props;
    const { originalContactChainId } = this.state;

    AddressBookController.delete(
      originalContactChainId,
      this.contactAddressToRemove,
    );
    route.params.onDelete();
    navigation.pop();
  };

  onScan = () => {
    this.props.navigation.navigate(
      ...createQRScannerNavDetails({
        onScanSuccess: (meta) => {
          if (meta.target_address) {
            this.onChangeAddress(meta.target_address);
          }
        },
        origin: Routes.SETTINGS.CONTACT_FORM,
      }),
    );
  };

  setSelectedNetwork = (contactChainId) => {
    this.setState({ contactChainId });
  };

  setOpenNetworkSelector = (openNetworkSelector) => {
    this.setState({ openNetworkSelector });
  };

  createActionSheetRef = (ref) => {
    this.actionSheet = ref;
  };

  renderErrorMessage = (addressError) => {
    let errorMessage = addressError;

    if (addressError === CONTACT_ALREADY_SAVED) {
      errorMessage = strings('address_book.address_already_saved');
    }
    if (addressError === SYMBOL_ERROR) {
      errorMessage = `${
        strings('transaction.tokenContractAddressWarning_1') +
        strings('transaction.tokenContractAddressWarning_2') +
        strings('transaction.tokenContractAddressWarning_3')
      }`;
    }

    return errorMessage;
  };

  onErrorContinue = () => {
    this.setState({ addressError: null });
  };

  render = () => {
    const {
      address,
      addressError,
      toEnsName,
      name,
      mode,
      addressReady,
      memo,
      editable,
      inputWidth,
      toEnsAddress,
      errorContinue,
      contactChainId,
    } = this.state;
    const colors = this.context.colors || mockTheme.colors;
    const themeAppearance = this.context.themeAppearance || 'light';
    const styles = createStyles(colors);

    const networkName =
      this.props.networkConfigurations[contactChainId]?.name ||
      this.props.networkConfigurations[this.props.chainId]?.name ||
      '';
    const isAddMode = editable && mode === ADD;
    const isEditMode = editable && mode === EDIT;

    return (
      <SafeAreaView
        style={styles.wrapper}
        testID={AddContactViewSelectorsIDs.CONTAINER}
      >
        <KeyboardAwareScrollView style={styles.informationWrapper}>
          <View style={styles.scrollWrapper}>
            <Text style={styles.label}>{strings('address_book.name')}</Text>
            <TextInput
              editable={this.state.editable}
              autoCapitalize={'none'}
              autoCorrect={false}
              onChangeText={this.onChangeName}
              placeholder={strings('address_book.nickname')}
              placeholderTextColor={colors.text.muted}
              spellCheck={false}
              numberOfLines={1}
              style={[
                styles.input,
                inputWidth ? { width: inputWidth } : {},
                editable ? {} : styles.textInputDisaled,
              ]}
              value={name}
              onSubmitEditing={this.jumpToAddressInput}
              testID={AddContactViewSelectorsIDs.NAME_INPUT}
              keyboardAppearance={themeAppearance}
            />
            <Text style={styles.label}>{strings('address_book.address')}</Text>
            <View
              style={[styles.input, editable ? {} : styles.textInputDisaled]}
            >
              <View style={styles.inputWrapper}>
                <TextInput
                  editable={isAddMode}
                  autoCapitalize={'none'}
                  autoCorrect={false}
                  onChangeText={this.onChangeAddress}
                  placeholder={strings('address_book.add_input_placeholder')}
                  placeholderTextColor={colors.text.muted}
                  spellCheck={false}
                  numberOfLines={1}
                  style={[
                    styles.textInput,
                    inputWidth ? { width: inputWidth } : {},
                    isEditMode
                      ? {
                          color: colors.text.alternative,
                        }
                      : {},
                  ]}
                  value={toEnsName || address}
                  ref={this.addressInput}
                  onSubmitEditing={this.jumpToMemoInput}
                  testID={AddContactViewSelectorsIDs.ADDRESS_INPUT}
                  keyboardAppearance={themeAppearance}
                />
                {toEnsName && toEnsAddress && (
                  <Text style={styles.resolvedInput}>
                    {renderShortAddress(toEnsAddress)}
                  </Text>
                )}
              </View>

              {isAddMode && (
                <TouchableOpacity
                  onPress={this.onScan}
                  style={styles.iconWrapper}
                >
                  <AntIcon
                    name="scan1"
                    size={20}
                    color={colors.primary.default}
                    style={styles.scanIcon}
                  />
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.label}>{strings('address_book.memo')}</Text>
            <View
              style={[styles.input, editable ? {} : styles.textInputDisaled]}
            >
              <View style={styles.inputWrapper}>
                <TextInput
                  multiline
                  editable={editable}
                  autoCapitalize={'none'}
                  autoCorrect={false}
                  onChangeText={this.onChangeMemo}
                  placeholder={strings('address_book.memo')}
                  placeholderTextColor={colors.text.muted}
                  spellCheck={false}
                  numberOfLines={1}
                  style={[
                    styles.textInput,
                    inputWidth ? { width: inputWidth } : {},
                  ]}
                  value={memo}
                  ref={this.memoInput}
                  testID={AddContactViewSelectorsIDs.MEMO_INPUT}
                  keyboardAppearance={themeAppearance}
                />
              </View>
            </View>

            <>
              <Text style={styles.label}>
                {strings('address_book.network')}
              </Text>
              <TouchableOpacity
                disabled={!editable}
                style={[styles.networkSelector]}
                onPress={() => {
                  if (this.state.editable) {
                    this.setOpenNetworkSelector(true);
                  }
                }}
                onLongPress={() => {
                  if (this.state.editable) {
                    this.setOpenNetworkSelector(true);
                  }
                }}
                testID={AddContactViewSelectorsIDs.NETWORK_INPUT}
              >
                <View style={styles.networkSelectorNetworkName}>
                  <Avatar
                    variant={AvatarVariant.Network}
                    size={AvatarSize.Sm}
                    name={networkName}
                    imageSource={getNetworkImageSource({
                      chainId: contactChainId || this.props.chainId,
                    })}
                  />
                  <Text style={styles.networkSelectorNetworkNameLabel}>
                    {networkName}
                  </Text>
                </View>
                {!!editable && (
                  <ButtonIcon
                    iconName={IconName.ArrowDown}
                    iconColor={IconColor.Default}
                    onPress={() => {
                      if (this.state.editable) {
                        this.setOpenNetworkSelector(true);
                      }
                    }}
                    accessibilityRole="button"
                    style={styles.buttonIcon}
                  />
                )}
              </TouchableOpacity>
            </>
          </View>

          {addressError && (
            <ErrorMessage
              errorMessage={this.renderErrorMessage(addressError)}
              errorContinue={!!errorContinue}
              onContinue={this.onErrorContinue}
            />
          )}

          {!!editable && (
            <View style={styles.buttonsWrapper}>
              <View style={styles.buttonsContainer}>
                <View style={styles.actionButton}>
                  <StyledButton
                    type={'confirm'}
                    disabled={!addressReady || !name || !!addressError}
                    onPress={this.saveContact}
                    testID={AddContactViewSelectorsIDs.ADD_BUTTON}
                  >
                    {strings(`address_book.${mode}_contact`)}
                  </StyledButton>
                </View>
                {mode === EDIT && (
                  <View style={styles.actionButton}>
                    <StyledButton
                      style={styles.actionButton}
                      type={'warning-empty'}
                      disabled={!addressReady || !name || !!addressError}
                      onPress={this.onDelete}
                      testID={AddContactViewSelectorsIDs.DELETE_BUTTON}
                    >
                      {strings(`address_book.delete`)}
                    </StyledButton>
                  </View>
                )}
              </View>
            </View>
          )}
          <ActionSheet
            ref={this.createActionSheetRef}
            title={strings('address_book.delete_contact')}
            options={[
              strings('address_book.delete'),
              strings('address_book.cancel'),
            ]}
            cancelButtonIndex={1}
            destructiveButtonIndex={0}
            // eslint-disable-next-line react/jsx-no-bind
            onPress={(index) => (index === 0 ? this.deleteContact() : null)}
            theme={themeAppearance}
          />
        </KeyboardAwareScrollView>
        {this.state.openNetworkSelector ? (
          <NetworkListBottomSheet
            selectedNetwork={this.state.contactChainId}
            setSelectedNetwork={this.setSelectedNetwork}
            setOpenNetworkSelector={this.setOpenNetworkSelector}
            sheetRef={this.sheetRef}
          />
        ) : null}
      </SafeAreaView>
    );
  };
}

ContactForm.contextType = ThemeContext;

const mapStateToProps = (state) => ({
  addressBook: selectAddressBook(state),
  internalAccounts: selectInternalAccounts(state),
  chainId: selectEvmChainId(state),
  networkConfigurations: selectNetworkConfigurations(state),
});

export default connect(mapStateToProps)(ContactForm);
