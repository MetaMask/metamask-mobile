/* eslint-disable import/no-nodejs-modules */
import crypto from 'crypto';
import { Buffer } from 'buffer';

/**
 * Class that exposes methods to generate and compute
 * Elliptic Curve Diffie-Hellman (ECDH) for key exchange
 *
 * It also exposes encryption/decryption methods that are used
 * by the WebRTC communication layer to encrypt/decrypt in/out data
 * The encryption/decryption is made using a symmetric key coming from the ECDH key exchange
 */
export default class ECDH {
  ecdh: any; // ecdh instance

  secretKey = ''; // symmetric secret key

  secretKeyHash = ''; // 256b hash of the symmetric secret key to use for encryption/decryption

  /**
   * Creates ECDH instance
   *
   * @returns - generates an ECDH instance
   */
  generateECDH(): void {
    this.ecdh = crypto.createECDH('secp256k1');
    this.ecdh.generateKeys();
  }

  /**
   * Generates ECDH key pair and
   * returns public key
   *
   * @returns - public key in base64 format
   */
  getPublicKey(): string {
    return this.ecdh.getPublicKey().toString('base64');
  }

  /**
   * Computes the secret key by using the received public key
   *
   * @param {string} otherPublicKey - ECDH key received in base64 format
   * @returns - secret key in hex
   */
  computeECDHSecret(otherPublicKey: string) {
    this.secretKey = this.ecdh.computeSecret(otherPublicKey, 'base64', 'hex');
    this.secretKeyHash = crypto
      .createHash('sha256')
      .update(this.secretKey)
      .digest('hex');
  }

  /**
   * Encrypts a data message using the secret key
   * with Authentication and IV (initialisation vector)
   *
   * @param {string} data - data string to be encrypted
   * @returns - encrypted string in base64
   */
  encryptAuthIV(data: string): string {
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(
      'aes-256-gcm',
      Buffer.from(this.secretKeyHash, 'hex'),
      iv,
    );

    let encryptedData = cipher.update(data, 'utf8', 'hex');
    encryptedData += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');

    const payload = iv.toString('hex') + encryptedData + authTag;
    const payload64 = Buffer.from(payload, 'hex').toString('base64');

    return payload64;
  }

  /**
   * Decrypts a data message using the secret key
   * with Authentication and IV (initialisation vector)
   *
   * @param {string} encryptedData - base64 data string to be decrypted
   * @returns - decrypted data || error message
   */
  decryptAuthIV(encryptedData: string): string {
    const payload = Buffer.from(encryptedData, 'base64').toString('hex');

    const iv = payload.substr(0, 32);
    const encrypted = payload.substr(32, payload.length - 64);
    const authTag = payload.substr(payload.length - 32, 32);

    try {
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        Buffer.from(this.secretKeyHash, 'hex'),
        Buffer.from(iv, 'hex'),
      );

      decipher.setAuthTag(Buffer.from(authTag, 'hex'));

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error: any) {
      return error.message;
    }
  }
}
