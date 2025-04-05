import migrate from './071';
import { captureException } from '@sentry/react-native';
import { ensureValidState } from './util';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedCaptureException = jest.mocked(captureException);
const mockedEnsureValidState = jest.mocked(ensureValidState);

const PermissionNames = {
  eth_accounts: 'eth_accounts',
  permittedChains: 'endowment:permitted-chains',
};

const version = 71;

describe('Migration: transform "eth_accounts" and "endowment:permitted-chains" into "endowment:caip25"', () => {
  beforeEach(() => {
    mockedEnsureValidState.mockReturnValue(true);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('returns state unchanged if ensureValidState fails', () => {
    const state = { some: 'state' };
    mockedEnsureValidState.mockReturnValue(false);

    const migratedState = migrate(state);

    expect(migratedState).toBe(state);
  });

  it('does nothing if PermissionController state is missing', () => {
    const oldStorage = {
      engine: {
        backgroundState: {
          NetworkController: {},
          SelectedNetworkController: {},
        },
      },
    };

    const newStorage = migrate(oldStorage);

    expect(newStorage).toStrictEqual(oldStorage);
  });

  it('does nothing if PermissionController state is not an object', () => {
    const oldStorage = {
      engine: {
        backgroundState: {
          PermissionController: 'foo',
          NetworkController: {},
          SelectedNetworkController: {},
        },
      },
    };
    mockedEnsureValidState.mockReturnValue(true);

    const newStorage = migrate(oldStorage);

    expect(mockedCaptureException).toHaveBeenCalledWith(
      new Error(
        `Migration ${version}: typeof state.PermissionController is string`,
      ),
    );
    expect(newStorage).toStrictEqual(oldStorage);
  });

  it('does nothing if NetworkController state is missing', () => {
    const oldStorage = {
      engine: {
        backgroundState: {
          PermissionController: {},
          SelectedNetworkController: {},
        },
      },
    };

    const newStorage = migrate(oldStorage);

    expect(mockedCaptureException).toHaveBeenCalledWith(
      new Error(
        `Migration ${version}: typeof state.NetworkController is undefined`,
      ),
    );
    expect(newStorage).toStrictEqual(oldStorage);
  });

  it('does nothing if NetworkController state is not an object', () => {
    const oldStorage = {
      engine: {
        backgroundState: {
          PermissionController: {},
          NetworkController: 'foo',
          SelectedNetworkController: {},
        },
      },
    };

    const newStorage = migrate(oldStorage);

    expect(mockedCaptureException).toHaveBeenCalledWith(
      new Error(
        `Migration ${version}: typeof state.NetworkController is string`,
      ),
    );
    expect(newStorage).toStrictEqual(oldStorage);
  });

  it('does nothing if SelectedNetworkController state is not an object', () => {
    const oldStorage = {
      engine: {
        backgroundState: {
          PermissionController: {},
          NetworkController: {},
          SelectedNetworkController: 'foo',
        },
      },
    };

    const newStorage = migrate(oldStorage);

    expect(mockedCaptureException).toHaveBeenCalledWith(
      new Error(
        `Migration ${version}: typeof state.SelectedNetworkController is string`,
      ),
    );
    expect(newStorage).toStrictEqual(oldStorage);
  });

  it('does nothing if PermissionController.subjects is not an object', () => {
    const oldStorage = {
      engine: {
        backgroundState: {
          PermissionController: {
            subjects: 'foo',
          },
          NetworkController: {},
          SelectedNetworkController: {},
        },
      },
    };

    const newStorage = migrate(oldStorage);

    expect(mockedCaptureException).toHaveBeenCalledWith(
      new Error(
        `Migration ${version}: typeof state.PermissionController.subjects is string`,
      ),
    );
    expect(newStorage).toStrictEqual(oldStorage);
  });

  it('does nothing if NetworkController.selectedNetworkClientId is not a non-empty string', () => {
    const oldStorage = {
      engine: {
        backgroundState: {
          PermissionController: {
            subjects: {},
          },
          NetworkController: {
            selectedNetworkClientId: {},
          },
          SelectedNetworkController: {},
        },
      },
    };

    const newStorage = migrate(oldStorage);

    expect(mockedCaptureException).toHaveBeenCalledWith(
      new Error(
        `Migration ${version}: typeof state.NetworkController.selectedNetworkClientId is object`,
      ),
    );
    expect(newStorage).toStrictEqual(oldStorage);
  });

  it('does nothing if NetworkController.networkConfigurationsByChainId is not an object', () => {
    const oldStorage = {
      engine: {
        backgroundState: {
          PermissionController: {
            subjects: {},
          },
          NetworkController: {
            selectedNetworkClientId: 'mainnet',
            networkConfigurationsByChainId: 'foo',
          },
          SelectedNetworkController: {},
        },
      },
    };

    const newStorage = migrate(oldStorage);

    expect(mockedCaptureException).toHaveBeenCalledWith(
      new Error(
        `Migration ${version}: typeof state.NetworkController.networkConfigurationsByChainId is string`,
      ),
    );
    expect(newStorage).toStrictEqual(oldStorage);
  });

  it('does nothing if SelectedNetworkController.domains is not an object', () => {
    const oldStorage = {
      engine: {
        backgroundState: {
          PermissionController: {
            subjects: {},
          },
          NetworkController: {
            selectedNetworkClientId: 'mainnet',
            networkConfigurationsByChainId: {},
          },
          SelectedNetworkController: {
            domains: 'foo',
          },
        },
      },
    };

    const newStorage = migrate(oldStorage);

    expect(mockedCaptureException).toHaveBeenCalledWith(
      new Error(
        `Migration ${version}: typeof state.SelectedNetworkController.domains is string`,
      ),
    );
    expect(newStorage).toStrictEqual(oldStorage);
  });

  it('does nothing if NetworkController.networkConfigurationsByChainId[] is not an object', () => {
    const oldStorage = {
      engine: {
        backgroundState: {
          PermissionController: {
            subjects: {},
          },
          NetworkController: {
            selectedNetworkClientId: 'nonExistentNetworkClientId',
            networkConfigurationsByChainId: {
              '0x1': 'foo',
            },
          },
          SelectedNetworkController: {
            domains: {},
          },
        },
      },
    };

    const newStorage = migrate(oldStorage);

    expect(mockedCaptureException).toHaveBeenCalledWith(
      new Error(
        `Migration ${version}: typeof state.NetworkController.networkConfigurationsByChainId["0x1"] is string`,
      ),
    );
    expect(newStorage).toStrictEqual(oldStorage);
  });

  it('does nothing if NetworkController.networkConfigurationsByChainId[].rpcEndpoints is not an array', () => {
    const oldStorage = {
      engine: {
        backgroundState: {
          PermissionController: {
            subjects: {},
          },
          NetworkController: {
            selectedNetworkClientId: 'nonExistentNetworkClientId',
            networkConfigurationsByChainId: {
              '0x1': {
                rpcEndpoints: 'foo',
              },
            },
          },
          SelectedNetworkController: {
            domains: {},
          },
        },
      },
    };

    const newStorage = migrate(oldStorage);

    expect(mockedCaptureException).toHaveBeenCalledWith(
      new Error(
        `Migration ${version}: typeof state.NetworkController.networkConfigurationsByChainId["0x1"].rpcEndpoints is string`,
      ),
    );
    expect(newStorage).toStrictEqual(oldStorage);
  });

  it('does nothing if NetworkController.networkConfigurationsByChainId[].rpcEndpoints[] is not an object', () => {
    const oldStorage = {
      engine: {
        backgroundState: {
          PermissionController: {
            subjects: {},
          },
          NetworkController: {
            selectedNetworkClientId: 'nonExistentNetworkClientId',
            networkConfigurationsByChainId: {
              '0x1': {
                rpcEndpoints: ['foo'],
              },
            },
          },
          SelectedNetworkController: {
            domains: {},
          },
        },
      },
    };

    const newStorage = migrate(oldStorage);

    expect(mockedCaptureException).toHaveBeenCalledWith(
      new Error(
        `Migration ${version}: typeof state.NetworkController.networkConfigurationsByChainId["0x1"].rpcEndpoints[] is string`,
      ),
    );
    expect(newStorage).toStrictEqual(oldStorage);
  });

  it('does nothing if the currently selected network client is neither built in nor exists in NetworkController.networkConfigurationsByChainId', () => {
    const oldStorage = {
      engine: {
        backgroundState: {
          PermissionController: {
            subjects: {},
          },
          NetworkController: {
            selectedNetworkClientId: 'nonExistentNetworkClientId',
            networkConfigurationsByChainId: {},
          },
          SelectedNetworkController: {
            domains: {},
          },
        },
      },
    };

    const newStorage = migrate(oldStorage);

    expect(mockedCaptureException).toHaveBeenCalledWith(
      new Error(
        `Migration ${version}: No chainId found for selectedNetworkClientId "nonExistentNetworkClientId"`,
      ),
    );
    expect(newStorage).toStrictEqual(oldStorage);
  });

  it('does nothing if a subject is not an object', () => {
    const oldStorage = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'mainnet',
            networkConfigurationsByChainId: {},
          },
          SelectedNetworkController: {
            domains: {},
          },
          PermissionController: {
            subjects: {
              'test.com': 'foo',
            },
          },
        },
      },
    };

    const newStorage = migrate(oldStorage);

    expect(mockedCaptureException).toHaveBeenCalledWith(
      new Error(
        `Migration ${version}: Invalid subject for origin "test.com" of type string`,
      ),
    );
    expect(newStorage).toStrictEqual(oldStorage);
  });

  it("does nothing if a subject's permissions is not an object", () => {
    const oldStorage = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'mainnet',
            networkConfigurationsByChainId: {},
          },
          SelectedNetworkController: {
            domains: {},
          },
          PermissionController: {
            subjects: {
              'test.com': {
                permissions: 'foo',
              },
            },
          },
        },
      },
    };

    const newStorage = migrate(oldStorage);

    expect(mockedCaptureException).toHaveBeenCalledWith(
      new Error(
        `Migration ${version}: Invalid permissions for origin "test.com" of type string`,
      ),
    );
    expect(newStorage).toStrictEqual(oldStorage);
  });

  it('deletes the permittedChains permission if eth_accounts has not been granted and the permittedChains permissions has been granted', () => {
    const oldStorage = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'mainnet',
            networkConfigurationsByChainId: {},
          },
          SelectedNetworkController: {
            domains: {},
          },
          PermissionController: {
            subjects: {
              'test.com': {
                permissions: {
                  [PermissionNames.permittedChains]: {
                    invoker: 'test.com',
                    parentCapability: PermissionNames.permittedChains,
                    date: 2,
                    caveats: [
                      {
                        type: 'restrictNetworkSwitching',
                        value: ['0xa', '0x64'],
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
    };

    const newStorage = migrate(oldStorage);
    expect(newStorage).toStrictEqual({
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'mainnet',
            networkConfigurationsByChainId: {},
          },
          SelectedNetworkController: {
            domains: {},
          },
          PermissionController: {
            subjects: {
              'test.com': {
                permissions: {},
              },
            },
          },
        },
      },
    });
  });

  it('does nothing if neither eth_accounts nor permittedChains permissions have been granted', () => {
    const oldStorage = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'mainnet',
            networkConfigurationsByChainId: {},
          },
          SelectedNetworkController: {
            domains: {},
          },
          PermissionController: {
            subjects: {
              'test.com': {
                permissions: {
                  unrelated: {
                    foo: 'bar',
                  },
                },
              },
            },
          },
        },
      },
    };

    const newStorage = migrate(oldStorage);
    expect(newStorage).toStrictEqual({
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'mainnet',
            networkConfigurationsByChainId: {},
          },
          SelectedNetworkController: {
            domains: {},
          },
          PermissionController: {
            subjects: {
              'test.com': {
                permissions: {
                  unrelated: {
                    foo: 'bar',
                  },
                },
              },
            },
          },
        },
      },
    });
  });

  describe.each([
    [
      'built-in',
      {
        selectedNetworkClientId: 'mainnet',
        networkConfigurationsByChainId: {},
      },
      '1',
    ],
    [
      'custom',
      {
        selectedNetworkClientId: 'customId',
        networkConfigurationsByChainId: {
          '0xf': {
            rpcEndpoints: [
              {
                networkClientId: 'customId',
              },
            ],
          },
        },
      },
      '15',
    ],
  ])(
    'the currently selected network client is %s',
    (
      _type: string,
      NetworkController: {
        networkConfigurationsByChainId: Record<
          string,
          {
            rpcEndpoints: { networkClientId: string }[];
          }
        >;
      } & Record<string, unknown>,
      chainId: string,
    ) => {
      const baseData = () => ({
        PermissionController: {
          subjects: {},
        },
        NetworkController,
        SelectedNetworkController: {
          domains: {},
        },
      });
      const baseEthAccountsPermissionMetadata = {
        id: '1',
        date: 2,
        invoker: 'test.com',
        parentCapability: PermissionNames.eth_accounts,
      };
      const currentScope = `eip155:${chainId}`;

      it('does nothing when eth_accounts and permittedChains permissions are missing metadata', () => {
        const oldStorage = {
          engine: {
            backgroundState: {
              ...baseData(),
              PermissionController: {
                subjects: {
                  'test.com': {
                    permissions: {
                      unrelated: {
                        foo: 'bar',
                      },
                      [PermissionNames.eth_accounts]: {
                        invoker: 'test.com',
                        parentCapability: PermissionNames.eth_accounts,
                        date: 2,
                        caveats: [
                          {
                            type: 'restrictReturnedAccounts',
                            value: ['0xdeadbeef', '0x999'],
                          },
                        ],
                      },
                      [PermissionNames.permittedChains]: {
                        invoker: 'test.com',
                        parentCapability: PermissionNames.permittedChains,
                        date: 2,
                        caveats: [
                          {
                            type: 'restrictNetworkSwitching',
                            value: ['0xa', '0x64'],
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
        };

        const newStorage = migrate(oldStorage);
        expect(newStorage).toStrictEqual(oldStorage);
      });

      it('does nothing when there are malformed network configurations (even if there is a valid networkConfiguration that matches the selected network client)', () => {
        const oldStorage = {
          engine: {
            backgroundState: {
              ...baseData(),
              NetworkController: {
                selectedNetworkClientId: 'mainnet',
                networkConfigurationsByChainId: {
                  '0x1': {
                    rpcEndpoints: [
                      {
                        networkClientId: 'mainnet',
                      },
                    ],
                  },
                  '0xInvalid': 'invalid-network-configuration',
                  '0xa': {
                    rpcEndpoints: [
                      {
                        networkClientId: 'bar',
                      },
                    ],
                  },
                },
              },
              SelectedNetworkController: {
                domains: {
                  'test.com': 'bar',
                },
              },
              PermissionController: {
                subjects: {
                  'test.com': {
                    permissions: {
                      unrelated: {
                        foo: 'bar',
                      },
                      [PermissionNames.eth_accounts]: {
                        ...baseEthAccountsPermissionMetadata,
                        caveats: [
                          {
                            type: 'restrictReturnedAccounts',
                            value: ['0xdeadbeef', '0x999'],
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
        };

        const newStorage = migrate(oldStorage);
        expect(newStorage).toStrictEqual(oldStorage);
      });

      it('replaces the eth_accounts permission with a CAIP-25 permission using the eth_accounts value for the currently selected chain id when the origin does not have its own network client', () => {
        const oldStorage = {
          engine: {
            backgroundState: {
              ...baseData(),
              PermissionController: {
                subjects: {
                  'test.com': {
                    permissions: {
                      unrelated: {
                        foo: 'bar',
                      },
                      [PermissionNames.eth_accounts]: {
                        ...baseEthAccountsPermissionMetadata,
                        caveats: [
                          {
                            type: 'restrictReturnedAccounts',
                            value: ['0xdeadbeef', '0x999'],
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
        };

        const newStorage = migrate(oldStorage);
        expect(newStorage).toStrictEqual({
          engine: {
            backgroundState: {
              ...baseData(),
              PermissionController: {
                subjects: {
                  'test.com': {
                    permissions: {
                      unrelated: {
                        foo: 'bar',
                      },
                      'endowment:caip25': {
                        ...baseEthAccountsPermissionMetadata,
                        parentCapability: 'endowment:caip25',
                        caveats: [
                          {
                            type: 'authorizedScopes',
                            value: {
                              requiredScopes: {},
                              optionalScopes: {
                                [currentScope]: {
                                  accounts: [
                                    `${currentScope}:0xdeadbeef`,
                                    `${currentScope}:0x999`,
                                  ],
                                },
                                'wallet:eip155': {
                                  accounts: [
                                    'wallet:eip155:0xdeadbeef',
                                    'wallet:eip155:0x999',
                                  ],
                                },
                              },
                              isMultichainOrigin: false,
                            },
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
        });
      });

      it('replaces the eth_accounts permission with a CAIP-25 permission using the globally selected chain id value for the currently selected chain id when the origin does have its own network client that cannot be resolved', () => {
        const oldStorage = {
          engine: {
            backgroundState: {
              ...baseData(),
              SelectedNetworkController: {
                domains: {
                  'test.com': 'doesNotExist',
                },
              },
              PermissionController: {
                subjects: {
                  'test.com': {
                    permissions: {
                      unrelated: {
                        foo: 'bar',
                      },
                      [PermissionNames.eth_accounts]: {
                        ...baseEthAccountsPermissionMetadata,
                        caveats: [
                          {
                            type: 'restrictReturnedAccounts',
                            value: ['0xdeadbeef', '0x999'],
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
        };

        const newStorage = migrate(oldStorage);

        expect(mockedCaptureException).toHaveBeenCalledWith(
          new Error(
            `Migration ${version}: No chainId found for networkClientIdForOrigin "doesNotExist"`,
          ),
        );

        expect(newStorage).toStrictEqual({
          engine: {
            backgroundState: {
              ...baseData(),
              SelectedNetworkController: {
                domains: {
                  'test.com': 'doesNotExist',
                },
              },
              PermissionController: {
                subjects: {
                  'test.com': {
                    permissions: {
                      unrelated: {
                        foo: 'bar',
                      },
                      'endowment:caip25': {
                        ...baseEthAccountsPermissionMetadata,
                        parentCapability: 'endowment:caip25',
                        caveats: [
                          {
                            type: 'authorizedScopes',
                            value: {
                              requiredScopes: {},
                              optionalScopes: {
                                [currentScope]: {
                                  accounts: [
                                    `${currentScope}:0xdeadbeef`,
                                    `${currentScope}:0x999`,
                                  ],
                                },
                                'wallet:eip155': {
                                  accounts: [
                                    'wallet:eip155:0xdeadbeef',
                                    'wallet:eip155:0x999',
                                  ],
                                },
                              },
                              isMultichainOrigin: false,
                            },
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
        });
      });

      it('replaces the eth_accounts permission with a CAIP-25 permission using the eth_accounts value for the origin chain id when the origin does have its own network client and it exists in the built-in networks', () => {
        const oldStorage = {
          engine: {
            backgroundState: {
              ...baseData(),
              SelectedNetworkController: {
                domains: {
                  'test.com': 'sepolia',
                },
              },
              PermissionController: {
                subjects: {
                  'test.com': {
                    permissions: {
                      unrelated: {
                        foo: 'bar',
                      },
                      [PermissionNames.eth_accounts]: {
                        ...baseEthAccountsPermissionMetadata,
                        caveats: [
                          {
                            type: 'restrictReturnedAccounts',
                            value: ['0xdeadbeef', '0x999'],
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
        };

        const newStorage = migrate(oldStorage);
        expect(newStorage).toStrictEqual({
          engine: {
            backgroundState: {
              ...baseData(),
              SelectedNetworkController: {
                domains: {
                  'test.com': 'sepolia',
                },
              },
              PermissionController: {
                subjects: {
                  'test.com': {
                    permissions: {
                      unrelated: {
                        foo: 'bar',
                      },
                      'endowment:caip25': {
                        ...baseEthAccountsPermissionMetadata,
                        parentCapability: 'endowment:caip25',
                        caveats: [
                          {
                            type: 'authorizedScopes',
                            value: {
                              requiredScopes: {},
                              optionalScopes: {
                                'eip155:11155111': {
                                  accounts: [
                                    'eip155:11155111:0xdeadbeef',
                                    'eip155:11155111:0x999',
                                  ],
                                },
                                'wallet:eip155': {
                                  accounts: [
                                    'wallet:eip155:0xdeadbeef',
                                    'wallet:eip155:0x999',
                                  ],
                                },
                              },
                              isMultichainOrigin: false,
                            },
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
        });
      });

      it('replaces the eth_accounts permission with a CAIP-25 permission using the eth_accounts value without permitted chains when the origin is snapId', () => {
        const oldStorage = {
          engine: {
            backgroundState: {
              ...baseData(),
              PermissionController: {
                subjects: {
                  'npm:snap': {
                    permissions: {
                      unrelated: {
                        foo: 'bar',
                      },
                      [PermissionNames.eth_accounts]: {
                        ...baseEthAccountsPermissionMetadata,
                        caveats: [
                          {
                            type: 'restrictReturnedAccounts',
                            value: ['0xdeadbeef', '0x999'],
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
        };

        const newStorage = migrate(oldStorage);
        expect(newStorage).toStrictEqual({
          engine: {
            backgroundState: {
              ...baseData(),
              PermissionController: {
                subjects: {
                  'npm:snap': {
                    permissions: {
                      unrelated: {
                        foo: 'bar',
                      },
                      'endowment:caip25': {
                        ...baseEthAccountsPermissionMetadata,
                        parentCapability: 'endowment:caip25',
                        caveats: [
                          {
                            type: 'authorizedScopes',
                            value: {
                              requiredScopes: {},
                              optionalScopes: {
                                'wallet:eip155': {
                                  accounts: [
                                    'wallet:eip155:0xdeadbeef',
                                    'wallet:eip155:0x999',
                                  ],
                                },
                              },
                              isMultichainOrigin: false,
                            },
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
        });
      });

      it('replaces the eth_accounts permission with a CAIP-25 permission using the eth_accounts value for the origin chain id when the origin does have its own network client and it exists in the custom configurations', () => {
        const oldStorage = {
          engine: {
            backgroundState: {
              ...baseData(),
              NetworkController: {
                ...baseData().NetworkController,
                networkConfigurationsByChainId: {
                  ...baseData().NetworkController
                    .networkConfigurationsByChainId,
                  '0xa': {
                    rpcEndpoints: [
                      {
                        networkClientId: 'customNetworkClientId',
                      },
                    ],
                  },
                },
              },
              SelectedNetworkController: {
                domains: {
                  'test.com': 'customNetworkClientId',
                },
              },
              PermissionController: {
                subjects: {
                  'test.com': {
                    permissions: {
                      unrelated: {
                        foo: 'bar',
                      },
                      [PermissionNames.eth_accounts]: {
                        ...baseEthAccountsPermissionMetadata,
                        caveats: [
                          {
                            type: 'restrictReturnedAccounts',
                            value: ['0xdeadbeef', '0x999'],
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
        };

        const newStorage = migrate(oldStorage);
        expect(newStorage).toStrictEqual({
          engine: {
            backgroundState: {
              ...baseData(),
              NetworkController: {
                ...baseData().NetworkController,
                networkConfigurationsByChainId: {
                  ...baseData().NetworkController
                    .networkConfigurationsByChainId,
                  '0xa': {
                    rpcEndpoints: [
                      {
                        networkClientId: 'customNetworkClientId',
                      },
                    ],
                  },
                },
              },
              SelectedNetworkController: {
                domains: {
                  'test.com': 'customNetworkClientId',
                },
              },
              PermissionController: {
                subjects: {
                  'test.com': {
                    permissions: {
                      unrelated: {
                        foo: 'bar',
                      },
                      'endowment:caip25': {
                        ...baseEthAccountsPermissionMetadata,
                        parentCapability: 'endowment:caip25',
                        caveats: [
                          {
                            type: 'authorizedScopes',
                            value: {
                              requiredScopes: {},
                              optionalScopes: {
                                'eip155:10': {
                                  accounts: [
                                    'eip155:10:0xdeadbeef',
                                    'eip155:10:0x999',
                                  ],
                                },
                                'wallet:eip155': {
                                  accounts: [
                                    'wallet:eip155:0xdeadbeef',
                                    'wallet:eip155:0x999',
                                  ],
                                },
                              },
                              isMultichainOrigin: false,
                            },
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
        });
      });

      it('does not create a CAIP-25 permission when eth_accounts permission is missing', () => {
        const oldStorage = {
          engine: {
            backgroundState: {
              ...baseData(),
              PermissionController: {
                subjects: {
                  'test.com': {
                    permissions: {
                      unrelated: {
                        foo: 'bar',
                      },
                      [PermissionNames.permittedChains]: {
                        ...baseEthAccountsPermissionMetadata,
                        caveats: [
                          {
                            type: 'restrictNetworkSwitching',
                            value: ['0xa', '0x64'],
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
        };

        const newStorage = migrate(oldStorage);
        expect(newStorage).toStrictEqual({
          engine: {
            backgroundState: {
              ...baseData(),
              PermissionController: {
                subjects: {
                  'test.com': {
                    permissions: {
                      unrelated: {
                        foo: 'bar',
                      },
                    },
                  },
                },
              },
            },
          },
        });
      });

      it('replaces both eth_accounts and permittedChains permission with a CAIP-25 permission using the values from both permissions', () => {
        const oldStorage = {
          engine: {
            backgroundState: {
              ...baseData(),
              PermissionController: {
                subjects: {
                  'test.com': {
                    permissions: {
                      unrelated: {
                        foo: 'bar',
                      },
                      [PermissionNames.eth_accounts]: {
                        ...baseEthAccountsPermissionMetadata,
                        caveats: [
                          {
                            type: 'restrictReturnedAccounts',
                            value: ['0xdeadbeef', '0x999'],
                          },
                        ],
                      },
                      [PermissionNames.permittedChains]: {
                        ...baseEthAccountsPermissionMetadata,
                        caveats: [
                          {
                            type: 'restrictNetworkSwitching',
                            value: ['0xa', '0x64'],
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
        };

        const newStorage = migrate(oldStorage);
        expect(newStorage).toStrictEqual({
          engine: {
            backgroundState: {
              ...baseData(),
              PermissionController: {
                subjects: {
                  'test.com': {
                    permissions: {
                      unrelated: {
                        foo: 'bar',
                      },
                      'endowment:caip25': {
                        ...baseEthAccountsPermissionMetadata,
                        parentCapability: 'endowment:caip25',
                        caveats: [
                          {
                            type: 'authorizedScopes',
                            value: {
                              requiredScopes: {},
                              optionalScopes: {
                                'eip155:10': {
                                  accounts: [
                                    'eip155:10:0xdeadbeef',
                                    'eip155:10:0x999',
                                  ],
                                },
                                'eip155:100': {
                                  accounts: [
                                    'eip155:100:0xdeadbeef',
                                    'eip155:100:0x999',
                                  ],
                                },
                                'wallet:eip155': {
                                  accounts: [
                                    'wallet:eip155:0xdeadbeef',
                                    'wallet:eip155:0x999',
                                  ],
                                },
                              },
                              isMultichainOrigin: false,
                            },
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
        });
      });

      it('replaces permissions for each subject', () => {
        const oldStorage = {
          engine: {
            backgroundState: {
              ...baseData(),
              PermissionController: {
                subjects: {
                  'test.com': {
                    permissions: {
                      [PermissionNames.eth_accounts]: {
                        ...baseEthAccountsPermissionMetadata,
                        caveats: [
                          {
                            type: 'restrictReturnedAccounts',
                            value: ['0xdeadbeef'],
                          },
                        ],
                      },
                    },
                  },
                  'test2.com': {
                    permissions: {
                      [PermissionNames.eth_accounts]: {
                        ...baseEthAccountsPermissionMetadata,
                        caveats: [
                          {
                            type: 'restrictReturnedAccounts',
                            value: ['0xdeadbeef'],
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
        };

        const newStorage = migrate(oldStorage);
        expect(newStorage).toStrictEqual({
          engine: {
            backgroundState: {
              ...baseData(),
              PermissionController: {
                subjects: {
                  'test.com': {
                    permissions: {
                      'endowment:caip25': {
                        ...baseEthAccountsPermissionMetadata,
                        parentCapability: 'endowment:caip25',
                        caveats: [
                          {
                            type: 'authorizedScopes',
                            value: {
                              requiredScopes: {},
                              optionalScopes: {
                                [currentScope]: {
                                  accounts: [`${currentScope}:0xdeadbeef`],
                                },
                                'wallet:eip155': {
                                  accounts: ['wallet:eip155:0xdeadbeef'],
                                },
                              },
                              isMultichainOrigin: false,
                            },
                          },
                        ],
                      },
                    },
                  },
                  'test2.com': {
                    permissions: {
                      'endowment:caip25': {
                        ...baseEthAccountsPermissionMetadata,
                        parentCapability: 'endowment:caip25',
                        caveats: [
                          {
                            type: 'authorizedScopes',
                            value: {
                              requiredScopes: {},
                              optionalScopes: {
                                [currentScope]: {
                                  accounts: [`${currentScope}:0xdeadbeef`],
                                },
                                'wallet:eip155': {
                                  accounts: ['wallet:eip155:0xdeadbeef'],
                                },
                              },
                              isMultichainOrigin: false,
                            },
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
        });
      });
    },
  );
});
