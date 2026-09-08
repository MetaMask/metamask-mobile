/**
 * HardwareVaultKey — JS wrapper over a native module that performs
 * per-install, hardware-backed, user-authenticated encryption of wallet
 * credentials.
 *
 * Threat model (see docs/security review): an attacker with the at-rest
 * keychain record AND the public app bundle must not be able to recover the
 * wallet password offline. The native key is non-extractable (Android Keystore
 * StrongBox/TEE, iOS Secure Enclave-protected Keychain) and decryption is
 * performed inside the hardware enclave, gated on biometric/device passcode.
 *
 * Degraded fallback: when no hardware-backed primitive is available the native
 * module reports `isAvailable() === false` and `SecureKeychain` falls back to
 * the legacy foxCode path (documented risk; see `SecureKeychain.ts`).
 *
 * The encrypted blob is bound to its `purpose` via AEAD additional
 * authenticated data (Android AES-GCM AAD) / a per-purpose keychain service
 * (iOS), so a blob for one scope cannot be replayed against another.
 */
import { NativeModules, Platform } from 'react-native';

export type HardwareVaultPurpose = 'wallet-password' | 'secure-item';

export type HardwareBackend = 'android-keystore' | 'ios-sep-keychain';

/**
 * Self-describing AEAD blob stored as the keychain item value.
 * - `v`: format version. Bump when the serialization changes.
 * - `alg`: cipher used by the native backend.
 * - `ct`: base64 ciphertext + GCM tag (Android). Empty on iOS, where the SEP Keychain item holds the secret.
 * - `iv`: base64 12-byte nonce (Android only).
 * - `purpose`: scope this blob is bound to (AAD / per-purpose service).
 * - `hw`: which native backend produced this blob.
 */
export interface HardwareVaultBlob {
  v: 1;
  alg: 'AES-GCM-256';
  ct: string;
  iv: string;
  purpose: HardwareVaultPurpose;
  hw: HardwareBackend;
}

const NATIVE_MODULE_NAME = 'HardwareVaultKey';

interface HardwareVaultKeyNative {
  isAvailable(): Promise<boolean>;
  getBackend(): Promise<HardwareBackend>;
  encrypt(purpose: HardwareVaultPurpose, plaintext: string): Promise<string>;
  decrypt(purpose: HardwareVaultPurpose, blob: string): Promise<string>;
  clear(purpose: HardwareVaultPurpose): Promise<boolean>;
}

function getNative(): HardwareVaultKeyNative | null {
  const mod = NativeModules[NATIVE_MODULE_NAME] as
    | HardwareVaultKeyNative
    | undefined;
  return mod ?? null;
}

/** True when the native module is present and reports a hardware backend. */
export async function isHardwareVaultAvailable(): Promise<boolean> {
  const n = getNative();
  if (!n) return false;
  try {
    return await n.isAvailable();
  } catch {
    return false;
  }
}

/** Returns the active backend, or null if the native module is unavailable. */
export async function getHardwareBackend(): Promise<HardwareBackend | null> {
  const n = getNative();
  if (!n) return null;
  try {
    return await n.getBackend();
  } catch {
    return null;
  }
}

/** Type guard for the hardware blob format. */
export function isHardwareVaultBlob(value: unknown): value is HardwareVaultBlob {
  if (typeof value !== 'string') return false;
  try {
    const parsed = JSON.parse(value) as Partial<HardwareVaultBlob>;
    return (
      parsed.v === 1 &&
      parsed.alg === 'AES-GCM-256' &&
      typeof parsed.purpose === 'string' &&
      (parsed.hw === 'android-keystore' || parsed.hw === 'ios-sep-keychain')
    );
  } catch {
    return false;
  }
}

/**
 * Encrypt a plaintext under the given purpose. Returns the serialized blob.
 * Resolves only when a hardware backend is available; callers must gate on
 * `isHardwareVaultAvailable()` before invoking.
 */
export async function hardwareEncrypt(
  purpose: HardwareVaultPurpose,
  plaintext: string,
): Promise<string> {
  const n = getNative();
  if (!n) {
    throw new Error('HardwareVaultKey native module unavailable');
  }
  return n.encrypt(purpose, plaintext);
}

/**
 * Decrypt a hardware blob under the given purpose. Triggers the platform
 * biometric/passcode prompt (BiometricPrompt.CryptoObject on Android,
 * LAContext-bound Keychain read on iOS). Rejects if the blob's purpose does
 * not match or authentication fails.
 */
export async function hardwareDecrypt(
  purpose: HardwareVaultPurpose,
  blob: string,
): Promise<string> {
  const n = getNative();
  if (!n) {
    throw new Error('HardwareVaultKey native module unavailable');
  }
  return n.decrypt(purpose, blob);
}

/** Remove the hardware-backed material for a purpose (used on logout/reset). */
export async function hardwareClear(
  purpose: HardwareVaultPurpose,
): Promise<boolean> {
  const n = getNative();
  if (!n) return false;
  try {
    return await n.clear(purpose);
  } catch {
    return false;
  }
}

export const HardwareVaultKey = {
  isAvailable: isHardwareVaultAvailable,
  getBackend: getHardwareBackend,
  encrypt: hardwareEncrypt,
  decrypt: hardwareDecrypt,
  clear: hardwareClear,
  isBlob: isHardwareVaultBlob,
};

export default HardwareVaultKey;
