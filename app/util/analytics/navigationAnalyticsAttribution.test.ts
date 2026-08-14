import { EVENT_NAME } from '../../core/Analytics/MetaMetrics.events';
import {
  createNavigationAnalyticsContext,
  enrichWithNavigationAttribution,
  NavigationAnalyticsAttribution,
  resetNavigationAnalyticsAttributionForTests,
} from './navigationAnalyticsAttribution';

const createRoute = (
  analyticsContext = createNavigationAnalyticsContext(
    NavigationAnalyticsAttribution.HomepageBalanceBreakdown,
  ),
) => ({
  key: 'destination-route',
  name: 'Destination',
  params: { analyticsContext },
});

const createEvent = (
  name: string,
  properties: Record<string, unknown> = {},
) => ({
  name,
  properties,
});

describe('navigation analytics attribution', () => {
  beforeEach(() => {
    resetNavigationAnalyticsAttributionForTests();
  });

  it.each([
    [EVENT_NAME.MONEY_SURFACE_VIEWED, 'entry_point'],
    [EVENT_NAME.PERPS_SCREEN_VIEWED, 'source'],
    [EVENT_NAME.POSITION_SCREEN_VIEWED, 'source'],
  ])('injects the delegated property into %s', (eventName, property) => {
    const event = createEvent(eventName);

    const result = enrichWithNavigationAttribution(event, createRoute());

    expect(result.properties[property]).toBe('homescreen_balance_breakdown');
  });

  it('consumes attribution after the first matching event', () => {
    const route = createRoute();

    const first = enrichWithNavigationAttribution(
      createEvent(EVENT_NAME.POSITION_SCREEN_VIEWED),
      route,
    );
    const second = enrichWithNavigationAttribution(
      createEvent(EVENT_NAME.POSITION_SCREEN_VIEWED),
      route,
    );

    expect(first.properties.source).toBe('homescreen_balance_breakdown');
    expect(second.properties.source).toBeUndefined();
  });

  it('allows a new navigation context to attribute the same reused route', () => {
    const firstRoute = createRoute();
    const secondRoute = createRoute();

    enrichWithNavigationAttribution(
      createEvent(EVENT_NAME.MONEY_SURFACE_VIEWED),
      firstRoute,
    );
    const result = enrichWithNavigationAttribution(
      createEvent(EVENT_NAME.MONEY_SURFACE_VIEWED),
      secondRoute,
    );

    expect(result.properties.entry_point).toBe('homescreen_balance_breakdown');
  });

  it('preserves an explicit callsite property', () => {
    const event = createEvent(EVENT_NAME.PERPS_SCREEN_VIEWED, {
      source: 'explicit_source',
    });

    const result = enrichWithNavigationAttribution(event, createRoute());

    expect(result).toBe(event);
    expect(result.properties.source).toBe('explicit_source');
  });

  it('ignores events outside the attribution allowlist', () => {
    const event = createEvent(EVENT_NAME.HOME_VIEWED);

    const result = enrichWithNavigationAttribution(event, createRoute());

    expect(result).toBe(event);
  });
});
