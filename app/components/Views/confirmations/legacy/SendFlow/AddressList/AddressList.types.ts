import { AddressBookEntry } from '@metamask/address-book-controller';
import { Hex } from '@metamask/utils';

export interface AddressListProps {
  chainId: Hex;
  inputSearch?: string;
  onAccountPress: (address: string, name?: string) => void;
  onAccountLongPress: (address: string) => void;
  onIconPress: () => void;
  onlyRenderAddressBook?: boolean;
  reloadAddressList?: boolean;
}

export type AddressBookEntryWithRelaxedChainId = Omit<
  AddressBookEntry,
  'chainId'
> & {
  chainId: string;
};

export interface InternalAddressBookEntry
  extends AddressBookEntryWithRelaxedChainId {
  isSmartContract: boolean;
  isAmbiguousAddress?: boolean;
  displayNetworkBadge?: boolean;
}
