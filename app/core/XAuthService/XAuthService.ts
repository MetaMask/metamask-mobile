import { openAuthSessionAsync } from 'expo-web-browser';
import { Linking } from 'react-native';
import { toCaipAccountId, type CaipAccountId } from '@metamask/utils';
import type { XProfile, XConnectResult } from '@metamask/profile-controller';
import Engine from '../Engine';
import Logger from '../../util/Logger';
import { isEthAccount } from '../Multichain/utils';
import { XAuthError, XAuthErrorType } from './XAuthError';
import { X_REDIRECT_URI } from './XAuthConfig';

/**
 * How long to wait for a react-native Linking 'url' event carrying the OAuth
 * redirect before falling back to Linking.getInitialURL() (cold-start case)
 * and then giving up. Matches the TelegramLoginHandler fallback window —
 * needed for universal-link redirects on iOS < 17.4 where openAuthSessionAsync
 * does not resolve with the redirect URL itself.
 */
const REDIRECT_LINKING_FALLBACK_TIMEOUT_MS = 1500;

/**
 * CAIP-2 namespace/reference used for the linked address sent with the X
 * connect flow. The `0` reference is the repo-wide "any EVM chain" wildcard
 * convention (see CardController, RewardsController, selectAccountByScope) —
 * identity is chain-agnostic for the profile backend, which accepts plain
 * CAIP-10 strings in `linked_addresses`.
 */
const EIP155_NAMESPACE = 'eip155';
const EIP155_ANY_CHAIN_REFERENCE = '0';

/**
 * Flow logging for developer debugging in Metro/console output
 * (console.log in __DEV__, Sentry breadcrumb in production for opted-in
 * users). SECURITY: never log authorization codes, state values, raw
 * URLs/params/responses, profile ids, or account addresses — metadata only
 * (step names, result types, OAuth error codes, booleans, redirect URI).
 */
const log = (
  message: string,
  data?: Record<string, string | number | boolean | undefined>,
) => Logger.log(`[XAuth] ${message}`, data ?? '');

/**
 * Safe metadata for logging caught errors: the error class name and, for
 * XAuthError, its error type. Never the full message — backend error text
 * can echo server-provided details.
 */
function logErrorMetadata(
  error: unknown,
): Record<string, string | number | boolean | undefined> {
  return {
    errorName: error instanceof Error ? error.name : 'unknown',
    errorType: error instanceof XAuthError ? error.type : undefined,
  };
}

/**
 * Extracts a human-readable message from an unknown thrown value.
 * Non-Error rejections (strings, plain objects) would otherwise render
 * as "undefined" when interpolated via `(error as Error).message`.
 */
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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
 * Resolves the canonical profile ID from the auth service session. The
 * canonical profile ID is the identity the backend derives from the JWT
 * `sub` — the X account is linked to it.
 *
 * @returns The canonical profile ID.
 * @throws {XAuthError} NotSignedIn when the user has no auth session.
 */
async function getSessionProfileId(): Promise<string> {
  let profileId: string | undefined;
  try {
    const profile =
      await Engine.context.AuthenticationController.getSessionProfile();
    profileId = profile?.canonicalProfileId;
  } catch (error) {
    log('session profile resolution failed', logErrorMetadata(error));
    throw new XAuthError(
      XAuthErrorType.NotSignedIn,
      `Not signed in to the MetaMask auth service: ${getErrorMessage(error)}`,
      { cause: error },
    );
  }
  if (!profileId) {
    log('session profile has no canonical profile id');
    throw new XAuthError(
      XAuthErrorType.NotSignedIn,
      'Not signed in to the MetaMask auth service',
    );
  }
  return profileId;
}

/**
 * Resolves the currently selected EVM account as a CAIP-10 account ID in the
 * `eip155:0:<address>` wildcard-chain form (the repo-wide "any EVM chain"
 * convention — identity is chain-agnostic for the profile backend).
 *
 * @returns The CAIP-10 account ID.
 * @throws {XAuthError} NoEvmAccount when no EVM account is selected.
 */
function getSelectedEvmAccountId(): CaipAccountId {
  const account = Engine.context.AccountsController.getSelectedAccount();
  if (!account || !isEthAccount(account)) {
    log('no EVM account selected for X connect');
    throw new XAuthError(
      XAuthErrorType.NoEvmAccount,
      'No EVM account is selected — an EVM account is required to connect X',
    );
  }
  return toCaipAccountId(
    EIP155_NAMESPACE,
    EIP155_ANY_CHAIN_REFERENCE,
    // CAIP-10 EVM account addresses are lowercase.
    account.address.toLowerCase(),
  );
}

/**
 * Opens the backend-issued X authorization URL in a system browser session
 * and resolves with the x-oauth-redirect URL. Mirrors the TelegramLoginHandler
 * session handling: openAuthSessionAsync result first, then a react-native
 * Linking 'url' event fallback, then the getInitialURL() cold-start fallback
 * (needed for universal-link redirects on iOS < 17.4).
 *
 * @param authorizationUrl - The authorization URL issued by the backend.
 * @returns The redirect URL (x-oauth-redirect scheme/host) with OAuth params.
 * @throws {XAuthError} UserCancelled when the session is cancelled/dismissed.
 * @throws {XAuthError} NetworkFailure when the session cannot be opened or no
 * redirect is observed.
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
    log('connectX: opening authorization session');
    let result: Awaited<ReturnType<typeof openAuthSessionAsync>>;
    try {
      result = await openAuthSessionAsync(
        authorizationUrl,
        X_REDIRECT_URI,
        // createTask: false — iOS 17.4+ ASWebAuthenticationSession resolves
        // with the redirect URL directly. preferUniversalLinks routes the
        // redirect through the app's universal link on older iOS, where the
        // Linking fallback below captures it.
        { createTask: false, preferUniversalLinks: true },
      );
    } catch (error) {
      log('connectX: openAuthSessionAsync rejected', logErrorMetadata(error));
      throw new XAuthError(
        XAuthErrorType.NetworkFailure,
        `Failed to open X authorization session: ${getErrorMessage(error)}`,
      );
    }

    log('connectX: openAuthSessionAsync resolved', {
      resultType: result.type,
    });

    if (result.type === 'success') {
      return result.url;
    }

    const linkingRedirectUrl = await waitForRedirectUrl(
      redirectUrlPromise,
      REDIRECT_LINKING_FALLBACK_TIMEOUT_MS,
    );

    if (linkingRedirectUrl) {
      log('connectX: captured redirect via Linking event fallback');
      return linkingRedirectUrl;
    }

    const initialUrl = await Linking.getInitialURL();

    if (initialUrl?.startsWith(X_REDIRECT_URI)) {
      log('connectX: captured redirect via getInitialURL cold-start fallback');
      return initialUrl;
    }

    if (result.type === 'cancel' || result.type === 'dismiss') {
      log('connectX: user cancelled or dismissed the authorization session', {
        resultType: result.type,
      });
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
 * app-relay OAuth flow:
 *
 * 1. Resolve identity — the canonical profile ID from the auth session and
 * the selected EVM account as a CAIP-10 linked address.
 * 2. Ask the backend for the X authorization URL
 * (ProfileController.startXConnect). The backend creates the profile during
 * the connect if it does not exist yet.
 * 3. Open it in a system browser auth session.
 * 4. Capture the x-oauth-redirect universal link (session result, Linking
 * event, or cold-start initial URL).
 * 5. Relay the authorization code + state to the backend
 * (ProfileController.connectX) — X codes expire in ~30s, so this happens
 * immediately after the redirect. On success the profile and the linked X
 * profile are persisted in ProfileController state.
 *
 * @returns The connect result: the (possibly newly created) profile, the
 * linked X profile, and whether the backend created the profile.
 * @throws {XAuthError} NotSignedIn — the user has no auth service session.
 * @throws {XAuthError} NoEvmAccount — no EVM account is selected.
 * @throws {XAuthError} UserCancelled — user cancelled the session or denied
 * consent on X's consent screen (backend redirects back with an `error` param).
 * @throws {XAuthError} StateMismatch — the redirect's `state` did not match
 * the state issued with the authorization URL.
 * @throws {XAuthError} MissingCode — the redirect carried no `code` param.
 * @throws {XAuthError} BackendError — the backend rejected the start or
 * connect call.
 * @throws {XAuthError} NetworkFailure — the auth session could not be opened
 * or no redirect was captured.
 */
export async function connectX(): Promise<XConnectResult> {
  log('connectX: start', { redirectUri: X_REDIRECT_URI });

  const { ProfileController } = Engine.context;

  const profileId = await getSessionProfileId();
  const linkedAddress = getSelectedEvmAccountId();
  log('connectX: identity resolved', {
    hasProfileId: Boolean(profileId),
    hasLinkedAddress: Boolean(linkedAddress),
  });

  log('connectX: requesting authorization URL from backend');
  let session: { authorizationUrl: string; state: string };
  try {
    session = await ProfileController.startXConnect({ linkedAddress });
  } catch (error) {
    log('connectX: backend failed to issue authorization URL', {
      ...logErrorMetadata(error),
    });
    throw new XAuthError(
      XAuthErrorType.BackendError,
      `Failed to start X connect flow: ${getErrorMessage(error)}`,
      { cause: error },
    );
  }
  log('connectX: authorization URL issued', {
    hasAuthorizationUrl: Boolean(session.authorizationUrl),
    hasState: Boolean(session.state),
  });

  const redirectUrl = await openAuthorizationSession(session.authorizationUrl);

  const params = parseRedirectParams(redirectUrl);
  log('connectX: redirect captured', {
    hasCode: Boolean(params.code),
    hasState: Boolean(params.state),
    hasError: Boolean(params.error),
  });

  if (params.error) {
    // The backend relays X's OAuth error (e.g. access_denied when the user
    // denies consent) — treat denial/cancellation as a cancel, not an error.
    log('connectX: redirect returned an OAuth error', {
      hasError: true,
    });
    throw new XAuthError(
      XAuthErrorType.UserCancelled,
      'User denied the X authorization request',
    );
  }

  if (!params.code) {
    log('connectX: redirect missing code param');
    throw new XAuthError(
      XAuthErrorType.MissingCode,
      'X authorization redirect did not include an authorization code',
    );
  }

  // Client-side state verification before relaying to the backend.
  if (params.state !== session.state) {
    log('connectX: state mismatch');
    throw new XAuthError(
      XAuthErrorType.StateMismatch,
      'X authorization state mismatch — the returned state did not match the issued state',
    );
  }

  log('connectX: relaying code to backend');
  try {
    const result = await ProfileController.connectX({
      code: params.code,
      state: params.state,
      profileId,
    });
    log('connectX: done', {
      connected: true,
      profileCreated: result.profileCreated,
    });
    return result;
  } catch (error) {
    log('connectX: backend connect failed', logErrorMetadata(error));
    throw new XAuthError(
      XAuthErrorType.BackendError,
      `Failed to connect X account: ${getErrorMessage(error)}`,
      { cause: error },
    );
  }
}

/**
 * Disconnects the X account linked to the user's profile. Resolves the
 * profile ID from the auth session, then clears the linked X profile in
 * ProfileController state.
 */
export async function disconnectX(): Promise<void> {
  log('disconnectX: start');
  const profileId = await getSessionProfileId();
  await Engine.context.ProfileController.disconnectX(profileId);
  log('disconnectX: done');
}

/**
 * Refetches the X account linked to the user's profile from the backend and
 * updates ProfileController state. The backend resolves the profile from the
 * verified bearer token, so no profile ID is required.
 *
 * @returns The linked X profile.
 */
export async function fetchAndUpdateXAccount(): Promise<XProfile> {
  log('fetchAndUpdateXAccount: start');
  const xProfile =
    await Engine.context.ProfileController.fetchAndUpdateXAccount();
  log('fetchAndUpdateXAccount: done', { updated: true });
  return xProfile;
}
