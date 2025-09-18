import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { selectAddressBook } from '../../../../../selectors/addressBookController';
import { type RecipientType } from '../../components/UI/recipient';
import { useSendType } from './useSendType';

export const useContacts = () => {
  const addressBook = useSelector(selectAddressBook);
  const { isEvmSendType, isSolanaSendType, isBitcoinSendType } = useSendType();

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
      // We cannot use isEvmAccountType and isSolanaAccount here because we are not using the internal accounts
      // Potentially we may want to have manual validation for the contacts
      if (isEvmSendType) {
        return (
          contact.address.startsWith('0x') && contact.address.length === 42
        );
      }
      if (isSolanaSendType) {
        return (
          !contact.address.startsWith('0x') && contact.address.length >= 32
        );
      }
      /// BEGIN:ONLY_INCLUDE_IF(bitcoin)
      if (isBitcoinSendType) {
        return contact.address.startsWith('bc');
      }
      /// END:ONLY_INCLUDE_IF
      return true;
    });
  }, [
    addressBook,
    isEvmSendType,
    isSolanaSendType,
    /// BEGIN:ONLY_INCLUDE_IF(bitcoin)
    isBitcoinSendType,
    /// END:ONLY_INCLUDE_IF
  ]);

  return contacts;
};
