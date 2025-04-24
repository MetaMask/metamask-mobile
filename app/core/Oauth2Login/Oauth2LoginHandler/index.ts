import { Platform } from 'react-native';
import {
  AuthResponse,
  HandleFlowParams,
  LoginHandlerCodeResult,
  LoginHandlerIdTokenResult,
  AuthConnection,
} from '../Oauth2loginInterface';
import { Web3AuthNetwork } from '@metamask/seedless-onboarding-controller';
import { IosGoogleLoginHandler } from './iosHandlers/google';
import { IosAppleLoginHandler } from './iosHandlers/apple';
import { AndroidGoogleLoginHandler } from './androidHandlers/google';
import { AndroidAppleLoginHandler } from './androidHandlers/apple';
import {
  AuthServerUrl,
  AppRedirectUri,
  IosGID,
  IosGoogleRedirectUri,
  AndroidGoogleWebGID,
  AppleWebClientId,
  IosAppleClientId,
  AppleServerRedirectUri,
} from './constants';

export function createLoginHandler(
  platformOS: Platform['OS'],
  provider: AuthConnection,
) {
  if (
    !AuthServerUrl ||
    !AppRedirectUri ||
    !IosGID ||
    !IosGoogleRedirectUri ||
    !AndroidGoogleWebGID ||
    !AppleWebClientId ||
    !IosAppleClientId
  ) {
    throw new Error('Missing environment variables');
  }
  switch (platformOS) {
    case 'ios':
      switch (provider) {
        case AuthConnection.Google:
          return new IosGoogleLoginHandler({
            clientId: IosGID,
            redirectUri: IosGoogleRedirectUri,
          });
        case AuthConnection.Apple:
          return new IosAppleLoginHandler({ clientId: IosAppleClientId });
        default:
          throw new Error('Invalid provider');
      }
    case 'android':
      switch (provider) {
        case AuthConnection.Google:
          return new AndroidGoogleLoginHandler({
            clientId: AndroidGoogleWebGID,
          });
        case AuthConnection.Apple:
          return new AndroidAppleLoginHandler({
            clientId: AppleWebClientId,
            redirectUri: AppleServerRedirectUri,
            appRedirectUri: AppRedirectUri,
          });
        default:
          throw new Error('Invalid provider');
      }
    default:
      throw new Error('Unsupported Platform');
  }
}

export async function getAuthTokens(
  params: HandleFlowParams,
  pathname: string,
  authServerUrl: string,
): Promise<AuthResponse> {
  const {
    authConnection,
    clientId,
    redirectUri,
    codeVerifier,
    web3AuthNetwork,
  } = params;

  // Type guard to check if params has a code property
  const hasCode = (
    p: HandleFlowParams,
  ): p is LoginHandlerCodeResult & { web3AuthNetwork: Web3AuthNetwork } =>
    'code' in p;

  // Type guard to check if params has an idToken property
  const hasIdToken = (
    p: HandleFlowParams,
  ): p is LoginHandlerIdTokenResult & { web3AuthNetwork: Web3AuthNetwork } =>
    'idToken' in p;

  const code = hasCode(params) ? params.code : undefined;
  const idToken = hasIdToken(params) ? params.idToken : undefined;

  const body = {
    code,
    id_token: idToken,
    client_id: clientId,
    login_provider: authConnection,
    network: web3AuthNetwork,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  };

  const res = await fetch(`${authServerUrl}/${pathname}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (res.status === 200) {
    const data = (await res.json()) as AuthResponse;
    return data;
  }

  throw new Error(`AuthServer Error : ${await res.text()}`);
}
