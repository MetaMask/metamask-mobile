export interface KeyParams {
  iterations: number;
}

export interface KeyDerivationOptions {
  algorithm: string;
  params: KeyParams;
}

export interface EncryptionResult {
  data: string;
  iv: string;
  salt?: string;
  lib?: string;
  keyMetadata?: KeyDerivationOptions;
}
