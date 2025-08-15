import { renderHook } from '@testing-library/react-hooks';
import { useContacts } from './useContacts';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('./useSendType', () => ({
  useSendType: jest.fn(),
}));

jest.mock('../../../../../selectors/addressBookController', () => ({
  selectAddressBook: jest.fn(),
}));

import { useSelector } from 'react-redux';
import { useSendType } from './useSendType';
import { selectAddressBook } from '../../../../../selectors/addressBookController';

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseSendType = useSendType as jest.MockedFunction<typeof useSendType>;

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
    address: 'Sol1234567890123456789012345678901234567890',
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

    mockUseSendType.mockReturnValue({
      isEvmSendType: true,
      isSolanaSendType: false,
      isEvmNativeSendType: false,
      isNonEvmSendType: false,
      isNonEvmNativeSendType: false,
    });
  });

  describe('when isEvmSendType is true', () => {
    beforeEach(() => {
      mockUseSendType.mockReturnValue({
        isEvmSendType: true,
        isSolanaSendType: false,
        isEvmNativeSendType: false,
        isNonEvmSendType: false,
        isNonEvmNativeSendType: false,
      });
    });

    it('returns EVM compatible contacts', () => {
      const { result } = renderHook(() => useContacts());

      expect(result.current).toEqual([
        {
          name: 'John Doe',
          address: '0x1234567890123456789012345678901234567890',
        },
        {
          name: 'Jane Smith',
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

  describe('when isSolanaSendType is true', () => {
    beforeEach(() => {
      mockUseSendType.mockReturnValue({
        isEvmSendType: false,
        isSolanaSendType: true,
        isEvmNativeSendType: false,
        isNonEvmSendType: false,
        isNonEvmNativeSendType: false,
      });
    });

    it('returns Solana compatible contacts', () => {
      const { result } = renderHook(() => useContacts());

      expect(result.current).toEqual([
        {
          name: 'Solana Contact',
          address: 'Sol1234567890123456789012345678901234567890',
        },
      ]);
    });

    it('filters out EVM addresses', () => {
      const { result } = renderHook(() => useContacts());

      const addresses = result.current.map((contact) => contact.address);
      expect(addresses).not.toContain(
        '0x1234567890123456789012345678901234567890',
      );
      expect(addresses).not.toContain(
        '0x9876543210987654321098765432109876543210',
      );
    });

    it('only includes addresses not starting with 0x and at least 32 characters', () => {
      const { result } = renderHook(() => useContacts());

      result.current.forEach((contact) => {
        expect(contact.address).not.toMatch(/^0x/);
        expect(contact.address.length).toBeGreaterThanOrEqual(32);
      });
    });
  });

  describe('when neither EVM nor Solana send type is active', () => {
    beforeEach(() => {
      mockUseSendType.mockReturnValue({
        isEvmSendType: false,
        isSolanaSendType: false,
        isEvmNativeSendType: false,
        isNonEvmSendType: false,
        isNonEvmNativeSendType: false,
      });
    });

    it('returns all contacts without filtering', () => {
      const { result } = renderHook(() => useContacts());

      expect(result.current).toHaveLength(4);
      expect(result.current).toEqual(
        expect.arrayContaining([
          {
            name: 'John Doe',
            address: '0x1234567890123456789012345678901234567890',
          },
          {
            name: 'Jane Smith',
            address: '0x9876543210987654321098765432109876543210',
          },
          {
            name: 'Solana Contact',
            address: 'Sol1234567890123456789012345678901234567890',
          },
          {
            name: 'Invalid Contact',
            address: '0xinvalid',
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
          '1': {
            contact1: mockEvmContact1,
          },
        };
      }
      return {};
    });

    const { result } = renderHook(() => useContacts());

    expect(result.current).toEqual([
      {
        name: 'John Doe',
        address: '0x1234567890123456789012345678901234567890',
      },
    ]);
  });

  describe('edge cases for address validation', () => {
    const edgeCaseAddressBook = {
      '1': {
        validEvm: {
          name: 'Valid EVM',
          address: '0x1234567890123456789012345678901234567890',
        },
        invalidEvmShort: {
          name: 'Invalid EVM Short',
          address: '0x123456',
        },
        invalidEvmLong: {
          name: 'Invalid EVM Long',
          address: '0x123456789012345678901234567890123456789012345',
        },
        validSolana: {
          name: 'Valid Solana',
          address: 'Sol12345678901234567890123456789012345678901234567890',
        },
        invalidSolanaShort: {
          name: 'Invalid Solana Short',
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
      mockUseSendType.mockReturnValue({
        isEvmSendType: true,
        isSolanaSendType: false,
        isEvmNativeSendType: false,
        isNonEvmSendType: false,
        isNonEvmNativeSendType: false,
      });

      const { result } = renderHook(() => useContacts());

      expect(result.current).toHaveLength(1);
      expect(result.current[0].address).toBe(
        '0x1234567890123456789012345678901234567890',
      );
    });

    it('filters addresses correctly for Solana when addresses have different lengths', () => {
      mockUseSendType.mockReturnValue({
        isEvmSendType: false,
        isSolanaSendType: true,
        isEvmNativeSendType: false,
        isNonEvmSendType: false,
        isNonEvmNativeSendType: false,
      });

      const { result } = renderHook(() => useContacts());

      expect(result.current).toHaveLength(1);
      expect(result.current[0].address).toBe(
        'Sol12345678901234567890123456789012345678901234567890',
      );
    });
  });

  describe('contact deduplication', () => {
    const duplicateAddressBook = {
      '1': {
        contact1: {
          name: 'First John',
          address: '0x1234567890123456789012345678901234567890',
        },
      },
      '137': {
        contact2: {
          name: 'Second John',
          address: '0x1234567890123456789012345678901234567890',
        },
      },
      '56': {
        contact3: {
          name: 'Third John',
          address: '0x1234567890123456789012345678901234567890',
        },
      },
    };

    it('keeps only the first occurrence of duplicate addresses', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectAddressBook) {
          return duplicateAddressBook;
        }
        return {};
      });

      const { result } = renderHook(() => useContacts());

      expect(result.current).toHaveLength(1);
      expect(result.current[0]).toEqual({
        name: 'First John',
        address: '0x1234567890123456789012345678901234567890',
      });
    });
  });
});
