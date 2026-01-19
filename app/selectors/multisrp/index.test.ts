import {
  selectHdKeyringIndexByIdOrDefault,
  getSnapAccountsByKeyringId,
  selectAccountGroupsByKeyringId,
} from './index';
import { RootState } from '../../reducers';
import { createMockInternalAccount } from '../../util/test/accountsControllerTestUtils';
import { KeyringTypes } from '@metamask/keyring-controller';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { SOLANA_WALLET_SNAP_ID } from '../../core/SnapKeyring/SolanaWalletSnap';
import { AccountGroupType, AccountWalletType } from '@metamask/account-api';

const MOCK_ADDRESS_1 = '0x67B2fAf7959fB61eb9746571041476Bbd0672569';
const MOCK_ADDRESS_2 = '0xeE94464eFCa6F3fb77AC3A77Ca995234c0c1f7fC';
const MOCK_ADDRESS_3 = '0xc7E40ffA6026f7b9c53f5eD5A20a9D0EDFBFbF28';

const mockAccount1 = createMockInternalAccount(
  MOCK_ADDRESS_1,
  'Account 1',
  KeyringTypes.hd,
);
const mockAccount2 = createMockInternalAccount(
  MOCK_ADDRESS_2,
  'Account 2',
  KeyringTypes.hd,
);
const mockAccount3 = createMockInternalAccount(
  MOCK_ADDRESS_3,
  'Account 3',
  KeyringTypes.simple,
);

// This is an account with the same address as mockAccount1, but a different keyring type
const mockAccount4 = createMockInternalAccount(
  MOCK_ADDRESS_1,
  'Account 4',
  KeyringTypes.simple,
);

const mockHDKeyring = {
  accounts: [mockAccount1.address],
  type: KeyringTypes.hd,
  metadata: {
    id: '01JREC6GSZQJPCDJF921FT2A82',
    name: '',
  },
};

const mockHDKeyring2 = {
  accounts: [mockAccount2.address],
  type: KeyringTypes.hd,
  metadata: {
    id: '01JREC6R2ZCCZKQTEYMJ7P0GGT',
    name: '',
  },
};

const mockSimpleKeyring = {
  accounts: [mockAccount3.address],
  type: KeyringTypes.simple,
  metadata: {
    id: '01JREC6W64RRX0Y9C15Y8QW3DH',
    name: '',
  },
};

const mockSimpleKeyring2 = {
  accounts: [mockAccount4.address],
  type: KeyringTypes.simple,
  metadata: {
    id: '01JREC70MCJJNQT13ENMNVYBKM',
    name: '',
  },
};

const mockSnapAccount = {
  ...createMockInternalAccount(
    MOCK_ADDRESS_1,
    'Solana Account',
    KeyringTypes.snap,
  ),
  snap: {
    id: SOLANA_WALLET_SNAP_ID,
    name: 'Solana',
    enabled: true,
  },
  options: {
    entropySource: mockHDKeyring.metadata.id,
  },
};

const mockSnapKeyring = {
  accounts: [mockSnapAccount.address],
  type: KeyringTypes.snap,
  metadata: {
    id: '01JREC70MCJJNQT13ENMNVYBKK',
    name: '',
  },
};

// Account groups representing multichain accounts
const mockAccountGroup1 = {
  id: `entropy:${mockHDKeyring.metadata.id}/0`,
  type: AccountGroupType.MultichainAccount,
  accounts: [mockAccount1.id],
  metadata: {
    name: 'Account 1',
    pinned: false,
    hidden: false,
    entropy: { groupIndex: 0 },
  },
};

const mockAccountGroup2 = {
  id: `entropy:${mockHDKeyring.metadata.id}/1`,
  type: AccountGroupType.MultichainAccount,
  accounts: [mockAccount2.id],
  metadata: {
    name: 'Account 2',
    pinned: false,
    hidden: false,
    entropy: { groupIndex: 1 },
  },
};

const mockAccountGroup3 = {
  id: `entropy:${mockHDKeyring2.metadata.id}/0`,
  type: AccountGroupType.MultichainAccount,
  accounts: [mockAccount3.id],
  metadata: {
    name: 'Account 3',
    pinned: false,
    hidden: false,
    entropy: { groupIndex: 0 },
  },
};

const mockAccountTreeControllerState = {
  accountTree: {
    wallets: {
      [`entropy:${mockHDKeyring.metadata.id}`]: {
        id: `entropy:${mockHDKeyring.metadata.id}`,
        type: AccountWalletType.Entropy,
        metadata: {
          name: 'Wallet 1',
          entropy: { id: mockHDKeyring.metadata.id },
        },
        groups: {
          [mockAccountGroup1.id]: mockAccountGroup1,
          [mockAccountGroup2.id]: mockAccountGroup2,
        },
      },
      [`entropy:${mockHDKeyring2.metadata.id}`]: {
        id: `entropy:${mockHDKeyring2.metadata.id}`,
        type: AccountWalletType.Entropy,
        metadata: {
          name: 'Wallet 2',
          entropy: { id: mockHDKeyring2.metadata.id },
        },
        groups: {
          [mockAccountGroup3.id]: mockAccountGroup3,
        },
      },
    },
    selectedAccountGroup: mockAccountGroup1.id,
  },
};

const mockState = (selectedAccount: InternalAccount = mockAccount1) =>
  ({
    engine: {
      backgroundState: {
        KeyringController: {
          keyrings: [
            mockHDKeyring,
            mockHDKeyring2,
            mockSimpleKeyring,
            mockSimpleKeyring2,
            mockSnapKeyring,
          ],
        },
        AccountsController: {
          internalAccounts: {
            accounts: {
              [mockAccount1.id]: mockAccount1,
              [mockAccount2.id]: mockAccount2,
              [mockAccount3.id]: mockAccount3,
              [mockAccount4.id]: mockAccount4,
              [mockSnapAccount.id]: mockSnapAccount,
            },
            selectedAccount: selectedAccount.id,
          },
        },
        AccountTreeController: mockAccountTreeControllerState,
      },
    },
  }) as unknown as RootState;

describe('multisrp selectors', () => {
  describe('selectHdKeyringIndexByIdOrDefault', () => {
    it('returns 0 when no keyringId is provided', () => {
      const result = selectHdKeyringIndexByIdOrDefault(mockState());
      expect(result).toBe(0);
    });

    it('returns 0 when keyring is not found', () => {
      const result = selectHdKeyringIndexByIdOrDefault(
        mockState(),
        'non-existent',
      );
      expect(result).toBe(0);
    });

    it('returns correct index when keyring is found', () => {
      const result = selectHdKeyringIndexByIdOrDefault(
        mockState(),
        mockHDKeyring.metadata.id,
      );
      expect(result).toBe(0);
    });
  });

  describe('getSnapAccountsByKeyringId', () => {
    it('returns snap accounts along with hd accounts', () => {
      const result = getSnapAccountsByKeyringId(
        mockState(),
        mockHDKeyring.metadata.id,
      );
      expect(result).toEqual([mockSnapAccount]);
    });

    it('returns empty array when no keyringId is provided', () => {
      // @ts-expect-error - This is a test for the null case
      const result = getSnapAccountsByKeyringId(mockState(), null);
      expect(result).toEqual([]);
    });

    it('returns empty array when keyringId is not found', () => {
      const result = getSnapAccountsByKeyringId(mockState(), 'non-existent');
      expect(result).toEqual([]);
    });
  });

  describe('selectAccountGroupsByKeyringId', () => {
    it('returns account groups for a specific keyring', () => {
      const result = selectAccountGroupsByKeyringId(
        mockState(),
        mockHDKeyring.metadata.id,
      );

      expect(result).toHaveLength(2);
      expect(result[0].metadata.name).toBe('Account 1');
      expect(result[1].metadata.name).toBe('Account 2');
    });

    it('returns account groups for a different keyring', () => {
      const result = selectAccountGroupsByKeyringId(
        mockState(),
        mockHDKeyring2.metadata.id,
      );

      expect(result).toHaveLength(1);
      expect(result[0].metadata.name).toBe('Account 3');
    });

    it('returns empty array when keyringId is not found', () => {
      const result = selectAccountGroupsByKeyringId(
        mockState(),
        'non-existent-keyring-id',
      );

      expect(result).toEqual([]);
    });

    it('returns empty array when no account groups exist for keyring', () => {
      // Use the simple keyring ID which has no account groups
      const result = selectAccountGroupsByKeyringId(
        mockState(),
        mockSimpleKeyring.metadata.id,
      );

      expect(result).toEqual([]);
    });

    it('returns account groups with resolved internal accounts', () => {
      const result = selectAccountGroupsByKeyringId(
        mockState(),
        mockHDKeyring.metadata.id,
      );

      expect(result[0].accounts).toHaveLength(1);
      expect(result[0].accounts[0].id).toBe(mockAccount1.id);
    });
  });
});
