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
 * Creates the encryptor the controller encrypts pending mutation state with,
 * configured like KeyringController's.
 */
export function createPendingOperationEncryptor(): MobilePendingOperationEncryptor {
  const encryptor = new Encryptor({
    keyDerivationOptions: DERIVATION_OPTIONS_MINIMUM_OWASP2023,
  });
  return {
    importKey: encryptor.importKey,
    encryptWithKey: encryptor.encryptWithKey,
    decryptWithKey: encryptor.decryptWithKey,
  };
}

/**
 * Returns a getter for the serialized key that encrypts pending mutations.
 * The key lives only in this process: recovery reads never persist a pending
 * mutation, and mutations are not run by the wallet yet.
 */
export function createPendingOperationKeyGetter(): () => Promise<
  string | null
> {
  const encryptor = new Encryptor({
    keyDerivationOptions: DERIVATION_OPTIONS_MINIMUM_OWASP2023,
  });
  let serializedKey: string | null = null;

  return async () => {
    if (serializedKey) {
      return serializedKey;
    }
    const key = await encryptor.keyFromPassword(
      encryptor.generateSalt(),
      encryptor.generateSalt(),
      true,
    );
    serializedKey = await encryptor.exportKey(key);
    return serializedKey;
  };
}
