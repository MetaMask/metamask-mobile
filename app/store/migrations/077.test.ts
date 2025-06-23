import { captureException } from '@sentry/react-native';
import { cloneDeep } from 'lodash';

import { ensureValidState } from './util';
import migrate from './077';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedCaptureException = jest.mocked(captureException);
const mockedEnsureValidState = jest.mocked(ensureValidState);

const createTestState = () => ({
  engine: {
    backgroundState: {
      KeyringController: {
        keyringsMetadata: [
          {
            id: 'some-id',
            name: 'some-name',
          },
        ],
        vault: 'some-vault',
      },
    },
  },
});

describe('Migration 77: Remove `KeyringController.keyringsMetadata`', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns state unchanged if ensureValidState fails', () => {
    const state = { some: 'state' };
    mockedEnsureValidState.mockReturnValue(false);

    const migratedState = migrate(state);

    expect(migratedState).toStrictEqual({ some: 'state' });
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('removes `KeyringController.keyringsMetadata` from state', () => {
    const oldState = createTestState();
    mockedEnsureValidState.mockReturnValue(true);
    const expectedData = {
      engine: {
        backgroundState: {
          KeyringController: {
            vault: 'some-vault',
          },
        },
      },
    };

    const migratedState = migrate(oldState);

    expect(migratedState).toStrictEqual(expectedData);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it.each([
    {
      state: {
        engine: {},
      },
      test: 'empty engine state',
    },
    {
      state: {
        engine: {
          backgroundState: {},
        },
      },
      test: 'empty backgroundState',
    },
    {
      state: {
        engine: {
          backgroundState: {
            KeyringController: 'invalid',
          },
        },
      },
      test: 'invalid KeyringController state',
    },
    {
      state: {
        engine: {
          backgroundState: {
            KeyringController: {},
          },
        },
      },
      test: 'absent `KeyringController.keyringsMetadata`',
    },
  ])('does not modify state if the state is invalid - $test', ({ state }) => {
    const orgState = cloneDeep(state);
    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state);

    // State should be unchanged
    expect(migratedState).toStrictEqual(orgState);
  });
});
