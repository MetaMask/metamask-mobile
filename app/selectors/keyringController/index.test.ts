import {
  selectKeyrings,
  selectFlattenedKeyringAccounts,
  selectIsUnlocked,
} from './index';
import { RootState } from '../../reducers';
import {
  MOCK_SIMPLE_ACCOUNTS,
  MOCK_QR_ACCOUNTS,
  MOCK_HD_ACCOUNTS,
  MOCK_KEYRINGS_WITH_METADATA,
  MOCK_KEYRING_CONTROLLER,
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
      ).toEqual(MOCK_KEYRINGS_WITH_METADATA);
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
});
