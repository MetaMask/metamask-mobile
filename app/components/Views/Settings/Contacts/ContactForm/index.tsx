import React, { useEffect, useRef, useState } from 'react';
import {
  DimensionValue,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  colors as staticColors,
  fontStyles,
} from '../../../../../styles/common';
import { HeaderStandard } from '@metamask/design-system-react-native';
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
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import ErrorMessage from '../../../confirmations/legacy/components/ErrorMessage';
import AntIcon from 'react-native-vector-icons/AntDesign';
import ActionSheet from '@metamask/react-native-actionsheet';
import { useTheme } from '../../../../../util/theme';
import {
  CONTACT_ALREADY_SAVED,
  SYMBOL_ERROR,
} from '../../../../../constants/error';
import Routes from '../../../../../constants/navigation/Routes';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { createQRScannerNavDetails } from '../../../QRTabSwitcher';
import {
  selectEvmChainId,
  selectNetworkConfigurations,
} from '../../../../../selectors/networkController';
import { AddContactViewSelectorsIDs } from '../AddContactView.testIds';
import { CommonSelectorsIDs } from '../../../../../util/Common.testIds';
import { selectInternalAccounts } from '../../../../../selectors/accountsController';
import { selectAddressBook } from '../../../../../selectors/addressBookController';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import NetworkListBottomSheet from '../../../AddAsset/components/NetworkListBottomSheet/NetworkListBottomSheet';
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
import type { AddressBookControllerState } from '@metamask/address-book-controller';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import type {
  MultichainNetworkConfiguration,
  SupportedCaipChainId,
} from '@metamask/multichain-network-controller';
import type { Hex } from '@metamask/utils';
import type {
  NavigationProp,
  ParamListBase,
  RouteProp,
} from '@react-navigation/native';
import type { RootState } from '../../../../../reducers';
import type { RootStackParamList } from '../../../../../core/NavigationService/types';
import type { Colors } from '../../../../../util/theme/models';
import type { BottomSheetRef } from '../../../../../component-library/components/BottomSheets/BottomSheet';

const createStyles = (colors: Colors) =>
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
    headerEndActionText: {
      color: colors.primary.default,
      fontSize: 14,
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
      borderColor: staticColors.transparent,
    },
    actionButton: {
      marginVertical: 4,
    },
  });

const ADD = 'add';
const EDIT = 'edit';

type ContactMode = typeof ADD | typeof EDIT;
type AddressBook = AddressBookControllerState['addressBook'];
type NetworkConfigurations = Record<string, MultichainNetworkConfiguration>;
type ValidationResult = Awaited<ReturnType<typeof validateAddressOrENS>>;

const isHexChainId = (value: string): value is Hex =>
  /^0x[0-9a-f]+$/iu.test(value);

interface ContactFormState {
  name: string | null;
  address: string | null;
  originalContactChainId: Hex | '';
  contactChainId: Hex | '';
  addressError: ValidationResult['addressError'] | null;
  toEnsName: ValidationResult['toEnsName'] | null;
  toEnsAddress: ValidationResult['toEnsAddress'] | null;
  addressReady: boolean;
  errorContinue?: ValidationResult['errorContinue'];
  mode: ContactMode;
  memo: string | null;
  editable: boolean;
  inputWidth: DimensionValue | undefined;
  openNetworkSelector: boolean;
}

interface ContactFormStateProps {
  internalAccounts: InternalAccount[];
  addressBook: AddressBook;
  networkConfigurations: NetworkConfigurations;
  chainId: Hex;
}

interface ContactFormOwnProps {
  navigation: Pick<NavigationProp<ParamListBase>, 'navigate' | 'setParams'> & {
    pop: () => void;
  };
  route: Pick<RouteProp<RootStackParamList, 'ContactForm'>, 'params'>;
}

type ContactFormProps = ContactFormOwnProps & ContactFormStateProps;

const getNetworkConfiguration = (
  networkConfigurations: NetworkConfigurations,
  chainId: string,
): MultichainNetworkConfiguration | undefined => {
  if (!chainId) return undefined;

  return (
    networkConfigurations[chainId] ||
    (/^\d+$/.test(chainId)
      ? networkConfigurations[`0x${Number(chainId).toString(16)}`]
      : undefined)
  );
};

/**
 * View that contains app information
 */
export const ContactForm = ({
  navigation,
  internalAccounts,
  addressBook,
  networkConfigurations,
  chainId,
  route,
}: ContactFormProps) => {
  const { colors, themeAppearance = 'light' } = useTheme();
  const styles = createStyles(colors);
  const [state, setState] = useState<ContactFormState>({
    name: null,
    address: null,
    originalContactChainId: '',
    contactChainId: '',
    addressError: null,
    toEnsName: null,
    toEnsAddress: null,
    addressReady: false,
    mode: route.params?.mode ?? ADD,
    memo: null,
    editable: true,
    inputWidth: Platform.OS === 'android' ? '99%' : undefined,
    openNetworkSelector: false,
  });
  const stateRef = useRef(state);
  const actionSheet = useRef<typeof ActionSheet>(null);
  const addressInput = useRef<TextInput>(null);
  const memoInput = useRef<TextInput>(null);
  const sheetRef = useRef<BottomSheetRef>(null);
  const validationTimeoutId = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const inputWidthTimeoutId = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const contactAddressToRemove = useRef<string | null>(null);
  const validationContext = useRef({
    addressBook,
    internalAccounts,
    chainId,
  });
  const initialData = useRef({
    addressBook,
    internalAccounts,
    chainId,
    address: route.params?.address ?? '',
    navigation,
  });

  const updateState = (updates: Partial<ContactFormState>) => {
    setState((currentState) => ({ ...currentState, ...updates }));
  };

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    validationContext.current = {
      addressBook,
      internalAccounts,
      chainId,
    };
  }, [addressBook, chainId, internalAccounts]);

  const onEdit = () => {
    const { editable } = stateRef.current;
    navigation.setParams({ editMode: editable ? EDIT : ADD });
    updateState({ editable: !editable });
  };

  const renderHeaderEndAccessory = () => {
    const addMode = route.params?.mode === 'add';

    if (addMode) {
      return null;
    }

    const editMode = route.params?.editMode === 'edit';

    return (
      <TouchableOpacity
        onPress={onEdit}
        testID={AddContactViewSelectorsIDs.EDIT_BUTTON}
      >
        <Text style={styles.headerEndActionText}>
          {editMode
            ? strings('address_book.edit')
            : strings('address_book.cancel')}
        </Text>
      </TouchableOpacity>
    );
  };

  useEffect(() => {
    const { mode, inputWidth } = stateRef.current;
    const {
      addressBook: initialAddressBook,
      internalAccounts: initialInternalAccounts,
      chainId: initialChainId,
      address,
      navigation: initialNavigation,
    } = initialData.current;

    // Workaround https://github.com/facebook/react-native/issues/9958
    if (inputWidth) {
      inputWidthTimeoutId.current = setTimeout(() => {
        setState((currentState) => ({
          ...currentState,
          inputWidth: '100%',
        }));
      }, 100);
    }

    if (mode === EDIT) {
      const completeAndFlattenedAddressBook = Object.entries(initialAddressBook)
        .filter(([addressBookChainId, _]) => addressBookChainId !== '*')
        .map(([_, addressDict]) => Object.values(addressDict))
        .flat();
      const contact =
        completeAndFlattenedAddressBook.find(
          (addressBookContact) => addressBookContact.address === address,
        ) ||
        (address
          ? initialInternalAccounts.find((account) =>
              areAddressesEqual(account.address, address),
            )
          : undefined);
      const contactMemo =
        contact && 'memo' in contact ? contact.memo : undefined;
      const contactName =
        contact && 'name' in contact && typeof contact.name === 'string'
          ? contact.name
          : '';
      const savedContactChainId =
        contact && 'chainId' in contact ? contact.chainId : initialChainId;
      setState((currentState) => ({
        ...currentState,
        address,
        name: contactName,
        memo: contactMemo ?? '',
        contactChainId: savedContactChainId,
        originalContactChainId: savedContactChainId,
        addressReady: true,
        editable: false,
      }));
      initialNavigation?.setParams({
        dispatch: () => {
          const { editable } = stateRef.current;
          initialNavigation.setParams({
            editMode: editable ? EDIT : ADD,
          });
          setState((currentState) => ({
            ...currentState,
            editable: !editable,
          }));
        },
        mode: EDIT,
      });
    }

    return () => {
      if (inputWidthTimeoutId.current) {
        clearTimeout(inputWidthTimeoutId.current);
      }
      if (validationTimeoutId.current) {
        clearTimeout(validationTimeoutId.current);
      }
    };
  }, []);

  const onDelete = () => {
    contactAddressToRemove.current = state.address;
    actionSheet.current?.show();
  };

  const onChangeName = (name: string) => {
    updateState({ name });
  };

  const validateAddressOrENSFromInput = async (address: string) => {
    const { contactChainId } = stateRef.current;
    const {
      addressBook: currentAddressBook,
      internalAccounts: currentInternalAccounts,
      chainId: currentChainId,
    } = validationContext.current;

    const {
      addressError,
      toEnsName,
      addressReady,
      toEnsAddress,
      errorContinue,
    } = await validateAddressOrENS(
      address,
      currentAddressBook,
      currentInternalAccounts,
      contactChainId || currentChainId,
    );

    updateState({
      addressError,
      toEnsName,
      addressReady,
      toEnsAddress,
      errorContinue,
    });
  };

  const onChangeAddress = (address: string) => {
    updateState({
      address,
      toEnsName: null,
      toEnsAddress: null,
      addressError: null,
      addressReady: false,
    });

    if (validationTimeoutId.current) {
      clearTimeout(validationTimeoutId.current);
    }

    validationTimeoutId.current = setTimeout(() => {
      validateAddressOrENSFromInput(address);
    }, 300);
  };

  const onChangeMemo = (memo: string) => {
    updateState({ memo });
  };

  const jumpToAddressInput = () => {
    const { current } = addressInput;
    current && current.focus();
  };

  const jumpToMemoInput = () => {
    const { current } = memoInput;
    current && current.focus();
  };

  const saveContact = () => {
    const {
      name,
      address,
      memo,
      toEnsAddress,
      contactChainId,
      originalContactChainId,
    } = state;
    const { AddressBookController } = Engine.context;

    const wasChainIdChanged = contactChainId !== originalContactChainId;

    if (!name || !address) return;

    if (wasChainIdChanged && originalContactChainId) {
      AddressBookController.delete(
        originalContactChainId,
        toChecksumAddress(address),
      );
    }

    const setAddressBookContact = AddressBookController.set.bind(
      AddressBookController,
    ) as (
      contactAddress: string,
      contactName: string,
      contactChainId: Hex,
      contactMemo: string | null,
    ) => void;
    setAddressBookContact(
      toChecksumAddress(toEnsAddress || address),
      name,
      contactChainId || chainId,
      memo,
    );
    navigation.pop();
  };

  const deleteContact = () => {
    const { AddressBookController } = Engine.context;
    const { originalContactChainId } = state;
    const addressToRemove = contactAddressToRemove.current;

    if (!addressToRemove) {
      return;
    }

    if (!originalContactChainId) {
      return;
    }

    AddressBookController.delete(originalContactChainId, addressToRemove);
    route.params?.onDelete?.();
    navigation.pop();
  };

  const onScan = () => {
    navigation.navigate(
      ...createQRScannerNavDetails({
        onScanSuccess: (meta) => {
          if (meta.target_address) {
            onChangeAddress(meta.target_address);
          }
        },
        origin: Routes.SETTINGS.CONTACT_FORM,
      }),
    );
  };

  const setSelectedNetwork = (selectedChainId: SupportedCaipChainId | Hex) => {
    if (isHexChainId(selectedChainId)) {
      updateState({ contactChainId: selectedChainId });
    }
  };

  const setOpenNetworkSelector = (openNetworkSelector: boolean) => {
    updateState({ openNetworkSelector });
  };

  const renderErrorMessage = (addressError: string): string => {
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

  const onErrorContinue = () => {
    updateState({ addressError: null });
  };

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
  } = state;

  const contactNetworkConfiguration = getNetworkConfiguration(
    networkConfigurations,
    contactChainId,
  );
  const currentNetworkConfiguration = getNetworkConfiguration(
    networkConfigurations,
    chainId,
  );
  const networkName =
    contactNetworkConfiguration?.name ||
    (contactChainId
      ? strings('address_book.custom')
      : currentNetworkConfiguration?.name || '');
  const isAddMode = editable && mode === ADD;
  const isEditMode = editable && mode === EDIT;
  const headerTitle = strings(
    `address_book.${route.params?.mode ?? ADD}_contact_title`,
  );
  const headerEndAccessory = renderHeaderEndAccessory();

  return (
    <SafeAreaView
      style={styles.wrapper}
      testID={AddContactViewSelectorsIDs.CONTAINER}
      edges={{ bottom: 'additive' }}
    >
      <HeaderStandard
        includesTopInset
        title={headerTitle}
        onBack={() => navigation.pop()}
        backButtonProps={{
          testID: CommonSelectorsIDs.EDIT_CONTACT_BACK_BUTTON,
        }}
        endAccessory={headerEndAccessory ?? undefined}
      />
      <KeyboardAwareScrollView style={styles.informationWrapper}>
        <View style={styles.scrollWrapper}>
          <Text style={styles.label}>{strings('address_book.name')}</Text>
          <TextInput
            editable={state.editable}
            autoCapitalize={'none'}
            autoCorrect={false}
            onChangeText={onChangeName}
            placeholder={strings('address_book.nickname')}
            placeholderTextColor={colors.text.muted}
            spellCheck={false}
            numberOfLines={1}
            style={[
              styles.input,
              inputWidth ? { width: inputWidth } : {},
              editable ? {} : styles.textInputDisaled,
            ]}
            value={name ?? ''}
            onSubmitEditing={jumpToAddressInput}
            testID={AddContactViewSelectorsIDs.NAME_INPUT}
            keyboardAppearance={themeAppearance}
          />
          <Text style={styles.label}>{strings('address_book.address')}</Text>
          <View style={[styles.input, editable ? {} : styles.textInputDisaled]}>
            <View style={styles.inputWrapper}>
              <TextInput
                editable={isAddMode}
                autoCapitalize={'none'}
                autoCorrect={false}
                onChangeText={onChangeAddress}
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
                value={toEnsName || address || ''}
                ref={addressInput}
                onSubmitEditing={jumpToMemoInput}
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
              <TouchableOpacity onPress={onScan} style={styles.iconWrapper}>
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
          <View style={[styles.input, editable ? {} : styles.textInputDisaled]}>
            <View style={styles.inputWrapper}>
              <TextInput
                multiline
                editable={editable}
                autoCapitalize={'none'}
                autoCorrect={false}
                onChangeText={onChangeMemo}
                placeholder={strings('address_book.memo')}
                placeholderTextColor={colors.text.muted}
                spellCheck={false}
                numberOfLines={1}
                style={[
                  styles.textInput,
                  inputWidth ? { width: inputWidth } : {},
                ]}
                value={memo ?? ''}
                ref={memoInput}
                testID={AddContactViewSelectorsIDs.MEMO_INPUT}
                keyboardAppearance={themeAppearance}
              />
            </View>
          </View>

          <>
            <Text style={styles.label}>{strings('address_book.network')}</Text>
            <TouchableOpacity
              disabled={!editable}
              style={[styles.networkSelector]}
              onPress={() => {
                if (state.editable) {
                  setOpenNetworkSelector(true);
                }
              }}
              onLongPress={() => {
                if (state.editable) {
                  setOpenNetworkSelector(true);
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
                    chainId: contactChainId || chainId,
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
                    if (state.editable) {
                      setOpenNetworkSelector(true);
                    }
                  }}
                  accessibilityRole="button"
                />
              )}
            </TouchableOpacity>
          </>
        </View>

        {addressError && (
          <ErrorMessage
            errorMessage={renderErrorMessage(addressError)}
            errorContinue={!!errorContinue}
            onContinue={onErrorContinue}
          />
        )}

        {!!editable && (
          <View style={styles.buttonsWrapper}>
            <View style={styles.buttonsContainer}>
              <View style={styles.actionButton}>
                <StyledButton
                  type={'confirm'}
                  disabled={!addressReady || !name || !!addressError}
                  onPress={saveContact}
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
                    onPress={onDelete}
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
          ref={actionSheet}
          title={strings('address_book.delete_contact')}
          options={[
            strings('address_book.delete'),
            strings('address_book.cancel'),
          ]}
          cancelButtonIndex={1}
          destructiveButtonIndex={0}
          // eslint-disable-next-line react/jsx-no-bind
          onPress={(index: number) => (index === 0 ? deleteContact() : null)}
          theme={themeAppearance}
        />
      </KeyboardAwareScrollView>
      {state.openNetworkSelector ? (
        <NetworkListBottomSheet
          selectedNetwork={state.contactChainId || null}
          setSelectedNetwork={setSelectedNetwork}
          setOpenNetworkSelector={setOpenNetworkSelector}
          sheetRef={sheetRef}
        />
      ) : null}
    </SafeAreaView>
  );
};

const mapStateToProps = (state: RootState): ContactFormStateProps => ({
  addressBook: selectAddressBook(state),
  internalAccounts: selectInternalAccounts(state),
  chainId: selectEvmChainId(state),
  networkConfigurations: selectNetworkConfigurations(state),
});

export default connect(mapStateToProps)(ContactForm);
