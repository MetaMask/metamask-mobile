import { ACTIVITY_SCREEN_EVENTS } from '../../core/Analytics/events/activity/events';
import { CONFIRMATION_EVENTS } from '../../core/Analytics/events/confirmations/events';
import { EVENT_NAME } from '../../core/Analytics/MetaMetrics.events';
import {
  createNavigationAnalyticsContext,
  enrichWithNavigationAttribution,
  focusedRouteFromNavigationState,
  NavigationAnalyticsAttribution,
  recordFocusedRoute,
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

const walletStackState = {
  index: 0,
  routes: [
    {
      key: 'root',
      name: 'Root',
      state: {
        index: 0,
        routes: [{ key: 'wallet', name: 'WalletView' }],
      },
    },
  ],
};

const tokensStackState = {
  index: 0,
  routes: [
    {
      key: 'root',
      name: 'Root',
      state: {
        index: 1,
        routes: [
          { key: 'wallet', name: 'WalletView' },
          { key: 'tokens', name: 'TokensFullView' },
        ],
      },
    },
  ],
};

const tabState = (index: number) => ({
  index: 0,
  routes: [
    {
      key: 'tabs',
      name: 'MainTabs',
      state: {
        index,
        routes: [
          { key: 'wallet', name: 'WalletView' },
          { key: 'browser', name: 'BrowserView' },
        ],
      },
    },
  ],
});

const asRoute = (name: string, key: string) => ({
  key,
  name,
  params: {},
});

describe('navigation analytics attribution', () => {
  beforeEach(() => {
    resetNavigationAnalyticsAttributionForTests();
  });

  it.each([
    [
      EVENT_NAME.MONEY_SURFACE_VIEWED,
      'entry_point',
      { screen_name: 'money_home', surface_type: 'screen' },
    ],
    [EVENT_NAME.PERPS_SCREEN_VIEWED, 'source', {}],
    [EVENT_NAME.POSITION_SCREEN_VIEWED, 'source', {}],
  ])(
    'injects the delegated property into %s',
    (eventName, property, properties) => {
      const event = createEvent(eventName, properties);

      const result = enrichWithNavigationAttribution(event, createRoute());

      expect(result.properties[property]).toBe('homescreen_balance_breakdown');
    },
  );

  it('preserves Money attribution until the Money home screen event', () => {
    const route = createRoute();
    const intermediateEvent = createEvent(EVENT_NAME.MONEY_SURFACE_VIEWED, {
      screen_name: 'money_onboarding',
      surface_type: 'screen',
    });
    const moneyHomeEvent = createEvent(EVENT_NAME.MONEY_SURFACE_VIEWED, {
      screen_name: 'money_home',
      surface_type: 'screen',
    });

    const intermediateResult = enrichWithNavigationAttribution(
      intermediateEvent,
      route,
    );
    const moneyHomeResult = enrichWithNavigationAttribution(
      moneyHomeEvent,
      route,
    );

    expect(intermediateResult.properties.entry_point).toBeUndefined();
    expect(moneyHomeResult.properties.entry_point).toBe(
      'homescreen_balance_breakdown',
    );
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
      createEvent(EVENT_NAME.MONEY_SURFACE_VIEWED, {
        screen_name: 'money_home',
        surface_type: 'screen',
      }),
      firstRoute,
    );
    const result = enrichWithNavigationAttribution(
      createEvent(EVENT_NAME.MONEY_SURFACE_VIEWED, {
        screen_name: 'money_home',
        surface_type: 'screen',
      }),
      secondRoute,
    );

    expect(result.properties.entry_point).toBe('homescreen_balance_breakdown');
  });

  it('preserves an explicit callsite property without consuming attribution', () => {
    const route = createRoute();
    const event = createEvent(EVENT_NAME.PERPS_SCREEN_VIEWED, {
      source: 'explicit_source',
    });

    const result = enrichWithNavigationAttribution(event, route);
    const destinationResult = enrichWithNavigationAttribution(
      createEvent(EVENT_NAME.PERPS_SCREEN_VIEWED),
      route,
    );

    expect(result).toBe(event);
    expect(result.properties.source).toBe('explicit_source');
    expect(destinationResult.properties.source).toBe(
      'homescreen_balance_breakdown',
    );
  });

  it('ignores events outside the attribution allowlist', () => {
    const event = createEvent(EVENT_NAME.HOME_VIEWED);

    const result = enrichWithNavigationAttribution(event, createRoute());

    expect(result).toBe(event);
  });

  it('sets previous_screen to WalletView on a stack push before the destination is recorded', () => {
    const origin = focusedRouteFromNavigationState(walletStackState);
    const destination = focusedRouteFromNavigationState(tokensStackState);
    recordFocusedRoute(origin);
    const destinationRoute = asRoute('TokensFullView', 'tokens');

    const duringPush = enrichWithNavigationAttribution(
      createEvent(EVENT_NAME.HOME_VIEWED),
      destinationRoute,
    );
    recordFocusedRoute(destination);
    const afterPush = enrichWithNavigationAttribution(
      createEvent(EVENT_NAME.HOME_VIEWED),
      destinationRoute,
    );

    expect(origin?.name).toBe('WalletView');
    expect(destination?.name).toBe('TokensFullView');
    expect(duringPush.properties.previous_screen).toBe('WalletView');
    expect(afterPush.properties.previous_screen).toBe('WalletView');
  });

  it('sets previous_screen to WalletView on a tab change before the destination is recorded', () => {
    const origin = focusedRouteFromNavigationState(tabState(0));
    const destination = focusedRouteFromNavigationState(tabState(1));
    recordFocusedRoute(origin);
    const destinationRoute = asRoute('BrowserView', 'browser');

    const duringChange = enrichWithNavigationAttribution(
      createEvent(EVENT_NAME.HOME_VIEWED),
      destinationRoute,
    );
    recordFocusedRoute(destination);
    const afterChange = enrichWithNavigationAttribution(
      createEvent(EVENT_NAME.HOME_VIEWED),
      destinationRoute,
    );

    expect(origin?.name).toBe('WalletView');
    expect(destination?.name).toBe('BrowserView');
    expect(duringChange.properties.previous_screen).toBe('WalletView');
    expect(afterChange.properties.previous_screen).toBe('WalletView');
  });

  it('omits previous_screen for the first focused route', () => {
    const route = asRoute('WalletView', 'wallet');
    recordFocusedRoute(route);
    const event = createEvent(EVENT_NAME.HOME_VIEWED);

    const result = enrichWithNavigationAttribution(event, route);

    expect(result).toBe(event);
    expect(result.properties.previous_screen).toBeUndefined();
  });

  it('keeps an explicit source and still sets previous_screen', () => {
    const route = createRoute();
    recordFocusedRoute({ name: 'WalletView', key: 'wallet' });
    recordFocusedRoute({ name: route.name, key: route.key });
    const event = createEvent(EVENT_NAME.PERPS_SCREEN_VIEWED, {
      source: 'explicit_source',
    });

    const result = enrichWithNavigationAttribution(event, route);
    const followUp = enrichWithNavigationAttribution(
      createEvent(EVENT_NAME.PERPS_SCREEN_VIEWED),
      route,
    );

    expect(result.properties.source).toBe('explicit_source');
    expect(result.properties.previous_screen).toBe('WalletView');
    expect(followUp.properties.source).toBe('homescreen_balance_breakdown');
    expect(followUp.properties.previous_screen).toBe('WalletView');
  });

  it('keeps an explicit entry_point and still sets previous_screen', () => {
    const route = createRoute();
    recordFocusedRoute({ name: 'WalletView', key: 'wallet' });
    recordFocusedRoute({ name: route.name, key: route.key });
    const event = createEvent(EVENT_NAME.MONEY_SURFACE_VIEWED, {
      entry_point: 'explicit_entry',
      screen_name: 'money_home',
      surface_type: 'screen',
    });

    const result = enrichWithNavigationAttribution(event, route);
    const followUp = enrichWithNavigationAttribution(
      createEvent(EVENT_NAME.MONEY_SURFACE_VIEWED, {
        screen_name: 'money_home',
        surface_type: 'screen',
      }),
      route,
    );

    expect(result.properties.entry_point).toBe('explicit_entry');
    expect(result.properties.previous_screen).toBe('WalletView');
    expect(followUp.properties.entry_point).toBe(
      'homescreen_balance_breakdown',
    );
    expect(followUp.properties.previous_screen).toBe('WalletView');
  });

  it('keeps an explicit previous_screen', () => {
    recordFocusedRoute({ name: 'WalletView', key: 'wallet' });
    const route = asRoute('TokensFullView', 'tokens');
    const event = createEvent(EVENT_NAME.HOME_VIEWED, {
      previous_screen: 'custom_screen',
    });

    const result = enrichWithNavigationAttribution(event, route);

    expect(result).toBe(event);
    expect(result.properties.previous_screen).toBe('custom_screen');
  });

  it('sets previous_screen on later events after balance breakdown attribution is consumed', () => {
    const route = createRoute();
    recordFocusedRoute({ name: 'WalletView', key: 'wallet' });
    recordFocusedRoute({ name: route.name, key: route.key });

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
    expect(first.properties.previous_screen).toBe('WalletView');
    expect(second.properties.previous_screen).toBe('WalletView');
  });

  it('leaves route params off the event', () => {
    recordFocusedRoute({ name: 'WalletView', key: 'wallet' });
    const route = {
      key: 'tokens',
      name: 'TokensFullView',
      params: {
        accountAddress: '0xabc',
        analyticsContext: createNavigationAnalyticsContext(
          NavigationAnalyticsAttribution.HomepageBalanceBreakdown,
        ),
      },
    };
    const event = createEvent(EVENT_NAME.HOME_VIEWED);

    const result = enrichWithNavigationAttribution(event, route);

    expect(result.properties).toEqual({ previous_screen: 'WalletView' });
  });

  it.each([
    EVENT_NAME.RAMPS_SCREEN_VIEWED,
    EVENT_NAME.MONEY_HUB_SCREEN_VIEWED,
    EVENT_NAME.CARD_HOME_VIEWED,
    EVENT_NAME.EARN_MODULE_SURFACE_VIEWED,
    EVENT_NAME.PREDICT_HOME_VIEWED,
    EVENT_NAME.LOGIN_SCREEN_VIEWED,
    EVENT_NAME.WALLET_CREATION_ERROR_SCREEN_VIEWED,
    EVENT_NAME.VAULT_CORRUPTION_RESTORE_WALLET_SCREEN_VIEWED,
    EVENT_NAME.VAULT_CORRUPTION_WALLET_SUCCESSFULLY_RESTORED_SCREEN_VIEWED,
    EVENT_NAME.VAULT_CORRUPTION_WALLET_RESET_NEEDED_SCREEN_VIEWED,
    EVENT_NAME.SOCIAL_TRADER_LEADERBOARD_SCREEN_VIEWED,
    EVENT_NAME.SOCIAL_TRADER_PROFILE_SCREEN_VIEWED,
    EVENT_NAME.SOCIAL_FOLLOW_TRADING_TOKEN_SCREEN_VIEWED,
    EVENT_NAME.SOCIAL_TRADER_FEED_SCREEN_VIEWED,
    ACTIVITY_SCREEN_EVENTS.VIEWED.category,
    CONFIRMATION_EVENTS.SCREEN_VIEWED.category,
  ])('sets previous_screen to WalletView for %s', (eventName) => {
    recordFocusedRoute({ name: 'WalletView', key: 'wallet' });
    const event = createEvent(eventName);

    const result = enrichWithNavigationAttribution(
      event,
      asRoute('TokensFullView', 'tokens'),
    );

    expect(event.properties.previous_screen).toBeUndefined();
    expect(result).not.toBe(event);
    expect(result.properties.previous_screen).toBe('WalletView');
  });

  it('leaves previous_screen unset when the same focused route is recorded twice', () => {
    recordFocusedRoute({ name: 'WalletView', key: 'wallet' });
    recordFocusedRoute({ name: 'WalletView', key: 'wallet' });
    const event = createEvent(EVENT_NAME.HOME_VIEWED);
    const route = asRoute('WalletView', 'wallet');

    const result = enrichWithNavigationAttribution(event, route);

    expect(result).toBe(event);
    expect(result.properties.previous_screen).toBeUndefined();
  });

  it('sets previous_screen to WalletView when the same route name is recorded with a new key', () => {
    recordFocusedRoute({ name: 'WalletView', key: 'wallet-1' });
    recordFocusedRoute({ name: 'WalletView', key: 'wallet-2' });
    const event = createEvent(EVENT_NAME.HOME_VIEWED);

    const result = enrichWithNavigationAttribution(
      event,
      asRoute('WalletView', 'wallet-2'),
    );

    expect(result.properties.previous_screen).toBe('WalletView');
  });

  it('leaves previous_screen unset on events outside the screen-view allowlist', () => {
    recordFocusedRoute({ name: 'Login', key: 'login' });
    recordFocusedRoute({ name: 'WalletView', key: 'wallet' });
    const event = createEvent('Activity Clicked');

    const result = enrichWithNavigationAttribution(
      event,
      asRoute('WalletView', 'wallet'),
    );

    expect(result).toBe(event);
    expect(result.properties.previous_screen).toBeUndefined();
  });

  it('uses the route that opened a screen for a departure event', () => {
    recordFocusedRoute({ name: 'Login', key: 'login' });
    recordFocusedRoute({ name: 'WalletView', key: 'wallet' });
    const departureEvent = createEvent(EVENT_NAME.HOME_VIEWED, {
      interaction_type: 'session_summary',
    });

    const duringNavigation = enrichWithNavigationAttribution(
      departureEvent,
      asRoute('Activity', 'activity'),
    );
    recordFocusedRoute({ name: 'Activity', key: 'activity' });
    const afterNavigation = enrichWithNavigationAttribution(
      createEvent(EVENT_NAME.HOME_VIEWED, {
        interaction_type: 'session_summary',
      }),
      asRoute('Activity', 'activity'),
    );

    expect(duringNavigation.properties.previous_screen).toBe('Login');
    expect(afterNavigation.properties.previous_screen).toBe('Login');
  });

  it('keeps the Money home screen_name gate when previous_screen is set', () => {
    const route = createRoute();
    recordFocusedRoute({ name: 'WalletView', key: 'wallet' });
    recordFocusedRoute({ name: route.name, key: route.key });
    const intermediateEvent = createEvent(EVENT_NAME.MONEY_SURFACE_VIEWED, {
      screen_name: 'money_onboarding',
      surface_type: 'screen',
    });
    const moneyHomeEvent = createEvent(EVENT_NAME.MONEY_SURFACE_VIEWED, {
      screen_name: 'money_home',
      surface_type: 'screen',
    });

    const intermediateResult = enrichWithNavigationAttribution(
      intermediateEvent,
      route,
    );
    const moneyHomeResult = enrichWithNavigationAttribution(
      moneyHomeEvent,
      route,
    );

    expect(intermediateResult.properties.entry_point).toBeUndefined();
    expect(intermediateResult.properties.previous_screen).toBe('WalletView');
    expect(moneyHomeResult.properties.entry_point).toBe(
      'homescreen_balance_breakdown',
    );
    expect(moneyHomeResult.properties.previous_screen).toBe('WalletView');
  });
});
