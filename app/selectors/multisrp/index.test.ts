import {
  selectHdKeyringIndexByIdOrDefault,
  getKeyringOfSelectedAccount,
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

const mockAccount1 = createMockInternalAccount(MOCK_ADDRESS_1, 'Account 1');
const mockAccount2 = createMockInternalAccount(MOCK_ADDRESS_2, 'Account 2');
const mockAccount3 = createMockInternalAccount(
  MOCK_ADDRESS_3,
  'Account 3',
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

const mockHDKeyringMetadata = {
  id: '',
  name: '',
};

const mockHDKeyring2Metadata = {
  id: '',
  name: '',
};

const mockSimpleKeyringMetadata = {
  id: '',
  name: '',
};

const mockState = (selectedAccount: InternalAccount = mockAccount1) =>
  ({
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

  describe('getKeyringOfSelectedAccount', () => {
    it('returns undefined when no account is selected', () => {
      const result = getKeyringOfSelectedAccount(
        mockStateWithNoSelectedAccount,
      );
      expect(result).toBeUndefined();
    });

    it('returns undefined when no matching keyring is found', () => {
      const result = getKeyringOfSelectedAccount(
        mockStateWithNoSelectedAccount,
      );
      expect(result).toBeUndefined();
    });

    it('returns matching keyring when found', () => {
      const result = getKeyringOfSelectedAccount(mockState());
      expect(result).toStrictEqual(
        expectedKeyringWithMetadata(mockHDKeyring, mockHDKeyringMetadata),
      );
    });
  });

  describe('getHdKeyringOfSelectedAccountOrPrimaryKeyring', () => {
    it('returns first HD keyring when no account is selected', () => {
      const result = getHdKeyringOfSelectedAccountOrPrimaryKeyring(
        mockStateWithNoSelectedAccount,
      );
      expect(result).toStrictEqual(
        expectedKeyringWithMetadata(mockHDKeyring, mockHDKeyringMetadata),
      );
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
