import { Platform } from 'react-native';
import * as Keychain from 'react-native-keychain'; // eslint-disable-line import-x/no-namespace
import { Encryptor, LEGACY_DERIVATION_OPTIONS } from './Encryptor';
import { strings } from '../../locales/i18n';
import { MetaMetricsEvents } from './Analytics/MetaMetrics.events';
import { analytics } from '../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../util/analytics/AnalyticsEventBuilder';
import Device from '../util/device';
import AUTHENTICATION_TYPE from '../constants/userProperties';
import { UserProfileProperty } from '../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import HardwareVaultKey from './SecureKeychain/HardwareVaultKey';

interface SecureKeychainPrivateState {
  code: string;
  isAuthenticating: boolean;
}

const privates = new WeakMap<
  SecureKeychainEncryptor,
  SecureKeychainPrivateState
>();
const encryptor = new Encryptor({
  keyDerivationOptions: LEGACY_DERIVATION_OPTIONS,
});

/**
 * Reads the remote, version-gated `keychainHardwareVault` flag defensively.
 * Returns `false` if the store or selector is unavailable (e.g. in unit
 * tests or before the store is initialized), so callers fall back to the
 * legacy foxCode path rather than crashing.
 */
function isHardwareVaultFlagEnabled(): boolean {
  try {
    // Lazy require to avoid a module-load-time circular dependency between
    // the store/Engine graph and SecureKeychain.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const storeModule = require('../store');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { selectKeychainHardwareVaultEnabled } = require(
      '../selectors/featureFlagController/keychainHardwareVault',
    );
    const state = storeModule.store?.getState?.();
    if (!state) return false;
    return Boolean(selectKeychainHardwareVaultEnabled(state));
  } catch {
    return false;
  }
}

/**
 * True only when (a) the remote flag is enabled and (b) the native
 * hardware-backed primitive is present and reports availability.
 */
async function shouldUseHardwareVault(): Promise<boolean> {
  if (!isHardwareVaultFlagEnabled()) return false;
  return HardwareVaultKey.isAvailable();
}

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
  private static instance: SecureKeychainEncryptor | null = null;

  private constructor(code: string) {
    privates.set(this, { code, isAuthenticating: false });
  }

  get isAuthenticating(): boolean {
    return this.#getPrivateState().isAuthenticating;
  }

  set isAuthenticating(value: boolean) {
    this.#getPrivateState().isAuthenticating = value;
  }

  static getInstance(code: string): SecureKeychainEncryptor {
    SecureKeychainEncryptor.instance ??= new SecureKeychainEncryptor(code);
    return SecureKeychainEncryptor.instance;
  }

  encryptPassword(password: string) {
    return this.encryptPasswordWith(password);
  }

  /**
   * Encrypts the wallet password using the hardware vault when available,
   * otherwise the legacy foxCode path.
   */
  async encryptPasswordWith(password: string) {
    if (await shouldUseHardwareVault()) {
      return HardwareVaultKey.encrypt('wallet-password', password);
    }
    return encryptor.encrypt(this.#getPrivateState().code, { password });
  }

  decryptPassword(data: string): Promise<{
    password: string;
  }> {
    return this.decryptPasswordWith(data) as Promise<{
      password: string;
    }>;
  }

  /**
   * Decrypts a stored wallet-password blob. Detects the hardware-vault
   * format and dispatches accordingly; legacy foxCode blobs fall back to
   * the AES-CBC path (and are migrated lazily by the caller).
   */
  async decryptPasswordWith(data: string): Promise<{ password: string }> {
    if (HardwareVaultKey.isBlob(data)) {
      const password = await HardwareVaultKey.decrypt('wallet-password', data);
      return { password };
    }
    return encryptor.decrypt(this.#getPrivateState().code, data) as Promise<{
      password: string;
    }>;
  }

  /** Encrypts an arbitrary secure-item value. */
  async encryptSecureItem(value: string) {
    if (await shouldUseHardwareVault()) {
      return HardwareVaultKey.encrypt('secure-item', value);
    }
    // Legacy path stores secure items as { password: value } to match the
    // on-disk format of existing records (originally written via encryptPassword).
    return encryptor.encrypt(this.#getPrivateState().code, { password: value });
  }

  /** Decrypts an arbitrary secure-item value. */
  async decryptSecureItem(data: string): Promise<string> {
    if (HardwareVaultKey.isBlob(data)) {
      return HardwareVaultKey.decrypt('secure-item', data);
    }
    const decrypted = (await encryptor.decrypt(
      this.#getPrivateState().code,
      data,
    )) as { password: string };
    return decrypted.password;
  }

  #getPrivateState(): SecureKeychainPrivateState {
    const state = privates.get(this);
    if (!state) {
      throw new Error('SecureKeychainEncryptor private state is missing');
    }
    return state;
  }
}

let instance: SecureKeychainEncryptor;

const SecureKeychain = {
  init(salt: string) {
    instance = SecureKeychainEncryptor.getInstance(salt);

    if (Device.isAndroid() && Keychain.SECURITY_LEVEL?.SECURE_HARDWARE)
      analytics.trackEvent(
        AnalyticsEventBuilder.createEventBuilder(
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
   * Returns keychain options for a secure-item slot. Preserves the caller's
   * `scopeOptions` unchanged in the legacy path (matching prior behavior) and
   * only strips biometric `accessControl` when the hardware vault is active,
   * since the hardware vault already enforces biometric/passcode at the
   * enclave level and a second keychain-level gate would double-prompt.
   */
  async secureItemOptions(
    scopeOptions: Keychain.SetOptions,
  ): Promise<Keychain.SetOptions> {
    if (await shouldUseHardwareVault()) {
      const { accessControl: _omit, ...rest } = scopeOptions;
      return rest;
    }
    return scopeOptions;
  },

  /**
   * Returns keychain options for the wallet-password slot. In the legacy path
   * the keychain item's own biometric access control is the real auth gate. In
   * the hardware path, access control is omitted (the hardware vault enforces
   * auth) to avoid a double prompt.
   */
  async genericPasswordOptions(
    type?: AUTHENTICATION_TYPE,
  ): Promise<Keychain.SetOptions> {
    const options: Keychain.SetOptions = {
      ...defaultCredentialsOptions,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    };
    if (await shouldUseHardwareVault()) {
      return options;
    }
    if (
      type === AUTHENTICATION_TYPE.DEVICE_AUTHENTICATION ||
      type === AUTHENTICATION_TYPE.BIOMETRIC ||
      type === AUTHENTICATION_TYPE.PASSCODE
    ) {
      options.accessControl =
        Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE;
    }
    return options;
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
    const encryptedValue = await instance.encryptSecureItem(value);
    const options = await this.secureItemOptions(scopeOptions);
    return Keychain.setGenericPassword(key, encryptedValue, options);
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
          const decryptedValue = await instance.decryptSecureItem(
            encryptedValue,
          );
          instance.isAuthenticating = false;

          // Lazy atomic migration: when a legacy foxCode blob is read and the
          // hardware vault is now active, re-store it under the hardware path
          // before returning so subsequent reads are hardware-backed.
          if (
            !HardwareVaultKey.isBlob(encryptedValue) &&
            (await shouldUseHardwareVault())
          ) {
            await this.setSecureItem(
              keychainObject.username,
              decryptedValue,
              scopeOptions,
            );
          }

          return {
            key: keychainObject.username,
            value: decryptedValue,
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
    analytics.identify({
      [UserProfileProperty.AUTHENTICATION_TYPE]: AUTHENTICATION_TYPE.PASSWORD,
    });
    // Clear hardware-backed material for the wallet-password purpose so a
    // logout cannot leave an orphaned hardware record that survives reset.
    await HardwareVaultKey.clear('wallet-password');
    return Keychain.resetGenericPassword(options);
  },

  async getGenericPassword() {
    if (instance) {
      try {
        instance.isAuthenticating = true;
        const hardwareActive = await shouldUseHardwareVault();
        const keychainObject = await Keychain.getGenericPassword({
          ...defaultCredentialsOptions,
          // Access control is only used by Android when requesting device authentication.
          // For iOS, the access control is derived from the access control when the password was stored.
          // Omit it when the hardware vault is active to avoid a double biometric prompt;
          // the hardware vault enforces auth at the enclave level.
          accessControl:
            Platform.OS === 'android' && !hardwareActive
              ? Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE
              : undefined,
        });
        if (keychainObject && keychainObject.password) {
          const encryptedPassword = keychainObject.password;
          const decrypted = await instance.decryptPassword(encryptedPassword);
          keychainObject.password = decrypted.password;
          instance.isAuthenticating = false;

          // Lazy atomic migration: re-store under the hardware vault when a
          // legacy foxCode blob was read and the hardware path is now active.
          if (
            !HardwareVaultKey.isBlob(encryptedPassword) &&
            (await shouldUseHardwareVault())
          ) {
            await this.setGenericPassword(
              decrypted.password,
              AUTHENTICATION_TYPE.DEVICE_AUTHENTICATION,
            );
          }

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
    // TODO: Remove biometric and passcode types once we have removed the legacy authentication types
    if (
      type === AUTHENTICATION_TYPE.DEVICE_AUTHENTICATION ||
      type === AUTHENTICATION_TYPE.BIOMETRIC ||
      type === AUTHENTICATION_TYPE.PASSCODE
    ) {
      analytics.identify({
        [UserProfileProperty.AUTHENTICATION_TYPE]:
          AUTHENTICATION_TYPE.DEVICE_AUTHENTICATION,
      });

      const encryptedPassword = await instance.encryptPassword(password);
      const options = await this.genericPasswordOptions(type);

      return await Keychain.setGenericPassword(
        'metamask-user',
        encryptedPassword,
        options,
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
