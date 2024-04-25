import { renderScreen } from '../../../util/test/renderWithProvider';
import initialBackgroundState from '../../../util/test/initial-background-state.json';
import App from './';
import { MetaMetrics } from '../../../core/Analytics';
import { waitFor } from '@testing-library/react-native';

const initialState = {
  user: {
    loggedIn: true,
  },
  engine: {
    ...initialBackgroundState,
  },
};

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
  });

  it('renders according to latest snapshot', () => {
    const { toJSON } = renderScreen(
      App,
      { name: 'App' },
      { state: initialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('configures MetaMetrics instance and identifies user on startup', async () => {
    renderScreen(App, { name: 'App' }, { state: initialState });
    await waitFor(() => {
      expect(mockMetrics.configure).toHaveBeenCalledTimes(1);
      expect(mockMetrics.addTraitsToUser).toHaveBeenNthCalledWith(1, {
        deviceProp: 'Device value',
        userProp: 'User value',
      });
    });
  });
});
