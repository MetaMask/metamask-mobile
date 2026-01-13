import { useSelector } from 'react-redux';

import { selectInternalAccounts } from '../../selectors/accountsController';
import { areAddressesEqual, toChecksumAddress } from '../../util/address';
import { AddressBookEntry } from '@metamask/address-book-controller';
import { selectAddressBook } from '../../selectors/addressBookController';
import { selectIsEvmNetworkSelected } from '../../selectors/multichainNetworkController';
import { useMemo } from 'react';

type AccountInfo = Pick<AddressBookEntry, 'name' | 'address'>;

const useExistingAddress = (address?: string): AccountInfo | undefined => {
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);

  const addressBook = useSelector(selectAddressBook);
  const internalAccounts = useSelector(selectInternalAccounts);

  const filteredAddressBook = useMemo(
    () =>
      Object.values(addressBook).reduce(
        (acc, networkAddressBook) => ({
          ...acc,
          ...networkAddressBook,
        }),
        {},
      ),
    [addressBook],
  );

  if (!address || !isEvmSelected) return;

  // TODO: [SOLANA] Revisit this before shipping, Address Book controller should support non evm networks
  const checksummedAddress = toChecksumAddress(address);

  const matchingAddressBookEntry: AddressBookEntry | undefined =
    filteredAddressBook?.[checksummedAddress];

  if (matchingAddressBookEntry) {
    return {
      name: matchingAddressBookEntry.name,
      address: matchingAddressBookEntry.address,
    };
  }

  const accountWithMatchingAddress = internalAccounts.find((account) =>
    areAddressesEqual(account.address, address),
  );

  if (accountWithMatchingAddress) {
    return {
      address: accountWithMatchingAddress.address,
      name: accountWithMatchingAddress.metadata.name,
    };
  }

  return undefined;
};

export default useExistingAddress;
