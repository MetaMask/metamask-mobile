import * as Keychain from 'react-native-keychain'; // eslint-disable-line import-x/no-namespace
import type { XTokens } from './types';
import Logger from '../../util/Logger';

/**
 * Dedicated keychain service scope for X OAuth tokens. Intentionally
 * separate from SecureKeychain's `com.metamask` scope — see
 * app/core/SecureKeychain.ts's own comment: "Do not re-use for other
 * scopes unless you know what you are doing." An OAuth token for a
 * connected social account is not wallet-security-critical and doesn't
 * need SecureKeychain's extra wallet-password-derived encryption layer.
 */
const X_OAUTH_KEYCHAIN_SERVICE = 'com.metamask.x-oauth';
const X_OAUTH_KEYCHAIN_USERNAME = 'x-oauth-tokens';

export async function setTokens(tokens: XTokens): Promise<void> {
  await Keychain.setGenericPassword(
    X_OAUTH_KEYCHAIN_USERNAME,
    JSON.stringify(tokens),
    {
      service: X_OAUTH_KEYCHAIN_SERVICE,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    },
  );
  // Never log the token contents — metadata only.
  Logger.log('[XAuth] setTokens: tokens stored');
}

export async function getTokens(): Promise<XTokens | null> {
  const result = await Keychain.getGenericPassword({
    service: X_OAUTH_KEYCHAIN_SERVICE,
  });

  if (!result || !result.password) {
    Logger.log('[XAuth] getTokens: read complete', { found: false });
    return null;
  }

  Logger.log('[XAuth] getTokens: read complete', { found: true });
  return JSON.parse(result.password) as XTokens;
}

export async function clearTokens(): Promise<void> {
  await Keychain.resetGenericPassword({ service: X_OAUTH_KEYCHAIN_SERVICE });
  Logger.log('[XAuth] clearTokens: tokens cleared');
}
