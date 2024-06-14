import { EthMethod, InternalAccount } from '@metamask/keyring-api';
import migrate, { Identity } from './036';
import { captureException } from '@sentry/react-native';
import { getUUIDFromAddressOfNormalAccount } from '@metamask/accounts-controller';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));
const mockedCaptureException = jest.mocked(captureException);

const MOCK_ADDRESS_1 = '0x0';
const MOCK_ADDRESS_2 = '0x1';

interface Identities {
  [key: string]: Identity;
}

function createMockPreferenceControllerState(
  identities: Identity[] = [{ name: 'Account 1', address: MOCK_ADDRESS_1 }],
  selectedAddress?: string,
): {
  identities: Identities;
  selectedAddress?: string;
} {
  const state: {
    identities: Identities;
    selectedAddress?: string;
  } = {
    identities: {},
    selectedAddress,
  };

  identities.forEach(({ address, name, lastSelected }) => {
    state.identities[address] = {
      address,
      name,
      lastSelected,
    };
  });

  return state;
}

function expectedInternalAccount(
  address: string,
  nickname: string,
  lastSelected?: number,
): InternalAccount {
  return {
    address,
    id: getUUIDFromAddressOfNormalAccount(address),
    metadata: {
      name: nickname,
      importTime: Date.now(),
      keyring: {
        type: 'HD Key Tree',
      },
      lastSelected: lastSelected ? expect.any(Number) : undefined,
    },
    options: {},
    methods: [
      EthMethod.PersonalSign,
      EthMethod.Sign,
      EthMethod.SignTransaction,
      EthMethod.SignTypedDataV1,
      EthMethod.SignTypedDataV3,
      EthMethod.SignTypedDataV4,
    ],
    type: 'eip155:eoa',
  };
}

function createMockState(
  preferenceState: {
    identities: Identities;
    selectedAddress?: string;
  } = createMockPreferenceControllerState(),
) {
  return {
    engine: {
      backgroundState: {
        PreferencesController: {
          ...preferenceState,
        },
      },
    },
  };
}

describe('Migration #036', () => {
  describe('createDefaultAccountsController', () => {
    beforeEach(() => {
      mockedCaptureException.mockReset();
    });
    it('should throw if state.engine is not defined', () => {
      const newState = migrate({});
      expect(newState).toStrictEqual({});
      expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
      expect(mockedCaptureException.mock.calls[0][0].message).toBe(
        `Migration 36: Invalid root engine state: 'undefined'`,
      );
    });
    it('should throw if state.engine.backgroundState is not defined', () => {
      const oldState = {
        engine: {
          backgroundState: undefined,
        },
      };
      const newState = migrate(oldState);
      expect(newState).toStrictEqual(oldState);
      expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
      expect(mockedCaptureException.mock.calls[0][0].message).toBe(
        `Migration 36: Invalid root engine backgroundState: 'undefined'`,
      );
    });
    it('should throw if state.engine.backgroundState.PreferencesController is not defined', () => {
      const oldState = {
        engine: {
          backgroundState: {
            PreferencesController: undefined,
          },
        },
      };
      const newState = migrate(oldState);
      expect(newState).toStrictEqual(oldState);
      expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
      expect(mockedCaptureException.mock.calls[0][0].message).toBe(
        `Migration 36: Invalid PreferencesController state: 'undefined'`,
      );
    });
    it('should throw if state.engine.backgroundState.PreferencesController.identities is not defined', () => {
      const oldState = {
        engine: {
          backgroundState: {
            PreferencesController: {},
          },
        },
      };
      const newState = migrate(oldState);
      expect(newState).toStrictEqual(oldState);
      expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
      expect(mockedCaptureException.mock.calls[0][0].message).toBe(
        `Migration 36: Missing identities property from PreferencesController: 'object'`,
      );
    });
    it('creates default state for accounts controller', () => {
      const oldState = createMockState({
        identities: {
          [MOCK_ADDRESS_1]: {
            name: 'Account 1',
            address: MOCK_ADDRESS_1,
            lastSelected: undefined,
          },
        },
        selectedAddress: MOCK_ADDRESS_1,
      });
      const newState = migrate(oldState);

      const expectedUuid = getUUIDFromAddressOfNormalAccount(MOCK_ADDRESS_1);
      const resultInternalAccount = expectedInternalAccount(
        MOCK_ADDRESS_1,
        'Account 1',
      );
      expect(newState).toStrictEqual({
        engine: {
          backgroundState: {
            AccountsController: {
              internalAccounts: {
                accounts: {
                  [expectedUuid]: resultInternalAccount,
                },
                selectedAccount: expectedUuid,
              },
            },
            PreferencesController: {
              identities: {
                '0x0': {
                  address: '0x0',
                  lastSelected: undefined,
                  name: 'Account 1',
                },
              },
              selectedAddress: '0x0',
            },
          },
        },
      });
    });
  });

  describe('createInternalAccountsForAccountsController', () => {
    it('should create the identities into AccountsController as internal accounts', () => {
      const expectedUuid = getUUIDFromAddressOfNormalAccount(MOCK_ADDRESS_1);
      const oldState = createMockState({
        identities: {
          [MOCK_ADDRESS_1]: {
            name: 'Account 1',
            address: MOCK_ADDRESS_1,
            lastSelected: undefined,
          },
        },
        selectedAddress: MOCK_ADDRESS_1,
      });

      const newState = migrate(oldState);

      expect(newState).toStrictEqual({
        engine: {
          backgroundState: {
            AccountsController: {
              internalAccounts: {
                accounts: {
                  [expectedUuid]: expectedInternalAccount(
                    MOCK_ADDRESS_1,
                    `Account 1`,
                  ),
                },
                selectedAccount: expectedUuid,
              },
            },
            PreferencesController: expect.any(Object),
          },
        },
      });
    });

    it('should keep the same name from the identities', () => {
      const expectedUuid = getUUIDFromAddressOfNormalAccount(MOCK_ADDRESS_1);
      const oldState = createMockState(
        createMockPreferenceControllerState(
          [{ name: 'a random name', address: MOCK_ADDRESS_1 }],
          MOCK_ADDRESS_1,
        ),
      );
      const newState = migrate(oldState);
      expect(newState).toStrictEqual({
        engine: {
          backgroundState: {
            PreferencesController: expect.any(Object),
            AccountsController: {
              internalAccounts: {
                accounts: {
                  [expectedUuid]: expectedInternalAccount(
                    MOCK_ADDRESS_1,
                    `a random name`,
                  ),
                },
                selectedAccount: expectedUuid,
              },
            },
          },
        },
      });
    });

    it('should be able to handle multiple identities', () => {
      const expectedUuid = getUUIDFromAddressOfNormalAccount(MOCK_ADDRESS_1);
      const expectedUuid2 = getUUIDFromAddressOfNormalAccount(MOCK_ADDRESS_2);
      const oldState = createMockState({
        identities: {
          [MOCK_ADDRESS_1]: { name: 'Account 1', address: MOCK_ADDRESS_1 },
          [MOCK_ADDRESS_2]: { name: 'Account 2', address: MOCK_ADDRESS_2 },
        },
        selectedAddress: MOCK_ADDRESS_2,
      });
      const newState = migrate(oldState);
      expect(newState).toStrictEqual({
        engine: {
          backgroundState: {
            AccountsController: {
              internalAccounts: {
                accounts: {
                  [expectedUuid]: expectedInternalAccount(
                    MOCK_ADDRESS_1,
                    `Account 1`,
                  ),
                  [expectedUuid2]: expectedInternalAccount(
                    MOCK_ADDRESS_2,
                    `Account 2`,
                  ),
                },
                selectedAccount: expectedUuid2,
              },
            },
            PreferencesController: expect.any(Object),
          },
        },
      });
    });

    it('should handle empty identities and create default AccountsController with no internal accounts', () => {
      const oldState = createMockState({
        // Simulate `identities` being an empty object
        identities: {},
      });
      const newState = migrate(oldState);

      expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));

      expect(newState).toStrictEqual({
        engine: {
          backgroundState: {
            PreferencesController: expect.any(Object),
            AccountsController: {
              internalAccounts: {
                accounts: {}, // Expect no accounts to be created
                selectedAccount: '', // Expect no account to be selected
              },
            },
          },
        },
      });
    });
  });

  describe('createSelectedAccountForAccountsController', () => {
    it('should select the same account as the selected address', () => {
      const oldState = createMockState(
        createMockPreferenceControllerState(
          [{ name: 'a random name', address: MOCK_ADDRESS_1 }],
          MOCK_ADDRESS_1,
        ),
      );
      const newState = migrate(oldState);
      expect(newState).toStrictEqual({
        engine: {
          backgroundState: {
            PreferencesController: expect.any(Object),
            AccountsController: {
              internalAccounts: {
                accounts: expect.any(Object),
                selectedAccount:
                  getUUIDFromAddressOfNormalAccount(MOCK_ADDRESS_1),
              },
            },
          },
        },
      });
    });

    it("should leave selectedAccount as empty if there aren't any selectedAddress", () => {
      const oldState = {
        engine: {
          backgroundState: {
            PreferencesController: {
              identities: {},
              selectedAddress: '',
            },
          },
        },
      };
      const newState = migrate(oldState);
      expect(newState).toStrictEqual({
        engine: {
          backgroundState: {
            PreferencesController: expect.any(Object),
            AccountsController: {
              internalAccounts: {
                accounts: expect.any(Object),
                selectedAccount: '',
              },
            },
          },
        },
      });
    });
    it('should select the first account as the selected account if selectedAddress is undefined, and update PreferencesController accordingly', () => {
      const identities = [
        { name: 'Account 1', address: MOCK_ADDRESS_1 },
        { name: 'Account 2', address: MOCK_ADDRESS_2 },
      ];
      // explicitly set selectedAddress to undefined
      const oldState = createMockState(
        createMockPreferenceControllerState(identities, undefined),
      );
      const expectedUuid = getUUIDFromAddressOfNormalAccount(MOCK_ADDRESS_1);
      const expectedUuid2 = getUUIDFromAddressOfNormalAccount(MOCK_ADDRESS_2);

      expect(oldState).toStrictEqual({
        engine: {
          backgroundState: {
            PreferencesController: {
              selectedAddress: undefined,
              identities: {
                [MOCK_ADDRESS_1]: {
                  address: MOCK_ADDRESS_1,
                  name: 'Account 1',
                  lastSelected: undefined,
                },
                [MOCK_ADDRESS_2]: {
                  address: MOCK_ADDRESS_2,
                  name: 'Account 2',
                  lastSelected: undefined,
                },
              },
            },
          },
        },
      });

      const newState = migrate(oldState);

      expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));

      expect(newState).toStrictEqual({
        engine: {
          backgroundState: {
            PreferencesController: {
              // Verifying that PreferencesController's selectedAddress is updated to the first account's address
              selectedAddress: MOCK_ADDRESS_1,
              identities: {
                [MOCK_ADDRESS_1]: {
                  address: MOCK_ADDRESS_1,
                  name: 'Account 1',
                  lastSelected: undefined,
                },
                [MOCK_ADDRESS_2]: {
                  address: MOCK_ADDRESS_2,
                  name: 'Account 2',
                  lastSelected: undefined,
                },
              },
            },
            AccountsController: {
              internalAccounts: {
                accounts: {
                  [expectedUuid]: expectedInternalAccount(
                    MOCK_ADDRESS_1,
                    `Account 1`,
                  ),
                  [expectedUuid2]: expectedInternalAccount(
                    MOCK_ADDRESS_2,
                    `Account 2`,
                  ),
                },
                // Verifying the accounts controller's selectedAccount is updated to the first account's UUID
                selectedAccount: expectedUuid,
              },
            },
          },
        },
      });
    });
  });
});
