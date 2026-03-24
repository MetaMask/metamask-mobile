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

export interface SrpInputGridRef {
  handleSeedPhraseChange: (seedPhraseText: string) => void;
  handleSuggestionSelect: (word: string) => void;
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
      onCurrentWordChange,
      autoFocus: autoFocusProp = true,
    },
    ref,
  ) => {
    const { colors } = useAppTheme();
    const styles = createStyles(colors);

    // Internal state
    const [
      nextSeedPhraseInputFocusedIndex,
      setNextSeedPhraseInputFocusedIndex,
    ] = useState<number | null>(null);
    const [errorWordIndexes, setErrorWordIndexes] = useState<
      Record<number, boolean>
    >({});

    const focusedInputIndexRef = useRef<number | null>(null);

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

            onCurrentWordChange?.(!text.includes(' ') ? text : '');
          }
        } catch (err) {
          Logger.error(err as Error, 'Error handling seed phrase change');
        }
      },
      [seedPhrase, onSeedPhraseChange, onCurrentWordChange],
    );

    const handleSeedPhraseChangeAtIndexRef = useRef(
      handleSeedPhraseChangeAtIndex,
    );

    useEffect(() => {
      handleSeedPhraseChangeAtIndexRef.current = handleSeedPhraseChangeAtIndex;
    }, [handleSeedPhraseChangeAtIndex]);

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
        focusedInputIndexRef.current = index;

        const currentWord = seedPhrase[index] || '';
        if (!currentWord.includes(' ')) {
          onCurrentWordChange?.(currentWord);
        }
      },
      [seedPhrase, onCurrentWordChange],
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
        onCurrentWordChange?.('');
      },
      [seedPhrase, onCurrentWordChange],
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
      onCurrentWordChange?.('');
      focusedInputIndexRef.current = null;
    }, [onSeedPhraseChange, onCurrentWordChange]);

    const handleSuggestionSelect = useCallback(
      (word: string) => {
        const targetIndex = focusedInputIndexRef.current;
        if (targetIndex === null) {
          return;
        }

        setErrorWordIndexes((prev) => ({
          ...prev,
          [targetIndex]: false,
        }));

        const currentWordPosition = targetIndex + 1;
        const isLastWordOfValidSrp = SRP_LENGTHS.includes(currentWordPosition);

        const updatedText = isLastWordOfValidSrp
          ? word
          : `${word}${SPACE_CHAR}`;

        handleSeedPhraseChangeAtIndexRef.current(updatedText, targetIndex);
        onCurrentWordChange?.('');

        if (isLastWordOfValidSrp) {
          const inputRef = seedPhraseInputRefs.current?.get(targetIndex);
          inputRef?.focus();
        }
      },
      [onCurrentWordChange],
    );

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
      handleSuggestionSelect,
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
                  onSubmitEditing={() => Keyboard.dismiss()}
                  placeholder=""
                  placeholderTextColor={colors.text.muted}
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
                  returnKeyType="done"
                  blurOnSubmit={false}
                  enablesReturnKeyAutomatically={false}
                  autoCorrect={false}
                  textContentType="none"
                  spellCheck={false}
                  importantForAutofill="no"
                  autoFocus={
                    index === nextSeedPhraseInputFocusedIndex &&
                    (autoFocusProp || index > 0)
                  }
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
                returnKeyType="done"
                blurOnSubmit={false}
                enablesReturnKeyAutomatically={false}
                onSubmitEditing={() => Keyboard.dismiss()}
                autoCorrect={false}
                textContentType="none"
                spellCheck={false}
                importantForAutofill="no"
                autoFocus={autoFocusProp && isFirstInput}
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
