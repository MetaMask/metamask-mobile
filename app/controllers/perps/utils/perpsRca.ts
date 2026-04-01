import { DevLogger } from '../../../core/SDKConnect/utils/DevLogger';

export type PerpsRcaEvent = {
  marker: string;
  timestamp: string;
  data?: Record<string, unknown>;
};

export type PerpsRcaSnapshot = {
  failNextWsInitialize: boolean;
  lastConnectSource: string | null;
  events: PerpsRcaEvent[];
};

type PerpsRcaState = PerpsRcaSnapshot;

type PerpsRcaGlobal = typeof globalThis & {
  __PERPS_RCA_STATE__?: PerpsRcaState;
};

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

function getMutableState(): PerpsRcaState {
  const globalState = getGlobalState();

  if (!globalState.__PERPS_RCA_STATE__) {
    globalState.__PERPS_RCA_STATE__ = createDefaultState();
  }

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
