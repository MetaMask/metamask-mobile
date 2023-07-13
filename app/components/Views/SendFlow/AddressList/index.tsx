/* eslint-disable react/prop-types */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { fontStyles } from '../../../../styles/common';
import { useSelector } from 'react-redux';
import Fuse from 'fuse.js';
import { isSmartContractAddress } from '../../../../util/transactions';
import { strings } from '../../../../../locales/i18n';
import AddressElement from '../AddressElement';
import { useTheme } from '../../../../util/theme';
import Text from '../../../../component-library/components/Texts/Text/Text';
import { TextVariant } from '../../../../component-library/components/Texts/Text';
import { selectNetwork } from '../../../../selectors/networkController';
import { Colors } from '../../../../util/theme/models';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

interface AddressListProps {
  inputSearch?: string;
  onAccountPress: (address: string) => void;
  onAccountLongPress: (address: string) => void;
  onlyRenderAddressBook?: boolean;
  reloadAddressList?: boolean;
}

interface Contact {
  address: string;
  name: string;
  chainId: string;
  isSmartContract?: boolean;
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    messageText: {
      ...fontStyles.normal,
      color: colors.primary.default,
      fontSize: 16,
      textAlign: 'center',
    },
    messageLeft: {
      textAlign: 'left',
    },
    myAccountsWrapper: {
      flexGrow: 1,
    },
    labelElementWrapper: {
      backgroundColor: colors.background.default,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
    },
    labelElementText: {
      marginHorizontal: 16,
      color: colors.text.alternative,
      paddingBottom: 8,
    },
    contactLabel: { marginHorizontal: 8, color: colors.text.alternative },
    activityIndicator: {
      color: colors.icon.default,
    },
    yourContactcWrapper: { marginTop: 16 },
  });

const LabelElement = (styles: any, label: string) => (
  <View key={label} style={styles.labelElementWrapper}>
    <Text variant={TextVariant.BodyMD} style={styles.contactLabel}>
      {label.toUpperCase()}
    </Text>
  </View>
);

const AddressList: React.FC<AddressListProps> = ({
  inputSearch,
  onAccountPress,
  onAccountLongPress,
  onlyRenderAddressBook = false,
  reloadAddressList,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [contactElements, setContactElements] = useState<Contact[]>([]);
  const [fuse, setFuse] = useState<any>(undefined);
  const network = useSelector(selectNetwork);
  const identities = useSelector(
    (state: any) =>
      state.engine.backgroundState.PreferencesController.identities,
  );
  const addressBook = useSelector(
    (state: any) =>
      state.engine.backgroundState.AddressBookController.addressBook,
  );

  const networkAddressBook: Contact[] = useMemo(
    () => addressBook[network] || {},
    [addressBook, network],
  );

  const parseAddressBook = useCallback(
    (networkAddressBookList) => {
      const contacts = networkAddressBookList.map((contact: Contact) => ({
        ...contact,
        isSmartContract: false,
      }));

      Promise.all(
        contacts.map((contact: Contact) =>
          isSmartContractAddress(contact.address, contact.chainId)
            .then((isSmartContract: boolean) => {
              if (isSmartContract) {
                return { ...contact, isSmartContract: true };
              }
              return contact;
            })
            .catch(() => contact),
        ),
      ).then((updatedContacts) => {
        const newContactElements: any[] = [];
        const addressBookTree: any = {};

        updatedContacts.forEach((contact: Contact) => {
          const contactNameInitial = contact?.name?.[0];
          const nameInitial = contactNameInitial?.match(/[a-z]/i);
          const initial = nameInitial
            ? nameInitial[0].toLowerCase()
            : strings('address_book.others');
          if (Object.keys(addressBookTree).includes(initial)) {
            addressBookTree[initial].push(contact);
          } else if (contact.isSmartContract && !onlyRenderAddressBook) {
            return;
          } else {
            addressBookTree[initial] = [contact];
          }
        });

        Object.keys(addressBookTree)
          .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
          .forEach((initial) => {
            newContactElements.push(initial);
            addressBookTree[initial].forEach((contact: Contact) => {
              newContactElements.push(contact);
            });
          });

        setContactElements(newContactElements);
      });
    },
    [onlyRenderAddressBook],
  );

  useEffect(() => {
    const networkAddressBookList = Object.keys(networkAddressBook).map(
      (address) => networkAddressBook[address],
    );
    const newFuse = new Fuse(networkAddressBookList, {
      shouldSort: true,
      threshold: 0.45,
      location: 0,
      distance: 10,
      maxPatternLength: 32,
      minMatchCharLength: 1,
      keys: [
        { name: 'name', weight: 0.5 },
        { name: 'address', weight: 0.5 },
      ],
    });
    setFuse(newFuse);
    parseAddressBook(networkAddressBookList);
  }, [networkAddressBook, parseAddressBook]);

  const getNetworkAddressBookList = useCallback(() => {
    if (inputSearch) {
      return fuse.search(inputSearch);
    }

    return Object.keys(networkAddressBook).map(
      (address) => networkAddressBook[address],
    );
  }, [fuse, inputSearch, networkAddressBook]);

  useEffect(() => {
    const networkAddressBookList = getNetworkAddressBookList();
    parseAddressBook(networkAddressBookList);
  }, [
    inputSearch,
    addressBook,
    network,
    reloadAddressList,
    getNetworkAddressBookList,
    parseAddressBook,
  ]);

  const renderMyAccounts = () => {
    if (inputSearch) return null;

    return (
      <View style={styles.yourContactcWrapper}>
        <Text
          variant={TextVariant.BodyLGMedium}
          style={styles.labelElementText}
        >
          {strings('onboarding_wizard.step2.title')}
        </Text>
        {Object.keys(identities).map((address) => (
          <AddressElement
            key={address}
            address={address}
            name={identities[address].name}
            onAccountPress={onAccountPress}
            onAccountLongPress={onAccountLongPress}
            testID={'account-identity'}
          />
        ))}
      </View>
    );
  };

  const renderElement = (addressElement: Contact | string) => {
    if (typeof addressElement === 'string') {
      return LabelElement(styles, addressElement);
    }

    const key = addressElement.address + addressElement.name;

    return (
      <AddressElement
        key={key}
        address={addressElement.address}
        name={addressElement.name}
        onAccountPress={onAccountPress}
        onAccountLongPress={onAccountLongPress}
        testID={'account-address'}
      />
    );
  };

  const renderContent = () => {
    const sendFlowContacts: (string | Contact)[] = [];

    contactElements.forEach((contractElement) => {
      if (
        typeof contractElement === 'object' &&
        contractElement.isSmartContract === false
      ) {
        const nameInitial = contractElement?.name?.[0].toLowerCase();
        if (sendFlowContacts.includes(nameInitial)) {
          sendFlowContacts.push(contractElement);
        } else {
          sendFlowContacts.push(nameInitial);
          sendFlowContacts.push(contractElement);
        }
      }
    });

    return (
      <View style={styles.root}>
        <KeyboardAwareScrollView
          style={styles.myAccountsWrapper}
          keyboardShouldPersistTaps="handled"
        >
          {!onlyRenderAddressBook ? (
            <>
              {renderMyAccounts()}

              {sendFlowContacts.length ? (
                <Text
                  variant={TextVariant.BodyLGMedium}
                  style={styles.labelElementText}
                >
                  {strings('app_settings.contacts_title')}
                </Text>
              ) : (
                <></>
              )}

              {sendFlowContacts.map(renderElement)}
            </>
          ) : (
            contactElements.map(renderElement)
          )}
        </KeyboardAwareScrollView>
      </View>
    );
  };

  return renderContent();
};

export default AddressList;
