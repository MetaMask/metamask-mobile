import migrate from './044';
import { captureException } from '@sentry/react-native';
import { AccountsControllerState } from '@metamask/accounts-controller';
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

const MOCK_ACCOUNTS_CONTROLLER_STATE: AccountsControllerState = {
  internalAccounts: {
    accounts: {
      '36303635-3364-4438-a465-343237356466': {
        address: toChecksumHexAddress(MOCK_LOWERCASE_ADDRESS_1),
        id: '36303635-3364-4438-a465-343237356466',
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
      '32373935-6635-4438-a362-373162616561': {
        address: toChecksumHexAddress(MOCK_LOWERCASE_ADDRESS_2),
        id: '32373935-6635-4438-a362-373162616561',
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
      '62636536-6433-4633-b066-366662383063': {
        address: toChecksumHexAddress(MOCK_LOWERCASE_ADDRESS_3),
        id: '62636536-6433-4633-b066-366662383063',
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
      '65353136-6138-4637-b432-616531313764': {
        address: toChecksumHexAddress(MOCK_LOWERCASE_ADDRESS_4),
        id: '65353136-6138-4637-b432-616531313764',
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
      '61306138-3032-4162-b132-323965616262': {
        address: toChecksumHexAddress(MOCK_LOWERCASE_ADDRESS_5),
        id: '61306138-3032-4162-b132-323965616262',
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
      '3b61f8b2-9a9a-4954-b8da-f829b9092ee7': {
        id: '3b61f8b2-9a9a-4954-b8da-f829b9092ee7',
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
      'd2e1a3b0-dedf-4fa5-85d0-aa4fedfb2b32': {
        id: 'd2e1a3b0-dedf-4fa5-85d0-aa4fedfb2b32',
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
      'c401e0e4-8c48-4406-8e6a-a5de2ffd998f': {
        id: 'c401e0e4-8c48-4406-8e6a-a5de2ffd998f',
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
      'd28b8763-ce68-4a71-91f1-85d6fb8187d6': {
        id: 'd28b8763-ce68-4a71-91f1-85d6fb8187d6',
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
      '43538253-4d95-4da4-adc0-9a256b0ffff9': {
        id: '43538253-4d95-4da4-adc0-9a256b0ffff9',
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
    selectedAccount: '36303635-3364-4438-a465-343237356466',
  },
};

describe('Migration #044', () => {
  beforeEach(() => {
    mockedCaptureException.mockReset();
  });

  it('should merge duplicate accounts and update selected account correctly', () => {
    const oldState = {
      engine: {
        backgroundState: {
          AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
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
                '36303635-3364-4438-a465-343237356466': {
                  address: '0xc5b2b5ae121314c0122910f92a13bef85a133e56',
                  id: '36303635-3364-4438-a465-343237356466',
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
                '32373935-6635-4438-a362-373162616561': {
                  address: '0x7564381891d774cf46ad422f28b75ab3364a7240',
                  id: '32373935-6635-4438-a362-373162616561',
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
                '62636536-6433-4633-b066-366662383063': {
                  address: '0x79821ea7ab5c5a34a24b2fd547c544ac15a7b121',
                  id: '62636536-6433-4633-b066-366662383063',
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
                '65353136-6138-4637-b432-616531313764': {
                  address: '0xdf8c7564f35274c5ba5c18f091407c8b1c29d7b1',
                  id: '65353136-6138-4637-b432-616531313764',
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
                '61306138-3032-4162-b132-323965616262': {
                  address: '0x9ac820e7e1d3b3d4ec9e0615893b6552479b9d52',
                  id: '61306138-3032-4162-b132-323965616262',
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
              selectedAccount: '36303635-3364-4438-a465-343237356466',
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
    const testState = {
      engine: {
        backgroundState: {
          AccountsController: {
            ...MOCK_ACCOUNTS_CONTROLLER_STATE,
            selectedAccount: '3b61f8b2-9a9a-4954-b8da-f829b9092ee7',
          },
        },
      },
    };
    const newState = migrate(testState) as typeof testState;

    expect(
      newState.engine.backgroundState.AccountsController.internalAccounts
        .selectedAccount,
    ).toBe('36303635-3364-4438-a465-343237356466');
  });
});
