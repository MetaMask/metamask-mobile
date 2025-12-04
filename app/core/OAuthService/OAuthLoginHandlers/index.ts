import { Platform } from 'react-native';
import { AuthConnection } from '../OAuthInterface';
import { IosGoogleLoginHandler } from './iosHandlers/google';
import { IosAppleLoginHandler } from './iosHandlers/apple';
import { AndroidGoogleLoginHandler } from './androidHandlers/google';
import { AndroidGoogleFallbackLoginHandler } from './androidHandlers/googleFallback';
import { AndroidAppleLoginHandler } from './androidHandlers/apple';
import {
  AuthServerUrl,
  AppRedirectUri,
  IosGID,
  IosGoogleRedirectUri,
  AndroidGoogleWebGID,
  AndroidGoogleRedirectUri,
  AppleWebClientId,
  web3AuthNetwork,
} from './constants';
import { OAuthErrorType, OAuthError } from '../error';
import { BaseLoginHandler } from './baseHandler';

/**
 * This factory pattern function is used to create a login handler based on the platform and provider.
 *
 * @param platformOS - The platform of the device (ios, android)
 * @param provider - The provider of the login (Google, Apple)
 * @param fallback - Whether to use browser fallback for Google login on Android (default: false)
 * @returns The login handler
 */
export function createLoginHandler(
  platformOS: Platform['OS'],
  provider: AuthConnection,
  fallback = false,
): BaseLoginHandler {
  if (
    !AuthServerUrl ||
    !AppRedirectUri ||
    !IosGID ||
    !IosGoogleRedirectUri ||
    !AndroidGoogleWebGID ||
    !AppleWebClientId
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
            authServerUrl: AuthServerUrl,
            web3AuthNetwork,
          });
        case AuthConnection.Apple:
          return new IosAppleLoginHandler({
            clientId: AppleWebClientId,
            authServerUrl: AuthServerUrl,
            web3AuthNetwork,
          });
        default:
          throw new OAuthError(
            'Invalid provider',
            OAuthErrorType.InvalidProvider,
          );
      }
    case 'android':
      switch (provider) {
        case AuthConnection.Google:
          return fallback
            ? new AndroidGoogleFallbackLoginHandler({
                clientId: AndroidGoogleWebGID,
                redirectUri: AndroidGoogleRedirectUri,
                authServerUrl: AuthServerUrl,
                web3AuthNetwork,
              })
            : new AndroidGoogleLoginHandler({
                clientId: AndroidGoogleWebGID,
                authServerUrl: AuthServerUrl,
                web3AuthNetwork,
              });
        case AuthConnection.Apple:
          return new AndroidAppleLoginHandler({
            clientId: AppleWebClientId,
            appRedirectUri: AppRedirectUri,
            authServerUrl: AuthServerUrl,
            web3AuthNetwork,
          });
        default:
          throw new OAuthError(
            'Invalid provider',
            OAuthErrorType.InvalidProvider,
          );
      }
    default:
      throw new OAuthError(
        'Unsupported Platform',
        OAuthErrorType.UnsupportedPlatform,
      );
  }
}
