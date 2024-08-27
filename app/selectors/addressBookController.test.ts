import { RootState } from '../reducers';
import { selectAddressBook } from './addressBookController';
import { AddressBookState } from '@metamask/address-book-controller';

describe('selectAddressBook', () => {
  it('returns addressBook from state', () => {
    const mockAddressBookState: AddressBookState = {
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
          AddressBookController: mockAddressBookState,
        },
      },
    };

    expect(selectAddressBook(mockState as RootState)).toEqual(
      mockAddressBookState.addressBook,
    );
  });
});
