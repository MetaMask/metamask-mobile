/**
 * Independent URI fixtures for the deeplink contract suites.
 *
 * Data only: no imports that initialize services or install mocks. Expected
 * outcomes are authored from the documented deeplink contract and the app's
 * navigator hierarchy — never derived by calling the parser or handlers.
 *
 * Consumers:
 * - `utils/parseDeeplink.routes.test.ts` (unit, resolve-mode contract)
 * - `DeeplinkManager.navigation.view.test.tsx` (component view, navigation)
 *
 * Maintenance policy: docs/readme/deeplinking.md ("Deeplink regression
 * coverage").
 */
import Routes from '../../../constants/navigation/Routes';

export type DeeplinkFixtureState =
  /** Unlocked existing account, mainnet, returning Perps user (Pro off), Predict redesign off, Rewards-tab layout. */
  | 'baseline'
  /** Baseline, but the Perps user has not completed the first-time flow. */
  | 'perps-first-time'
  /** Baseline with a stale referral code and pending Rewards deeplink already stored. */
  | 'rewards-stale'
  /** Baseline with a dirty Bridge session already stored. */
  | 'swap-session-seeded';

export type DeeplinkScheme = 'https' | 'metamask' | 'dapp';

/** Entry-surface origins passed to the parser (never user-controlled). */
export const ORIGIN_EXTERNAL_DEEPLINK = 'deeplink';
export const ORIGIN_CAROUSEL = 'carousel';

export interface ExpectedTarget {
  type: 'home-tab' | 'main-stack';
  routeName: string;
  /** Exact params, excluding the keys listed in `volatile`. */
  params?: Record<string, unknown>;
  backTab?: string;
}

/** A value asserted by type only (timestamps, trace ids). Path is dot-notation from `params`. */
export interface VolatileParam {
  path: string;
  type: 'number' | 'string';
}

export interface ExpectedFocusedRoute {
  name: string;
  /** Exact params on this route, excluding volatile keys; omit to skip. */
  params?: Record<string, unknown>;
}

export interface ExpectedNavigation {
  /**
   * Focused route chain from the root navigator down to the leaf. Params are
   * asserted where listed; navigator-generated fields are tolerated.
   */
  focusedPath: ExpectedFocusedRoute[];
  /** Volatile paths relative to the leaf route's params. */
  volatile?: VolatileParam[];
}

export interface DeeplinkExpectation {
  /** Independently authored intent target the resolve-mode contract must produce. */
  target: ExpectedTarget;
  /** Volatile paths relative to `target.params`. */
  volatile?: VolatileParam[];
  /** Whether the intent carries a `prepare()` side effect (state seeding before navigation). */
  hasPrepare: boolean;
  navigation: ExpectedNavigation;
}

export interface DeeplinkUriCase {
  id: string;
  /** Action under test (first path segment, or the dapp:// protocol). */
  action: string;
  scheme: DeeplinkScheme;
  url: string;
  state: DeeplinkFixtureState;
  origin: string;
  expected: DeeplinkExpectation;
  /** Deterministic external data the case needs (HTTP metadata, Engine chains). */
  boundary?: 'swap-source-token';
}

const HTTPS_BASE = 'https://link.metamask.io/';
const METAMASK_BASE = 'metamask://';

const HOME = Routes.ONBOARDING.HOME_NAV;
const TABS = Routes.HOME_TABS;
const WALLET_TAB = Routes.WALLET.HOME;
const EXPLORE_TAB = Routes.TRENDING_VIEW;

/** Focused chain for a home-tab destination whose tab stack has no nested leaf. */
const homeTabFocus = (
  tabName: string,
  leaf: ExpectedFocusedRoute[],
  tabParams?: Record<string, unknown>,
): ExpectedFocusedRoute[] => [
  { name: HOME },
  { name: TABS },
  tabParams ? { name: tabName, params: tabParams } : { name: tabName },
  ...leaf,
];

/** Focused chain for a main-stack destination. */
const mainStackFocus = (
  rest: ExpectedFocusedRoute[],
): ExpectedFocusedRoute[] => [{ name: HOME }, ...rest];

interface PathSpec {
  id: string;
  action: string;
  boundary?: DeeplinkUriCase['boundary'];
  /** Suffix appended to the https host and the metamask:// scheme. */
  path: string;
  state?: DeeplinkFixtureState;
  origin?: string;
  expected: DeeplinkExpectation;
}

const toCases = (spec: PathSpec): DeeplinkUriCase[] => [
  {
    id: `${spec.id} (https)`,
    action: spec.action,
    scheme: 'https',
    url: `${HTTPS_BASE}${spec.path}`,
    state: spec.state ?? 'baseline',
    origin: spec.origin ?? ORIGIN_EXTERNAL_DEEPLINK,
    expected: spec.expected,
    boundary: spec.boundary,
  },
  {
    id: `${spec.id} (metamask)`,
    action: spec.action,
    scheme: 'metamask',
    url: `${METAMASK_BASE}${spec.path}`,
    state: spec.state ?? 'baseline',
    origin: spec.origin ?? ORIGIN_EXTERNAL_DEEPLINK,
    expected: spec.expected,
    boundary: spec.boundary,
  },
];

const mainStackIntent = (
  target: Omit<ExpectedTarget, 'type'>,
  navigation: ExpectedNavigation,
  volatile?: VolatileParam[],
  hasPrepare = false,
): DeeplinkExpectation => ({
  target: { type: 'main-stack', ...target },
  navigation,
  volatile,
  hasPrepare,
});

const homeTabIntent = (
  target: Omit<ExpectedTarget, 'type'>,
  navigation: ExpectedNavigation,
  volatile?: VolatileParam[],
  hasPrepare = false,
): DeeplinkExpectation => ({
  target: { type: 'home-tab', ...target },
  navigation,
  volatile,
  hasPrepare,
});

const BTC_MARKET = {
  symbol: 'BTC',
  name: 'BTC',
  price: '0',
  change24h: '0',
  change24hPercent: '0',
  volume24h: '0',
  volume: '0',
  fundingRate: 0,
  openInterest: '0',
  maxLeverage: '100',
  logoUrl: '',
  nextFundingTime: 0,
  fundingIntervalHours: 8,
};

const TSLA_HIP3_MARKET = {
  ...BTC_MARKET,
  symbol: 'xyz:TSLA',
  name: 'TSLA',
  marketSource: 'xyz',
};

const DAPP_URL = 'https://example.org/path?value=hello%20world';
const DAPP_PARAMS = { newTabUrl: DAPP_URL, linkType: 'external-link' };
const DAPP_VOLATILE: VolatileParam[] = [
  { path: 'params.timestamp', type: 'number' },
];

const dappExpectation = homeTabIntent(
  {
    routeName: Routes.BROWSER.HOME,
    params: { screen: Routes.BROWSER.VIEW, params: DAPP_PARAMS },
  },
  {
    focusedPath: homeTabFocus(Routes.BROWSER.HOME, [
      { name: Routes.BROWSER.VIEW, params: DAPP_PARAMS },
    ]),
    volatile: [{ path: 'timestamp', type: 'number' }],
  },
  DAPP_VOLATILE,
);

const swapView = (
  params: Record<string, unknown>,
  extraVolatile: VolatileParam[] = [],
): DeeplinkExpectation =>
  mainStackIntent(
    {
      routeName: Routes.BRIDGE.ROOT,
      params: { screen: Routes.BRIDGE.BRIDGE_VIEW, params },
    },
    {
      focusedPath: mainStackFocus([
        { name: Routes.BRIDGE.ROOT },
        { name: Routes.BRIDGE.BRIDGE_VIEW, params },
      ]),
      volatile: [{ path: 'swapViewTraceId', type: 'string' }, ...extraVolatile],
    },
    [
      { path: 'params.swapViewTraceId', type: 'string' },
      ...extraVolatile.map(({ path, type }) => ({
        path: `params.${path}`,
        type,
      })),
    ],
    true,
  );

const SWAP_BASE_PARAMS = {
  sourcePage: 'deeplink',
  bridgeViewMode: 'Unified',
  location: 'Main View',
};

const perpsHome = (): DeeplinkExpectation =>
  mainStackIntent(
    {
      routeName: Routes.PERPS.ROOT,
      params: {
        screen: Routes.PERPS.PERPS_HOME,
        params: { source: 'deeplink' },
      },
    },
    {
      focusedPath: mainStackFocus([
        { name: Routes.PERPS.ROOT },
        { name: Routes.PERPS.PERPS_HOME, params: { source: 'deeplink' } },
      ]),
    },
  );

const perpsWalletTab = (): DeeplinkExpectation =>
  homeTabIntent(
    {
      routeName: WALLET_TAB,
      params: { initialTab: 'perps', shouldSelectPerpsTab: true },
    },
    {
      focusedPath: homeTabFocus(WALLET_TAB, [{ name: Routes.WALLET_VIEW }], {
        initialTab: 'perps',
        shouldSelectPerpsTab: true,
      }),
    },
  );

const perpsAsset = (market: Record<string, unknown>): DeeplinkExpectation =>
  mainStackIntent(
    {
      routeName: Routes.PERPS.ROOT,
      params: {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: { source: 'deeplink', market },
      },
    },
    {
      focusedPath: mainStackFocus([
        { name: Routes.PERPS.ROOT },
        {
          name: Routes.PERPS.MARKET_DETAILS,
          params: { source: 'deeplink', market },
        },
      ]),
    },
  );

const predictMarketList = (entryPoint: string): DeeplinkExpectation =>
  mainStackIntent(
    {
      routeName: Routes.PREDICT.ROOT,
      params: { screen: Routes.PREDICT.MARKET_LIST, params: { entryPoint } },
    },
    {
      focusedPath: mainStackFocus([
        { name: Routes.PREDICT.ROOT },
        { name: Routes.PREDICT.MARKET_LIST, params: { entryPoint } },
      ]),
    },
  );

const predictMarketDetails = (entryPoint: string): DeeplinkExpectation =>
  mainStackIntent(
    {
      routeName: Routes.PREDICT.ROOT,
      params: {
        screen: Routes.PREDICT.MARKET_DETAILS,
        params: { marketId: 'TEST_MARKET', entryPoint },
      },
    },
    {
      focusedPath: mainStackFocus([
        { name: Routes.PREDICT.ROOT },
        {
          name: Routes.PREDICT.MARKET_DETAILS,
          params: { marketId: 'TEST_MARKET', entryPoint },
        },
      ]),
    },
  );

const notificationsMain = (): DeeplinkExpectation =>
  mainStackIntent(
    {
      routeName: Routes.SETTINGS_VIEW,
      params: { screen: Routes.SETTINGS.NOTIFICATIONS },
    },
    {
      focusedPath: mainStackFocus([
        { name: Routes.SETTINGS_VIEW },
        { name: Routes.SETTINGS.NOTIFICATIONS },
      ]),
    },
  );

const notificationsSection = (
  type: 'walletActivity' | 'priceAlerts',
): DeeplinkExpectation =>
  mainStackIntent(
    {
      routeName: Routes.SETTINGS_VIEW,
      params: {
        screen: Routes.SETTINGS.NOTIFICATION_SETTINGS_SECTION,
        params: { type },
      },
    },
    {
      focusedPath: mainStackFocus([
        { name: Routes.SETTINGS_VIEW },
        {
          name: Routes.SETTINGS.NOTIFICATION_SETTINGS_SECTION,
          params: { type },
        },
      ]),
    },
  );

const rewardsDestination = (): DeeplinkExpectation =>
  homeTabIntent(
    { routeName: Routes.REWARDS_VIEW },
    { focusedPath: homeTabFocus(Routes.REWARDS_VIEW, []) },
    undefined,
    true,
  );

const trendingTab = (): DeeplinkExpectation =>
  homeTabIntent(
    { routeName: EXPLORE_TAB },
    { focusedPath: homeTabFocus(EXPLORE_TAB, []) },
  );

export const DEEPLINK_URI_CASES: readonly DeeplinkUriCase[] = [
  // dapp
  ...toCases({
    id: 'dapp with path and encoded query',
    action: 'dapp',
    path: 'dapp/example.org/path?value=hello%20world',
    expected: dappExpectation,
  }),
  {
    id: 'dapp protocol (dapp)',
    action: 'dapp',
    scheme: 'dapp',
    url: 'dapp://example.org/path?value=hello%20world',
    state: 'baseline',
    origin: ORIGIN_EXTERNAL_DEEPLINK,
    expected: dappExpectation,
  },

  // rewards
  ...toCases({
    id: 'rewards with referral and page',
    action: 'rewards',
    path: 'rewards?referral=TESTCODE&page=benefits',
    expected: rewardsDestination(),
  }),
  ...toCases({
    id: 'rewards bare over stale stored values',
    action: 'rewards',
    path: 'rewards',
    state: 'rewards-stale',
    expected: rewardsDestination(),
  }),

  // perps
  ...toCases({
    id: 'perps bare',
    action: 'perps',
    path: 'perps',
    expected: perpsWalletTab(),
  }),
  ...toCases({
    id: 'perps screen=home',
    action: 'perps',
    path: 'perps?screen=home',
    expected: perpsHome(),
  }),
  ...toCases({
    id: 'perps screen=markets',
    action: 'perps',
    path: 'perps?screen=markets',
    expected: perpsHome(),
  }),
  ...toCases({
    id: 'perps-markets alias (selects Wallet perps tab, not Perps root)',
    action: 'perps-markets',
    path: 'perps-markets',
    expected: perpsWalletTab(),
  }),
  ...toCases({
    id: 'perps-asset lowercase symbol',
    action: 'perps-asset',
    path: 'perps-asset?symbol=btc',
    expected: perpsAsset(BTC_MARKET),
  }),
  ...toCases({
    id: 'perps-asset HIP-3 encoded symbol',
    action: 'perps-asset',
    path: 'perps-asset?symbol=xyz%3Atsla',
    expected: perpsAsset(TSLA_HIP3_MARKET),
  }),
  ...toCases({
    id: 'perps-asset missing symbol falls back to Perps home',
    action: 'perps-asset',
    path: 'perps-asset?symbol=',
    expected: perpsHome(),
  }),
  ...toCases({
    id: 'perps-asset first-time user goes to tutorial',
    action: 'perps-asset',
    path: 'perps-asset?symbol=BTC',
    state: 'perps-first-time',
    expected: mainStackIntent(
      {
        routeName: Routes.PERPS.TUTORIAL,
        params: { isFromDeeplink: true },
      },
      {
        focusedPath: mainStackFocus([
          { name: Routes.PERPS.TUTORIAL, params: { isFromDeeplink: true } },
        ]),
      },
    ),
  }),
  ...toCases({
    id: 'perps-outreach',
    action: 'perps-outreach',
    path: 'perps-outreach',
    expected: mainStackIntent(
      {
        routeName: Routes.PERPS.MODALS.ROOT,
        params: { screen: Routes.PERPS.MODALS.OUTREACH_DETAILS },
      },
      {
        focusedPath: mainStackFocus([
          { name: Routes.PERPS.MODALS.ROOT },
          { name: Routes.PERPS.MODALS.OUTREACH_DETAILS },
        ]),
      },
    ),
  }),

  // swap
  ...toCases({
    id: 'swap bare',
    action: 'swap',
    path: 'swap',
    state: 'swap-session-seeded',
    expected: swapView(SWAP_BASE_PARAMS),
  }),
  ...toCases({
    id: 'swap tab=limit',
    action: 'swap',
    path: 'swap?tab=limit',
    expected: swapView({ ...SWAP_BASE_PARAMS, initialTab: 'limit' }),
  }),

  ...toCases({
    id: 'swap with source token and atomic amount',
    action: 'swap',
    path: 'swap?from=eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&amount=1500000',
    boundary: 'swap-source-token',
    expected: swapView(
      {
        ...SWAP_BASE_PARAMS,
        sourceToken: {
          address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
          chainId: '0x1',
        },
        sourceAmount: '1.5',
      },
      [{ path: 'sourceToken.image', type: 'string' }],
    ),
  }),

  // predict
  ...toCases({
    id: 'predict bare',
    action: 'predict',
    path: 'predict',
    expected: predictMarketList('deeplink'),
  }),
  ...toCases({
    id: 'predict market',
    action: 'predict',
    path: 'predict?market=TEST_MARKET',
    expected: predictMarketDetails('deeplink'),
  }),
  ...toCases({
    id: 'predict bare from carousel origin',
    action: 'predict',
    path: 'predict',
    origin: ORIGIN_CAROUSEL,
    expected: predictMarketList('carousel'),
  }),
  ...toCases({
    id: 'predict market from carousel origin',
    action: 'predict',
    path: 'predict?market=TEST_MARKET',
    origin: ORIGIN_CAROUSEL,
    expected: predictMarketDetails('carousel'),
  }),

  // trending
  ...toCases({
    id: 'trending bare',
    action: 'trending',
    path: 'trending',
    expected: trendingTab(),
  }),
  ...toCases({
    id: 'trending tab=crypto',
    action: 'trending',
    path: 'trending?tab=crypto',
    expected: homeTabIntent(
      {
        routeName: EXPLORE_TAB,
        params: { initialTab: 3, source: 'deeplink' },
      },
      {
        focusedPath: homeTabFocus(EXPLORE_TAB, [], {
          initialTab: 3,
          source: 'deeplink',
        }),
      },
    ),
  }),
  ...toCases({
    id: 'trending screen=stocks',
    action: 'trending',
    path: 'trending?screen=stocks',
    expected: {
      hasPrepare: false,
      target: {
        type: 'main-stack',
        routeName: Routes.WALLET.RWA_TOKENS_FULL_VIEW,
        backTab: EXPLORE_TAB,
      },
      navigation: {
        focusedPath: mainStackFocus([
          { name: Routes.WALLET.RWA_TOKENS_FULL_VIEW },
        ]),
      },
    },
  }),
  ...toCases({
    id: 'trending screen=search with encoded query',
    action: 'trending',
    path: 'trending?screen=search&q=hello%20world',
    expected: {
      hasPrepare: false,
      target: {
        type: 'main-stack',
        routeName: Routes.EXPLORE_SEARCH,
        params: { initialQuery: 'hello world', entryPoint: 'deeplink' },
        backTab: EXPLORE_TAB,
      },
      navigation: {
        focusedPath: mainStackFocus([
          {
            name: Routes.EXPLORE_SEARCH,
            params: { initialQuery: 'hello world', entryPoint: 'deeplink' },
          },
        ]),
      },
    },
  }),

  // notifications-settings
  ...toCases({
    id: 'notifications-settings main page',
    action: 'notifications-settings',
    path: 'notifications-settings',
    expected: notificationsMain(),
  }),
  ...toCases({
    id: 'notifications-settings section=wallet-activity',
    action: 'notifications-settings',
    path: 'notifications-settings?section=wallet-activity',
    expected: notificationsSection('walletActivity'),
  }),
  ...toCases({
    id: 'notifications-settings section=price-alerts',
    action: 'notifications-settings',
    path: 'notifications-settings?section=price-alerts',
    expected: notificationsSection('priceAlerts'),
  }),
  ...toCases({
    id: 'notifications-settings unknown section falls back to main page',
    action: 'notifications-settings',
    path: 'notifications-settings?section=unknown',
    expected: notificationsMain(),
  }),
];

export const NON_NAVIGATION_CASES: readonly {
  id: string;
  url: string;
  /** True when the existing alert boundary is expected to fire. */
  alerts: boolean;
}[] = [
  {
    id: 'unsupported scheme',
    url: 'unsupported-test://example',
    alerts: false,
  },
  { id: 'malformed https URL', url: 'https://', alerts: true },
];
