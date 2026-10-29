import '../../../tests/component-view/mocks';
import { Alert } from 'react-native';
import { act, waitFor } from '@testing-library/react-native';
import {
  getRouteProbeTestId,
  renderDeeplinkNavigation,
  waitForFocusedRouteNames,
  type DeeplinkStart,
  type FocusedRoute,
  type RenderedDeeplinkNavigation,
} from '../../../tests/component-view/renderers/deeplinks';
import {
  describeForPlatforms,
  itEach,
} from '../../../tests/component-view/platform';
import { initialStateDeeplinks } from '../../../tests/component-view/presets/deeplinks';
import Engine from '../Engine';
import { installDeeplinkCaseBoundary } from '../../../tests/component-view/api-mocking/deeplinkSwapToken';
import Routes from '../../constants/navigation/Routes';
import { strings } from '../../../locales/i18n';
import { NotificationSettingsViewSelectorsIDs } from '../../components/Views/Settings/NotificationsSettings/NotificationSettingsView.testIds';
import parseDeeplink from './utils/parseDeeplink';
import { executeStartupDeeplinkIntent } from './utils/executeDeeplinkIntent';
import type { DeeplinkManager } from './DeeplinkManager';
import type { DeeplinkIntent } from './types/DeeplinkIntent';
import {
  DEEPLINK_URI_CASES,
  NON_NAVIGATION_CASES,
  ORIGIN_EXTERNAL_DEEPLINK,
  type DeeplinkUriCase,
  type ExpectedFocusedRoute,
  type VolatileParam,
} from './__fixtures__/deeplinkUriCases';
import { splitVolatileParams } from './__fixtures__/splitVolatileParams';

/**
 * Component-view navigation coverage for deeplink URIs.
 *
 * Real: parser, universal-link dispatch, intent handlers and executors,
 * NavigationService, React Navigation, Redux reducers/selectors. Mocked:
 * Engine and native modules only (the shared CV mocks). The tree is a reduced,
 * hand-registered test tree — see tests/component-view/renderers/deeplinks.tsx
 * for what that does and does not prove.
 */

// `itEach` takes string-keyed rows; the fixtures are interfaces.
type CaseRow = DeeplinkUriCase & Record<string, unknown>;
const CASES = DEEPLINK_URI_CASES as readonly CaseRow[];

// The universal-link path only touches the manager for legacy actions
// (send/wc) that are outside this suite.
const deeplinkManager = {} as unknown as DeeplinkManager;

const GET_NOTIFICATION_PREFERENCES_ACTION =
  'AuthenticatedUserStorageService:getNotificationPreferences';

const NOTIFICATION_PREFERENCES = {
  walletActivity: {
    inAppNotificationsEnabled: true,
    pushNotificationsEnabled: true,
    accounts: [],
  },
  perps: { inAppNotificationsEnabled: true, pushNotificationsEnabled: true },
  agenticCli: {
    inAppNotificationsEnabled: true,
    pushNotificationsEnabled: true,
  },
  socialAI: {
    inAppNotificationsEnabled: true,
    pushNotificationsEnabled: true,
    txAmountLimit: 100,
    mutedTraderProfileIds: [],
  },
  marketing: {
    inAppNotificationsEnabled: false,
    pushNotificationsEnabled: false,
  },
  priceAlerts: {
    inAppNotificationsEnabled: true,
    pushNotificationsEnabled: true,
  },
};

/** Serves the AUS preferences the real notification screens read via Engine. */
const mockNotificationPreferences = () => {
  const controllerMessengerCall = Engine.controllerMessenger.call.bind(
    Engine.controllerMessenger,
  ) as (action: string, ...args: unknown[]) => unknown;

  return jest
    .spyOn(Engine.controllerMessenger, 'call')
    .mockImplementation(((action: string, ...args: unknown[]) =>
      action === GET_NOTIFICATION_PREFERENCES_ACTION
        ? Promise.resolve(NOTIFICATION_PREFERENCES)
        : controllerMessengerCall(action, ...args)) as never);
};

/**
 * NavigationService defers navigate/reset with requestAnimationFrame. Frames
 * run in order, so a frame requested now resolves after every deferral queued
 * before it. This is the completion boundary for "nothing happened" cases.
 */
const settleDeferredNavigation = () =>
  act(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      }),
  );

const expectFocusedPath = (
  actual: FocusedRoute[],
  expected: readonly ExpectedFocusedRoute[],
  volatile: readonly VolatileParam[] = [],
) => {
  expect(actual.map(({ name }) => name)).toEqual(
    expected.map(({ name }) => name),
  );
  expected.forEach((expectedRoute, index) => {
    if (!expectedRoute.params) {
      return;
    }
    const isLeaf = index === expected.length - 1;
    const { stable, violations } = splitVolatileParams(
      actual[index].params,
      isLeaf ? volatile : [],
    );
    expect(violations).toEqual([]);
    expect(stable).toEqual(expectedRoute.params);
  });
};

const namesOf = (path: readonly Pick<ExpectedFocusedRoute, 'name'>[]) =>
  path.map(({ name }) => name);

/** Starts on Wallet unless the destination involves Explore, so the move is observable. */
const startTabFor = (testCase: DeeplinkUriCase): DeeplinkStart => {
  const involvesExplore = [
    testCase.expected.target.routeName,
    testCase.expected.target.backTab,
  ].includes(Routes.TRENDING_VIEW);
  return { tab: involvesExplore ? 'wallet' : 'explore' };
};

describeForPlatforms('Deeplink URI navigation', () => {
  let rendered: RenderedDeeplinkNavigation | undefined;
  let notificationPreferencesSpy: jest.SpyInstance | undefined;
  let teardownBoundary: (() => void) | undefined;

  const openNormal = (url: string, origin = ORIGIN_EXTERNAL_DEEPLINK) =>
    act(async () => {
      await parseDeeplink({ deeplinkManager, url, origin });
    });

  const openStartup = async (
    url: string,
    origin = ORIGIN_EXTERNAL_DEEPLINK,
  ) => {
    const intent = await parseDeeplink({
      deeplinkManager,
      url,
      origin,
      mode: 'resolve',
    });
    expect(intent).toEqual(
      expect.objectContaining({ target: expect.anything() }),
    );
    await act(async () => {
      await executeStartupDeeplinkIntent(intent as DeeplinkIntent);
    });
  };

  const goBack = (container: RenderedDeeplinkNavigation['container']) =>
    act(async () => {
      container.goBack();
    });

  beforeEach(() => {
    notificationPreferencesSpy = mockNotificationPreferences();
  });

  afterEach(() => {
    rendered?.cleanup();
    rendered = undefined;
    teardownBoundary?.();
    teardownBoundary = undefined;
    notificationPreferencesSpy?.mockRestore();
    jest.restoreAllMocks();
  });

  describe('normal execution (parser execute mode)', () => {
    itEach(CASES)(
      'reaches the destination for $id [$state state]',
      async (testCase) => {
        teardownBoundary = installDeeplinkCaseBoundary(
          testCase.boundary,
          Engine as never,
        );
        rendered = await renderDeeplinkNavigation({
          state: initialStateDeeplinks(testCase.state),
          start: startTabFor(testCase),
        });

        await openNormal(testCase.url, testCase.origin);

        const { focusedPath, volatile } = testCase.expected.navigation;
        await waitForFocusedRouteNames(rendered.container, focusedPath);
        expectFocusedPath(rendered.getFocusedPath(), focusedPath, volatile);
      },
    );
  });

  describe('startup reset (parser resolve mode + startup executor)', () => {
    itEach(CASES)(
      'rebuilds navigation for $id [$state state]',
      async (testCase) => {
        teardownBoundary = installDeeplinkCaseBoundary(
          testCase.boundary,
          Engine as never,
        );
        rendered = await renderDeeplinkNavigation({
          state: initialStateDeeplinks(testCase.state),
          start: 'before-home-nav',
        });

        await openStartup(testCase.url, testCase.origin);

        const { focusedPath, volatile } = testCase.expected.navigation;
        await waitForFocusedRouteNames(rendered.container, focusedPath);
        expectFocusedPath(rendered.getFocusedPath(), focusedPath, volatile);
      },
    );
  });

  describe('Back', () => {
    const PERPS_HOME_URL = 'https://link.metamask.io/perps?screen=home';
    const STOCKS_URL = 'https://link.metamask.io/trending?screen=stocks';
    const REWARDS_URL = 'https://link.metamask.io/rewards';

    const WALLET_TAB_PATH = [
      Routes.ONBOARDING.HOME_NAV,
      Routes.HOME_TABS,
      Routes.WALLET.HOME,
      Routes.WALLET_VIEW,
    ];
    const EXPLORE_TAB_PATH = [
      Routes.ONBOARDING.HOME_NAV,
      Routes.HOME_TABS,
      Routes.TRENDING_VIEW,
    ];

    it('normal: a default main-stack target returns to the tab the user came from', async () => {
      rendered = await renderDeeplinkNavigation({ start: { tab: 'explore' } });
      await openNormal(PERPS_HOME_URL);
      await waitForFocusedRouteNames(rendered.container, [
        { name: Routes.ONBOARDING.HOME_NAV },
        { name: Routes.PERPS.ROOT },
        { name: Routes.PERPS.PERPS_HOME },
      ]);

      await goBack(rendered.container);

      await waitFor(() => {
        expect(namesOf(rendered?.getFocusedPath() ?? [])).toEqual(
          EXPLORE_TAB_PATH,
        );
      });
    });

    it('startup: a default main-stack target returns to Wallet', async () => {
      rendered = await renderDeeplinkNavigation({ start: 'before-home-nav' });
      await openStartup(PERPS_HOME_URL);
      await waitForFocusedRouteNames(rendered.container, [
        { name: Routes.ONBOARDING.HOME_NAV },
        { name: Routes.PERPS.ROOT },
        { name: Routes.PERPS.PERPS_HOME },
      ]);

      await goBack(rendered.container);

      await waitFor(() => {
        expect(namesOf(rendered?.getFocusedPath() ?? [])).toEqual(
          WALLET_TAB_PATH,
        );
      });
    });

    it('normal: trending?screen=stocks returns to Explore, not the tab the user came from', async () => {
      rendered = await renderDeeplinkNavigation({ start: { tab: 'wallet' } });
      await openNormal(STOCKS_URL);
      await waitForFocusedRouteNames(rendered.container, [
        { name: Routes.ONBOARDING.HOME_NAV },
        { name: Routes.WALLET.RWA_TOKENS_FULL_VIEW },
      ]);

      await goBack(rendered.container);

      await waitFor(() => {
        expect(namesOf(rendered?.getFocusedPath() ?? [])).toEqual(
          EXPLORE_TAB_PATH,
        );
      });
    });

    it('startup: trending?screen=stocks returns to Explore', async () => {
      rendered = await renderDeeplinkNavigation({ start: 'before-home-nav' });
      await openStartup(STOCKS_URL);
      await waitForFocusedRouteNames(rendered.container, [
        { name: Routes.ONBOARDING.HOME_NAV },
        { name: Routes.WALLET.RWA_TOKENS_FULL_VIEW },
      ]);

      await goBack(rendered.container);

      await waitFor(() => {
        expect(namesOf(rendered?.getFocusedPath() ?? [])).toEqual(
          EXPLORE_TAB_PATH,
        );
      });
    });

    it('startup: a non-Wallet home tab keeps Wallet in history', async () => {
      rendered = await renderDeeplinkNavigation({ start: 'before-home-nav' });
      await openStartup(REWARDS_URL);
      await waitForFocusedRouteNames(rendered.container, [
        { name: Routes.ONBOARDING.HOME_NAV },
        { name: Routes.HOME_TABS },
        { name: Routes.REWARDS_VIEW },
      ]);

      await goBack(rendered.container);

      await waitFor(() => {
        expect(namesOf(rendered?.getFocusedPath() ?? [])).toEqual(
          WALLET_TAB_PATH,
        );
      });
    });
  });

  describe('prepare effects on the renderer store', () => {
    const REWARDS_WITH_REFERRAL =
      'https://link.metamask.io/rewards?referral=TESTCODE&page=benefits';
    const REWARDS_BARE = 'https://link.metamask.io/rewards';
    const SWAP_URL = 'https://link.metamask.io/swap';

    it('normal: rewards stores the referral code and pending page', async () => {
      rendered = await renderDeeplinkNavigation();
      const { rewards: before } = rendered.store.getState();
      expect(before.onboardingReferralCode).toBeNull();

      await openNormal(REWARDS_WITH_REFERRAL);
      await waitForFocusedRouteNames(rendered.container, [
        { name: Routes.ONBOARDING.HOME_NAV },
        { name: Routes.HOME_TABS },
        { name: Routes.REWARDS_VIEW },
      ]);

      await waitFor(() => {
        const { rewards } = rendered?.store.getState() ?? {};
        expect(rewards?.onboardingReferralCode).toBe('TESTCODE');
        expect(rewards?.pendingDeeplink).toEqual({
          page: 'benefits',
          campaign: undefined,
        });
      });
    });

    it('startup: rewards stores the referral code and pending page', async () => {
      rendered = await renderDeeplinkNavigation({ start: 'before-home-nav' });

      await openStartup(REWARDS_WITH_REFERRAL);
      await waitForFocusedRouteNames(rendered.container, [
        { name: Routes.ONBOARDING.HOME_NAV },
        { name: Routes.HOME_TABS },
        { name: Routes.REWARDS_VIEW },
      ]);

      await waitFor(() => {
        const { rewards } = rendered?.store.getState() ?? {};
        expect(rewards?.onboardingReferralCode).toBe('TESTCODE');
        expect(rewards?.pendingDeeplink).toEqual({
          page: 'benefits',
          campaign: undefined,
        });
      });
    });

    it('normal: a bare rewards link clears stale referral and pending values', async () => {
      rendered = await renderDeeplinkNavigation({
        state: initialStateDeeplinks('rewards-stale'),
      });
      expect(rendered.store.getState().rewards.onboardingReferralCode).toBe(
        'STALE_REFERRAL',
      );

      await openNormal(REWARDS_BARE);
      await waitForFocusedRouteNames(rendered.container, [
        { name: Routes.ONBOARDING.HOME_NAV },
        { name: Routes.HOME_TABS },
        { name: Routes.REWARDS_VIEW },
      ]);

      await waitFor(() => {
        const { rewards } = rendered?.store.getState() ?? {};
        expect(rewards?.onboardingReferralCode).toBeNull();
        expect(rewards?.pendingDeeplink).toBeNull();
      });
    });

    it('normal: swap resets the pre-seeded bridge session', async () => {
      rendered = await renderDeeplinkNavigation({
        state: initialStateDeeplinks('swap-session-seeded'),
      });
      expect(rendered.store.getState().bridge.sourceAmount).toBe('42');

      await openNormal(SWAP_URL);
      await waitForFocusedRouteNames(rendered.container, [
        { name: Routes.ONBOARDING.HOME_NAV },
        { name: Routes.BRIDGE.ROOT },
        { name: Routes.BRIDGE.BRIDGE_VIEW },
      ]);

      await waitFor(() => {
        const { bridge } = rendered?.store.getState() ?? {};
        expect(bridge?.sourceAmount).toBeUndefined();
        expect(bridge?.isMaxSourceAmount).toBe(false);
      });
    });

    it('startup: swap resets the pre-seeded bridge session', async () => {
      rendered = await renderDeeplinkNavigation({
        state: initialStateDeeplinks('swap-session-seeded'),
        start: 'before-home-nav',
      });

      await openStartup(SWAP_URL);
      await waitForFocusedRouteNames(rendered.container, [
        { name: Routes.ONBOARDING.HOME_NAV },
        { name: Routes.BRIDGE.ROOT },
        { name: Routes.BRIDGE.BRIDGE_VIEW },
      ]);

      await waitFor(() => {
        const { bridge } = rendered?.store.getState() ?? {};
        expect(bridge?.sourceAmount).toBeUndefined();
        expect(bridge?.isMaxSourceAmount).toBe(false);
      });
    });

    it('binds every case to its own store', async () => {
      const first = await renderDeeplinkNavigation();
      const firstStore = first.store;
      first.cleanup();

      rendered = await renderDeeplinkNavigation();

      expect(rendered.store).not.toBe(firstStore);
    });
  });

  describe('real notification-settings destinations', () => {
    it('normal: the main page shows its toggle after the URI executes', async () => {
      rendered = await renderDeeplinkNavigation({ start: { tab: 'explore' } });

      await openNormal('https://link.metamask.io/notifications-settings');

      expect(
        await rendered.findByTestId(
          NotificationSettingsViewSelectorsIDs.NOTIFICATIONS_TOGGLE,
        ),
      ).toBeOnTheScreen();
      expect(namesOf(rendered.getFocusedPath())).toEqual([
        Routes.ONBOARDING.HOME_NAV,
        Routes.SETTINGS_VIEW,
        Routes.SETTINGS.NOTIFICATIONS,
      ]);
    });

    it('normal: section=price-alerts shows the section content', async () => {
      rendered = await renderDeeplinkNavigation({ start: { tab: 'explore' } });

      await openNormal(
        'https://link.metamask.io/notifications-settings?section=price-alerts',
      );

      expect(
        await rendered.findByTestId(
          NotificationSettingsViewSelectorsIDs.SECTION_SCROLL_VIEW,
        ),
      ).toBeOnTheScreen();
      expect(
        await rendered.findByText(
          strings('app_settings.notifications_opts.price_alerts_desc'),
        ),
      ).toBeOnTheScreen();
      expect(namesOf(rendered.getFocusedPath())).toEqual([
        Routes.ONBOARDING.HOME_NAV,
        Routes.SETTINGS_VIEW,
        Routes.SETTINGS.NOTIFICATION_SETTINGS_SECTION,
      ]);
    });

    it('startup: section=wallet-activity shows the section content', async () => {
      rendered = await renderDeeplinkNavigation({ start: 'before-home-nav' });

      await openStartup(
        'https://link.metamask.io/notifications-settings?section=wallet-activity',
      );

      expect(
        await rendered.findByTestId(
          NotificationSettingsViewSelectorsIDs.WALLET_ACTIVITY_LIST,
        ),
      ).toBeOnTheScreen();
      expect(namesOf(rendered.getFocusedPath())).toEqual([
        Routes.ONBOARDING.HOME_NAV,
        Routes.SETTINGS_VIEW,
        Routes.SETTINGS.NOTIFICATION_SETTINGS_SECTION,
      ]);
    });
  });

  describe('non-navigation outcomes', () => {
    itEach(NON_NAVIGATION_CASES)(
      'normal: $id settles without navigating',
      async (testCase) => {
        const alertSpy = jest
          .spyOn(Alert, 'alert')
          .mockImplementation(() => undefined);
        rendered = await renderDeeplinkNavigation({
          start: { tab: 'explore' },
        });
        const baseline = rendered.getFocusedPath();

        let outcome: unknown;
        await act(async () => {
          outcome = await parseDeeplink({
            deeplinkManager,
            url: testCase.url,
            origin: ORIGIN_EXTERNAL_DEEPLINK,
          });
        });
        await settleDeferredNavigation();

        expect(outcome).toBe(false);
        expect(alertSpy).toHaveBeenCalledTimes(testCase.alerts ? 1 : 0);
        expect(rendered.getFocusedPath()).toEqual(baseline);
        expect(
          rendered.queryByTestId(getRouteProbeTestId(Routes.PERPS.PERPS_HOME)),
        ).toBeNull();
      },
    );

    itEach(NON_NAVIGATION_CASES)(
      'startup: $id resolves to false and leaves navigation untouched',
      async (testCase) => {
        const alertSpy = jest
          .spyOn(Alert, 'alert')
          .mockImplementation(() => undefined);
        rendered = await renderDeeplinkNavigation({ start: 'before-home-nav' });
        const baseline = rendered.getFocusedPath();

        const outcome = await parseDeeplink({
          deeplinkManager,
          url: testCase.url,
          origin: ORIGIN_EXTERNAL_DEEPLINK,
          mode: 'resolve',
        });
        await settleDeferredNavigation();

        expect(outcome).toBe(false);
        expect(alertSpy).toHaveBeenCalledTimes(testCase.alerts ? 1 : 0);
        expect(rendered.getFocusedPath()).toEqual(baseline);
        expect(rendered.getFocusedPath().map(({ name }) => name)).toEqual([
          Routes.FOX_LOADER,
        ]);
      },
    );
  });
});
