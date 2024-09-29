import { RootState } from '../reducers';
import { createSelector } from 'reselect';
import { AddressBookControllerState } from '@metamask/address-book-controller';

export const selectAddressBookControllerState = (state: RootState) =>
  state.engine.backgroundState.AddressBookController;

export const selectAddressBook = createSelector(
  selectAddressBookControllerState,
  (addressBookControllerState: AddressBookControllerState) =>
    addressBookControllerState.addressBook,
);
