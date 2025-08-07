import { captureException } from '@sentry/react-native';
import { ensureValidState } from './util';
import migrate from './084';
import { Duration, inMilliseconds } from '@metamask/utils';
import { SnapCaveatType, SnapEndowments } from '@metamask/snaps-rpc-methods';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

jest.useFakeTimers();
jest.setSystemTime(new Date('2023-10-01T00:00:00Z').getTime());

const mockedCaptureException = jest.mocked(captureException);
const mockedEnsureValidState = jest.mocked(ensureValidState);

const MOCK_SNAP_ID = 'npm:example-snap';
const MOCK_ORIGIN = 'http://example.com';

describe('Migration 084', () => {
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

  it('captures exception if the `CronjobController` state is not an object', () => {
    const state = {
      engine: {
        backgroundState: {
          CronjobController: false,
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state);

    expect(migratedState).toEqual(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
    expect(mockedCaptureException.mock.calls[0][0].message).toBe(
      'Migration 84: `CronjobController` state is not an object.',
    );
  });

  it('captures exception if the `PermissionController` state is invalid', () => {
    const state = {
      engine: {
        backgroundState: {
          CronjobController: {
            events: {},
            jobs: {},
          },

          // PermissionController is missing
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state);

    expect(migratedState).toEqual(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
    expect(mockedCaptureException.mock.calls[0][0].message).toBe(
      'Migration 84: `PermissionController` state not found or is not an object.',
    );
  });

  it("works if the state doesn't have an `events` property", async () => {
    mockedEnsureValidState.mockReturnValue(true);

    const oldState = {
      engine: {
        backgroundState: {
          CronjobController: {
            jobs: {
              [`${MOCK_SNAP_ID}-0`]: {
                lastRun: Date.now() - inMilliseconds(1, Duration.Day),
              },
              [`${MOCK_SNAP_ID}-1`]: {
                lastRun: Date.now() - inMilliseconds(1, Duration.Day),
              },
            },
          },

          PermissionController: {
            subjects: {
              [MOCK_SNAP_ID]: {
                origin: MOCK_SNAP_ID,
                permissions: {
                  [SnapEndowments.Cronjob]: {
                    caveats: [
                      {
                        type: SnapCaveatType.SnapCronjob,
                        value: {
                          jobs: [
                            {
                              expression: '*/30 * * * * *',
                              request: {
                                method: 'foo',
                                params: { bar: 'baz' },
                              },
                            },
                            {
                              expression: '0 0 0 * 11 *',
                              request: {
                                method: 'foo',
                                params: { bar: 'baz' },
                              },
                            },
                          ],
                        },
                      },
                    ],
                    date: 1664187844588,
                    id: 'izn0WGUO8cvq_jqvLQuQP',
                    invoker: MOCK_ORIGIN,
                    parentCapability: SnapEndowments.EthereumProvider,
                  },
                },
              },
            },
          },
        },
      },
    };

    const newState = await migrate(oldState);
    expect(newState).toStrictEqual({
      engine: {
        backgroundState: {
          CronjobController: {
            events: {
              [`cronjob-${MOCK_SNAP_ID}-0`]: {
                id: `cronjob-${MOCK_SNAP_ID}-0`,
                recurring: true,
                date: '2023-09-30T23:59:00.000Z',
                schedule: '*/30 * * * * *',
                scheduledAt: '2023-10-01T00:00:00.000Z',
                snapId: MOCK_SNAP_ID,
                request: {
                  method: 'foo',
                  params: { bar: 'baz' },
                },
              },
              [`cronjob-${MOCK_SNAP_ID}-1`]: {
                id: `cronjob-${MOCK_SNAP_ID}-1`,
                recurring: true,
                date: '2023-11-01T00:00:00.000Z',
                schedule: '0 0 0 * 11 *',
                scheduledAt: '2023-10-01T00:00:00.000Z',
                snapId: MOCK_SNAP_ID,
                request: {
                  method: 'foo',
                  params: { bar: 'baz' },
                },
              },
            },
          },

          PermissionController:
            oldState.engine.backgroundState.PermissionController,
        },
      },
    });
  });

  it('adds cronjobs to the `events` property and deletes the `jobs` property', async () => {
    mockedEnsureValidState.mockReturnValue(true);

    const oldState = {
      engine: {
        backgroundState: {
          CronjobController: {
            jobs: {
              [`${MOCK_SNAP_ID}-0`]: {
                lastRun: Date.now() - inMilliseconds(1, Duration.Day),
              },
              [`${MOCK_SNAP_ID}-1`]: {
                lastRun: Date.now() - inMilliseconds(1, Duration.Day),
              },
            },
            events: {},
          },

          PermissionController: {
            subjects: {
              [MOCK_SNAP_ID]: {
                origin: MOCK_SNAP_ID,
                permissions: {
                  [SnapEndowments.Cronjob]: {
                    caveats: [
                      {
                        type: SnapCaveatType.SnapCronjob,
                        value: {
                          jobs: [
                            {
                              expression: '*/30 * * * * *',
                              request: {
                                method: 'foo',
                                params: { bar: 'baz' },
                              },
                            },
                            {
                              expression: '0 0 0 * 11 *',
                              request: {
                                method: 'foo',
                                params: { bar: 'baz' },
                              },
                            },
                          ],
                        },
                      },
                    ],
                    date: 1664187844588,
                    id: 'izn0WGUO8cvq_jqvLQuQP',
                    invoker: MOCK_ORIGIN,
                    parentCapability: SnapEndowments.EthereumProvider,
                  },
                },
              },
            },
          },
        },
      },
    };

    const newState = await migrate(oldState);
    expect(newState).toStrictEqual({
      engine: {
        backgroundState: {
          CronjobController: {
            events: {
              [`cronjob-${MOCK_SNAP_ID}-0`]: {
                id: `cronjob-${MOCK_SNAP_ID}-0`,
                recurring: true,
                date: '2023-09-30T23:59:00.000Z',
                schedule: '*/30 * * * * *',
                scheduledAt: '2023-10-01T00:00:00.000Z',
                snapId: MOCK_SNAP_ID,
                request: {
                  method: 'foo',
                  params: { bar: 'baz' },
                },
              },
              [`cronjob-${MOCK_SNAP_ID}-1`]: {
                id: `cronjob-${MOCK_SNAP_ID}-1`,
                recurring: true,
                date: '2023-11-01T00:00:00.000Z',
                schedule: '0 0 0 * 11 *',
                scheduledAt: '2023-10-01T00:00:00.000Z',
                snapId: MOCK_SNAP_ID,
                request: {
                  method: 'foo',
                  params: { bar: 'baz' },
                },
              },
            },
          },

          PermissionController:
            oldState.engine.backgroundState.PermissionController,
        },
      },
    });
  });

  it('updates legacy events in the `events` property', async () => {
    mockedEnsureValidState.mockReturnValue(true);

    const oldState = {
      engine: {
        backgroundState: {
          CronjobController: {
            jobs: {},
            events: {
              foo: {
                id: 'foo',
                snapId: MOCK_SNAP_ID,
                date: '2023-09-30T23:59:00.000Z',
                scheduledAt: '2023-10-01T00:00:00.000Z',
                request: {
                  method: 'foo',
                  params: { bar: 'baz' },
                },
              },
            },
          },

          PermissionController: {
            subjects: {},
          },
        },
      },
    };

    const newState = await migrate(oldState);
    expect(newState).toStrictEqual({
      engine: {
        backgroundState: {
          CronjobController: {
            events: {
              foo: {
                id: 'foo',
                snapId: MOCK_SNAP_ID,
                date: '2023-09-30T23:59:00.000Z',
                scheduledAt: '2023-10-01T00:00:00.000Z',
                request: {
                  method: 'foo',
                  params: { bar: 'baz' },
                },
                recurring: false,
                schedule: '2023-09-30T23:59:00.000Z',
              },
            },
          },

          PermissionController:
            oldState.engine.backgroundState.PermissionController,
        },
      },
    });
  });

  it('combines legacy jobs and events into the `events` property', async () => {
    mockedEnsureValidState.mockReturnValue(true);

    const oldState = {
      engine: {
        backgroundState: {
          CronjobController: {
            jobs: {
              [`${MOCK_SNAP_ID}-0`]: {
                lastRun: Date.now() - inMilliseconds(1, Duration.Day),
              },
            },
            events: {
              foo: {
                id: 'foo',
                snapId: MOCK_SNAP_ID,
                date: '2023-09-30T23:59:00.000Z',
                scheduledAt: '2023-10-01T00:00:00.000Z',
                request: {
                  method: 'foo',
                  params: { bar: 'baz' },
                },
              },
            },
          },

          PermissionController: {
            subjects: {
              [MOCK_SNAP_ID]: {
                origin: MOCK_SNAP_ID,
                permissions: {
                  [SnapEndowments.Cronjob]: {
                    caveats: [
                      {
                        type: SnapCaveatType.SnapCronjob,
                        value: {
                          jobs: [
                            {
                              expression: '*/30 * * * * *',
                              request: {
                                method: 'foo',
                                params: { bar: 'baz' },
                              },
                            },
                          ],
                        },
                      },
                    ],
                    date: 1664187844588,
                    id: 'izn0WGUO8cvq_jqvLQuQP',
                    invoker: MOCK_ORIGIN,
                    parentCapability: SnapEndowments.EthereumProvider,
                  },
                },
              },
            },
          },
        },
      },
    };

    const newState = await migrate(oldState);
    expect(newState).toStrictEqual({
      engine: {
        backgroundState: {
          CronjobController: {
            events: {
              foo: {
                id: 'foo',
                snapId: MOCK_SNAP_ID,
                date: '2023-09-30T23:59:00.000Z',
                scheduledAt: '2023-10-01T00:00:00.000Z',
                request: {
                  method: 'foo',
                  params: { bar: 'baz' },
                },
                recurring: false,
                schedule: '2023-09-30T23:59:00.000Z',
              },
              [`cronjob-${MOCK_SNAP_ID}-0`]: {
                id: `cronjob-${MOCK_SNAP_ID}-0`,
                recurring: true,
                date: '2023-09-30T23:59:00.000Z',
                schedule: '*/30 * * * * *',
                scheduledAt: '2023-10-01T00:00:00.000Z',
                snapId: MOCK_SNAP_ID,
                request: {
                  method: 'foo',
                  params: { bar: 'baz' },
                },
              },
            },
          },

          PermissionController:
            oldState.engine.backgroundState.PermissionController,
        },
      },
    });
  });

  it('adds cronjobs to the `events` property and deletes the `jobs` property if the `CronjobController` state is `undefined`', async () => {
    mockedEnsureValidState.mockReturnValue(true);

    const oldState = {
      engine: {
        backgroundState: {
          PermissionController: {
            subjects: {
              [MOCK_SNAP_ID]: {
                origin: MOCK_SNAP_ID,
                permissions: {
                  [SnapEndowments.Cronjob]: {
                    caveats: [
                      {
                        type: SnapCaveatType.SnapCronjob,
                        value: {
                          jobs: [
                            {
                              expression: '*/30 * * * * *',
                              request: {
                                method: 'foo',
                                params: { bar: 'baz' },
                              },
                            },
                            {
                              expression: '0 0 0 * 11 *',
                              request: {
                                method: 'foo',
                                params: { bar: 'baz' },
                              },
                            },
                          ],
                        },
                      },
                    ],
                    date: 1664187844588,
                    id: 'izn0WGUO8cvq_jqvLQuQP',
                    invoker: MOCK_ORIGIN,
                    parentCapability: SnapEndowments.EthereumProvider,
                  },
                },
              },
            },
          },
        },
      },
    };

    const newState = await migrate(oldState);
    expect(newState).toStrictEqual({
      engine: {
        backgroundState: {
          CronjobController: {
            events: {
              [`cronjob-${MOCK_SNAP_ID}-0`]: {
                id: `cronjob-${MOCK_SNAP_ID}-0`,
                recurring: true,
                date: '2023-09-30T23:59:00.000Z',
                schedule: '*/30 * * * * *',
                scheduledAt: '2023-10-01T00:00:00.000Z',
                snapId: MOCK_SNAP_ID,
                request: {
                  method: 'foo',
                  params: { bar: 'baz' },
                },
              },
              [`cronjob-${MOCK_SNAP_ID}-1`]: {
                id: `cronjob-${MOCK_SNAP_ID}-1`,
                recurring: true,
                date: '2022-11-29T05:00:00.000Z',
                schedule: '0 0 0 * 11 *',
                scheduledAt: '2023-10-01T00:00:00.000Z',
                snapId: MOCK_SNAP_ID,
                request: {
                  method: 'foo',
                  params: { bar: 'baz' },
                },
              },
            },
          },

          PermissionController:
            oldState.engine.backgroundState.PermissionController,
        },
      },
    });
  });
});
