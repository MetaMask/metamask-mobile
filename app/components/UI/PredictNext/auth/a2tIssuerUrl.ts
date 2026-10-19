/**
 * PoC local issuer. Remove `isEmulator` once the A2T service has an external
 * URL. It exists so localhost can be rewritten for an Android emulator.
 */
export interface A2tIssuerHost {
  os: string;
  /** True when this process is a simulator or emulator. Localhost is then the computer running Metro. */
  isEmulator: boolean;
}

/** PoC local issuer. Remove once the A2T service has an external URL. */
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

/**
 * Resolves the A2T issuer base URL for this device.
 *
 * PoC local issuer. Remove the loopback rewrite, the physical-device error,
 * and the `http:` allowance once the A2T service has an external URL. Until
 * then: `localhost:4445` reaches the issuer from an iOS simulator, an Android
 * emulator is rewritten to `10.0.2.2`, and a physical phone needs
 * `MM_A2T_URL=http://<mac-lan-address>:4445`. Debug builds already allow
 * cleartext HTTP to local addresses, and iOS allows local networking.
 */
export const resolveA2tIssuerUrl = (
  configured: string | undefined,
  host: A2tIssuerHost,
): string => {
  const raw = configured?.trim();
  if (!raw) {
    throw new Error('MM_A2T_URL is not set');
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('MM_A2T_URL is not a URL');
  }

  // PoC local issuer. Drop `http:` from this check once the A2T service has an
  // external URL. The deployed issuer is https only.
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('MM_A2T_URL must be http or https');
  }

  // PoC local issuer. Remove this block once the A2T service has an external
  // URL. It rewrites localhost for an Android emulator and rejects localhost
  // on a physical device.
  if (LOOPBACK_HOSTS.has(url.hostname)) {
    if (host.os === 'android' && host.isEmulator) {
      url.hostname = '10.0.2.2';
    } else if (!host.isEmulator) {
      throw new Error(
        'MM_A2T_URL points at localhost, which is this device. On an Android emulator use http://10.0.2.2:4445. On a physical device use http://<mac-lan-address>:4445.',
      );
    }
  }

  return url.toString().replace(/\/$/u, '');
};
