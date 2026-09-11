import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import {
  useAccountNames,
  selectAccountGroupNamesByAddress,
} from './useAccountNames';
import { NameType } from '../../UI/Name/Name.types';
import { UseDisplayNameRequest } from './useDisplayName';

type ResultFuncArgs = Parameters<
  typeof selectAccountGroupNamesByAddress.resultFunc
>;

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

  // FIX(code-review): The map-building logic moved into the shared
  // `selectAccountGroupNamesByAddress` selector, so its behaviour is now
  // exercised directly (via `.resultFunc`) and the hook tests only cover
  // request→name mapping against a prebuilt map.
  const mockAccountGroupNames: Record<string, string> = {
    '0x1234567890123456789012345678901234567890': 'Group 1',
    '0x0987654321098765432109876543210987654321': 'Group 2',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue(mockAccountGroupNames);
  });

  describe('selectAccountGroupNamesByAddress', () => {
    it('builds a lowercased address → group name map', () => {
      expect(
        selectAccountGroupNamesByAddress.resultFunc(
          mockInternalAccountsById as unknown as ResultFuncArgs[0],
          mockAccountGroups as unknown as ResultFuncArgs[1],
        ),
      ).toEqual(mockAccountGroupNames);
    });

    it('skips group accounts missing from internalAccountsById without throwing', () => {
      const groupsWithDanglingAccount = [
        {
          metadata: { name: 'Group 1' },
          accounts: ['ghost', 'account1'],
        },
      ];

      expect(
        selectAccountGroupNamesByAddress.resultFunc(
          mockInternalAccountsById as unknown as ResultFuncArgs[0],
          groupsWithDanglingAccount as unknown as ResultFuncArgs[1],
        ),
      ).toEqual({
        '0x1234567890123456789012345678901234567890': 'Group 1',
      });
    });
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

    const { result } = renderHook(() => useAccountNames(requests));

    expect(result.current).toEqual([undefined]);
  });

  it('returns empty array for empty requests', () => {
    const requests: UseDisplayNameRequest[] = [];

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

    const { result } = renderHook(() => useAccountNames(requests));

    expect(result.current).toEqual(['Group 1']);
  });
});
