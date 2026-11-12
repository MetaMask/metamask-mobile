import { deriveStateFromMetadata } from '@metamask/base-controller';
import { ConstantBackoff } from '@metamask/controller-utils';
import {
  GeolocationApiService,
  GeolocationController,
  type GeolocationApiServiceMessenger,
  type GeolocationControllerMessenger,
} from '@metamask/geolocation-controller';
import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MessengerActions,
  type MessengerEvents,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type { AuthenticationController } from '@metamask/profile-sync-controller';
import type { AppStateStatus } from 'react-native';

// The native module is an I/O boundary. Its package mock forwards P-256
// operations to node:crypto so DeviceAuth integration tests use real keys.
jest.mock('react-native-quick-crypto', () =>
  jest.requireActual('react-native-quick-crypto/jest'),
);

import { KalshiRemoteAdapter } from '../../../app/components/UI/PredictNext/adapters/remote/KalshiRemoteAdapter';
import { PredictApiReadClient } from '../../../app/components/UI/PredictNext/adapters/remote/PredictApiReadClient';
import {
  PredictLiveDataClient,
  type PredictLiveDataClientOptions,
} from '../../../app/components/UI/PredictNext/adapters/remote/PredictLiveDataClient';
import {
  PredictLiveDataService,
  type PredictLiveDataServiceActions,
  type PredictLiveDataServiceEvents,
  type PredictLiveDataServiceMessenger,
} from '../../../app/components/UI/PredictNext/services/PredictLiveDataService';
import {
  PredictMarketDataService,
  type PredictMarketDataServiceActions,
  type PredictMarketDataServiceEvents,
  type PredictMarketDataServiceMessenger,
} from '../../../app/components/UI/PredictNext/services/PredictMarketDataService';
import {
  PredictPortfolioService,
  type PredictPortfolioServiceActions,
  type PredictPortfolioServiceEvents,
  type PredictPortfolioServiceMessenger,
} from '../../../app/components/UI/PredictNext/services/PredictPortfolioService';
import {
  PredictDeviceAuthService,
  type PredictDeviceAuthServiceActions,
  type PredictDeviceAuthServiceMessenger,
} from '../../../app/components/UI/PredictNext/services/PredictDeviceAuthService';
import { KALSHI_AUTHENTICATION_PROFILE } from '../../../app/components/UI/PredictNext/auth/venueAuthProfiles';
import {
  loadVenueProfile,
  VENUE_AUTHORIZATION_HEADER,
} from '../../../app/components/UI/PredictNext/auth/venueSigningProfiles';
import { renderRequest } from '../../../app/components/UI/PredictNext/auth/signing/profileTemplates';
import {
  getPredictLiveDataServiceInitMessenger,
  getPredictLiveDataServiceMessenger,
} from '../../../app/core/Engine/messengers/predict-live-data-service-messenger';
import { getPredictMarketDataServiceMessenger } from '../../../app/core/Engine/messengers/predict-market-data-service-messenger';
import { getPredictPortfolioServiceMessenger } from '../../../app/core/Engine/messengers/predict-portfolio-service-messenger';
import {
  PredictVenueController,
  type PredictVenueControllerMessenger,
  type PredictVenueControllerState,
} from '../../../app/components/UI/PredictNext/implementation/PredictVenueController';
import { fetchInitialGeolocation } from '../../../app/core/Engine/wallet-init/listeners/geolocation-controller';
import { getPredictDeviceAuthServiceMessenger } from '../../../app/core/Engine/messengers/predict-device-auth-service-messenger';
import { getPredictVenueControllerMessenger } from '../../../app/core/Engine/messengers/predict-venue-controller-messenger';

/**
 * PredictNext integration-test harnesses. `buildPredictDeviceAuthIntegrationHarness`
 * covers device authentication and `buildPredictVenueIntegrationHarness`
 * covers Active Venue resolution; the rest covers the data services.
 *
 * REAL: Engine-root messenger topology, PredictMarketDataService,
 * PredictPortfolioService, PredictLiveDataService, PredictLiveDataClient,
 * KalshiRemoteAdapter, and PredictApiReadClient.
 * MOCKED: HTTP fetch, WebSocket, AppState, bearer token provider, base URL,
 * client version, and the native QuickCrypto module through its Node-backed
 * package Jest mock.
 */

export interface PredictFetchResult {
  status?: number;
  body?: unknown;
}

export type PredictFetchResponder = (
  url: string,
  init?: RequestInit,
) => Promise<PredictFetchResult> | PredictFetchResult;

/**
 * A Predict API route table keyed by URL pathname, for example
 * `/v1/venues/kalshi/portfolio/summary`. A function route receives the parsed
 * URL so it can answer by query parameters (cursor, status, sort).
 */
export type PredictApiRoutes = Record<
  string,
  PredictFetchResult | ((url: URL) => PredictFetchResult)
>;

/**
 * Builds a responder that answers each request from `routes` by pathname and
 * fails any unrouted request with 404, so a test cannot silently read a route
 * it did not declare.
 */
export const routePredictApi =
  (routes: PredictApiRoutes): PredictFetchResponder =>
  (input) => {
    const url = new URL(input);
    const route = routes[url.pathname];
    if (!route) {
      return {
        status: 404,
        body: { code: 'not_found', message: url.pathname },
      };
    }
    return typeof route === 'function' ? route(url) : route;
  };

type PredictNextRootActions =
  | PredictMarketDataServiceActions
  | PredictPortfolioServiceActions
  | PredictLiveDataServiceActions
  | AuthenticationController.AuthenticationControllerGetBearerTokenAction;
type PredictNextRootEvents =
  | PredictMarketDataServiceEvents
  | PredictPortfolioServiceEvents
  | PredictLiveDataServiceEvents;
type PredictNextRootMessenger = Messenger<
  'Root',
  PredictNextRootActions,
  PredictNextRootEvents
>;

/** One subscribe/unsubscribe frame the fake gateway received. */
export interface PredictLiveDataSentFrame {
  type: 'subscribe' | 'unsubscribe';
  topic: 'game' | 'market';
  venueId: string;
  events?: string[];
  markets?: string[];
}

/**
 * The gateway side of one live-data connection. Frames sent by the client are
 * parsed into `sent`; `open()` and `welcome()` drive the handshake and
 * `message()` delivers a server frame.
 */
export class PredictLiveDataFakeSocket {
  readonly url: string;
  readyState = 0;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: ((event?: { code?: number }) => void) | null = null;
  onerror: (() => void) | null = null;
  readonly sent: PredictLiveDataSentFrame[] = [];

  constructor(url: string) {
    this.url = url;
  }

  send = (data: string): void => {
    this.sent.push(JSON.parse(data) as PredictLiveDataSentFrame);
  };

  close = (): void => {
    this.readyState = 3;
    this.onclose?.();
  };

  open(): void {
    this.readyState = 1;
  }

  message(value: unknown): void {
    this.onmessage?.({ data: JSON.stringify(value) });
  }

  welcome(limits?: {
    market?: { maxPerConnection: number; maxPerMessage: number };
    game?: { maxPerConnection: number; maxPerMessage: number };
  }): void {
    this.message({ type: 'welcome', protocol: 1, limits });
  }

  /** Ids the gateway currently holds for a topic, replaying `sent` in order. */
  subscribedIds(topic: 'game' | 'market'): string[] {
    const held = new Set<string>();
    this.sent
      .filter((frame) => frame.topic === topic)
      .forEach((frame) => {
        const ids = frame.topic === 'game' ? frame.events : frame.markets;
        ids?.forEach((id) =>
          frame.type === 'subscribe' ? held.add(id) : held.delete(id),
        );
      });
    return [...held];
  }
}

export interface PredictNextIntegrationHarness {
  messenger: PredictNextRootMessenger;
  marketDataService: PredictMarketDataService;
  portfolioService: PredictPortfolioService;
  liveDataService: PredictLiveDataService;
  /** The shared remote adapter, for capability groups without a service. */
  adapter: KalshiRemoteAdapter;
  fetchMock: jest.MockedFunction<typeof fetch>;
  getBearerTokenMock: jest.MockedFunction<() => Promise<string | undefined>>;
  /** Live-data sockets opened so far, oldest first. */
  sockets: PredictLiveDataFakeSocket[];
  /** Drives the AppState the live-data client listens to. */
  setAppState: (state: AppStateStatus) => void;
  destroy: () => void;
}

const jsonResponse = ({ status = 200, body }: PredictFetchResult): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    clone: () => jsonResponse({ status, body }),
    json: async () => body,
  }) as Response;

export const buildPredictNextIntegrationHarness = (
  responder: PredictFetchResponder,
): PredictNextIntegrationHarness => {
  const messenger: PredictNextRootMessenger = new Messenger({
    namespace: 'Root',
  });
  const marketDataMessenger: PredictMarketDataServiceMessenger =
    getPredictMarketDataServiceMessenger(messenger);
  const portfolioMessenger: PredictPortfolioServiceMessenger =
    getPredictPortfolioServiceMessenger(messenger);
  const liveDataMessenger: PredictLiveDataServiceMessenger =
    getPredictLiveDataServiceMessenger(messenger);
  const fetchMock = jest.fn(async (input, init) =>
    jsonResponse(await responder(String(input), init)),
  ) as jest.MockedFunction<typeof fetch>;
  const getBearerTokenMock = jest.fn(async () => 'test-bearer-token');
  // Actions register under their own namespace and delegate up to the root,
  // which is where the live-data init messenger reads the token from.
  const authenticationMessenger: Messenger<
    'AuthenticationController',
    AuthenticationController.AuthenticationControllerGetBearerTokenAction,
    never
  > = new Messenger({
    namespace: 'AuthenticationController',
    parent: messenger,
  });
  authenticationMessenger.registerActionHandler(
    'AuthenticationController:getBearerToken',
    getBearerTokenMock,
  );
  const liveDataInitMessenger = getPredictLiveDataServiceInitMessenger(
    messenger as unknown as Parameters<
      typeof getPredictLiveDataServiceInitMessenger
    >[0],
  );
  const adapter = new KalshiRemoteAdapter(
    new PredictApiReadClient({
      baseUrl: 'https://predict.example/',
      clientVersion: '1.0.0',
      fetch: fetchMock,
      getBearerToken: getBearerTokenMock,
      signRead: async ({ method, path, query }) => ({
        name: VENUE_AUTHORIZATION_HEADER,
        value: JSON.stringify({ method, path, query }),
      }),
      signOperation: async (operation, input) => {
        const profile = await loadVenueProfile();
        const payloadName = profile?.intents.find(
          (intent) => intent.id === operation,
        )?.payloads[0];
        const payload = payloadName && profile?.payloads[payloadName];
        if (!payloadName || !payload || payload.kind !== 'http-rfc9421') {
          throw new Error(`Missing harness signing payload for ${operation}`);
        }
        const rendered = renderRequest(
          payloadName,
          {
            class: 'mutation',
            method: payload.method,
            path: payload.path,
            body: payload.body,
            idempotencyKey: payload.idempotencyKey,
            invariants: payload.invariants,
          },
          {
            inputs: input?.inputs ?? {},
            values: input?.values ?? {},
            nowMs: Date.now(),
          },
        );
        return {
          header: { name: VENUE_AUTHORIZATION_HEADER, value: operation },
          body: rendered.body,
          idempotencyKey: rendered.idempotencyKey,
        };
      },
      invalidateSigningSession: () => undefined,
    }),
    {
      getApprovalGeneration: () => 0,
      previewOperation: async (operation, input) => {
        const profile = await loadVenueProfile();
        const payloadName = profile?.intents.find(({ id }) => id === operation)
          ?.payloads[0];
        const payload = payloadName && profile?.payloads[payloadName];
        if (!payloadName || !payload || payload.kind !== 'http-rfc9421') {
          throw new Error(`Missing harness review payload for ${operation}`);
        }
        return renderRequest(
          payloadName,
          {
            class: 'mutation',
            method: payload.method,
            path: payload.path,
            body: payload.body,
            idempotencyKey: payload.idempotencyKey,
            invariants: payload.invariants,
          },
          {
            inputs: input.inputs ?? {},
            values: input.values ?? {},
            nowMs: Date.now(),
          },
        ).display;
      },
    },
  );
  const policyOptions = {
    backoff: new ConstantBackoff(0),
    maxConsecutiveFailures: 3,
    circuitBreakDuration: 60_000,
  };
  const marketDataService = new PredictMarketDataService({
    messenger: marketDataMessenger,
    marketData: adapter.marketData,
    venueId: adapter.venueId,
    policyOptions,
  });
  const portfolioService = new PredictPortfolioService({
    messenger: portfolioMessenger,
    portfolio: adapter.portfolio,
    venueId: adapter.venueId,
    policyOptions,
  });

  const sockets: PredictLiveDataFakeSocket[] = [];
  let onAppStateChange: ((state: AppStateStatus) => void) | undefined;
  class HarnessSocket extends PredictLiveDataFakeSocket {
    constructor(url: string) {
      super(url);
      sockets.push(this);
    }
  }
  const liveDataService = new PredictLiveDataService({
    messenger: liveDataMessenger,
    venueId: adapter.venueId,
    resolveEvent: (venueId, eventId) =>
      liveDataInitMessenger.call(
        'PredictMarketDataService:getEvent',
        venueId,
        eventId,
      ),
    createClient: ({ onGameUpdate, onQuoteUpdate }) =>
      new PredictLiveDataClient({
        baseUrl: 'https://predict.example/',
        getBearerToken: () =>
          liveDataInitMessenger.call('AuthenticationController:getBearerToken'),
        WebSocket: HarnessSocket as unknown as typeof WebSocket,
        AppState: {
          addEventListener: (
            _type: 'change',
            listener: (state: AppStateStatus) => void,
          ) => {
            onAppStateChange = listener;
            return { remove: () => undefined };
          },
        } as unknown as PredictLiveDataClientOptions['AppState'],
        onGameUpdate,
        onQuoteUpdate,
      }),
  });

  return {
    messenger,
    marketDataService,
    portfolioService,
    liveDataService,
    adapter,
    fetchMock,
    getBearerTokenMock,
    sockets,
    setAppState: (state) => onAppStateChange?.(state),
    destroy: () => {
      liveDataService.destroy();
      marketDataService.destroy();
      portfolioService.destroy();
    },
  };
};

type PredictDeviceAuthRootMessenger = Messenger<
  MockAnyNamespace,
  PredictDeviceAuthServiceActions,
  never
>;

type PredictDeviceAuthLifecycleEvent =
  | 'KeyringController:lock'
  | 'AuthenticationController:profileSignIn'
  | 'AuthenticationController:stateChange'
  | 'RemoteFeatureFlagController:stateChange';

export interface PredictDeviceAuthIntegrationHarness {
  messenger: PredictDeviceAuthRootMessenger;
  service: PredictDeviceAuthService;
  authenticationState: {
    isSignedIn: boolean;
    srpSessionData: Record<string, { profile: { canonicalProfileId: string } }>;
  };
  featureFlagState: {
    remoteFeatureFlags: {
      predictConfig: {
        enabled: boolean;
        venues: {
          kalshi: { enabled: boolean };
          polymarket: { enabled: boolean };
        };
        venueSelection: { enabled: boolean };
      };
    };
  };
  keyringState: {
    isUnlocked: boolean;
    keyrings: {
      type: string;
      metadata: { id: string };
    }[];
  };
  emit: (event: PredictDeviceAuthLifecycleEvent) => void;
}

interface PredictDeviceAuthIntegrationHarnessOptions {
  now?: () => number;
  nowMs?: () => number;
}

/**
 * Real Predict device-auth service and root messenger. Only controller state,
 * Snap, network, clock, and SecureKeychain boundaries are mocked by callers.
 */
export const buildPredictDeviceAuthIntegrationHarness = (
  options: PredictDeviceAuthIntegrationHarnessOptions = {},
): PredictDeviceAuthIntegrationHarness => {
  const messenger: PredictDeviceAuthRootMessenger = new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
  const controllerMessenger: PredictDeviceAuthServiceMessenger =
    getPredictDeviceAuthServiceMessenger(messenger);
  const authenticationState = {
    isSignedIn: true,
    srpSessionData: {
      'entropy-source-id': {
        profile: { canonicalProfileId: 'canonical-profile-id' },
      },
    },
  };
  const keyringState = {
    isUnlocked: true,
    keyrings: [
      {
        type: 'HD Key Tree',
        metadata: { id: 'entropy-source-id' },
      },
    ],
  };
  const featureFlagState = {
    remoteFeatureFlags: {
      predictConfig: {
        enabled: true,
        venues: {
          kalshi: { enabled: true },
          polymarket: { enabled: false },
        },
        venueSelection: { enabled: false },
      },
    },
  };
  const subscribers = new Map<PredictDeviceAuthLifecycleEvent, () => void>();
  let canonicalProfileId: string | undefined =
    authenticationState.srpSessionData['entropy-source-id']?.profile
      .canonicalProfileId;
  const controller = new PredictDeviceAuthService(controllerMessenger, {
    getProfile: () => KALSHI_AUTHENTICATION_PROFILE,
    getIssuerUrl: () => 'https://issuer.example',
    getAccessToken: async () => {
      canonicalProfileId =
        authenticationState.srpSessionData['entropy-source-id']?.profile
          .canonicalProfileId;
      return 'access-token';
    },
    getCanonicalProfileId: () => canonicalProfileId,
    getSrpIdentifier: async () => '0xabc',
    signSrpMessage: async () => 'srp-signature',
    isEnabled: () => {
      const config = featureFlagState.remoteFeatureFlags.predictConfig;
      return config.enabled && config.venues.kalshi.enabled;
    },
    isUnlocked: () => keyringState.isUnlocked,
    isSignedIn: () => authenticationState.isSignedIn,
    fetch: (input, init) => global.fetch(input, init),
    now: options.now ?? (() => Math.floor(Date.now() / 1000)),
    nowMs: options.nowMs ?? Date.now,
    sleep: async (ms) => {
      await new Promise((resolve) => {
        setTimeout(resolve, ms);
      });
    },
  });
  subscribers.set('KeyringController:lock', () => controller.clear());
  let wasSignedIn = authenticationState.isSignedIn;
  subscribers.set('AuthenticationController:stateChange', () => {
    if (wasSignedIn && !authenticationState.isSignedIn) {
      canonicalProfileId = undefined;
      controller.clear();
    }
    wasSignedIn = authenticationState.isSignedIn;
  });
  subscribers.set('AuthenticationController:profileSignIn', () => {
    const nextCanonicalProfileId =
      authenticationState.srpSessionData['entropy-source-id']?.profile
        .canonicalProfileId;
    if (nextCanonicalProfileId !== canonicalProfileId) {
      controller.clear();
    }
    canonicalProfileId = nextCanonicalProfileId;
  });
  subscribers.set('RemoteFeatureFlagController:stateChange', () => {
    if (!featureFlagState.remoteFeatureFlags.predictConfig.enabled) {
      controller.clear();
    }
  });

  return {
    messenger,
    service: controller,
    authenticationState,
    featureFlagState,
    keyringState,
    emit: (event) => subscribers.get(event)?.(),
  };
};

export interface PredictVenueIntegrationHarness {
  venueController: PredictVenueController;
  geolocationController: GeolocationController;
  /** Every request the geolocation API received this session. */
  geolocationFetchMock: jest.MockedFunction<typeof fetch>;
  /** Answers the pending geolocation request with an ISO country code. */
  respondWithCountry: (country: string) => Promise<void>;
  /** Fails the pending geolocation request. */
  failGeolocation: () => Promise<void>;
  /** What this session would persist for the next one. */
  persistedVenueState: () => Partial<PredictVenueControllerState>;
  destroy: () => void;
}

/**
 * Active Venue harness: one app session of Engine-start geolocation and the
 * Venue controller.
 *
 * REAL: GeolocationApiService (parsing, policy), GeolocationController with
 * its Engine-start init, PredictVenueController and the Engine messengers.
 * MOCKED: the geolocation HTTP fetch, which stays pending until answered.
 */
export const buildPredictVenueIntegrationHarness = ({
  persisted,
  geolocationWaitMs,
}: {
  persisted?: Partial<PredictVenueControllerState>;
  geolocationWaitMs: number;
}): PredictVenueIntegrationHarness => {
  // One root, as in Engine. Each Engine messenger getter types the root by
  // its own slice, so the shared root is cast once per getter.
  const messenger = new Messenger<
    'Root',
    | MessengerActions<PredictVenueControllerMessenger>
    | MessengerActions<GeolocationControllerMessenger>
    | MessengerActions<GeolocationApiServiceMessenger>,
    | MessengerEvents<PredictVenueControllerMessenger>
    | MessengerEvents<GeolocationControllerMessenger>
  >({ namespace: 'Root' });
  const rootFor = <Getter extends (root: never) => unknown>() =>
    messenger as unknown as Parameters<Getter>[0];

  let settle: (response: Response) => void = () => undefined;
  const geolocationFetchMock = jest.fn(
    () =>
      new Promise<Response>((resolve) => {
        settle = resolve;
      }),
  ) as unknown as jest.MockedFunction<typeof fetch>;
  // Mirrors the GeolocationApiService and GeolocationController messengers
  // that @metamask/wallet builds.
  const geolocationApiServiceMessenger: GeolocationApiServiceMessenger =
    new Messenger({ namespace: 'GeolocationApiService', parent: messenger });
  // Registers the fetch action the controller calls; nothing else holds it.
  // eslint-disable-next-line no-new
  new GeolocationApiService({
    messenger: geolocationApiServiceMessenger,
    fetch: geolocationFetchMock,
    policyOptions: { maxRetries: 0 },
  });
  const geolocationControllerMessenger: GeolocationControllerMessenger =
    new Messenger({ namespace: 'GeolocationController', parent: messenger });
  messenger.delegate({
    messenger: geolocationControllerMessenger,
    actions: ['GeolocationApiService:fetchGeolocationData'],
  });
  const geolocationController = new GeolocationController({
    messenger: geolocationControllerMessenger,
  });
  // Mirrors the eager Engine-start fetch in initializeWallet.
  fetchInitialGeolocation(geolocationController);

  // Mirrors predictVenueControllerInit, minus its Redux subscription.
  const venueController = new PredictVenueController({
    messenger:
      getPredictVenueControllerMessenger(
        rootFor<typeof getPredictVenueControllerMessenger>(),
      ),
    state: persisted,
    geolocationWaitMs,
  });
  venueController.init();

  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

  return {
    venueController,
    geolocationController,
    geolocationFetchMock,
    respondWithCountry: async (country) => {
      settle({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ country }),
      } as Response);
      await flush();
    },
    failGeolocation: async () => {
      settle({ ok: false, status: 503, text: async () => '' } as Response);
      await flush();
    },
    persistedVenueState: () =>
      deriveStateFromMetadata(
        venueController.state,
        venueController.metadata,
        'persist',
      ) as Partial<PredictVenueControllerState>,
    destroy: () => {
      venueController.destroy();
    },
  };
};
