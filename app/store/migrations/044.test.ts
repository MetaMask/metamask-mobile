import migrate from './044';
import { captureException } from '@sentry/react-native';
import {
  AccountsControllerState,
  getUUIDFromAddressOfNormalAccount,
} from '@metamask/accounts-controller';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import { EthMethod } from '@metamask/keyring-api';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));
const mockedCaptureException = jest.mocked(captureException);

const MOCK_LOWERCASE_ADDRESS_1 = '0xc5b2b5ae121314c0122910f92a13bef85a133e56';
const MOCK_LOWERCASE_ADDRESS_2 = '0x7564381891d774cf46ad422f28b75ab3364a7240';
const MOCK_LOWERCASE_ADDRESS_3 = '0x79821ea7ab5c5a34a24b2fd547c544ac15a7b121';
const MOCK_LOWERCASE_ADDRESS_4 = '0xdf8c7564f35274c5ba5c18f091407c8b1c29d7b1';
const MOCK_LOWERCASE_ADDRESS_5 = '0x9ac820e7e1d3b3d4ec9e0615893b6552479b9d52';

const expectedId1 = getUUIDFromAddressOfNormalAccount(MOCK_LOWERCASE_ADDRESS_1);
const expectedId2 = getUUIDFromAddressOfNormalAccount(MOCK_LOWERCASE_ADDRESS_2);
const expectedId3 = getUUIDFromAddressOfNormalAccount(MOCK_LOWERCASE_ADDRESS_3);
const expectedId4 = getUUIDFromAddressOfNormalAccount(MOCK_LOWERCASE_ADDRESS_4);
const expectedId5 = getUUIDFromAddressOfNormalAccount(MOCK_LOWERCASE_ADDRESS_5);

function createMockAccountsControllerState(
  selectedAccount = 'id1',
): AccountsControllerState {
  return {
    internalAccounts: {
      accounts: {
        id1: {
          address: toChecksumHexAddress(MOCK_LOWERCASE_ADDRESS_1),
          id: 'id1',
          options: {},
          metadata: {
            name: 'Account 1',
            keyring: {
              type: 'HD Key Tree',
            },
          },
          methods: [
            EthMethod.PersonalSign,
            EthMethod.Sign,
            EthMethod.SignTransaction,
            EthMethod.SignTypedDataV1,
            EthMethod.SignTypedDataV3,
            EthMethod.SignTypedDataV4,
          ],
          type: 'eip155:eoa',
        },
        id2: {
          address: toChecksumHexAddress(MOCK_LOWERCASE_ADDRESS_2),
          id: 'id2',
          options: {},
          metadata: {
            name: 'Account 2',
            keyring: {
              type: 'HD Key Tree',
            },
          },
          methods: [
            EthMethod.PersonalSign,
            EthMethod.Sign,
            EthMethod.SignTransaction,
            EthMethod.SignTypedDataV1,
            EthMethod.SignTypedDataV3,
            EthMethod.SignTypedDataV4,
          ],
          type: 'eip155:eoa',
        },
        id3: {
          address: toChecksumHexAddress(MOCK_LOWERCASE_ADDRESS_3),
          id: 'id3',
          options: {},
          metadata: {
            name: 'Account 3',
            keyring: {
              type: 'HD Key Tree',
            },
          },
          methods: [
            EthMethod.PersonalSign,
            EthMethod.Sign,
            EthMethod.SignTransaction,
            EthMethod.SignTypedDataV1,
            EthMethod.SignTypedDataV3,
            EthMethod.SignTypedDataV4,
          ],
          type: 'eip155:eoa',
        },
        id4: {
          address: toChecksumHexAddress(MOCK_LOWERCASE_ADDRESS_4),
          id: 'id4',
          options: {},
          metadata: {
            name: 'Account 4',
            keyring: {
              type: 'HD Key Tree',
            },
          },
          methods: [
            EthMethod.PersonalSign,
            EthMethod.Sign,
            EthMethod.SignTransaction,
            EthMethod.SignTypedDataV1,
            EthMethod.SignTypedDataV3,
            EthMethod.SignTypedDataV4,
          ],
          type: 'eip155:eoa',
        },
        id5: {
          address: toChecksumHexAddress(MOCK_LOWERCASE_ADDRESS_5),
          id: 'id5',
          options: {},
          metadata: {
            name: 'Account 5',
            keyring: {
              type: 'HD Key Tree',
            },
          },
          methods: [
            EthMethod.PersonalSign,
            EthMethod.Sign,
            EthMethod.SignTransaction,
            EthMethod.SignTypedDataV1,
            EthMethod.SignTypedDataV3,
            EthMethod.SignTypedDataV4,
          ],
          type: 'eip155:eoa',
        },
        [expectedId1]: {
          id: expectedId1,
          address: MOCK_LOWERCASE_ADDRESS_1,
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
          metadata: {
            name: 'Account 6',
            keyring: {
              type: 'HD Key Tree',
            },
            lastSelected: 1718130576952,
          },
        },
        [expectedId2]: {
          id: expectedId2,
          address: MOCK_LOWERCASE_ADDRESS_2,
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
          metadata: {
            name: 'Account 7',
            keyring: {
              type: 'HD Key Tree',
            },
            lastSelected: 1718130576953,
          },
        },
        [expectedId3]: {
          id: expectedId3,
          address: MOCK_LOWERCASE_ADDRESS_3,
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
          metadata: {
            name: 'Account 8',
            keyring: {
              type: 'HD Key Tree',
            },
            lastSelected: 1718130576954,
          },
        },
        [expectedId4]: {
          id: expectedId4,
          address: MOCK_LOWERCASE_ADDRESS_4,
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
          metadata: {
            name: 'Account 9',
            keyring: {
              type: 'HD Key Tree',
            },
            lastSelected: 1718130576955,
          },
        },
        [expectedId5]: {
          id: expectedId5,
          address: MOCK_LOWERCASE_ADDRESS_5,
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
          metadata: {
            name: 'Account 10',
            keyring: {
              type: 'HD Key Tree',
            },
            lastSelected: 1718130576956,
          },
        },
      },
      selectedAccount,
    },
  };
}

describe('Migration #044', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should merge duplicate accounts and update selected account correctly', () => {
    const oldState = {
      engine: {
        backgroundState: {
          AccountsController: createMockAccountsControllerState(),
        },
      },
    };
    expect(
      Object.keys(
        oldState.engine.backgroundState.AccountsController.internalAccounts
          .accounts,
      ).length,
    ).toBe(10);
    const newState = migrate(oldState) as typeof oldState;
    expect(
      Object.keys(
        newState.engine.backgroundState.AccountsController.internalAccounts
          .accounts,
      ).length,
    ).toBe(5);
    expect(newState).toStrictEqual({
      engine: {
        backgroundState: {
          AccountsController: {
            internalAccounts: {
              accounts: {
                [expectedId1]: {
                  address: '0xc5b2b5ae121314c0122910f92a13bef85a133e56',
                  id: expectedId1,
                  options: {},
                  metadata: {
                    name: 'Account 1',
                    keyring: { type: 'HD Key Tree' },
                    lastSelected: 1718130576952,
                  },
                  methods: [
                    EthMethod.PersonalSign,
                    EthMethod.Sign,
                    EthMethod.SignTransaction,
                    EthMethod.SignTypedDataV1,
                    EthMethod.SignTypedDataV3,
                    EthMethod.SignTypedDataV4,
                  ],
                  type: 'eip155:eoa',
                },
                [expectedId2]: {
                  address: '0x7564381891d774cf46ad422f28b75ab3364a7240',
                  id: expectedId2,
                  options: {},
                  metadata: {
                    name: 'Account 2',
                    keyring: { type: 'HD Key Tree' },
                    lastSelected: 1718130576953,
                  },
                  methods: [
                    EthMethod.PersonalSign,
                    EthMethod.Sign,
                    EthMethod.SignTransaction,
                    EthMethod.SignTypedDataV1,
                    EthMethod.SignTypedDataV3,
                    EthMethod.SignTypedDataV4,
                  ],
                  type: 'eip155:eoa',
                },
                [expectedId3]: {
                  address: '0x79821ea7ab5c5a34a24b2fd547c544ac15a7b121',
                  id: expectedId3,
                  options: {},
                  metadata: {
                    name: 'Account 3',
                    keyring: { type: 'HD Key Tree' },
                    lastSelected: 1718130576954,
                  },
                  methods: [
                    EthMethod.PersonalSign,
                    EthMethod.Sign,
                    EthMethod.SignTransaction,
                    EthMethod.SignTypedDataV1,
                    EthMethod.SignTypedDataV3,
                    EthMethod.SignTypedDataV4,
                  ],
                  type: 'eip155:eoa',
                },
                [expectedId4]: {
                  address: '0xdf8c7564f35274c5ba5c18f091407c8b1c29d7b1',
                  id: expectedId4,
                  options: {},
                  metadata: {
                    name: 'Account 4',
                    keyring: { type: 'HD Key Tree' },
                    lastSelected: 1718130576955,
                  },
                  methods: [
                    EthMethod.PersonalSign,
                    EthMethod.Sign,
                    EthMethod.SignTransaction,
                    EthMethod.SignTypedDataV1,
                    EthMethod.SignTypedDataV3,
                    EthMethod.SignTypedDataV4,
                  ],
                  type: 'eip155:eoa',
                },
                [expectedId5]: {
                  address: '0x9ac820e7e1d3b3d4ec9e0615893b6552479b9d52',
                  id: expectedId5,
                  options: {},
                  metadata: {
                    name: 'Account 5',
                    keyring: { type: 'HD Key Tree' },
                    lastSelected: 1718130576956,
                  },
                  methods: [
                    EthMethod.PersonalSign,
                    EthMethod.Sign,
                    EthMethod.SignTransaction,
                    EthMethod.SignTypedDataV1,
                    EthMethod.SignTypedDataV3,
                    EthMethod.SignTypedDataV4,
                  ],
                  type: 'eip155:eoa',
                },
              },
              selectedAccount: expectedId1,
            },
          },
        },
      },
    });
  });

  it('should capture exception if state is invalid', () => {
    const newState = migrate({});
    expect(newState).toStrictEqual({});
    expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
    expect(mockedCaptureException.mock.calls[0][0].message).toBe(
      `FATAL ERROR: Migration 44: Invalid engine state error: 'undefined'`,
    );
  });

  it('should capture exception if AccountsController data does not exist', () => {
    const oldState = {
      engine: {
        backgroundState: {},
      },
    };
    const newState = migrate(oldState);
    expect(newState).toStrictEqual({
      engine: {
        backgroundState: {},
      },
    });
    expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
    expect(mockedCaptureException.mock.calls[0][0].message).toBe(
      "Migration 44: Invalid AccountsController state: 'undefined'",
    );
  });

  it('should capture exception if AccountsController.internalAccounts data does not exist', () => {
    const oldState = {
      engine: {
        backgroundState: {
          AccountsController: {},
        },
      },
    };
    const newState = migrate(oldState);
    expect(newState).toStrictEqual({
      engine: {
        backgroundState: {
          AccountsController: {},
        },
      },
    });
    expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
    expect(mockedCaptureException.mock.calls[0][0].message).toBe(
      "Migration 44: Missing internalAccounts property from AccountsController: 'object'",
    );
  });

  it('should handle cases with no duplicates correctly', () => {
    const uniqueState: AccountsControllerState = {
      internalAccounts: {
        accounts: {
          unique1: {
            address: MOCK_LOWERCASE_ADDRESS_1,
            id: 'unique1',
            options: {},
            metadata: {
              name: 'Unique Account 1',
              keyring: {
                type: 'HD Key Tree',
              },
            },
            methods: [
              EthMethod.PersonalSign,
              EthMethod.Sign,
              EthMethod.SignTransaction,
              EthMethod.SignTypedDataV1,
              EthMethod.SignTypedDataV3,
              EthMethod.SignTypedDataV4,
            ],
            type: 'eip155:eoa',
          },
          unique2: {
            address: MOCK_LOWERCASE_ADDRESS_2,
            id: 'unique2',
            options: {},
            metadata: {
              name: 'Unique Account 2',
              keyring: {
                type: 'HD Key Tree',
              },
            },
            methods: [
              EthMethod.PersonalSign,
              EthMethod.Sign,
              EthMethod.SignTransaction,
              EthMethod.SignTypedDataV1,
              EthMethod.SignTypedDataV3,
              EthMethod.SignTypedDataV4,
            ],
            type: 'eip155:eoa',
          },
        },
        selectedAccount: 'unique1',
      },
    };

    const testState = {
      engine: {
        backgroundState: {
          AccountsController: uniqueState,
        },
      },
    };
    expect(
      Object.keys(
        testState.engine.backgroundState.AccountsController.internalAccounts
          .accounts,
      ).length,
    ).toBe(2);

    const newState = migrate(testState) as typeof testState;

    expect(
      Object.keys(
        newState.engine.backgroundState.AccountsController.internalAccounts
          .accounts,
      ).length,
    ).toBe(2);
    expect(newState).toStrictEqual(testState);
  });

  it('should update selected account to lowercase version if it was checksummed', () => {
    const oldState = {
      engine: {
        backgroundState: {
          AccountsController: {
            ...createMockAccountsControllerState('id5'),
          },
        },
      },
    };

    expect(
      Object.keys(
        oldState.engine.backgroundState.AccountsController.internalAccounts
          .accounts,
      ).length,
    ).toBe(10);

    const newState = migrate(oldState) as typeof oldState;

    expect(
      Object.keys(
        newState.engine.backgroundState.AccountsController.internalAccounts
          .accounts,
      ).length,
    ).toBe(5);

    expect(
      newState.engine.backgroundState.AccountsController.internalAccounts
        .selectedAccount,
    ).toBe(expectedId5);
  });
  it('should set the selected account to the first account if the previous selected account cannot be found', () => {
    const oldState = {
      engine: {
        backgroundState: {
          AccountsController: {
            ...createMockAccountsControllerState(),
            selectedAccount: 'non_existent_id',
          },
        },
      },
    };

    expect(
      Object.keys(
        oldState.engine.backgroundState.AccountsController.internalAccounts
          .accounts,
      ).length,
    ).toBe(10);

    const newState = migrate(oldState) as typeof oldState;

    expect(
      Object.keys(
        newState.engine.backgroundState.AccountsController.internalAccounts
          .accounts,
      ).length,
    ).toBe(5);

    expect(
      newState.engine.backgroundState.AccountsController.internalAccounts
        .selectedAccount,
    ).toBe(expectedId1);
  });
});
