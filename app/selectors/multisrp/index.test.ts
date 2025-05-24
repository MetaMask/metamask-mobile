import {
  selectHdKeyringIndexByIdOrDefault,
  getHdKeyringOfSelectedAccountOrPrimaryKeyring,
  getSnapAccountsByKeyringId,
  selectHdEntropyIndex,
} from './index';
import { RootState } from '../../reducers';
import { createMockInternalAccount } from '../../util/test/accountsControllerTestUtils';
import { KeyringTypes } from '@metamask/keyring-controller';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { ExtendedKeyring } from '../keyringController';

describe('multisrp selectors', () => {
  const mockAddress1 = '0x1111111111111111111111111111111111111111';
  const mockAddress2 = '0x2222222222222222222222222222222222222222';
  const mockAddress3 = '0x3333333333333333333333333333333333333333';
  const mockAddress4 = '0x4444444444444444444444444444444444444444';

  const mockHdKeyring1 = {
    accounts: [mockAddress1],
    type: KeyringTypes.hd,
    metadata: { id: 'hd-1', name: '' },
  };

  const mockHdKeyring2 = {
    accounts: [mockAddress2],
    type: KeyringTypes.hd,
    metadata: { id: 'hd-2', name: '' },
  };

  const mockSimpleKeyring = {
    accounts: [mockAddress3],
    type: KeyringTypes.simple,
    metadata: { id: 'simple-1', name: '' },
  };

  const mockSnapKeyring = {
    accounts: [mockAddress4],
    type: KeyringTypes.snap,
    metadata: { id: 'snap-1', name: '' },
  };

  const mockAccount1 = createMockInternalAccount(
    mockAddress1,
    'HD Account 1',
    KeyringTypes.hd,
  );

  const mockAccount2 = createMockInternalAccount(
    mockAddress2,
    'HD Account 2',
    KeyringTypes.hd,
  );

  const mockAccount3 = createMockInternalAccount(
    mockAddress3,
    'Simple Account',
    KeyringTypes.simple,
  );

  const mockSnapAccountWithValidSource = {
    ...createMockInternalAccount(
      mockAddress4,
      'Snap Account',
      KeyringTypes.snap,
    ),
    options: {
      entropySource: 'hd-1',
    },
  };

  const mockSnapAccountWithInvalidSource = {
    ...createMockInternalAccount(
      mockAddress4,
      'Snap Account',
      KeyringTypes.snap,
    ),
    options: {
      entropySource: 'non-existent',
    },
  };

  const mockSnapAccountWithNoSource = {
    ...createMockInternalAccount(
      mockAddress4,
      'Snap Account',
      KeyringTypes.snap,
    ),
    options: {},
  };

  const createMockState = (
    selectedAccount: InternalAccount,
    keyrings: ExtendedKeyring[],
  ) =>
    ({
      engine: {
        backgroundState: {
          KeyringController: {
            keyrings,
            keyringsMetadata: keyrings.map((k) => k.metadata),
          },
          AccountsController: {
            internalAccounts: {
              accounts: {
                [selectedAccount.id]: selectedAccount,
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
          keyrings: [mockHdKeyring1, mockHdKeyring2, mockSimpleKeyring],
          keyringsMetadata: [
            mockHdKeyring1.metadata,
            mockHdKeyring2.metadata,
            mockSimpleKeyring.metadata,
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

  describe('selectHdKeyringIndexByIdOrDefault', () => {
    it('returns 0 when no keyringId is provided', () => {
      const state = createMockState(mockAccount1, [
        mockHdKeyring1,
        mockHdKeyring2,
      ]);
      const result = selectHdKeyringIndexByIdOrDefault(state);
      expect(result).toBe(0);
    });

    it('returns 0 when keyring is not found', () => {
      const state = createMockState(mockAccount1, [
        mockHdKeyring1,
        mockHdKeyring2,
      ]);
      const result = selectHdKeyringIndexByIdOrDefault(state, 'non-existent');
      expect(result).toBe(0);
    });

    it('returns correct index when keyring is found', () => {
      const state = createMockState(mockAccount1, [
        mockHdKeyring1,
        mockHdKeyring2,
      ]);
      const result = selectHdKeyringIndexByIdOrDefault(
        state,
        mockHdKeyring1.metadata.id,
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
      const state = createMockState(mockAccount2, [
        mockHdKeyring1,
        mockHdKeyring2,
      ]);
      const result = getHdKeyringOfSelectedAccountOrPrimaryKeyring(state);
      expect(result).toStrictEqual(mockHdKeyring2);
    });

    it('returns selected account keyring when it is HD type', () => {
      const state = createMockState(mockAccount1, [
        mockHdKeyring1,
        mockHdKeyring2,
      ]);
      const result = getHdKeyringOfSelectedAccountOrPrimaryKeyring(state);
      expect(result).toStrictEqual(mockHdKeyring1);
    });

    it('returns first HD keyring when selected account keyring is not HD type', () => {
      const state = createMockState(mockAccount3, [
        mockHdKeyring1,
        mockHdKeyring2,
        mockSimpleKeyring,
      ]);
      const result = getHdKeyringOfSelectedAccountOrPrimaryKeyring(state);
      expect(result).toStrictEqual(mockHdKeyring1);
    });
  });

  describe('getSnapAccountsByKeyringId', () => {
    it('returns snap accounts along with hd accounts', () => {
      const state = createMockState(mockSnapAccountWithValidSource, [
        mockHdKeyring1,
        mockHdKeyring2,
        mockSnapKeyring,
      ]);
      const result = getSnapAccountsByKeyringId(
        state,
        mockHdKeyring1.metadata.id,
      );
      expect(result).toEqual([mockSnapAccountWithValidSource]);
    });

    it('returns empty array when no keyringId is provided', () => {
      const state = createMockState(mockSnapAccountWithValidSource, [
        mockHdKeyring1,
        mockHdKeyring2,
        mockSnapKeyring,
      ]);
      // @ts-expect-error - This is a test for the null case
      const result = getSnapAccountsByKeyringId(state, null);
      expect(result).toEqual([]);
    });

    it('returns empty array when keyringId is not found', () => {
      const state = createMockState(mockSnapAccountWithValidSource, [
        mockHdKeyring1,
        mockHdKeyring2,
        mockSnapKeyring,
      ]);
      const result = getSnapAccountsByKeyringId(state, 'non-existent');
      expect(result).toEqual([]);
    });
  });

  describe('selectHdEntropyIndex', () => {
    it('returns undefined when no account is selected', () => {
      const result = selectHdEntropyIndex(mockStateWithNoSelectedAccount);
      expect(result).toBeUndefined();
    });

    it('returns undefined when no HD keyrings exist', () => {
      const state = createMockState(mockAccount3, [
        mockSimpleKeyring,
        mockSnapKeyring,
      ]);
      const result = selectHdEntropyIndex(state);
      expect(result).toBeUndefined();
    });

    it('returns correct index when account is found in first HD keyring', () => {
      const state = createMockState(mockAccount1, [
        mockHdKeyring1,
        mockHdKeyring2,
      ]);
      const result = selectHdEntropyIndex(state);
      expect(result).toBe(0);
    });

    it('returns correct index when account is found in second HD keyring', () => {
      const state = createMockState(mockAccount2, [
        mockHdKeyring1,
        mockHdKeyring2,
      ]);
      const result = selectHdEntropyIndex(state);
      expect(result).toBe(1);
    });

    it('returns undefined when account is in simple keyring and has no entropySource', () => {
      const state = createMockState(mockAccount3, [
        mockHdKeyring1,
        mockSimpleKeyring,
      ]);
      const result = selectHdEntropyIndex(state);
      expect(result).toBeUndefined();
    });

    it('returns correct index when snap account has valid entropySource matching HD keyring', () => {
      const state = createMockState(mockSnapAccountWithValidSource, [
        mockHdKeyring1,
        mockHdKeyring2,
        mockSnapKeyring,
      ]);
      const result = selectHdEntropyIndex(state);
      expect(result).toBe(0);
    });

    it('returns undefined when snap account has invalid entropySource', () => {
      const state = createMockState(mockSnapAccountWithInvalidSource, [
        mockHdKeyring1,
        mockHdKeyring2,
        mockSnapKeyring,
      ]);
      const result = selectHdEntropyIndex(state);
      expect(result).toBeUndefined();
    });

    it('returns undefined when account has no options or entropySource', () => {
      const state = createMockState(mockSnapAccountWithNoSource, [
        mockHdKeyring1,
        mockHdKeyring2,
        mockSnapKeyring,
      ]);
      const result = selectHdEntropyIndex(state);
      expect(result).toBeUndefined();
    });

    it('returns undefined when no HD keyrings exist but entropySource matches non-HD keyring', () => {
      const snapAccountWithSimpleSource = {
        ...mockSnapAccountWithValidSource,
        options: {
          entropySource: 'simple-1',
        },
      };
      const state = createMockState(snapAccountWithSimpleSource, [
        mockSimpleKeyring,
        mockSnapKeyring,
      ]);
      const result = selectHdEntropyIndex(state);
      expect(result).toBeUndefined();
    });
  });
});
