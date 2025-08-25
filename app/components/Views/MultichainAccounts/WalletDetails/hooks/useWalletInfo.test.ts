import { renderHook } from '@testing-library/react-hooks';
import { useWalletInfo } from './useWalletInfo';
import { createMockInternalAccount } from '../../../../../util/test/accountsControllerTestUtils';
import { useHdKeyringsWithSnapAccounts } from '../../../../hooks/useHdKeyringsWithSnapAccounts';
import { useSelector } from 'react-redux';
import { getInternalAccountsFromWallet } from '../utils/getInternalAccountsFromWallet';
import { KeyringTypes } from '@metamask/keyring-controller';
import { EthAccountType } from '@metamask/keyring-api';
import { AccountWalletObject } from '@metamask/account-tree-controller';

// Mock dependencies
jest.mock('../../../../hooks/useHdKeyringsWithSnapAccounts');
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));
jest.mock('../utils/getInternalAccountsFromWallet');

const mockUseHdKeyringsWithSnapAccounts =
  useHdKeyringsWithSnapAccounts as jest.Mock;
const mockUseSelector = useSelector as jest.Mock;
const mockGetInternalAccountsFromWallet =
  getInternalAccountsFromWallet as jest.Mock;

describe('useWalletInfo', () => {
  // Mock accounts
  const mockAccount1 = createMockInternalAccount(
    '0x1',
    'Account 1',
    KeyringTypes.hd,
    EthAccountType.Eoa,
  );
  const mockAccount2 = createMockInternalAccount(
    '0x2',
    'Account 2',
    KeyringTypes.hd,
    EthAccountType.Eoa,
  );
  const mockAccount3 = createMockInternalAccount(
    '0x3',
    'Account 3',
    KeyringTypes.hd,
    EthAccountType.Eoa,
  );

  // Mock wallet
  const mockWallet = {
    id: 'keyring:1',
    metadata: {
      name: 'Test Wallet',
    },
    groups: {
      group1: {
        accounts: [mockAccount1.id, mockAccount2.id],
      },
    },
  } as unknown as AccountWalletObject;

  // Mock keyrings
  const mockKeyring1 = {
    type: KeyringTypes.hd,
    accounts: [mockAccount1.address, mockAccount2.address],
    metadata: {
      id: 'keyring:1',
      name: '',
    },
  };

  const mockKeyring2 = {
    type: KeyringTypes.hd,
    accounts: [mockAccount3.address],
    metadata: {
      id: 'keyring:2',
      name: '',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetInternalAccountsFromWallet.mockReturnValue([
      mockAccount1,
      mockAccount2,
    ]);
  });

  describe('when SRP is backed up', () => {
    beforeEach(() => {
      mockUseSelector.mockReturnValue(true);
    });

    it('returns correct data for first SRP (index 1) with backup status', () => {
      mockUseHdKeyringsWithSnapAccounts.mockReturnValue([
        mockKeyring1,
        mockKeyring2,
      ]);

      const { result } = renderHook(() => useWalletInfo(mockWallet));

      expect(result.current).toEqual({
        accounts: [mockAccount1, mockAccount2],
        keyringId: 'keyring:1',
        srpIndex: 1,
        isSRPBackedUp: true,
      });
    });

    it('returns correct data for second SRP (index 2) without backup status', () => {
      const walletWithKeyring2 = {
        ...mockWallet,
        id: 'keyring:2',
      } as unknown as AccountWalletObject;

      mockGetInternalAccountsFromWallet.mockReturnValue([mockAccount3]);
      mockUseHdKeyringsWithSnapAccounts.mockReturnValue([
        mockKeyring1,
        mockKeyring2,
      ]);

      const { result } = renderHook(() => useWalletInfo(walletWithKeyring2));

      expect(result.current).toEqual({
        accounts: [mockAccount3],
        keyringId: 'keyring:2',
        srpIndex: 2,
        isSRPBackedUp: undefined,
      });
    });

    it('returns correct data for third SRP (index 3) without backup status', () => {
      // Create a unique account for the third keyring
      const mockAccount4 = createMockInternalAccount(
        '0x4',
        'Account 4',
        KeyringTypes.hd,
        EthAccountType.Eoa,
      );

      const mockKeyring3 = {
        type: KeyringTypes.hd,
        accounts: [mockAccount4.address],
        metadata: {
          id: 'keyring:3',
          name: '',
        },
      };

      const walletWithKeyring3 = {
        ...mockWallet,
        id: 'keyring:3',
      } as unknown as AccountWalletObject;

      mockGetInternalAccountsFromWallet.mockReturnValue([mockAccount4]);
      mockUseHdKeyringsWithSnapAccounts.mockReturnValue([
        mockKeyring1,
        mockKeyring2,
        mockKeyring3,
      ]);

      const { result } = renderHook(() => useWalletInfo(walletWithKeyring3));

      expect(result.current).toEqual({
        accounts: [mockAccount4],
        keyringId: 'keyring:3',
        srpIndex: 3,
        isSRPBackedUp: undefined,
      });
    });
  });

  describe('when SRP is not backed up', () => {
    beforeEach(() => {
      mockUseSelector.mockReturnValue(false);
      mockUseHdKeyringsWithSnapAccounts.mockReturnValue([
        mockKeyring1,
        mockKeyring2,
      ]);
    });

    it('returns isSRPBackedUp as false for primary SRP (index 1)', () => {
      const { result } = renderHook(() => useWalletInfo(mockWallet));

      expect(result.current).toEqual({
        accounts: [mockAccount1, mockAccount2],
        keyringId: 'keyring:1',
        srpIndex: 1,
        isSRPBackedUp: false,
      });
    });

    it('returns isSRPBackedUp as undefined for non-primary SRP (index 2)', () => {
      const walletWithKeyring2 = {
        ...mockWallet,
        id: 'keyring:2',
      } as unknown as AccountWalletObject;

      mockGetInternalAccountsFromWallet.mockReturnValue([mockAccount3]);

      const { result } = renderHook(() => useWalletInfo(walletWithKeyring2));

      expect(result.current).toEqual({
        accounts: [mockAccount3],
        keyringId: 'keyring:2',
        srpIndex: 2,
        isSRPBackedUp: undefined,
      });
    });
  });

  it('returns null keyringId when no matching keyring is found', () => {
    // Create accounts that don't exist in any keyring
    const mockUnknownAccount = createMockInternalAccount(
      '0x999',
      'Unknown Account',
      KeyringTypes.hd,
      EthAccountType.Eoa,
    );

    const walletWithUnknownKeyring = {
      ...mockWallet,
      id: 'keyring:999',
    } as unknown as AccountWalletObject;

    mockGetInternalAccountsFromWallet.mockReturnValue([mockUnknownAccount]);
    mockUseHdKeyringsWithSnapAccounts.mockReturnValue([
      mockKeyring1,
      mockKeyring2,
    ]);
    mockUseSelector.mockReturnValue(true);

    const { result } = renderHook(() =>
      useWalletInfo(walletWithUnknownKeyring),
    );

    expect(result.current).toEqual({
      accounts: [mockUnknownAccount],
      keyringId: null,
      srpIndex: null,
    });
  });

  it('handles empty accounts array', () => {
    mockGetInternalAccountsFromWallet.mockReturnValue([]);
    mockUseHdKeyringsWithSnapAccounts.mockReturnValue([mockKeyring1]);
    mockUseSelector.mockReturnValue(true);

    const { result } = renderHook(() => useWalletInfo(mockWallet));

    expect(result.current).toEqual({
      accounts: [],
      keyringId: null,
      srpIndex: null,
    });
  });

  it('handles empty keyrings array', () => {
    mockUseHdKeyringsWithSnapAccounts.mockReturnValue([]);
    mockUseSelector.mockReturnValue(true);

    const { result } = renderHook(() => useWalletInfo(mockWallet));

    expect(result.current).toEqual({
      accounts: [mockAccount1, mockAccount2],
      keyringId: null,
      srpIndex: null,
    });
  });

  it('handles single SRP scenario', () => {
    mockUseHdKeyringsWithSnapAccounts.mockReturnValue([mockKeyring1]);
    mockUseSelector.mockReturnValue(true);

    const { result } = renderHook(() => useWalletInfo(mockWallet));

    expect(result.current).toEqual({
      accounts: [mockAccount1, mockAccount2],
      keyringId: 'keyring:1',
      srpIndex: 1,
      isSRPBackedUp: true,
    });
  });
});
