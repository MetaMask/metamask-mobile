import {
  selectKeyrings,
  selectFlattenedKeyringAccounts,
  selectIsMoneyKeyringAddress,
  selectIsUnlocked,
  selectMoneyKeyringAddresses,
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

  describe('money keyring selectors', () => {
    const MONEY_ADDRESS = '0xAbC0000000000000000000000000000000000001';
    const MPC_MONEY_ADDRESS = '0xDeF0000000000000000000000000000000000002';

    // Asserted as literals rather than via `KeyringTypes` so a change to the
    // enum's string values — which are persisted in the vault — fails here.
    const MONEY_KEYRING_TYPE = 'Money Keyring';
    const MPC_MONEY_KEYRING_TYPE = 'MPC Money Keyring';

    const buildState = (keyrings: unknown[]) =>
      ({
        engine: {
          backgroundState: {
            KeyringController: { ...MOCK_KEYRING_CONTROLLER, keyrings },
          },
        },
      }) as RootState;

    const moneyKeyrings = () => [
      ...MOCK_KEYRINGS,
      {
        type: MONEY_KEYRING_TYPE,
        accounts: [MONEY_ADDRESS],
        metadata: { id: 'money-keyring-id', name: '' },
      },
      {
        type: MPC_MONEY_KEYRING_TYPE,
        accounts: [MPC_MONEY_ADDRESS],
        metadata: { id: 'mpc-money-keyring-id', name: '' },
      },
    ];

    describe('selectMoneyKeyringAddresses', () => {
      it('returns lowercased addresses from money and MPC money keyrings', () => {
        expect(
          selectMoneyKeyringAddresses(buildState(moneyKeyrings())),
        ).toEqual([
          MONEY_ADDRESS.toLowerCase(),
          MPC_MONEY_ADDRESS.toLowerCase(),
        ]);
      });

      it('returns an empty array when no money keyring exists', () => {
        expect(selectMoneyKeyringAddresses(buildState(MOCK_KEYRINGS))).toEqual(
          [],
        );
      });
    });

    describe('selectIsMoneyKeyringAddress', () => {
      it.each([
        ['money', MONEY_ADDRESS],
        ['MPC money', MPC_MONEY_ADDRESS],
      ])('returns true for an address held by a %s keyring', (_, address) => {
        expect(
          selectIsMoneyKeyringAddress(buildState(moneyKeyrings()), address),
        ).toBe(true);
      });

      it('matches addresses case-insensitively', () => {
        expect(
          selectIsMoneyKeyringAddress(
            buildState(moneyKeyrings()),
            MONEY_ADDRESS.toUpperCase(),
          ),
        ).toBe(true);
      });

      it('returns false for an address held by a non-money keyring', () => {
        expect(
          selectIsMoneyKeyringAddress(
            buildState(moneyKeyrings()),
            MOCK_HD_ACCOUNTS[0],
          ),
        ).toBe(false);
      });

      it('returns false when no address is given', () => {
        expect(
          selectIsMoneyKeyringAddress(buildState(moneyKeyrings()), undefined),
        ).toBe(false);
      });
    });
  });
});
