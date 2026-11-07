import { AnalyticsEventBuilder } from './AnalyticsEventBuilder';
import { createQuickBuyAmountSelected } from './generated/QuickBuyAmountSelected';
import {
  createTypedEventTransport,
  type AnalyticsEventContext,
} from './typedEventTransport';

// This suite tests the local builder/transport contract, not UI or controller I/O.
describe('createTypedEventTransport', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each(['Wallet Opened', 'Swap Completed'])(
    'builds %s through the shared transport',
    (eventName) => {
      const trackEvent = jest.fn();
      const createEventBuilder = jest.spyOn(
        AnalyticsEventBuilder,
        'createEventBuilder',
      );
      const transport = createTypedEventTransport(trackEvent);
      const properties = { source: 'wallet' };
      const context: AnalyticsEventContext = {
        protocols: { event_version: 3 },
      };

      transport.track(eventName, properties, context);

      expect(createEventBuilder).toHaveBeenCalledWith(eventName);
      expect(trackEvent).toHaveBeenCalledTimes(1);
      const [event, forwardedContext] = trackEvent.mock.calls[0];
      expect(event.name).toBe(eventName);
      expect(event.properties).toEqual(properties);
      expect(event.sensitiveProperties).toEqual({});
      expect(event.isAnonymous).toBe(false);
      expect(forwardedContext).toEqual(context);
      expect(event.properties).not.toHaveProperty('protocols');
    },
  );

  it('preserves defined falsy properties and filters undefined through the builder', () => {
    const trackEvent = jest.fn();
    const transport = createTypedEventTransport(trackEvent);
    const properties = {
      amount: 0,
      enabled: false,
      label: '',
      optional: undefined,
      nullable: null,
    };

    transport.track('Test Event', properties, {
      protocols: { event_version: 1 },
    });

    expect(trackEvent.mock.calls[0][0].properties).toEqual({
      amount: 0,
      enabled: false,
      label: '',
      nullable: null,
    });
    expect(properties).toHaveProperty('optional', undefined);
  });

  it.each([1, 2] as const)(
    'accepts the unchanged generated v%s facade',
    (version) => {
      const trackEvent = jest.fn();
      const event = createQuickBuyAmountSelected(
        createTypedEventTransport(trackEvent),
      );
      const properties = {
        amount_usd: 50,
        amount_selection_method: 'custom_input' as const,
        source: 'profile_position' as const,
      };

      if (version === 1) {
        event.v1.track(properties);
      } else {
        event.v2.track(properties);
      }

      expect(trackEvent).toHaveBeenCalledTimes(1);
      expect(trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Quick Buy Amount Selected',
          properties,
        }),
        { protocols: { event_version: version } },
      );
    },
  );
});
