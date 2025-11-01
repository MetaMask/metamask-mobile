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
import { MetricsEventBuilder } from '../../../../core/Analytics/MetricsEventBuilder';
import { AvatarAccountType } from '../../../../component-library/components/Avatars/Avatar';

jest.mock('../../../../core/Analytics');

const mockStore = configureMockStore();
const initialState = {
  privacy: { approvedHosts: [] },
  browser: { history: [] },
  settings: {
    lockTime: 1000,
    searchEngine: 'Google',
    avatarAccountType: AvatarAccountType.Maskicon,
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

const mockMetrics = {
  addTraitsToUser: jest.fn(),
  trackEvent: jest.fn(),
  createEventBuilder: MetricsEventBuilder.createEventBuilder,
};

describe('updateUserTraitsWithCurrentCurrency', () => {
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

    // Check if trackEvent was called with the correct event and properties
    expect(mockMetrics.trackEvent).toHaveBeenCalledWith(
      MetricsEventBuilder.createEventBuilder(MetaMetricsEvents.CURRENCY_CHANGED)
        .addProperties({
          [UserProfileProperty.CURRENT_CURRENCY]: mockCurrency,
          location: 'app_settings',
        })
        .build(),
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

  it('does not throw errors if metrics object is properly passed', () => {
    const primaryCurrency = 'fiat';

    expect(() => {
      updateUserTraitsWithCurrencyType(primaryCurrency, mockMetrics);
    }).not.toThrow();
  });
});
