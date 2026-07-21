import { renderHook } from '@testing-library/react-hooks';
import { useContacts } from './useContacts';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('./useSendType', () => ({
  useSendType: jest.fn(),
}));

jest.mock('../../context/send-context', () => ({
  useSendContext: jest.fn(),
}));

jest.mock('../../../../../selectors/addressBookController', () => ({
  selectAddressBook: jest.fn(),
}));

import { useSelector } from 'react-redux';
import { useSendType } from './useSendType';
import { useSendContext } from '../../context/send-context';
import { selectAddressBook } from '../../../../../selectors/addressBookController';

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseSendType = useSendType as jest.MockedFunction<typeof useSendType>;
const mockUseSendContext = useSendContext as jest.MockedFunction<
  typeof useSendContext
>;

function createMockUseSendType(
  returnValues: Partial<ReturnType<typeof useSendType>>,
) {
  mockUseSendType.mockReturnValue(
    returnValues as ReturnType<typeof useSendType>,
  );
}

describe('useContacts', () => {
  const mockEvmContact1 = {
    name: 'John Doe',
    address: '0x1234567890123456789012345678901234567890',
  };

  const mockEvmContact2 = {
    name: 'Jane Smith',
    address: '0x9876543210987654321098765432109876543210',
  };

  const mockSolanaContact = {
    name: 'Solana Contact',
    address: '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
  };

  const mockBitcoinContact = {
    name: 'Bitcoin Contact',
    address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
  };

  const mockTronContact = {
    name: 'Tron Contact',
    address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
  };

  const mockInvalidContact = {
    name: 'Invalid Contact',
    address: '0xinvalid',
  };

  const mockAddressBook = {
    '0x1': {
      contact1: mockEvmContact1,
      contact2: mockEvmContact2,
    },
    '101': {
      contact3: mockSolanaContact,
    },
    'bip122:1': {
      contact6: mockBitcoinContact,
    },
    'tron:1': {
      contact7: mockTronContact,
    },
    '137': {
      contact4: mockInvalidContact,
      contact5: mockEvmContact1,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectAddressBook) {
        return mockAddressBook;
      }
      return {};
    });

    createMockUseSendType({
      isEvmSendType: true,
    });

    mockUseSendContext.mockReturnValue({
      chainId: '0x1',
    } as unknown as ReturnType<typeof useSendContext>);
  });

  describe('when isEvmSendType is true', () => {
    beforeEach(() => {
      mockUseSendType.mockReturnValue({
        isEvmSendType: true,
        isSolanaSendType: false,
        isEvmNativeSendType: false,
        isNonEvmSendType: false,
        isNonEvmNativeSendType: false,
        isBitcoinSendType: false,
        isTronSendType: false,
        isPredefinedEvm: true,
        isPredefinedSolana: false,
        isPredefinedBitcoin: false,
        isPredefinedTron: false,
      });
    });

    it('returns EVM compatible contacts', () => {
      const { result } = renderHook(() => useContacts());

      expect(result.current).toEqual([
        {
          contactName: 'John Doe',
          address: '0x1234567890123456789012345678901234567890',
        },
        {
          contactName: 'Jane Smith',
          address: '0x9876543210987654321098765432109876543210',
        },
      ]);
    });

    it('filters out non-EVM addresses', () => {
      const { result } = renderHook(() => useContacts());

      const addresses = result.current.map((contact) => contact.address);
      expect(addresses).not.toContain(
        'Sol1234567890123456789012345678901234567890',
      );
      expect(addresses).not.toContain('0xinvalid');
    });

    it('deduplicates contacts with same address', () => {
      const { result } = renderHook(() => useContacts());

      const johnDoeContacts = result.current.filter(
        (contact) => contact.address === mockEvmContact1.address,
      );
      expect(johnDoeContacts).toHaveLength(1);
    });

    it('only includes addresses starting with 0x and 42 characters long', () => {
      const { result } = renderHook(() => useContacts());

      result.current.forEach((contact) => {
        expect(contact.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
      });
    });
  });

  describe('when neither EVM nor Solana send type is active', () => {
    beforeEach(() => {
      createMockUseSendType({});
    });

    it('returns all contacts for the chain without filtering', () => {
      const { result } = renderHook(() => useContacts());

      expect(result.current).toHaveLength(2);
      expect(result.current).toEqual(
        expect.arrayContaining([
          {
            contactName: 'John Doe',
            address: '0x1234567890123456789012345678901234567890',
          },
          {
            contactName: 'Jane Smith',
            address: '0x9876543210987654321098765432109876543210',
          },
        ]),
      );
    });
  });

  it('handles empty address book', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectAddressBook) {
        return {};
      }
      return {};
    });

    const { result } = renderHook(() => useContacts());

    expect(result.current).toEqual([]);
  });

  it('returns empty array when isNonEvmSendType is true', () => {
    createMockUseSendType({
      isEvmSendType: true,
      isNonEvmSendType: true,
    });
    const { result } = renderHook(() => useContacts());
    expect(result.current).toEqual([]);
  });

  it('handles address book with empty chains', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectAddressBook) {
        return {
          '1': {},
          '137': {},
        };
      }
      return {};
    });

    const { result } = renderHook(() => useContacts());

    expect(result.current).toEqual([]);
  });

  it('handles address book with single chain', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectAddressBook) {
        return {
          '0x1': {
            contact1: mockEvmContact1,
          },
        };
      }
      return {};
    });

    const { result } = renderHook(() => useContacts());

    expect(result.current).toEqual([
      {
        contactName: 'John Doe',
        address: '0x1234567890123456789012345678901234567890',
      },
    ]);
  });

  describe('edge cases for address validation', () => {
    const edgeCaseAddressBook = {
      '0x1': {
        validEvm: {
          contactName: 'Valid EVM',
          address: '0x1234567890123456789012345678901234567890',
        },
        invalidEvmShort: {
          contactName: 'Invalid EVM Short',
          address: '0x123456',
        },
        invalidEvmLong: {
          contactName: 'Invalid EVM Long',
          address: '0x123456789012345678901234567890123456789012345',
        },
        validSolana: {
          contactName: 'Valid Solana',
          address: 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK',
        },
        invalidSolanaShort: {
          contactName: 'Invalid Solana Short',
          address: 'Sol123',
        },
      },
    };

    beforeEach(() => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectAddressBook) {
          return edgeCaseAddressBook;
        }
        return {};
      });
    });

    it('filters addresses correctly for EVM when addresses have different lengths', () => {
      createMockUseSendType({
        isEvmSendType: true,
        isPredefinedEvm: true,
      });

      const { result } = renderHook(() => useContacts());

      expect(result.current).toHaveLength(1);
      expect(result.current[0].address).toBe(
        '0x1234567890123456789012345678901234567890',
      );
    });

    it('filters out zero address burn address', () => {
      const burnAddressBook = {
        '0x1': {
          contact1: mockEvmContact1,
          burnContact: {
            name: 'Burn Address',
            address: '0x0000000000000000000000000000000000000000',
          },
        },
      };
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectAddressBook) {
          return burnAddressBook;
        }
        return {};
      });

      const { result } = renderHook(() => useContacts());

      expect(result.current).toHaveLength(1);
      expect(result.current[0].address).toBe(mockEvmContact1.address);
      expect(
        result.current.find(
          (c) => c.address === '0x0000000000000000000000000000000000000000',
        ),
      ).toBeUndefined();
    });
  });
});
