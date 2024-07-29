import migrate from './023';
import { merge } from 'lodash';
import initialRootState, {
  backgroundState,
} from '../../util/test/initial-root-state';
import { captureException } from '@sentry/react-native';
import { userInitialState } from '../../reducers/user';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));
const mockedCaptureException = jest.mocked(captureException);

describe('Migration #23', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  const invalidBackgroundStates = [
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: {
            NetworkController: null,
          },
        },
      }),
      errorMessage: "Migration 23: Invalid network controller state: 'object'",
      scenario: 'network controller state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: {
            NetworkController: { networkConfigurations: null },
          },
        },
      }),
      errorMessage:
        "Migration 23: Invalid network configuration state: 'object'",
      scenario: 'network configuration state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: {
            NetworkController: {
              networkConfigurations: { mockNetworkConfigurationId: {} },
            },
          },
        },
      }),
      errorMessage:
        "Migration 23: Network configuration missing chain ID, id 'mockNetworkConfigurationId', keys ''",
      scenario: 'network configuration has entry missing chain ID',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: {
            AddressBookController: null,
          },
        },
      }),
      errorMessage:
        "Migration 23: Invalid address book controller state: 'object'",
      scenario: 'address book controller state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: {
            AddressBookController: { addressBook: null },
          },
        },
      }),
      errorMessage: "Migration 23: Invalid address book state: 'object'",
      scenario: 'address book state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: {
            AddressBookController: { addressBook: { 1337: null } },
          },
        },
      }),
      errorMessage:
        "Migration 23: Address book configuration invalid, network id '1337', type 'object'",
      scenario: 'address book network entry is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: {
            AddressBookController: {
              addressBook: {
                1337: { '0x0000000000000000000000000000000000000001': {} },
              },
            },
          },
        },
      }),
      errorMessage:
        "Migration 23: Address book configuration entry missing chain ID, network id '1337', keys ''",
      scenario: 'address book entry missing chain ID',
    },
    {
      state: merge({}, initialRootState, {
        user: null,
      }),
      errorMessage: "Migration 23: Invalid user state: 'object'",
      scenario: 'user state is invalid',
    },
  ];

  for (const { errorMessage, scenario, state } of invalidBackgroundStates) {
    it(`should capture exception if ${scenario}`, () => {
      const newState = migrate(state);

      expect(newState).toStrictEqual(state);
      expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
      expect(mockedCaptureException.mock.calls[0][0].message).toBe(
        errorMessage,
      );
    });
  }

  it('should not change state if address book is empty', () => {
    const state = merge({}, initialRootState, {
      engine: {
        backgroundState: {
          AddressBookController: { addressBook: {} },
        },
      },
    });

    const newState = migrate(state);

    expect(newState).toStrictEqual(state);
  });

  it('should not change state if there are no ambiguous network IDs', () => {
    const state = merge({}, initialRootState, {
      engine: {
        backgroundState: {
          AddressBookController: {
            addressBook: {
              11155111: {
                '0x0000000000000000000000000000000000000001': {
                  address: '0x0000000000000000000000000000000000000001',
                  name: 'Mock',
                  chainId: '11155111',
                  memo: '',
                  isEns: false,
                },
              },
            },
          },
        },
      },
    });

    const newState = migrate(state);

    expect(newState).toStrictEqual(state);
  });

  it('should migrate ambiguous network IDs based on available networks configured locally', () => {
    const state = merge({}, initialRootState, {
      engine: {
        backgroundState: {
          AddressBookController: {
            addressBook: {
              // This is an ambiguous built-in network (other chains share this network ID)
              1: {
                '0x0000000000000000000000000000000000000001': {
                  address: '0x0000000000000000000000000000000000000001',
                  name: 'Mock1',
                  chainId: '1',
                  memo: '',
                  isEns: false,
                },
              },
              // This is an ambiguous custom network (other chains share this network ID)
              10: {
                '0x0000000000000000000000000000000000000002': {
                  address: '0x0000000000000000000000000000000000000002',
                  name: 'Mock2',
                  chainId: '10',
                  memo: '',
                  isEns: false,
                },
              },
            },
          },
          NetworkController: {
            networkConfigurations: {
              mockNetworkConfigurationId: {
                id: 'mockNetworkConfigurationId',
                rpcUrl: 'https://fake-url.metamask.io',
                // 2415 is the chain ID for a network with the network ID "10"
                chainId: '2415',
                ticker: 'ETH',
              },
            },
          },
        },
      },
    });

    const newState = migrate(state);

    expect(newState.user).toStrictEqual(userInitialState);
    expect(newState.engine.backgroundState).toStrictEqual(
      merge({}, backgroundState, {
        AddressBookController: {
          addressBook: {
            // This is unchanged because the only configured network with a network ID 1 also has
            // a chain ID of 1.
            1: {
              '0x0000000000000000000000000000000000000001': {
                address: '0x0000000000000000000000000000000000000001',
                name: 'Mock1',
                chainId: '1',
                memo: '',
                isEns: false,
              },
            },
            // This has been updated from 10 to 2415 according to the one configured local network
            // with a network ID of 2415
            2415: {
              '0x0000000000000000000000000000000000000002': {
                address: '0x0000000000000000000000000000000000000002',
                name: 'Mock2',
                chainId: '2415',
                memo: '',
                isEns: false,
              },
            },
          },
        },
        NetworkController: state.engine.backgroundState.NetworkController,
      }),
    );
  });

  it('should duplicate entries where multiple configured networks match network ID', () => {
    const state = merge({}, initialRootState, {
      engine: {
        backgroundState: {
          AddressBookController: {
            addressBook: {
              // This is an ambiguous built-in network (other chains share this network ID)
              1: {
                '0x0000000000000000000000000000000000000001': {
                  address: '0x0000000000000000000000000000000000000001',
                  name: 'Mock1',
                  chainId: '1',
                  memo: '',
                  isEns: false,
                },
              },
              // This is an ambiguous custom network (other chains share this network ID)
              10: {
                '0x0000000000000000000000000000000000000002': {
                  address: '0x0000000000000000000000000000000000000002',
                  name: 'Mock2',
                  chainId: '10',
                  memo: '',
                  isEns: false,
                },
              },
            },
          },
          NetworkController: {
            networkConfigurations: {
              mockNetworkConfigurationId1: {
                id: 'mockNetworkConfigurationId1',
                rpcUrl: 'https://fake-url1.metamask.io',
                // 10 is the chain ID for a network with the network ID "10"
                chainId: '10',
                ticker: 'ETH',
              },
              mockNetworkConfigurationId2: {
                id: 'mockNetworkConfigurationId2',
                rpcUrl: 'https://fake-url2.metamask.io',
                // 2415 is the chain ID for a network with the network ID "10"
                chainId: '2415',
                ticker: 'ETH',
              },
            },
          },
        },
      },
    });

    const newState = migrate(state);

    expect(newState.user).toStrictEqual(
      merge({}, userInitialState, {
        ambiguousAddressEntries: {
          10: ['0x0000000000000000000000000000000000000002'],
          2415: ['0x0000000000000000000000000000000000000002'],
        },
      }),
    );
    expect(newState.engine.backgroundState).toStrictEqual(
      merge({}, backgroundState, {
        AddressBookController: {
          addressBook: {
            // This is unchanged because the only configured network with a network ID 1 also has
            // a chain ID of 1.
            1: {
              '0x0000000000000000000000000000000000000001': {
                address: '0x0000000000000000000000000000000000000001',
                name: 'Mock1',
                chainId: '1',
                memo: '',
                isEns: false,
              },
            },
            // The entry for 10 has been duplicated across both locally configured networks that
            // have a matching network ID: 10 and 2415
            10: {
              '0x0000000000000000000000000000000000000002': {
                address: '0x0000000000000000000000000000000000000002',
                name: 'Mock2',
                chainId: '10',
                memo: '',
                isEns: false,
              },
            },
            2415: {
              '0x0000000000000000000000000000000000000002': {
                address: '0x0000000000000000000000000000000000000002',
                name: 'Mock2',
                chainId: '2415',
                memo: '',
                isEns: false,
              },
            },
          },
        },
        NetworkController: state.engine.backgroundState.NetworkController,
      }),
    );
  });

  it('should discard address book entries that do not match any configured networks', () => {
    const state = merge({}, initialRootState, {
      engine: {
        backgroundState: {
          AddressBookController: {
            addressBook: {
              // This is an ambiguous built-in network (other chains share this network ID)
              1: {
                '0x0000000000000000000000000000000000000001': {
                  address: '0x0000000000000000000000000000000000000001',
                  name: 'Mock1',
                  chainId: '1',
                  memo: '',
                  isEns: false,
                },
              },
              // This is an ambiguous custom network (other chains share this network ID)
              10: {
                '0x0000000000000000000000000000000000000002': {
                  address: '0x0000000000000000000000000000000000000002',
                  name: 'Mock2',
                  chainId: '10',
                  memo: '',
                  isEns: false,
                },
              },
            },
          },
          NetworkController: {
            networkConfigurations: {},
          },
        },
      },
    });

    const newState = migrate(state);

    expect(newState.user).toStrictEqual(userInitialState);
    expect(newState.engine.backgroundState).toStrictEqual(
      merge({}, backgroundState, {
        AddressBookController: {
          addressBook: {
            // This is unchanged because the only configured network with a network ID 1 also has
            // a chain ID of 1.
            1: {
              '0x0000000000000000000000000000000000000001': {
                address: '0x0000000000000000000000000000000000000001',
                name: 'Mock1',
                chainId: '1',
                memo: '',
                isEns: false,
              },
            },
            // The entry for 10 has been removed because it had no local matches
          },
        },
      }),
    );
  });
});
