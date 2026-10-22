import { ConstantBackoff } from '@metamask/controller-utils';
import type {
  KeyringControllerGetStateAction,
  KeyringControllerState,
  KeyringControllerStateChangeEvent,
} from '@metamask/keyring-controller';
import { Messenger } from '@metamask/messenger';
import type { AuthenticationController } from '@metamask/profile-sync-controller';
import type { AuthenticationControllerState } from '@metamask/profile-sync-controller/auth';
import type { AppStateStatus } from 'react-native';
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
  getPredictLiveDataServiceInitMessenger,
  getPredictLiveDataServiceMessenger,
} from '../../../app/core/Engine/messengers/predict-live-data-service-messenger';
import { getPredictMarketDataServiceMessenger } from '../../../app/core/Engine/messengers/predict-market-data-service-messenger';
import {
  getPredictPortfolioServiceInitMessenger,
  getPredictPortfolioServiceMessenger,
  getPredictPortfolioServicePredictUserIdentity,
} from '../../../app/core/Engine/messengers/predict-portfolio-service-messenger';

/**
 * PredictNext integration-test harness.
 *
 * REAL: Engine-root messenger topology, PredictMarketDataService,
 * PredictPortfolioService, PredictLiveDataService, PredictLiveDataClient,
 * KalshiRemoteAdapter, and PredictApiReadClient.
 * MOCKED: HTTP fetch, WebSocket, AppState, bearer token provider, base URL,
 * client version, and the AuthenticationController/KeyringController state the
 * Predict User is derived from.
 */

/** The primary SRP's entropy source id, as the KeyringController reports it
 * in `metadata.id`. */
export const PRIMARY_ENTROPY_SOURCE_ID = 'srp-primary';

/** A keyring whose `metadata.id` is the primary SRP's entropy source. */
export const predictHarnessKeyringState = (
  entropySourceId: string,
): KeyringControllerState =>
  ({
    isUnlocked: true,
    keyrings: [
      {
        type: 'HD Key Tree',
        accounts: ['0xabc'],
        metadata: { id: entropySourceId },
      },
    ],
  }) as unknown as KeyringControllerState;

/** The KeyringController state while the wallet is locked: keyrings are
 * emptied, so the primary SRP — and with it the Predict User — is unknowable. */
export const predictHarnessLockedKeyringState = (): KeyringControllerState =>
  ({ isUnlocked: false, keyrings: [] }) as unknown as KeyringControllerState;

/** Authentication state signed in as `canonicalProfileId` for the primary
 * SRP, or signed out when it is omitted. */
export const predictHarnessAuthenticationState = (
  entropySourceId: string,
  canonicalProfileId?: string,
): AuthenticationControllerState =>
  ({
    isSignedIn: Boolean(canonicalProfileId),
    srpSessionData: canonicalProfileId
      ? { [entropySourceId]: { profile: { canonicalProfileId } } }
      : {},
  }) as unknown as AuthenticationControllerState;

export interface PredictFetchResult {
  status?: number;
  body?: unknown;
}

export type PredictFetchResponder = (
  url: string,
  init?: RequestInit,
) => Promise<PredictFetchResult> | PredictFetchResult;

type PredictNextRootActions =
  | PredictMarketDataServiceActions
  | PredictPortfolioServiceActions
  | PredictLiveDataServiceActions
  | AuthenticationController.AuthenticationControllerGetBearerTokenAction
  | AuthenticationController.AuthenticationControllerGetStateAction
  | KeyringControllerGetStateAction;
type PredictNextRootEvents =
  | PredictMarketDataServiceEvents
  | PredictPortfolioServiceEvents
  | PredictLiveDataServiceEvents
  | AuthenticationController.AuthenticationControllerStateChangeEvent
  | KeyringControllerStateChangeEvent;
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
  /** The authentication state the Predict User is derived from. */
  setAuthenticationState: (state: AuthenticationControllerState) => void;
  /** The keyring state the primary SRP — and the Predict User — comes from. */
  setKeyringState: (state: KeyringControllerState) => void;
  destroy: () => void;
}

const jsonResponse = ({ status = 200, body }: PredictFetchResult): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
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
    | AuthenticationController.AuthenticationControllerGetBearerTokenAction
    | AuthenticationController.AuthenticationControllerGetStateAction,
    AuthenticationController.AuthenticationControllerStateChangeEvent
  > = new Messenger({
    namespace: 'AuthenticationController',
    parent: messenger,
  });
  authenticationMessenger.registerActionHandler(
    'AuthenticationController:getBearerToken',
    getBearerTokenMock,
  );
  let authenticationState = predictHarnessAuthenticationState(
    PRIMARY_ENTROPY_SOURCE_ID,
    'canonical-profile-a',
  );
  authenticationMessenger.registerActionHandler(
    'AuthenticationController:getState',
    () => authenticationState,
  );
  const setAuthenticationState = (
    state: AuthenticationControllerState,
  ): void => {
    authenticationState = state;
    authenticationMessenger.publish(
      'AuthenticationController:stateChange',
      state,
      [],
    );
  };

  const keyringMessenger: Messenger<
    'KeyringController',
    KeyringControllerGetStateAction,
    KeyringControllerStateChangeEvent
  > = new Messenger({ namespace: 'KeyringController', parent: messenger });
  let keyringState = predictHarnessKeyringState(PRIMARY_ENTROPY_SOURCE_ID);
  keyringMessenger.registerActionHandler(
    'KeyringController:getState',
    () => keyringState,
  );
  const setKeyringState = (state: KeyringControllerState): void => {
    keyringState = state;
    keyringMessenger.publish('KeyringController:stateChange', state, []);
  };

  const liveDataInitMessenger = getPredictLiveDataServiceInitMessenger(
    messenger as unknown as Parameters<
      typeof getPredictLiveDataServiceInitMessenger
    >[0],
  );
  // Mirror the Engine composition: the Portfolio service learns the Predict
  // User from the delegated authentication and keyring state.
  const portfolioInitMessenger = getPredictPortfolioServiceInitMessenger(
    messenger as unknown as Parameters<
      typeof getPredictPortfolioServiceInitMessenger
    >[0],
  );
  const adapter = new KalshiRemoteAdapter(
    new PredictApiReadClient({
      baseUrl: 'https://predict.example/',
      clientVersion: '1.0.0',
      fetch: fetchMock,
      getBearerToken: getBearerTokenMock,
    }),
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
    predictUserIdentity: getPredictPortfolioServicePredictUserIdentity(
      portfolioInitMessenger,
    ),
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
    setAuthenticationState,
    setKeyringState,
    destroy: () => {
      liveDataService.destroy();
      marketDataService.destroy();
      portfolioService.destroy();
    },
  };
};
