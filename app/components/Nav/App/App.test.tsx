import {
  DeepPartial,
  renderScreen,
} from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import App from '.';
import { MetaMetrics } from '../../../core/Analytics';
import { waitFor } from '@testing-library/react-native';
import { RootState } from '../../../reducers';
import StorageWrapper from '../../../store/storage-wrapper';
import { Authentication } from '../../../core';
import Routes from '../../../constants/navigation/Routes';
import SharedDeeplinkManager from '../../../core/DeeplinkManager/SharedDeeplinkManager';
import branch from 'react-native-branch';
import { AppStateEventProcessor } from '../../../core/AppStateEventListener';

const initialState: DeepPartial<RootState> = {
  user: {
    userLoggedIn: true,
    isMetaMetricsUISeen: true,
  },
  engine: {
    backgroundState,
  },
};

jest.mock('../../../core/DeeplinkManager/SharedDeeplinkManager', () => ({
  init: jest.fn(),
}));

jest.mock('react-native-branch', () => ({
  subscribe: jest.fn(),
  getLatestReferringParams: jest.fn(),
}));

jest.mock('../../../core/AppStateEventListener', () => ({
  AppStateEventProcessor: {
    setCurrentDeeplink: jest.fn(),
  },
}));

jest.mock('../../../core/NavigationService', () => ({
  navigation: {
    reset: jest.fn(),
  },
}));

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
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
  });

  it('configures MetaMetrics instance and identifies user on startup', async () => {
    renderScreen(App, { name: 'App' }, { state: initialState });
    await waitFor(() => {
      expect(mockMetrics.configure).toHaveBeenCalledTimes(1);
    });
  });

  describe('Branch deeplink handling', () => {
    it('initializes SharedDeeplinkManager with navigation and dispatch', async () => {
      renderScreen(App, { name: 'App' }, { state: initialState });
      await waitFor(() => {
        expect(SharedDeeplinkManager.init).toHaveBeenCalledWith({
          navigation: expect.any(Object),
          dispatch: expect.any(Function),
        });
      });
    });
    it('calls getBranchDeeplink immediately for cold start deeplink check', async () => {
      (branch.getLatestReferringParams as jest.Mock).mockResolvedValue({});
      renderScreen(App, { name: 'App' }, { state: initialState });
      await waitFor(() => {
        expect(branch.getLatestReferringParams).toHaveBeenCalledTimes(1);
      });
    });
    it('processes cold start deeplink when non-branch link is found', async () => {
      const mockDeeplink = 'https://link.metamask.io/home';
      (branch.getLatestReferringParams as jest.Mock).mockResolvedValue({
        '+non_branch_link': mockDeeplink,
      });
      renderScreen(App, { name: 'App' }, { state: initialState });
      await waitFor(() => {
        expect(branch.getLatestReferringParams).toHaveBeenCalledTimes(1);
        expect(AppStateEventProcessor.setCurrentDeeplink).toHaveBeenCalledWith(
          mockDeeplink,
        );
      });
    });

    it('subscribes to Branch deeplink events', async () => {
      renderScreen(App, { name: 'App' }, { state: initialState });
      await waitFor(() => {
        expect(branch.subscribe).toHaveBeenCalled();
      });
    });
    it('processes deeplink from subscription callback when uri is provided', async () => {
      const mockUri = 'https://link.metamask.io/home';
      const mockDeeplink = 'https://link.metamask.io/swap';
      (branch.getLatestReferringParams as jest.Mock).mockResolvedValue({
        '+non_branch_link': mockDeeplink,
      });
      renderScreen(App, { name: 'App' }, { state: initialState });
      await waitFor(() => {
        expect(branch.subscribe).toHaveBeenCalledWith(expect.any(Function));
      });
      const subscribeCallback = (branch.subscribe as jest.Mock).mock
        .calls[0][0];
      subscribeCallback({ uri: mockUri });
      await waitFor(() => {
        expect(AppStateEventProcessor.setCurrentDeeplink).toHaveBeenCalledWith(
          mockUri,
        );
      });
    });
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
