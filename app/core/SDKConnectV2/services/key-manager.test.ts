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

  it('should generate different key pairs each time', () => {
    const keyPair1 = keyManager.generateKeyPair();
    const keyPair2 = keyManager.generateKeyPair();

    // Convert to hex strings for comparison
    const privateKey1 = Buffer.from(keyPair1.privateKey).toString('hex');
    const privateKey2 = Buffer.from(keyPair2.privateKey).toString('hex');
    const publicKey1 = Buffer.from(keyPair1.publicKey).toString('hex');
    const publicKey2 = Buffer.from(keyPair2.publicKey).toString('hex');

    expect(privateKey1).not.toBe(privateKey2);
    expect(publicKey1).not.toBe(publicKey2);
  });

  it('should encrypt and decrypt a message successfully', async () => {
    const keyPair1 = keyManager.generateKeyPair();
    const originalMessage = 'This is a secret message.';
    const encryptedMessage = await keyManager.encrypt(
      originalMessage,
      keyPair1.publicKey,
    );
    const decryptedMessage = await keyManager.decrypt(
      encryptedMessage,
      keyPair1.privateKey,
    );

    expect(decryptedMessage).toBe(originalMessage);
  });

  it('should encrypt and decrypt messages with special characters', async () => {
    const keyPair = keyManager.generateKeyPair();
    const originalMessage = 'Special chars: 🚀 €$¥ ñáéíóú';
    const encryptedMessage = await keyManager.encrypt(
      originalMessage,
      keyPair.publicKey,
    );
    const decryptedMessage = await keyManager.decrypt(
      encryptedMessage,
      keyPair.privateKey,
    );

    expect(decryptedMessage).toBe(originalMessage);
  });

  it('should encrypt and decrypt empty string', async () => {
    const keyPair = keyManager.generateKeyPair();
    const originalMessage = '';
    const encryptedMessage = await keyManager.encrypt(
      originalMessage,
      keyPair.publicKey,
    );
    const decryptedMessage = await keyManager.decrypt(
      encryptedMessage,
      keyPair.privateKey,
    );

    expect(decryptedMessage).toBe(originalMessage);
  });

  it('should produce different encrypted messages for the same plaintext', async () => {
    const keyPair = keyManager.generateKeyPair();
    const originalMessage = 'Test message';
    const encryptedMessage1 = await keyManager.encrypt(
      originalMessage,
      keyPair.publicKey,
    );
    const encryptedMessage2 = await keyManager.encrypt(
      originalMessage,
      keyPair.publicKey,
    );

    // Encrypted messages should be different due to randomness
    expect(encryptedMessage1).not.toBe(encryptedMessage2);

    // But both should decrypt to the same message
    const decryptedMessage1 = await keyManager.decrypt(
      encryptedMessage1,
      keyPair.privateKey,
    );
    const decryptedMessage2 = await keyManager.decrypt(
      encryptedMessage2,
      keyPair.privateKey,
    );

    expect(decryptedMessage1).toBe(originalMessage);
    expect(decryptedMessage2).toBe(originalMessage);
  });

  it('should fail to decrypt with the wrong private key', async () => {
    const keyPair1 = keyManager.generateKeyPair();
    const keyPair2 = keyManager.generateKeyPair();
    const originalMessage = 'This is another secret message.';
    const encryptedMessage = await keyManager.encrypt(
      originalMessage,
      keyPair1.publicKey,
    );

    await expect(
      keyManager.decrypt(encryptedMessage, keyPair2.privateKey),
    ).rejects.toThrow();
  });

  it('should fail to decrypt invalid encrypted data', async () => {
    const keyPair = keyManager.generateKeyPair();
    const invalidEncryptedData = 'invalid-encrypted-data';

    await expect(
      keyManager.decrypt(invalidEncryptedData, keyPair.privateKey),
    ).rejects.toThrow();
  });

  it('should handle encryption with invalid public key', async () => {
    const invalidPublicKey = new Uint8Array(32); // Wrong size for public key
    const message = 'Test message';

    await expect(
      keyManager.encrypt(message, invalidPublicKey),
    ).rejects.toThrow();
  });

  it('should handle decryption with invalid private key', async () => {
    const keyPair = keyManager.generateKeyPair();
    const message = 'Test message';
    const encryptedMessage = await keyManager.encrypt(
      message,
      keyPair.publicKey,
    );

    const invalidPrivateKey = new Uint8Array(31); // Wrong size for private key

    await expect(
      keyManager.decrypt(encryptedMessage, invalidPrivateKey),
    ).rejects.toThrow();
  });
});
