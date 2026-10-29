/** A native item was read, but its encrypted payload could not be decrypted. */
export class SecureKeychainDecryptionError extends Error {
  constructor() {
    super('Unable to decrypt secure item');
    this.name = 'SecureKeychainDecryptionError';
  }
}
