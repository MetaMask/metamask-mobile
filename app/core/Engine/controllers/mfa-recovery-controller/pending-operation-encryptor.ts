import type {
  PendingOperation,
  PendingOperationEncryptor,
} from '@metamask/mfa-recovery-controller';
import type { Json } from '@metamask/utils';
import {
  DERIVATION_OPTIONS_MINIMUM_OWASP2023,
  Encryptor,
} from '../../../Encryptor';
import type { EncryptionKey } from '../../../Encryptor/types';

/**
 * Creates the encryptor the controller encrypts pending mutation state with,
 * configured like KeyringController's. The key lives only in this process:
 * recovery reads never persist a pending mutation, and mutations are not run
 * by the wallet yet.
 */
export function createPendingOperationEncryptor(): PendingOperationEncryptor {
  const encryptor = new Encryptor({
    keyDerivationOptions: DERIVATION_OPTIONS_MINIMUM_OWASP2023,
  });
  let key: Promise<EncryptionKey> | undefined;
  const getKey = () =>
    (key ??= encryptor.keyFromPassword(
      encryptor.generateSalt(),
      encryptor.generateSalt(),
    ));

  return {
    encrypt: async (operation) =>
      JSON.stringify(
        await encryptor.encryptWithKey(
          await getKey(),
          operation as unknown as Json,
        ),
      ),
    decrypt: async (ciphertext) =>
      (await encryptor.decryptWithKey(
        await getKey(),
        JSON.parse(ciphertext),
      )) as PendingOperation,
  };
}
