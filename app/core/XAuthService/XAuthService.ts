import { dismissAuthSession, openAuthSessionAsync } from 'expo-web-browser';
import { Linking } from 'react-native';
import type { ConnectXSession, XProfile } from '@metamask/profile-controller';
import Engine from '../Engine';
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

/**
 * Opens the backend-issued X authorization URL in a system browser session and
 * resolves with the x-oauth-redirect URL: session result first, then a Linking
 * event fallback, then the getInitialURL() cold-start fallback (iOS < 17.4).
 */
async function openAuthorizationSession(
  authorizationUrl: string,
): Promise<string> {
  const initialUrlBeforeSession = await Linking.getInitialURL();

  let removeRedirectListener: (() => void) | undefined;
  const redirectUrlPromise = new Promise<string>((resolve) => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      const matchesRedirectUri = url.startsWith(X_REDIRECT_URI);

      if (matchesRedirectUri) {
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
        { createTask: false, preferUniversalLinks: true },
      );
    } catch (error) {
      throw new XAuthError(
        XAuthErrorType.NetworkFailure,
        `Failed to open X authorization session: ${getErrorMessage(error)}`,
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

const cancelledXConnect = (): XAuthError =>
  new XAuthError(XAuthErrorType.UserCancelled, 'X connect was cancelled');

const throwIfXConnectCancelled = (signal?: AbortSignal): void => {
  if (signal?.aborted) {
    throw cancelledXConnect();
  }
};

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
    redirectUrl = await openAuthorizationSession(session.authorizationUrl);
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
