import { openAuthSessionAsync } from 'expo-web-browser';
import { Linking } from 'react-native';
import type { XProfile, XAuthUrlResponse } from '@metamask/profile-controller';
import Engine from '../Engine';
import { XAuthError, XAuthErrorType } from './XAuthError';
import { X_REDIRECT_URI } from './XAuthConfig';

// Wait window for a Linking 'url' redirect event before the getInitialURL()
// cold-start fallback and giving up (needed on iOS < 17.4).
const REDIRECT_LINKING_FALLBACK_TIMEOUT_MS = 1500;

/** Extracts a human-readable message from an unknown thrown value. */
function getErrorMessage(error: unknown): string {
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

    if (initialUrl?.startsWith(X_REDIRECT_URI)) {
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
 */
export async function connectX(): Promise<XProfile> {
  requireProfileId();

  const { ProfileService, ProfileController } = Engine.context;

  let session: XAuthUrlResponse;
  try {
    session = await ProfileService.getXAuthUrl();
  } catch (error) {
    throw new XAuthError(
      XAuthErrorType.BackendError,
      `Failed to start X connect flow: ${getErrorMessage(error)}`,
      { cause: error },
    );
  }

  const redirectUrl = await openAuthorizationSession(session.url);

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
    const xProfile = await ProfileController.connectX({
      code: params.code,
      state: params.state,
    });
    return xProfile;
  } catch (error) {
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
  const xProfile =
    await Engine.context.ProfileController.fetchAndUpdateXAccount();
  return xProfile;
}

/** Disconnects the X account linked to the current profile. */
export async function disconnectXAccount(): Promise<void> {
  const profileId = requireProfileId();
  await Engine.context.ProfileController.disconnectX(profileId);
}
