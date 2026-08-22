import { AppState, type AppStateStatus } from 'react-native';
import type { AutorampRemoteSnapshot } from '@metamask/ramps-controller';
import Engine from '../../../../../../core/Engine';

/**
 * Demo WebSocket URL for neo-bank status pushes from the Ramps Dev API.
 * Adjust if the real path differs from OpenAPI.
 */
export const NEOBANK_WS_URL =
  process.env.MM_NEOBANK_WS_URL ??
  'wss://on-ramp.dev-api.cx.metamask.io/neobank/ws';

type NeobankWsListener = (event: {
  remote: AutorampRemoteSnapshot;
  raw: unknown;
}) => void;

/**
 * Best-effort mapper from a neo-bank websocket payload into an autoramp snapshot.
 * Accepts either a bare MoonPay-shaped object or a wrapped `{ type, data }` event.
 */
export function mapNeobankWsMessageToRemoteSnapshot(
  raw: unknown,
): AutorampRemoteSnapshot | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const envelope = raw as Record<string, unknown>;
  const payload =
    envelope.data && typeof envelope.data === 'object'
      ? (envelope.data as Record<string, unknown>)
      : envelope;

  const id =
    typeof payload.id === 'string'
      ? payload.id
      : typeof payload.autoramp_id === 'string'
        ? payload.autoramp_id
        : null;
  const customerId =
    typeof payload.customer_id === 'string'
      ? payload.customer_id
      : typeof payload.customerId === 'string'
        ? payload.customerId
        : null;
  const status = typeof payload.status === 'string' ? payload.status : null;

  if (!id || !customerId || !status) {
    return null;
  }

  const walletAddress =
    typeof payload.wallet_address === 'string'
      ? payload.wallet_address
      : typeof payload.walletAddress === 'string'
        ? payload.walletAddress
        : undefined;

  return {
    id,
    customerId,
    status,
    walletAddress,
  };
}

/**
 * Feature-scoped neo-bank WebSocket client (demo).
 * Opens while the Virtual Bank Account screen is focused and forwards
 * status pushes into `RampsController.applyAutorampStatusFromPush`.
 */
export class NeobankWebSocket {
  static #instance: NeobankWebSocket | null = null;

  #socket: WebSocket | null = null;
  #appStateSubscription: { remove: () => void } | null = null;
  #shouldBeConnected = false;
  #reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  #listeners = new Set<NeobankWsListener>();

  static getInstance(): NeobankWebSocket {
    if (!NeobankWebSocket.#instance) {
      NeobankWebSocket.#instance = new NeobankWebSocket();
    }
    return NeobankWebSocket.#instance;
  }

  connect(): void {
    this.#shouldBeConnected = true;
    this.#ensureAppStateListener();
    this.#openSocket();
  }

  disconnect(): void {
    this.#shouldBeConnected = false;
    this.#clearReconnectTimer();
    this.#closeSocket();
    this.#teardownAppStateListener();
  }

  addListener(listener: NeobankWsListener): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  #ensureAppStateListener(): void {
    if (this.#appStateSubscription) {
      return;
    }
    this.#appStateSubscription = AppState.addEventListener(
      'change',
      this.#handleAppStateChange,
    );
  }

  #teardownAppStateListener(): void {
    this.#appStateSubscription?.remove();
    this.#appStateSubscription = null;
  }

  #handleAppStateChange = (nextAppState: AppStateStatus): void => {
    if (!this.#shouldBeConnected) {
      return;
    }
    if (nextAppState === 'active') {
      this.#openSocket();
    } else if (nextAppState === 'background') {
      this.#closeSocket();
    }
  };

  #openSocket(): void {
    if (
      this.#socket &&
      (this.#socket.readyState === WebSocket.OPEN ||
        this.#socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.#closeSocket();

    try {
      const socket = new WebSocket(NEOBANK_WS_URL);
      this.#socket = socket;

      socket.onmessage = (event) => {
        this.#handleMessage(event.data);
      };

      socket.onerror = () => {
        // Reconnect is driven by onclose.
      };

      socket.onclose = () => {
        this.#socket = null;
        if (this.#shouldBeConnected) {
          this.#scheduleReconnect();
        }
      };
    } catch {
      this.#scheduleReconnect();
    }
  }

  #closeSocket(): void {
    if (!this.#socket) {
      return;
    }
    try {
      this.#socket.onmessage = null;
      this.#socket.onerror = null;
      this.#socket.onclose = null;
      this.#socket.close();
    } catch {
      // Socket may already be torn down.
    }
    this.#socket = null;
  }

  #scheduleReconnect(): void {
    this.#clearReconnectTimer();
    this.#reconnectTimer = setTimeout(() => {
      this.#reconnectTimer = null;
      if (this.#shouldBeConnected) {
        this.#openSocket();
      }
    }, 3000);
  }

  #clearReconnectTimer(): void {
    if (this.#reconnectTimer) {
      clearTimeout(this.#reconnectTimer);
      this.#reconnectTimer = null;
    }
  }

  #handleMessage(data: unknown): void {
    let parsed: unknown = data;
    if (typeof data === 'string') {
      try {
        parsed = JSON.parse(data);
      } catch {
        return;
      }
    }

    const remote = mapNeobankWsMessageToRemoteSnapshot(parsed);
    if (!remote) {
      return;
    }

    try {
      Engine.context.RampsController.applyAutorampStatusFromPush(remote);
    } catch {
      // Engine may not be ready during early boot.
    }

    for (const listener of this.#listeners) {
      try {
        listener({ remote, raw: parsed });
      } catch {
        // A failing listener must not break the socket.
      }
    }
  }
}
