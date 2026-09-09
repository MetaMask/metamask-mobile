import {
  selectVisibleAccountGroupsByWallet,
  selectAccountGroupHidden,
} from './manageAccounts';
import { RootState } from '../../reducers';
import {
  AccountTreeControllerState,
  AccountWalletObject,
} from '@metamask/account-tree-controller';
import { DeepPartial } from 'redux';
import {
  AccountGroupId,
  AccountGroupType,
  AccountWalletType,
} from '@metamask/account-api';

const WALLET_ID_1 = 'keyring:wallet1' as const;
const WALLET_ID_2 = 'keyring:wallet2' as const;
const GROUP_ID_1 = 'keyring:wallet1/0' as AccountGroupId;
const GROUP_ID_2 = 'keyring:wallet1/1' as AccountGroupId;
const GROUP_ID_3 = 'keyring:wallet2/0' as AccountGroupId;

const createMockState = (
  accountTreeController:
    | DeepPartial<AccountTreeControllerState>
    | undefined = {},
): RootState =>
  ({
    engine: {
      backgroundState: {
        AccountTreeController: accountTreeController,
      },
    },
  }) as unknown as RootState;

describe('manageAccounts selectors', () => {
  const visibleGroup1 = {
    id: GROUP_ID_1,
    type: AccountGroupType.SingleAccount,
    accounts: ['account-1'],
    metadata: {
      name: 'Account 1',
      pinned: false,
      hidden: false,
    },
  };

  const hiddenGroup2 = {
    id: GROUP_ID_2,
    type: AccountGroupType.SingleAccount,
    accounts: ['account-2'],
    metadata: {
      name: 'Account 2',
      pinned: false,
      hidden: true,
    },
  };

  const visibleGroup3 = {
    id: GROUP_ID_3,
    type: AccountGroupType.SingleAccount,
    accounts: ['account-3'],
    metadata: {
      name: 'Account 3',
      pinned: false,
      hidden: false,
    },
  };

  const wallet1: AccountWalletObject = {
    id: WALLET_ID_1,
    type: AccountWalletType.Keyring,
    status: 'ready',
    metadata: {
      name: 'Wallet 1',
      keyring: { type: 'HD Key Tree' },
    },
    groups: {
      [GROUP_ID_1]: visibleGroup1,
      [GROUP_ID_2]: hiddenGroup2,
    },
  } as unknown as AccountWalletObject;

  const wallet2: AccountWalletObject = {
    id: WALLET_ID_2,
    type: AccountWalletType.Keyring,
    status: 'ready',
    metadata: {
      name: 'Wallet 2',
      keyring: { type: 'HD Key Tree' },
    },
    groups: {
      [GROUP_ID_3]: visibleGroup3,
    },
  } as unknown as AccountWalletObject;

  describe('selectVisibleAccountGroupsByWallet', () => {
    it('returns wallet sections excluding hidden account groups', () => {
      const mockState = createMockState({
        accountTree: {
          wallets: {
            [WALLET_ID_1]: wallet1,
            [WALLET_ID_2]: wallet2,
          },
        },
      });

      const result = selectVisibleAccountGroupsByWallet(mockState);
      expect(result).toEqual([
        {
          title: 'Wallet 1',
          wallet: wallet1,
          data: [visibleGroup1],
        },
        {
          title: 'Wallet 2',
          wallet: wallet2,
          data: [visibleGroup3],
        },
      ]);
    });

    it('returns empty sections when all groups in a wallet are hidden', () => {
      const allHiddenWallet: AccountWalletObject = {
        id: WALLET_ID_1,
        type: AccountWalletType.Keyring,
        status: 'ready',
        metadata: {
          name: 'Wallet 1',
          keyring: { type: 'HD Key Tree' },
        },
        groups: {
          [GROUP_ID_2]: hiddenGroup2,
        },
      } as unknown as AccountWalletObject;

      const mockState = createMockState({
        accountTree: {
          wallets: {
            [WALLET_ID_1]: allHiddenWallet,
          },
        },
      });

      const result = selectVisibleAccountGroupsByWallet(mockState);
      expect(result).toEqual([
        {
          title: 'Wallet 1',
          wallet: allHiddenWallet,
          data: [],
        },
      ]);
    });

    it('returns empty array when accountTree is undefined', () => {
      const mockState = createMockState(undefined);
      const result = selectVisibleAccountGroupsByWallet(mockState);
      expect(result).toEqual([]);
    });
  });

  describe('selectAccountGroupHidden', () => {
    const mockState = createMockState({
      accountTree: {
        wallets: {
          [WALLET_ID_1]: wallet1,
          [WALLET_ID_2]: wallet2,
        },
      },
    });

    it('returns false when the group is visible', () => {
      const isHidden = selectAccountGroupHidden(GROUP_ID_1)(mockState);
      expect(isHidden).toBe(false);
    });

    it('returns true when the group is hidden', () => {
      const isHidden = selectAccountGroupHidden(GROUP_ID_2)(mockState);
      expect(isHidden).toBe(true);
    });

    it('returns false for non-existent group', () => {
      const isHidden = selectAccountGroupHidden(
        'keyring:nonexistent/0' as AccountGroupId,
      )(mockState);
      expect(isHidden).toBe(false);
    });
  });
});
