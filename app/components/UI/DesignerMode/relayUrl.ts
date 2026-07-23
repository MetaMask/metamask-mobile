import { Platform } from 'react-native';

const DEFAULT_RELAY_PORT = 3334;

/**
 * Derive the Designer Mode relay server URL.
 *
 * The relay runs on the developer's machine and binds loopback only
 * (`127.0.0.1`). The iOS simulator reaches that host loopback via `localhost`;
 * the Android emulator must use `10.0.2.2` (its alias for the host loopback),
 * because inside the emulator `localhost` is the emulator itself and the relay
 * would be unreachable.
 *
 * Physical devices are not supported in this version (the relay is never exposed
 * on the LAN), so there's no host auto-detection to do.
 */
export function getDefaultRelayUrl(port: number = DEFAULT_RELAY_PORT): string {
  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${port}`;
  }
  return `http://localhost:${port}`;
}
