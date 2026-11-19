// eslint-disable-next-line import-x/no-extraneous-dependencies
import nock from 'nock';
import {
  checkBlockedRequests,
  installNetConnectGuard,
  installWebSocketTripwire,
} from '../../../app/util/test/netConnectGuard';
import { disableNetConnect, teardownNock } from './nockHelpers';
import {
  clearFakeWebSocket,
  setupFakeWebSocket,
  type FakeWebSocket,
} from './webSocket';

// Installs the same root-level hooks testSetupView.js installs for view
// tests, so these fences run against the production wiring.
installNetConnectGuard();
installWebSocketTripwire();

const currentTestName = () => expect.getState().currentTestName ?? '';

describe('netConnectGuard', () => {
  it('fails a test whose app code swallows an unmocked request', async () => {
    const appCodeThatSwallowsErrors = async () => {
      try {
        await fetch('https://unmocked-guard.example.com/v1/things');
      } catch {
        return null;
      }
    };

    await appCodeThatSwallowsErrors();

    const error = await checkBlockedRequests(currentTestName()).catch(
      (caught) => caught,
    );
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain(currentTestName());
    expect(error.message).toContain(
      'GET https://unmocked-guard.example.com/v1/things',
    );
    expect(error.message).toContain('tests/component-view/api-mocking/');

    // The check clears the registry, so the root-level afterEach the guard
    // installed sees no leftover requests.
    await expect(
      checkBlockedRequests(currentTestName()),
    ).resolves.toBeUndefined();
  });

  it('does not fail a test whose requests are mocked', async () => {
    nock('https://mocked-guard.example.com')
      .get('/v1/things')
      .reply(200, { ok: true })
      .persist();

    const response = await fetch('https://mocked-guard.example.com/v1/things');

    expect(response.status).toBe(200);
    // Also proves the previous test's records did not leak into this one.
    await expect(
      checkBlockedRequests(currentTestName()),
    ).resolves.toBeUndefined();
  });

  it('records a request fired without awaiting it', async () => {
    fetch('https://unmocked-forgot-await.example.com/v1/fire-and-forget').catch(
      () => undefined,
    );

    await expect(checkBlockedRequests(currentTestName())).rejects.toThrow(
      'GET https://unmocked-forgot-await.example.com/v1/fire-and-forget',
    );
  });

  it('records an unmocked path on a mocked host', async () => {
    nock('https://mocked-host-guard.example.com')
      .get('/v1/known')
      .reply(200, { ok: true })
      .persist();

    const appCodeThatSwallowsErrors = async () => {
      try {
        await fetch('https://mocked-host-guard.example.com/v1/unknown');
      } catch {
        return null;
      }
    };
    await appCodeThatSwallowsErrors();

    await expect(checkBlockedRequests(currentTestName())).rejects.toThrow(
      'GET https://mocked-host-guard.example.com/v1/unknown',
    );
  });

  it('records a WebSocket the app opens, never connecting it', async () => {
    const openWebSocketLikeAppCode = () => {
      const socket = new WebSocket('wss://api.hyperliquid.xyz/ws');
      socket.addEventListener('open', () => undefined);
      return socket;
    };

    openWebSocketLikeAppCode();
    const socket = new WebSocket(
      'wss://tripwire.example.com/ws',
    ) as unknown as {
      readyState: number;
      send: () => void;
      close: () => void;
    };

    expect(socket.readyState).toBe(0);
    expect(() => socket.send()).not.toThrow();
    expect(() => socket.close()).not.toThrow();

    await expect(checkBlockedRequests(currentTestName())).rejects.toThrow(
      'Unmocked WebSocket: wss://api.hyperliquid.xyz/ws',
    );
  });
  it('serves sockets through the fake without reporting them', async () => {
    const fake = setupFakeWebSocket();
    const Constructed = globalThis.WebSocket as unknown as typeof FakeWebSocket;
    const socket = new Constructed('wss://fake.example.com/ws');
    socket.openAndDeliver(JSON.stringify({ type: 'welcome' }));

    expect(socket.readyState).toBe(1);
    expect(socket.sent).toEqual([]);
    expect(fake.instances).toHaveLength(1);

    await expect(
      checkBlockedRequests(currentTestName()),
    ).resolves.toBeUndefined();

    clearFakeWebSocket();
  });

  it('probe: aborted fetch with a nock mock does not crash', async () => {
    disableNetConnect();
    nock('https://abort-race.example.com')
      .get('/x')
      .reply(200, { ok: true })
      .persist();
    const controller = new AbortController();
    const promise = fetch('https://abort-race.example.com/x', {
      signal: controller.signal,
    });
    controller.abort();
    await expect(promise).rejects.toThrow();
    await expect(
      checkBlockedRequests(currentTestName()),
    ).resolves.toBeUndefined();
  });
});
