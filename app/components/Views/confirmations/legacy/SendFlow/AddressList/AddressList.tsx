import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import Fuse from 'fuse.js';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { FlashList } from '@shopify/flash-list';
import { isSmartContractAddress } from '../../../../../../util/transactions';
import { strings } from '../../../../../../../locales/i18n';
import AddressElement from '../AddressElement';
import { useTheme } from '../../../../../../util/theme';
import Text from '../../../../../../component-library/components/Texts/Text/Text';
import { TextVariant } from '../../../../../../component-library/components/Texts/Text';
import { regex } from '../../../../../../util/regex';
import { SendViewSelectorsIDs } from '../../../../../../../e2e/selectors/SendFlow/SendView.selectors';
import { selectInternalEvmAccounts } from '../../../../../../selectors/accountsController';
import styleSheet from './AddressList.styles';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import { selectAddressBook } from '../../../../../../selectors/addressBookController';
import { Hex } from '@metamask/utils';
import { RootState } from '../../../../../../reducers';
import {
  AddressListProps,
  AddressBookEntryWithRelaxedChainId,
  InternalAddressBookEntry,
} from './AddressList.types';

const LabelElement = (styles: ReturnType<typeof styleSheet>, label: string) => (
  <View key={label} style={styles.labelElementWrapper}>
    <Text variant={TextVariant.BodyMD} style={styles.contactLabel}>
      {label.toUpperCase()}
    </Text>
  </View>
);

const AddressList = ({
  chainId,
  inputSearch,
  onAccountPress,
  onAccountLongPress,
  onIconPress,
  onlyRenderAddressBook = false,
  reloadAddressList,
}: AddressListProps) => {
  const { colors } = useTheme();
  const styles = styleSheet(colors);
  const [contactElements, setContactElements] = useState<
    (InternalAddressBookEntry | string)[]
  >([]);
  const [fuse, setFuse] = useState<
    Fuse<AddressBookEntryWithRelaxedChainId> | undefined
  >(undefined);
  const internalAccounts = useSelector(selectInternalEvmAccounts);
  const addressBook = useSelector(selectAddressBook);
  const ambiguousAddressEntries = useSelector(
    (state: RootState) => state.user.ambiguousAddressEntries,
  );

  const completeAndFlattenedAddressBook: AddressBookEntryWithRelaxedChainId[] =
    useMemo(
      () =>
        Object.entries(addressBook)
          .filter(([addressBookChainId, _]) => addressBookChainId !== '*')
          .map(([_, addressDict]) => Object.values(addressDict))
          .flat(),
      [addressBook],
    );

  const completeAndFlattenedAddressBookFilteredByCurrentChainId = useMemo(
    () =>
      completeAndFlattenedAddressBook.filter(
        (contact) => contact.chainId === chainId,
      ),
    [completeAndFlattenedAddressBook, chainId],
  );

  const parseAddressBook = useCallback(
    (addressBookList: AddressBookEntryWithRelaxedChainId[]) => {
      const contacts = addressBookList.map((contact) => {
        const isAmbiguousAddress =
          chainId &&
          ambiguousAddressEntries?.[chainId] &&
          Array.isArray(ambiguousAddressEntries?.[chainId]) &&
          ambiguousAddressEntries[chainId].includes(contact.address);
        const addressContact: InternalAddressBookEntry = {
          ...contact,
          isSmartContract: false,
        };
        if (isAmbiguousAddress) {
          addressContact.isAmbiguousAddress = true;
        }
        return addressContact;
      });

      Promise.all(
        contacts.map((contact) =>
          isSmartContractAddress(contact.address, contact.chainId)
            .then((isSmartContract) => {
              if (isSmartContract) {
                return { ...contact, isSmartContract: true };
              }
              return contact;
            })
            .catch(() => contact),
        ),
      ).then((updatedContacts) => {
        const newContactElements: (InternalAddressBookEntry | string)[] = [];
        const addressBookTree: Record<string, InternalAddressBookEntry[]> = {};

        updatedContacts.forEach((contact) => {
          const contactNameInitial = contact?.name?.[0];
          const nameInitial = regex.nameInitial.exec(contactNameInitial);
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
            addressBookTree[initial].forEach((contact) => {
              newContactElements.push(contact);
            });
          });

        setContactElements(newContactElements);
      });
    },
    [onlyRenderAddressBook, ambiguousAddressEntries, chainId],
  );

  const getNetworkAddressBookList = useCallback(() => {
    if (inputSearch && fuse) {
      return fuse.search(inputSearch);
    }

    return completeAndFlattenedAddressBook;
  }, [fuse, inputSearch, completeAndFlattenedAddressBook]);

  useEffect(() => {
    const fuseAddressBook = completeAndFlattenedAddressBook;

    const newFuse = new Fuse(fuseAddressBook, {
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
  }, [
    completeAndFlattenedAddressBook,
    completeAndFlattenedAddressBookFilteredByCurrentChainId,
  ]);

  useEffect(() => {
    const networkAddressBookList = getNetworkAddressBookList();
    parseAddressBook(networkAddressBookList);
  }, [
    inputSearch,
    chainId,
    reloadAddressList,
    getNetworkAddressBookList,
    parseAddressBook,
    completeAndFlattenedAddressBook,
    completeAndFlattenedAddressBookFilteredByCurrentChainId,
    onlyRenderAddressBook,
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
        <FlashList
          data={internalAccounts}
          renderItem={({ item: account }) => (
            <AddressElement
              key={account.id}
              address={toChecksumHexAddress(account.address)}
              name={account.metadata.name}
              onAccountPress={onAccountPress}
              onIconPress={onIconPress}
              onAccountLongPress={onAccountLongPress}
              testID={SendViewSelectorsIDs.MY_ACCOUNT_ELEMENT}
              chainId={chainId}
            />
          )}
          keyExtractor={(item) => item.id}
        />
      </View>
    );
  };

  const renderAddressElement = (
    addressElement: InternalAddressBookEntry | string,
  ) => {
    if (typeof addressElement === 'string') {
      return LabelElement(styles, addressElement);
    }

    const key = addressElement.address + addressElement.name;

    return (
      <AddressElement
        key={key}
        address={addressElement.address}
        name={addressElement.name}
        onIconPress={onIconPress}
        onAccountPress={onAccountPress}
        onAccountLongPress={onAccountLongPress}
        testID={SendViewSelectorsIDs.ADDRESS_BOOK_ACCOUNT}
        isAmbiguousAddress={addressElement.isAmbiguousAddress}
        chainId={addressElement.chainId as Hex}
        displayNetworkBadge={addressElement.displayNetworkBadge}
      />
    );
  };

  const renderAddressElementWithNetworkBadge = (
    addressElement: InternalAddressBookEntry | string,
  ) =>
    renderAddressElement(
      typeof addressElement === 'object'
        ? {
            ...addressElement,
            displayNetworkBadge: true,
          }
        : addressElement,
    );

  const renderContent = () => {
    const sendFlowContacts: (InternalAddressBookEntry | string)[] = [];

    contactElements.forEach((contactElement) => {
      if (
        typeof contactElement === 'object' &&
        contactElement.isSmartContract === false
      ) {
        const nameInitial = contactElement?.name?.[0].toLowerCase();
        if (sendFlowContacts.includes(nameInitial)) {
          sendFlowContacts.push(contactElement);
        } else {
          sendFlowContacts.push(nameInitial);
          sendFlowContacts.push(contactElement);
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

              {sendFlowContacts.map(renderAddressElementWithNetworkBadge)}
            </>
          ) : (
            contactElements.map(renderAddressElementWithNetworkBadge)
          )}
        </KeyboardAwareScrollView>
      </View>
    );
  };

  return renderContent();
};

export default AddressList;
