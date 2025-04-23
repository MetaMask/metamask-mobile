import { Platform } from 'react-native';
import { AuthConnection } from '../Oauth2loginInterface';
import { createLoginHandler } from './index';


// const actualSeedlessOnboardingController = jest.requireActual('./Oauth2LoginHandler');
jest.mock('./android/google', () => ({
    AndroidGoogleLoginHandler : () => ({
            login : jest.fn().mockReturnValue({provider: 'google', clientId: 'android.google.clientId'})
    }),
}));
jest.mock('./android/apple', () => ({
    AndroidAppleLoginHandler : () => ({
        login : jest.fn().mockReturnValue({provider: 'apple', clientId: 'android.apple.clientId'})
    }),
}));
jest.mock('./ios/google', () => ({
    IosGoogleLoginHandler : () => ({
        login : jest.fn().mockReturnValue({provider: 'google', clientId: 'ios.google.clientId'})
    }),
}));
jest.mock('./ios/apple', () => ({
    IosAppleLoginHandler : () => ({
        login : jest.fn().mockReturnValue({provider: 'apple', clientId: 'ios.apple.clientId'})
    }),
}));

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
