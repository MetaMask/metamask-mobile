import { DevLogger } from '../../../core/SDKConnect/utils/DevLogger';

export interface PerpsRcaEvent {
  marker: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

export interface PerpsRcaSnapshot {
  failNextWsInitialize: boolean;
  lastConnectSource: string | null;
  events: PerpsRcaEvent[];
}

export interface PerpsRcaConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  isInitialized: boolean;
  isDisconnecting: boolean;
  isInGracePeriod: boolean;
  error: string | null;
}

export interface PerpsRcaStateSnapshot extends PerpsRcaSnapshot {
  connectionState: PerpsRcaConnectionState;
}

type PerpsRcaState = PerpsRcaSnapshot;

interface PerpsRcaBridge {
  getConnectionState: () => PerpsRcaConnectionState;
  reproduceConnectionAttempt: (
    source: string,
  ) => Promise<Record<string, unknown>>;
  retryConnection: (source: string) => Promise<Record<string, unknown>>;
}

interface PerpsRcaApi {
  clear: () => PerpsRcaStateSnapshot;
  armFailNextWsInitialize: () => PerpsRcaStateSnapshot;
  getState: () => PerpsRcaStateSnapshot;
  reproduceConnectionAttempt: (
    source?: string,
  ) => Promise<Record<string, unknown>>;
  retryConnection: (source?: string) => Promise<Record<string, unknown>>;
}

interface PerpsRcaGlobal extends GlobalThis {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  __PERPS_RCA_STATE__?: PerpsRcaState;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  __PERPS_RCA__?: PerpsRcaApi;
}

const MAX_RCA_EVENTS = 100;

function getGlobalState(): PerpsRcaGlobal {
  return globalThis as PerpsRcaGlobal;
}

function createDefaultState(): PerpsRcaState {
  return {
    failNextWsInitialize: false,
    lastConnectSource: null,
    events: [],
  };
}

function createDefaultConnectionState(): PerpsRcaConnectionState {
  return {
    isConnected: false,
    isConnecting: false,
    isInitialized: false,
    isDisconnecting: false,
    isInGracePeriod: false,
    error: null,
  };
}

const defaultBridge: PerpsRcaBridge = {
  getConnectionState: () => createDefaultConnectionState(),
  reproduceConnectionAttempt: async (source: string) => ({
    success: false,
    source,
    error: 'PERPS_RCA_BRIDGE_UNAVAILABLE',
  }),
  retryConnection: async (source: string) => ({
    success: false,
    source,
    error: 'PERPS_RCA_BRIDGE_UNAVAILABLE',
  }),
};

let bridge: PerpsRcaBridge = defaultBridge;

function getMutableState(): PerpsRcaState {
  const globalState = getGlobalState();
  globalState.__PERPS_RCA_STATE__ ??= createDefaultState();

  return globalState.__PERPS_RCA_STATE__;
}

export function getPerpsRcaSnapshot(): PerpsRcaSnapshot {
  if (!__DEV__) {
    return createDefaultState();
  }

  const state = getMutableState();

  return {
    failNextWsInitialize: state.failNextWsInitialize,
    lastConnectSource: state.lastConnectSource,
    events: state.events.map((event) => ({
      marker: event.marker,
      timestamp: event.timestamp,
      data: event.data ? { ...event.data } : undefined,
    })),
  };
}

export function getPerpsRcaState(): PerpsRcaStateSnapshot {
  const snapshot = getPerpsRcaSnapshot();

  return {
    ...snapshot,
    connectionState: bridge.getConnectionState(),
  };
}

export function clearPerpsRcaState(): PerpsRcaSnapshot {
  if (!__DEV__) {
    return createDefaultState();
  }

  const state = getMutableState();
  state.failNextWsInitialize = false;
  state.lastConnectSource = null;
  state.events = [];

  return getPerpsRcaSnapshot();
}

export function armPerpsRcaFailNextWsInitialize(): PerpsRcaSnapshot {
  if (!__DEV__) {
    return createDefaultState();
  }

  const state = getMutableState();
  state.failNextWsInitialize = true;

  return getPerpsRcaSnapshot();
}

export function consumePerpsRcaFailNextWsInitialize(): boolean {
  if (!__DEV__) {
    return false;
  }

  const state = getMutableState();

  if (!state.failNextWsInitialize) {
    return false;
  }

  state.failNextWsInitialize = false;
  return true;
}

export function setPerpsRcaLastConnectSource(source: string): void {
  if (!__DEV__) {
    return;
  }

  getMutableState().lastConnectSource = source;
}

export function logPerpsRca(
  marker: string,
  data?: Record<string, unknown>,
): void {
  if (!__DEV__) {
    return;
  }

  const state = getMutableState();
  state.events.push({
    marker,
    timestamp: new Date().toISOString(),
    data: data ? { ...data } : undefined,
  });

  if (state.events.length > MAX_RCA_EVENTS) {
    state.events.shift();
  }

  DevLogger.log(`PERPS-RCA: ${marker}`, data ?? {});
}

function installPerpsRcaApi(): void {
  if (!__DEV__) {
    return;
  }

  getGlobalState().__PERPS_RCA__ = {
    clear: (): PerpsRcaStateSnapshot => {
      clearPerpsRcaState();
      return getPerpsRcaState();
    },
    armFailNextWsInitialize: (): PerpsRcaStateSnapshot => {
      armPerpsRcaFailNextWsInitialize();
      return getPerpsRcaState();
    },
    getState: (): PerpsRcaStateSnapshot => getPerpsRcaState(),
    reproduceConnectionAttempt: (
      source = 'wallet_root_harness',
    ): Promise<Record<string, unknown>> =>
      bridge.reproduceConnectionAttempt(source),
    retryConnection: (
      source = 'recipe_retry',
    ): Promise<Record<string, unknown>> => bridge.retryConnection(source),
  };
}

export function registerPerpsRcaBridge(
  partialBridge: Partial<PerpsRcaBridge>,
): void {
  if (!__DEV__) {
    return;
  }

  bridge = {
    ...bridge,
    ...partialBridge,
  };
  installPerpsRcaApi();
}

installPerpsRcaApi();
