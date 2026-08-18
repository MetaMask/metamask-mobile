/**
 * MultichainAccountService historically used
 * "This mnemonic has already been imported." and now throws
 * "This Secret Recovery Phrase has already been imported."
 */
export const DUPLICATE_MNEMONIC_ERROR_MESSAGES = [
  'This mnemonic has already been imported.',
  'This Secret Recovery Phrase has already been imported.',
] as const;

export const isDuplicateMnemonicError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  return DUPLICATE_MNEMONIC_ERROR_MESSAGES.some(
    (knownMessage) => knownMessage === error.message,
  );
};
