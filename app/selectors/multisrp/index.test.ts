import {
  selectHdKeyringIndexByIdOrDefault,
  getSnapAccountsByKeyringId,
} from './index';
import { RootState } from '../../reducers';
import { createMockInternalAccount } from '../../util/test/accountsControllerTestUtils';
import { KeyringTypes } from '@metamask/keyring-controller';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { SOLANA_WALLET_SNAP_ID } from '../../core/SnapKeyring/SolanaWalletSnap';

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
});
