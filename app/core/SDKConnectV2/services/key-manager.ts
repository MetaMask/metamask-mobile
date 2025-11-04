import { IKeyManager, KeyPair } from '@metamask/mobile-wallet-protocol-core';
import { PrivateKey, encrypt, decrypt } from 'eciesjs';

export class KeyManager implements IKeyManager {
  generateKeyPair(): KeyPair {
    const privateKey = new PrivateKey();
    return {
      privateKey: Uint8Array.from(privateKey.secret),
      publicKey: Uint8Array.from(privateKey.publicKey.compressed),
    };
  }

  async encrypt(
    plaintext: string,
    theirPublicKey: Uint8Array,
  ): Promise<string> {
    const plaintextBuffer = Buffer.from(plaintext, 'utf8');
    const theirPublicKeyBuffer = Buffer.from(theirPublicKey);
    const encryptedBuffer = encrypt(theirPublicKeyBuffer, plaintextBuffer);
    return encryptedBuffer.toString('base64');
  }

  async decrypt(
    encryptedB64: string,
    myPrivateKey: Uint8Array,
  ): Promise<string> {
    const encryptedBuffer = Buffer.from(encryptedB64, 'base64');
    const myPrivateKeyBuffer = Buffer.from(myPrivateKey);
    const decryptedBuffer = decrypt(myPrivateKeyBuffer, encryptedBuffer);
    return decryptedBuffer.toString('utf8');
  }
}
