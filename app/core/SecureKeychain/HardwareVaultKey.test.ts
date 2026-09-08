import { NativeModules } from 'react-native';
import HardwareVaultKey, {
  isHardwareVaultBlob,
  type HardwareVaultBlob,
} from './HardwareVaultKey';

describe('HardwareVaultKey JS wrapper', () => {
  describe('isHardwareVaultBlob', () => {
    it('recognizes a valid android-keystore blob', () => {
      const blob: HardwareVaultBlob = {
        v: 1,
        alg: 'AES-GCM-256',
        ct: 'YWJj',
        iv: 'aXY',
        purpose: 'wallet-password',
        hw: 'android-keystore',
      };
      expect(isHardwareVaultBlob(JSON.stringify(blob))).toBe(true);
    });

    it('recognizes a valid ios-sep-keychain blob', () => {
      const blob: HardwareVaultBlob = {
        v: 1,
        alg: 'AES-GCM-256',
        ct: '',
        iv: '',
        purpose: 'secure-item',
        hw: 'ios-sep-keychain',
      };
      expect(isHardwareVaultBlob(JSON.stringify(blob))).toBe(true);
    });

    it('rejects a legacy foxCode blob (cipher/salt/lib format)', () => {
      const legacy = JSON.stringify({
        cipher: 'x',
        iv: 'y',
        salt: 'z',
        lib: 'original',
        keyMetadata: { algorithm: 'PBKDF2', params: { iterations: 5000 } },
      });
      expect(isHardwareVaultBlob(legacy)).toBe(false);
    });

    it('rejects non-JSON and non-string inputs', () => {
      expect(isHardwareVaultBlob('not json')).toBe(false);
      expect(isHardwareVaultBlob(null)).toBe(false);
      expect(isHardwareVaultBlob(undefined)).toBe(false);
      expect(isHardwareVaultBlob(42)).toBe(false);
    });

    it('rejects blobs with a wrong version or backend', () => {
      expect(
        isHardwareVaultBlob(
          JSON.stringify({
            v: 2,
            alg: 'AES-GCM-256',
            purpose: 'wallet-password',
            hw: 'android-keystore',
          }),
        ),
      ).toBe(false);
      expect(
        isHardwareVaultBlob(
          JSON.stringify({
            v: 1,
            alg: 'AES-GCM-256',
            purpose: 'wallet-password',
            hw: 'software',
          }),
        ),
      ).toBe(false);
    });
  });

  describe('isAvailable (native module absent)', () => {
    it('resolves false when the native module is not registered', async () => {
      // NativeModules.HardwareVaultKey is undefined in the Jest environment.
      delete (NativeModules as Record<string, unknown>).HardwareVaultKey;
      await expect(HardwareVaultKey.isAvailable()).resolves.toBe(false);
      await expect(HardwareVaultKey.getBackend()).resolves.toBe(null);
    });

    it('encrypt rejects when the native module is unavailable', async () => {
      delete (NativeModules as Record<string, unknown>).HardwareVaultKey;
      await expect(
        HardwareVaultKey.encrypt('wallet-password', 'secret'),
      ).rejects.toThrow('HardwareVaultKey native module unavailable');
    });
  });

  describe('isAvailable (native module present)', () => {
    beforeEach(() => {
      (NativeModules as Record<string, unknown>).HardwareVaultKey = {
        isAvailable: jest.fn().mockResolvedValue(true),
        getBackend: jest.fn().mockResolvedValue('android-keystore'),
        encrypt: jest
          .fn()
          .mockResolvedValue(JSON.stringify({ v: 1, hw: 'android-keystore' })),
        decrypt: jest.fn().mockResolvedValue('recovered-password'),
        clear: jest.fn().mockResolvedValue(true),
      };
    });

    it('delegates encrypt/decrypt/clear to the native module', async () => {
      const blob = await HardwareVaultKey.encrypt('wallet-password', 'secret');
      expect(NativeModules.HardwareVaultKey.encrypt).toHaveBeenCalledWith(
        'wallet-password',
        'secret',
      );
      expect(typeof blob).toBe('string');

      const plain = await HardwareVaultKey.decrypt('wallet-password', blob);
      expect(NativeModules.HardwareVaultKey.decrypt).toHaveBeenCalledWith(
        'wallet-password',
        blob,
      );
      expect(plain).toBe('recovered-password');

      await HardwareVaultKey.clear('wallet-password');
      expect(NativeModules.HardwareVaultKey.clear).toHaveBeenCalledWith(
        'wallet-password',
      );
    });

    it('isAvailable resolves false when the native module throws', async () => {
      (NativeModules as Record<string, { isAvailable: jest.Mock }>).HardwareVaultKey = {
        isAvailable: jest.fn().mockRejectedValue(new Error('boom')),
      };
      await expect(HardwareVaultKey.isAvailable()).resolves.toBe(false);
    });
  });
});
