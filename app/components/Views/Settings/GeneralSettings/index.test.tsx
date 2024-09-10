import React from 'react';
import { shallow } from 'enzyme';
import GeneralSettings, { updateUserTraitsWithCurrentCurrency } from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { AppThemeKey } from '../../../../util/theme/models';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { MetaMetrics, MetaMetricsEvents } from '../../../../core/Analytics';
import { UserProfileProperty } from '../../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';

jest.mock('../../../../core/Analytics');

const mockStore = configureMockStore();
const initialState = {
  privacy: { approvedHosts: [] },
  browser: { history: [] },
  settings: {
    lockTime: 1000,
    searchEngine: 'DuckDuckGo',
    useBlockieIcon: true,
  },
  engine: {
    backgroundState,
  },
  user: { appTheme: AppThemeKey.light },
};
const store = mockStore(initialState);

describe('GeneralSettings', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <GeneralSettings />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('updateUserTraitsWithCurrentCurrency', () => {
  let mockAddTraitsToUser = jest.fn();
  let mockTrackEvent = jest.fn();

  beforeEach(() => {
    // Mock the MetaMetrics instance methods
    const mockMetricsInstance = {
      addTraitsToUser: jest.fn(),
      trackEvent: jest.fn(),
    };

    // Mock the getInstance method to return the mocked instance
    MetaMetrics.getInstance = jest.fn().mockReturnValue(mockMetricsInstance);

    mockAddTraitsToUser = mockMetricsInstance.addTraitsToUser;
    mockTrackEvent = mockMetricsInstance.trackEvent;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('adds selected currency trait', () => {
    const mockCurrency = 'USD';

    updateUserTraitsWithCurrentCurrency(mockCurrency);

    expect(mockAddTraitsToUser).toHaveBeenCalledWith({
      [UserProfileProperty.CURRENT_CURRENCY]: mockCurrency,
    });
  });

  it('should track the currency changed event', () => {
    const mockCurrency = 'USD';

    updateUserTraitsWithCurrentCurrency(mockCurrency);

    expect(mockTrackEvent).toHaveBeenCalledWith(
      MetaMetricsEvents.CURRENCY_CHANGED,
      {
        [UserProfileProperty.CURRENT_CURRENCY]: mockCurrency,
        location: 'app_settings',
      },
    );
  });
});
