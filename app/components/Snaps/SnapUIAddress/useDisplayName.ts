import {
  CaipChainId,
  KnownCaipNamespace,
  CaipNamespace,
} from '@metamask/utils';
import { useSelector } from 'react-redux';
import { decimalToHex } from '../../../util/conversions';
import { RootState } from '../../../reducers';
import { selectInternalAccounts } from '../../../selectors/accountsController';
import { areAddressesEqual } from '../../../util/address';
import { selectAddressBookByChain } from '../../../selectors/addressBookController';
import { selectMultichainAccountsState2Enabled } from '../../../selectors/featureFlagController/multichainAccounts';
import { selectAccountGroupsByAddress } from '../../../selectors/multichainAccounts/accounts';
import { toChecksumHexAddress } from '@metamask/controller-utils';

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
    areAddressesEqual(possibleAccount.address, address),
  );

  const chainAddressBook = useSelector((state: RootState) =>
    selectAddressBookByChain(
      state,
      `0x${decimalToHex(isEip155 ? reference : `0`)}`,
    ),
  );

  const addressBookEntry = chainAddressBook.find((contact) =>
    areAddressesEqual(contact.address, address),
  );

  const showAccountGroupName = useSelector(
    selectMultichainAccountsState2Enabled,
  );

  const parsedAddress = isEip155 ? toChecksumHexAddress(address) : address;
  const accountGroups = useSelector((state: RootState) =>
    selectAccountGroupsByAddress(state, [parsedAddress]),
  );

  const accountGroupName = accountGroups[0]?.metadata.name;
  const accountName = account?.metadata?.name;

  return (
    (showAccountGroupName && accountGroupName) ||
    accountName ||
    (isEip155 && addressBookEntry?.name) ||
    undefined
  );
};
