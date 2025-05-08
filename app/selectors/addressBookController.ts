import { RootState } from '../reducers';
import { createSelector } from 'reselect';
import { AddressBookControllerState } from '@metamask/address-book-controller';
import { createDeepEqualSelector } from './util';
import { Hex } from '@metamask/utils';

export const selectAddressBookControllerState = (state: RootState) =>
  state.engine.backgroundState.AddressBookController;

export const selectAddressBook = createSelector(
  selectAddressBookControllerState,
  (addressBookControllerState: AddressBookControllerState) =>
    addressBookControllerState.addressBook,
);

export const selectAddressBookByChain = createDeepEqualSelector(
  [selectAddressBook,
  (_state: RootState, chainId: Hex) => chainId],
  (addressBook: AddressBookControllerState['addressBook'], chainId: Hex) => {
    if (!addressBook[chainId]) {
      return [];
    }
    return Object.values(addressBook[chainId]);
  }
);
