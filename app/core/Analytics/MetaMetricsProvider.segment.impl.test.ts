import MetaMetricsProviderSegmentImpl from './MetaMetricsProvider.segment.impl';
import { createClient } from '@segment/analytics-react-native';
import { MetaMetricsProvider } from './MetaMetricsProvider.type';

jest.mock('@segment/analytics-react-native', () => ({
  createClient: jest.fn().mockReturnValue({
    track: jest.fn().mockResolvedValue('Segment trackEvent success'),
  }),
}));

const mockClient = (createClient as jest.Mock)();

describe('MetaMetricsProviderSegmentImpl', () => {
  let instance: MetaMetricsProvider;

  beforeEach(() => {
    instance = MetaMetricsProviderSegmentImpl.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('getInstance creates a singleton instance', () => {
    const anotherInstance = MetaMetricsProviderSegmentImpl.getInstance();
    expect(instance).toBe(anotherInstance);
  });

  it('tracks event', async () => {
    const eventName = 'testEvent';
    const anonymously = true;
    instance.trackEvent(eventName, anonymously);
    expect(mockClient.track).toHaveBeenCalledWith(eventName);
  });

  it('tracks event with parameters', () => {
    const eventName = 'testEvent';
    const params = { key: 'value' };
    const anonymously = true;
    instance.trackEventWithParameters(eventName, params, anonymously);
    // TODO implement test once trackEventWithParameters is implemented in MetaMetricsProviderSegmentImpl
    expect(mockClient.track).toHaveBeenCalledWith(eventName);
  });
});
