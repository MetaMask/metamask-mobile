import { wordlist } from '@metamask/scure-bip39/dist/wordlists/english';

export const SRP_LENGTHS = [12, 15, 18, 21, 24];
export const SPACE_CHAR = ' ';

/**
 * Check if a word is valid according to BIP39 wordlist
 */
export const checkValidSeedWord = (text: string): boolean =>
  wordlist.includes(text);

/**
 * Calculate trimmed seed phrase length (non-empty words)
 */
export const getTrimmedSeedPhraseLength = (seedPhrase: string[]): number =>
  seedPhrase.filter((word) => word.trim() !== '').length;

/**
 * Check if SRP continue button should be disabled
 */
export const isSRPLengthValid = (seedPhrase: string[]): boolean => {
  const length = getTrimmedSeedPhraseLength(seedPhrase);
  return SRP_LENGTHS.includes(length);
};

/**
 * Check if current input is the first (textarea mode)
 */
export const isFirstInput = (seedPhrase: string[]): boolean =>
  seedPhrase.length <= 1;

/**
 * Get input value based on whether it's the first input or not
 */
export const getInputValue = (
  isFirst: boolean,
  _index: number,
  item: string,
  seedPhrase: string[],
): string => {
  if (isFirst) {
    return seedPhrase?.[0] || '';
  }
  return item;
};
