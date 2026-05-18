import { Platform } from 'react-native';
import { AuthConnection } from '../OAuthInterface';
import { IosGoogleLoginHandler } from './iosHandlers/google';
import { IosAppleLoginHandler } from './iosHandlers/apple';
import { AndroidGoogleLoginHandler } from './androidHandlers/google';
import { AndroidGoogleFallbackLoginHandler } from './androidHandlers/googleFallback';
import { AndroidAppleLoginHandler } from './androidHandlers/apple';
import { TelegramLoginHandler } from './shared/TelegramLoginHandler';
import {
  w3aAuthServerUrl,
  GoogleWebGID,
  GoogleRedirectUri,
  AppleWebClientId,
  TelegramClientId,
  AppRedirectUri,
  web3AuthNetwork,
  getIosGoogleConfig,
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
    !w3aAuthServerUrl ||
    !GoogleWebGID ||
    !AppleWebClientId ||
    !TelegramClientId ||
    !GoogleRedirectUri
  ) {
    throw new Error('Missing environment variables');
  }
  switch (platformOS) {
    case 'ios':
      switch (provider) {
        case AuthConnection.Google: {
          const { clientId, redirectUri } = getIosGoogleConfig();
          return new IosGoogleLoginHandler({
            clientId,
            redirectUri,
            w3aAuthServerUrl: w3aAuthServerUrl,
            web3AuthNetwork,
          });
        }
        case AuthConnection.Apple:
          if (!AppleWebClientId) {
            throw new Error('Missing environment variables');
          }
          return new IosAppleLoginHandler({
            clientId: AppleWebClientId,
            w3aAuthServerUrl: w3aAuthServerUrl,
            web3AuthNetwork,
          });
        case AuthConnection.Telegram:
          return new TelegramLoginHandler({
            clientId: TelegramClientId,
            appRedirectUri: AppRedirectUri,
            w3aAuthServerUrl: w3aAuthServerUrl,
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
                clientId: GoogleWebGID,
                redirectUri: GoogleRedirectUri,
                w3aAuthServerUrl: w3aAuthServerUrl,
                web3AuthNetwork,
              })
            : new AndroidGoogleLoginHandler({
                clientId: GoogleWebGID,
                w3aAuthServerUrl: w3aAuthServerUrl,
                web3AuthNetwork,
              });
        case AuthConnection.Apple:
          if (!AppleWebClientId) {
            throw new Error('Missing environment variables');
          }
          return new AndroidAppleLoginHandler({
            clientId: AppleWebClientId,
            appRedirectUri: GoogleRedirectUri,
            w3aAuthServerUrl: w3aAuthServerUrl,
            web3AuthNetwork,
          });
        case AuthConnection.Telegram:
          return new TelegramLoginHandler({
            clientId: TelegramClientId,
            appRedirectUri: AppRedirectUri,
            w3aAuthServerUrl: w3aAuthServerUrl,
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
