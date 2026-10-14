import { connectX, fetchAndUpdateXAccount } from './XAuthService';
import { XAuthError, XAuthErrorType } from './XAuthError';
import { X_REDIRECT_URI } from './XAuthConfig';
import Engine from '../Engine';
import { openAuthSessionAsync } from 'expo-web-browser';
import { Linking } from 'react-native';
import type { XProfile } from '@metamask/profile-controller';

jest.mock('expo-web-browser', () => ({
  __esModule: true,
  openAuthSessionAsync: jest.fn(),
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
      ProfileService: {
        getXAuthUrl: jest.fn(),
      },
      ProfileController: {
        connectX: jest.fn(),
        fetchAndUpdateXAccount: jest.fn(),
      },
    },
  },
}));

const { ProfileService, ProfileController } = Engine.context;

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
    jest.mocked(ProfileService.getXAuthUrl).mockResolvedValue({
      url: AUTHORIZATION_URL,
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

      expect(ProfileService.getXAuthUrl).toHaveBeenCalledTimes(1);
      expect(ProfileService.getXAuthUrl).toHaveBeenCalledWith();
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

    it('captures the redirect via getInitialURL as a cold-start fallback', async () => {
      (openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type: 'cancel',
      });
      (Linking.getInitialURL as jest.Mock).mockResolvedValue(
        REDIRECT_WITH(`code=cold-start-code&state=${SESSION_STATE}`),
      );

      await expect(connectX()).resolves.toStrictEqual(X_PROFILE);
      expect(ProfileController.connectX).toHaveBeenCalledWith({
        code: 'cold-start-code',
        state: SESSION_STATE,
      });
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

    it('throws a backend error when the backend fails to issue the authorization URL', async () => {
      jest
        .mocked(ProfileService.getXAuthUrl)
        .mockRejectedValue(new Error('503 Service Unavailable'));

      await expect(connectX()).rejects.toMatchObject({
        type: XAuthErrorType.BackendError,
      });
      expect(openAuthSessionAsync).not.toHaveBeenCalled();
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
  });

  describe('fetchAndUpdateXAccount', () => {
    it('delegates to ProfileController.fetchAndUpdateXAccount without args', async () => {
      jest
        .mocked(ProfileController.fetchAndUpdateXAccount)
        .mockResolvedValue(X_PROFILE);

      await expect(fetchAndUpdateXAccount()).resolves.toEqual(X_PROFILE);
      expect(ProfileController.fetchAndUpdateXAccount).toHaveBeenCalledWith();
    });
  });
});
