import { AuthConnection } from './Oauth2loginInterface';
import Oauth2LoginService from './Oauth2loginService';
import ReduxService, { ReduxStore } from '../redux';

jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
  getState: () => ({ security: { allowLoginWithRememberMe: true } }),
  dispatch: jest.fn()
} as unknown as ReduxStore);
// const actualSeedlessOnboardingController = jest.requireActual('./Oauth2LoginHandler');

let mockLoginHandlerResponse = () => undefined;

jest.mock('./Oauth2LoginHandler', () => ({
  createLoginHandler: ()=>({
    login: () => mockLoginHandlerResponse(),
  }),
  getByoaTokens: () => ({}),
}));


describe('Oauth2 login service', () => {
  it('should return a type dismiss', async () => {
    jest.mock('./Oauth2LoginHandler', () => ({
      createLoginHandler: ()=>({
        login: ()=> undefined,
      }),
      getByoaTokens: () => ({}),
    }));
    const result = await Oauth2LoginService.handleOauth2Login(AuthConnection.Google);
    expect(result.type).toBe('dismiss');

    mockLoginHandlerResponse = () => {
      throw new Error('unexpecte Error');
    };

    const result2 = await Oauth2LoginService.handleOauth2Login(AuthConnection.Google);
    expect(result2.type).toBe('error');
  });

});
