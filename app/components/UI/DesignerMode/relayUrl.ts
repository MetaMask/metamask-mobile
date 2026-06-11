import { NativeModules, Platform } from 'react-native';

const DEFAULT_RELAY_PORT = 3334;

/**
 * Derive the Designer Mode relay server URL.
 *
 * The relay server runs on the developer's machine (started by the agent via the
 * `designer-mode` skill). The device needs to reach it on the
 * same host that serves the Metro bundle, so we extract the host from Metro's
 * `scriptURL` (e.g. `http://192.168.1.5:8081/index.bundle?...`). This works for
 * the iOS simulator (localhost), Android emulator (10.0.2.2), and physical
 * devices (the dev machine's LAN IP).
 *
 * Falls back to platform defaults when the bundle is served from disk (release).
 */
export function getDefaultRelayUrl(port: number = DEFAULT_RELAY_PORT): string {
  const scriptURL: string | undefined = NativeModules.SourceCode?.scriptURL;
  const match = scriptURL?.match(/^https?:\/\/([^/:]+)(?::\d+)?\//);
  if (match?.[1]) {
    return `http://${match[1]}:${port}`;
  }

  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${port}`;
  }
  return `http://localhost:${port}`;
}
