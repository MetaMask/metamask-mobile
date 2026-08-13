import { AppState, type AppStateStatus } from 'react-native';
import type { AutorampRemoteSnapshot } from '@metamask/ramps-controller';
import Engine from '../../../../../../core/Engine';
import { getNeobankEventsUrl } from '../../../../Money/utils/neobankEvents';

type NeobankWsListener = (event: {
  remote: AutorampRemoteSnapshot;
  raw: unknown;
}) => void;

const AUTORAMP_EVENT_TYPES = new Set([
  'new_autoramp',
  'register_autoramp_status',
  'deposit_address_created',
]);

export type NeobankWsMessageAction =
  | { action: 'apply'; remote: AutorampRemoteSnapshot }
  | { action: 'refresh'; autorampId: string };

/**
 * Interprets a neobank-proxy WebSocket JSON message.
 *
 * Prefers the proxy NormalizedEvent shape (`category` / `entity` /
 * `customerId`). Falls back to a bare MoonPay-shaped autoramp object for
 * older demos. Pointer events without a status become a REST refresh.
 */
export function interpretNeobankWsMessage(
  raw: unknown,
): NeobankWsMessageAction | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const envelope = raw as Record<string, unknown>;

  const isNormalizedAutoramp =
    envelope.category === 'autoramp' ||
    (typeof envelope.type === 'string' &&
      AUTORAMP_EVENT_TYPES.has(envelope.type));

  if (isNormalizedAutoramp) {
    const entity =
      envelope.entity && typeof envelope.entity === 'object'
        ? (envelope.entity as Record<string, unknown>)
        : null;
    const autorampId = typeof entity?.id === 'string' ? entity.id : null;
    const customerId =
      typeof envelope.customerId === 'string'
        ? envelope.customerId
        : typeof envelope.userId === 'string'
          ? envelope.userId
          : null;
    const status = typeof entity?.status === 'string' ? entity.status : null;
    const needsFetch = entity?.needsFetch === true;

    if (!autorampId) {
      return null;
    }

    if (status && customerId && !needsFetch) {
      return {
        action: 'apply',
        remote: {
          id: autorampId,
          customerId,
          status,
        },
      };
    }

    return { action: 'refresh', autorampId };
  }

  // Legacy / bare MoonPay-shaped payload (or `{ data: { … } }` wrap).
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
    action: 'apply',
    remote: {
      id,
      customerId,
      status,
      walletAddress,
    },
  };
}

/**
 * Maps a WebSocket payload to an autoramp snapshot when the message can be
 * applied directly (no REST refresh required).
 */
export function mapNeobankWsMessageToRemoteSnapshot(
  raw: unknown,
): AutorampRemoteSnapshot | null {
  const interpreted = interpretNeobankWsMessage(raw);
  return interpreted?.action === 'apply' ? interpreted.remote : null;
}

/**
 * Feature-scoped neo-bank WebSocket client (demo).
 *
 * Connects to `wss://…/neobank/events?userId=…` (proxy routing key). The proxy
 * sends protocol-level ping frames ~every 30s to survive ALB idle timeout;
 * React Native auto-replies with pong — no client ping timer is required.
 * Still reconnects on close and refreshes autoramps on open so missed pushes
 * are caught up.
 */
export class NeobankWebSocket {
  static #instance: NeobankWebSocket | null = null;

  #socket: WebSocket | null = null;
  #customerId: string | null = null;
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

  /** Test helper — tears down the singleton. */
  static resetInstanceForTests(): void {
    NeobankWebSocket.#instance?.disconnect();
    NeobankWebSocket.#instance = null;
  }

  /**
   * Opens (or reopens) the socket for the MoonPay customer routing key.
   *
   * @param customerId - MoonPay / Iron customer UUID (`userId` query param).
   */
  connect(customerId: string): void {
    const trimmed = customerId.trim();
    if (!trimmed) {
      return;
    }

    if (this.#customerId !== trimmed) {
      this.#closeSocket();
      this.#customerId = trimmed;
    }

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
    if (!this.#customerId) {
      return;
    }

    if (
      this.#socket &&
      (this.#socket.readyState === WebSocket.OPEN ||
        this.#socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.#closeSocket();

    try {
      const socket = new WebSocket(getNeobankEventsUrl(this.#customerId));
      this.#socket = socket;

      socket.onopen = () => {
        this.#refreshAutorampsQuietly();
      };

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
      this.#socket.onopen = null;
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

  #refreshAutorampsQuietly(): void {
    try {
      Engine.context.RampsController.refreshAutoramps().catch(() => undefined);
    } catch {
      // Engine may not be ready during early boot.
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

    const interpreted = interpretNeobankWsMessage(parsed);
    if (!interpreted) {
      return;
    }

    if (interpreted.action === 'refresh') {
      try {
        Engine.context.RampsController.refreshAutoramp(
          interpreted.autorampId,
        ).catch(() => undefined);
      } catch {
        // Engine may not be ready during early boot.
      }
      return;
    }

    const { remote } = interpreted;

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
