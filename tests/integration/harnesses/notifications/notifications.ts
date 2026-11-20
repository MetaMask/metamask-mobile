/*
 * Notifications integration-test harness.
 *
 * Owns the wiring for a REAL NotificationServicesController +
 * NotificationServicesPushController pair on the production messenger layout
 * (`getNotificationServicesControllerMessenger` /
 * `getNotificationServicesPushControllerMessenger`), and a
 * `buildNotificationsIntegrationHarness()` factory.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * REAL (runs production code paths):
 *   - NotificationServicesController — settings toggles, Trigger API
 *     subscription writes, AUS preference seeding, state transitions
 *   - NotificationServicesPushController — FCM token registration/removal,
 *     push link registration, push state transitions
 *   - Production messenger wiring for both controllers (delegate lists live
 *     in app/core/Engine/messengers/notifications/)
 *
 * MOCKED (the I/O boundary — never makes real network/native calls):
 *   - global fetch — Trigger API (query + subscribe), Push API (token
 *     links), Notification API, Contentful feature announcements
 *   - config.pushService — the FCM/native push boundary
 *     (createRegToken / deleteRegToken / subscribeToPushNotifications)
 *   - AuthenticationController:getBearerToken / :isSignedIn /
 *     :performSignIn messenger actions (OAuth I/O)
 *   - KeyringController:getState messenger action (account source)
 *   - AuthenticatedUserStorageService:getNotificationPreferences /
 *     :putNotificationPreferences messenger actions (AUS API)
 * ─────────────────────────────────────────────────────────────────────────
 *
 * USAGE — see also tests/integration/AGENTS.md
 *
 *     import { buildNotificationsIntegrationHarness }
 *       from '../../../../../tests/integration/harnesses/notifications/notifications';
 *
 *     const { notificationServicesController, pushController, mocks } =
 *       buildNotificationsIntegrationHarness();
 *     await notificationServicesController.enableMetamaskNotifications();
 *     expect(pushController.state.fcmToken).toBe('fcm-token');
 */

import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import {
  Controller as NotificationServicesController,
  type NotificationServicesControllerState,
} from '@metamask/notification-services-controller/notification-services';
import {
  Controller as NotificationServicesPushController,
  defaultState as defaultPushState,
  type NotificationServicesPushControllerState,
} from '@metamask/notification-services-controller/push-services';
import { getNotificationServicesControllerMessenger } from '../../../../app/core/Engine/messengers/notifications/notification-services-controller-messenger';
import { getNotificationServicesPushControllerMessenger } from '../../../../app/core/Engine/messengers/notifications/notification-services-push-controller-messenger';

type NotificationsHarnessRootMessenger = Messenger<
  MockAnyNamespace,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any
>;

type GetNotificationServicesControllerMessenger =
  typeof getNotificationServicesControllerMessenger;
type GetNotificationServicesPushControllerMessenger =
  typeof getNotificationServicesPushControllerMessenger;

/** Accounts must be lowercase hex digits so checksumming is a no-op. */
export const HARNESS_ACCOUNT_A = '0x1111111111111111111111111111111111111111';
export const HARNESS_ACCOUNT_B = '0x2222222222222222222222222222222222222222';
export const HARNESS_BEARER_TOKEN = 'test-bearer-token';
export const HARNESS_FCM_TOKEN = 'test-fcm-token';

export const TRIGGER_API_QUERY_ENDPOINT =
  'https://trigger.api.cx.metamask.io/api/v2/notifications/query';
export const TRIGGER_API_NOTIFICATIONS_ENDPOINT =
  'https://trigger.api.cx.metamask.io/api/v2/notifications';
export const PUSH_API_TOKEN_ENDPOINT =
  'https://push.api.cx.metamask.io/api/v2/token';
export const NOTIFICATION_API_LIST_ENDPOINT =
  'https://notification.api.cx.metamask.io/api/v4/notifications';

/**
 * The Trigger API reads/writes are cached in a module-level singleton for
 * 60s. The package's exports map blocks reaching it by specifier, so the
 * harness resets it through the resolved file path — the same module
 * instance the real controller code imported.
 */
const NOTIFICATION_CONFIG_CACHE_PATH =
  '../../../../node_modules/@metamask/notification-services-controller/dist/NotificationServicesController/services/notification-config-cache.js';

interface NotificationConfigCacheModule {
  notificationsConfigCache: { clear(): void };
}

export interface HttpResponseStub {
  status?: number;
  json?: unknown;
}

/** One recorded `fetch(url, init)` call, normalized for assertions. */
export interface RecordedFetchCall {
  url: string;
  method: string;
  headers: unknown;
  body: string;
}

export interface PushServiceMock {
  createRegToken: jest.Mock;
  deleteRegToken: jest.Mock;
  subscribeToPushNotifications: jest.Mock;
}

export interface NotificationsIntegrationHarness {
  notificationServicesController: NotificationServicesController;
  pushController: NotificationServicesPushController;
  rootMessenger: NotificationsHarnessRootMessenger;
  /** Calls recorded by the fetch mock, filtered by URL substring. */
  fetchCalls: (urlPart: string, excludeUrlPart?: string) => RecordedFetchCall[];
  /** Point every fetch whose URL contains `urlPart` at a canned response. */
  setHttpResponse: (urlPart: string, response: HttpResponseStub) => void;
  /** Resolves once `condition` holds or the timeout expires. */
  waitFor: (condition: () => boolean, timeoutMs?: number) => Promise<void>;
  mocks: {
    fetch: jest.Mock;
    pushService: PushServiceMock;
    getBearerToken: jest.Mock;
    isSignedIn: jest.Mock;
    performSignIn: jest.Mock;
    getNotificationPreferences: jest.Mock;
    putNotificationPreferences: jest.Mock;
  };
}

export interface NotificationsHarnessOptions {
  initialState?: Partial<NotificationServicesControllerState>;
  initialPushState?: Partial<NotificationServicesPushControllerState>;
  keyringAccounts?: string[];
}

function httpResponse({ status = 200, json = {} }: HttpResponseStub) {
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

export function buildNotificationsIntegrationHarness(
  options: NotificationsHarnessOptions = {},
): NotificationsIntegrationHarness {
  (
    jest.requireActual(
      NOTIFICATION_CONFIG_CACHE_PATH,
    ) as NotificationConfigCacheModule
  ).notificationsConfigCache.clear();

  const responseOverrides = new Map<string, HttpResponseStub>();

  const fetchMock = jest.fn(async (input: unknown) => {
    const url = toUrlString(input);
    for (const [urlPart, response] of responseOverrides) {
      if (url.includes(urlPart)) {
        return httpResponse(response);
      }
    }
    return httpResponse({
      json: url.includes(TRIGGER_API_QUERY_ENDPOINT) ? [] : {},
    });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;

  const pushService: PushServiceMock = {
    createRegToken: jest.fn().mockResolvedValue(HARNESS_FCM_TOKEN),
    deleteRegToken: jest.fn().mockResolvedValue(true),
    subscribeToPushNotifications: jest.fn().mockResolvedValue(jest.fn()),
  };

  const getBearerToken = jest.fn().mockResolvedValue(HARNESS_BEARER_TOKEN);
  const isSignedIn = jest.fn(() => true);
  const performSignIn = jest.fn().mockResolvedValue(undefined);
  const getNotificationPreferences = jest.fn().mockResolvedValue(null);
  const putNotificationPreferences = jest.fn().mockResolvedValue(undefined);

  const keyringAccounts = options.keyringAccounts ?? [HARNESS_ACCOUNT_A];
  const keyringState = {
    isUnlocked: true,
    keyrings: [{ type: 'HD Key Tree', accounts: [...keyringAccounts] }],
  };

  const rootMessenger = new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  }) as NotificationsHarnessRootMessenger;

  rootMessenger.registerActionHandler(
    'AuthenticationController:getBearerToken',
    () => getBearerToken(),
  );
  rootMessenger.registerActionHandler(
    'AuthenticationController:isSignedIn',
    () => isSignedIn(),
  );
  rootMessenger.registerActionHandler(
    'AuthenticationController:performSignIn',
    () => performSignIn(),
  );
  rootMessenger.registerActionHandler(
    'KeyringController:getState',
    () => keyringState,
  );
  rootMessenger.registerActionHandler(
    'AuthenticatedUserStorageService:getNotificationPreferences',
    () => getNotificationPreferences(),
  );
  rootMessenger.registerActionHandler(
    'AuthenticatedUserStorageService:putNotificationPreferences',
    (...args: unknown[]) => putNotificationPreferences(...args),
  );

  const pushMessenger = getNotificationServicesPushControllerMessenger(
    rootMessenger as unknown as Parameters<GetNotificationServicesPushControllerMessenger>[0],
  );

  const pushController = new NotificationServicesPushController({
    messenger: pushMessenger,
    state: { ...defaultPushState, ...options.initialPushState },
    config: {
      platform: 'mobile',
      isPushFeatureEnabled: true,
      pushService,
      getLocale: () => 'en',
      env: 'prd',
    },
  });

  const controllerMessenger = getNotificationServicesControllerMessenger(
    rootMessenger as unknown as Parameters<GetNotificationServicesControllerMessenger>[0],
  );

  const notificationServicesController = new NotificationServicesController({
    messenger: controllerMessenger,
    state: options.initialState,
    env: {
      featureAnnouncements: {
        platform: 'mobile',
        accessToken: 'test-access-token',
        spaceId: 'test-space-id',
        platformVersion: '7.0.0',
      },
      locale: () => 'en',
      env: 'prd',
    },
  });
  notificationServicesController.init();

  const fetchCalls = (urlPart: string, excludeUrlPart?: string) =>
    (fetchMock.mock.calls as unknown as [string, RequestInit?][])
      .filter(([url]) => {
        const requestUrl = toUrlString(url);
        return (
          requestUrl.includes(urlPart) &&
          (excludeUrlPart === undefined || !requestUrl.includes(excludeUrlPart))
        );
      })
      .map(([url, init]): RecordedFetchCall => {
        const requestInit = init ?? {};
        return {
          url: toUrlString(url),
          method: requestInit.method ?? 'GET',
          headers: requestInit.headers,
          body: typeof requestInit.body === 'string' ? requestInit.body : '',
        };
      });

  const setHttpResponse = (urlPart: string, response: HttpResponseStub) => {
    responseOverrides.set(urlPart, response);
  };

  const waitFor = async (condition: () => boolean, timeoutMs = 2000) => {
    const deadline = Date.now() + timeoutMs;
    while (!condition()) {
      if (Date.now() > deadline) {
        throw new Error('waitFor condition not met within timeout');
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  };

  return {
    notificationServicesController,
    pushController,
    rootMessenger,
    fetchCalls,
    setHttpResponse,
    waitFor,
    mocks: {
      fetch: fetchMock,
      pushService,
      getBearerToken,
      isSignedIn,
      performSignIn,
      getNotificationPreferences,
      putNotificationPreferences,
    },
  };
}
