/**
 * E2E-only deeplinks to toggle mock-OAuth "existing user" without a second app build.
 * Requires a bundle with `E2E_MOCK_OAUTH=true` (BrowserStack seedless perf).
 */
import { Linking } from 'react-native';
import DevLogger from '../core/SDKConnect/utils/DevLogger';
import {
  resetE2EMockOAuthExistingUserRuntimeOverride,
  setE2EMockOAuthExistingUserRuntimeOverride,
} from './e2eMockOAuthExistingUserScenario';

const PREFIXES = [
  'metamask://e2e/seedless-mock-oauth/',
  'e2e://seedless-mock-oauth/',
];

let registered = false;
const processed = new Set<string>();

function stripPrefixes(url: string): string {
  let current = url;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let matched = false;
    for (const prefix of PREFIXES) {
      if (current.startsWith(prefix)) {
        current = current.slice(prefix.length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      break;
    }
  }
  return current;
}

function handleUrl(incoming?: string): void {
  if (!incoming || process.env.E2E_MOCK_OAUTH !== 'true') {
    return;
  }
  const isMapped = PREFIXES.some((p) => incoming.startsWith(p));
  if (!isMapped) {
    return;
  }
  if (processed.has(incoming)) {
    return;
  }
  processed.add(incoming);

  const path = stripPrefixes(incoming).split('?')[0];
  if (path === 'existing-user') {
    DevLogger.log('[E2E] seedless mock OAuth: existing-user override on');
    setE2EMockOAuthExistingUserRuntimeOverride(true);
    return;
  }
  if (path === 'new-user') {
    DevLogger.log('[E2E] seedless mock OAuth: new-user override on');
    setE2EMockOAuthExistingUserRuntimeOverride(false);
    return;
  }
  if (path === 'reset') {
    DevLogger.log('[E2E] seedless mock OAuth: runtime override cleared');
    resetE2EMockOAuthExistingUserRuntimeOverride();
  }
}

/**
 * Register once. Safe to import from app bootstrap paths.
 */
export function registerE2ESeedlessMockOAuthDeepLink(): void {
  if (registered || process.env.E2E_MOCK_OAUTH !== 'true') {
    return;
  }
  registered = true;
  try {
    Linking.addEventListener('url', (event: { url: string }) => {
      handleUrl(event?.url);
    });
    Linking.getInitialURL()
      .then((initialUrl) => {
        if (initialUrl) {
          handleUrl(initialUrl);
        }
      })
      .catch(() => {
        // no-op
      });
  } catch (e) {
    DevLogger.log('[E2E] seedless mock OAuth deeplink registration failed', e);
  }
}

registerE2ESeedlessMockOAuthDeepLink();
