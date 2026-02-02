import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useAccountNames } from './useAccountNames';
import { NameType } from '../../UI/Name/Name.types';
import { UseDisplayNameRequest } from './useDisplayName';
import {
  selectInternalAccounts,
  selectInternalAccountsById,
} from '../../../selectors/accountsController';
import { selectMultichainAccountsState2Enabled } from '../../../selectors/featureFlagController/multichainAccounts';
import { selectAccountGroups } from '../../../selectors/multichainAccounts/accountTreeController';
import { areAddressesEqual } from '../../../util/address';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../util/address', () => ({
  areAddressesEqual: jest.fn(),
}));

describe('useAccountNames', () => {
  const mockUseSelector = useSelector as jest.Mock;
  const mockAreAddressesEqual = areAddressesEqual as jest.Mock;

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
    mockAreAddressesEqual.mockImplementation(
      (a: string, b: string) => a.toLowerCase() === b.toLowerCase(),
    );
  });

  it('returns account names for matching addresses when multichain state2 is disabled', () => {
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
      if (selector === selectInternalAccounts) {
        return [mockAccount1, mockAccount2];
      }
      if (selector === selectInternalAccountsById) {
        return mockInternalAccountsById;
      }
      if (selector === selectAccountGroups) {
        return mockAccountGroups;
      }
      if (selector === selectMultichainAccountsState2Enabled) {
        return false;
      }
      return undefined;
    });

    const { result } = renderHook(() => useAccountNames(requests));

    expect(result.current).toEqual(['Account 1', 'Account 2']);
  });

  it('returns account names for matching addresses when multichain state2 is enabled', () => {
    const requests: UseDisplayNameRequest[] = [
      {
        type: NameType.EthereumAddress,
        value: '0x1234567890123456789012345678901234567890',
        variation: 'normal',
      },
    ];

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectInternalAccounts) {
        return [mockAccount1, mockAccount2];
      }
      if (selector === selectInternalAccountsById) {
        return mockInternalAccountsById;
      }
      if (selector === selectAccountGroups) {
        return mockAccountGroups;
      }
      if (selector === selectMultichainAccountsState2Enabled) {
        return true;
      }
      return undefined;
    });

    const { result } = renderHook(() => useAccountNames(requests));

    expect(result.current).toEqual(['Group 1']);
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
      if (selector === selectInternalAccounts) {
        return [mockAccount1, mockAccount2];
      }
      if (selector === selectInternalAccountsById) {
        return mockInternalAccountsById;
      }
      if (selector === selectAccountGroups) {
        return mockAccountGroups;
      }
      if (selector === selectMultichainAccountsState2Enabled) {
        return false;
      }
      return undefined;
    });

    mockAreAddressesEqual.mockReturnValue(false);

    const { result } = renderHook(() => useAccountNames(requests));

    expect(result.current).toEqual([undefined]);
  });

  it('returns empty array for empty requests', () => {
    const requests: UseDisplayNameRequest[] = [];

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectInternalAccounts) {
        return [mockAccount1, mockAccount2];
      }
      if (selector === selectInternalAccountsById) {
        return mockInternalAccountsById;
      }
      if (selector === selectAccountGroups) {
        return mockAccountGroups;
      }
      if (selector === selectMultichainAccountsState2Enabled) {
        return false;
      }
      return undefined;
    });

    const { result } = renderHook(() => useAccountNames(requests));

    expect(result.current).toEqual([]);
  });

  it('handles accounts with missing metadata gracefully', () => {
    const accountWithoutMetadata = {
      id: 'account3',
      address: '0xaddresswithoutmetadata1234567890123456',
      metadata: undefined,
    };

    const requests: UseDisplayNameRequest[] = [
      {
        type: NameType.EthereumAddress,
        value: '0xaddresswithoutmetadata1234567890123456',
        variation: 'normal',
      },
    ];

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectInternalAccounts) {
        return [accountWithoutMetadata];
      }
      if (selector === selectInternalAccountsById) {
        return { account3: accountWithoutMetadata };
      }
      if (selector === selectAccountGroups) {
        return [];
      }
      if (selector === selectMultichainAccountsState2Enabled) {
        return false;
      }
      return undefined;
    });

    const { result } = renderHook(() => useAccountNames(requests));

    expect(result.current).toEqual([undefined]);
  });

  it('handles accounts with empty metadata name', () => {
    const accountWithEmptyName = {
      id: 'account4',
      address: '0xaddresswithemptyname1234567890123456',
      metadata: { name: '' },
    };

    const requests: UseDisplayNameRequest[] = [
      {
        type: NameType.EthereumAddress,
        value: '0xaddresswithemptyname1234567890123456',
        variation: 'normal',
      },
    ];

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectInternalAccounts) {
        return [accountWithEmptyName];
      }
      if (selector === selectInternalAccountsById) {
        return { account4: accountWithEmptyName };
      }
      if (selector === selectAccountGroups) {
        return [];
      }
      if (selector === selectMultichainAccountsState2Enabled) {
        return false;
      }
      return undefined;
    });

    const { result } = renderHook(() => useAccountNames(requests));

    expect(result.current).toEqual(['']);
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
      if (selector === selectInternalAccounts) {
        return [mockAccount1, mockAccount2];
      }
      if (selector === selectInternalAccountsById) {
        return mockInternalAccountsById;
      }
      if (selector === selectAccountGroups) {
        return mockAccountGroups;
      }
      if (selector === selectMultichainAccountsState2Enabled) {
        return false;
      }
      return undefined;
    });

    mockAreAddressesEqual.mockImplementation((a: string, b: string) => {
      if (b === '0xnonexistentaddress1234567890123456789012') return false;
      return a.toLowerCase() === b.toLowerCase();
    });

    const { result } = renderHook(() => useAccountNames(requests));

    expect(result.current).toEqual(['Account 1', undefined, 'Account 2']);
  });
});
