import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { selectAddressBook } from '../../../../../selectors/addressBookController';
import { type RecipientType } from '../../components/UI/recipient';
import { useSendType } from './useSendType';

export const useContacts = () => {
  const addressBook = useSelector(selectAddressBook);
  const { isEvmSendType } = useSendType();

  const contacts = useMemo(() => {
    const flattenedContacts: RecipientType[] = [];
    const seenAddresses = new Set<string>();

    Object.values(addressBook).forEach((chainContacts) => {
      Object.values(chainContacts).forEach((contact) => {
        if (!seenAddresses.has(contact.address)) {
          seenAddresses.add(contact.address);
          flattenedContacts.push({
            contactName: contact.name,
            address: contact.address,
          });
        }
      });
    });

    return flattenedContacts.filter((contact) => {
      // Only possibility to check if the address is EVM compatible because contacts are only EVM compatible as of now
      if (isEvmSendType) {
        return (
          contact.address.startsWith('0x') && contact.address.length === 42
        );
      }
      return true;
    });
  }, [addressBook, isEvmSendType]);

  return contacts;
};
