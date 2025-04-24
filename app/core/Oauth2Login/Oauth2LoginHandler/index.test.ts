import { Platform } from 'react-native';
import { AuthConnection } from '../Oauth2loginInterface';
import { createLoginHandler } from './index';

jest.mock('expo-auth-session', () => ({
        AuthRequest: jest.fn()  ,
        CodeChallengeMethod: jest.fn(),
        ResponseType: jest.fn(),
    }));

jest.mock('expo-apple-authentication', () => ({
    signInAsync: jest.fn(),
}));

// const actualSeedlessOnboardingController = jest.requireActual('./Oauth2LoginHandler');
jest.mock('./android/google', () => {
    const actual = jest.requireActual('./android/google');
    return ({
        AndroidGoogleLoginHandler : () => ({
            ...actual.AndroidGoogleLoginHandler,
            login : jest.fn().mockReturnValue({authConnection: 'google', clientId: 'android.google.clientId'})
        }),
    });
});
jest.mock('./android/apple', () => {
    const actual = jest.requireActual('./android/apple');
    return ({
        AndroidAppleLoginHandler : () => ({
            ...actual.AndroidAppleLoginHandler,
        login : jest.fn().mockReturnValue({authConnection: 'apple', clientId: 'android.apple.clientId'})
        }),
    });
});
jest.mock('./ios/google', () => {
    const actual = jest.requireActual('./ios/google');
    return ({
        IosGoogleLoginHandler : () => ({
            ...actual.IosGoogleLoginHandler,
            login : jest.fn().mockReturnValue({authConnection: 'google', clientId: 'ios.google.clientId'})
        }),
    });
});
jest.mock('./ios/apple', () => {
    const actual = jest.requireActual('./ios/apple');
    return ({
        IosAppleLoginHandler : () => ({
            ...actual.IosAppleLoginHandler,
            login : jest.fn().mockReturnValue({authConnection: 'apple', clientId: 'ios.apple.clientId'})
        }),
    });
});

describe('Oauth2 login service', () => {
  it('should return a type dismiss', async () => {
    for ( const os of ['ios', 'android']) {
        for ( const provider of Object.values(AuthConnection) ) {
            const handler = createLoginHandler(os as Platform['OS'], provider);
            const result = await handler.login();
            expect(result?.authConnection).toBe(provider);
            expect(result?.clientId).toBe(`${os}.${provider}.clientId`);
        }
    }
  });

//   it('should return valid byoa response', async () => {
//   });

});
