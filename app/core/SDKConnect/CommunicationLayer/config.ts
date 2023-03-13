export const DEFAULT_SERVER_URL =
  'https://metamask-sdk-socket.metafi.codefi.network/';
export const DEFAULT_SOCKET_TRANSPORTS = ['polling', 'websocket'];
// TODO version should be parsed from package.json or set dynamically during build
export const VERSION = '0.1.0';
export const MIN_IN_MS = 1000 * 60;
export const HOUR_IN_MS = MIN_IN_MS * 60;
export const DAY_IN_MS = HOUR_IN_MS * 24;
export const DEFAULT_SESSION_TIMEOUT_MS = 7 * DAY_IN_MS;

// time upon which we wait for a metamask reocnnection before creating a new channel
export const CHANNEL_MAX_WAITING_TIME = 3 * 1000; // 3 seconds
