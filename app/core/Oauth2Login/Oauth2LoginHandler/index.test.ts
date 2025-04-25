import { Platform } from 'react-native';
import { AuthConnection } from '../Oauth2loginInterface';
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

describe('Oauth2 login service', () => {
  it('should return a type dismiss', async () => {
    for (const os of ['ios', 'android']) {
      for (const provider of Object.values(AuthConnection)) {
        const handler = createLoginHandler(os as Platform['OS'], provider);
        const result = await handler.login();
        expect(result?.authConnection).toBe(provider);
      }
    }
  });

  //   it('should return valid byoa response', async () => {
  //   });
});
