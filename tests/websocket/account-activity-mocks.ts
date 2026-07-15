// eslint-disable-next-line @typescript-eslint/no-shadow, import-x/no-extraneous-dependencies
import { WebSocket } from 'ws';
import type LocalWebSocketServer from './server.ts';
import { createLogger, LogLevel } from '../framework/logger.ts';

const logger = createLogger({
  name: 'AccountActivityWS',
  level: LogLevel.INFO,
});

interface WebSocketMessageMock {
  messageIncludes: string | string[];
  response: Record<string, unknown>;
  delay?: number;
  logMessage?: string;
}

interface SubscriptionWaiter {
  resolve: (subscriptionId: string) => void;
  timer: ReturnType<typeof setTimeout>;
}

let subscriptionWaiters: SubscriptionWaiter[] = [];
let subscriptionCount = 0;
const subscribedSockets = new Set<WebSocket>();

/**
 * Returns a Promise that resolves with the subscriptionId once the next
 * AccountActivity subscribe handshake completes on the mock server.
 * Call BEFORE the app connects so the waiter is registered in time.
 *
 * @param timeoutMs - Maximum time to wait for the subscription
 */
export function waitForAccountActivitySubscription(
  timeoutMs = 30_000,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const entry: SubscriptionWaiter = {
      resolve: (subscriptionId: string) => {
        clearTimeout(entry.timer);
        resolve(subscriptionId);
      },
      timer: setTimeout(() => {
        subscriptionWaiters = subscriptionWaiters.filter((w) => w !== entry);
        reject(
          new Error(
            `Timed out after ${timeoutMs}ms waiting for AccountActivity subscription`,
          ),
        );
      }, timeoutMs),
    };

    subscriptionWaiters.push(entry);
  });
}

/**
 * Returns the number of account-activity subscribe handshakes that have
 * completed on the mock server since the last reset.
 */
export function getAccountActivitySubscriptionCount(): number {
  return subscriptionCount;
}

export function waitForAccountActivityDisconnection(
  timeoutMs = 15_000,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (subscribedSockets.size === 0) {
      resolve();
      return;
    }

    const sockets = [...subscribedSockets];
    let remaining = sockets.filter(
      (s) => s.readyState !== WebSocket.CLOSED,
    ).length;

    if (remaining === 0) {
      resolve();
      return;
    }

    let settled = false;
    // eslint-disable-next-line prefer-const -- mutual reference: onClose needs timer, setTimeout needs onClose
    let timer: ReturnType<typeof setTimeout>;

    const onClose = () => {
      remaining -= 1;
      if (remaining <= 0 && !settled) {
        settled = true;
        clearTimeout(timer);
        for (const s of sockets) s.removeListener('close', onClose);
        resolve();
      }
    };

    timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      for (const s of sockets) s.removeListener('close', onClose);
      reject(
        new Error(
          `Timed out after ${timeoutMs}ms waiting for account activity disconnection (${remaining} still open)`,
        ),
      );
    }, timeoutMs);

    for (const s of sockets) {
      if (s.readyState === WebSocket.CLOSED) continue;
      s.on('close', onClose);
    }
  });
}

export function resetAccountActivityMockState(): void {
  for (const waiter of subscriptionWaiters) {
    clearTimeout(waiter.timer);
  }
  subscriptionWaiters = [];
  subscriptionCount = 0;
  subscribedSockets.clear();
}

const DEFAULT_CHAINS_UP = [
  'eip155:1',
  'eip155:10',
  'eip155:56',
  'eip155:137',
  'eip155:143',
  'eip155:534352',
  'eip155:8453',
  'eip155:42161',
  'eip155:59144',
  'eip155:999',
  'eip155:1337',
];

const DEFAULT_ACCOUNT_ACTIVITY_WS_MOCKS: WebSocketMessageMock[] = [
  {
    messageIncludes: ['unsubscribe'],
    response: {
      event: 'unsubscribed',
      timestamp: Date.now(),
      data: {
        requestId: 'mock-unsubscribe-response',
        succeeded: [],
        failed: [],
      },
    },
    delay: 100,
    logMessage: 'AccountActivity unsubscribe message received from client',
  },
];

export async function setupAccountActivityMocks(
  server: LocalWebSocketServer,
  mocks: WebSocketMessageMock[] = [],
  options?: Record<string, unknown>,
): Promise<void> {
  const wsServer = server.getServer();

  const chainsUp =
    (options?.chainsUp as string[] | undefined) ?? DEFAULT_CHAINS_UP;

  const mergedMocks: WebSocketMessageMock[] = [
    ...mocks,
    ...DEFAULT_ACCOUNT_ACTIVITY_WS_MOCKS,
  ];

  resetAccountActivityMockState();

  let sessionCounter = 0;

  wsServer.on('connection', (socket: WebSocket) => {
    sessionCounter += 1;
    const sessionId = `mock-sid-${sessionCounter}`;
    socket.send(
      JSON.stringify({
        event: 'session-created',
        timestamp: Date.now(),
        data: { sessionId },
      }),
    );
    logger.info(`Session created: sessionId=${sessionId}`);

    socket.on('message', (data) => {
      const raw = data.toString();

      let parsed: Record<string, unknown> | undefined;
      try {
        parsed = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        // Not JSON — fall through to string-match mocks
      }

      if (parsed && typeof parsed.event === 'string') {
        const eventType = parsed.event;
        const eventData = (parsed.data ?? {}) as Record<string, unknown>;

        if (eventType === 'subscribe' && eventData.channels) {
          const requestId = eventData.requestId as string;
          const channels = eventData.channels as string[];
          subscriptionCount += 1;
          subscribedSockets.add(socket);
          const subscriptionId = `mock-sub-${subscriptionCount}`;

          logger.info(`Subscribe received: channels=${channels.join(', ')}`);

          const subscribeResponse = {
            event: 'subscribed',
            timestamp: Date.now(),
            data: {
              requestId,
              subscriptionId,
              succeeded: channels,
              failed: [],
            },
          };

          setTimeout(() => {
            socket.send(JSON.stringify(subscribeResponse));
            logger.info(
              `Subscribe response sent: subscriptionId=${subscriptionId}`,
            );

            const waiters = [...subscriptionWaiters];
            subscriptionWaiters = [];
            for (const waiter of waiters) {
              waiter.resolve(subscriptionId);
            }
          }, 100);

          if (chainsUp.length > 0) {
            const systemNotification = {
              event: 'system-notification',
              channel: 'system-notifications.v1.account-activity.v1',
              data: {
                chainIds: chainsUp,
                status: 'up',
              },
              timestamp: Date.now(),
            };

            setTimeout(() => {
              socket.send(JSON.stringify(systemNotification));
              logger.info(
                `System notification sent: ${chainsUp.length} chains up`,
              );
            }, 200);
          }

          return;
        }

        if (eventType === 'unsubscribe' && eventData.subscription) {
          const requestId = eventData.requestId as string;
          const channels = (eventData.channels ?? []) as string[];

          logger.info(
            `Unsubscribe received: subscription=${eventData.subscription as string}`,
          );

          const unsubscribeResponse = {
            event: 'unsubscribed',
            timestamp: Date.now(),
            data: {
              requestId,
              succeeded: channels,
              failed: [],
            },
          };

          setTimeout(() => {
            socket.send(JSON.stringify(unsubscribeResponse));
            logger.info('Unsubscribe response sent');
          }, 100);

          return;
        }
      }

      for (const mock of mergedMocks) {
        const includes = Array.isArray(mock.messageIncludes)
          ? mock.messageIncludes
          : [mock.messageIncludes];

        const matches = includes.every((includeStr) =>
          raw.includes(includeStr),
        );

        if (matches) {
          if (mock.logMessage) {
            logger.info(mock.logMessage);
          }

          const delay = mock.delay ?? 500;
          setTimeout(() => {
            socket.send(JSON.stringify(mock.response));
            logger.debug(`Fallback mock sent for: ${includes.join(' + ')}`);
          }, delay);

          break;
        }
      }
    });
  });
}

/**
 * Creates a balance-update notification to push from tests via
 * `WebSocketRegistry.getServer('accountActivity').sendMessage(...)`.
 *
 * This is test infrastructure API — the docstring is necessary for test authors
 * to construct valid notification payloads.
 */
export function createBalanceUpdateNotification(options: {
  subscriptionId: string;
  channel: string;
  address: string;
  chain: string;
  updates: {
    asset: {
      fungible: boolean;
      type: string;
      unit: string;
      decimals: number;
    };
    postBalance: { amount: string };
    transfers: { from: string; to: string; amount: string }[];
  }[];
}): Record<string, unknown> {
  return {
    event: 'data',
    subscriptionId: options.subscriptionId,
    channel: options.channel,
    data: {
      address: options.address,
      tx: {
        id: `0x${Date.now().toString(16)}`,
        chain: options.chain,
        status: 'confirmed',
        timestamp: Math.floor(Date.now() / 1000),
        from: '0x0000000000000000000000000000000000000000',
        to: options.address,
      },
      updates: options.updates,
    },
    timestamp: Date.now(),
  };
}
