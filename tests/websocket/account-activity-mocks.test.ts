// eslint-disable-next-line @typescript-eslint/no-shadow, import-x/no-extraneous-dependencies
import { WebSocket } from 'ws';
import LocalWebSocketServer from './server.ts';
import {
  setupAccountActivityMocks,
  waitForAccountActivitySubscription,
  waitForAccountActivityDisconnection,
  getAccountActivitySubscriptionCount,
  resetAccountActivityMockState,
  createBalanceUpdateNotification,
} from './account-activity-mocks.ts';

jest.mock('../framework/logger.ts', () => ({
  LogLevel: { ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3, TRACE: 4 },
  createLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

describe('Account Activity WebSocket Mocks', () => {
  let server: LocalWebSocketServer;
  let clients: WebSocket[];
  let testPort: number;

  beforeEach(async () => {
    clients = [];
    testPort = 51000 + Math.floor(Math.random() * 9000);
    server = new LocalWebSocketServer('test-account-activity');
    server.setServerPort(testPort);
    await server.start();
    await setupAccountActivityMocks(server);
  });

  afterEach(async () => {
    resetAccountActivityMockState();
    for (const c of clients) {
      if (
        c.readyState === WebSocket.OPEN ||
        c.readyState === WebSocket.CONNECTING
      ) {
        c.close();
      }
    }
    clients = [];
    await server.stop();
  });

  function connectAndCollect(
    count: number,
    port?: number,
  ): Promise<{ ws: WebSocket; messages: Record<string, unknown>[] }> {
    return new Promise((resolve) => {
      const messages: Record<string, unknown>[] = [];
      const ws = new WebSocket(`ws://localhost:${port ?? testPort}`);
      clients.push(ws);

      ws.on('message', (data) => {
        messages.push(JSON.parse(data.toString()) as Record<string, unknown>);
        if (messages.length >= count) {
          resolve({ ws, messages });
        }
      });
    });
  }

  function nextMessage(ws: WebSocket): Promise<Record<string, unknown>> {
    return new Promise((resolve) => {
      ws.once('message', (data) => {
        resolve(JSON.parse(data.toString()) as Record<string, unknown>);
      });
    });
  }

  describe('session-created on connection', () => {
    it('sends session-created on new connection', async () => {
      const { messages } = await connectAndCollect(1);

      expect(messages[0].event).toBe('session-created');
      expect((messages[0].data as Record<string, unknown>).sessionId).toMatch(
        /^mock-sid-/,
      );
    });
  });

  describe('subscribe flow', () => {
    it('responds to subscribe with subscribed event containing requestId', async () => {
      const { ws } = await connectAndCollect(1);

      const responsePromise = nextMessage(ws);
      ws.send(
        JSON.stringify({
          event: 'subscribe',
          data: {
            requestId: 'req-123',
            channels: ['eip155:1'],
          },
        }),
      );

      const response = await responsePromise;
      expect(response.event).toBe('subscribed');
      const data = response.data as Record<string, unknown>;
      expect(data.requestId).toBe('req-123');
      expect(data.subscriptionId).toMatch(/^mock-sub-/);
      expect(data.succeeded).toEqual(['eip155:1']);
    });

    it('sends system-notification after subscribe with chains up', async () => {
      const { ws } = await connectAndCollect(1);

      const collected: Record<string, unknown>[] = [];
      const messagesPromise = new Promise<Record<string, unknown>[]>(
        (resolve) => {
          ws.on('message', (data) => {
            collected.push(
              JSON.parse(data.toString()) as Record<string, unknown>,
            );
            if (collected.length >= 2) {
              resolve(collected);
            }
          });
        },
      );

      ws.send(
        JSON.stringify({
          event: 'subscribe',
          data: {
            requestId: 'req-456',
            channels: ['eip155:1'],
          },
        }),
      );

      const messages = await messagesPromise;
      const notification = messages.find(
        (m) => m.event === 'system-notification',
      );
      expect(notification).toBeDefined();
      const notifData = (notification as Record<string, unknown>)
        .data as Record<string, unknown>;
      expect(notifData.status).toBe('up');
      expect(Array.isArray(notifData.chainIds)).toBe(true);
    });
  });

  describe('unsubscribe flow', () => {
    it('responds to unsubscribe with unsubscribed event', async () => {
      const { ws } = await connectAndCollect(1);

      const responsePromise = nextMessage(ws);
      ws.send(
        JSON.stringify({
          event: 'unsubscribe',
          data: {
            requestId: 'unsub-req-1',
            subscription: 'mock-sub-1',
            channels: ['eip155:1'],
          },
        }),
      );

      const response = await responsePromise;
      expect(response.event).toBe('unsubscribed');
      const data = response.data as Record<string, unknown>;
      expect(data.requestId).toBe('unsub-req-1');
    });
  });

  describe('waitForAccountActivitySubscription()', () => {
    it('resolves with subscriptionId after subscribe', async () => {
      const subscriptionPromise = waitForAccountActivitySubscription(10_000);
      const { ws } = await connectAndCollect(1);

      ws.send(
        JSON.stringify({
          event: 'subscribe',
          data: {
            requestId: 'wait-req-1',
            channels: ['eip155:1'],
          },
        }),
      );

      const subscriptionId = await subscriptionPromise;
      expect(subscriptionId).toMatch(/^mock-sub-/);
    });

    it('rejects on timeout', async () => {
      const subscriptionPromise = waitForAccountActivitySubscription(100);

      await expect(subscriptionPromise).rejects.toThrow(/Timed out/);
    });
  });

  describe('getAccountActivitySubscriptionCount()', () => {
    it('returns 0 before any subscribe', () => {
      expect(getAccountActivitySubscriptionCount()).toBe(0);
    });

    it('increments for each subscribe handshake', async () => {
      const { ws: ws1 } = await connectAndCollect(1);
      const sub1Promise = waitForAccountActivitySubscription(5_000);
      ws1.send(
        JSON.stringify({
          event: 'subscribe',
          data: { requestId: 'count-req-1', channels: ['eip155:1'] },
        }),
      );
      await sub1Promise;
      expect(getAccountActivitySubscriptionCount()).toBe(1);

      const { ws: ws2 } = await connectAndCollect(1);
      const sub2Promise = waitForAccountActivitySubscription(5_000);
      ws2.send(
        JSON.stringify({
          event: 'subscribe',
          data: { requestId: 'count-req-2', channels: ['eip155:137'] },
        }),
      );
      await sub2Promise;
      expect(getAccountActivitySubscriptionCount()).toBe(2);
    });

    it('resets to 0 after resetAccountActivityMockState()', async () => {
      const { ws } = await connectAndCollect(1);
      const subPromise = waitForAccountActivitySubscription(5_000);
      ws.send(
        JSON.stringify({
          event: 'subscribe',
          data: { requestId: 'count-reset-req', channels: ['eip155:1'] },
        }),
      );
      await subPromise;
      expect(getAccountActivitySubscriptionCount()).toBe(1);

      resetAccountActivityMockState();
      expect(getAccountActivitySubscriptionCount()).toBe(0);
    });
  });

  describe('waitForAccountActivityDisconnection()', () => {
    it('resolves immediately when no sockets have subscribed', async () => {
      await expect(
        waitForAccountActivityDisconnection(1_000),
      ).resolves.toBeUndefined();
    });

    it('resolves when subscribed socket closes', async () => {
      const { ws } = await connectAndCollect(1);
      const subPromise = waitForAccountActivitySubscription(5_000);
      ws.send(
        JSON.stringify({
          event: 'subscribe',
          data: { requestId: 'dc-req-1', channels: ['eip155:1'] },
        }),
      );
      await subPromise;

      const disconnectPromise = waitForAccountActivityDisconnection(5_000);
      ws.close();
      await expect(disconnectPromise).resolves.toBeUndefined();
    });

    it('rejects on timeout when socket stays open', async () => {
      const { ws } = await connectAndCollect(1);
      const subPromise = waitForAccountActivitySubscription(5_000);
      ws.send(
        JSON.stringify({
          event: 'subscribe',
          data: { requestId: 'dc-req-2', channels: ['eip155:1'] },
        }),
      );
      await subPromise;

      expect(getAccountActivitySubscriptionCount()).toBe(1);

      await expect(waitForAccountActivityDisconnection(300)).rejects.toThrow(
        'Timed out',
      );

      ws.close();
    }, 10_000);

    it('resolves after resetAccountActivityMockState clears tracked sockets', async () => {
      const { ws } = await connectAndCollect(1);
      const subPromise = waitForAccountActivitySubscription(5_000);
      ws.send(
        JSON.stringify({
          event: 'subscribe',
          data: { requestId: 'dc-req-3', channels: ['eip155:1'] },
        }),
      );
      await subPromise;

      resetAccountActivityMockState();

      await expect(
        waitForAccountActivityDisconnection(1_000),
      ).resolves.toBeUndefined();
    });
  });

  describe('resetAccountActivityMockState()', () => {
    it('clears pending waiters so new waiters work independently', async () => {
      const stalePromise = waitForAccountActivitySubscription(60_000);

      resetAccountActivityMockState();

      const freshPromise = waitForAccountActivitySubscription(100);
      await expect(freshPromise).rejects.toThrow(/Timed out/);

      stalePromise.catch(() => {
        /* timer was cleared by reset — expected */
      });
    });
  });

  describe('createBalanceUpdateNotification()', () => {
    it('returns correctly shaped notification object', () => {
      const notification = createBalanceUpdateNotification({
        subscriptionId: 'sub-1',
        channel: 'eip155:1.account-activity',
        address: '0xabc',
        chain: 'eip155:1',
        updates: [
          {
            asset: {
              fungible: true,
              type: 'native',
              unit: 'ETH',
              decimals: 18,
            },
            postBalance: { amount: '1000000000000000000' },
            transfers: [
              {
                from: '0x000',
                to: '0xabc',
                amount: '1000000000000000000',
              },
            ],
          },
        ],
      });

      expect(notification.event).toBe('data');
      expect(notification.subscriptionId).toBe('sub-1');
      expect(notification.channel).toBe('eip155:1.account-activity');
      const data = notification.data as Record<string, unknown>;
      expect(data.address).toBe('0xabc');
      const tx = data.tx as Record<string, unknown>;
      expect(tx.chain).toBe('eip155:1');
      expect(tx.status).toBe('confirmed');
      expect(typeof tx.id).toBe('string');
      expect(typeof tx.timestamp).toBe('number');
      expect(Array.isArray(data.updates)).toBe(true);
    });
  });

  describe('fallback string-match mocks', () => {
    it('responds via string-match fallback for messages matching messageIncludes', async () => {
      const { ws } = await connectAndCollect(1);

      const responsePromise = nextMessage(ws);
      ws.send('I want to unsubscribe from everything');

      const response = await responsePromise;
      expect(response.event).toBe('unsubscribed');
    });
  });

  describe('custom mocks', () => {
    it('uses custom mocks passed to setup (override behavior)', async () => {
      await server.stop();

      const customPort = testPort + 1;
      const customServer = new LocalWebSocketServer('test-custom-mocks');
      customServer.setServerPort(customPort);
      await customServer.start();

      await setupAccountActivityMocks(customServer, [
        {
          messageIncludes: 'custom-trigger',
          response: { custom: true, event: 'custom-response' },
          delay: 10,
        },
      ]);

      const { ws: customWs, messages: sessionMsgs } = await connectAndCollect(
        1,
        customPort,
      );
      expect(sessionMsgs[0].event).toBe('session-created');

      const responsePromise = nextMessage(customWs);
      customWs.send('custom-trigger');

      const response = await responsePromise;
      expect(response.custom).toBe(true);
      expect(response.event).toBe('custom-response');

      customWs.close();
      await customServer.stop();
    });
  });
});
