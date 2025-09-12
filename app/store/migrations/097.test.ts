import migrate from './097';
import { ensureValidState } from './util';
import { captureException } from '@sentry/react-native';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedCaptureException = jest.mocked(captureException);
const mockedEnsureValidState = jest.mocked(ensureValidState);

const migrationVersion = 97;

describe(`Migration ${migrationVersion}: update hostname keyed PermissionController and SelectedNetworkController entries to origin`, () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns state unchanged if ensureValidState fails', () => {
    const state = { some: 'state' };

    mockedEnsureValidState.mockReturnValue(false);

    const migratedState = migrate(state);

    expect(migratedState).toBe(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('captures exception if PermissionController is missing', () => {
    const state = {
      engine: {
        backgroundState: {},
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state);

    expect(migratedState).toEqual(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
    expect(mockedCaptureException.mock.calls[0][0].message).toContain(
      `Migration ${migrationVersion}: typeof state.PermissionController is undefined`,
    );
  });

  it('captures exception if PermissionController is not object', () => {
    const state = {
      engine: {
        backgroundState: {
          PermissionController: 'foobar',
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state);

    expect(migratedState).toEqual(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
    expect(mockedCaptureException.mock.calls[0][0].message).toContain(
      `Migration ${migrationVersion}: typeof state.PermissionController is string`,
    );
  });

  it('captures exception if subjects is not object', () => {
    const state = {
      engine: {
        backgroundState: {
          PermissionController: {
            subjects: 'foobar',
          },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state);

    expect(migratedState).toEqual(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
    expect(mockedCaptureException.mock.calls[0][0].message).toContain(
      `Migration ${migrationVersion}: typeof state.PermissionController.subjects is string`,
    );
  });

  it('captures exception if SelectedNetworkController is missing', () => {
    const state = {
      engine: {
        backgroundState: {
          PermissionController: {
            subjects: {},
          },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state);

    expect(migratedState).toEqual(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
    expect(mockedCaptureException.mock.calls[0][0].message).toContain(
      `Migration ${migrationVersion}: typeof state.SelectedNetworkController is undefined`,
    );
  });

  it('captures exception if SelectedNetworkController is not object', () => {
    const state = {
      engine: {
        backgroundState: {
          PermissionController: {
            subjects: {},
          },
          SelectedNetworkController: 'foobar',
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state);

    expect(migratedState).toEqual(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
    expect(mockedCaptureException.mock.calls[0][0].message).toContain(
      `Migration ${migrationVersion}: typeof state.SelectedNetworkController is string`,
    );
  });

  it('captures exception if domains is not object', () => {
    const state = {
      engine: {
        backgroundState: {
          PermissionController: {
            subjects: {},
          },
          SelectedNetworkController: {
            domains: 'foobar',
          },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state);

    expect(migratedState).toEqual(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
    expect(mockedCaptureException.mock.calls[0][0].message).toContain(
      `Migration ${migrationVersion}: typeof state.SelectedNetworkController.domains is string`,
    );
  });

  it('skips malformed subjects', () => {
    const state = {
      engine: {
        backgroundState: {
          PermissionController: {
            subjects: {
              'test.com': 'foobar',
              'test.xyz': {
                permissions: 'foobar',
              },
            },
          },
          SelectedNetworkController: {
            domains: {},
          },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state);

    expect(migratedState).toEqual(state);
  });

  it('migrates PermissionController subjects that are valid hostname or "localhost" to https origin', () => {
    const state = {
      engine: {
        backgroundState: {
          PermissionController: {
            subjects: {
              localhost: {
                origin: 'localhost',
                permissions: {
                  test: {
                    id: 1,
                    invoker: 'localhost',
                    caveats: [
                      {
                        type: 'test-caveat',
                        value: 'hello',
                      },
                    ],
                  },
                },
              },
              'test.com': {
                origin: 'test.com',
                permissions: {
                  test: {
                    id: 2,
                    invoker: 'test.com',
                    caveats: [
                      {
                        type: 'test-caveat',
                        value: 'hello',
                      },
                    ],
                  },
                },
              },
            },
          },
          SelectedNetworkController: {
            domains: {},
          },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state);

    expect(migratedState).toEqual({
      engine: {
        backgroundState: {
          PermissionController: {
            subjects: {
              'https://localhost': {
                origin: 'https://localhost',
                permissions: {
                  test: {
                    id: 1,
                    invoker: 'https://localhost',
                    caveats: [
                      {
                        type: 'test-caveat',
                        value: 'hello',
                      },
                    ],
                  },
                },
              },
              'https://test.com': {
                origin: 'https://test.com',
                permissions: {
                  test: {
                    id: 2,
                    invoker: 'https://test.com',
                    caveats: [
                      {
                        type: 'test-caveat',
                        value: 'hello',
                      },
                    ],
                  },
                },
              },
            },
          },
          SelectedNetworkController: {
            domains: {},
          },
        },
      },
    });
  });

  it('does not migrate PermissionController subjects that are invalid hostnames, snaps, WalletConnect IDs, or MetaMask SDK IDs', () => {
    const state = {
      engine: {
        backgroundState: {
          PermissionController: {
            subjects: {
              nothostname: {
                origin: 'nothostname',
                permissions: {
                  test: {
                    id: 1,
                    invoker: 'nothostname',
                    caveats: [
                      {
                        type: 'test-caveat',
                        value: 'hello',
                      },
                    ],
                  },
                },
              },
              'npm:@metamask/snap': {
                origin: 'npm:@metamask/snap',
                permissions: {
                  test: {
                    id: 2,
                    invoker: 'npm:@metamask/snap',
                    caveats: [
                      {
                        type: 'test-caveat',
                        value: 'hello',
                      },
                    ],
                  },
                },
              },
              '217e651d-6d18-49ef-b929-8773496c11df': {
                origin: '217e651d-6d18-49ef-b929-8773496c11df',
                permissions: {
                  test: {
                    id: 3,
                    invoker: '217e651d-6d18-49ef-b929-8773496c11df',
                    caveats: [
                      {
                        type: 'test-caveat',
                        value: 'hello',
                      },
                    ],
                  },
                },
              },
              '901035548d5fae607be1f7ebff2aff0617b9d16fd0ad7b93e2e94647de06a07b':
                {
                  origin:
                    '901035548d5fae607be1f7ebff2aff0617b9d16fd0ad7b93e2e94647de06a07b',
                  permissions: {
                    test: {
                      id: 4,
                      invoker:
                        '901035548d5fae607be1f7ebff2aff0617b9d16fd0ad7b93e2e94647de06a07b',
                      caveats: [
                        {
                          type: 'test-caveat',
                          value: 'hello',
                        },
                      ],
                    },
                  },
                },
            },
          },
          SelectedNetworkController: {
            domains: {},
          },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state);

    expect(migratedState).toEqual(state);
  });

  it('migrates SelectedNetworkController entries that are valid hostname or "localhost" to https origin', () => {
    const state = {
      engine: {
        backgroundState: {
          PermissionController: {
            subjects: {},
          },
          SelectedNetworkController: {
            domains: {
              localhost: 'networkClientId1',
              'test.com': 'networkClientId2',
            },
          },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state);

    expect(migratedState).toEqual({
      engine: {
        backgroundState: {
          PermissionController: {
            subjects: {},
          },
          SelectedNetworkController: {
            domains: {
              'https://localhost': 'networkClientId1',
              'https://test.com': 'networkClientId2',
            },
          },
        },
      },
    });
  });

  it('does not migrate SelectedNetworkController entries that are invalid hostnames, snaps, WalletConnect IDs, or MetaMask SDK IDs', () => {
    const state = {
      engine: {
        backgroundState: {
          PermissionController: {
            subjects: {},
          },
          SelectedNetworkController: {
            domains: {
              nothostname: 'networkClientId1',
              'npm:@metamask/snap': 'networkClientId2',
              '217e651d-6d18-49ef-b929-8773496c11df': 'networkClientId3',
              '901035548d5fae607be1f7ebff2aff0617b9d16fd0ad7b93e2e94647de06a07b':
                'networkClientId4',
            },
          },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state);

    expect(migratedState).toEqual(state);
  });
});
