import { Alert } from 'react-native';
import { registerDevMenuItems } from 'expo-dev-menu';

import { strings } from '../../../locales/i18n';
import Engine from '../Engine';
import ClipboardManager from '../ClipboardManager';
import Logger from '../../util/Logger';

type AuthValueKind = 'profileId' | 'jwt';

/**
 * Reads the requested MetaMask authentication value, copies it to the
 * clipboard and surfaces the outcome via an alert. Used by the Expo dev-menu
 * entries so the profile ID / mm-auth JWT can be inspected in debug builds
 * without a dedicated in-app screen.
 */
const copyAuthValue = async (
  kind: AuthValueKind,
  copiedMessage: string,
): Promise<void> => {
  const { AuthenticationController } = Engine.context;
  const title = strings('app_settings.auth_debugging.title');

  if (!AuthenticationController.isSignedIn()) {
    Alert.alert(title, strings('app_settings.auth_debugging.not_signed_in'));
    return;
  }

  try {
    const value =
      kind === 'profileId'
        ? (await AuthenticationController.getSessionProfile())?.profileId
        : await AuthenticationController.getBearerToken();

    if (!value) {
      Alert.alert(title, strings('app_settings.auth_debugging.not_available'));
      return;
    }

    await ClipboardManager.setString(value);
    Alert.alert(title, copiedMessage);
  } catch (error) {
    Logger.error(
      error instanceof Error ? error : new Error(String(error)),
      'DevMenu: failed to copy auth debug value',
    );
    Alert.alert(title, strings('app_settings.auth_debugging.copy_failed'));
  }
};

/**
 * Registers Auth Debugging entries in the Expo dev menu.
 *
 * These expose the current MetaMask authentication session (profile ID and
 * mm-auth JWT) by copying each value to the clipboard. Intended for debug
 * builds only — the caller is responsible for gating on `__DEV__`.
 *
 * Note: `registerDevMenuItems` replaces ALL previously registered custom
 * items, so every custom entry the app needs must be registered in this call.
 */
export const registerAuthDebugMenuItems = (): void => {
  registerDevMenuItems([
    {
      name: strings('app_settings.auth_debugging.copy_profile_id'),
      callback: () => {
        void copyAuthValue(
          'profileId',
          strings('app_settings.auth_debugging.copied_profile_id'),
        );
      },
      shouldCollapse: true,
    },
    {
      name: strings('app_settings.auth_debugging.copy_jwt'),
      callback: () => {
        void copyAuthValue(
          'jwt',
          strings('app_settings.auth_debugging.copied_jwt'),
        );
      },
      shouldCollapse: true,
    },
  ]).catch((error) => {
    Logger.error(
      error instanceof Error ? error : new Error(String(error)),
      'DevMenu: failed to register auth debug menu items',
    );
  });
};
