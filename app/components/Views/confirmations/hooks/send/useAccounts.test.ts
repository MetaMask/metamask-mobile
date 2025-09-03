import { renderHook } from '@testing-library/react-hooks';
import { useAccounts } from './useAccounts';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('./useSendType', () => ({
  useSendType: jest.fn(),
}));

jest.mock('@metamask/keyring-api', () => ({
  isEvmAccountType: jest.fn(),
}));

jest.mock('../../../../../core/Multichain/utils', () => ({
  isSolanaAccount: jest.fn(),
}));

jest.mock('../../../../../selectors/multichainAccounts/wallets', () => ({
  selectMultichainWallets: jest.fn(),
}));

jest.mock('../../../../../selectors/accountsController', () => ({
  selectInternalAccountsById: jest.fn(),
}));

import { selectMultichainWallets } from '../../../../../selectors/multichainAccounts/wallets';
import { selectInternalAccountsById } from '../../../../../selectors/accountsController';

import { useSelector } from 'react-redux';
import { useSendType } from './useSendType';
import { isEvmAccountType } from '@metamask/keyring-api';
import { isSolanaAccount } from '../../../../../core/Multichain/utils';

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseSendType = useSendType as jest.MockedFunction<typeof useSendType>;
const mockIsEvmAccountType = isEvmAccountType as jest.MockedFunction<
  typeof isEvmAccountType
>;
const mockIsSolanaAccount = isSolanaAccount as jest.MockedFunction<
  typeof isSolanaAccount
>;

describe('useAccounts', () => {
  const mockEvmAccount = {
    id: 'evm-account-1',
    address: '0x1234567890123456789012345678901234567890',
    type: 'eip155:eoa',
    metadata: {
      name: 'Account 1',
      keyring: {
        type: 'HD Key Tree',
      },
    },
  };

  const mockSolanaAccount = {
    id: 'solana-account-1',
    address: 'Sol1234567890123456789012345678901234567890',
    type: 'solana:data-account',
    metadata: {
      name: 'Solana Account 1',
      keyring: {
        type: 'Solana Keyring',
      },
    },
  };

  const mockWallet = {
    id: 'wallet-1',
    metadata: {
      name: 'Wallet 1',
    },
    groups: {
      'group-1': {
        id: 'group-1',
        accounts: ['evm-account-1'],
        metadata: {
          name: 'Group 1',
        },
      },
      'group-2': {
        id: 'group-2',
        accounts: ['solana-account-1'],
        metadata: {
          name: 'Group 2',
        },
      },
    },
  };

  const mockInternalAccountsById = {
    'evm-account-1': mockEvmAccount,
    'solana-account-1': mockSolanaAccount,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectMultichainWallets) {
        return [mockWallet];
      }
      if (selector === selectInternalAccountsById) {
        return mockInternalAccountsById;
      }
      return [];
    });

    mockUseSendType.mockReturnValue({
      isEvmSendType: true,
      isSolanaSendType: false,
      isEvmNativeSendType: false,
      isNonEvmSendType: false,
      isNonEvmNativeSendType: false,
    });

    mockIsEvmAccountType.mockReturnValue(true);
    mockIsSolanaAccount.mockReturnValue(false);
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
      mockIsEvmAccountType.mockImplementation(
        (accountType) => accountType === 'eip155:eoa',
      );
      mockIsSolanaAccount.mockReturnValue(false);
    });

    it('returns EVM compatible accounts', () => {
      const { result } = renderHook(() => useAccounts());

      expect(result.current).toEqual([
        {
          name: 'Account 1',
          address: '0x1234567890123456789012345678901234567890',
          fiatValue: '$1,000.00',
        },
      ]);
    });

    it('filters out non-EVM accounts', () => {
      mockIsEvmAccountType.mockImplementation(
        (accountType) => accountType === 'eip155:eoa',
      );

      const { result } = renderHook(() => useAccounts());

      expect(result.current).toHaveLength(1);
      expect(result.current[0].address).toBe(
        '0x1234567890123456789012345678901234567890',
      );
      expect(mockIsEvmAccountType).toHaveBeenCalledWith('eip155:eoa');
      expect(mockIsEvmAccountType).toHaveBeenCalledWith('solana:data-account');
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
      mockIsEvmAccountType.mockReturnValue(false);
      mockIsSolanaAccount.mockImplementation(
        (account) => account.type === 'solana:data-account',
      );
    });

    it('returns Solana compatible accounts', () => {
      const { result } = renderHook(() => useAccounts());

      expect(result.current).toEqual([
        {
          name: 'Solana Account 1',
          address: 'Sol1234567890123456789012345678901234567890',
          fiatValue: '$1,000.00',
        },
      ]);
    });

    it('filters out non-Solana accounts', () => {
      const { result } = renderHook(() => useAccounts());

      expect(result.current).toHaveLength(1);
      expect(result.current[0].address).toBe(
        'Sol1234567890123456789012345678901234567890',
      );
      expect(mockIsSolanaAccount).toHaveBeenCalledWith(mockEvmAccount);
      expect(mockIsSolanaAccount).toHaveBeenCalledWith(mockSolanaAccount);
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

    it('returns empty array', () => {
      const { result } = renderHook(() => useAccounts());

      expect(result.current).toEqual([]);
    });
  });

  it('handles empty wallets array', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectMultichainWallets) {
        return [];
      }
      if (selector === selectInternalAccountsById) {
        return mockInternalAccountsById;
      }
      return [];
    });

    const { result } = renderHook(() => useAccounts());

    expect(result.current).toEqual([]);
  });

  it('handles missing internal accounts', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectMultichainWallets) {
        return [mockWallet];
      }
      if (selector === selectInternalAccountsById) {
        return {};
      }
      return [];
    });

    const { result } = renderHook(() => useAccounts());

    expect(result.current).toEqual([]);
  });

  it('handles wallet with no compatible accounts', () => {
    mockUseSendType.mockReturnValue({
      isEvmSendType: true,
      isSolanaSendType: false,
      isEvmNativeSendType: false,
      isNonEvmSendType: false,
      isNonEvmNativeSendType: false,
    });
    mockIsEvmAccountType.mockReturnValue(false);

    const { result } = renderHook(() => useAccounts());

    expect(result.current).toEqual([]);
  });

  it('handles wallet with empty groups', () => {
    const walletWithEmptyGroups = {
      ...mockWallet,
      groups: {},
    };

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectMultichainWallets) {
        return [walletWithEmptyGroups];
      }
      if (selector === selectInternalAccountsById) {
        return mockInternalAccountsById;
      }
      return [];
    });

    const { result } = renderHook(() => useAccounts());

    expect(result.current).toEqual([]);
  });

  it('handles account groups with no accounts', () => {
    const walletWithEmptyAccountGroups = {
      ...mockWallet,
      groups: {
        'empty-group': {
          id: 'empty-group',
          accounts: [],
          metadata: {
            name: 'Empty Group',
          },
        },
      },
    };

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectMultichainWallets) {
        return [walletWithEmptyAccountGroups];
      }
      if (selector === selectInternalAccountsById) {
        return mockInternalAccountsById;
      }
      return [];
    });

    const { result } = renderHook(() => useAccounts());

    expect(result.current).toEqual([]);
  });

  describe('multiple wallets and accounts', () => {
    const mockSecondWallet = {
      id: 'wallet-2',
      metadata: {
        name: 'Wallet 2',
      },
      groups: {
        'group-3': {
          id: 'group-3',
          accounts: ['evm-account-2'],
          metadata: {
            name: 'Group 3',
          },
        },
      },
    };

    const mockSecondEvmAccount = {
      id: 'evm-account-2',
      address: '0x9876543210987654321098765432109876543210',
      type: 'eip155:eoa',
      metadata: {
        name: 'Account 2',
        keyring: {
          type: 'HD Key Tree',
        },
      },
    };

    beforeEach(() => {
      mockUseSendType.mockReturnValue({
        isEvmSendType: true,
        isSolanaSendType: false,
        isEvmNativeSendType: false,
        isNonEvmSendType: false,
        isNonEvmNativeSendType: false,
      });
      mockIsEvmAccountType.mockImplementation(
        (accountType) => accountType === 'eip155:eoa',
      );

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectMultichainWallets) {
          return [mockWallet, mockSecondWallet];
        }
        if (selector === selectInternalAccountsById) {
          return {
            ...mockInternalAccountsById,
            'evm-account-2': mockSecondEvmAccount,
          };
        }
        return [];
      });
    });

    it('returns accounts from multiple wallets', () => {
      const { result } = renderHook(() => useAccounts());

      expect(result.current).toHaveLength(2);
      expect(result.current).toEqual(
        expect.arrayContaining([
          {
            name: 'Account 1',
            address: '0x1234567890123456789012345678901234567890',
            fiatValue: '$1,000.00',
          },
          {
            name: 'Account 2',
            address: '0x9876543210987654321098765432109876543210',
            fiatValue: '$1,000.00',
          },
        ]),
      );
    });
  });

  it('calls isEvmAccountType for each account when isEvmSendType is true', () => {
    mockUseSendType.mockReturnValue({
      isEvmSendType: true,
      isSolanaSendType: false,
      isEvmNativeSendType: false,
      isNonEvmSendType: false,
      isNonEvmNativeSendType: false,
    });

    renderHook(() => useAccounts());

    expect(mockIsEvmAccountType).toHaveBeenCalledWith('eip155:eoa');
    expect(mockIsEvmAccountType).toHaveBeenCalledWith('solana:data-account');
  });

  it('calls isSolanaAccount for each account when isSolanaSendType is true', () => {
    mockUseSendType.mockReturnValue({
      isEvmSendType: false,
      isSolanaSendType: true,
      isEvmNativeSendType: false,
      isNonEvmSendType: false,
      isNonEvmNativeSendType: false,
    });

    renderHook(() => useAccounts());

    expect(mockIsSolanaAccount).toHaveBeenCalledWith(mockEvmAccount);
    expect(mockIsSolanaAccount).toHaveBeenCalledWith(mockSolanaAccount);
  });
});
