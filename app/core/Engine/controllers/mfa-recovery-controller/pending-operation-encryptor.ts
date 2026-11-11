import type { PendingOperationEncryptor } from '@metamask/mfa-recovery-controller';
import {
  DERIVATION_OPTIONS_MINIMUM_OWASP2023,
  Encryptor,
} from '../../../Encryptor';
import type { EncryptionKey, EncryptionResult } from '../../../Encryptor/types';

/** The pending operation encryptor over the mobile Encryptor's key types. */
export type MobilePendingOperationEncryptor = PendingOperationEncryptor<
  EncryptionKey,
  EncryptionResult
>;

/**
 * Creates the encryptor the controller generates its `encryptionKey` with and
 * encrypts pending state under, configured like KeyringController's.
 */
export function createPendingOperationEncryptor(): MobilePendingOperationEncryptor {
  const encryptor = new Encryptor({
    keyDerivationOptions: DERIVATION_OPTIONS_MINIMUM_OWASP2023,
  });
  return {
    importKey: encryptor.importKey,
    exportKey: encryptor.exportKey,
    generateSalt: encryptor.generateSalt,
    encryptWithKey: encryptor.encryptWithKey,
    decryptWithKey: encryptor.decryptWithKey,
    // The controller types derivation options as `unknown`; the encryptor's
    // configured options apply instead.
    keyFromPassword: async (password, salt, exportable) =>
      await encryptor.keyFromPassword(password, salt, exportable),
  };
}
