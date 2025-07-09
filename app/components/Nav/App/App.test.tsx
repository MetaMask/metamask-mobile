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
import { strings } from '../../../../locales/i18n';
import { NavigationContainer } from '@react-navigation/native';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { mockTheme, ThemeContext } from '../../../util/theme';

const initialState: DeepPartial<RootState> = {
  user: {
    userLoggedIn: true,
    isMetaMetricsUISeen: true,
  },
  engine: {
    backgroundState,
  },
};

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
    Soft: 'soft',
    Rigid: 'rigid',
  },
  selectionAsync: jest.fn(),
  notificationAsync: jest.fn(),
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

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

// Need to mock this module since it uses store.getState, which interferes with the mocks from this test file.
jest.mock(
  '../../../util/metrics/UserSettingsAnalyticsMetaData/generateUserProfileAnalyticsMetaData',
  () => jest.fn().mockReturnValue({ userProp: 'User value' }),
);

jest.mock(
  '../../../util/metrics/DeviceAnalyticsMetaData/generateDeviceAnalyticsMetaData',
  () => jest.fn().mockReturnValue({ deviceProp: 'Device value' }),
);

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
      jest.spyOn(StorageWrapper, 'getItem').mockResolvedValue(null);
      renderScreen(App, { name: 'App' }, { state: initialState });
      await waitFor(() => {
        expect(mockReset).toHaveBeenCalledWith({
          routes: [{ name: Routes.ONBOARDING.ROOT_NAV }],
        });
      });
    });
    it('navigates to login when user exists and logs in', async () => {
      jest.spyOn(StorageWrapper, 'getItem').mockResolvedValue(true);
      jest.spyOn(Authentication, 'appTriggeredAuth').mockResolvedValue();
      renderScreen(App, { name: 'App' }, { state: initialState });
      await waitFor(() => {
        expect(mockReset).toHaveBeenCalledWith({
          routes: [{ name: Routes.ONBOARDING.HOME_NAV }],
        });
      });
    });

    it('navigates to OptinMetrics when user exists and isMetaMetricsUISeen is false', async () => {
      jest.spyOn(StorageWrapper, 'getItem').mockResolvedValue(true);
      jest.spyOn(Authentication, 'appTriggeredAuth').mockResolvedValue();
      renderScreen(
        App,
        { name: 'App' },
        {
          state: {
            ...initialState,
            user: { ...initialState.user, isMetaMetricsUISeen: false },
          },
        },
      );
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(Routes.ONBOARDING.ROOT_NAV, {
          screen: Routes.ONBOARDING.NAV,
          params: {
            screen: Routes.ONBOARDING.OPTIN_METRICS,
            params: {
              onContinue: expect.any(Function),
            },
          },
        });
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
