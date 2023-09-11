import { AddressBookState } from '@metamask/address-book-controller';
import checkIfAddressIsSaved from './checkAddress';

describe('checkIfAddressIsSaved', () => {
  it(`returns an empty array if the transaction recipient is unset`, () => {
    const mockAddress = '0x0000000000000000000000000000000000000001';
    const addressBook: AddressBookState['addressBook'] = {
      '1': {
        [mockAddress]: {
          address: mockAddress,
          name: 'name',
          chainId: '1',
          memo: '',
          isEns: false,
        },
      },
    };
    const networkId = '1';
    const transaction = {};

    expect(
      checkIfAddressIsSaved(addressBook, networkId, transaction),
    ).toStrictEqual([]);
  });

  // TODO: Update this case to return undefined to improve consistency
  it('returns undefined if the address book is empty', () => {
    const mockAddress = '0x0000000000000000000000000000000000000001';
    const addressBook: AddressBookState['addressBook'] = {};
    const networkId = '1';
    const transaction = {
      to: mockAddress,
    };

    expect(
      checkIfAddressIsSaved(addressBook, networkId, transaction),
    ).toBeUndefined();
  });

  it('returns an empty array if transaction recipient is not in the address book', () => {
    const mockAddress1 = '0x0000000000000000000000000000000000000001';
    const mockAddress2 = '0x0000000000000000000000000000000000000002';
    const addressBook: AddressBookState['addressBook'] = {
      '1': {
        [mockAddress2]: {
          address: mockAddress2,
          name: 'name',
          chainId: '1',
          memo: '',
          isEns: false,
        },
      },
    };
    const networkId = '1';
    const transaction = {
      to: mockAddress1,
    };

    expect(
      checkIfAddressIsSaved(addressBook, networkId, transaction),
    ).toStrictEqual([]);
  });

  it('returns an empty array if transaction recipient is not in the address book for the given network', () => {
    const mockAddress = '0x0000000000000000000000000000000000000001';
    const addressBook: AddressBookState['addressBook'] = {
      '2': {
        [mockAddress]: {
          address: mockAddress,
          name: 'name',
          chainId: '2',
          memo: '',
          isEns: false,
        },
      },
    };
    const networkId = '1';
    const transaction = {
      to: mockAddress,
    };

    expect(
      checkIfAddressIsSaved(addressBook, networkId, transaction),
    ).toStrictEqual([]);
  });

  it('returns an address book entry', () => {
    const mockAddress = '0x0000000000000000000000000000000000000001';
    const addressBook: AddressBookState['addressBook'] = {
      '1': {
        [mockAddress]: {
          address: mockAddress,
          name: 'name',
          chainId: '1',
          memo: '',
          isEns: false,
        },
      },
    };
    const networkId = '1';
    const transaction = {
      to: mockAddress,
    };

    expect(
      checkIfAddressIsSaved(addressBook, networkId, transaction),
    ).toStrictEqual([
      {
        address: mockAddress,
        nickname: 'name',
      },
    ]);
  });

  it('returns an address book entry with a checksummed address', () => {
    const mockAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const mockAddressChecksummed = '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa';
    const addressBook: AddressBookState['addressBook'] = {
      '1': {
        [mockAddress]: {
          address: mockAddress,
          name: 'name',
          chainId: '1',
          memo: '',
          isEns: false,
        },
      },
    };
    const networkId = '1';
    const transaction = {
      to: mockAddress,
    };

    expect(
      checkIfAddressIsSaved(addressBook, networkId, transaction),
    ).toStrictEqual([
      {
        address: mockAddressChecksummed,
        nickname: 'name',
      },
    ]);
  });

  // TODO: Investigate this case, it should not be possible
  it('returns multiple address book entries', () => {
    const mockAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const mockAddressChecksummed = '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa';
    const addressBook: AddressBookState['addressBook'] = {
      '1': {
        [mockAddress]: {
          address: mockAddress,
          name: 'name',
          chainId: '1',
          memo: '',
          isEns: false,
        },
        [mockAddressChecksummed]: {
          address: mockAddressChecksummed,
          name: 'name',
          chainId: '1',
          memo: '',
          isEns: false,
        },
      },
    };
    const networkId = '1';
    const transaction = {
      to: mockAddress,
    };

    expect(
      checkIfAddressIsSaved(addressBook, networkId, transaction),
    ).toStrictEqual([
      {
        address: mockAddressChecksummed,
        nickname: 'name',
      },
      {
        address: mockAddressChecksummed,
        nickname: 'name',
      },
    ]);
  });
});
