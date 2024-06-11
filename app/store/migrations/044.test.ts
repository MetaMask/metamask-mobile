import migrate from './044';
import { captureException } from '@sentry/react-native';
import { AccountsControllerState } from '@metamask/accounts-controller';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));
const mockedCaptureException = jest.mocked(captureException);

const MOCK_ACCOUNTS_CONTROLLER_STATE: AccountsControllerState = {
  internalAccounts: {
    accounts: {
      '36303635-3364-4438-a465-343237356466': {
        address: '0xC5b2b5ae121314c0122910F92a13bef85A133E56',
        id: '36303635-3364-4438-a465-343237356466',
        options: {},
        metadata: {
          name: 'Account 1',
          keyring: {
            type: 'HD Key Tree',
          },
        },
        methods: [
          'personal_sign',
          'eth_sign',
          'eth_signTransaction',
          'eth_signTypedData_v1',
          'eth_signTypedData_v3',
          'eth_signTypedData_v4',
        ],
        type: 'eip155:eoa',
      },
      '32373935-6635-4438-a362-373162616561': {
        address: '0x7564381891d774CF46AD422F28B75Ab3364A7240',
        id: '32373935-6635-4438-a362-373162616561',
        options: {},
        metadata: {
          name: 'Account 2',
          keyring: {
            type: 'HD Key Tree',
          },
        },
        methods: [
          'personal_sign',
          'eth_sign',
          'eth_signTransaction',
          'eth_signTypedData_v1',
          'eth_signTypedData_v3',
          'eth_signTypedData_v4',
        ],
        type: 'eip155:eoa',
      },
      '62636536-6433-4633-b066-366662383063': {
        address: '0x79821Ea7aB5c5a34A24b2fd547c544ac15a7b121',
        id: '62636536-6433-4633-b066-366662383063',
        options: {},
        metadata: {
          name: 'Account 3',
          keyring: {
            type: 'HD Key Tree',
          },
        },
        methods: [
          'personal_sign',
          'eth_sign',
          'eth_signTransaction',
          'eth_signTypedData_v1',
          'eth_signTypedData_v3',
          'eth_signTypedData_v4',
        ],
        type: 'eip155:eoa',
      },
      '65353136-6138-4637-b432-616531313764': {
        address: '0xdf8C7564f35274c5Ba5c18f091407C8b1c29D7b1',
        id: '65353136-6138-4637-b432-616531313764',
        options: {},
        metadata: {
          name: 'Account 4',
          keyring: {
            type: 'HD Key Tree',
          },
        },
        methods: [
          'personal_sign',
          'eth_sign',
          'eth_signTransaction',
          'eth_signTypedData_v1',
          'eth_signTypedData_v3',
          'eth_signTypedData_v4',
        ],
        type: 'eip155:eoa',
      },
      '61306138-3032-4162-b132-323965616262': {
        address: '0x9ac820E7E1d3B3d4Ec9E0615893B6552479B9d52',
        id: '61306138-3032-4162-b132-323965616262',
        options: {},
        metadata: {
          name: 'Account 5',
          keyring: {
            type: 'HD Key Tree',
          },
        },
        methods: [
          'personal_sign',
          'eth_sign',
          'eth_signTransaction',
          'eth_signTypedData_v1',
          'eth_signTypedData_v3',
          'eth_signTypedData_v4',
        ],
        type: 'eip155:eoa',
      },
      '3b61f8b2-9a9a-4954-b8da-f829b9092ee7': {
        id: '3b61f8b2-9a9a-4954-b8da-f829b9092ee7',
        address: '0xc5b2b5ae121314c0122910f92a13bef85a133e56',
        options: {},
        methods: [
          'personal_sign',
          'eth_sign',
          'eth_signTransaction',
          'eth_signTypedData_v1',
          'eth_signTypedData_v3',
          'eth_signTypedData_v4',
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
        address: '0x7564381891d774cf46ad422f28b75ab3364a7240',
        options: {},
        methods: [
          'personal_sign',
          'eth_sign',
          'eth_signTransaction',
          'eth_signTypedData_v1',
          'eth_signTypedData_v3',
          'eth_signTypedData_v4',
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
        address: '0x79821ea7ab5c5a34a24b2fd547c544ac15a7b121',
        options: {},
        methods: [
          'personal_sign',
          'eth_sign',
          'eth_signTransaction',
          'eth_signTypedData_v1',
          'eth_signTypedData_v3',
          'eth_signTypedData_v4',
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
        address: '0xdf8c7564f35274c5ba5c18f091407c8b1c29d7b1',
        options: {},
        methods: [
          'personal_sign',
          'eth_sign',
          'eth_signTransaction',
          'eth_signTypedData_v1',
          'eth_signTypedData_v3',
          'eth_signTypedData_v4',
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
        address: '0x9ac820e7e1d3b3d4ec9e0615893b6552479b9d52',
        options: {},
        methods: [
          'personal_sign',
          'eth_sign',
          'eth_signTransaction',
          'eth_signTypedData_v1',
          'eth_signTypedData_v3',
          'eth_signTypedData_v4',
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

describe('Migration #041', () => {
  beforeEach(() => {
    mockedCaptureException.mockReset();
  });

  it('should merge duplicate accounts and update selected account correctly', async () => {
    const testState = {
      engine: {
        backgroundState: {
          AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
        },
      },
    };
    const newState = await migrate(testState);
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
                    'personal_sign',
                    'eth_sign',
                    'eth_signTransaction',
                    'eth_signTypedData_v1',
                    'eth_signTypedData_v3',
                    'eth_signTypedData_v4',
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
                    'personal_sign',
                    'eth_sign',
                    'eth_signTransaction',
                    'eth_signTypedData_v1',
                    'eth_signTypedData_v3',
                    'eth_signTypedData_v4',
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
                    'personal_sign',
                    'eth_sign',
                    'eth_signTransaction',
                    'eth_signTypedData_v1',
                    'eth_signTypedData_v3',
                    'eth_signTypedData_v4',
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
                    'personal_sign',
                    'eth_sign',
                    'eth_signTransaction',
                    'eth_signTypedData_v1',
                    'eth_signTypedData_v3',
                    'eth_signTypedData_v4',
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
                    'personal_sign',
                    'eth_sign',
                    'eth_signTransaction',
                    'eth_signTypedData_v1',
                    'eth_signTypedData_v3',
                    'eth_signTypedData_v4',
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

  it('should capture exception if state is invalid', async () => {
    const newState = await migrate({});
    expect(newState).toStrictEqual({});
    expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
    expect(mockedCaptureException.mock.calls[0][0].message).toBe(
      `FATAL ERROR: Migration 41: Invalid engine state error: 'undefined'`,
    );
  });
});
