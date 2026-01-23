/* eslint-disable import/no-nodejs-modules */
import { Buffer } from 'buffer';
import crypto from 'crypto';

/**
 * Generates a random salt for encryption purposes.
 *
 * @param {number} byteCount - The number of bytes to generate.
 * @returns {string} - The generated salt.
 */

function generateSalt(byteCount = 32) {
  const view = crypto.randomBytes(byteCount);

  return Buffer.from(view).toString('base64');
}

/**
 * Encrypts a vault object using AES-256-CBC encryption with a password.
 *
 * @param {Object} vault - The vault object to encrypt.
 * @param {string} [password='123123123'] - The password used for encryption.
 * @returns {string} - The encrypted vault as a JSON string.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function encryptVault(vault: any, password = '123123123') {
  const salt = generateSalt(16);
  const passBuffer = Buffer.from(password, 'utf-8');
  // Parse base 64 string as utf-8 because mobile encryptor is flawed.
  const saltBuffer = Buffer.from(salt, 'utf-8');
  const iv = crypto.randomBytes(16);

  // Derive key using PBKDF2
  const derivedKey = crypto.pbkdf2Sync(
    passBuffer,
    saltBuffer,
    5000,
    32,
    'sha512',
  );

  const json = JSON.stringify(vault);
  const buffer = Buffer.from(json, 'utf-8');

  // Encrypt using AES-256-CBC
  const cipher = crypto.createCipheriv('aes-256-cbc', derivedKey, iv);
  let encrypted = cipher.update(buffer);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  // Prepare the result object
  const result = {
    keyMetadata: { algorithm: 'PBKDF2', params: { iterations: 5000 } },
    lib: 'original',
    cipher: encrypted.toString('base64'),
    iv: iv.toString('hex'),
    salt,
  };

  // Convert the result to a JSON string
  return JSON.stringify(result);
}

/**
 * Decrypts a vault object that was encrypted using AES-256-CBC encryption with a password.
 *
 * @param {string} vault - The encrypted vault as a JSON string.
 * @param {string} [password='123123123'] - The password used for encryption.
 * @returns {Object} - The decrypted vault JSON object.
 */

export function decryptVault(vault: string, password = '123123123') {
  // 1. Parse vault inputs
  const vaultJson = JSON.parse(vault);
  const cipherText = Buffer.from(vaultJson.cipher, 'base64');
  const iv = Buffer.from(vaultJson.iv, 'hex');
  const salt = vaultJson.salt;

  // "flawed": interpret base64 string as UTF-8 bytes, not decoded
  const saltBuffer = Buffer.from(salt, 'utf-8');
  const passBuffer = Buffer.from(password, 'utf-8');

  // 2. Recreate PBKDF2 key
  const derivedKey = crypto.pbkdf2Sync(
    passBuffer,
    saltBuffer,
    5000,
    32,
    'sha512',
  );

  // 3. Decrypt
  const decipher = crypto.createDecipheriv('aes-256-cbc', derivedKey, iv);
  let decrypted = decipher.update(cipherText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  // 4. Convert back to string and parse JSON
  const decryptedText = decrypted.toString('utf-8');
  return JSON.parse(decryptedText);
}
