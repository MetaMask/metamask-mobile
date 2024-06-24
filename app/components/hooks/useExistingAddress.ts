import { toChecksumAddress } from 'ethereumjs-util';
import { useSelector } from 'react-redux';

import { selectChainId } from '../../selectors/networkController';
import { selectIdentities } from '../../selectors/preferencesController';

export interface Address {
  address: string;
  chainId: string;
  isEns: boolean;
  isSmartContract: boolean;
  memo: string;
  name: string;
}

const useExistingAddress = (address?: string): Address | undefined => {
  const chainId = useSelector(selectChainId);
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { addressBook, identities } = useSelector((state: any) => ({
    addressBook: state.engine.backgroundState.AddressBookController.addressBook,
    identities: selectIdentities(state),
  }));

  if (!address) return;

  const networkAddressBook = addressBook[chainId] || {};
  const checksummedAddress = toChecksumAddress(address);

  return (
    networkAddressBook?.[checksummedAddress] ??
    identities?.[checksummedAddress] ??
    undefined
  );
};

export default useExistingAddress;
