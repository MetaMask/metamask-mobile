import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { selectAddressBook } from '../../../../../selectors/addressBookController';
import { type RecipientType } from '../../components/UI/recipient';
import { LOWER_CASED_BURN_ADDRESSES } from '../../utils/send-address-validations';
import { useSendType } from './useSendType';

export const useContacts = () => {
  const addressBook = useSelector(selectAddressBook);
  const { isEvmSendType, isNonEvmSendType } = useSendType();

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
      if (isEvmSendType) {
        return (
          contact.address.startsWith('0x') &&
          contact.address.length === 42 &&
          !LOWER_CASED_BURN_ADDRESSES.includes(contact.address.toLowerCase())
        );
      }
      return true;
    });
  }, [addressBook, isEvmSendType]);

  if (isNonEvmSendType) {
    return [];
  }

  return contacts;
};
