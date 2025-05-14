import { Platform } from 'react-native';
import { AuthConnection } from '../OAuthInterface';
import { createLoginHandler } from './index';

const mockExpoAuthSessionPromptAsync = jest.fn().mockResolvedValue({
  type: 'success',
  params: {
    code: 'googleCode',
  },
});
jest.mock('expo-auth-session', () => ({
  AuthRequest: () => ({
    promptAsync: mockExpoAuthSessionPromptAsync,
    makeAuthUrlAsync: jest.fn().mockResolvedValue({
      url: 'https://example.com',
    }),
  }),
  CodeChallengeMethod: jest.fn(),
  ResponseType: jest.fn(),
}));

const mockSignInAsync = jest.fn().mockResolvedValue({
  identityToken: 'appleIdToken',
});
jest.mock('expo-apple-authentication', () => ({
  signInAsync: () => mockSignInAsync(),
  AppleAuthenticationScope: jest.fn(),
}));

const mockSignInWithGoogle = jest.fn().mockResolvedValue({
  type: 'google-signin',
  idToken: 'googleIdToken',
});
jest.mock('react-native-google-acm', () => ({
  signInWithGoogle: () => mockSignInWithGoogle(),
}));

describe('OAuth login handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  for (const os of ['ios', 'android']) {
    for (const provider of Object.values(AuthConnection)) {
      it(`should create the correct login handler for ${os} and ${provider}`, async () => {
        const handler = createLoginHandler(os as Platform['OS'], provider);
        const result = await handler.login();
        expect(result?.authConnection).toBe(provider);

        switch (os) {
          case 'ios': {
            switch (provider) {
              case AuthConnection.Apple:
                expect(mockExpoAuthSessionPromptAsync).toHaveBeenCalledTimes(0);
                expect(mockSignInWithGoogle).toHaveBeenCalledTimes(0);
                expect(mockSignInAsync).toHaveBeenCalledTimes(1);
                break;
              case AuthConnection.Google:
                expect(mockExpoAuthSessionPromptAsync).toHaveBeenCalledTimes(1);
                expect(mockSignInWithGoogle).toHaveBeenCalledTimes(0);
                expect(mockSignInAsync).toHaveBeenCalledTimes(0);
                break;
            }
            break;
          }
          case 'android': {
            switch (provider) {
              case AuthConnection.Apple:
                expect(mockExpoAuthSessionPromptAsync).toHaveBeenCalledTimes(1);
                expect(mockSignInWithGoogle).toHaveBeenCalledTimes(0);
                expect(mockSignInAsync).toHaveBeenCalledTimes(0);
                break;
              case AuthConnection.Google:
                expect(mockExpoAuthSessionPromptAsync).toHaveBeenCalledTimes(0);
                expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
                expect(mockSignInAsync).toHaveBeenCalledTimes(0);
                break;
            }
            break;
          }
        }
      });
    }
  }
});
