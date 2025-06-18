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

/**
 * Class that wraps Keychain from react-native-keychain
 * abstracting metamask specific functionality and settings
 * and also adding an extra layer of encryption before writing into
 * the phone's keychain
 */
class SecureKeychain {
  isAuthenticating = false;

  constructor(code) {
    if (!SecureKeychain.instance) {
      privates.set(this, { code });
      SecureKeychain.instance = this;
    }

    return SecureKeychain.instance;
  }

  encryptPassword(password) {
    return encryptor.encrypt(privates.get(this).code, { password });
  }

  decryptPassword(str) {
    return encryptor.decrypt(privates.get(this).code, str);
  }
}
let instance;

export default {
  init(salt) {
    instance = new SecureKeychain(salt);

    if (Device.isAndroid && Keychain.SECURITY_LEVEL?.SECURE_HARDWARE)
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
    const keychainAccessStart = Date.now();
    const options = {
      service: defaultOptions.service,
      authenticationPrompt: defaultOptions.authenticationPrompt,
      showModal: true,
      kLocalizedFallbackTitle: '',
    };

    // Wrap the operation based on authentication type
    if (this.getType() === AUTHENTICATION_TYPE.BIOMETRIC) {
      options.accessControl =
        Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE;
    } else if (this.getType() === AUTHENTICATION_TYPE.PASSCODE) {
      options.accessControl = Keychain.ACCESS_CONTROL.DEVICE_PASSCODE;
    }

    this.isAuthenticating = true;

    try {
      const credentials = await Keychain.getGenericPassword(options);
      const keychainAccessEnd = Date.now();
      console.log(`🧩 Secure keychain access time: ${keychainAccessEnd - keychainAccessStart}ms`);

      if (credentials && credentials.password !== '') {
        const decryptionStart = Date.now();
        const result = await this.decryptPassword(credentials.password);
        const decryptionEnd = Date.now();
        console.log(`🧩 Password decryption time: ${decryptionEnd - decryptionStart}ms`);
        
        return result;
      }

      return false;
    } catch (error) {
      throw error;
    } finally {
      this.isAuthenticating = false;
    }
  },

  async setGenericPassword(password, type) {
    const encryptionStart = Date.now();
    const encryptedPassword = await instance.encryptPassword(password);
    const encryptionEnd = Date.now();
    console.log(`🧩 Password encryption time: ${encryptionEnd - encryptionStart}ms`);

    let authOptions;
    const basicOptions = {
      service: defaultOptions.service,
    };

    switch (type) {
      case this.TYPES.BIOMETRICS:
        authOptions = {
          accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
          authenticationPrompt: defaultOptions.authenticationPrompt,
          authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRICS,
          ...basicOptions,
        };
        await StorageWrapper.setItem(BIOMETRY_CHOICE, TRUE);
        MetaMetrics.getInstance().trackEvent(
          MetricsEventBuilder.createEventBuilder(
            MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED,
          )
            .addProperties({
              [UserProfileProperty.AUTHENTICATION_TYPE]:
                AUTHENTICATION_TYPE.BIOMETRIC,
            })
            .build(),
        );
        break;

      case this.TYPES.PASSCODE:
        authOptions = {
          accessControl: Keychain.ACCESS_CONTROL.DEVICE_PASSCODE,
          authenticationPrompt: defaultOptions.authenticationPrompt,
          ...basicOptions,
        };
        await StorageWrapper.setItem(PASSCODE_CHOICE, TRUE);
        MetaMetrics.getInstance().trackEvent(
          MetricsEventBuilder.createEventBuilder(
            MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED,
          )
            .addProperties({
              [UserProfileProperty.AUTHENTICATION_TYPE]:
                AUTHENTICATION_TYPE.PASSCODE,
            })
            .build(),
        );
        break;

      case this.TYPES.REMEMBER_ME:
        authOptions = {
          ...basicOptions,
        };
        MetaMetrics.getInstance().trackEvent(
          MetricsEventBuilder.createEventBuilder(
            MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED,
          )
            .addProperties({
              [UserProfileProperty.AUTHENTICATION_TYPE]:
                AUTHENTICATION_TYPE.REMEMBER_ME,
            })
            .build(),
        );
        break;

      default:
        authOptions = {
          ...basicOptions,
        };
        MetaMetrics.getInstance().trackEvent(
          MetricsEventBuilder.createEventBuilder(
            MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED,
          )
            .addProperties({
              [UserProfileProperty.AUTHENTICATION_TYPE]:
                AUTHENTICATION_TYPE.PASSWORD,
            })
            .build(),
        );
        break;
    }

    const keychainStoreStart = Date.now();
    const result = await Keychain.setGenericPassword(
      'metamask-user',
      encryptedPassword,
      authOptions,
    );
    const keychainStoreEnd = Date.now();
    console.log(`🧩 Keychain storage time: ${keychainStoreEnd - keychainStoreStart}ms`);

    return result;
  },
  ACCESS_CONTROL: Keychain.ACCESS_CONTROL,
  ACCESSIBLE: Keychain.ACCESSIBLE,
  AUTHENTICATION_TYPE: Keychain.AUTHENTICATION_TYPE,
  TYPES: {
    BIOMETRICS: 'BIOMETRICS',
    PASSCODE: 'PASSCODE',
    REMEMBER_ME: 'REMEMBER_ME',
  },
};
