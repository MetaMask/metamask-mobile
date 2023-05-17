import { toChecksumAddress } from 'ethereumjs-util';
import { useSelector } from 'react-redux';

import { selectNetwork } from '../../selectors/networkController';

export interface Address {
  address: string;
  chainId: string;
  isEns: boolean;
  isSmartContract: boolean;
  memo: string;
  name: string;
}

const useExistingAddress = (address?: string): Address | undefined => {
  const network = useSelector(selectNetwork);
  const { addressBook, identities } = useSelector((state: any) => ({
    addressBook: state.engine.backgroundState.AddressBookController.addressBook,
    identities: state.engine.backgroundState.PreferencesController.identities,
  }));

  if (!address) return;

  const networkAddressBook = addressBook[network] || {};
  const checksummedAddress = toChecksumAddress(address);

  return (
    networkAddressBook?.[checksummedAddress] ??
    identities?.[checksummedAddress] ??
    undefined
  );
};

export default useExistingAddress;
