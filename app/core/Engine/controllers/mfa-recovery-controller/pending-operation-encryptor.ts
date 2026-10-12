import type {
  PendingOperation,
  PendingOperationEncryptor,
} from '@metamask/mfa-recovery-controller';
import type { Json } from '@metamask/utils';
import type { EncryptionResult } from '../../../Encryptor/types';

interface KeyringPendingOperationEncryptorOptions {
  exportEncryptionKey: () => Promise<string>;
}

/**
 * Encrypts controller pending state with the wallet vault encryption key.
 */
export function createKeyringPendingOperationEncryptor({
  exportEncryptionKey,
}: KeyringPendingOperationEncryptorOptions): PendingOperationEncryptor {
  const encryptorPromise = import('../../../Encryptor').then(
    ({ Encryptor, LEGACY_DERIVATION_OPTIONS }) =>
      new Encryptor({
        keyDerivationOptions: LEGACY_DERIVATION_OPTIONS,
      }),
  );

  const importCurrentKey = async () =>
    await (await encryptorPromise).importKey(await exportEncryptionKey());

  return {
    async encrypt(operation: PendingOperation): Promise<string> {
      const key = await importCurrentKey();
      const encrypted = await (
        await encryptorPromise
      ).encryptWithKey(key, operation as unknown as Json);
      return JSON.stringify(encrypted);
    },

    async decrypt(ciphertext: string): Promise<PendingOperation> {
      const key = await importCurrentKey();
      const payload = JSON.parse(ciphertext) as EncryptionResult;
      return (await (
        await encryptorPromise
      ).decryptWithKey(key, payload)) as PendingOperation;
    },
  };
}
