/**
 * Method to shuffles an array of string.
 *
 * The previous method was replaced according to the following tutorial.
 * https://javascript.info/array-methods#shuffle-an-array
 *
 * @param array - Array of string.
 * @returns Array of string.
 */

export const shuffle = (array: string[]): string[] => {
  const shuffledArray = [...array];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    // Swap elements.
    [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
  }
  return shuffledArray;
};

/**
 * Compare two mnemonics arrays.
 * @param validMnemonic - Array of string with the correct SRP.
 * @param input - Array of string with the user's input.
 * @returns Boolean indicating with the input matches the valid SRP.
 */
export const compareMnemonics = (
  validMnemonic: string[],
  input: string[],
): boolean => validMnemonic.join('') === input.join('');

/**
 * Transform a typed array containing mnemonic data to the seed phrase.
 * @param uint8Array - Typed array containing mnemonic data.
 * @param wordlist - BIP-39 wordlist.
 * @returns The seed phrase.
 */
export const uint8ArrayToMnemonic = (
  uint8Array: Uint8Array,
  wordlist: string[],
): string => {
  if (uint8Array.length === 0) {
    throw new Error(
      'The method uint8ArrayToMnemonic expects a non-empty array',
    );
  }

  const recoveredIndices = Array.from(
    new Uint16Array(new Uint8Array(uint8Array).buffer),
  );

  return recoveredIndices.map((i) => wordlist[i]).join(' ');
};

import { wordlist } from '@metamask/scure-bip39/dist/wordlists/english';

/**
 * Checks if a word is a valid BIP-39 English seed word.
 * @param word - The word to check.
 * @returns True if valid, false otherwise.
 */
export const checkValidSeedWord = (word: string): boolean =>
  wordlist.includes(word);

/**
 * Generate an array of unique random numbers within a range.
 * @param min - Minimum value (inclusive).
 * @param max - Maximum value (inclusive).
 * @param count - Number of unique random numbers to generate.
 * @returns Array of unique random numbers.
 */
export const generateRandomNumbers = (
  min: number,
  max: number,
  count: number,
): number[] => {
  const numbers: number[] = [];
  const availableNumbers = Array.from(
    { length: max - min + 1 },
    (_, i) => i + min,
  );
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * availableNumbers.length);
    numbers.push(availableNumbers[randomIndex]);
    availableNumbers.splice(randomIndex, 1); // Remove to avoid duplicates
  }
  return numbers;
};

/**
 * Type for mapping seed phrase word indexes to error states.
 */
export type SeedPhraseErrorIndexes = Record<number, boolean>;
