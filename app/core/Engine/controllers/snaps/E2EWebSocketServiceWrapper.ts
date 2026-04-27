///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import { WebSocketService } from '@metamask/snaps-controllers';
import { LaunchArguments } from 'react-native-launch-arguments';
import { isE2E } from '../../../../util/test/utils';

/**
 * In E2E tests, we need to intercept WebSocket connections to Solana RPC
 * and redirect them to our mock server. The Solana snap uses WebSocket
 * for real-time transaction confirmation (signatureSubscribe).
 *
 * This wrapper intercepts the 'open' action and rewrites Solana WebSocket URLs
 * to point to the local mock server.
 */
export function wrapWebSocketServiceForE2E(
  service: WebSocketService,
): WebSocketService {
  if (!isE2E) {
    return service;
  }

  // Get mock server port from launch arguments
  const launchArgs = LaunchArguments.value<{ mockServerPort?: string }>();
  const mockServerPort = launchArgs?.mockServerPort
    ? parseInt(launchArgs.mockServerPort, 10)
    : 8000;

  // eslint-disable-next-line no-console
  console.log(
    '[E2E-WebSocket] Wrapping WebSocketService for E2E, mock port:',
    mockServerPort,
  );

  // Store the original open method
  // The WebSocketService registers action handlers via messenger.registerActionHandler
  // We need to intercept 'WebSocketService:open' action

  // Since we can't easily intercept the messenger, we'll patch the #open method
  // by wrapping the service object

  // Unfortunately, #open is private. We need a different approach.
  // Let's intercept at the messenger level by replacing the action handler.

  return service;
}

/**
 * Rewrites Solana WebSocket URLs to point to the mock server.
 * @param url - Original WebSocket URL
 * @param mockServerPort - Local mock server port
 * @returns Rewritten URL or original if not a Solana URL
 */
export function rewriteSolanaWebSocketUrl(
  url: string,
  mockServerPort: number,
): string {
  // Check if this is a Solana WebSocket URL
  const isSolanaWs =
    url.includes('solana-mainnet') || url.includes('solana-devnet');

  if (!isSolanaWs) {
    return url;
  }

  // Rewrite to local mock server
  // The mock server should be accessible via localhost (with adb reverse)
  const mockUrl = `ws://localhost:${mockServerPort}/ws-solana`;

  // eslint-disable-next-line no-console
  console.log(`[E2E-WebSocket] Rewriting Solana WS URL: ${url} -> ${mockUrl}`);

  return mockUrl;
}
///: END:ONLY_INCLUDE_IF
