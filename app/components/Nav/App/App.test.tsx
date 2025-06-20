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
import Engine from '../../../core/Engine';

const initialState: DeepPartial<RootState> = {
  user: {
    userLoggedIn: true,
  },
  engine: {
    backgroundState,
  },
};

jest.mock('../../../core/NavigationService', () => ({
  navigation: {
    reset: jest.fn(),
  },
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
    it('navigates to home when user exists and logs in', async () => {
      jest.spyOn(StorageWrapper, 'getItem').mockResolvedValue(true);
      jest.spyOn(Authentication, 'appTriggeredAuth').mockResolvedValue();
      
      // Mock the specific property access to simulate a vault exists
      Object.defineProperty(Engine, 'context', {
        get: jest.fn().mockReturnValue({
          KeyringController: {
            state: {
              vault: 'mock-vault-data',
            },
          },
        }),
        configurable: true,
      });
      
      renderScreen(App, { name: 'App' }, { 
        state: {
          ...initialState,
          user: {
            ...initialState.user,
            existingUser: true,
          },
        } 
      });
      await waitFor(() => {
        expect(mockReset).toHaveBeenCalledWith({
          routes: [{ name: Routes.ONBOARDING.HOME_NAV }],
        });
      });
    });
  });
});
