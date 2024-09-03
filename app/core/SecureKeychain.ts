import * as Keychain from 'react-native-keychain'; // eslint-disable-line import/no-namespace
import { Encryptor, LEGACY_DERIVATION_OPTIONS } from './Encryptor';
import { strings } from '../../locales/i18n';
import StorageWrapper from '../store/storage-wrapper';
import { Platform } from 'react-native';
import { MetaMetricsEvents, MetaMetrics } from '../core/Analytics';
import {
  BIOMETRY_CHOICE,
  BIOMETRY_CHOICE_DISABLED,
  PASSCODE_CHOICE,
  PASSCODE_DISABLED,
  TRUE,
} from '../constants/storage';
import Device from '../util/device';

const privates = new WeakMap<SecureKeychain, { code: string }>();
const encryptor = new Encryptor({
  keyDerivationOptions: LEGACY_DERIVATION_OPTIONS,
});
const defaultOptions: Keychain.Options = {
  service: 'com.metamask',
  authenticationPrompt: { title: strings('authentication.auth_prompt_desc') },
};
import AUTHENTICATION_TYPE from '../constants/userProperties';
import { UserProfileProperty } from '../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';

/**
 * Class that wraps Keychain from react-native-keychain
 * abstracting metamask specific functionality and settings
 * and also adding an extra layer of encryption before writing into
 * the phone's keychain
 */
class SecureKeychain {
  static instance: SecureKeychain;
  isAuthenticating = false;

  constructor(code: string) {
    if (!SecureKeychain.instance) {
      privates.set(this, { code });
      SecureKeychain.instance = this;
    }

    return SecureKeychain.instance;
  }

  encryptPassword(password: string): Promise<string> {
    const privateData = privates.get(this);
    if (!privateData) {
      throw new Error('SecureKeychain not properly initialized');
    }
    return encryptor.encrypt(privateData.code, { password });
  }

  async decryptPassword(str: string): Promise<{ password: string }> {
    const privateData = privates.get(this);
    if (!privateData) {
      throw new Error('SecureKeychain not properly initialized');
    }
    return encryptor.decrypt(privateData.code, str) as Promise<{
      password: string;
    }>;
  }
}

let instance: SecureKeychain | undefined;

const SecureKeychainModule = {
  init(salt: string): SecureKeychain {
    instance = new SecureKeychain(salt);

    if (
      Device.isAndroid() &&
      Keychain.SECURITY_LEVEL &&
      Keychain.SECURITY_LEVEL.SECURE_HARDWARE
    ) {
      MetaMetrics.getInstance().trackEvent(
        MetaMetricsEvents.ANDROID_HARDWARE_KEYSTORE,
      );
    }

    Object.freeze(instance);
    return instance;
  },

  getInstance(): SecureKeychain | undefined {
    return instance;
  },

  getSupportedBiometryType(): Promise<Keychain.BIOMETRY_TYPE | null> {
    return Keychain.getSupportedBiometryType();
  },

  async resetGenericPassword(): Promise<boolean> {
    const options = { service: defaultOptions.service };
    try {
      await StorageWrapper.removeItem(BIOMETRY_CHOICE);
      await StorageWrapper.removeItem(PASSCODE_CHOICE);
      // This is called to remove other auth types and set the user back to the default password login
      await MetaMetrics.getInstance().addTraitsToUser({
        [UserProfileProperty.AUTHENTICATION_TYPE]: AUTHENTICATION_TYPE.PASSWORD,
      });
      const result = await Keychain.resetGenericPassword(options);
      if (result === false) {
        console.warn('Keychain reset operation returned false');
        throw new Error('Keychain reset operation failed');
      }
      return true;
    } catch (error) {
      console.error('Error resetting generic password:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to reset generic password: ${error.message}`);
      } else {
        throw new Error('Failed to reset generic password: Unknown error');
      }
    }
  },

  async getGenericPassword(): Promise<Keychain.UserCredentials | null> {
    if (instance) {
      try {
        instance.isAuthenticating = true;
        const keychainObject = await Keychain.getGenericPassword(
          defaultOptions,
        );
        if (
          keychainObject &&
          typeof keychainObject === 'object' &&
          'password' in keychainObject
        ) {
          const encryptedPassword = keychainObject.password;
          const decrypted = await instance.decryptPassword(encryptedPassword);
          keychainObject.password = decrypted.password;
          instance.isAuthenticating = false;
          return keychainObject;
        }
        instance.isAuthenticating = false;
        return null;
      } catch (error) {
        instance.isAuthenticating = false;
        throw new Error(error instanceof Error ? error.message : String(error));
      }
    }
    return null;
  },

  async setGenericPassword(password: string, type?: string): Promise<void> {
    if (!instance) {
      throw new Error('SecureKeychain not initialized');
    }

    const authOptions: Keychain.Options = {
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    };

    const metrics = MetaMetrics.getInstance();

    if (!type) {
      try {
        // Setting a password without a type resets to default password login
        const resetResult = await this.resetGenericPassword();
        if (!resetResult) {
          throw new Error(
            'Failed to reset generic password: Operation unsuccessful',
          );
        }
        await metrics.addTraitsToUser({
          [UserProfileProperty.AUTHENTICATION_TYPE]:
            AUTHENTICATION_TYPE.PASSWORD,
        });
      } catch (error) {
        console.error('Error resetting generic password:', error);
        throw new Error(
          `Failed to reset generic password: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
      }
      return;
    }

    try {
      switch (type) {
        case SecureKeychainModule.TYPES.BIOMETRICS:
          authOptions.accessControl =
            Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET;
          await metrics.addTraitsToUser({
            [UserProfileProperty.AUTHENTICATION_TYPE]:
              AUTHENTICATION_TYPE.BIOMETRIC,
          });
          break;
        case SecureKeychainModule.TYPES.PASSCODE:
          authOptions.accessControl = Keychain.ACCESS_CONTROL.DEVICE_PASSCODE;
          await metrics.addTraitsToUser({
            [UserProfileProperty.AUTHENTICATION_TYPE]:
              AUTHENTICATION_TYPE.PASSCODE,
          });
          break;
        case SecureKeychainModule.TYPES.REMEMBER_ME:
          await metrics.addTraitsToUser({
            [UserProfileProperty.AUTHENTICATION_TYPE]:
              AUTHENTICATION_TYPE.REMEMBER_ME,
          });
          break;
        default:
          throw new Error(`Invalid authentication type: ${type}`);
      }

      const encryptedPassword = await instance.encryptPassword(password);
      await Keychain.setGenericPassword('metamask-user', encryptedPassword, {
        ...defaultOptions,
        ...authOptions,
      });

      await this.updateStorageForAuthType(type);

      // If the user enables biometrics on iOS, we're trying to read the password
      // immediately so we get the permission prompt
      if (
        type === SecureKeychainModule.TYPES.BIOMETRICS &&
        Platform.OS === 'ios'
      ) {
        try {
          await this.getGenericPassword();
        } catch (error) {
          console.warn(
            'Failed to get generic password after setting biometrics:',
            error,
          );
          // Don't throw here, as the password was successfully set
        }
      }
    } catch (error) {
      console.error('Error setting generic password:', error);
      if (error instanceof Error) {
        if (error.message.includes('Invalid authentication type')) {
          throw error; // Rethrow invalid authentication type error
        }
        if (type === SecureKeychainModule.TYPES.BIOMETRICS) {
          throw new Error(`Failed to set biometric password: ${error.message}`);
        }
        throw new Error(`Failed to set generic password: ${error.message}`);
      } else {
        throw new Error('Failed to set generic password: Unknown error');
      }
    }
  },

  async updateStorageForAuthType(type: string): Promise<void> {
    switch (type) {
      case SecureKeychainModule.TYPES.BIOMETRICS:
        await StorageWrapper.setItem(BIOMETRY_CHOICE, TRUE);
        await StorageWrapper.setItem(PASSCODE_DISABLED, TRUE);
        await StorageWrapper.removeItem(PASSCODE_CHOICE);
        await StorageWrapper.removeItem(BIOMETRY_CHOICE_DISABLED);
        break;
      case SecureKeychainModule.TYPES.PASSCODE:
        await StorageWrapper.removeItem(BIOMETRY_CHOICE);
        await StorageWrapper.removeItem(PASSCODE_DISABLED);
        await StorageWrapper.setItem(PASSCODE_CHOICE, TRUE);
        await StorageWrapper.setItem(BIOMETRY_CHOICE_DISABLED, TRUE);
        break;
      case SecureKeychainModule.TYPES.REMEMBER_ME:
        await StorageWrapper.removeItem(BIOMETRY_CHOICE);
        await StorageWrapper.setItem(PASSCODE_DISABLED, TRUE);
        await StorageWrapper.removeItem(PASSCODE_CHOICE);
        await StorageWrapper.setItem(BIOMETRY_CHOICE_DISABLED, TRUE);
        break;
    }
  },

  ACCESS_CONTROL: Keychain.ACCESS_CONTROL,
  ACCESSIBLE: Keychain.ACCESSIBLE,
  AUTHENTICATION_TYPE: Keychain.AUTHENTICATION_TYPE,
  TYPES: {
    BIOMETRICS: 'BIOMETRICS',
    PASSCODE: 'PASSCODE',
    REMEMBER_ME: 'REMEMBER_ME',
  },
} as const;

export default SecureKeychainModule;
