import migrate, { migrationVersion } from './115';
import { captureException } from '@sentry/react-native';
import { hasProperty } from '@metamask/utils';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('@metamask/utils', () => ({
  ...jest.requireActual('@metamask/utils'),
  hasProperty: jest.fn(),
}));

const mockHasProperty = hasProperty as jest.MockedFunction<typeof hasProperty>;

const mockCaptureException = captureException as jest.MockedFunction<
  typeof captureException
>;

describe(`Migration ${migrationVersion}`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default implementation: use the actual hasProperty function
    mockHasProperty.mockImplementation(
      jest.requireActual('@metamask/utils').hasProperty,
    );
  });

  it('returns state unchanged if state is invalid', () => {
    const invalidState = null;
    const result = migrate(invalidState);
    expect(result).toBe(invalidState);
  });

  it('returns state unchanged if engine is missing', () => {
    const invalidState = { foo: 'bar' };
    const result = migrate(invalidState);
    expect(result).toStrictEqual(invalidState);
  });

  it('returns state unchanged if backgroundState is missing', () => {
    const state = { engine: {} };
    const result = migrate(state);
    expect(result).toStrictEqual(state);
  });

  it('returns state unchanged and captures exception if TokenListController is missing', () => {
    const state = {
      engine: {
        backgroundState: {},
      },
    };
    const result = migrate(state);
    expect(result).toStrictEqual(state);
    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('missing TokenListController'),
      }),
    );
  });

  it('returns state unchanged and captures exception if TokenListController is not an object', () => {
    const state = {
      engine: {
        backgroundState: {
          TokenListController: 'invalid-string',
        },
      },
    };
    const result = migrate(state);
    expect(result).toStrictEqual(state);
    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(
          "Invalid TokenListController state: 'string'",
        ),
      }),
    );
  });

  it('removes preventPollingOnNetworkRestart from TokenListController', () => {
    const state = {
      engine: {
        backgroundState: {
          TokenListController: {
            tokensChainsCache: {},
            preventPollingOnNetworkRestart: true,
          },
        },
      },
    };

    const result = migrate(state) as typeof state;

    expect(result.engine.backgroundState.TokenListController).toStrictEqual({
      tokensChainsCache: {},
    });
    expect(
      result.engine.backgroundState.TokenListController,
    ).not.toHaveProperty('preventPollingOnNetworkRestart');
  });

  it('handles state without preventPollingOnNetworkRestart gracefully', () => {
    const state = {
      engine: {
        backgroundState: {
          TokenListController: {
            tokensChainsCache: {},
          },
        },
      },
    };

    const result = migrate(state);

    expect(result).toStrictEqual(state);
  });

  it('captures exception on error and returns state unchanged', () => {
    const state = {
      engine: {
        backgroundState: {
          TokenListController: {},
        },
      },
    };

    const actualHasProperty = jest.requireActual('@metamask/utils').hasProperty;

    // Allow the first two calls (in ensureValidState) to succeed,
    // then throw on the third call (first call in the try block)
    mockHasProperty
      .mockImplementationOnce(actualHasProperty) // ensureValidState: check for 'engine'
      .mockImplementationOnce(actualHasProperty) // ensureValidState: check for 'backgroundState'
      .mockImplementationOnce(() => {
        throw new Error('Test error');
      });

    const result = migrate(state);

    // State should be returned unchanged (migration catches the error)
    expect(result).toStrictEqual(state);
    // Verify the error was captured
    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Migration 115 failed'),
      }),
    );
  });
});
