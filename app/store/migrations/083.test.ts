import migrate from './083';
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

describe('Migration 083: Remove Automatic Security Checks state', () => {
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

  it('captures exception if engine state is invalid', () => {
    const state = { invalidState: true };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state);

    expect(migratedState).toEqual(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
    expect(mockedCaptureException.mock.calls[0][0].message).toContain(
      'Migration 083: Invalid engine state structure',
    );
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
      'Migration 083: Invalid security state',
    );
  });

  it('removes automatic security checks properties while preserving other fields', () => {
    interface TestState {
      engine: {
        backgroundState: {
          security: {
            automaticSecurityChecksEnabled: boolean;
            hasUserSelectedAutomaticSecurityCheckOption: boolean;
            isAutomaticSecurityChecksModalOpen: boolean;
            otherSecurityProperty: string;
          };
          OtherController: {
            shouldStayUntouched: boolean;
          };
        };
      };
    }

    const state: TestState = {
      engine: {
        backgroundState: {
          security: {
            automaticSecurityChecksEnabled: true,
            hasUserSelectedAutomaticSecurityCheckOption: false,
            isAutomaticSecurityChecksModalOpen: true,
            otherSecurityProperty: 'should remain',
          },
          OtherController: {
            shouldStayUntouched: true,
          },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state) as typeof state;

    // Automatic security check properties should be removed
    expect(migratedState.engine.backgroundState.security).not.toHaveProperty(
      'automaticSecurityChecksEnabled',
    );
    expect(migratedState.engine.backgroundState.security).not.toHaveProperty(
      'hasUserSelectedAutomaticSecurityCheckOption',
    );
    expect(migratedState.engine.backgroundState.security).not.toHaveProperty(
      'isAutomaticSecurityChecksModalOpen',
    );

    // Other security properties should remain unchanged
    expect(
      migratedState.engine.backgroundState.security.otherSecurityProperty,
    ).toBe('should remain');

    // Other controllers should remain untouched
    expect(migratedState.engine.backgroundState.OtherController).toEqual({
      shouldStayUntouched: true,
    });

    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('handles state where some automatic security check properties are missing', () => {
    const state = {
      engine: {
        backgroundState: {
          security: {
            automaticSecurityChecksEnabled: true,
            // hasUserSelectedAutomaticSecurityCheckOption is missing
            // isAutomaticSecurityChecksModalOpen is missing
            otherSecurityProperty: 'should remain',
          },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state) as typeof state;

    // Should remove the existing property
    expect(migratedState.engine.backgroundState.security).not.toHaveProperty(
      'automaticSecurityChecksEnabled',
    );

    // Other properties should remain
    expect(
      migratedState.engine.backgroundState.security.otherSecurityProperty,
    ).toBe('should remain');

    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('handles state where no automatic security check properties exist', () => {
    const state = {
      engine: {
        backgroundState: {
          security: {
            otherSecurityProperty: 'should remain',
          },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state) as typeof state;

    // Should not add any properties
    expect(migratedState.engine.backgroundState.security).not.toHaveProperty(
      'automaticSecurityChecksEnabled',
    );
    expect(migratedState.engine.backgroundState.security).not.toHaveProperty(
      'hasUserSelectedAutomaticSecurityCheckOption',
    );
    expect(migratedState.engine.backgroundState.security).not.toHaveProperty(
      'isAutomaticSecurityChecksModalOpen',
    );

    // Other properties should remain
    expect(
      migratedState.engine.backgroundState.security.otherSecurityProperty,
    ).toBe('should remain');

    expect(mockedCaptureException).not.toHaveBeenCalled();
  });
});
