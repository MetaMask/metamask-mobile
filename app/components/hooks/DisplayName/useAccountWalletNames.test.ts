import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useAccountWalletNames } from './useAccountWalletNames';
import { NameType } from '../../UI/Name/Name.types';
import { UseDisplayNameRequest } from './useDisplayName';
import { selectInternalAccountsById } from '../../../selectors/accountsController';
import {
  selectAccountToWalletMap,
  selectWalletsMap,
} from '../../../selectors/multichainAccounts/accountTreeController';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

describe('useAccountWalletNames', () => {
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

  const mockInternalAccountsById = {
    account1: mockAccount1,
    account2: mockAccount2,
  };

  const mockAccountToWalletMap = {
    account1: 'wallet1',
    account2: 'wallet2',
  };

  const mockWalletsMap = {
    wallet1: {
      id: 'wallet1',
      metadata: { name: 'Wallet 1' },
    },
    wallet2: {
      id: 'wallet2',
      metadata: { name: 'Wallet 2' },
    },
  };

  const mockSingleWalletMap = {
    wallet1: {
      id: 'wallet1',
      metadata: { name: 'Wallet 1' },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns wallet names when multiple wallets exist', () => {
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
      if (selector === selectAccountToWalletMap) {
        return mockAccountToWalletMap;
      }
      if (selector === selectWalletsMap) {
        return mockWalletsMap;
      }
      return undefined;
    });

    const { result } = renderHook(() => useAccountWalletNames(requests));

    expect(result.current).toEqual(['Wallet 1', 'Wallet 2']);
  });

  it('handles case insensitive address matching', () => {
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
      if (selector === selectAccountToWalletMap) {
        return mockAccountToWalletMap;
      }
      if (selector === selectWalletsMap) {
        return mockWalletsMap;
      }
      return undefined;
    });

    const { result } = renderHook(() => useAccountWalletNames(requests));

    expect(result.current).toEqual(['Wallet 1']);
  });

  it('returns empty array when only one wallet exists', () => {
    const requests: UseDisplayNameRequest[] = [
      {
        type: NameType.EthereumAddress,
        value: '0x1234567890123456789012345678901234567890',
        variation: 'normal',
      },
    ];

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectInternalAccountsById) {
        return mockInternalAccountsById;
      }
      if (selector === selectAccountToWalletMap) {
        return mockAccountToWalletMap;
      }
      if (selector === selectWalletsMap) {
        return mockSingleWalletMap;
      }
      return undefined;
    });

    const { result } = renderHook(() => useAccountWalletNames(requests));

    expect(result.current).toEqual([]);
  });

  it('handles missing account in accountToWalletMap', () => {
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
      if (selector === selectAccountToWalletMap) {
        return mockAccountToWalletMap;
      }
      if (selector === selectWalletsMap) {
        return mockWalletsMap;
      }
      return undefined;
    });

    const { result } = renderHook(() => useAccountWalletNames(requests));

    expect(result.current).toEqual([undefined]);
  });

  it('handles missing account in internalAccountsById', () => {
    const accountToWalletMapWithMissingAccount = {
      ...mockAccountToWalletMap,
      missingAccount: 'wallet1',
    };

    const requests: UseDisplayNameRequest[] = [
      {
        type: NameType.EthereumAddress,
        value: '0x1234567890123456789012345678901234567890',
        variation: 'normal',
      },
    ];

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectInternalAccountsById) {
        return mockInternalAccountsById;
      }
      if (selector === selectAccountToWalletMap) {
        return accountToWalletMapWithMissingAccount;
      }
      if (selector === selectWalletsMap) {
        return mockWalletsMap;
      }
      return undefined;
    });

    const { result } = renderHook(() => useAccountWalletNames(requests));

    expect(result.current).toEqual(['Wallet 1']);
  });

  it('handles missing wallet in walletsMap', () => {
    const accountToWalletMapWithMissingWallet = {
      account1: 'missingWallet',
      account2: 'wallet2',
    };

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
      if (selector === selectAccountToWalletMap) {
        return accountToWalletMapWithMissingWallet;
      }
      if (selector === selectWalletsMap) {
        return mockWalletsMap;
      }
      return undefined;
    });

    const { result } = renderHook(() => useAccountWalletNames(requests));

    expect(result.current).toEqual([undefined, 'Wallet 2']);
  });

  it('returns empty array for empty requests', () => {
    const requests: UseDisplayNameRequest[] = [];

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectInternalAccountsById) {
        return mockInternalAccountsById;
      }
      if (selector === selectAccountToWalletMap) {
        return mockAccountToWalletMap;
      }
      if (selector === selectWalletsMap) {
        return mockWalletsMap;
      }
      return undefined;
    });

    const { result } = renderHook(() => useAccountWalletNames(requests));

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
      if (selector === selectAccountToWalletMap) {
        return mockAccountToWalletMap;
      }
      if (selector === selectWalletsMap) {
        return mockWalletsMap;
      }
      return undefined;
    });

    const { result } = renderHook(() => useAccountWalletNames(requests));

    expect(result.current).toEqual(['Wallet 1', undefined, 'Wallet 2']);
  });
});
