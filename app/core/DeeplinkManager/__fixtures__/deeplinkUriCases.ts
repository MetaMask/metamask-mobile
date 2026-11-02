/**
 * Shared URI fixtures for the deeplink contract suites.
 *
 * Platform owns types, authoring helpers, and a small set of exemplars that
 * exercise each harness concern. Feature teams (and their agents) append rows
 * for their actions — expectations authored from the contract, never by calling
 * the parser or handlers.
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
const EXPLORE_TAB = Routes.TRENDING_VIEW;

/** Focused chain for a home-tab destination whose tab stack has no nested leaf. */
export const homeTabFocus = (
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
export const mainStackFocus = (
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

/** Duplicate a logical case across https and metamask://. */
export const toCases = (spec: PathSpec): DeeplinkUriCase[] => [
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

export const mainStackIntent = (
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

export const homeTabIntent = (
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

const SWAP_BASE_PARAMS = {
  sourcePage: 'deeplink',
  bridgeViewMode: 'Unified',
  location: 'Main View',
};

/**
 * Exemplars only — one row (or scheme pair) per harness concern.
 * Feature teams append their own PathSpecs / rows below these.
 */
export const DEEPLINK_URI_CASES: readonly DeeplinkUriCase[] = [
  // home-tab + volatile params + https/metamask pair via toCases
  ...toCases({
    id: 'dapp with path and encoded query',
    action: 'dapp',
    path: 'dapp/example.org/path?value=hello%20world',
    expected: dappExpectation,
  }),
  // alternate scheme (dapp://)
  {
    id: 'dapp protocol (dapp)',
    action: 'dapp',
    scheme: 'dapp',
    url: 'dapp://example.org/path?value=hello%20world',
    state: 'baseline',
    origin: ORIGIN_EXTERNAL_DEEPLINK,
    expected: dappExpectation,
  },

  // main-stack nested destination (https only — schemes already shown above)
  {
    id: 'perps screen=home (https)',
    action: 'perps',
    scheme: 'https',
    url: `${HTTPS_BASE}perps?screen=home`,
    state: 'baseline',
    origin: ORIGIN_EXTERNAL_DEEPLINK,
    expected: mainStackIntent(
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
    ),
  },

  // prepare() side effect
  {
    id: 'rewards with referral and page (https)',
    action: 'rewards',
    scheme: 'https',
    url: `${HTTPS_BASE}rewards?referral=TESTCODE&page=benefits`,
    state: 'baseline',
    origin: ORIGIN_EXTERNAL_DEEPLINK,
    expected: homeTabIntent(
      { routeName: Routes.REWARDS_VIEW },
      { focusedPath: homeTabFocus(Routes.REWARDS_VIEW, []) },
      undefined,
      true,
    ),
  },

  // boundary (HTTP + Engine) + prepare + volatile leaf field
  {
    id: 'swap with source token and atomic amount (https)',
    action: 'swap',
    scheme: 'https',
    url: `${HTTPS_BASE}swap?from=eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&amount=1500000`,
    state: 'baseline',
    origin: ORIGIN_EXTERNAL_DEEPLINK,
    boundary: 'swap-source-token',
    expected: mainStackIntent(
      {
        routeName: Routes.BRIDGE.ROOT,
        params: {
          screen: Routes.BRIDGE.BRIDGE_VIEW,
          params: {
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
        },
      },
      {
        focusedPath: mainStackFocus([
          { name: Routes.BRIDGE.ROOT },
          {
            name: Routes.BRIDGE.BRIDGE_VIEW,
            params: {
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
          },
        ]),
        volatile: [
          { path: 'swapViewTraceId', type: 'string' },
          { path: 'sourceToken.image', type: 'string' },
        ],
      },
      [
        { path: 'params.swapViewTraceId', type: 'string' },
        { path: 'params.sourceToken.image', type: 'string' },
      ],
      true,
    ),
  },

  // explicit backTab on main-stack
  {
    id: 'trending screen=stocks (https)',
    action: 'trending',
    scheme: 'https',
    url: `${HTTPS_BASE}trending?screen=stocks`,
    state: 'baseline',
    origin: ORIGIN_EXTERNAL_DEEPLINK,
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
  },
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
