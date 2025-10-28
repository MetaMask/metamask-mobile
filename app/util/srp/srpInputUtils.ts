import { Keyboard } from 'react-native';
import { wordlist } from '@metamask/scure-bip39/dist/wordlists/english';
import { isValidMnemonic } from '../validators';
import { formatSeedPhraseToSingleLine } from '../string';
import Logger from '../Logger';

export const SRP_LENGTHS = [12, 15, 18, 21, 24];
export const SPACE_CHAR = ' ';

/**
 * Check if a word is valid according to BIP39 wordlist
 */
export const checkValidSeedWord = (text: string): boolean =>
  wordlist.includes(text);

/**
 * Get or initialize the seed phrase input ref map
 */
export const getSeedPhraseInputRef = (
  currentRef: Map<number, { focus: () => void; blur: () => void }> | null,
): Map<number, { focus: () => void; blur: () => void }> => {
  if (!currentRef) {
    return new Map();
  }
  return currentRef;
};

/**
 * Calculate trimmed seed phrase length (non-empty words)
 */
export const getTrimmedSeedPhraseLength = (seedPhrase: string[]): number =>
  seedPhrase.filter((word) => word !== '').length;

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

/**
 * Check for word errors in seed phrase
 */
export const checkForWordErrors = (
  seedPhraseArr: string[],
): Record<number, boolean> => {
  const errorsMap: Record<number, boolean> = {};
  seedPhraseArr.forEach((word, index) => {
    const trimmedWord = word.trim();
    if (trimmedWord && !checkValidSeedWord(trimmedWord)) {
      errorsMap[index] = true;
    }
  });
  return errorsMap;
};

/**
 * Handle seed phrase change at a specific index (for grid mode)
 */
export const handleSeedPhraseChangeAtIndex = (
  seedPhraseText: string,
  index: number,
  currentSeedPhrase: string[],
  callbacks: {
    setSeedPhrase: (value: string[] | ((prev: string[]) => string[])) => void;
    setSeedPhraseInputFocusedIndex: (value: number | null) => void;
    setNextSeedPhraseInputFocusedIndex: (value: number | null) => void;
  },
): void => {
  try {
    const text = formatSeedPhraseToSingleLine(seedPhraseText);

    if (text.includes(SPACE_CHAR)) {
      const isEndWithSpace = text.at(-1) === SPACE_CHAR;
      const splitArray = text
        .trim()
        .split(' ')
        .filter((word) => word.trim() !== '');

      if (splitArray.length === 0) {
        callbacks.setSeedPhrase((prev) => {
          const newSeedPhrase = [...prev];
          newSeedPhrase[index] = '';
          return newSeedPhrase;
        });
        return;
      }

      const mergedSeedPhrase = [
        ...currentSeedPhrase.slice(0, index),
        ...splitArray,
        ...currentSeedPhrase.slice(index + 1),
      ];

      const normalizedWords = mergedSeedPhrase
        .map((w) => w.trim())
        .filter((w) => w !== '');
      const maxAllowed = Math.max(...SRP_LENGTHS);
      const hasReachedMax = normalizedWords.length >= maxAllowed;
      const isCompleteAndValid =
        SRP_LENGTHS.includes(normalizedWords.length) &&
        isValidMnemonic(normalizedWords.join(' '));

      let nextSeedPhraseState = normalizedWords;
      if (
        isEndWithSpace &&
        index === currentSeedPhrase.length - 1 &&
        !isCompleteAndValid &&
        !hasReachedMax
      ) {
        nextSeedPhraseState = [...normalizedWords, ''];
      }

      callbacks.setSeedPhrase(nextSeedPhraseState);

      if (isCompleteAndValid || hasReachedMax) {
        Keyboard.dismiss();
        callbacks.setSeedPhraseInputFocusedIndex(null);
        callbacks.setNextSeedPhraseInputFocusedIndex(null);
        return;
      }

      const targetIndex = Math.min(
        nextSeedPhraseState.length - 1,
        index + splitArray.length,
      );
      setTimeout(() => {
        callbacks.setNextSeedPhraseInputFocusedIndex(targetIndex);
      }, 0);
      return;
    }

    if (currentSeedPhrase[index] !== text) {
      callbacks.setSeedPhrase((prev) => {
        const newSeedPhrase = [...prev];
        newSeedPhrase[index] = text;
        return newSeedPhrase;
      });
    }
  } catch (err) {
    Logger.error(err as Error, 'Error handling seed phrase change');
  }
};

/**
 * Handle seed phrase change in first input (textarea mode)
 */
export const handleSeedPhraseChange = (
  seedPhraseText: string,
  _currentSeedPhrase: string[],
  callbacks: {
    setSeedPhrase: (value: string[] | ((prev: string[]) => string[])) => void;
    setSeedPhraseInputFocusedIndex: (value: number | null) => void;
    setNextSeedPhraseInputFocusedIndex: (value: number | null) => void;
    handleSeedPhraseChangeAtIndex: (text: string, index: number) => void;
    seedPhraseInputRefs?: Map<
      number,
      { focus: () => void; blur: () => void }
    > | null;
  },
): void => {
  const text = formatSeedPhraseToSingleLine(seedPhraseText);
  const trimmedText = text.trim();
  const updatedTrimmedText = trimmedText
    .split(' ')
    .filter((word) => word !== '');

  if (SRP_LENGTHS.includes(updatedTrimmedText.length)) {
    callbacks.setSeedPhrase(updatedTrimmedText);
  } else {
    callbacks.handleSeedPhraseChangeAtIndex(text, 0);
  }

  if (updatedTrimmedText.length > 1) {
    setTimeout(() => {
      callbacks.setSeedPhraseInputFocusedIndex(null);
      callbacks.setNextSeedPhraseInputFocusedIndex(null);
      callbacks.seedPhraseInputRefs?.get(0)?.blur();
      Keyboard.dismiss();
    }, 100);
  }
};

/**
 * Handle clear all seed phrase inputs
 */
export const handleClearSeedPhrase = (callbacks: {
  setSeedPhrase: (value: string[]) => void;
  setErrorWordIndexes: (value: Record<number, boolean>) => void;
  setError: (value: string) => void;
  setSeedPhraseInputFocusedIndex: (value: number) => void;
  setNextSeedPhraseInputFocusedIndex: (value: number) => void;
}): void => {
  callbacks.setSeedPhrase(['']);
  callbacks.setErrorWordIndexes({});
  callbacks.setError('');
  callbacks.setSeedPhraseInputFocusedIndex(0);
  callbacks.setNextSeedPhraseInputFocusedIndex(0);
};

/**
 * Handle key press in seed phrase input
 */
export const handleKeyPress = (
  e: { nativeEvent: { key: string } },
  index: number,
  currentSeedPhrase: string[],
  callbacks: {
    setSeedPhrase: (value: string[] | ((prev: string[]) => string[])) => void;
    setNextSeedPhraseInputFocusedIndex: (value: number) => void;
  },
): void => {
  if (e.nativeEvent.key === 'Backspace') {
    if (currentSeedPhrase[index] === '') {
      const newData = currentSeedPhrase.filter((_, idx) => idx !== index);
      if (index > 0) {
        callbacks.setNextSeedPhraseInputFocusedIndex(index - 1);
      }
      setTimeout(() => {
        callbacks.setSeedPhrase(index === 0 ? [''] : [...newData]);
      }, 0);
    }
  }
};

/**
 * Handle enter key press to add space
 */
export const handleEnterKeyPress = (
  index: number,
  currentSeedPhrase: string[],
  handleSeedPhraseChangeAtIndexFn: (text: string, index: number) => void,
): void => {
  handleSeedPhraseChangeAtIndexFn(`${currentSeedPhrase[index]} `, index);
};

/**
 * Handle focus change with validation
 */
export const handleOnFocus = (
  index: number,
  seedPhraseInputFocusedIndex: number | null,
  currentSeedPhrase: string[],
  callbacks: {
    setErrorWordIndexes: (
      value:
        | Record<number, boolean>
        | ((prev: Record<number, boolean>) => Record<number, boolean>),
    ) => void;
    setSeedPhraseInputFocusedIndex: (value: number) => void;
    setNextSeedPhraseInputFocusedIndex: (value: number) => void;
  },
): void => {
  if (seedPhraseInputFocusedIndex !== null) {
    const currentWord = currentSeedPhrase[seedPhraseInputFocusedIndex];
    const trimmedWord = currentWord ? currentWord.trim() : '';

    if (trimmedWord && !checkValidSeedWord(trimmedWord)) {
      callbacks.setErrorWordIndexes((prev) => ({
        ...prev,
        [seedPhraseInputFocusedIndex]: true,
      }));
    } else {
      callbacks.setErrorWordIndexes((prev) => ({
        ...prev,
        [seedPhraseInputFocusedIndex]: false,
      }));
    }
  }
  callbacks.setSeedPhraseInputFocusedIndex(index);
  callbacks.setNextSeedPhraseInputFocusedIndex(index);
};
