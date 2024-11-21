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
import { MetaMetrics, MetaMetricsEvents } from '../../../../core/Analytics';
import { MetricsEventBuilder } from '../../../../core/Analytics/MetricsEventBuilder';
import { UserProfileProperty } from '../../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';

jest.mock('../../../../core/Analytics');

const mockStore = configureMockStore();
const initialState = {
  privacy: { approvedHosts: [] },
  browser: { history: [] },
  settings: {
    lockTime: 1000,
    searchEngine: 'Google',
    useBlockieIcon: true,
  },
  engine: {
    backgroundState,
  },
  user: { appTheme: AppThemeKey.light },
};
const store = mockStore(initialState);

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn().mockReturnValue({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnThis(),
});

MetaMetrics.getInstance = jest.fn().mockReturnValue({
  trackEvent: mockTrackEvent,
  createEventBuilder: mockCreateEventBuilder,
});

interface MockMetrics {
  addTraitsToUser: jest.Mock;
  trackEvent: jest.Mock;
}

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
  let mockMetrics: MockMetrics;

  beforeEach(() => {
    mockMetrics = {
      addTraitsToUser: jest.fn(),
      trackEvent: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('adds selected currency trait', () => {
    const mockCurrency = 'USD';

    updateUserTraitsWithCurrentCurrency(mockCurrency, mockMetrics);

    expect(mockMetrics.addTraitsToUser).toHaveBeenCalledWith({
      [UserProfileProperty.CURRENT_CURRENCY]: mockCurrency,
    });
  });

  it('tracks currency changed event', () => {
    const mockCurrency = 'USD';

    updateUserTraitsWithCurrentCurrency(mockCurrency, mockMetrics);
    const expectedEvent = MetricsEventBuilder.createEventBuilder(
      MetaMetricsEvents.CURRENCY_CHANGED,
    )
      .addProperties({
        [UserProfileProperty.CURRENT_CURRENCY]: mockCurrency,
        location: 'app_settings',
      })
      .build();

    expect(mockMetrics.trackEvent).toHaveBeenCalledWith(expectedEvent);
  });

  it('does not throw errors when a valid currency is passed', () => {
    const mockCurrency = 'USD';

    expect(() => {
      updateUserTraitsWithCurrentCurrency(mockCurrency, mockMetrics);
    }).not.toThrow();
  });
});

describe('updateUserTraitsWithCurrencyType', () => {
  let mockMetrics: MockMetrics;

  beforeEach(() => {
    mockMetrics = {
      addTraitsToUser: jest.fn(),
      trackEvent: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('adds the primary currency preference', () => {
    const primaryCurrency = 'fiat';

    updateUserTraitsWithCurrencyType(primaryCurrency, mockMetrics);

    expect(mockMetrics.addTraitsToUser).toHaveBeenCalledWith({
      [UserProfileProperty.PRIMARY_CURRENCY]: primaryCurrency,
    });
  });

  it('tracks the primary currency toggle event', () => {
    const primaryCurrency = 'crypto';

    updateUserTraitsWithCurrencyType(primaryCurrency, mockMetrics);
    const expectedEvent = MetricsEventBuilder.createEventBuilder(
      MetaMetricsEvents.PRIMARY_CURRENCY_TOGGLE,
    )
      .addProperties({
        [UserProfileProperty.PRIMARY_CURRENCY]: primaryCurrency,
        location: 'app_settings',
      })
      .build();
    expect(mockMetrics.trackEvent).toHaveBeenCalledWith(expectedEvent);
  });

  it('does not throw errors if metrics object is properly passed', () => {
    const primaryCurrency = 'fiat';

    expect(() => {
      updateUserTraitsWithCurrencyType(primaryCurrency, mockMetrics);
    }).not.toThrow();
  });
});
