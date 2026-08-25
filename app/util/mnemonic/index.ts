/**
 * Fisher–Yates shuffle (does not mutate the input).
 *
 * @see https://javascript.info/array-methods#shuffle-an-array
 *
 * @param array - Array to shuffle.
 * @returns A new shuffled array.
 */
export const shuffle = <T>(array: T[]): T[] => {
  const shuffledArray = [...array];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    // Swap elements.
    [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
  }
  return shuffledArray;
};

const SRP_GRID_ROW_COUNT = 4;
const SRP_GRID_COLUMN_COUNT = 3;
const DEFAULT_MISSING_WORD_COUNT = 3;
const UNIQUE_MISSING_WORD_MAX_ATTEMPTS = 50;

/**
 * Picks grid indexes whose seed words will be removed for SRP confirmation.
 *
 * BIP-39 allows the same word more than once in a phrase. The confirmation UI
 * must still show distinct button labels, so selected words are required to be
 * unique. Retries the existing row/column sampling until they are; falls back
 * to a unique-word scan if random attempts keep colliding.
 *
 * @param words - Full seed phrase as an ordered word list (typically 12).
 * @param missingCount - Number of words to remove (default 3).
 * @returns Indexes into `words` for the empty confirmation slots.
 */
export const pickUniqueMissingWordSlots = (
  words: string[],
  missingCount: number = DEFAULT_MISSING_WORD_COUNT,
): number[] => {
  if (!words.length || missingCount <= 0) {
    return [];
  }

  const count = Math.min(missingCount, words.length);

  for (let attempt = 0; attempt < UNIQUE_MISSING_WORD_MAX_ATTEMPTS; attempt++) {
    const selectedRows = shuffle(
      Array.from({ length: SRP_GRID_ROW_COUNT }, (_, row) => row),
    ).slice(0, count);
    const emptySlotsIndexes = selectedRows.map((row) => {
      const col = Math.floor(Math.random() * SRP_GRID_COLUMN_COUNT);
      return row * SRP_GRID_COLUMN_COUNT + col;
    });
    const removedWords = emptySlotsIndexes.map((index) => words[index]);
    if (new Set(removedWords).size === removedWords.length) {
      return emptySlotsIndexes;
    }
  }

  const selected: number[] = [];
  const usedWords = new Set<string>();
  for (const index of shuffle(
    Array.from({ length: words.length }, (_, i) => i),
  )) {
    const word = words[index];
    if (usedWords.has(word)) {
      continue;
    }
    usedWords.add(word);
    selected.push(index);
    if (selected.length === count) {
      return selected;
    }
  }

  return Array.from({ length: count }, (_, i) => i);
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
