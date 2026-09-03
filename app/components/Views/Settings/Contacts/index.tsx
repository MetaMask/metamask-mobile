import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
} from '@metamask/design-system-react-native';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { strings } from '../../../../../locales/i18n';
import { connect } from 'react-redux';
import type { AddressBookControllerState } from '@metamask/address-book-controller';
import type { Hex } from '@metamask/utils';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import AddressList from '../../confirmations/legacy/components/AddressList';
import Engine from '../../../../core/Engine';
import ActionSheet from '@metamask/react-native-actionsheet';
import { useTheme } from '../../../../util/theme';
import { selectEvmChainId } from '../../../../selectors/networkController';
import Routes from '../../../../../app/constants/navigation/Routes';

import { ContactsViewSelectorIDs } from './ContactsView.testIds';
import { selectAddressBook } from '../../../../selectors/addressBookController';
import type { RootState } from '../../../../reducers';
import type { RootStackParamList } from '../../../../core/NavigationService/types';
import type { Colors } from '../../../../util/theme/models';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    addContact: {
      marginHorizontal: 24,
      marginBottom: 16,
    },
  });

const EDIT = 'edit';
const ADD = 'add';

interface ContactsOwnProps {
  navigation: Pick<
    NativeStackNavigationProp<RootStackParamList, 'ContactsSettings'>,
    'goBack' | 'navigate'
  >;
}

interface ContactsStateProps {
  addressBook: AddressBookControllerState['addressBook'];
  chainId: Hex;
}

type ContactsProps = ContactsOwnProps & ContactsStateProps;

/**
 * View that contains app information
 */
const Contacts = ({ addressBook, navigation, chainId }: ContactsProps) => {
  const { colors, themeAppearance } = useTheme();
  const styles = createStyles(colors);
  const [reloadAddressList, setReloadAddressList] = useState(false);
  const actionSheetRef = useRef<typeof ActionSheet>(null);
  const contactAddressToRemoveRef = useRef<string | null>(null);
  const reloadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousAddressBookRef = useRef(addressBook);

  const updateAddressList = useCallback(() => {
    setReloadAddressList(true);
    if (reloadTimeoutRef.current) {
      clearTimeout(reloadTimeoutRef.current);
    }
    reloadTimeoutRef.current = setTimeout(() => {
      setReloadAddressList(false);
    }, 100);
  }, []);

  useEffect(() => {
    const previousAddressBook = previousAddressBookRef.current;
    if (
      previousAddressBook &&
      addressBook &&
      JSON.stringify(previousAddressBook[chainId]) !==
        JSON.stringify(addressBook[chainId])
    ) {
      updateAddressList();
    }
    previousAddressBookRef.current = addressBook;
  }, [addressBook, chainId, updateAddressList]);

  useEffect(
    () => () => {
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
      }
    },
    [],
  );

  const onAddressLongPress = (address: string) => {
    contactAddressToRemoveRef.current = address;
    actionSheetRef.current?.show();
  };

  const deleteContact = () => {
    const contactAddressToRemove = contactAddressToRemoveRef.current;
    if (!contactAddressToRemove) {
      return;
    }
    const { AddressBookController } = Engine.context;
    AddressBookController.delete(chainId, contactAddressToRemove);
    updateAddressList();
  };

  const onAddressPress = (address: string) => {
    navigation.navigate('ContactForm', {
      mode: EDIT,
      address,
      onDelete: updateAddressList,
    });
  };

  const goToAddContact = () => {
    navigation.navigate('ContactForm', { mode: ADD });
  };

  const onIconPress = () => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.AMBIGUOUS_ADDRESS,
    });
  };

  return (
    <SafeAreaView
      style={styles.wrapper}
      testID={ContactsViewSelectorIDs.CONTAINER}
      edges={{ bottom: 'additive' }}
    >
      <HeaderStandard
        title={strings('app_settings.contacts_title')}
        onBack={() => navigation.goBack()}
        includesTopInset
        testID={ContactsViewSelectorIDs.HEADER}
        backButtonProps={{
          testID: ContactsViewSelectorIDs.HEADER_BACK_BUTTON,
        }}
      />
      <AddressList
        chainId={chainId}
        onlyRenderAddressBook
        reloadAddressList={reloadAddressList}
        onAccountPress={onAddressPress}
        onIconPress={onIconPress}
        onAccountLongPress={onAddressLongPress}
      />
      <View style={styles.addContact}>
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={goToAddContact}
          testID={ContactsViewSelectorIDs.ADD_BUTTON}
        >
          {strings('address_book.add_contact')}
        </Button>
      </View>
      <ActionSheet
        ref={actionSheetRef}
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
    </SafeAreaView>
  );
};

const mapStateToProps = (state: RootState): ContactsStateProps => ({
  addressBook: selectAddressBook(state),
  chainId: selectEvmChainId(state),
});

export default connect(mapStateToProps)(Contacts);
