import {
  updateUserTraitsWithCurrentCurrency,
  updateUserTraitsWithCurrencyType,
} from '.';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { UserProfileProperty } from '../../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import { analytics } from '../../../../util/analytics/analytics';

jest.mock('../../../../core/Engine', () => ({
  context: {},
}));

jest.mock('../../../../core/Analytics');

jest.mock('../../../../util/analytics/analytics', () => ({
  analytics: {
    identify: jest.fn(),
    trackEvent: jest.fn(),
  },
}));

const mockAddProperties = jest.fn().mockReturnThis();
const mockBuild = jest.fn().mockReturnValue({ name: 'CURRENCY_CHANGED' });
const mockCreateEventBuilder = jest.fn().mockReturnValue({
  addProperties: mockAddProperties,
  build: mockBuild,
});

jest.mock('../../../../util/analytics/AnalyticsEventBuilder', () => ({
  AnalyticsEventBuilder: {
    createEventBuilder: (...args: unknown[]) => mockCreateEventBuilder(...args),
  },
}));

describe('updateUserTraitsWithCurrentCurrency', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('adds the selected currency trait', () => {
    const currency = 'USD';

    updateUserTraitsWithCurrentCurrency(currency);

    expect(analytics.identify).toHaveBeenCalledWith({
      [UserProfileProperty.CURRENT_CURRENCY]: currency,
    });
  });

  it('tracks the currency changed event', () => {
    const currency = 'USD';

    updateUserTraitsWithCurrentCurrency(currency);

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.CURRENCY_CHANGED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      [UserProfileProperty.CURRENT_CURRENCY]: currency,
      location: 'app_settings',
    });
    expect(analytics.trackEvent).toHaveBeenCalledWith(mockBuild());
  });
});

describe('updateUserTraitsWithCurrencyType', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('adds the primary currency preference', () => {
    const primaryCurrency = 'fiat';

    updateUserTraitsWithCurrencyType(primaryCurrency);

    expect(analytics.identify).toHaveBeenCalledWith({
      [UserProfileProperty.PRIMARY_CURRENCY]: primaryCurrency,
    });
  });
});
