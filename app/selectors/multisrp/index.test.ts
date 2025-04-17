import {
  selectHdKeyringIndexByIdOrDefault,
  getHdKeyringOfSelectedAccountOrPrimaryKeyring,
} from './index';
import { RootState } from '../../reducers';
import { createMockInternalAccount } from '../../util/test/accountsControllerTestUtils';
import {
  KeyringMetadata,
  KeyringObject,
  KeyringTypes,
} from '@metamask/keyring-controller';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { ExtendedKeyring } from '../keyringController';

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
};

const mockHDKeyring2 = {
  accounts: [mockAccount2.address],
  type: KeyringTypes.hd,
};

const mockSimpleKeyring = {
  accounts: [mockAccount3.address],
  type: KeyringTypes.simple,
};

const mockSimpleKeyring2 = {
  accounts: [mockAccount4.address],
  type: KeyringTypes.simple,
};

const mockHDKeyringMetadata = {
  id: '01JREC6GSZQJPCDJF921FT2A82',
  name: '',
};

const mockHDKeyring2Metadata = {
  id: '01JREC6R2ZCCZKQTEYMJ7P0GGT',
  name: '',
};

const mockSimpleKeyringMetadata = {
  id: '01JREC6W64RRX0Y9C15Y8QW3DH',
  name: '',
};

const mockSimpleKeyring2Metadata = {
  id: '01JREC70MCJJNQT13ENMNVYBKM',
  name: '',
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
          ],
          keyringsMetadata: [
            mockHDKeyringMetadata,
            mockHDKeyring2Metadata,
            mockSimpleKeyringMetadata,
            mockSimpleKeyring2Metadata,
          ],
        },
        AccountsController: {
          internalAccounts: {
            accounts: {
              [mockAccount1.id]: mockAccount1,
              [mockAccount2.id]: mockAccount2,
              [mockAccount3.id]: mockAccount3,
              [mockAccount4.id]: mockAccount4,
            },
            selectedAccount: selectedAccount.id,
          },
        },
      },
    },
  } as unknown as RootState);

const mockStateWithNoSelectedAccount = {
  engine: {
    backgroundState: {
      KeyringController: {
        keyrings: [mockHDKeyring, mockHDKeyring2, mockSimpleKeyring],
        keyringsMetadata: [
          mockHDKeyringMetadata,
          mockHDKeyring2Metadata,
          mockSimpleKeyringMetadata,
        ],
      },
      AccountsController: {
        internalAccounts: {
          accounts: {
            [mockAccount1.id]: mockAccount1,
            [mockAccount2.id]: mockAccount2,
            [mockAccount3.id]: mockAccount3,
          },
          selectedAccount: undefined,
        },
      },
    },
  },
} as unknown as RootState;

const expectedKeyringWithMetadata = (
  keyring: KeyringObject,
  metadata: KeyringMetadata,
): ExtendedKeyring => ({
  ...keyring,
  metadata,
});

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
        mockHDKeyringMetadata.id,
      );
      expect(result).toBe(0);
    });
  });

  describe('getHdKeyringOfSelectedAccountOrPrimaryKeyring', () => {
    it('returns first HD keyring when no account is selected', () => {
      expect(() =>
        getHdKeyringOfSelectedAccountOrPrimaryKeyring(
          mockStateWithNoSelectedAccount,
        ),
      ).toThrow('No selected account or hd keyrings');
    });

    it('returns correct HD keyring when the selected account is from the second HD keyring', () => {
      const result = getHdKeyringOfSelectedAccountOrPrimaryKeyring(
        mockState(mockAccount2),
      );
      expect(result).toStrictEqual(
        expectedKeyringWithMetadata(mockHDKeyring2, mockHDKeyring2Metadata),
      );
    });

    it('returns selected account keyring when it is HD type', () => {
      const result = getHdKeyringOfSelectedAccountOrPrimaryKeyring(mockState());
      expect(result).toStrictEqual(
        expectedKeyringWithMetadata(mockHDKeyring, mockHDKeyringMetadata),
      );
    });

    it('returns first HD keyring when selected account keyring is not HD type', () => {
      const result = getHdKeyringOfSelectedAccountOrPrimaryKeyring(
        mockState(mockAccount3),
      );
      expect(result).toStrictEqual(
        expectedKeyringWithMetadata(mockHDKeyring, mockHDKeyringMetadata),
      );
    });
  });
});
