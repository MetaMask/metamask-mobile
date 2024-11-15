import { RootState } from '../reducers';
import { selectAddressBook } from './addressBookController';
import { AddressBookControllerState } from '@metamask/address-book-controller';

describe('selectAddressBook', () => {
  it('returns addressBook from state', () => {
    const mockAddressBookControllerState: AddressBookControllerState = {
      addressBook: {
        '0x1': {
          '0x123': {
            address: '0x123',
            name: 'Alice',
            chainId: '0x1',
            memo: 'Friend',
            isEns: false,
          },
        },
      },
    };

    const mockState = {
      engine: {
        backgroundState: {
          AddressBookController: mockAddressBookControllerState,
        },
      },
    };

    expect(selectAddressBook(mockState as RootState)).toEqual(
      mockAddressBookControllerState.addressBook,
    );
  });
});
