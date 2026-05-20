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
  profileSyncEnv,
  GoogleWebGID,
  GoogleRedirectUri,
  AppleWebClientId,
  AppRedirectUri,
  TelegramRedirectUri,
  web3AuthNetwork,
  getIosGoogleConfig,
} from './constants';
import { OAuthErrorType, OAuthError } from '../error';
import { BaseLoginHandler } from './baseHandler';

export interface CreateLoginHandlerOptions {
  /**
   * For {@link AuthConnection.Telegram}: when false/omitted, constructing a handler throws
   * (onboarding hides Telegram). Set true from UI via {@link selectTelegramLoginEnabled},
   * or from {@link AuthTokenHandler} for refresh/renew/revoke when the session is already
   * Telegram (independent of the onboarding feature flag).
   */
  telegramLoginEnabled?: boolean;
}

/**
 * This factory pattern function is used to create a login handler based on the platform and provider.
 *
 * @param platformOS - The platform of the device (ios, android)
 * @param provider - The provider of the login (Google, Apple)
 * @param fallback - Whether to use browser fallback for Google login on Android (default: false)
 * @param options - Optional behavior overrides for internal callers
 * @returns The login handler
 */
export function createLoginHandler(
  platformOS: Platform['OS'],
  provider: AuthConnection,
  fallback = false,
  options?: CreateLoginHandlerOptions,
): BaseLoginHandler {
  if (
    !w3aAuthServerUrl ||
    !GoogleWebGID ||
    !AppleWebClientId ||
    !GoogleRedirectUri
  ) {
    throw new Error('Missing environment variables');
  }
  if (provider === AuthConnection.Telegram && !options?.telegramLoginEnabled) {
    throw new OAuthError(
      'Telegram login is not available',
      OAuthErrorType.InvalidProvider,
    );
  }
  switch (platformOS) {
    case 'ios':
      switch (provider) {
        case AuthConnection.Google: {
          const { clientId, redirectUri } = getIosGoogleConfig();
          return new IosGoogleLoginHandler({
            clientId,
            redirectUri,
            authServerUrl: w3aAuthServerUrl,
            web3AuthNetwork,
          });
        }
        case AuthConnection.Apple:
          if (!AppleWebClientId) {
            throw new Error('Missing environment variables');
          }
          return new IosAppleLoginHandler({
            clientId: AppleWebClientId,
            authServerUrl: w3aAuthServerUrl,
            web3AuthNetwork,
          });
        case AuthConnection.Telegram:
          return new TelegramLoginHandler({
            appRedirectUri: TelegramRedirectUri,
            authServerUrl: w3aAuthServerUrl,
            profileSyncEnv,
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
                authServerUrl: w3aAuthServerUrl,
                web3AuthNetwork,
              })
            : new AndroidGoogleLoginHandler({
                clientId: GoogleWebGID,
                authServerUrl: w3aAuthServerUrl,
                web3AuthNetwork,
              });
        case AuthConnection.Apple:
          if (!AppleWebClientId) {
            throw new Error('Missing environment variables');
          }
          return new AndroidAppleLoginHandler({
            clientId: AppleWebClientId,
            appRedirectUri: GoogleRedirectUri,
            authServerUrl: w3aAuthServerUrl,
            web3AuthNetwork,
          });
        case AuthConnection.Telegram:
          return new TelegramLoginHandler({
            appRedirectUri: TelegramRedirectUri,
            authServerUrl: w3aAuthServerUrl,
            profileSyncEnv,
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
