import React, { ReactElement, useState } from 'react';
import { useSelector } from 'react-redux';
import { View, Platform, TextInput, TouchableOpacity } from 'react-native';

import generateTestId from '../../../../wdio/utils/generateTestId';
import {
  ADDRESS_ALIAS_CANCEL_BUTTON_ID,
  ADDRESS_ALIAS_SAVE_BUTTON_ID,
  ADDRESS_ALIAS_TITLE_ID,
  ENTER_ALIAS_INPUT_BOX_ID,
} from '../../../../wdio/screen-objects/testIDs/Screens/AddressBook.testids';
import { strings } from '../../../../locales/i18n';
import Engine from '../../../core/Engine';
import { ADD_ADDRESS_MODAL_CONTAINER_ID } from '../../../constants/test-ids';
import { baseStyles } from '../../../styles/common';
import { selectNetwork } from '../../../selectors/networkController';
import { useTheme } from '../../../util/theme';
import Text from '../../Base/Text';
import useExistingAddress from '../../hooks/useExistingAddress';
import ActionModal from '../ActionModal';

import createStyles from './styles';

export const ADD_TO_ADDRESS_BOOK_BUTTON_ID = 'add-address-button';

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
  const network = useSelector(selectNetwork);

  const existingContact = useExistingAddress(address);
  const { colors, themeAppearance } = useTheme();
  const [showAddToAddressBook, setShowAddToAddressBook] = useState(false);
  const [alias, setAlias] = useState<string>();

  if (!address || existingContact) {
    if (defaultNull) {
      return null;
    }
    return children;
  }
  const styles = createStyles(colors);

  const onSaveToAddressBook = () => {
    const { AddressBookController } = Engine.context;
    AddressBookController.set(address, alias, network);
    !!alias && setToAddressName?.(alias);
    setAlias(undefined);
  };

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.5}
        onPress={() => setShowAddToAddressBook(true)}
        testID={ADD_TO_ADDRESS_BOOK_BUTTON_ID}
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
          cancelTestID={ADDRESS_ALIAS_CANCEL_BUTTON_ID}
          confirmTestID={ADDRESS_ALIAS_SAVE_BUTTON_ID}
        >
          <View style={styles.addToAddressBookRoot}>
            <View
              style={styles.addToAddressBookWrapper}
              testID={ADD_ADDRESS_MODAL_CONTAINER_ID}
            >
              <View style={baseStyles.flexGrow}>
                <Text
                  style={styles.addTextTitle}
                  {...generateTestId(Platform, ADDRESS_ALIAS_TITLE_ID)}
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
                      {...generateTestId(Platform, ENTER_ALIAS_INPUT_BOX_ID)}
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
