import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { isAddress as isSolanaAddress } from '@solana/addresses';
/// BEGIN:ONLY_INCLUDE_IF(bitcoin)
import { validate as isValidBitcoinAddress } from 'bitcoin-address-validation';
/// END:ONLY_INCLUDE_IF

import { selectAddressBook } from '../../../../../selectors/addressBookController';
import { type RecipientType } from '../../components/UI/recipient';
import { useSendType } from './useSendType';

export const useContacts = () => {
  const addressBook = useSelector(selectAddressBook);
  const {
    isEvmSendType,
    isSolanaSendType,
    /// BEGIN:ONLY_INCLUDE_IF(bitcoin)
    isBitcoinSendType,
    /// END:ONLY_INCLUDE_IF
    /// BEGIN:ONLY_INCLUDE_IF(tron)
    isTronSendType,
    /// END:ONLY_INCLUDE_IF
  } = useSendType();

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
        return isSolanaAddress(contact.address);
      }
      /// BEGIN:ONLY_INCLUDE_IF(bitcoin)
      if (isBitcoinSendType) {
        return isValidBitcoinAddress(contact.address);
      }
      /// END:ONLY_INCLUDE_IF
      /// BEGIN:ONLY_INCLUDE_IF(tron)
      if (isTronSendType) {
        return contact.address.startsWith('T') && contact.address.length === 34;
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
    /// BEGIN:ONLY_INCLUDE_IF(tron)
    isTronSendType,
    /// END:ONLY_INCLUDE_IF
  ]);

  return contacts;
};
