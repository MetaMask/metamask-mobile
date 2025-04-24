import Logger from '../../../../util/Logger';
import {
  LoginHandlerIdTokenResult,
  AuthConnection,
} from '../../Oauth2loginInterface';
import { signInWithGoogle } from 'react-native-google-acm';
import { BaseLoginHandler } from '../baseHandler';

export class AndroidGoogleLoginHandler extends BaseLoginHandler {
  readonly #scope = ['email', 'profile'];

  protected clientId: string;

  get authConnection() {
    return AuthConnection.Google;
  }

  get scope() {
    return this.#scope;
  }

  get authServerPath() {
    return 'api/v1/oauth/id_token';
  }

  constructor(params: { clientId: string }) {
    super();
    this.clientId = params.clientId;
  }

  async login(): Promise<LoginHandlerIdTokenResult> {
    const result = await signInWithGoogle({
      serverClientId: this.clientId,
      nonce: this.nonce,
      autoSelectEnabled: true,
      filterByAuthorizedAccounts: false,
    });
    Logger.log('handleGoogleLogin: result', result);

    if (result.type === 'google-signin') {
      return {
        authConnection: this.authConnection,
        idToken: result.idToken,
        clientId: this.clientId,
      };
    }
    throw new Error('handleGoogleLogin: Unknown error');
  }
}
