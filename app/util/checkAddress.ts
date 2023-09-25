import type { AddressBookState } from '@metamask/address-book-controller';
import { toChecksumAddress } from 'ethereumjs-util';

/**
 * Check whether the recipient of the given transaction is included in
 * the address book.
 *
 * @param addressBook - The address book state.
 * @param chainId - The chain ID of the current selected network.
 * @param transaction - The transaction to check the recipient of.
 * @returns Any address book entries that match the current chain ID and
 * transaction recipient.
 */
const checkIfAddressIsSaved = (
  addressBook: AddressBookState['addressBook'],
  chainId: string,
  transaction: any,
) => {
  if (transaction.to === undefined) {
    return [];
  }
  for (const [addressBookChainId, chainAddresses] of Object.entries(
    addressBook,
  )) {
    const addressEntries = Object.values(chainAddresses).map((entry: any) => ({
      address: toChecksumAddress(entry.address),
      nickname: entry.name,
    }));

    if (
      addressEntries.some(
        (entry) =>
          entry.address === toChecksumAddress(transaction.to) &&
          addressBookChainId === chainId,
      )
    ) {
      return addressEntries.filter(
        (entry) => entry.address === toChecksumAddress(transaction.to),
      );
    }
    return [];
  }
};

export default checkIfAddressIsSaved;
