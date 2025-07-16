export interface AesCryptoFormInputs {
  saltBytesCountInput: string;
  passwordInput: string;
  saltInputForEncryptionKey: string;
  dataInputForEncryption: string;
  passwordInputForEncryption: string;
  passwordInputForDecryption: string;
  encryptionKeyInputForEncryptionWithKey: string;
  dataInputForEncryptionWithKey: string;
  encryptionKeyInputForDecryptionWithKey: string;
}

export interface AesCryptoFormResponses {
  saltResponse: string;
  generateEncryptionKeyResponse: string;
  encryptionResponse: string;
  decryptionResponse: string;
  encryptionWithKeyResponse: string;
  decryptionWithKeyResponse: string;
}

export interface AesCryptoFormButtons {
  generateSaltButton: string;
  generateEncryptionKeyButton: string;
  encryptButton: string;
  decryptButton: string;
  encryptWithKeyButton: string;
  decryptWithKeyButton: string;
}

export const aesCryptoFormInputs: AesCryptoFormInputs = {
  saltBytesCountInput: 'salt-bytes-count-input',
  passwordInput: 'password-input',
  saltInputForEncryptionKey: 'salt-input-for-encryption-key',
  dataInputForEncryption: 'data-input-for-encryption',
  passwordInputForEncryption: 'password-input-for-encryption',
  passwordInputForDecryption: 'password-input-for-decryption',
  encryptionKeyInputForEncryptionWithKey:
    'encryption-key-input-for-encryption-with-key',
  dataInputForEncryptionWithKey: 'data-input-for-encryption-with-key',
  encryptionKeyInputForDecryptionWithKey:
    'encryption-key-input-for-decryption-with-key',
};

export const aesCryptoFormResponses: AesCryptoFormResponses = {
  saltResponse: 'salt-response',
  generateEncryptionKeyResponse: 'generate-encryption-key-response',
  encryptionResponse: 'encryption-response',
  decryptionResponse: 'decryption-response',
  encryptionWithKeyResponse: 'encryption-with-key-response',
  decryptionWithKeyResponse: 'decryption-with-key-response',
};

export const aesCryptoFormButtons: AesCryptoFormButtons = {
  generateSaltButton: 'generate-salt-button',
  generateEncryptionKeyButton: 'generate-encryption-key-button',
  encryptButton: 'encrypt-button',
  decryptButton: 'decrypt-button',
  encryptWithKeyButton: 'encrypt-with-key-button',
  decryptWithKeyButton: 'decrypt-with-key-button',
};

export const aesCryptoFormScrollIdentifier: string = 'aes-crypto-form-scroll';
export const accountAddress: string = 'account-address';
export const responseText: string = 'response-text';
