import { connectX, disconnectX, fetchAndUpdateXAccount } from './XAuthService';
import { XAuthError, XAuthErrorType } from './XAuthError';
import { X_REDIRECT_URI } from './XAuthConfig';
import Engine from '../Engine';
import { openAuthSessionAsync } from 'expo-web-browser';
import { Linking } from 'react-native';
import type { CaipAccountId } from '@metamask/utils';
import type {
  Profile,
  XConnectResult,
  XProfile,
} from '@metamask/profile-controller';

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
      AuthenticationController: {
        getSessionProfile: jest.fn(),
      },
      AccountsController: {
        getSelectedAccount: jest.fn(),
      },
      ProfileController: {
        startXConnect: jest.fn(),
        connectX: jest.fn(),
        disconnectX: jest.fn(),
        fetchAndUpdateXAccount: jest.fn(),
      },
    },
  },
}));

const { AuthenticationController, AccountsController, ProfileController } =
  Engine.context;

const AUTHORIZATION_URL = 'https://backend.example.com/x/authorize?state=xyz';
const SESSION_STATE = 'session-state-1';
const REDIRECT_WITH = (params: string) => `${X_REDIRECT_URI}?${params}`;

const PROFILE_ID = 'canonical-profile-123';
const ACCOUNT_ADDRESS = '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12';
const LINKED_ADDRESS: CaipAccountId = `eip155:0:${ACCOUNT_ADDRESS.toLowerCase()}`;

const PROFILE: Profile = {
  profileId: PROFILE_ID,
  username: 'tester',
  displayName: 'Tester',
  bio: 'bio',
  linkedAddresses: [LINKED_ADDRESS],
  avatarUrl: 'https://example.com/avatar.png',
  tradingPrivacy: 'public',
  connectedToX: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

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
    jest.mocked(AuthenticationController.getSessionProfile).mockResolvedValue({
      canonicalProfileId: PROFILE_ID,
    } as never);
    jest.mocked(AccountsController.getSelectedAccount).mockReturnValue({
      address: ACCOUNT_ADDRESS,
      type: 'eip155:eoa',
    } as never);
    jest.mocked(ProfileController.startXConnect).mockResolvedValue({
      authorizationUrl: AUTHORIZATION_URL,
      state: SESSION_STATE,
    });
    jest.mocked(ProfileController.connectX).mockResolvedValue({
      profile: PROFILE,
      xProfile: X_PROFILE,
      profileCreated: true,
    });
  });

  describe('connectX', () => {
    it('resolves identity, opens the backend authorization URL, and relays the redirect code and state (new-profile path)', async () => {
      (openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type: 'success',
        url: REDIRECT_WITH(`code=auth-code-1&state=${SESSION_STATE}`),
      });

      const result = await connectX();

      expect(AuthenticationController.getSessionProfile).toHaveBeenCalledTimes(
        1,
      );
      expect(ProfileController.startXConnect).toHaveBeenCalledWith({
        linkedAddress: LINKED_ADDRESS,
      });
      expect(openAuthSessionAsync).toHaveBeenCalledWith(
        AUTHORIZATION_URL,
        X_REDIRECT_URI,
        { createTask: false, preferUniversalLinks: true },
      );
      expect(ProfileController.connectX).toHaveBeenCalledWith({
        code: 'auth-code-1',
        state: SESSION_STATE,
        profileId: PROFILE_ID,
      });
      expect(result).toStrictEqual({
        profile: PROFILE,
        xProfile: X_PROFILE,
        profileCreated: true,
      });
    });

    it('lowercases the selected EVM account address in the linked address', async () => {
      (openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type: 'success',
        url: REDIRECT_WITH(`code=auth-code-1&state=${SESSION_STATE}`),
      });

      await connectX();

      expect(ProfileController.startXConnect).toHaveBeenCalledWith({
        linkedAddress: `eip155:0:${ACCOUNT_ADDRESS.toLowerCase()}`,
      });
    });

    it('returns the connect result with profileCreated false on the existing-profile path', async () => {
      (openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type: 'success',
        url: REDIRECT_WITH(`code=auth-code-1&state=${SESSION_STATE}`),
      });
      jest.mocked(ProfileController.connectX).mockResolvedValue({
        profile: PROFILE,
        xProfile: X_PROFILE,
        profileCreated: false,
      });

      const result: XConnectResult = await connectX();

      expect(result.profileCreated).toBe(false);
      expect(result.profile).toStrictEqual(PROFILE);
      expect(result.xProfile).toStrictEqual(X_PROFILE);
    });

    it('throws a typed NotSignedIn error when the auth session is unavailable', async () => {
      jest
        .mocked(AuthenticationController.getSessionProfile)
        .mockRejectedValue(new Error('no session'));

      const error = await connectX().catch((caught) => caught);
      expect(error).toBeInstanceOf(XAuthError);
      expect(error.type).toBe(XAuthErrorType.NotSignedIn);
      expect(ProfileController.startXConnect).not.toHaveBeenCalled();
    });

    it('throws a typed NotSignedIn error when the session has no canonical profile id', async () => {
      jest
        .mocked(AuthenticationController.getSessionProfile)
        .mockResolvedValue({
          canonicalProfileId: undefined,
        } as never);

      const error = await connectX().catch((caught) => caught);
      expect(error).toBeInstanceOf(XAuthError);
      expect(error.type).toBe(XAuthErrorType.NotSignedIn);
      expect(ProfileController.startXConnect).not.toHaveBeenCalled();
    });

    it('throws a typed NoEvmAccount error when the selected account is not an EVM account', async () => {
      jest.mocked(AccountsController.getSelectedAccount).mockReturnValue({
        address: '5FhqRohbVWNoboVFgbDp3LgvWSD7CRSKVPMgxTreesLyrS8V',
        type: 'solana',
      } as never);

      const error = await connectX().catch((caught) => caught);
      expect(error).toBeInstanceOf(XAuthError);
      expect(error.type).toBe(XAuthErrorType.NoEvmAccount);
      expect(ProfileController.startXConnect).not.toHaveBeenCalled();
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

      await expect(promise).resolves.toStrictEqual({
        profile: PROFILE,
        xProfile: X_PROFILE,
        profileCreated: true,
      });
      expect(ProfileController.connectX).toHaveBeenCalledWith({
        code: 'linking-code',
        state: SESSION_STATE,
        profileId: PROFILE_ID,
      });
    });

    it('captures the redirect via getInitialURL as a cold-start fallback', async () => {
      (openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type: 'cancel',
      });
      (Linking.getInitialURL as jest.Mock).mockResolvedValue(
        REDIRECT_WITH(`code=cold-start-code&state=${SESSION_STATE}`),
      );

      await expect(connectX()).resolves.toStrictEqual({
        profile: PROFILE,
        xProfile: X_PROFILE,
        profileCreated: true,
      });
      expect(ProfileController.connectX).toHaveBeenCalledWith({
        code: 'cold-start-code',
        state: SESSION_STATE,
        profileId: PROFILE_ID,
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
        .mocked(ProfileController.startXConnect)
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

  describe('disconnectX', () => {
    it('resolves the profile ID from the auth session and delegates to ProfileController.disconnectX', async () => {
      jest.mocked(ProfileController.disconnectX).mockResolvedValue(undefined);

      await disconnectX();

      expect(AuthenticationController.getSessionProfile).toHaveBeenCalledTimes(
        1,
      );
      expect(ProfileController.disconnectX).toHaveBeenCalledWith(PROFILE_ID);
    });

    it('throws a typed NotSignedIn error when the auth session is unavailable', async () => {
      jest
        .mocked(AuthenticationController.getSessionProfile)
        .mockRejectedValue(new Error('no session'));

      await expect(disconnectX()).rejects.toMatchObject({
        type: XAuthErrorType.NotSignedIn,
      });
      expect(ProfileController.disconnectX).not.toHaveBeenCalled();
    });

    it('propagates backend failures', async () => {
      jest
        .mocked(ProfileController.disconnectX)
        .mockRejectedValue(new Error('500 Internal Server Error'));

      await expect(disconnectX()).rejects.toThrow('500 Internal Server Error');
    });
  });

  describe('fetchAndUpdateXAccount', () => {
    it('delegates to ProfileController.fetchAndUpdateXAccount without args and without resolving the session profile', async () => {
      jest
        .mocked(ProfileController.fetchAndUpdateXAccount)
        .mockResolvedValue(X_PROFILE);

      await expect(fetchAndUpdateXAccount()).resolves.toEqual(X_PROFILE);
      expect(ProfileController.fetchAndUpdateXAccount).toHaveBeenCalledWith();
      expect(AuthenticationController.getSessionProfile).not.toHaveBeenCalled();
    });
  });
});
