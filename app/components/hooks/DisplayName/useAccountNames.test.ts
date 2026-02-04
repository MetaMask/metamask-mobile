import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useAccountNames } from './useAccountNames';
import { NameType } from '../../UI/Name/Name.types';
import { UseDisplayNameRequest } from './useDisplayName';
import { selectInternalAccountsById } from '../../../selectors/accountsController';
import { selectAccountGroups } from '../../../selectors/multichainAccounts/accountTreeController';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

describe('useAccountNames', () => {
  const mockUseSelector = useSelector as jest.Mock;

  const mockAccount1 = {
    id: 'account1',
    address: '0x1234567890123456789012345678901234567890',
    metadata: { name: 'Account 1' },
  };

  const mockAccount2 = {
    id: 'account2',
    address: '0x0987654321098765432109876543210987654321',
    metadata: { name: 'Account 2' },
  };

  const mockAccountGroups = [
    {
      metadata: { name: 'Group 1' },
      accounts: ['account1'],
    },
    {
      metadata: { name: 'Group 2' },
      accounts: ['account2'],
    },
  ];

  const mockInternalAccountsById = {
    account1: mockAccount1,
    account2: mockAccount2,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns group names for matching addresses', () => {
    const requests: UseDisplayNameRequest[] = [
      {
        type: NameType.EthereumAddress,
        value: '0x1234567890123456789012345678901234567890',
        variation: 'normal',
      },
      {
        type: NameType.EthereumAddress,
        value: '0x0987654321098765432109876543210987654321',
        variation: 'normal',
      },
    ];

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectInternalAccountsById) {
        return mockInternalAccountsById;
      }
      if (selector === selectAccountGroups) {
        return mockAccountGroups;
      }
      return undefined;
    });

    const { result } = renderHook(() => useAccountNames(requests));

    expect(result.current).toEqual(['Group 1', 'Group 2']);
  });

  it('returns undefined for non-matching addresses', () => {
    const requests: UseDisplayNameRequest[] = [
      {
        type: NameType.EthereumAddress,
        value: '0xnonexistentaddress1234567890123456789012',
        variation: 'normal',
      },
    ];

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectInternalAccountsById) {
        return mockInternalAccountsById;
      }
      if (selector === selectAccountGroups) {
        return mockAccountGroups;
      }
      return undefined;
    });

    const { result } = renderHook(() => useAccountNames(requests));

    expect(result.current).toEqual([undefined]);
  });

  it('returns empty array for empty requests', () => {
    const requests: UseDisplayNameRequest[] = [];

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectInternalAccountsById) {
        return mockInternalAccountsById;
      }
      if (selector === selectAccountGroups) {
        return mockAccountGroups;
      }
      return undefined;
    });

    const { result } = renderHook(() => useAccountNames(requests));

    expect(result.current).toEqual([]);
  });

  it('processes multiple requests with mixed results', () => {
    const requests: UseDisplayNameRequest[] = [
      {
        type: NameType.EthereumAddress,
        value: '0x1234567890123456789012345678901234567890',
        variation: 'normal',
      },
      {
        type: NameType.EthereumAddress,
        value: '0xnonexistentaddress1234567890123456789012',
        variation: 'normal',
      },
      {
        type: NameType.EthereumAddress,
        value: '0x0987654321098765432109876543210987654321',
        variation: 'normal',
      },
    ];

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectInternalAccountsById) {
        return mockInternalAccountsById;
      }
      if (selector === selectAccountGroups) {
        return mockAccountGroups;
      }
      return undefined;
    });

    const { result } = renderHook(() => useAccountNames(requests));

    expect(result.current).toEqual(['Group 1', undefined, 'Group 2']);
  });

  it('handles case-insensitive address matching', () => {
    const requests: UseDisplayNameRequest[] = [
      {
        type: NameType.EthereumAddress,
        value: '0X1234567890123456789012345678901234567890',
        variation: 'normal',
      },
    ];

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectInternalAccountsById) {
        return mockInternalAccountsById;
      }
      if (selector === selectAccountGroups) {
        return mockAccountGroups;
      }
      return undefined;
    });

    const { result } = renderHook(() => useAccountNames(requests));

    expect(result.current).toEqual(['Group 1']);
  });
});
