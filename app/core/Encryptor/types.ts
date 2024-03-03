export interface EncryptionResult {
  data: string;
  iv: string;
  salt?: string;
  lib?: string;
}
