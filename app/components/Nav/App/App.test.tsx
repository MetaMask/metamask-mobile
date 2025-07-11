import React from 'react';
import {
  DeepPartial,
  renderScreen,
} from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import App from '.';
import { MetaMetrics } from '../../../core/Analytics';
import { cleanup, render, waitFor } from '@testing-library/react-native';
import { RootState } from '../../../reducers';
import StorageWrapper from '../../../store/storage-wrapper';
import { Authentication } from '../../../core';
import Routes from '../../../constants/navigation/Routes';
import {
  OPTIN_META_METRICS_UI_SEEN,
  EXISTING_USER,
} from '../../../constants/storage';
import { strings } from '../../../../locales/i18n';
import { NavigationContainer } from '@react-navigation/native';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { mockTheme, ThemeContext } from '../../../util/theme';
import { Linking } from 'react-native';

const initialState: DeepPartial<RootState> = {
  user: {
    userLoggedIn: true,
  },
  engine: {
    backgroundState,
  },
};

jest.mock('react-native-branch', () => ({
  subscribe: jest.fn(),
}));

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

jest.mock('../../../core/DeeplinkManager/SharedDeeplinkManager', () => ({
  init: jest.fn(),
  parse: jest.fn(),
}));

jest.mock('../../../core/SDKConnect/SDKConnect', () => ({
  getInstance: () => ({
    init: jest.fn().mockResolvedValue(undefined),
    postInit: (cb: () => void) => cb(),
  }),
}));

jest.mock('../../../../app/core/WalletConnect/WalletConnectV2', () => ({
  init: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../lib/ppom/PPOMView', () => ({ PPOMView: () => null }));

jest.mock('../../../core/NavigationService', () => ({
  navigation: {
    reset: jest.fn(),
  },
}));

// expo library are not supported in jest ( unless using jest-expo as preset ), so we need to mock them
jest.mock('../../../core/OAuthService/OAuthLoginHandlers', () => ({
  createLoginHandler: jest.fn(),
}));

// Mock the navigation hook
const mockNavigate = jest.fn();
const mockReset = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    reset: mockReset,
  }),
}));

jest.mock('../../../core/Analytics/MetaMetrics');

const mockMetrics = {
  configure: jest.fn(),
  addTraitsToUser: jest.fn(),
};

// Mock Authentication module
jest.mock('../../../core', () => ({
  Authentication: {
    appTriggeredAuth: jest.fn().mockResolvedValue(undefined),
    lockApp: jest.fn(),
    checkIsSeedlessPasswordOutdated: jest.fn(),
  },
}));

// Mock Logger
jest.mock('../../../util/Logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

// Mock AppStateEventProcessor
jest.mock('../../../core/AppStateEventListener', () => ({
  AppStateEventProcessor: {
    setCurrentDeeplink: jest.fn(),
  },
}));

// Mock checkForDeeplink action
jest.mock('../../../actions/user', () => ({
  checkForDeeplink: jest.fn(() => ({ type: 'CHECK_FOR_DEEPLINK' })),
}));

// Need to mock this module since it uses store.getState, which interferes with the mocks from this test file.
jest.mock(
  '../../../util/metrics/UserSettingsAnalyticsMetaData/generateUserProfileAnalyticsMetaData',
  () => jest.fn().mockReturnValue({ userProp: 'User value' }),
);

jest.mock(
  '../../../util/metrics/DeviceAnalyticsMetaData/generateDeviceAnalyticsMetaData',
  () => jest.fn().mockReturnValue({ deviceProp: 'Device value' }),
);

// Mock essential dependencies
jest.mock('react-native-branch', () => ({
  subscribe: jest.fn(),
  getLatestReferringParams: jest.fn().mockResolvedValue({}),
}));

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

(MetaMetrics.getInstance as jest.Mock).mockReturnValue(mockMetrics);

describe('App', () => {
  jest.useFakeTimers();

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
  });

  afterEach(() => {
    cleanup();
    jest.runOnlyPendingTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('configures MetaMetrics instance and identifies user on startup', async () => {
    renderScreen(App, { name: 'App' }, { state: initialState });
    await waitFor(() => {
      expect(mockMetrics.configure).toHaveBeenCalledTimes(1);
    });
  });

  describe('Authentication flow logic', () => {
    it('navigates to onboarding when user does not exist', async () => {
      jest.spyOn(StorageWrapper, 'getItem').mockImplementation(async (key) => {
        if (key === EXISTING_USER) {
          return null; // User does not exist
        }
        return null; // Default for other keys
      });
      renderScreen(App, { name: 'App' }, { state: initialState });
      await waitFor(() => {
        expect(mockReset).toHaveBeenCalledWith({
          routes: [{ name: Routes.ONBOARDING.ROOT_NAV }],
        });
      });
    });
    it('navigates to login when user exists and logs in', async () => {
      jest.spyOn(StorageWrapper, 'getItem').mockImplementation(async (key) => {
        if (key === EXISTING_USER) {
          return true; // User exists
        }
        if (key === OPTIN_META_METRICS_UI_SEEN) {
          return true; // OptinMetrics UI has been seen
        }
        return null; // Default for other keys
      });
      jest.spyOn(Authentication, 'appTriggeredAuth').mockResolvedValue();
      renderScreen(App, { name: 'App' }, { state: initialState });
      await waitFor(() => {
        expect(mockReset).toHaveBeenCalledWith({
          routes: [{ name: Routes.ONBOARDING.HOME_NAV }],
        });
      });
    });

    it('navigates to OptinMetrics when user exists and OptinMetaMetricsUISeen is false', async () => {
      // Mock StorageWrapper.getItem to return different values based on the key
      jest.spyOn(StorageWrapper, 'getItem').mockImplementation(async (key) => {
        if (key === EXISTING_USER) {
          return true; // User exists
        }
        if (key === OPTIN_META_METRICS_UI_SEEN) {
          return false; // OptinMetrics UI has not been seen
        }
        return null; // Default for other keys
      });

      renderScreen(
        App,
        { name: 'App' },
        {
          state: {
            ...initialState,
          },
        },
      );

      // Wait a bit longer and add debugging
      await waitFor(
        () => {
          expect(mockReset).toHaveBeenCalledWith({
            routes: [
              {
                name: 'OnboardingRootNav',
                params: {
                  screen: 'OnboardingNav',
                  params: {
                    screen: 'OptinMetrics',
                  },
                },
              },
            ],
          });
        },
        { timeout: 5000 },
      );
    });

    describe('Seedless onboarding password outdated check', () => {
      const Logger = jest.requireMock('../../../util/Logger');

      const seedlessOnboardingState = {
        ...initialState,
        engine: {
          ...initialState.engine,
          backgroundState: {
            ...initialState.engine?.backgroundState,
            SeedlessOnboardingController: {
              vault: 'encrypted-vault-data', // This makes selectSeedlessOnboardingLoginFlow return true
            },
          },
        },
      };

      beforeEach(() => {
        jest.clearAllMocks();
        jest
          .spyOn(StorageWrapper, 'getItem')
          .mockImplementation(async (key) => {
            if (key === EXISTING_USER) {
              return true; // User exists
            }
            if (key === OPTIN_META_METRICS_UI_SEEN) {
              return true; // OptinMetrics UI has been seen
            }
            return null; // Default for other keys
          });
        jest.spyOn(Authentication, 'appTriggeredAuth').mockResolvedValue();
      });

      it('checks password outdated status and logs result when in seedless onboarding flow', async () => {
        // Arrange
        const mockCheckIsSeedlessPasswordOutdated = jest
          .spyOn(Authentication, 'checkIsSeedlessPasswordOutdated')
          .mockResolvedValue(true);

        // Act
        renderScreen(App, { name: 'App' }, { state: seedlessOnboardingState });

        // Assert
        await waitFor(() => {
          expect(mockCheckIsSeedlessPasswordOutdated).toHaveBeenCalledWith(
            true,
          );
          expect(Logger.log).toHaveBeenCalledWith(
            'App: Seedless password is outdated: true',
          );
        });
      });

      it('handles errors when checking seedless password outdated status', async () => {
        // Arrange
        const testError = new Error('Authentication service error');
        const mockCheckIsSeedlessPasswordOutdated = jest
          .spyOn(Authentication, 'checkIsSeedlessPasswordOutdated')
          .mockRejectedValue(testError);

        // Act
        renderScreen(App, { name: 'App' }, { state: seedlessOnboardingState });

        // Assert
        await waitFor(() => {
          expect(mockCheckIsSeedlessPasswordOutdated).toHaveBeenCalledWith(
            true,
          );
          expect(Logger.error).toHaveBeenCalledWith(
            testError,
            'App: Error in checkIsSeedlessPasswordOutdated',
          );
        });
      });
    });

    describe('Deeplink handling useEffect', () => {
      beforeEach(() => {
        jest.clearAllMocks();
        jest
          .spyOn(StorageWrapper, 'getItem')
          .mockImplementation(async (key) => {
            if (key === EXISTING_USER) {
              return true;
            }
            if (key === OPTIN_META_METRICS_UI_SEEN) {
              return true;
            }
            return null;
          });
        jest.spyOn(Authentication, 'appTriggeredAuth').mockResolvedValue();
      });

      it('sets up URL event listener when component mounts', async () => {
        const mockLinking = jest.mocked(Linking);
        mockLinking.addEventListener = jest.fn();

        renderScreen(App, { name: 'App' }, { state: initialState });

        await waitFor(() => {
          expect(mockLinking.addEventListener).toHaveBeenCalledWith(
            'url',
            expect.any(Function),
          );
        });
      });

      it('processes deeplinks when URL events are received', async () => {
        const mockLinking = jest.mocked(Linking);
        let capturedCallback: ((params: { url: string }) => void) | undefined;
        let callbackCalled = false;

        mockLinking.addEventListener = jest
          .fn()
          .mockImplementation(
            (event: string, callback: (params: { url: string }) => void) => {
              if (event === 'url') {
                capturedCallback = (params) => {
                  callbackCalled = true;
                  callback(params);
                };
              }
            },
          );

        renderScreen(App, { name: 'App' }, { state: initialState });

        await waitFor(() => {
          expect(mockLinking.addEventListener).toHaveBeenCalled();
        });

        // Simulate URL event
        if (capturedCallback) {
          capturedCallback({ url: 'test://url' });
        }

        // Verify the callback was triggered
        expect(callbackCalled).toBe(true);
      });
    });
  });

  describe('OnboardingRootNav', () => {
    it('renders the very first onboarding screen when you navigate into OnboardingRootNav', async () => {
      const routeState = {
        routes: [
          {
            name: Routes.ONBOARDING.ROOT_NAV,
            state: {
              index: 0,
              routes: [
                {
                  name: Routes.ONBOARDING.NAV,
                  state: {
                    index: 0,
                    routes: [
                      {
                        name: 'OnboardingCarousel',
                        params: {},
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      };
      const mockStore = configureMockStore();
      const store = mockStore(initialState);

      const Providers = ({ children }: { children: React.ReactElement }) => (
        <NavigationContainer initialState={routeState}>
          <Provider store={store}>
            <ThemeContext.Provider value={mockTheme}>
              {children}
            </ThemeContext.Provider>
          </Provider>
        </NavigationContainer>
      );

      const { getByText } = render(<App />, { wrapper: Providers });

      expect(
        getByText(strings('onboarding_carousel.get_started')),
      ).toBeTruthy();
    });
  });
});
