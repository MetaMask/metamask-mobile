/**
 * WebSocket service definitions for E2E testing.
 *
 * Each entry defines a WebSocket service the app connects to in production,
 * along with the fallback port used by the local mock server in E2E tests.
 *
 * Adding a new WebSocket service:
 * 1. Add a new entry here with the production URL prefix and a unique fallback port
 * 2. The shim.js route table will automatically pick it up
 * 3. Register the fallback port in PortManager / FixtureUtils for adb reverse
 */

export interface WebSocketServiceConfig {
  /** Production URL prefix to match (e.g. 'wss://gateway.api.cx.metamask.io') */
  url: string;
  /** Static fallback port for the local mock server in E2E tests */
  fallbackPort: number;
  /** LaunchArgs key used to pass the actual allocated port on iOS */
  launchArgKey: string;
}

export const ACCOUNT_ACTIVITY_WS: WebSocketServiceConfig = {
  url: 'wss://gateway.api.cx.metamask.io',
  fallbackPort: 8089,
  launchArgKey: 'accountActivityWsPort',
};

/**
 * All WebSocket service configs, used by shim.js to build the route table.
 * When adding a new service, add it to this array.
 */
export const WS_SERVICES: WebSocketServiceConfig[] = [ACCOUNT_ACTIVITY_WS];
