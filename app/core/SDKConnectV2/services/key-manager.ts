import { IKeyManager, KeyPair } from '@metamask/mobile-wallet-protocol-core';
import { PrivateKey, PublicKey, encrypt, decrypt } from 'eciesjs';

export class KeyManager implements IKeyManager {
  generateKeyPair(): KeyPair {
    const privateKey = new PrivateKey();
    return {
      privateKey: new Uint8Array(privateKey.secret),
      publicKey: privateKey.publicKey.toBytes(true),
    };
  }

  validatePeerKey(key: Uint8Array): void {
    PublicKey.fromHex(Buffer.from(key).toString('hex'));
  }

  async encrypt(
    plaintext: string,
    theirPublicKey: Uint8Array,
  ): Promise<string> {
    const plaintextBuffer = Buffer.from(plaintext, 'utf8');
    const encryptedBuffer = encrypt(theirPublicKey, plaintextBuffer);
    return Buffer.from(encryptedBuffer).toString('base64');
  }

  async decrypt(
    encryptedB64: string,
    myPrivateKey: Uint8Array,
  ): Promise<string> {
    const encryptedBuffer = Buffer.from(encryptedB64, 'base64');
    const decryptedBuffer = decrypt(myPrivateKey, encryptedBuffer);
    return Buffer.from(decryptedBuffer).toString('utf8');
  }
}
