import migrate from './086';
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

const migrationVersion = 86;

describe(`Migration ${migrationVersion}: Remove Automatic Security Checks state`, () => {
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

  it('captures exception if security state is invalid', () => {
    const state = {
      engine: {
        backgroundState: {
          // security is missing
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state);

    expect(migratedState).toEqual(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
    expect(mockedCaptureException.mock.calls[0][0].message).toContain(
      `Migration ${migrationVersion}: Invalid security state`,
    );
  });

  it('removes automatic security checks properties while preserving other fields', () => {
    interface TestState {
      engine: {
        backgroundState: {
          OtherController: {
            shouldStayUntouched: boolean;
          };
        };
      };
      security: {
        automaticSecurityChecksEnabled: boolean;
        hasUserSelectedAutomaticSecurityCheckOption: boolean;
        isAutomaticSecurityChecksModalOpen: boolean;
        otherSecurityProperty: string;
      };
    }

    const state: TestState = {
      engine: {
        backgroundState: {
          OtherController: {
            shouldStayUntouched: true,
          },
        },
      },
      security: {
        automaticSecurityChecksEnabled: true,
        hasUserSelectedAutomaticSecurityCheckOption: false,
        isAutomaticSecurityChecksModalOpen: true,
        otherSecurityProperty: 'should remain',
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state) as typeof state;

    // Automatic security check properties should be removed
    expect(migratedState.security).not.toHaveProperty(
      'automaticSecurityChecksEnabled',
    );
    expect(migratedState.security).not.toHaveProperty(
      'hasUserSelectedAutomaticSecurityCheckOption',
    );
    expect(migratedState.security).not.toHaveProperty(
      'isAutomaticSecurityChecksModalOpen',
    );

    // Other security properties should remain unchanged
    expect(migratedState.security.otherSecurityProperty).toBe('should remain');

    // Other controllers should remain untouched
    expect(migratedState.engine.backgroundState.OtherController).toEqual({
      shouldStayUntouched: true,
    });

    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('handles state where some automatic security check properties are missing', () => {
    const state = {
      engine: {
        backgroundState: {},
      },
      security: {
        automaticSecurityChecksEnabled: true,
        // hasUserSelectedAutomaticSecurityCheckOption is missing
        // isAutomaticSecurityChecksModalOpen is missing
        otherSecurityProperty: 'should remain',
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state) as typeof state;

    // Should remove the existing property
    expect(migratedState.security).not.toHaveProperty(
      'automaticSecurityChecksEnabled',
    );

    // Other properties should remain
    expect(migratedState.security.otherSecurityProperty).toBe('should remain');

    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('handles state where no automatic security check properties exist', () => {
    const state = {
      engine: {
        backgroundState: {
          OtherController: {
            shouldStayUntouched: true,
          },
        },
      },
      security: {
        otherSecurityProperty: 'should remain',
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state) as typeof state;

    // Should not add any properties
    expect(migratedState.security).not.toHaveProperty(
      'automaticSecurityChecksEnabled',
    );
    expect(migratedState.security).not.toHaveProperty(
      'hasUserSelectedAutomaticSecurityCheckOption',
    );
    expect(migratedState.security).not.toHaveProperty(
      'isAutomaticSecurityChecksModalOpen',
    );

    // Other properties should remain
    expect(migratedState.security.otherSecurityProperty).toBe('should remain');

    expect(mockedCaptureException).not.toHaveBeenCalled();
  });
});
