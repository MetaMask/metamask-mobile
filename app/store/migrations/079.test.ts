import migrate from './079';
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

const migrationVersion = 79;

describe(`Migration ${migrationVersion}: Add sessionProperties property to CAIP-25 permission caveats`, () => {
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

  it('returns state unchanged if the subject is not an object', () => {
    const state = {
      engine: {
        backgroundState: {
          PermissionController: {
            subjects: {
              'test.com': 'foobar',
            },
          },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state);

    expect(migratedState).toEqual(state);
  });

  it('returns state unchanged if the subject is missing permissions', () => {
    const state = {
      engine: {
        backgroundState: {
          PermissionController: {
            subjects: {
              'test.com': {},
            },
          },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state);

    expect(migratedState).toEqual(state);
  });

  it('returns state unchanged if the subject permissions is not an object', () => {
    const state = {
      engine: {
        backgroundState: {
          PermissionController: {
            subjects: {
              'test.com': {
                permissions: 'foobar',
              },
            },
          },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state);

    expect(migratedState).toEqual(state);
  });

  it('returns state unchanged if there is no `endowment:caip25` permission', () => {
    const state = {
      engine: {
        backgroundState: {
          PermissionController: {
            subjects: {
              'test.com': {
                permissions: {},
              },
            },
          },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state);

    expect(migratedState).toEqual(state);
  });

  it('returns state unchanged if the `endowment:caip25` permission is not an object', () => {
    const state = {
      engine: {
        backgroundState: {
          PermissionController: {
            subjects: {
              'test.com': {
                permissions: {
                  'endowment:caip25': 'foobar',
                },
              },
            },
          },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state);

    expect(migratedState).toEqual(state);
  });

  it('returns state unchanged if the `endowment:caip25` permission caveats is not an array', () => {
    const state = {
      engine: {
        backgroundState: {
          PermissionController: {
            subjects: {
              'test.com': {
                permissions: {
                  'endowment:caip25': {
                    caveats: 'foobar',
                  },
                },
              },
            },
          },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state);

    expect(migratedState).toEqual(state);
  });

  it('returns the state with empty object sessionProperties added to the caip-25 permission if missing', () => {
    const state = {
      engine: {
        backgroundState: {
          PermissionController: {
            subjects: {
              'test.com': {
                permissions: {
                  'endowment:caip25': {
                    caveats: [
                      {
                        type: 'authorizedScopes',
                        value: {
                          requiredScopes: {},
                          optionalScopes: {},
                          isMultichainOrigin: true,
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
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state);

    expect(migratedState).toEqual({
      engine: {
        backgroundState: {
          PermissionController: {
            subjects: {
              'test.com': {
                permissions: {
                  'endowment:caip25': {
                    caveats: [
                      {
                        type: 'authorizedScopes',
                        value: {
                          requiredScopes: {},
                          optionalScopes: {},
                          isMultichainOrigin: true,
                          sessionProperties: {},
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

  it('returns the state with sessionProperties unchanged on the caip-25 permission if exists', () => {
    const state = {
      engine: {
        backgroundState: {
          PermissionController: {
            subjects: {
              'test.com': {
                permissions: {
                  'endowment:caip25': {
                    caveats: [
                      {
                        type: 'authorizedScopes',
                        value: {
                          requiredScopes: {},
                          optionalScopes: {},
                          isMultichainOrigin: true,
                          sessionProperties: {
                            foo: 'bar',
                          },
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
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state);

    expect(migratedState).toEqual({
      engine: {
        backgroundState: {
          PermissionController: {
            subjects: {
              'test.com': {
                permissions: {
                  'endowment:caip25': {
                    caveats: [
                      {
                        type: 'authorizedScopes',
                        value: {
                          requiredScopes: {},
                          optionalScopes: {},
                          isMultichainOrigin: true,
                          sessionProperties: {
                            foo: 'bar',
                          },
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
});
