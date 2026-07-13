import React from 'react';
import { Keyboard } from 'react-native';
import { formatSeedPhraseToSingleLine } from '../../../util/string';
import { SPACE_CHAR, SRP_LENGTHS } from '../../../util/srp/srpInputUtils';
import { isValidMnemonic } from '../../../util/validators';
import Logger from '../../../util/Logger';
import { SrpInputGridProps } from './SrpInputGrid.types';

export interface ApplySeedPhraseChangeAtIndexParams {
  seedPhrase: string[];
  seedPhraseText: string;
  index: number;
  onSeedPhraseChange: SrpInputGridProps['onSeedPhraseChange'];
  onCurrentWordChange?: SrpInputGridProps['onCurrentWordChange'];
  setErrorWordIndexes: React.Dispatch<
    React.SetStateAction<Record<number, boolean>>
  >;
  setNextSeedPhraseInputFocusedIndex: React.Dispatch<
    React.SetStateAction<number | null>
  >;
}

// Extracted out of the component so the try/catch (with conditionals and
// optional chaining inside) lives in a plain function. The React Compiler
// cannot yet optimize "value blocks" within try/catch, and only optimizes
// components/hooks, so keeping this here lets SrpInputGrid itself compile.
export const applySeedPhraseChangeAtIndex = ({
  seedPhrase,
  seedPhraseText,
  index,
  onSeedPhraseChange,
  onCurrentWordChange,
  setErrorWordIndexes,
  setNextSeedPhraseInputFocusedIndex,
}: ApplySeedPhraseChangeAtIndexParams) => {
  try {
    const text = formatSeedPhraseToSingleLine(seedPhraseText);

    if (text.includes(SPACE_CHAR)) {
      const isEndWithSpace = text.at(-1) === SPACE_CHAR;
      const splitArray = text
        .trim()
        .split(SPACE_CHAR)
        .filter((word) => word.trim() !== '');

      if (splitArray.length === 0) {
        onSeedPhraseChange((prev) => {
          const newSeedPhrase = [...prev];
          newSeedPhrase[index] = '';
          return newSeedPhrase;
        });
        return;
      }

      const mergedSeedPhrase = [
        ...seedPhrase.slice(0, index),
        ...splitArray,
        ...seedPhrase.slice(index + 1),
      ];

      const normalizedWords = mergedSeedPhrase
        .map((w) => w.trim())
        .filter((w) => w !== '');
      const maxAllowed = Math.max(...SRP_LENGTHS);
      const hasReachedMax = normalizedWords.length >= maxAllowed;
      const isCompleteAndValid =
        SRP_LENGTHS.includes(normalizedWords.length) &&
        isValidMnemonic(normalizedWords.join(SPACE_CHAR));

      let nextSeedPhraseState = normalizedWords;
      if (
        isEndWithSpace &&
        index === seedPhrase.length - 1 &&
        !isCompleteAndValid &&
        !hasReachedMax
      ) {
        nextSeedPhraseState = [...normalizedWords, ''];
      }

      onSeedPhraseChange(nextSeedPhraseState);

      if (isCompleteAndValid || hasReachedMax) {
        Keyboard.dismiss();
        setNextSeedPhraseInputFocusedIndex(null);
        return;
      }

      const targetIndex = Math.min(
        nextSeedPhraseState.length - 1,
        index + splitArray.length,
      );
      setNextSeedPhraseInputFocusedIndex(targetIndex);
      return;
    }

    if (seedPhrase[index] !== text) {
      onSeedPhraseChange((prev) => {
        const newSeedPhrase = [...prev];
        newSeedPhrase[index] = text;
        return newSeedPhrase;
      });

      if (text.trim() === '') {
        setErrorWordIndexes((prev) => ({
          ...prev,
          [index]: false,
        }));
      }

      onCurrentWordChange?.(!text.includes(' ') ? text : '');
    }
  } catch (err) {
    Logger.error(err as Error, 'Error handling seed phrase change');
  }
};
