import { KeyManager } from './key-manager';

describe('KeyManager', () => {
  let keyManager: KeyManager;

  beforeEach(() => {
    keyManager = new KeyManager();
  });

  it('should generate a valid key pair', () => {
    const keyPair = keyManager.generateKeyPair();

    expect(keyPair.privateKey).toBeInstanceOf(Uint8Array);
    expect(keyPair.publicKey).toBeInstanceOf(Uint8Array);
    expect(keyPair.privateKey.length).toBe(32);
    expect(keyPair.publicKey.length).toBe(33); // Compressed public key
  });

  it('should encrypt and decrypt a message successfully', async () => {
    const keyPair = keyManager.generateKeyPair();
    const originalMessage = 'This is a secret message.';

    // Test encrypt method
    const encryptedMessage = await keyManager.encrypt(
      originalMessage,
      keyPair.publicKey,
    );

    // Verify encryption produces a base64 string
    expect(encryptedMessage).toBeTruthy();
    expect(typeof encryptedMessage).toBe('string');

    // Test decrypt method
    const decryptedMessage = await keyManager.decrypt(
      encryptedMessage,
      keyPair.privateKey,
    );

    // Verify the round-trip encryption/decryption
    expect(decryptedMessage).toBe(originalMessage);
  });
});
