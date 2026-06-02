const RELAY_URLS = {
  DEV: 'wss://mm-sdk-relay.dev-api.cx.metamask.io/connection/websocket',
  PROD: 'wss://mm-sdk-relay.api.cx.metamask.io/connection/websocket',
} as const;

/** MWP relay WebSocket URL for the current build environment. */
export const getMwpRelayUrl = (): string =>
  process.env.METAMASK_ENVIRONMENT === 'dev' ? RELAY_URLS.DEV : RELAY_URLS.PROD;
