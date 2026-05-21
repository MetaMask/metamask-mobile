/**
 * E2E WebSocket Patch
 *
 * In E2E tests, we need to intercept WebSocket connections from Snaps
 * (specifically Solana wallet snap) and redirect them to our mock server.
 *
 * The Solana snap uses WebSocket for real-time transaction confirmation
 * (signatureSubscribe/signatureNotification). The WebSocketService from
 * @metamask/snaps-controllers uses `new WebSocket(url)` directly, so we
 * patch the global WebSocket constructor to intercept these connections.
 *
 * This approach mirrors how the extension E2E tests work - they use Mockttp's
 * forAnyWebSocket().thenForwardTo() to redirect WebSocket connections. Since
 * React Native doesn't route WebSockets through HTTP proxy, we patch at the
 * constructor level instead.
 */
import { Platform } from 'react-native';
import { LaunchArguments } from 'react-native-launch-arguments';
import { isE2E } from './utils';

interface E2ELaunchArgs {
  mockServerPort?: string;
  solanaWsPort?: string;
}

const SOLANA_WS_URL_PATTERN = /solana-(mainnet|devnet)\.infura\.io/i;

/**
 * Fallback port for Solana WebSocket mock server.
 * On Android, LaunchArguments.value() returns {} (library doesn't integrate with Detox on Android).
 * We use adb reverse to map this fallback port to the actual mock server port.
 * This matches the pattern used for other E2E ports (fixture server, mock server).
 */
export const FALLBACK_SOLANA_WS_PORT = 8088;

/**
 * Patches the global WebSocket constructor for E2E testing.
 * When a WebSocket connection is made to a Solana RPC endpoint,
 * it's redirected to the local mock server.
 */
export function patchWebSocketForE2E(): void {
  if (!isE2E) {
    return;
  }

  const launchArgs = LaunchArguments.value<E2ELaunchArgs>();
  // On iOS, use launchArgs if available
  // On Android, LaunchArguments doesn't work with Detox, so we use a fallback port
  // that is mapped via adb reverse to the actual mock server port
  const solanaWsPort = launchArgs?.solanaWsPort
    ? parseInt(launchArgs.solanaWsPort, 10)
    : Platform.OS === 'android'
      ? FALLBACK_SOLANA_WS_PORT
      : undefined;

  if (!solanaWsPort) {
    return;
  }

  // With adb reverse, localhost in the emulator maps to the host machine.
  // This is set up by setupSolanaWsPortForwarding() in the test.
  const mockHost = 'localhost';

  const OriginalWebSocket = global.WebSocket;

  // Create a patched WebSocket class that extends the original
  class PatchedWebSocket extends OriginalWebSocket {
    constructor(url: string | URL, protocols?: string | string[]) {
      const urlString = url.toString();

      // Check if this is a Solana WebSocket URL
      if (SOLANA_WS_URL_PATTERN.test(urlString)) {
        // Redirect to local mock server
        const mockUrl = `ws://${mockHost}:${solanaWsPort}`;
        super(mockUrl, protocols);
      } else {
        super(url, protocols);
      }
    }
  }

  // Replace the global WebSocket with our patched version
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).WebSocket = PatchedWebSocket;
}
