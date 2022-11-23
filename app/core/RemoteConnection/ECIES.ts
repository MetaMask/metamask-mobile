// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
// eslint-disable-next-line import/no-nodejs-modules
import { Buffer } from 'buffer';
import { encrypt, decrypt, PrivateKey } from 'eciesjs';

/**
 * Class that exposes methods to generate and compute
 * Elliptic Curve Integrated Encryption Scheme (ECIES) for key exchange and symmetric encryption/decryption
 *
 * It also exposes encryption/decryption methods that are used
 * by the communication layer to encrypt/decrypt in/out data
 * The encryption/decryption is made using a symmetric key generated from the ECIES key exchange
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default class ECIES {
  ecies: any;

  constructor() {
    this.ecies = null; // ECIES instance
  }

  /**
   * Creates ECIES instance
   *
   * @returns - Generates ECIES instance
   */
  generateECIES(): void {
    this.ecies = new PrivateKey();
  }

  /**
   * Returns ECIES instance public key
   *
   * @returns - public key in base64 format
   */
  getPublicKey(): string {
    return this.ecies.publicKey.toHex();
  }

  /**
   * Encrypts a data message using the public key of the side to encrypt data for
   *
   * @param {string} data - data string to be encrypted
   * @param {string} otherPublicKey - public key of the side to encrypt data for
   * @returns - encrypted string in base64
   */
  encrypt(data: string, otherPublicKey: string): string {
    const encryptedData = encrypt(otherPublicKey, Buffer.from(data));

    return Buffer.from(encryptedData).toString('base64');
  }

  /**
   * Decrypts a data message using the instance private key
   *
   * @param {string} encryptedData - base64 data string to be decrypted
   * @returns - decrypted data || error message
   */
  decrypt(encryptedData: string): string {
    const payload = Buffer.from(encryptedData, 'base64');

    try {
      const decrypted = decrypt(this.ecies.toHex(), payload);

      return decrypted.toString();
    } catch (error: any) {
      return error.message;
    }
  }
}
