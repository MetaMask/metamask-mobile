import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { LOWER_CASED_BURN_ADDRESSES } from '../../../../../constants/address';
import { selectAddressBook } from '../../../../../selectors/addressBookController';
import { type RecipientType } from '../../components/UI/recipient';
import { useSendContext } from '../../context/send-context';
import { useSendType } from './useSendType';

export const useContacts = () => {
  const addressBook = useSelector(selectAddressBook);
  const { isEvmSendType, isNonEvmSendType } = useSendType();
  const { chainId } = useSendContext();

  const contacts = useMemo(() => {
    const flattenedContacts: RecipientType[] = [];
    const seenAddresses = new Set<string>();

    const chainContacts = addressBook[chainId as keyof typeof addressBook];
    if (!chainContacts) {
      return [];
    }
    Object.values(chainContacts).forEach((contact) => {
      if (!seenAddresses.has(contact.address)) {
        seenAddresses.add(contact.address);
        flattenedContacts.push({
          contactName: contact.name,
          address: contact.address,
        });
      }
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
  }, [addressBook, chainId, isEvmSendType]);

  if (isNonEvmSendType) {
    return [];
  }

  return contacts;
};
