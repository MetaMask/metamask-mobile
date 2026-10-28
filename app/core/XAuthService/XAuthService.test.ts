import {
  connectX,
  disconnectXAccount,
  fetchAndUpdateXAccount,
} from './XAuthService';
import { XAuthError, XAuthErrorType } from './XAuthError';
import { X_REDIRECT_URI } from './XAuthConfig';
import Engine from '../Engine';
import { dismissAuthSession, openAuthSessionAsync } from 'expo-web-browser';
import { Linking } from 'react-native';
import type { XProfile } from '@metamask/profile-controller';

jest.mock('expo-web-browser', () => ({
  __esModule: true,
  openAuthSessionAsync: jest.fn(),
  dismissAuthSession: jest.fn(),
}));

jest.mock('react-native', () => ({
  Linking: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    getInitialURL: jest.fn(),
  },
}));

jest.mock('../Engine', () => ({
  __esModule: true,
  default: {
    context: {
      // Mirrors the mock profile service wiring in profile-service-init.ts:
      // the service instance is a stub and all operations go through
      // ProfileController, whose methods delegate to messenger handlers.
      ProfileService: {},
      ProfileController: {
        getXAuthorizationUrl: jest.fn(),
        connectX: jest.fn(),
        fetchAndUpdateXAccount: jest.fn(),
        disconnectX: jest.fn(),
        state: { profile: { profileId: 'profile-1' } },
      },
    },
  },
}));

const { ProfileController } = Engine.context;

const AUTHORIZATION_URL = 'https://backend.example.com/x/authorize?state=xyz';
const SESSION_STATE = 'session-state-1';
const REDIRECT_WITH = (params: string) => `${X_REDIRECT_URI}?${params}`;

const X_PROFILE: XProfile = {
  xUserId: 'x-user-1',
  xProfileUrl: 'https://x.com/tester',
  username: 'tester',
  displayName: 'Tester',
  avatarUrl: 'https://example.com/x.png',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

function getLinkingHandler() {
  let handler: ((event: { url: string }) => void) | undefined;
  (Linking.addEventListener as jest.Mock).mockImplementation(
    (_type: string, callback: (event: { url: string }) => void) => {
      handler = callback;
      return { remove: jest.fn() };
    },
  );
  return () => handler;
}

const flushPromises = () => new Promise(setImmediate);

describe('XAuthService (app-relay flow)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ProfileController.state.profile.profileId = 'profile-1';
    jest.mocked(ProfileController.getXAuthorizationUrl).mockResolvedValue({
      authorizationUrl: AUTHORIZATION_URL,
      state: SESSION_STATE,
    });
    jest.mocked(ProfileController.connectX).mockResolvedValue(X_PROFILE);
  });

  describe('connectX', () => {
    it('requests the authorization URL from the backend, opens it, and relays the redirect code and state', async () => {
      (openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type: 'success',
        url: REDIRECT_WITH(`code=auth-code-1&state=${SESSION_STATE}`),
      });

      const result = await connectX();

      expect(ProfileController.getXAuthorizationUrl).toHaveBeenCalledTimes(1);
      expect(ProfileController.getXAuthorizationUrl).toHaveBeenCalledWith();
      expect(openAuthSessionAsync).toHaveBeenCalledWith(
        AUTHORIZATION_URL,
        X_REDIRECT_URI,
        { createTask: false, preferUniversalLinks: true },
      );
      expect(ProfileController.connectX).toHaveBeenCalledWith({
        code: 'auth-code-1',
        state: SESSION_STATE,
      });
      expect(result).toStrictEqual(X_PROFILE);
    });

    it('captures the redirect via the Linking event fallback when the auth session does not resolve with it', async () => {
      const getHandler = getLinkingHandler();
      let resolveOpenAuth!: (result: unknown) => void;
      (openAuthSessionAsync as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveOpenAuth = resolve;
          }),
      );

      const promise = connectX();
      await flushPromises();

      // A Linking event that is not the x-oauth-redirect URI must be ignored.
      getHandler()?.({ url: 'https://unrelated.example.com/other' });
      getHandler()?.({
        url: REDIRECT_WITH(`code=linking-code&state=${SESSION_STATE}`),
      });
      resolveOpenAuth({ type: 'cancel' });

      await expect(promise).resolves.toStrictEqual(X_PROFILE);
      expect(ProfileController.connectX).toHaveBeenCalledWith({
        code: 'linking-code',
        state: SESSION_STATE,
      });
    });

    it('captures the redirect via getInitialURL as a cold-start fallback when it changes during the session', async () => {
      (openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type: 'cancel',
      });
      // No launch URL before the session opens; the x-oauth-redirect only
      // becomes the initial URL afterwards (e.g. new-intent delivery).
      (Linking.getInitialURL as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(
          REDIRECT_WITH(`code=cold-start-code&state=${SESSION_STATE}`),
        );

      await expect(connectX()).resolves.toStrictEqual(X_PROFILE);
      expect(ProfileController.connectX).toHaveBeenCalledWith({
        code: 'cold-start-code',
        state: SESSION_STATE,
      });
    }, 10000);

    it('ignores a leftover launch URL and reports cancel instead of reusing it after a cancelled session', async () => {
      // The app was originally launched via an old x-oauth-redirect; it is
      // still the initial URL when the fallback runs, so it predates the
      // freshly issued state and must not be treated as this session's
      // redirect.
      const LEFTOVER_REDIRECT = REDIRECT_WITH(
        'code=stale-code&state=stale-state',
      );
      (openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type: 'cancel',
      });
      (Linking.getInitialURL as jest.Mock).mockResolvedValue(LEFTOVER_REDIRECT);

      const error = await connectX().catch((caught) => caught);
      expect(error).toBeInstanceOf(XAuthError);
      expect(error.type).toBe(XAuthErrorType.UserCancelled);
      expect(ProfileController.connectX).not.toHaveBeenCalled();
    }, 10000);

    it('captures the redirect via getInitialURL when a fresh redirect replaces the leftover launch URL during the session', async () => {
      // The app was launched via an old x-oauth-redirect, but by the time the
      // fallback runs the initial URL is a different x-oauth-redirect issued
      // for this session's state. The change means the fresh one belongs to
      // this session and must be accepted even though the pre-session URL
      // was already a redirect, not null.
      const LEFTOVER_REDIRECT = REDIRECT_WITH(
        'code=stale-code&state=stale-state',
      );
      (openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type: 'cancel',
      });
      (Linking.getInitialURL as jest.Mock)
        .mockResolvedValueOnce(LEFTOVER_REDIRECT)
        .mockResolvedValueOnce(
          REDIRECT_WITH(`code=fresh-code&state=${SESSION_STATE}`),
        );

      await expect(connectX()).resolves.toStrictEqual(X_PROFILE);
      expect(ProfileController.connectX).toHaveBeenCalledWith({
        code: 'fresh-code',
        state: SESSION_STATE,
      });
    }, 10000);

    it('ignores a leftover launch URL carrying an old code instead of resubmitting it when the session fails', async () => {
      const LEFTOVER_REDIRECT = REDIRECT_WITH(
        'code=stale-code&state=stale-state',
      );
      (openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type: 'locked',
      });
      (Linking.getInitialURL as jest.Mock).mockResolvedValue(LEFTOVER_REDIRECT);

      await expect(connectX()).rejects.toMatchObject({
        type: XAuthErrorType.NetworkFailure,
        message: 'X authorization did not succeed: locked',
      });
      expect(ProfileController.connectX).not.toHaveBeenCalled();
    }, 10000);

    it('throws a typed cancel error when the user cancels the authorization session', async () => {
      (openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type: 'cancel',
      });
      (Linking.getInitialURL as jest.Mock).mockResolvedValue(null);

      const error = await connectX().catch((caught) => caught);
      expect(error).toBeInstanceOf(XAuthError);
      expect(error.type).toBe(XAuthErrorType.UserCancelled);
      expect(ProfileController.connectX).not.toHaveBeenCalled();
    }, 10000);

    it('throws a network failure error when the auth session ends with an unexpected result type', async () => {
      (openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type: 'locked',
      });
      (Linking.getInitialURL as jest.Mock).mockResolvedValue(null);

      await expect(connectX()).rejects.toMatchObject({
        type: XAuthErrorType.NetworkFailure,
        message: 'X authorization did not succeed: locked',
      });
      expect(ProfileController.connectX).not.toHaveBeenCalled();
    }, 10000);

    it('falls through to the cancel handling when the redirect listener subscription fails to register', async () => {
      (Linking.addEventListener as jest.Mock).mockImplementationOnce(() => {
        throw new Error('emitter unavailable');
      });
      (openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type: 'cancel',
      });
      (Linking.getInitialURL as jest.Mock).mockResolvedValue(null);

      await expect(connectX()).rejects.toMatchObject({
        type: XAuthErrorType.UserCancelled,
      });
      expect(ProfileController.connectX).not.toHaveBeenCalled();
    }, 10000);

    it('throws a typed cancel error when the redirect carries an OAuth error (user denied consent)', async () => {
      (openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type: 'success',
        url: REDIRECT_WITH(
          `error=access_denied&error_description=The+user+denied+access&state=${SESSION_STATE}`,
        ),
      });

      await expect(connectX()).rejects.toMatchObject({
        type: XAuthErrorType.UserCancelled,
      });
      expect(ProfileController.connectX).not.toHaveBeenCalled();
    });

    it('throws a state mismatch error when the redirect state does not match the issued state', async () => {
      (openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type: 'success',
        url: REDIRECT_WITH('code=auth-code-1&state=tampered-state'),
      });

      await expect(connectX()).rejects.toMatchObject({
        type: XAuthErrorType.StateMismatch,
      });
      expect(ProfileController.connectX).not.toHaveBeenCalled();
    });

    it('throws a missing code error when the redirect carries no code param', async () => {
      (openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type: 'success',
        url: REDIRECT_WITH(`state=${SESSION_STATE}`),
      });

      await expect(connectX()).rejects.toMatchObject({
        type: XAuthErrorType.MissingCode,
      });
      expect(ProfileController.connectX).not.toHaveBeenCalled();
    });

    it('throws a missing code error when the redirect carries neither code nor state params', async () => {
      (openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type: 'success',
        url: REDIRECT_WITH('unrelated=param'),
      });

      await expect(connectX()).rejects.toMatchObject({
        type: XAuthErrorType.MissingCode,
      });
      expect(ProfileController.connectX).not.toHaveBeenCalled();
    });

    it('cancels before opening the browser when aborted during getXAuthorizationUrl', async () => {
      let resolveUrl: (session: {
        authorizationUrl: string;
        state: string;
      }) => void = () => undefined;
      jest.mocked(ProfileController.getXAuthorizationUrl).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveUrl = resolve;
          }),
      );
      const controller = new AbortController();
      const promise = connectX({ signal: controller.signal });

      controller.abort();
      resolveUrl({
        authorizationUrl: AUTHORIZATION_URL,
        state: SESSION_STATE,
      });

      await expect(promise).rejects.toMatchObject({
        type: XAuthErrorType.UserCancelled,
      });
      expect(dismissAuthSession).toHaveBeenCalledTimes(1);
      expect(openAuthSessionAsync).not.toHaveBeenCalled();
      expect(ProfileController.connectX).not.toHaveBeenCalled();
    });

    it('skips linking X when aborted while the browser session is open', async () => {
      let resolveOpen: (result: { type: string; url: string }) => void = () =>
        undefined;
      (openAuthSessionAsync as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveOpen = resolve;
          }),
      );
      const controller = new AbortController();
      const promise = connectX({ signal: controller.signal });
      await flushPromises();
      expect(openAuthSessionAsync).toHaveBeenCalledTimes(1);

      controller.abort();
      resolveOpen({
        type: 'success',
        url: REDIRECT_WITH(`code=auth-code-1&state=${SESSION_STATE}`),
      });

      await expect(promise).rejects.toMatchObject({
        type: XAuthErrorType.UserCancelled,
      });
      expect(ProfileController.connectX).not.toHaveBeenCalled();
    });

    it('throws a backend error when the backend fails to issue the authorization URL', async () => {
      jest
        .mocked(ProfileController.getXAuthorizationUrl)
        .mockRejectedValue(new Error('503 Service Unavailable'));

      await expect(connectX()).rejects.toMatchObject({
        type: XAuthErrorType.BackendError,
      });
      expect(openAuthSessionAsync).not.toHaveBeenCalled();
    });

    it('throws a backend error whose message stringifies a non-Error backend rejection', async () => {
      jest
        .mocked(ProfileController.getXAuthorizationUrl)
        .mockRejectedValue('503 down');

      await expect(connectX()).rejects.toMatchObject({
        type: XAuthErrorType.BackendError,
        message: 'Failed to start X connect flow: 503 down',
      });
    });

    it('throws a backend error when the backend rejects the connect call', async () => {
      (openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type: 'success',
        url: REDIRECT_WITH(`code=auth-code-1&state=${SESSION_STATE}`),
      });
      jest
        .mocked(ProfileController.connectX)
        .mockRejectedValue(new Error('400 invalid_grant'));

      await expect(connectX()).rejects.toMatchObject({
        type: XAuthErrorType.BackendError,
      });
    });

    it('throws a network failure error when the auth session cannot be opened', async () => {
      (openAuthSessionAsync as jest.Mock).mockRejectedValue(
        new Error('Cannot open the auth session'),
      );

      await expect(connectX()).rejects.toMatchObject({
        type: XAuthErrorType.NetworkFailure,
      });
    });

    it('requests an authorization URL when the controller has no profile id yet', async () => {
      ProfileController.state.profile.profileId = '';
      (openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type: 'success',
        url: REDIRECT_WITH(`code=auth-code-1&state=${SESSION_STATE}`),
      });

      await expect(connectX()).resolves.toStrictEqual(X_PROFILE);
      expect(ProfileController.getXAuthorizationUrl).toHaveBeenCalledTimes(1);
      expect(ProfileController.connectX).toHaveBeenCalledWith({
        code: 'auth-code-1',
        state: SESSION_STATE,
      });
    });
  });

  describe('fetchAndUpdateXAccount', () => {
    it('delegates to ProfileController.fetchAndUpdateXAccount without args', async () => {
      jest
        .mocked(ProfileController.fetchAndUpdateXAccount)
        .mockResolvedValue(X_PROFILE);

      await expect(fetchAndUpdateXAccount()).resolves.toEqual(X_PROFILE);
      expect(ProfileController.fetchAndUpdateXAccount).toHaveBeenCalledWith();
    });

    it('throws NotSignedIn when no profile id exists', async () => {
      ProfileController.state.profile.profileId = '';
      await expect(fetchAndUpdateXAccount()).rejects.toMatchObject({
        type: XAuthErrorType.NotSignedIn,
      });
      expect(ProfileController.fetchAndUpdateXAccount).not.toHaveBeenCalled();
    });

    it('throws a backend error when the controller fails to fetch and update the X account', async () => {
      jest
        .mocked(ProfileController.fetchAndUpdateXAccount)
        .mockRejectedValue(new Error('503 Service Unavailable'));

      await expect(fetchAndUpdateXAccount()).rejects.toMatchObject({
        type: XAuthErrorType.BackendError,
        message:
          'Failed to fetch and update the X account: 503 Service Unavailable',
      });
    });

    it('preserves the controller failure as the cause of the backend error', async () => {
      const cause = new Error('503 Service Unavailable');
      jest
        .mocked(ProfileController.fetchAndUpdateXAccount)
        .mockRejectedValue(cause);

      const error = await fetchAndUpdateXAccount().catch((caught) => caught);
      expect(error).toBeInstanceOf(XAuthError);
      expect(error.cause).toBe(cause);
    });
  });

  describe('disconnectXAccount', () => {
    it('disconnects with the current profile id', async () => {
      jest.mocked(ProfileController.disconnectX).mockResolvedValue(undefined);

      await expect(disconnectXAccount()).resolves.toBeUndefined();
      expect(ProfileController.disconnectX).toHaveBeenCalledWith('profile-1');
    });

    it('throws NotSignedIn when no profile id exists', async () => {
      ProfileController.state.profile.profileId = '';
      await expect(disconnectXAccount()).rejects.toMatchObject({
        type: XAuthErrorType.NotSignedIn,
      });
      expect(ProfileController.disconnectX).not.toHaveBeenCalled();
    });

    it('throws a backend error when the controller fails to disconnect the X account', async () => {
      jest
        .mocked(ProfileController.disconnectX)
        .mockRejectedValue(new Error('500 Internal Server Error'));

      await expect(disconnectXAccount()).rejects.toMatchObject({
        type: XAuthErrorType.BackendError,
        message:
          'Failed to disconnect the X account: 500 Internal Server Error',
      });
    });

    it('preserves the controller failure as the cause of the backend error', async () => {
      const cause = new Error('500 Internal Server Error');
      jest.mocked(ProfileController.disconnectX).mockRejectedValue(cause);

      const error = await disconnectXAccount().catch((caught) => caught);
      expect(error).toBeInstanceOf(XAuthError);
      expect(error.cause).toBe(cause);
    });
  });
});
