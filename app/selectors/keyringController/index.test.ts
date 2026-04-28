import {
  selectKeyrings,
  selectFlattenedKeyringAccounts,
  selectIsUnlocked,
  selectPrimaryHDKeyring,
} from './index';
import { RootState } from '../../reducers';
import ExtendedKeyringTypes from '../../constants/keyringTypes';
import {
  MOCK_SIMPLE_ACCOUNTS,
  MOCK_QR_ACCOUNTS,
  MOCK_HD_ACCOUNTS,
  MOCK_KEYRINGS,
  MOCK_KEYRING_CONTROLLER,
  MOCK_HD_KEYRING_METADATA,
} from './testUtils';

describe('KeyringController Selectors', () => {
  describe('selectKeyrings', () => {
    it('returns keyrings', () => {
      expect(
        selectKeyrings({
          engine: {
            backgroundState: {
              KeyringController: MOCK_KEYRING_CONTROLLER,
            },
          },
        } as RootState),
      ).toEqual(MOCK_KEYRINGS);
    });
  });
  describe('selectFlattenedKeyringAccounts', () => {
    it('returns flattened keyring accounts', () => {
      const expectedOrderedKeyringAccounts = [
        ...MOCK_SIMPLE_ACCOUNTS,
        ...MOCK_QR_ACCOUNTS,
        ...MOCK_HD_ACCOUNTS,
      ];
      expect(
        selectFlattenedKeyringAccounts({
          engine: {
            backgroundState: {
              KeyringController: MOCK_KEYRING_CONTROLLER,
            },
          },
        } as RootState),
      ).toEqual(expectedOrderedKeyringAccounts);
    });
  });
  describe('selectIsUnlocked', () => {
    it('returns isUnlocked', () => {
      expect(
        selectIsUnlocked({
          engine: {
            backgroundState: {
              KeyringController: MOCK_KEYRING_CONTROLLER,
            },
          },
        } as RootState),
      ).toEqual(MOCK_KEYRING_CONTROLLER.isUnlocked);
    });
  });
  describe('selectPrimaryHDKeyring', () => {
    it('returns the first HD keyring', () => {
      expect(
        selectPrimaryHDKeyring({
          engine: {
            backgroundState: {
              KeyringController: MOCK_KEYRING_CONTROLLER,
            },
          },
        } as RootState),
      ).toEqual({
        accounts: MOCK_HD_ACCOUNTS,
        type: ExtendedKeyringTypes.hd,
        metadata: MOCK_HD_KEYRING_METADATA,
      });
    });

    it('returns undefined when no HD keyrings exist', () => {
      expect(
        selectPrimaryHDKeyring({
          engine: {
            backgroundState: {
              KeyringController: {
                ...MOCK_KEYRING_CONTROLLER,
                keyrings: MOCK_KEYRINGS.filter(
                  (kr) => kr.type !== ExtendedKeyringTypes.hd,
                ),
              },
            },
          },
        } as RootState),
      ).toBeUndefined();
    });
  });
});
