import MetaMetricsProviderLegacyImpl from './MetaMetricsProvider.legacy.impl';
import Analytics from './Analytics';
import { MetaMetricsProvider } from './MetaMetricsProvider.type';

jest.mock('./Analytics', () => ({
  trackEvent: jest.fn(),
  trackEventWithParameters: jest.fn(),
}));

describe('MetaMetricsProviderLegacyImpl', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('tracks event', () => {
    const eventName = 'testEvent';
    const anonymously = true;
    const instance: MetaMetricsProvider = new MetaMetricsProviderLegacyImpl();
    instance.trackEvent(eventName, anonymously);
    expect(Analytics.trackEvent).toHaveBeenCalledWith(eventName, anonymously);
  });

  it('tracks event with parameters', () => {
    const eventName = 'testEvent';
    const params = { key: 'value' };
    const anonymously = true;
    const instance: MetaMetricsProvider = new MetaMetricsProviderLegacyImpl();
    instance.trackEventWithParameters(eventName, params, anonymously);
    expect(Analytics.trackEventWithParameters).toHaveBeenCalledWith(
      eventName,
      params,
      anonymously,
    );
  });
});
