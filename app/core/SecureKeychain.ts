import * as Keychain from 'react-native-keychain'; // eslint-disable-line import/no-namespace
import { Encryptor, LEGACY_DERIVATION_OPTIONS } from './Encryptor';
import { strings } from '../../locales/i18n';
import StorageWrapper from '../store/storage-wrapper';
import { Platform } from 'react-native';
import { MetaMetricsEvents, MetaMetrics } from './Analytics';
import {
  BIOMETRY_CHOICE,
  BIOMETRY_CHOICE_DISABLED,
  PASSCODE_CHOICE,
  PASSCODE_DISABLED,
  TRUE,
} from '../constants/storage';
import Device from '../util/device';

const privates = new WeakMap();
const encryptor = new Encryptor({
  keyDerivationOptions: LEGACY_DERIVATION_OPTIONS,
});
const defaultOptions = {
  service: 'com.metamask',
  authenticationPromptTitle: strings('authentication.auth_prompt_title'),
  authenticationPrompt: { title: strings('authentication.auth_prompt_desc') },
  authenticationPromptDesc: strings('authentication.auth_prompt_desc'),
  fingerprintPromptTitle: strings('authentication.fingerprint_prompt_title'),
  fingerprintPromptDesc: strings('authentication.fingerprint_prompt_desc'),
  fingerprintPromptCancel: strings('authentication.fingerprint_prompt_cancel'),
};
import AUTHENTICATION_TYPE from '../constants/userProperties';
import { UserProfileProperty } from '../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import { MetricsEventBuilder } from './Analytics/MetricsEventBuilder';

enum SecureKeychainTypes {
  BIOMETRICS = 'BIOMETRICS',
  PASSCODE = 'PASSCODE',
  REMEMBER_ME = 'REMEMBER_ME',
}

/**
 * Class that wraps Keychain from react-native-keychain
 * abstracting metamask specific functionality and settings
 * and also adding an extra layer of encryption before writing into
 * the phone's keychain
 */
class SecureKeychainEncryptor {
  isAuthenticating = false;
  private static instance: SecureKeychainEncryptor | null = null;

  private constructor(code: string) {
    privates.set(this, { code });
  }

  static getInstance(code: string): SecureKeychainEncryptor {
    SecureKeychainEncryptor.instance ??= new SecureKeychainEncryptor(code);
    return SecureKeychainEncryptor.instance;
  }

  encryptPassword(password: string) {
    return encryptor.encrypt(privates.get(this).code, { password });
  }

  decryptPassword(data: string): Promise<{
    password: string;
  }> {
    return encryptor.decrypt(privates.get(this).code, data) as Promise<{
      password: string;
    }>;
  }
}

let instance: SecureKeychainEncryptor;

const SecureKeychain = {
  init(salt: string) {
    instance = SecureKeychainEncryptor.getInstance(salt);

    if (Device.isAndroid() && Keychain.SECURITY_LEVEL?.SECURE_HARDWARE)
      MetaMetrics.getInstance().trackEvent(
        MetricsEventBuilder.createEventBuilder(
          MetaMetricsEvents.ANDROID_HARDWARE_KEYSTORE,
        ).build(),
      );

    Object.freeze(instance);
    return instance;
  },

  getInstance() {
    return instance;
  },

  getSupportedBiometryType() {
    return Keychain.getSupportedBiometryType();
  },

  /**
   * Clears all secure data for a specific scope
   * @param scopeOptions - Keychain options that define the scope to clear
   * @returns Promise that resolves when the scope is cleared
   */
  async clearSecureScope(scopeOptions: Keychain.Options) {
    return Keychain.resetGenericPassword(scopeOptions);
  },

  /**
   * Securely stores a key-value pair in the keychain with encryption
   * @param key - The key to store
   * @param value - The value to store (will be encrypted)
   * @param scopeOptions - Keychain options that define the storage scope
   * @returns Promise that resolves when the item is stored
   */
  async setSecureItem(
    key: string,
    value: string,
    scopeOptions: Keychain.Options,
  ) {
    const encryptedValue = await instance.encryptPassword(value);
    return Keychain.setGenericPassword(key, encryptedValue, scopeOptions);
  },

  /**
   * Retrieves and decrypts a secure item from the keychain
   * @param scopeOptions - Keychain options that define the scope to retrieve from
   * @returns Promise that resolves to an object with key and value, or null if not found
   */
  async getSecureItem(scopeOptions: Keychain.Options) {
    if (instance) {
      try {
        instance.isAuthenticating = true;
        const keychainObject = await Keychain.getGenericPassword(scopeOptions);
        if (keychainObject && keychainObject.password) {
          const encryptedValue = keychainObject.password;
          const decryptedValue = await instance.decryptPassword(encryptedValue);
          instance.isAuthenticating = false;

          return {
            key: keychainObject.username,
            value: decryptedValue.password,
          };
        }
        instance.isAuthenticating = false;
      } catch (error) {
        instance.isAuthenticating = false;
        throw new Error((error as Error).message);
      }
    }
    return null;
  },

  async resetGenericPassword() {
    const options = { service: defaultOptions.service };
    await StorageWrapper.removeItem(BIOMETRY_CHOICE);
    await StorageWrapper.removeItem(PASSCODE_CHOICE);
    // This is called to remove other auth types and set the user back to the default password login
    await MetaMetrics.getInstance().addTraitsToUser({
      [UserProfileProperty.AUTHENTICATION_TYPE]: AUTHENTICATION_TYPE.PASSWORD,
    });
    return Keychain.resetGenericPassword(options);
  },

  async getGenericPassword() {
    if (instance) {
      try {
        instance.isAuthenticating = true;
        const keychainObject = await Keychain.getGenericPassword(
          defaultOptions,
        );
        if (keychainObject && keychainObject.password) {
          const encryptedPassword = keychainObject.password;
          const decrypted = await instance.decryptPassword(encryptedPassword);
          keychainObject.password = decrypted.password;
          instance.isAuthenticating = false;
          return keychainObject;
        }
        instance.isAuthenticating = false;
      } catch (error) {
        instance.isAuthenticating = false;
        throw new Error((error as Error).message);
      }
    }
    return null;
  },

  async setGenericPassword(password: string, type?: SecureKeychainTypes) {
    const authOptions: Keychain.Options = {
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    };

    const metrics = MetaMetrics.getInstance();
    if (type === this.TYPES.BIOMETRICS) {
      authOptions.accessControl = Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET;

      await metrics.addTraitsToUser({
        [UserProfileProperty.AUTHENTICATION_TYPE]:
          AUTHENTICATION_TYPE.BIOMETRIC,
      });
    } else if (type === this.TYPES.PASSCODE) {
      authOptions.accessControl = Keychain.ACCESS_CONTROL.DEVICE_PASSCODE;
      await metrics.addTraitsToUser({
        [UserProfileProperty.AUTHENTICATION_TYPE]: AUTHENTICATION_TYPE.PASSCODE,
      });
    } else if (type === this.TYPES.REMEMBER_ME) {
      await metrics.addTraitsToUser({
        [UserProfileProperty.AUTHENTICATION_TYPE]:
          AUTHENTICATION_TYPE.REMEMBER_ME,
      });
      //Don't need to add any parameter
    } else {
      // Setting a password without a type does not save it
      return await this.resetGenericPassword();
    }

    const encryptedPassword = await instance.encryptPassword(password);
    await Keychain.setGenericPassword('metamask-user', encryptedPassword, {
      ...defaultOptions,
      ...authOptions,
    });

    if (type === this.TYPES.BIOMETRICS) {
      await StorageWrapper.setItem(BIOMETRY_CHOICE, TRUE);
      await StorageWrapper.setItem(PASSCODE_DISABLED, TRUE);
      await StorageWrapper.removeItem(PASSCODE_CHOICE);
      await StorageWrapper.removeItem(BIOMETRY_CHOICE_DISABLED);

      // If the user enables biometrics, we're trying to read the password
      // immediately so we get the permission prompt
      if (Platform.OS === 'ios') {
        try {
          await this.getGenericPassword();
        } catch (error) {
          // Specifically check for user cancellation
          if ((error as Error).message === 'User canceled the operation.') {
            // Store password without biometrics
            const encryptedPasswordWithoutBiometrics =
              await instance.encryptPassword(password);
            await Keychain.setGenericPassword(
              'metamask-user',
              encryptedPasswordWithoutBiometrics,
              {
                ...defaultOptions,
              },
            );

            // Update storage to reflect disabled biometrics
            await StorageWrapper.removeItem(BIOMETRY_CHOICE);
            await StorageWrapper.setItem(BIOMETRY_CHOICE_DISABLED, TRUE);

            // Update metrics
            await metrics.addTraitsToUser({
              [UserProfileProperty.AUTHENTICATION_TYPE]:
                AUTHENTICATION_TYPE.PASSWORD,
            });

            return;
          }
        }
      }
    } else if (type === this.TYPES.PASSCODE) {
      await StorageWrapper.removeItem(BIOMETRY_CHOICE);
      await StorageWrapper.removeItem(PASSCODE_DISABLED);
      await StorageWrapper.setItem(PASSCODE_CHOICE, TRUE);
      await StorageWrapper.setItem(BIOMETRY_CHOICE_DISABLED, TRUE);
    } else if (type === this.TYPES.REMEMBER_ME) {
      await StorageWrapper.removeItem(BIOMETRY_CHOICE);
      await StorageWrapper.setItem(PASSCODE_DISABLED, TRUE);
      await StorageWrapper.removeItem(PASSCODE_CHOICE);
      await StorageWrapper.setItem(BIOMETRY_CHOICE_DISABLED, TRUE);
      //Don't need to add any parameter
    }
  },

  ACCESS_CONTROL: Keychain.ACCESS_CONTROL,
  ACCESSIBLE: Keychain.ACCESSIBLE,
  AUTHENTICATION_TYPE: Keychain.AUTHENTICATION_TYPE,
  TYPES: SecureKeychainTypes,
};

export default SecureKeychain;
