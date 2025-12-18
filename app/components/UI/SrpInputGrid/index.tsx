import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
} from 'react';
import { View, Keyboard } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { v4 as uuidv4 } from 'uuid';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import SrpInput from '../../Views/SrpInput';
import { TextFieldSize } from '../../../component-library/components/Form/TextField';
import { useAppTheme } from '../../../util/theme';
import { createStyles } from './SrpInputGrid.styles';
import { SrpInputGridProps } from './SrpInputGrid.types';
import { strings } from '../../../../locales/i18n';
import {
  getTrimmedSeedPhraseLength,
  isFirstInput as isFirstInputUtil,
  getInputValue,
  SRP_LENGTHS,
  SPACE_CHAR,
  checkValidSeedWord,
} from '../../../util/srp/srpInputUtils';
import { isValidMnemonic } from '../../../util/validators';
import { formatSeedPhraseToSingleLine } from '../../../util/string';
import Logger from '../../../util/Logger';
import { useFeatureFlag, FeatureFlagNames } from '../../hooks/useFeatureFlag';
import SrpWordSuggestions from '../SrpWordSuggestions';

export interface SrpInputGridRef {
  handleSeedPhraseChange: (seedPhraseText: string) => void;
}

/**
 * SrpInputGrid Component
 *
 * A reusable component for Secret Recovery Phrase input that supports:
 * - Single textarea mode for initial input
 * - Dynamic grid mode after paste/input
 * - Paste/Clear functionality
 * - Error validation and display
 * - Keyboard navigation
 *
 */
const SrpInputGrid = React.forwardRef<SrpInputGridRef, SrpInputGridProps>(
  (
    {
      seedPhrase,
      onSeedPhraseChange,
      onError,
      externalError = '',
      testIdPrefix,
      placeholderText,
      uniqueId = uuidv4(),
      disabled = false,
    },
    ref,
  ) => {
    const { colors } = useAppTheme();
    const styles = createStyles(colors);

    //flag to enable/disable SRP word suggestions
    const isSrpWordSuggestionsEnabled = useFeatureFlag(
      FeatureFlagNames.importSrpWordSuggestion,
    ) as boolean;

    // Internal state
    const [
      nextSeedPhraseInputFocusedIndex,
      setNextSeedPhraseInputFocusedIndex,
    ] = useState<number | null>(null);
    const [errorWordIndexes, setErrorWordIndexes] = useState<
      Record<number, boolean>
    >({});
    const [currentInputWord, setCurrentInputWord] = useState<string>('');
    const [, setFocusedInputIndex] = useState<number | null>(null);

    const focusedInputIndexRef = useRef<number | null>(null);
    const isSuggestionSelectingRef = useRef<boolean>(false);
    const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const seedPhraseInputRefs = useRef<Map<
      number,
      { focus: () => void; blur: () => void }
    > | null>(null);

    // Calculate trimmed seed phrase length
    const trimmedSeedPhraseLength = useMemo(
      () => getTrimmedSeedPhraseLength(seedPhrase),
      [seedPhrase],
    );

    // Determine if we're in single input (textarea) mode
    const isFirstInput = useMemo(
      () => isFirstInputUtil(seedPhrase),
      [seedPhrase],
    );

    // Initialize seed phrase input refs
    const getSeedPhraseInputRef = useCallback(() => {
      if (!seedPhraseInputRefs.current) {
        seedPhraseInputRefs.current = new Map();
      }
      return seedPhraseInputRefs.current;
    }, []);

    // Handle seed phrase change at a specific index (for grid mode)
    const handleSeedPhraseChangeAtIndex = useCallback(
      (seedPhraseText: string, index: number) => {
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

            setCurrentInputWord(!text.includes(' ') ? text : '');
          }
        } catch (err) {
          Logger.error(err as Error, 'Error handling seed phrase change');
        }
      },
      [seedPhrase, onSeedPhraseChange],
    );

    const handleSeedPhraseChangeAtIndexRef = useRef(
      handleSeedPhraseChangeAtIndex,
    );

    useEffect(() => {
      handleSeedPhraseChangeAtIndexRef.current = handleSeedPhraseChangeAtIndex;
    }, [handleSeedPhraseChangeAtIndex]);

    useEffect(
      () => () => {
        if (blurTimeoutRef.current) {
          clearTimeout(blurTimeoutRef.current);
        }
      },
      [],
    );

    // Helper to validate words
    const validateWords = useCallback((words: string[]) => {
      const errorsMap: Record<number, boolean> = {};
      words.forEach((word, index) => {
        const trimmedWord = word.trim();
        if (trimmedWord && !checkValidSeedWord(trimmedWord)) {
          errorsMap[index] = true;
        }
      });
      return errorsMap;
    }, []);

    // Handle seed phrase change in first input
    const handleSeedPhraseChange = useCallback(
      (seedPhraseText: string) => {
        const text = formatSeedPhraseToSingleLine(seedPhraseText);
        const trimmedText = text.trim();
        const updatedTrimmedText = trimmedText
          .split(SPACE_CHAR)
          .filter((word) => word !== '');

        if (SRP_LENGTHS.includes(updatedTrimmedText.length)) {
          onSeedPhraseChange(updatedTrimmedText);

          // Validate complete phrases that might have invalid words
          setErrorWordIndexes(validateWords(updatedTrimmedText));
          setNextSeedPhraseInputFocusedIndex(null);
          seedPhraseInputRefs.current?.get(0)?.blur();
          Keyboard.dismiss();
        } else {
          handleSeedPhraseChangeAtIndexRef.current?.(text, 0);
        }
      },
      [onSeedPhraseChange, validateWords],
    );

    // Handle focus change with validation
    const handleOnFocus = useCallback(
      (index: number) => {
        setNextSeedPhraseInputFocusedIndex(index);
        setFocusedInputIndex(index);
        focusedInputIndexRef.current = index;

        const currentWord = seedPhrase[index] || '';
        if (!currentWord.includes(' ')) {
          setCurrentInputWord(currentWord);
        }
      },
      [seedPhrase],
    );

    const handleOnBlur = useCallback(
      (index: number) => {
        const currentWord = seedPhrase[index];
        const trimmedWord = currentWord ? currentWord.trim() : '';
        if (trimmedWord) {
          const checkValid = checkValidSeedWord(trimmedWord);
          setErrorWordIndexes((prev) => ({
            ...prev,
            [index]: !checkValid,
          }));
        }

        setFocusedInputIndex(null);

        if (blurTimeoutRef.current) {
          clearTimeout(blurTimeoutRef.current);
        }
        blurTimeoutRef.current = setTimeout(() => {
          if (!isSuggestionSelectingRef.current) {
            setCurrentInputWord('');
          }
        }, 150);
      },
      [seedPhrase],
    );

    const handleKeyPress = useCallback(
      (e: { nativeEvent: { key: string } }, index: number) => {
        if (e.nativeEvent.key === 'Backspace') {
          if (seedPhrase[index] === '') {
            const newData = seedPhrase.filter((_, idx) => idx !== index);
            if (index > 0) {
              const prevInputRef = seedPhraseInputRefs.current?.get(index - 1);
              if (prevInputRef) {
                prevInputRef.focus();
              }
              setNextSeedPhraseInputFocusedIndex(index - 1);
            }
            onSeedPhraseChange([...newData]);
          }
        }
      },
      [seedPhrase, onSeedPhraseChange],
    );

    const handleEnterKeyPress = useCallback(
      (index: number) => {
        handleSeedPhraseChangeAtIndexRef.current(
          `${seedPhrase[index]}${SPACE_CHAR}`,
          index,
        );
      },
      [seedPhrase],
    );

    // Validate seed phrase and show errors
    const error = useMemo(() => {
      const hasWordErrors = Object.values(errorWordIndexes).some(Boolean);
      if (hasWordErrors) {
        return strings('import_from_seed.spellcheck_error');
      }
      return '';
    }, [errorWordIndexes]);

    useEffect(() => {
      onError?.(error);
    }, [error, onError]);

    const handlePaste = useCallback(async () => {
      const text = await Clipboard.getString();
      if (text.trim() !== '') {
        handleSeedPhraseChange(text);
      }
    }, [handleSeedPhraseChange]);

    const handleClear = useCallback(() => {
      onSeedPhraseChange(['']);
      setErrorWordIndexes({});
      setNextSeedPhraseInputFocusedIndex(null);
      setCurrentInputWord('');
      setFocusedInputIndex(null);
    }, [onSeedPhraseChange]);

    /* istanbul ignore next -- @preserve Focus events */
    const handleSuggestionSelect = useCallback((word: string) => {
      isSuggestionSelectingRef.current = true;

      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = null;
      }

      const targetIndex = focusedInputIndexRef.current;
      if (targetIndex === null) {
        isSuggestionSelectingRef.current = false;
        return;
      }

      // Update seed phrase with selected word
      const updatedText = `${word}${SPACE_CHAR}`;
      handleSeedPhraseChangeAtIndexRef.current(updatedText, targetIndex);

      setCurrentInputWord('');

      const inputRef = seedPhraseInputRefs.current?.get(targetIndex);
      if (inputRef) {
        inputRef.focus();
      }

      isSuggestionSelectingRef.current = false;
    }, []);

    useEffect(() => {
      if (nextSeedPhraseInputFocusedIndex === null) return;

      requestAnimationFrame(() => {
        const refElement = seedPhraseInputRefs.current?.get(
          nextSeedPhraseInputFocusedIndex,
        );

        refElement?.focus();
      });
    }, [nextSeedPhraseInputFocusedIndex]);

    React.useImperativeHandle(ref, () => ({
      handleSeedPhraseChange,
    }));

    return (
      <View style={styles.seedPhraseRoot}>
        <View style={styles.seedPhraseContainer}>
          <View style={styles.seedPhraseInnerContainer}>
            <View style={styles.seedPhraseInputContainer}>
              {/* Grid Inputs on multiple words mode. hidden when first input mode.
              Need to use style hidden instead of condition rendering to avoid
              keyboard flicker when change input */}
              {seedPhrase.map((item, index) => (
                <SrpInput
                  key={`seed-phrase-item-${uniqueId}-${index}`}
                  ref={(itemRef) => {
                    const inputRefs = getSeedPhraseInputRef();
                    if (itemRef) {
                      inputRefs.set(index, itemRef);
                    } else {
                      inputRefs.delete(index);
                    }
                  }}
                  startAccessory={
                    !isFirstInput && (
                      <Text
                        variant={TextVariant.BodyMDBold}
                        color={TextColor.Alternative}
                        style={styles.inputIndex}
                      >
                        {index + 1}.
                      </Text>
                    )
                  }
                  value={getInputValue(isFirstInput, index, item, seedPhrase)}
                  onFocus={() => {
                    handleOnFocus(index);
                  }}
                  onBlur={() => {
                    handleOnBlur(index);
                  }}
                  onChangeText={(text) => {
                    isFirstInput
                      ? handleSeedPhraseChange(text)
                      : handleSeedPhraseChangeAtIndex(text, index);
                  }}
                  onSubmitEditing={() => {
                    handleEnterKeyPress(index);
                  }}
                  placeholder=""
                  placeholderTextColor={colors.text.muted}
                  size={TextFieldSize.Md}
                  style={
                    isFirstInput
                      ? styles.hiddenInput
                      : [
                          styles.input,
                          styles.seedPhraseInputItem,
                          (index + 1) % 3 === 0 &&
                            styles.seedPhraseInputItemLast,
                        ]
                  }
                  inputStyle={
                    isFirstInput ? styles.textAreaInput : styles.inputItem
                  }
                  submitBehavior="submit"
                  autoComplete="off"
                  textAlignVertical={isFirstInput ? 'top' : 'center'}
                  showSoftInputOnFocus
                  isError={errorWordIndexes[index]}
                  autoCapitalize="none"
                  testID={`${testIdPrefix}_${index}`}
                  keyboardType="visible-password"
                  autoCorrect={false}
                  textContentType="none"
                  spellCheck={false}
                  importantForAutofill="no"
                  autoFocus={index === nextSeedPhraseInputFocusedIndex}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  isDisabled={disabled}
                />
              ))}

              {/* Textarea Input on first input mode hidden during multiple works */}
              <SrpInput
                key={`seed-phrase-item-${uniqueId}`}
                value={seedPhrase[0]}
                onFocus={() => {
                  handleOnFocus(0);
                }}
                onBlur={() => {
                  handleOnBlur(0);
                }}
                onChangeText={(text) => {
                  handleSeedPhraseChange(text);
                }}
                placeholder={placeholderText}
                placeholderTextColor={colors.text.alternative}
                size={TextFieldSize.Md}
                style={
                  isFirstInput
                    ? styles.seedPhraseDefaultInput
                    : styles.hiddenInput
                }
                inputStyle={styles.textAreaInput}
                submitBehavior="submit"
                autoComplete="off"
                textAlignVertical="top"
                showSoftInputOnFocus
                autoCapitalize="none"
                testID={testIdPrefix}
                keyboardType="visible-password"
                autoCorrect={false}
                textContentType="none"
                spellCheck={false}
                importantForAutofill="no"
                autoFocus={isFirstInput}
                multiline
                onKeyPress={(e) => handleKeyPress(e, 0)}
                isDisabled={disabled}
              />
            </View>
          </View>
        </View>

        {/* Paste/Clear Button */}
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Primary}
          style={styles.pasteText}
          onPress={() => {
            if (trimmedSeedPhraseLength >= 1) {
              handleClear();
            } else {
              handlePaste();
            }
          }}
        >
          {trimmedSeedPhraseLength >= 1
            ? strings('import_from_seed.clear_all')
            : strings('import_from_seed.paste')}
        </Text>

        {isSrpWordSuggestionsEnabled && (
          <SrpWordSuggestions
            currentInputWord={currentInputWord}
            onSuggestionSelect={handleSuggestionSelect}
            onPressIn={() => {
              isSuggestionSelectingRef.current = true;
            }}
          />
        )}

        {/* Error Text */}
        {Boolean(externalError || error) && (
          <Text variant={TextVariant.BodySMMedium} color={TextColor.Error}>
            {externalError || error}
          </Text>
        )}
      </View>
    );
  },
);

export default SrpInputGrid;
