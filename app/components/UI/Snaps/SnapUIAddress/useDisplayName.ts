import {
  CaipChainId,
  KnownCaipNamespace,
  CaipNamespace,
} from '@metamask/utils';
import { useSelector } from 'react-redux';
import { decimalToHex } from '../../../../util/conversions';
import { RootState } from '../../../../reducers';
import { selectInternalAccounts } from '../../../../selectors/accountsController';
import { toLowerCaseEquals } from '../../../../util/general';
import { selectAddressBookByChain } from '../../../../selectors/addressBookController';

export interface UseDisplayNameParams {
  chain: {
    namespace: CaipNamespace;
    reference: string;
  };
  chainId: CaipChainId;
  address: string;
}

/**
 * Get the display name for an address.
 * This will look for an account name in the state, and if not found, it will look for an address book entry.
 *
 * @param params - The parsed CAIP-10 ID.
 * @returns The display name for the address.
 */
export const useDisplayName = (
  params: UseDisplayNameParams,
): string | undefined => {
  const {
    address,
    chain: { namespace, reference },
  } = params;

  const isEip155 = namespace === KnownCaipNamespace.Eip155;

  const accounts = useSelector(selectInternalAccounts);

  const account = accounts.find((possibleAccount) =>
    toLowerCaseEquals(possibleAccount.address, address),
  );

  const chainAddressBook = useSelector((state: RootState) =>
    selectAddressBookByChain(
      state,
      `0x${decimalToHex(isEip155 ? reference : `0`)}`,
    ),
  );

  const addressBookEntry = chainAddressBook.find((contact) =>
    toLowerCaseEquals(contact.address, address),
  );

  return (
    account?.metadata?.name || (isEip155 && addressBookEntry?.name) || undefined
  );
};
