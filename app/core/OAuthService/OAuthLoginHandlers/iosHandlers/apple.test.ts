import {
  AppleAuthenticationScope,
  signInAsync,
} from 'expo-apple-authentication';
import { Web3AuthNetwork } from '@metamask/seedless-onboarding-controller';
import { OAuthErrorType } from '../../error';
import { IosAppleLoginHandler } from './apple';

jest.mock('expo-apple-authentication', () => ({
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: { log: jest.fn() },
}));

const mockSignInAsync = jest.mocked(signInAsync);

describe('IosAppleLoginHandler', () => {
  let handler: IosAppleLoginHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new IosAppleLoginHandler({
      clientId: 'com.metamask.ios',
      authServerUrl: 'https://auth.example.com',
      web3AuthNetwork: Web3AuthNetwork.Mainnet,
      nonce: 'recovery-nonce',
    });
  });

  describe('getProviderIdToken', () => {
    it('returns the Apple identity token bound to the handler nonce', async () => {
      mockSignInAsync.mockResolvedValue({
        identityToken: 'apple-id-token',
      } as never);

      const idToken = await handler.getProviderIdToken();

      expect(mockSignInAsync).toHaveBeenCalledWith({
        requestedScopes: [
          AppleAuthenticationScope.FULL_NAME,
          AppleAuthenticationScope.EMAIL,
        ],
        nonce: 'recovery-nonce',
      });
      expect(idToken).toBe('apple-id-token');
    });

    it('throws AppleLoginError when identityToken is missing', async () => {
      mockSignInAsync.mockResolvedValue({ identityToken: null } as never);

      await expect(handler.getProviderIdToken()).rejects.toMatchObject({
        code: OAuthErrorType.AppleLoginError,
      });
    });

    it('normalizes ERR_REQUEST_CANCELED to UserCancelled', async () => {
      const cancelError = Object.assign(new Error('The user canceled'), {
        code: 'ERR_REQUEST_CANCELED',
      });
      mockSignInAsync.mockRejectedValue(cancelError);

      await expect(handler.getProviderIdToken()).rejects.toMatchObject({
        code: OAuthErrorType.UserCancelled,
      });
    });

    it('wraps unexpected Apple sign-in errors in AppleLoginError', async () => {
      mockSignInAsync.mockRejectedValue(new Error('Keychain failure'));

      await expect(handler.getProviderIdToken()).rejects.toMatchObject({
        code: OAuthErrorType.AppleLoginError,
      });
    });
  });
});
