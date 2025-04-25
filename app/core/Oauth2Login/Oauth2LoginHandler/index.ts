import { Platform } from 'react-native';
import { AuthConnection } from '../Oauth2loginInterface';
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
import { Oauth2LoginErrors, Oauth2LoginError } from '../error';

/**
 * This factory pattern function is used to create a login handler based on the platform and provider.
 *
 * @param platformOS - The platform of the device (ios, android)
 * @param provider - The provider of the login (Google, Apple)
 * @returns The login handler
 */
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
          throw new Oauth2LoginError(
            'Invalid provider',
            Oauth2LoginErrors.InvalidProvider,
          );
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
          throw new Oauth2LoginError(
            'Invalid provider',
            Oauth2LoginErrors.InvalidProvider,
          );
      }
    default:
      throw new Oauth2LoginError(
        'Unsupported Platform',
        Oauth2LoginErrors.UnsupportedPlatform,
      );
  }
}
