import {
  DeepPartial,
  renderScreen,
} from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import App from './';
import { MetaMetrics } from '../../../core/Analytics';
import { waitFor } from '@testing-library/react-native';
import { RootState } from '../../../reducers';
import { useMetrics } from '../../../components/hooks/useMetrics';

const initialState: DeepPartial<RootState> = {
  user: {
    userLoggedIn: true,
  },
  engine: {
    backgroundState,
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

// // Mock the useMetrics hook
// jest.mock('../../../components/hooks/useMetrics', () => ({
//   useMetrics: jest.fn(),
// }));

jest.mock('../../../components/hooks/useMetrics', () => ({
  ...jest.requireActual('../../../components/hooks/useMetrics'),
  withMetricsAwareness: jest.fn(),
}));

describe('App', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useMetrics as jest.Mock).mockReturnValue({
      isEnabled: jest.fn().mockReturnValue(true),
    });
  });

  it('renders according to latest snapshot', () => {
    const { toJSON } = renderScreen(
      App,
      { name: 'App' },
      { state: initialState },
      { supressRender: true },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('configures MetaMetrics instance and identifies user on startup', async () => {
    renderScreen(
      App,
      { name: 'App' },
      { state: initialState },
      { supressRender: true },
    );
    await waitFor(() => {
      expect(mockMetrics.configure).toHaveBeenCalledTimes(1);
      expect(mockMetrics.addTraitsToUser).toHaveBeenNthCalledWith(1, {
        deviceProp: 'Device value',
        userProp: 'User value',
      });
    });
  });
});
