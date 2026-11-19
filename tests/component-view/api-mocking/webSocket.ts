/**
 * Fake WebSocket for component view tests that exercise a live socket.
 *
 * The CV setup replaces `globalThis.WebSocket` with the net connect guard's
 * tripwire, which records every construction and fails the test afterwards.
 * A test that really needs a socket swaps the tripwire for the fake here,
 * scripts its frames, and asserts on what reached the wire. There is no
 * allowlist: a socket the fake did not serve is still reported.
 */

import { installWebSocketTripwire } from '../../../app/util/test/netConnectGuard';

type FakeWebSocketListener = (event: { data?: unknown }) => void;

export class FakeWebSocket {
  static instances: FakeWebSocket[] = [];

  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = FakeWebSocket.CONNECTING;
  onopen: FakeWebSocketListener | null = null;
  onmessage: FakeWebSocketListener | null = null;
  onerror: FakeWebSocketListener | null = null;
  onclose: FakeWebSocketListener | null = null;

  readonly url: string;
  readonly sent: unknown[] = [];
  private readonly listeners = new Map<string, FakeWebSocketListener[]>();

  constructor(url: string | URL) {
    this.url = String(url);
    FakeWebSocket.instances.push(this);
  }

  addEventListener = (type: string, listener: FakeWebSocketListener): void => {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  };

  send = (data: unknown): void => {
    this.sent.push(data);
  };

  close = (): void => {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.({});
    this.dispatch('close', {});
  };

  /** Flips the socket open, fires `onopen`, and optionally delivers a frame. */
  openAndDeliver(data?: unknown): void {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.({});
    this.dispatch('open', {});
    if (data !== undefined) {
      this.deliver(data);
    }
  }

  /** Delivers one message frame to the consumer. */
  deliver(data: unknown): void {
    this.onmessage?.({ data });
    this.dispatch('message', { data });
  }

  private dispatch(type: string, event: { data?: unknown }): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

export interface FakeWebSocketHandle {
  /** Every socket constructed since the last clear, in order. */
  instances: FakeWebSocket[];
}

/**
 * Serves every `new WebSocket(url)` the app makes with a scriptable fake.
 * Call in `beforeEach`; call {@link clearFakeWebSocket} in `afterEach`.
 */
export function setupFakeWebSocket(): FakeWebSocketHandle {
  globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket;
  return { instances: FakeWebSocket.instances };
}

/** Restores the guard's tripwire and forgets the recorded sockets. */
export function clearFakeWebSocket(): void {
  installWebSocketTripwire();
  FakeWebSocket.instances = [];
}
