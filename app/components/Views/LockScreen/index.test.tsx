import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import {
  DeepPartial,
  renderScreen,
} from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import Routes from '../../../constants/navigation/Routes';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import { RootState } from '../../../reducers';

// Type definitions for better type safety
interface MockNavigation {
  dispatch: jest.Mock;
}

interface MockRoute {
  params: {
    bioStateMachineId?: string;
  };
}

interface MockAppState {
  currentState: AppStateStatus;
  addEventListener: jest.MockedFunction<
    (
      event: string,
      handler: (state: AppStateStatus) => void,
    ) => NativeEventSubscription
  >;
}

// Create a properly typed mock for AppState
const mockAppState: MockAppState = {
  currentState: 'active',
  addEventListener: jest.fn(),
};

// Mock react-native first
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');

  // Create a more explicit mock
  const MockedAppState = {
    currentState: 'active', // This will be overridden in tests
    addEventListener: jest.fn(() => ({
      remove: jest.fn(),
    })),
  };

  return {
    ...RN,
    AppState: MockedAppState,
  };
});

// Import AppState and types after mocking
import {
  AppState,
  NativeEventSubscription,
  AppStateStatus,
} from 'react-native';

// Mock other dependencies
jest.mock('../../../core', () => ({
  Authentication: {
    appTriggeredAuth: jest.fn(),
    lockApp: jest.fn(),
  },
}));

jest.mock('../../../util/Logger', () => ({
  log: jest.fn(),
}));

jest.mock('../../../util/metrics/TrackError/trackErrorAsAnalytics', () =>
  jest.fn(),
);

// Import components after mocks
import LockScreenWrapper from './';
import { Authentication } from '../../../core';
import Logger from '../../../util/Logger';
import trackErrorAsAnalytics from '../../../util/metrics/TrackError/trackErrorAsAnalytics';

// We need to access the inner LockScreen component for direct testing
// Since the file exports the wrapper, we'll need to test through the wrapper

const mockInitialState: DeepPartial<RootState> = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      PreferencesController: {
        securityAlertsEnabled: true,
      },
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

const mockNavigation: MockNavigation = {
  dispatch: jest.fn(),
};

const mockRoute: MockRoute = {
  params: {
    bioStateMachineId: 'test-bio-id-123',
  },
};

describe('LockScreen', () => {
  let mockAppTriggeredAuth: jest.MockedFunction<
    typeof Authentication.appTriggeredAuth
  >;
  let mockLockApp: jest.MockedFunction<typeof Authentication.lockApp>;
  let mockAddEventListener: jest.MockedFunction<
    (
      event: string,
      handler: (state: AppStateStatus) => void,
    ) => NativeEventSubscription
  >;
  let mockRemoveEventListener: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAppTriggeredAuth =
      Authentication.appTriggeredAuth as jest.MockedFunction<
        typeof Authentication.appTriggeredAuth
      >;
    mockLockApp = Authentication.lockApp as jest.MockedFunction<
      typeof Authentication.lockApp
    >;
    mockAddEventListener = AppState.addEventListener as jest.MockedFunction<
      (
        event: string,
        handler: (state: AppStateStatus) => void,
      ) => NativeEventSubscription
    >;
    mockRemoveEventListener = jest.fn();

    const mockEventSubscription: NativeEventSubscription = {
      remove: mockRemoveEventListener,
    };
    mockAddEventListener.mockReturnValue(mockEventSubscription);

    mockAppTriggeredAuth.mockResolvedValue();
  });

  it('should render correctly', () => {
    const { toJSON } = renderScreen(
      LockScreenWrapper,
      { name: Routes.LOCK_SCREEN },
      { state: mockInitialState },
      { bioStateMachineId: 'test-bio-id' },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  describe('componentDidMount behavior', () => {
    it('triggers biometrics immediately when app is already active', async () => {
      // Arrange - Set AppState to active
      AppState.currentState = 'active';

      // Act
      render(
        <LockScreenWrapper navigation={mockNavigation} route={mockRoute} />,
      );

      // Give it some time to process
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Assert - Since our mock AppState shows 'active', componentDidMount should call unlockKeychain
      expect(mockAppTriggeredAuth).toHaveBeenCalledWith({
        bioStateMachineId: 'test-bio-id-123',
        disableAutoLogout: true,
      });
    });

    it('sets up AppState event listener on mount', () => {
      // Act
      render(
        <LockScreenWrapper navigation={mockNavigation} route={mockRoute} />,
      );

      // Assert
      expect(mockAddEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function),
      );
    });
  });

  describe('authentication success scenarios', () => {
    it('logs success message when authentication succeeds on mount', async () => {
      // Arrange
      mockAppState.currentState = 'active';
      mockAppTriggeredAuth.mockResolvedValue();

      // Act
      render(
        <LockScreenWrapper navigation={mockNavigation} route={mockRoute} />,
      );

      // Assert
      await waitFor(() => {
        expect(Logger.log).toHaveBeenCalledWith(
          'Lockscreen::unlockKeychain - authentication successful',
        );
      });
    });

    it('passes correct bioStateMachineId to authentication', async () => {
      // Arrange
      mockAppState.currentState = 'active';
      const customBioId = 'custom-bio-id-456';

      // Act
      render(
        <LockScreenWrapper
          navigation={mockNavigation}
          route={{ params: { bioStateMachineId: customBioId } }}
        />,
      );

      // Assert
      await waitFor(() => {
        expect(mockAppTriggeredAuth).toHaveBeenCalledWith({
          bioStateMachineId: customBioId,
          disableAutoLogout: true,
        });
      });
    });
  });

  describe('authentication failure scenarios', () => {
    it('handles authentication failure and locks app', async () => {
      // Arrange
      mockAppState.currentState = 'active';
      const authError = new Error('Biometric authentication failed');
      mockAppTriggeredAuth.mockRejectedValue(authError);

      // Act
      render(
        <LockScreenWrapper navigation={mockNavigation} route={mockRoute} />,
      );

      // Assert
      await waitFor(() => {
        expect(mockNavigation.dispatch).toHaveBeenCalled();
        expect(mockLockApp).toHaveBeenCalledWith({ reset: false });
        expect(trackErrorAsAnalytics).toHaveBeenCalledWith(
          'Lockscreen: Authentication failed',
          'Biometric authentication failed',
        );
      });
    });

    it('handles authentication failure with undefined error message', async () => {
      // Arrange
      mockAppState.currentState = 'active';
      const authError = new Error();
      // Intentionally set message to undefined to test edge case
      (authError as { message?: string }).message = undefined;
      mockAppTriggeredAuth.mockRejectedValue(authError);

      // Act
      render(
        <LockScreenWrapper navigation={mockNavigation} route={mockRoute} />,
      );

      // Assert
      await waitFor(() => {
        expect(trackErrorAsAnalytics).toHaveBeenCalledWith(
          'Lockscreen: Authentication failed',
          undefined,
        );
      });
    });

    it('handles non-Error objects thrown during authentication', async () => {
      // Arrange
      mockAppState.currentState = 'active';
      mockAppTriggeredAuth.mockRejectedValue('String error');

      // Act
      render(
        <LockScreenWrapper navigation={mockNavigation} route={mockRoute} />,
      );

      // Assert
      await waitFor(() => {
        expect(mockNavigation.dispatch).toHaveBeenCalled();
        expect(mockLockApp).toHaveBeenCalledWith({ reset: false });
      });
    });
  });

  describe('AppState change handling', () => {
    it('triggers biometrics when AppState changes to active', async () => {
      // Arrange
      mockAppState.currentState = 'inactive';
      let appStateChangeHandler:
        | ((nextAppState: AppStateStatus) => void)
        | undefined;
      mockAddEventListener.mockImplementation((_event, handler) => {
        appStateChangeHandler = handler;
        const mockEventSubscription: NativeEventSubscription = {
          remove: mockRemoveEventListener,
        };
        return mockEventSubscription;
      });

      render(
        <LockScreenWrapper navigation={mockNavigation} route={mockRoute} />,
      );

      // Act - Simulate app state change to active
      if (appStateChangeHandler) {
        appStateChangeHandler('active');
      }

      // Assert
      await waitFor(() => {
        expect(mockAppTriggeredAuth).toHaveBeenCalledWith({
          bioStateMachineId: 'test-bio-id-123',
          disableAutoLogout: true,
        });
      });
    });

    it('removes event listener when app becomes active via state change', async () => {
      // Arrange
      mockAppState.currentState = 'inactive';
      let appStateChangeHandler:
        | ((nextAppState: AppStateStatus) => void)
        | undefined;
      mockAddEventListener.mockImplementation((_event, handler) => {
        appStateChangeHandler = handler;
        const mockEventSubscription: NativeEventSubscription = {
          remove: mockRemoveEventListener,
        };
        return mockEventSubscription;
      });

      render(
        <LockScreenWrapper navigation={mockNavigation} route={mockRoute} />,
      );

      // Act
      if (appStateChangeHandler) {
        appStateChangeHandler('active');
      }

      // Assert
      await waitFor(() => {
        expect(mockRemoveEventListener).toHaveBeenCalled();
      });
    });

    it('does not trigger biometrics for non-active state changes', async () => {
      // Arrange
      mockAppState.currentState = 'active';
      let appStateChangeHandler:
        | ((nextAppState: AppStateStatus) => void)
        | undefined;
      mockAddEventListener.mockImplementation((_event, handler) => {
        appStateChangeHandler = handler;
        const mockEventSubscription: NativeEventSubscription = {
          remove: mockRemoveEventListener,
        };
        return mockEventSubscription;
      });

      render(
        <LockScreenWrapper navigation={mockNavigation} route={mockRoute} />,
      );

      // Clear the mount-triggered auth call
      jest.clearAllMocks();

      // Act - Simulate app state changes to non-active states
      if (appStateChangeHandler) {
        appStateChangeHandler('inactive');
        appStateChangeHandler('background');
      }

      // Assert
      expect(mockAppTriggeredAuth).not.toHaveBeenCalled();
    });
  });

  describe('component lifecycle edge cases', () => {
    it('removes event listener on unmount', () => {
      // Arrange
      const { unmount } = render(
        <LockScreenWrapper navigation={mockNavigation} route={mockRoute} />,
      );

      // Act
      unmount();

      // Assert
      expect(mockRemoveEventListener).toHaveBeenCalled();
    });

    it('handles unmount when event listener is null', () => {
      // Arrange
      mockAddEventListener.mockReturnValue(
        null as unknown as NativeEventSubscription,
      );
      const { unmount } = render(
        <LockScreenWrapper navigation={mockNavigation} route={mockRoute} />,
      );

      // Act & Assert - Should not throw
      expect(() => unmount()).not.toThrow();
    });

    it('handles missing bioStateMachineId gracefully', async () => {
      // Arrange
      mockAppState.currentState = 'active';
      const routeWithoutBioId: MockRoute = { params: {} };

      // Act
      render(
        <LockScreenWrapper
          navigation={mockNavigation}
          route={routeWithoutBioId}
        />,
      );

      // Assert - Should still attempt authentication with undefined bioStateMachineId
      await waitFor(() => {
        expect(mockAppTriggeredAuth).toHaveBeenCalledWith({
          bioStateMachineId: undefined,
          disableAutoLogout: true,
        });
      });
    });
  });

  describe('race condition scenarios', () => {
    it('handles rapid mount and AppState change', async () => {
      // Arrange - Component mounts when app is active
      mockAppState.currentState = 'active';
      let appStateChangeHandler:
        | ((nextAppState: AppStateStatus) => void)
        | undefined;
      mockAddEventListener.mockImplementation((_event, handler) => {
        appStateChangeHandler = handler;
        const mockEventSubscription: NativeEventSubscription = {
          remove: mockRemoveEventListener,
        };
        return mockEventSubscription;
      });

      render(
        <LockScreenWrapper navigation={mockNavigation} route={mockRoute} />,
      );

      // Act - Immediately trigger another state change to active
      if (appStateChangeHandler) {
        appStateChangeHandler('active');
      }

      // Assert - Authentication should be called (mount + state change)
      // The saga system and SecureKeychain.isAuthenticating should handle concurrent calls
      await waitFor(() => {
        expect(mockAppTriggeredAuth).toHaveBeenCalled();
      });
    });

    it('handles authentication failure during component unmount', async () => {
      // Arrange
      mockAppState.currentState = 'active';
      let authReject: ((error: Error) => void) | undefined;
      mockAppTriggeredAuth.mockImplementation(
        () =>
          new Promise((_, reject) => {
            authReject = reject;
          }),
      );

      const { unmount } = render(
        <LockScreenWrapper navigation={mockNavigation} route={mockRoute} />,
      );

      // Act - Unmount while authentication is pending
      unmount();
      if (authReject) {
        authReject(new Error('Authentication failed after unmount'));
      }

      // Assert - Should not crash or cause memory leaks
      expect(mockRemoveEventListener).toHaveBeenCalled();
    });
  });

  describe('integration with saga system', () => {
    it('uses bioStateMachineId for saga coordination', async () => {
      // Arrange
      mockAppState.currentState = 'active';
      const specificBioId = 'saga-coordination-test-id';

      // Act
      render(
        <LockScreenWrapper
          navigation={mockNavigation}
          route={{ params: { bioStateMachineId: specificBioId } }}
        />,
      );

      // Assert - Verify the bioStateMachineId is passed correctly for saga coordination
      await waitFor(() => {
        expect(mockAppTriggeredAuth).toHaveBeenCalledWith({
          bioStateMachineId: specificBioId,
          disableAutoLogout: true,
        });
      });
    });

    it('enables disableAutoLogout for proper saga handling', async () => {
      // Arrange
      mockAppState.currentState = 'active';

      // Act
      render(
        <LockScreenWrapper navigation={mockNavigation} route={mockRoute} />,
      );

      // Assert - Verify disableAutoLogout is always true
      await waitFor(() => {
        expect(mockAppTriggeredAuth).toHaveBeenCalledWith(
          expect.objectContaining({
            disableAutoLogout: true,
          }),
        );
      });
    });
  });
});
