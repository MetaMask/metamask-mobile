import React, { ReactElement, useState } from 'react';
import { useSelector } from 'react-redux';
import { View, Platform, TextInput, TouchableOpacity } from 'react-native';

import generateTestId from '../../../../wdio/utils/generateTestId';
import { AddAddressModalSelectorsIDs } from './AddAddressModal.testIds';
import { strings } from '../../../../locales/i18n';
import Engine from '../../../core/Engine';
import { baseStyles } from '../../../styles/common';
import { selectEvmChainId } from '../../../selectors/networkController';
import { useTheme } from '../../../util/theme';
import Text from '../../Base/Text';
import useExistingAddress from '../../hooks/useExistingAddress';
import ActionModal from '../ActionModal';
import { LOWER_CASED_BURN_ADDRESSES } from '../../../constants/address';

import createStyles from './styles';

interface AddToAddressBookWrapperProps {
  address: string;
  children: ReactElement;
  setToAddressName?: (name: string) => void;
  defaultNull?: boolean;
}

export const AddToAddressBookWrapper = ({
  address,
  children,
  setToAddressName,
  defaultNull = false,
}: AddToAddressBookWrapperProps) => {
  const chainId = useSelector(selectEvmChainId);

  const existingContact = useExistingAddress(address);
  const { colors, themeAppearance } = useTheme();
  const [showAddToAddressBook, setShowAddToAddressBook] = useState(false);
  const [alias, setAlias] = useState<string>();

  if (
    !address ||
    existingContact ||
    LOWER_CASED_BURN_ADDRESSES.includes(address?.toLowerCase())
  ) {
    if (defaultNull) {
      return null;
    }
    return children;
  }
  const styles = createStyles(colors);

  const onSaveToAddressBook = () => {
    if (!alias) return;
    // Prevent saving burn addresses to address book
    if (LOWER_CASED_BURN_ADDRESSES.includes(address?.toLowerCase())) {
      return;
    }
    const { AddressBookController } = Engine.context;
    AddressBookController.set(address, alias, chainId);
    setToAddressName?.(alias);
    setAlias(undefined);
  };

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.5}
        onPress={() => setShowAddToAddressBook(true)}
        testID={AddAddressModalSelectorsIDs.ADD_ADDRESS_BUTTON}
      >
        {children}
      </TouchableOpacity>
      {showAddToAddressBook ? (
        <ActionModal
          modalVisible={showAddToAddressBook}
          confirmText={strings('address_book.save')}
          cancelText={strings('address_book.cancel')}
          onCancelPress={() => setShowAddToAddressBook(false)}
          onRequestClose={() => setShowAddToAddressBook(false)}
          onConfirmPress={onSaveToAddressBook}
          cancelButtonMode={'normal'}
          confirmButtonMode={'confirm'}
          confirmDisabled={!alias}
          cancelTestID={AddAddressModalSelectorsIDs.CANCEL_BUTTON}
          confirmTestID={AddAddressModalSelectorsIDs.SAVE_BUTTON}
        >
          <View style={styles.addToAddressBookRoot}>
            <View
              style={styles.addToAddressBookWrapper}
              testID={AddAddressModalSelectorsIDs.CONTAINER}
            >
              <View style={baseStyles.flexGrow}>
                <Text
                  style={styles.addTextTitle}
                  {...generateTestId(
                    Platform,
                    AddAddressModalSelectorsIDs.TITLE,
                  )}
                >
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
                      onChangeText={setAlias}
                      placeholder={strings(
                        'address_book.enter_an_alias_placeholder',
                      )}
                      placeholderTextColor={colors.text.muted}
                      spellCheck={false}
                      style={styles.addTextInput}
                      numberOfLines={1}
                      value={alias}
                      keyboardAppearance={themeAppearance}
                      {...generateTestId(
                        Platform,
                        AddAddressModalSelectorsIDs.ENTER_ALIAS_INPUT,
                      )}
                    />
                  </View>
                </View>
              </View>
            </View>
          </View>
        </ActionModal>
      ) : null}
    </>
  );
};

export default AddToAddressBookWrapper;
