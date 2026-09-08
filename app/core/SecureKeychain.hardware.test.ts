import SecureKeychain from './SecureKeychain';
import * as Keychain from 'react-native-keychain'; // eslint-disable-line import-x/no-namespace
import HardwareVaultKey from './SecureKeychain/HardwareVaultKey';
import AUTHENTICATION_TYPE from '../constants/userProperties';

jest.mock('../selectors/featureFlagController/keychainHardwareVault', () => ({
  selectKeychainHardwareVaultEnabled: jest.fn().mockReturnValue(true),
}));
jest.mock('../store', () => ({ store: { getState: () => ({}) } }));

// Mock the legacy Encryptor so the foxCode fallback / migration path is
// deterministic without performing real crypto.
jest.mock('./Encryptor', () => ({
  Encryptor: jest.fn().mockImplementation(() => ({
    encrypt: jest.fn().mockResolvedValue('legacy-encrypted'),
    decrypt: jest.fn().mockResolvedValue({ password: 'wallet-pw' }),
  })),
  LEGACY_DERIVATION_OPTIONS: { algorithm: 'PBKDF2', params: { iterations: 5000 } },
}));

// Mock the HardwareVaultKey wrapper. `isBlob` mirrors the real logic. Mock
// fns are created inside the factory to avoid jest hoisting/TDZ issues.
jest.mock('./SecureKeychain/HardwareVaultKey', () => {
  const isBlob = (value: unknown): boolean => {
    if (typeof value !== 'string') return false;
    try {
      const p = JSON.parse(value) as { v?: number; hw?: string; purpose?: string };
      return p.v === 1 && !!p.hw && !!p.purpose;
    } catch {
      return false;
    }
  };
  return {
    __esModule: true,
    default: {
      isAvailable: jest.fn().mockResolvedValue(true),
      getBackend: jest.fn().mockResolvedValue('android-keystore'),
      encrypt: jest.fn(),
      decrypt: jest.fn(),
      clear: jest.fn(),
      isBlob,
    },
    isHardwareVaultBlob: isBlob,
  };
});

jest.mock('../../locales/i18n', () => ({ strings: jest.fn((k: string) => k) }));
jest.mock('react-native-keychain', () => ({
  ACCESSIBLE: { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY' },
  ACCESS_CONTROL: {
    BIOMETRY_ANY_OR_DEVICE_PASSCODE: 'BIOMETRY_ANY_OR_DEVICE_PASSCODE',
    BIOMETRY_CURRENT_SET: 'BIOMETRY_CURRENT_SET',
    DEVICE_PASSCODE: 'DEVICE_PASSCODE',
  },
  SECURITY_LEVEL: { SECURE_HARDWARE: 'SECURE_HARDWARE' },
  setGenericPassword: jest.fn(),
  getGenericPassword: jest.fn(),
  resetGenericPassword: jest.fn(),
  getSupportedBiometryType: jest.fn(),
  STORAGE_TYPE: { AES_GCM: 'AES_GCM' },
}));
jest.mock('../util/device', () => ({ isAndroid: jest.fn().mockReturnValue(false) }));
jest.mock('../util/analytics/analytics', () => ({
  analytics: { identify: jest.fn(), trackEvent: jest.fn() },
}));
jest.mock('../util/analytics/AnalyticsEventBuilder', () => ({
  AnalyticsEventBuilder: {
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn(),
    })),
  },
}));

const HW_BLOB = JSON.stringify({
  v: 1, alg: 'AES-GCM-256', ct: 'Y3Q', iv: 'aXY',
  purpose: 'wallet-password', hw: 'android-keystore',
});
const hwEncrypt = HardwareVaultKey.encrypt as jest.Mock;
const hwDecrypt = HardwareVaultKey.decrypt as jest.Mock;
const hwClear = HardwareVaultKey.clear as jest.Mock;

describe('SecureKeychain — hardware vault path', () => {
  const walletPassword = 'wallet-pw';

  beforeEach(() => {
    jest.clearAllMocks();
    SecureKeychain.init('test_salt');
    hwEncrypt.mockResolvedValue(HW_BLOB);
    hwDecrypt.mockResolvedValue(walletPassword);
    hwClear.mockResolvedValue(true);
  });

  it('setGenericPassword stores a hardware blob with no accessControl', async () => {
    await SecureKeychain.setGenericPassword(
      walletPassword,
      AUTHENTICATION_TYPE.BIOMETRIC,
    );
    expect(hwEncrypt).toHaveBeenCalledWith('wallet-password', walletPassword);
    expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
      'metamask-user',
      HW_BLOB,
      expect.objectContaining({
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      }),
    );
    const options = (Keychain.setGenericPassword as jest.Mock).mock.calls[0][2];
    expect(options.accessControl).toBeUndefined();
  });

  it('getGenericPassword decrypts a hardware blob via HardwareVaultKey', async () => {
    (Keychain.getGenericPassword as jest.Mock).mockResolvedValue({
      username: 'metamask-user',
      password: HW_BLOB,
    });
    const result = await SecureKeychain.getGenericPassword();
    expect(hwDecrypt).toHaveBeenCalledWith('wallet-password', HW_BLOB);
    expect(result).toEqual({ username: 'metamask-user', password: walletPassword });
  });

  it('getGenericPassword lazily migrates a legacy foxCode blob to the hardware path', async () => {
    const legacyBlob = JSON.stringify({
      cipher: 'x', iv: 'y', salt: 'z', lib: 'original',
      keyMetadata: { algorithm: 'PBKDF2', params: { iterations: 5000 } },
    });
    (Keychain.getGenericPassword as jest.Mock).mockResolvedValue({
      username: 'metamask-user',
      password: legacyBlob,
    });
    const result = await SecureKeychain.getGenericPassword();
    expect(result).toEqual({ username: 'metamask-user', password: walletPassword });
    expect(hwEncrypt).toHaveBeenCalledWith('wallet-password', walletPassword);
    expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
      'metamask-user', HW_BLOB, expect.anything(),
    );
  });

  it('setSecureItem stores a hardware blob for the secure-item purpose', async () => {
    const secureBlob = JSON.stringify({
      v: 1, alg: 'AES-GCM-256', ct: 'Y3Q', iv: 'aXY',
      purpose: 'secure-item', hw: 'android-keystore',
    });
    hwEncrypt.mockResolvedValue(secureBlob);
    const scopeOptions = {
      service: 'com.metamask.test-service',
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    };
    await SecureKeychain.setSecureItem('test-key', 'plain', scopeOptions);
    expect(hwEncrypt).toHaveBeenCalledWith('secure-item', 'plain');
    const [, , options] = (Keychain.setGenericPassword as jest.Mock).mock.calls[0];
    expect(options.accessControl).toBeUndefined();
    expect(options.service).toBe('com.metamask.test-service');
  });

  it('resetGenericPassword clears hardware material for wallet-password', async () => {
    await SecureKeychain.resetGenericPassword();
    expect(hwClear).toHaveBeenCalledWith('wallet-password');
    expect(Keychain.resetGenericPassword).toHaveBeenCalled();
  });
});
