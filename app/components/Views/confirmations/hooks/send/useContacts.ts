import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { selectAddressBook } from '../../../../../selectors/addressBookController';
import { useSendType } from './useSendType';
import { type RecipientType } from '../../components/UI/recipient';



export const useContacts = () => {
    const addressBook = useSelector(selectAddressBook);
    const { isEvmSendType, isSolanaSendType } = useSendType();

    const contacts = useMemo(() => {
        const flattenedContacts: RecipientType[] = [];
        const seenAddresses = new Set<string>();

        Object.values(addressBook).forEach((chainContacts) => {
            Object.values(chainContacts).forEach((contact) => {
                if (!seenAddresses.has(contact.address)) {
                    seenAddresses.add(contact.address);
                    flattenedContacts.push({
                        name: contact.name,
                        address: contact.address,
                    });
                }
            });
        });

        return flattenedContacts.filter((contact) => {
            if (isEvmSendType) {
                return contact.address.startsWith('0x') && contact.address.length === 42;
            }
            if (isSolanaSendType) {
                return !contact.address.startsWith('0x') && contact.address.length >= 32;
            }
            return true;
        });
    }, [addressBook, isEvmSendType, isSolanaSendType]);

    return contacts;
};


// import { useMemo } from 'react';
// import { useSelector } from 'react-redux';
// import { isEvmAccountType } from '@metamask/keyring-api';

// import { selectAddressBook } from '../../../../../selectors/addressBookController';
// import { isSolanaAccount } from '../../../../../core/Multichain/utils';
// import { type RecipientType } from '../../components/UI/recipient';
// import { useSendType } from './useSendType';

// export const useContacts = (): RecipientType[] => {
//     const addressBook = useSelector(selectAddressBook);
//     const { isEvmSendType, isSolanaSendType } = useSendType();

//     const contacts = useMemo(() => {
//         const flattenedContacts: RecipientType[] = [];
//         const seenAddresses = new Set<string>();

//         Object.values(addressBook).forEach((chainContacts) => {
//             Object.values(chainContacts).forEach((contact) => {
//                 if (!seenAddresses.has(contact.address)) {
//                     seenAddresses.add(contact.address);
//                     flattenedContacts.push({
//                         name: contact.name,
//                         address: contact.address,
//                     });
//                 }
//             });
//         });

//         return flattenedContacts.filter((contact) => {
//             if (isEvmSendType) {
//                 return isEvmAccountType(contact.address as any);
//             }
//             if (isSolanaSendType) {
//                 return isSolanaAccount(contact.address as any);
//             }
//             return true;
//         });
//     }, [addressBook, isEvmSendType, isSolanaSendType]);

//     return contacts;
// };