import { v4 as uuid } from 'uuid';
import { EthMethod, InternalAccount } from '@metamask/keyring-api';
import migrate, { sha256FromAddress, Identity } from './037';

const MOCK_ADDRESS = '0x0';
const MOCK_ADDRESS_2 = '0x1';

async function addressToUUID(address: string): Promise<string> {
  return uuid({
    random: await sha256FromAddress(address),
  });
}

interface Identities {
  [key: string]: Identity;
}

function createMockPreferenceControllerState(
  identities: Identity[] = [{ name: 'Account 1', address: MOCK_ADDRESS }],
  selectedAddress: string = MOCK_ADDRESS,
): {
  identities: Identities;
  selectedAddress: string;
} {
  const state: {
    identities: Identities;
    selectedAddress: string;
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

async function expectedInternalAccount(
  address: string,
  nickname: string,
  lastSelected?: number,
): Promise<InternalAccount> {
  return {
    address,
    id: await addressToUUID(address),
    metadata: {
      name: nickname,
      keyring: {
        type: 'HD Key Tree',
      },
      lastSelected: lastSelected ? expect.any(Number) : undefined,
    },
    options: {},
    methods: [...Object.values(EthMethod)],
    type: 'eip155:eoa',
  };
}

function createMockState(
  preferenceState: {
    identities: Identities;
    selectedAddress: string;
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

describe('Migration #037', () => {
  describe('createDefaultAccountsController', () => {
    it('creates default state for accounts controller', async () => {
      const oldState = createMockState();
      const newState = await migrate(oldState);

      const expectedUUID = await addressToUUID(MOCK_ADDRESS);
      const resultInternalAccount = await expectedInternalAccount(
        MOCK_ADDRESS,
        'Account 1',
      );
      expect(newState).toStrictEqual({
        engine: {
          backgroundState: {
            AccountsController: {
              internalAccounts: {
                accounts: {
                  [expectedUUID]: resultInternalAccount,
                },
                selectedAccount: expectedUUID,
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
    it('should create the identities into AccountsController as internal accounts', async () => {
      const expectedUUID = await addressToUUID(MOCK_ADDRESS);
      const oldState = createMockState();

      const newState = await migrate(oldState);

      expect(newState).toStrictEqual({
        engine: {
          backgroundState: {
            AccountsController: {
              internalAccounts: {
                accounts: {
                  [expectedUUID]: await expectedInternalAccount(
                    MOCK_ADDRESS,
                    `Account 1`,
                  ),
                },
                selectedAccount: expectedUUID,
              },
            },
            PreferencesController: expect.any(Object),
          },
        },
      });
    });

    it('should keep the same name from the identities', async () => {
      const expectedUUID = await addressToUUID(MOCK_ADDRESS);
      const oldState = createMockState(
        createMockPreferenceControllerState([
          { name: 'a random name', address: MOCK_ADDRESS },
        ]),
      );
      const newState = await migrate(oldState);
      expect(newState).toStrictEqual({
        engine: {
          backgroundState: {
            PreferencesController: expect.any(Object),
            AccountsController: {
              internalAccounts: {
                accounts: {
                  [expectedUUID]: await expectedInternalAccount(
                    MOCK_ADDRESS,
                    `a random name`,
                  ),
                },
                selectedAccount: expectedUUID,
              },
            },
          },
        },
      });
    });

    it('should be able to handle multiple identities', async () => {
      const expectedUUID = await addressToUUID(MOCK_ADDRESS);
      const expectedUUID2 = await addressToUUID(MOCK_ADDRESS_2);
      const oldState = createMockState({
        identities: {
          [MOCK_ADDRESS]: { name: 'Account 1', address: MOCK_ADDRESS },
          [MOCK_ADDRESS_2]: { name: 'Account 2', address: MOCK_ADDRESS_2 },
        },
        selectedAddress: MOCK_ADDRESS_2,
      });
      const newState = await migrate(oldState);
      expect(newState).toStrictEqual({
        engine: {
          backgroundState: {
            AccountsController: {
              internalAccounts: {
                accounts: {
                  [expectedUUID]: await expectedInternalAccount(
                    MOCK_ADDRESS,
                    `Account 1`,
                  ),
                  [expectedUUID2]: await expectedInternalAccount(
                    MOCK_ADDRESS_2,
                    `Account 2`,
                  ),
                },
                selectedAccount: expectedUUID2,
              },
            },
            PreferencesController: expect.any(Object),
          },
        },
      });
    });
  });

  describe('createSelectedAccountForAccountsController', () => {
    it('should select the same account as the selected address', async () => {
      const oldState = createMockState();
      const newState = await migrate(oldState);
      expect(newState).toStrictEqual({
        engine: {
          backgroundState: {
            PreferencesController: expect.any(Object),
            AccountsController: {
              internalAccounts: {
                accounts: expect.any(Object),
                selectedAccount: await addressToUUID(MOCK_ADDRESS),
              },
            },
          },
        },
      });
    });

    it("should leave selectedAccount as empty if there aren't any selectedAddress", async () => {
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
      const newState = await migrate(oldState);
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
    it('should select the first account as the selected account if selectedAddress is undefined, and update PreferencesController accordingly', async () => {
      const identities = [
        { name: 'Account 1', address: MOCK_ADDRESS },
        { name: 'Account 2', address: MOCK_ADDRESS_2 },
      ];
      // explicitly set selectedAddress to undefined
      const oldState = createMockState(
        createMockPreferenceControllerState(identities, undefined),
      );
      const newState = await migrate(oldState);

      const expectedUUID = await addressToUUID(MOCK_ADDRESS);
      const expectedUUID2 = await addressToUUID(MOCK_ADDRESS_2);

      expect(newState).toStrictEqual({
        engine: {
          backgroundState: {
            PreferencesController: {
              // Verifying that PreferencesController's selectedAddress is updated to the first account's address
              selectedAddress: MOCK_ADDRESS,
              identities: {
                [MOCK_ADDRESS]: {
                  address: MOCK_ADDRESS,
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
                  [expectedUUID]: await expectedInternalAccount(
                    MOCK_ADDRESS,
                    `Account 1`,
                  ),
                  [expectedUUID2]: await expectedInternalAccount(
                    MOCK_ADDRESS_2,
                    `Account 2`,
                  ),
                },
                // Verifying the accounts controller's selectedAccount is updated to the first account's UUID
                selectedAccount: expectedUUID,
              },
            },
          },
        },
      });
    });
  });
});
