/*
 * Marketing-consent integration-test harness.
 *
 * Runs the real client marketing-consent wiring mobile main uses today. There
 * is no core `MarketingConsentController` package mobile can consume yet: the
 * consent state machine lives in `@metamask/analytics-controller`
 * (`optInToMarketing` / `optOutOfMarketing` / `resetMarketingConsentDecision`),
 * the remote write lives in `OAuthService`, and the app couples them through
 * the `marketingAttribution` saga and the Redux `security` slice.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * REAL (runs production code paths):
 *   - `AnalyticsController` (`@metamask/analytics-controller`) — consent
 *     state machine, the `identify` / `trackEvent` consent gating (the AND
 *     rule: payloads only reach the platform adapter when the purpose's
 *     consent is opted in), and its production messenger layout — the same
 *     `AnalyticsController` child-messenger + delegation the `@metamask/wallet`
 *     instance builder installs
 *   - `app/util/analytics/analytics.ts` — the real app analytics entry point
 *     and its real queue manager. Required fresh per harness build via
 *     `jest.isolateModulesAsync` so the module-level singleton binds to THIS
 *     build's messenger instead of the first one in the file.
 *   - `watchMarketingAttributionOnConsentChange` — the production saga that
 *     copies the Redux marketing preference into AnalyticsController consent
 *     and clears attribution on opt-out
 *   - `backfillSocialLoginMarketingConsentSaga` — the production social-login
 *     consent backfill (started per test via `startBackfillSaga`)
 *   - A real Redux store built from the real `security`, `engine`,
 *     `attribution` and `onboarding` reducers; consent reads go through the
 *     real selectors (`selectAnalyticsOptedInToMarketing`,
 *     `selectAnalyticsEnabled`)
 *   - `OAuthService` singleton — `updateMarketingOptInStatus` /
 *     `getMarketingOptInStatus` (real fetch + token handling)
 *   - `AnalyticsEventBuilder`, `MetaMetricsEvents`, `UserProfileProperty`
 *
 * MOCKED (the I/O boundary + documented app-shell glue — never real network):
 *   - `platformAdapter` — Segment/Braze HTTP delivery, the controller's
 *     network boundary
 *   - `global fetch` — the auth-server marketing opt-in API
 *   - `app/core/Engine/Engine` (+ its index re-export) — Engine shim:
 *     `context.SeedlessOnboardingController.getAccessToken` (OAuth token I/O),
 *     `controllerMessenger` (Engine's controller messenger), `state` (the
 *     Engine state read behind `analytics.isEnabled()`)
 *   - `app/store` — the app store singleton is not constructible in jest;
 *     the shim exposes this build's real minimal store to `store.getState()`
 *     readers
 *   - `app/util/analytics/analyticsId` — MMKV storage boundary (unused by the
 *     consent flows)
 * ─────────────────────────────────────────────────────────────────────────
 *
 * NOT WIRED (pending the core MarketingConsentController / AUS migration):
 *   - There is no remote "user storage" consent record in mobile main yet —
 *     the only remote consent surface is the auth-server marketing opt-in
 *     endpoint exercised here.
 *   - The settings screen composition (`MetaMetricsAndDataCollectionSection`)
 *     and the push-onboarding consent path stay with component-view tests.
 *
 * USAGE — see also tests/integration/AGENTS.md
 *
 *     import { buildMarketingConsentHarness } from
 *       '../../../../tests/integration/harnesses/marketing-consent/marketing-consent';
 *     import { setDataCollectionForMarketing } from 'app/actions/security';
 *
 *     const harness = await buildMarketingConsentHarness();
 *     harness.store.dispatch(setDataCollectionForMarketing(true));
 *     await harness.waitFor(
 *       () => harness.analyticsController.state.optedInToMarketing === true,
 *     );
 *     expect(harness.store.getState().security.dataCollectionForMarketing)
 *       .toBe(true);
 */

import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import {
  AnalyticsController,
  getDefaultAnalyticsControllerState,
  type AnalyticsControllerMessenger,
  type AnalyticsControllerState,
  type AnalyticsPlatformAdapter,
} from '@metamask/analytics-controller';
import { configureStore, type Middleware } from '@reduxjs/toolkit';
import createSagaMiddleware, { type Task } from 'redux-saga';
import type { Reducer } from 'redux';

import attributionReducer, {
  type AttributionState,
} from '../../../../app/core/redux/slices/attribution';
import engineReducer, {
  initBgState,
  updateBgState,
} from '../../../../app/core/redux/slices/engine';
import securityReducer, {
  initialState as securityInitialState,
} from '../../../../app/reducers/security';
import onboardingReducer, {
  type OnboardingState,
} from '../../../../app/reducers/onboarding';
import { SecuritySettingsState } from '../../../../app/actions/security/state';
import OAuthService from '../../../../app/core/OAuthService/OAuthService';
import {
  AuthServerUrl,
  AUTH_SERVER_MARKETING_OPT_IN_PATH,
} from '../../../../app/core/OAuthService/OAuthLoginHandlers/constants';
import type { AnalyticsHelper } from '../../../../app/util/analytics/analytics';

type WatchMarketingAttributionOnConsentChange =
  (typeof import('../../../../app/store/sagas/marketingAttribution'))['watchMarketingAttributionOnConsentChange'];
type BackfillSocialLoginMarketingConsentSaga =
  (typeof import('../../../../app/store/sagas/backfillSocialLoginMarketingConsent'))['backfillSocialLoginMarketingConsentSaga'];

type MarketingConsentHarnessRootMessenger = Messenger<
  MockAnyNamespace,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any
>;

interface SeedlessOnboardingContextShim {
  getAccessToken: jest.Mock;
}

interface MarketingConsentEngineShim {
  context: Record<string, SeedlessOnboardingContextShim>;
  controllerMessenger: MarketingConsentHarnessRootMessenger | null;
  analyticsController: AnalyticsController | null;
  readonly state: Record<string, unknown>;
}

/**
 * Engine shim read through the mocked `app/core/Engine` module. Reassigned on
 * every harness build so the lazily-required Engine always answers with the
 * build that is under test.
 */
const mockEngineShim: MarketingConsentEngineShim = {
  context: {
    SeedlessOnboardingController: {
      getAccessToken: jest.fn(),
    },
  },
  controllerMessenger: null,
  analyticsController: null,
  get state() {
    const controller = this.analyticsController;
    return { AnalyticsController: controller ? controller.state : {} };
  },
};

const mockStoreHolder: { store: MarketingConsentStore | null } = {
  store: null,
};

// The app store singleton runs the app bootstrap IIFE on import; the shim
// keeps `store.getState()` readers pointed at the harness's real store.
jest.mock('../../../../app/core/Engine/Engine', () => ({
  __esModule: true,
  default: {
    get context() {
      return mockEngineShim.context;
    },
    get controllerMessenger() {
      return mockEngineShim.controllerMessenger;
    },
    get state() {
      return mockEngineShim.state;
    },
  },
}));

jest.mock('../../../../app/core/Engine', () => ({
  __esModule: true,
  default: {
    get context() {
      return mockEngineShim.context;
    },
    get controllerMessenger() {
      return mockEngineShim.controllerMessenger;
    },
    get state() {
      return mockEngineShim.state;
    },
  },
}));

jest.mock('../../../../app/store', () => ({
  __esModule: true,
  get store() {
    return mockStoreHolder.store;
  },
}));

// MMKV-backed identity storage is outside the consent flows under test.
jest.mock('../../../../app/util/analytics/analyticsId', () => ({
  getAnalyticsId: jest
    .fn()
    .mockResolvedValue('11111111-2222-4333-8444-555555555555'),
}));

/** Valid UUIDv4 analytics identity for the harness controller. */
export const HARNESS_ANALYTICS_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
export const HARNESS_SEEDLESS_ACCESS_TOKEN = 'test-seedless-access-token';

/** The real auth-server marketing opt-in endpoint mobile writes to. */
export const AUTH_SERVER_MARKETING_OPT_IN_URL = `${AuthServerUrl}${AUTH_SERVER_MARKETING_OPT_IN_PATH}`;

export interface RecordedFetchCall {
  url: string;
  method: string;
  headers: unknown;
  body: string;
}

export interface PlatformAdapterMocks {
  track: jest.Mock;
  identify: jest.Mock;
  view: jest.Mock;
  onSetupCompleted: jest.Mock;
}

export interface MarketingConsentStoreState {
  engine: { backgroundState: Record<string, unknown> };
  security: SecuritySettingsState;
  attribution: AttributionState;
  onboarding: OnboardingState;
}

export interface MarketingConsentStore {
  getState(): MarketingConsentStoreState;
  dispatch(action: { type: string }): unknown;
}

export interface AuthServerResponseOverride {
  /** HTTP status the marketing opt-in POST answers with (default 200). */
  postStatus?: number;
  /** JSON the marketing opt-in GET answers with (default `{}`). */
  getJson?: unknown;
}

export interface MarketingConsentHarnessOptions {
  /** AnalyticsController state of the "previous session", for restart tests. */
  persistedControllerState?: Partial<AnalyticsControllerState>;
  /** Preloaded Redux security slice (the persisted user preference). */
  persistedSecurityState?: Partial<SecuritySettingsState>;
  /** Access token the shimmed seedless context returns. */
  seedlessAccessToken?: string;
}

export interface MarketingConsentHarness {
  analyticsController: AnalyticsController;
  controllerMessenger: AnalyticsControllerMessenger;
  rootMessenger: MarketingConsentHarnessRootMessenger;
  /** The real app analytics entry point, bound to this build. */
  analytics: AnalyticsHelper;
  /** The real OAuthService singleton (remote consent sync). */
  oauthService: typeof OAuthService;
  store: MarketingConsentStore;
  /** Runs the production social-login consent backfill saga. */
  startBackfillSaga: () => Task;
  /** Recorded `fetch` calls to the auth-server marketing opt-in endpoint. */
  marketingOptInCalls: () => RecordedFetchCall[];
  setAuthServerResponse: (override: AuthServerResponseOverride) => void;
  waitFor: (condition: () => boolean, timeoutMs?: number) => Promise<void>;
  mocks: {
    platformAdapter: PlatformAdapterMocks;
    fetch: jest.Mock;
    getAccessToken: jest.Mock;
  };
}

function httpResponse({
  status = 200,
  json = {},
}: {
  status?: number;
  json?: unknown;
}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => json,
    text: async () => JSON.stringify(json),
  };
}

function toUrlString(input: unknown): string {
  if (typeof input === 'string') {
    return input;
  }
  if (input instanceof URL) {
    return input.href;
  }
  const request = input as { url?: string };
  return request?.url ?? '';
}

export async function buildMarketingConsentHarness(
  options: MarketingConsentHarnessOptions = {},
): Promise<MarketingConsentHarness> {
  // --- Real AnalyticsController on the production messenger layout --------
  const rootMessenger = new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  }) as MarketingConsentHarnessRootMessenger;

  const controllerMessenger = new Messenger({
    namespace: 'AnalyticsController',
    parent: rootMessenger,
  }) as unknown as AnalyticsControllerMessenger;

  rootMessenger.delegate({
    messenger: controllerMessenger,
    actions: [
      'ConfigRegistryController:getState',
      'GeolocationController:getGeolocationData',
    ],
    events: ['ConfigRegistryController:stateChanged'],
  });

  const platformAdapter: PlatformAdapterMocks = {
    track: jest.fn(),
    identify: jest.fn(),
    view: jest.fn(),
    onSetupCompleted: jest.fn(),
  };

  const defaultControllerState = getDefaultAnalyticsControllerState();
  const analyticsController = new AnalyticsController({
    messenger: controllerMessenger,
    state: {
      ...defaultControllerState,
      ...options.persistedControllerState,
      analyticsId:
        options.persistedControllerState?.analyticsId ?? HARNESS_ANALYTICS_ID,
    },
    platformAdapter: platformAdapter as unknown as AnalyticsPlatformAdapter,
    isAnonymousEventsFeatureEnabled: true,
    isGeolocationEnabled: false,
  });

  // --- Real minimal Redux store (production reducers) ---------------------
  const sagaMiddleware = createSagaMiddleware();
  const reducerMap = {
    engine: engineReducer,
    security: securityReducer,
    attribution: attributionReducer,
    onboarding: onboardingReducer,
  } as unknown as Record<string, Reducer>;
  const reduxStore = configureStore({
    reducer: reducerMap,
    preloadedState: {
      security: {
        ...securityInitialState,
        ...options.persistedSecurityState,
      },
    },
    middleware: (getDefaultMiddleware) =>
      [
        ...getDefaultMiddleware({ thunk: false, serializableCheck: false }),
        sagaMiddleware,
      ] as unknown as Middleware[],
  });

  // Engine → Redux state sync (production dispatches UPDATE_BG_STATE the same
  // way from the EngineService batcher).
  reduxStore.dispatch(initBgState());
  controllerMessenger.subscribe('AnalyticsController:stateChange', () => {
    reduxStore.dispatch(updateBgState({ key: 'AnalyticsController' }));
  });

  // --- App-shell glue installation ----------------------------------------
  mockEngineShim.controllerMessenger = rootMessenger;
  mockEngineShim.analyticsController = analyticsController;
  mockEngineShim.context.SeedlessOnboardingController.getAccessToken = jest
    .fn()
    .mockResolvedValue(
      options.seedlessAccessToken ?? HARNESS_SEEDLESS_ACCESS_TOKEN,
    );

  // --- Auth-server HTTP boundary ------------------------------------------
  const authServerResponse = {
    postStatus: 200,
    getJson: {} as unknown,
  };

  const fetchMock = jest.fn(async (input: unknown, init?: RequestInit) => {
    const url = toUrlString(input);
    if (url.includes(AUTH_SERVER_MARKETING_OPT_IN_PATH)) {
      if ((init?.method ?? 'GET') === 'POST') {
        return httpResponse({ status: authServerResponse.postStatus });
      }
      return httpResponse({ status: 200, json: authServerResponse.getJson });
    }
    return httpResponse({});
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;

  // --- Fresh app analytics singleton + sagas for this build ---------------
  let freshAnalytics!: AnalyticsHelper;
  let consentWatcher!: WatchMarketingAttributionOnConsentChange;
  let backfillSaga!: BackfillSocialLoginMarketingConsentSaga;

  await jest.isolateModulesAsync(async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const analyticsModule = require('../../../../app/util/analytics/analytics');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const consentSagaModule = require('../../../../app/store/sagas/marketingAttribution');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const backfillSagaModule = require('../../../../app/store/sagas/backfillSocialLoginMarketingConsent');
    freshAnalytics = analyticsModule.analytics;
    consentWatcher = consentSagaModule.watchMarketingAttributionOnConsentChange;
    backfillSaga = backfillSagaModule.backfillSocialLoginMarketingConsentSaga;
  });

  mockStoreHolder.store = reduxStore as unknown as MarketingConsentStore;

  // The production rootSaga mounts this watcher; the harness mounts the real
  // one on this build's store so consent writes flow redux → controller.
  sagaMiddleware.run(consentWatcher);

  const marketingOptInCalls = () =>
    (fetchMock.mock.calls as unknown as [string, RequestInit?][]).reduce(
      (calls: RecordedFetchCall[], [url, requestInit]) => {
        const requestUrl = toUrlString(url);
        if (!requestUrl.includes(AUTH_SERVER_MARKETING_OPT_IN_PATH)) {
          return calls;
        }
        const resolvedInit = requestInit ?? {};
        return [
          ...calls,
          {
            url: requestUrl,
            method: resolvedInit.method ?? 'GET',
            headers: resolvedInit.headers,
            body:
              typeof resolvedInit.body === 'string' ? resolvedInit.body : '',
          },
        ];
      },
      [],
    );

  const waitFor = async (condition: () => boolean, timeoutMs = 5000) => {
    const deadline = Date.now() + timeoutMs;
    while (!condition()) {
      if (Date.now() > deadline) {
        throw new Error('waitFor condition not met within timeout');
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  };

  return {
    analyticsController,
    controllerMessenger,
    rootMessenger,
    analytics: freshAnalytics,
    oauthService: OAuthService,
    store: reduxStore as unknown as MarketingConsentStore,
    startBackfillSaga: () => sagaMiddleware.run(backfillSaga),
    marketingOptInCalls,
    setAuthServerResponse: (override: AuthServerResponseOverride) => {
      if (override.postStatus !== undefined) {
        authServerResponse.postStatus = override.postStatus;
      }
      if (override.getJson !== undefined) {
        authServerResponse.getJson = override.getJson;
      }
    },
    waitFor,
    mocks: {
      platformAdapter,
      fetch: fetchMock,
      getAccessToken:
        mockEngineShim.context.SeedlessOnboardingController.getAccessToken,
    },
  };
}
