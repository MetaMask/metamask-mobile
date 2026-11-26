import { UnavailabilityError } from 'expo-modules-core';
import {
  dismissAuthSession,
  getCustomTabsSupportingBrowsersAsync,
  openAuthSessionAsync,
} from 'expo-web-browser';
import { Linking, Platform } from 'react-native';
import type { ConnectXSession, XProfile } from '@metamask/profile-controller';
import Engine from '../Engine';
import {
  openWebviewAuthSession,
  WebviewAuthMountTimeoutError,
} from '../../util/webviewAuthSession';
import { XAuthError, XAuthErrorType } from './XAuthError';
import { X_REDIRECT_URI } from './XAuthConfig';

// Wait window for a Linking 'url' redirect event before the getInitialURL()
// cold-start fallback and giving up (needed on iOS < 17.4).
const REDIRECT_LINKING_FALLBACK_TIMEOUT_MS = 1500;

/** Extracts a human-readable message from an unknown thrown value. */
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Gets the current profile id, throwing when no profile exists yet. */
function requireProfileId(): string {
  const { profileId } = Engine.context.ProfileController.state.profile;
  if (!profileId) {
    throw new XAuthError(
      XAuthErrorType.NotSignedIn,
      'No MetaMask profile exists yet',
    );
  }
  return profileId;
}

const waitForRedirectUrl = (
  redirectUrlPromise: Promise<string>,
  timeoutMs: number,
) =>
  new Promise<string | undefined>((resolve) => {
    const timeout = setTimeout(() => resolve(undefined), timeoutMs);

    redirectUrlPromise.then(
      (url) => {
        clearTimeout(timeout);
        resolve(url);
      },
      () => {
        clearTimeout(timeout);
        resolve(undefined);
      },
    );
  });

/**
 * Query params carried by the backend's x-oauth-redirect universal link.
 */
interface XRedirectParams {
  code?: string;
  state?: string;
  error?: string;
}

/**
 * Parses the x-oauth-redirect universal link query params.
 */
function parseRedirectParams(redirectUrl: string): XRedirectParams {
  const url = new URL(redirectUrl);
  return {
    code: url.searchParams.get('code') ?? undefined,
    state: url.searchParams.get('state') ?? undefined,
    error: url.searchParams.get('error') ?? undefined,
  };
}

const cancelledXConnect = (): XAuthError =>
  new XAuthError(XAuthErrorType.UserCancelled, 'X connect was cancelled');

const throwIfXConnectCancelled = (signal?: AbortSignal): void => {
  if (signal?.aborted) {
    throw cancelledXConnect();
  }
};

type AndroidBrowserResolution =
  | { status: 'available'; browserPackage: string }
  | { status: 'unavailable' }
  | { status: 'unknown' };

/**
 * Resolves a Custom Tabs–capable browser package on Android so
 * `openAuthSessionAsync` never loops back into MetaMask's own `https://`
 * intent filter when MetaMask (or a non-Custom-Tabs browser) is set as default.
 */
async function resolveAndroidCustomTabsBrowser(): Promise<AndroidBrowserResolution> {
  if (
    Platform.OS !== 'android' ||
    typeof getCustomTabsSupportingBrowsersAsync !== 'function'
  ) {
    return { status: 'unknown' };
  }

  try {
    const { preferredBrowserPackage, servicePackages = [] } =
      await getCustomTabsSupportingBrowsersAsync();

    if (
      preferredBrowserPackage &&
      servicePackages.includes(preferredBrowserPackage)
    ) {
      return { status: 'available', browserPackage: preferredBrowserPackage };
    }

    if (servicePackages.length > 0) {
      return { status: 'available', browserPackage: servicePackages[0] };
    }

    return { status: 'unavailable' };
  } catch {
    return { status: 'unknown' };
  }
}

type WebviewFallbackReason =
  | 'no_custom_tabs_browser'
  | 'no_matching_browser_activity'
  | 'no_preferred_browser_package'
  | 'browser_activity_not_found'
  | 'web_browser_unavailable';

type BrowserLaunchFailureCode =
  | WebviewFallbackReason
  | 'browser_already_open'
  | 'invalid_auth_session_state'
  | 'auth_session_failed_to_start'
  | 'invalid_url'
  | 'unknown_browser_error';

type WebviewFallbackFailureCode =
  | 'navigation_unavailable'
  | 'mount_timeout'
  | 'unknown_webview_error';

/**
 * Classifies an `openAuthSessionAsync` rejection into a safe diagnostic code
 * and determines whether it represents a recoverable browser-launch failure
 * eligible for the Android in-app WebView fallback.
 *
 * Busy/concurrent-session and invalid internal state errors are preserved as
 * failures rather than spawning an embedded WebView on top of an active flow.
 */
function classifyBrowserLaunchError(error: unknown): {
  code: BrowserLaunchFailureCode;
  fallbackReason?: WebviewFallbackReason;
} {
  if (error instanceof UnavailabilityError) {
    return {
      code: 'web_browser_unavailable',
      fallbackReason: 'web_browser_unavailable',
    };
  }

  const message = getErrorMessage(error);

  if (/already open/i.test(message)) {
    return { code: 'browser_already_open' };
  }
  if (/auth session is in an invalid state/i.test(message)) {
    return { code: 'invalid_auth_session_state' };
  }
  if (/provided URL is not valid/i.test(message)) {
    return { code: 'invalid_url' };
  }
  if (/authentication session could not be started/i.test(message)) {
    return { code: 'auth_session_failed_to_start' };
  }
  if (/No matching browser activity found/i.test(message)) {
    return {
      code: 'no_matching_browser_activity',
      fallbackReason: 'no_matching_browser_activity',
    };
  }
  if (/Cannot determine preferred package/i.test(message)) {
    return {
      code: 'no_preferred_browser_package',
      fallbackReason: 'no_preferred_browser_package',
    };
  }
  if (
    /ActivityNotFoundException|No Activity found to handle Intent/i.test(
      message,
    )
  ) {
    return {
      code: 'browser_activity_not_found',
      fallbackReason: 'browser_activity_not_found',
    };
  }

  return { code: 'unknown_browser_error' };
}

/**
 * Classifies an `openWebviewAuthSession` failure into a fixed allowlisted
 * diagnostic code so raw exception strings (which could contain URLs or query
 * parameters) are never propagated into telemetry or error messages.
 */
function classifyWebviewFallbackError(
  error: unknown,
): WebviewFallbackFailureCode {
  if (error instanceof WebviewAuthMountTimeoutError) {
    return 'mount_timeout';
  }
  if (/Navigation reference/i.test(getErrorMessage(error))) {
    return 'navigation_unavailable';
  }
  return 'unknown_webview_error';
}

/**
 * Fallback when `expo-web-browser` cannot launch an auth session on Android
 * (for example, devices with no Custom Tabs browser). Opens the authorization
 * URL in the in-app WebView modal and intercepts `X_REDIRECT_URI` before the
 * WebView loads it, avoiding Branch's HTTP redirect and `DeepLinkModal`.
 */
async function openInAppWebviewFallback(
  authorizationUrl: string,
  reason: WebviewFallbackReason,
  signal?: AbortSignal,
): Promise<string> {
  let redirectUrl: string | undefined;
  try {
    redirectUrl = await openWebviewAuthSession({
      url: authorizationUrl,
      redirectUri: X_REDIRECT_URI,
      signal,
    });
  } catch (fallbackError) {
    throwIfXConnectCancelled(signal);
    const fallbackCode = classifyWebviewFallbackError(fallbackError);
    throw new XAuthError(
      XAuthErrorType.NetworkFailure,
      `Failed to open X authorization session (${reason}; webview_fallback=${fallbackCode})`,
    );
  }

  throwIfXConnectCancelled(signal);

  if (!redirectUrl) {
    throw new XAuthError(
      XAuthErrorType.UserCancelled,
      'User cancelled the X authorization process',
    );
  }

  return redirectUrl;
}

/**
 * Opens the backend-issued X authorization URL in a system browser session
 * (selecting a Custom Tabs browser on Android and falling back to an in-app
 * WebView when no browser session can be launched on Android) and resolves
 * with the x-oauth-redirect URL: session result first, then a Linking event
 * fallback, then the getInitialURL() cold-start fallback (iOS < 17.4).
 */
async function openAuthorizationSession(
  authorizationUrl: string,
  signal?: AbortSignal,
): Promise<string> {
  const androidBrowser = await resolveAndroidCustomTabsBrowser();
  throwIfXConnectCancelled(signal);

  if (androidBrowser.status === 'unavailable') {
    return await openInAppWebviewFallback(
      authorizationUrl,
      'no_custom_tabs_browser',
      signal,
    );
  }

  const initialUrlBeforeSession = await Linking.getInitialURL();

  let removeRedirectListener: (() => void) | undefined;
  const redirectUrlPromise = new Promise<string>((resolve) => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (url.startsWith(X_REDIRECT_URI)) {
        resolve(url);
      }
    });

    removeRedirectListener = () => subscription.remove();
  });

  try {
    let result: Awaited<ReturnType<typeof openAuthSessionAsync>>;
    try {
      result = await openAuthSessionAsync(
        authorizationUrl,
        X_REDIRECT_URI,
        // iOS 17.4+ resolves the redirect directly; older iOS routes it
        // through the universal link captured by the Linking fallback below.
        {
          createTask: false,
          preferUniversalLinks: true,
          ...(androidBrowser.status === 'available'
            ? { browserPackage: androidBrowser.browserPackage }
            : undefined),
        },
      );
    } catch (openSessionError) {
      throwIfXConnectCancelled(signal);
      const { code, fallbackReason } =
        classifyBrowserLaunchError(openSessionError);
      if (Platform.OS === 'android' && fallbackReason) {
        return await openInAppWebviewFallback(
          authorizationUrl,
          fallbackReason,
          signal,
        );
      }
      throw new XAuthError(
        XAuthErrorType.NetworkFailure,
        `Failed to open X authorization session (${code})`,
      );
    }

    if (result.type === 'success') {
      return result.url;
    }

    const linkingRedirectUrl = await waitForRedirectUrl(
      redirectUrlPromise,
      REDIRECT_LINKING_FALLBACK_TIMEOUT_MS,
    );

    if (linkingRedirectUrl) {
      return linkingRedirectUrl;
    }

    const initialUrl = await Linking.getInitialURL();

    // Only accept an initial URL that is an x-oauth-redirect and changed
    // during this session: one equal to the pre-session snapshot is a
    // leftover launch URL predating the freshly issued `state`, which would
    // fail the state check or replay a stale code — the caller must instead
    // see the real session outcome.
    if (
      initialUrl?.startsWith(X_REDIRECT_URI) &&
      initialUrl !== initialUrlBeforeSession
    ) {
      return initialUrl;
    }

    if (result.type === 'cancel' || result.type === 'dismiss') {
      throw new XAuthError(
        XAuthErrorType.UserCancelled,
        'User cancelled the X authorization process',
      );
    }

    throw new XAuthError(
      XAuthErrorType.NetworkFailure,
      `X authorization did not succeed: ${result.type}`,
    );
  } finally {
    removeRedirectListener?.();
  }
}

/**
 * Connects the user's X (Twitter) account through the backend-mediated
 * app-relay OAuth flow: request the authorization URL from the backend, open
 * it in a system browser session, capture the x-oauth-redirect universal
 * link, and relay the code + state to the backend.
 *
 * Pass `signal` to dismiss the browser session and skip linking. Aborting
 * during `getXAuthorizationUrl` never opens the browser.
 *
 * The profile API resolves the account from the bearer token, so this does
 * not require a social profile to exist in ProfileController yet.
 */
export async function connectX(options?: {
  signal?: AbortSignal;
}): Promise<XProfile> {
  const signal = options?.signal;
  throwIfXConnectCancelled(signal);

  const onAbort = () => {
    try {
      dismissAuthSession();
    } catch {
      // No auth session is open yet, or this platform cannot dismiss one.
    }
  };
  signal?.addEventListener('abort', onAbort);

  try {
    return await connectXSession(signal);
  } finally {
    signal?.removeEventListener('abort', onAbort);
  }
}

async function connectXSession(signal?: AbortSignal): Promise<XProfile> {
  const { ProfileController } = Engine.context;

  let session: ConnectXSession;
  try {
    // Go through ProfileController, not ProfileService: with the mock profile
    // service the controller delegates to messenger handlers that work for
    // both mock and real services, while the service instance is only a stub.
    session = await ProfileController.getXAuthorizationUrl();
  } catch (error) {
    throwIfXConnectCancelled(signal);
    throw new XAuthError(
      XAuthErrorType.BackendError,
      `Failed to start X connect flow: ${getErrorMessage(error)}`,
      { cause: error },
    );
  }
  throwIfXConnectCancelled(signal);

  let redirectUrl: string;
  try {
    redirectUrl = await openAuthorizationSession(
      session.authorizationUrl,
      signal,
    );
  } catch (error) {
    throwIfXConnectCancelled(signal);
    throw error;
  }
  throwIfXConnectCancelled(signal);

  const params = parseRedirectParams(redirectUrl);

  if (params.error) {
    // X's OAuth error (e.g. access_denied) is treated as a cancel, not an error.
    throw new XAuthError(
      XAuthErrorType.UserCancelled,
      'User denied the X authorization request',
    );
  }

  if (!params.code) {
    throw new XAuthError(
      XAuthErrorType.MissingCode,
      'X authorization redirect did not include an authorization code',
    );
  }

  // Client-side state verification before relaying to the backend.
  if (params.state !== session.state) {
    throw new XAuthError(
      XAuthErrorType.StateMismatch,
      'X authorization state mismatch — the returned state did not match the issued state',
    );
  }

  try {
    throwIfXConnectCancelled(signal);
    const xProfile = await ProfileController.connectX({
      code: params.code,
      state: params.state,
    });
    throwIfXConnectCancelled(signal);
    return xProfile;
  } catch (error) {
    throwIfXConnectCancelled(signal);
    if (error instanceof XAuthError) {
      throw error;
    }
    throw new XAuthError(
      XAuthErrorType.BackendError,
      `Failed to connect X account: ${getErrorMessage(error)}`,
      { cause: error },
    );
  }
}

/**
 * Refetches the X account linked to the user's profile from the backend and
 * updates ProfileController state.
 */
export async function fetchAndUpdateXAccount(): Promise<XProfile> {
  requireProfileId();
  try {
    const xProfile =
      await Engine.context.ProfileController.fetchAndUpdateXAccount();
    return xProfile;
  } catch (error) {
    throw new XAuthError(
      XAuthErrorType.BackendError,
      `Failed to fetch and update the X account: ${getErrorMessage(error)}`,
      { cause: error },
    );
  }
}

/** Disconnects the X account linked to the current profile. */
export async function disconnectXAccount(): Promise<void> {
  const profileId = requireProfileId();
  try {
    await Engine.context.ProfileController.disconnectX(profileId);
  } catch (error) {
    throw new XAuthError(
      XAuthErrorType.BackendError,
      `Failed to disconnect the X account: ${getErrorMessage(error)}`,
      { cause: error },
    );
  }
}
