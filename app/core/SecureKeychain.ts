import { Platform } from 'react-native';
import * as Keychain from 'react-native-keychain'; // eslint-disable-line import/no-namespace
import { Encryptor, LEGACY_DERIVATION_OPTIONS } from './Encryptor';
import { strings } from '../../locales/i18n';
import { MetaMetricsEvents, MetaMetrics } from './Analytics';
import Device from '../util/device';
import AUTHENTICATION_TYPE from '../constants/userProperties';
import { UserProfileProperty } from '../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import { MetricsEventBuilder } from './Analytics/MetricsEventBuilder';

const privates = new WeakMap();
const encryptor = new Encryptor({
  keyDerivationOptions: LEGACY_DERIVATION_OPTIONS,
});
// Default options used for storing credentials in the keychain
// Do not re-use for other scopes unless you know what you are doing
const defaultCredentialsOptions: Keychain.SetOptions = {
  service: 'com.metamask',
  authenticationPrompt: { title: strings('authentication.auth_prompt_desc') },
};

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
  async clearSecureScope(scopeOptions: Keychain.SetOptions) {
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
    scopeOptions: Keychain.SetOptions,
  ) {
    const encryptedValue = await instance.encryptPassword(value);
    return Keychain.setGenericPassword(key, encryptedValue, scopeOptions);
  },

  /**
   * Retrieves and decrypts a secure item from the keychain
   * @param scopeOptions - Keychain options that define the scope to retrieve from
   * @returns Promise that resolves to an object with key and value, or null if not found
   */
  async getSecureItem(scopeOptions: Keychain.SetOptions) {
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
    const options = { service: defaultCredentialsOptions.service };
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
        const keychainObject = await Keychain.getGenericPassword({
          ...defaultCredentialsOptions,
          // Access control is only used by Android when requesting device authentication
          // For iOS, the access control is derived from the access control when the password was stored
          accessControl:
            Platform.OS === 'android'
              ? Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE
              : undefined,
        });
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

  async setGenericPassword(password: string, type?: AUTHENTICATION_TYPE) {
    const authOptions: Keychain.SetOptions = {
      // Keychain is accessible only when device is unlocked
      // Items with this accessible level will not migrate to a new device
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    };

    const metrics = MetaMetrics.getInstance();
    // TODO: Remove biometric and passcode types once we have removed the legacy authentication types
    if (
      type === AUTHENTICATION_TYPE.DEVICE_AUTHENTICATION ||
      type === AUTHENTICATION_TYPE.BIOMETRIC ||
      type === AUTHENTICATION_TYPE.PASSCODE
    ) {
      authOptions.accessControl =
        Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE;

      await metrics.addTraitsToUser({
        [UserProfileProperty.AUTHENTICATION_TYPE]:
          AUTHENTICATION_TYPE.DEVICE_AUTHENTICATION,
      });

      const encryptedPassword = await instance.encryptPassword(password);

      return await Keychain.setGenericPassword(
        'metamask-user',
        encryptedPassword,
        {
          ...defaultCredentialsOptions,
          ...authOptions,
        },
      );
    }

    // Reset password if no type is provided
    // Ex. Password auth type does not store anything in the keychain
    return await this.resetGenericPassword();
  },

  ACCESS_CONTROL: Keychain.ACCESS_CONTROL,
  ACCESSIBLE: Keychain.ACCESSIBLE,
  AUTHENTICATION_TYPE: Keychain.AUTHENTICATION_TYPE,
  TYPES: SecureKeychainTypes,
};

export default SecureKeychain;
