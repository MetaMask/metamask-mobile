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

/**
 * Converts a BIP-39 mnemonic stored as indices of words in the English wordlist to a buffer of Unicode code points.
 *
 * @param wordlistIndices - Indices to specific words in the BIP-39 English wordlist.
 * @param wordlist - BIP-39 wordlist.
 * @returns The BIP-39 mnemonic formed from the words in the English wordlist, encoded as a list of Unicode code points.
 */
export const convertEnglishWordlistIndicesToCodepoints = (
  wordlistIndices: Uint8Array,
  wordlist: string[],
): Buffer => Buffer.from(uint8ArrayToMnemonic(wordlistIndices, wordlist));

/**
 * Encodes a BIP-39 mnemonic as the indices of words in the English BIP-39 wordlist.
 *
 * @param mnemonic - The BIP-39 mnemonic.
 * @param wordlist - BIP-39 wordlist.
 * @returns The Unicode code points for the seed phrase formed from the words in the wordlist.
 */
export const convertMnemonicToWordlistIndices = (
  mnemonic: Buffer,
  wordlist: string[],
): Uint8Array => {
  const indices = mnemonic
    .toString()
    .split(' ')
    .map((word) => wordlist.indexOf(word));
  return new Uint8Array(new Uint16Array(indices).buffer);
};
