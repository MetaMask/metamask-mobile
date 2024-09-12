import React from 'react';
import { shallow } from 'enzyme';
import GeneralSettings, {
  updateUserTraitsWithCurrentCurrency,
  updateUserTraitsWithCurrencyType,
} from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { AppThemeKey } from '../../../../util/theme/models';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { MetaMetricsEvents } from '../../../../core/Analytics';
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
  let mockMetrics: { addTraitsToUser: () => void; trackEvent: () => void };

  beforeEach(() => {
    // Create a mock for the metrics object with spies on the required methods
    mockMetrics = {
      addTraitsToUser: jest.fn(),
      trackEvent: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks(); // Clear mocks after each test to avoid interference
  });

  it('adds selected currency trait', () => {
    const mockCurrency = 'USD';

    updateUserTraitsWithCurrentCurrency(mockCurrency, mockMetrics);

    // Check if addTraitsToUser was called with the correct argument
    expect(mockMetrics.addTraitsToUser).toHaveBeenCalledWith({
      [UserProfileProperty.CURRENT_CURRENCY]: mockCurrency,
    });
  });

  it('tracks currency changed event', () => {
    const mockCurrency = 'USD';

    updateUserTraitsWithCurrentCurrency(mockCurrency, mockMetrics);

    // Check if trackEvent was called with the correct event and properties
    expect(mockMetrics.trackEvent).toHaveBeenCalledWith(
      MetaMetricsEvents.CURRENCY_CHANGED,
      {
        [UserProfileProperty.CURRENT_CURRENCY]: mockCurrency,
        location: 'app_settings',
      },
    );
  });

  it('does not throw errors when a valid currency is passed', () => {
    const mockCurrency = 'USD';

    expect(() => {
      updateUserTraitsWithCurrentCurrency(mockCurrency, mockMetrics);
    }).not.toThrow();
  });
});

describe('updateUserTraitsWithCurrencyType', () => {
  let mockMetrics: { addTraitsToUser: () => void; trackEvent: () => void };

  beforeEach(() => {
    // Create a mock for the metrics object with spies on the required methods
    mockMetrics = {
      addTraitsToUser: jest.fn(),
      trackEvent: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks(); // Reset mocks after each test
  });

  it('adds the primary currency preference', () => {
    const primaryCurrency = 'fiat';

    updateUserTraitsWithCurrencyType(primaryCurrency, mockMetrics);

    // Check if addTraitsToUser was called with the correct argument
    expect(mockMetrics.addTraitsToUser).toHaveBeenCalledWith({
      [UserProfileProperty.PRIMARY_CURRENCY]: primaryCurrency,
    });
  });

  it('tracks the primary currency toggle event', () => {
    const primaryCurrency = 'crypto';

    updateUserTraitsWithCurrencyType(primaryCurrency, mockMetrics);

    // Check if trackEvent was called with the correct event and properties
    expect(mockMetrics.trackEvent).toHaveBeenCalledWith(
      MetaMetricsEvents.PRIMARY_CURRENCY_TOGGLE,
      {
        [UserProfileProperty.PRIMARY_CURRENCY]: primaryCurrency,
        location: 'app_settings',
      },
    );
  });

  it('does not throw errors if metrics object is properly passed', () => {
    const primaryCurrency = 'fiat';

    expect(() => {
      updateUserTraitsWithCurrencyType(primaryCurrency, mockMetrics);
    }).not.toThrow();
  });
});
