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
const SrpInputGrid: React.FC<SrpInputGridProps> = ({
  seedPhrase,
  onSeedPhraseChange,
  onError,
  externalSeedPhrase,
  onExternalSeedPhraseProcessed,
  testIDPrefix,
  placeholderText,
  uniqueId = uuidv4(),
  disabled = false,
  autoFocus = true,
}) => {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  // Internal state
  const [seedPhraseInputFocusedIndex, setSeedPhraseInputFocusedIndex] =
    useState<number | null>(null);
  const [nextSeedPhraseInputFocusedIndex, setNextSeedPhraseInputFocusedIndex] =
    useState<number | null>(null);
  const [errorWordIndexes, setErrorWordIndexes] = useState<
    Record<number, boolean>
  >({});

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
            .split(' ')
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
            isValidMnemonic(normalizedWords.join(' '));

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
            setSeedPhraseInputFocusedIndex(null);
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

  // Handle seed phrase change in first input (textarea mode)
  const handleSeedPhraseChange = useCallback(
    (seedPhraseText: string) => {
      const text = formatSeedPhraseToSingleLine(seedPhraseText);
      const trimmedText = text.trim();
      const updatedTrimmedText = trimmedText
        .split(' ')
        .filter((word) => word !== '');

      if (SRP_LENGTHS.includes(updatedTrimmedText.length)) {
        onSeedPhraseChange(updatedTrimmedText);
        setTimeout(() => {
          setSeedPhraseInputFocusedIndex(null);
          setNextSeedPhraseInputFocusedIndex(null);
          seedPhraseInputRefs.current?.get(0)?.blur();
          Keyboard.dismiss();
        }, 100);
      } else {
        handleSeedPhraseChangeAtIndexRef.current?.(text, 0);
      }
    },
    [onSeedPhraseChange],
  );

  // Handle focus change with validation
  const handleOnFocus = useCallback(
    (index: number) => {
      if (seedPhraseInputFocusedIndex !== null) {
        const currentWord = seedPhrase[seedPhraseInputFocusedIndex];
        const trimmedWord = currentWord ? currentWord.trim() : '';

        if (trimmedWord && !checkValidSeedWord(trimmedWord)) {
          setErrorWordIndexes((prev) => ({
            ...prev,
            [seedPhraseInputFocusedIndex]: true,
          }));
        } else {
          setErrorWordIndexes((prev) => ({
            ...prev,
            [seedPhraseInputFocusedIndex]: false,
          }));
        }
      }
      setSeedPhraseInputFocusedIndex(index);
      setNextSeedPhraseInputFocusedIndex(index);
    },
    [seedPhraseInputFocusedIndex, seedPhrase],
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
          setTimeout(() => {
            onSeedPhraseChange(index === 0 ? [''] : [...newData]);
          }, 0);
        }
      }
    },
    [seedPhrase, onSeedPhraseChange],
  );

  const handleEnterKeyPress = useCallback(
    (index: number) => {
      handleSeedPhraseChangeAtIndexRef.current(`${seedPhrase[index]} `, index);
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

  // Update error word indexes when seed phrase changes
  useEffect(() => {
    const errorsMap: Record<number, boolean> = {};
    seedPhrase.forEach((word, index) => {
      const trimmedWord = word.trim();
      if (trimmedWord && !checkValidSeedWord(trimmedWord)) {
        errorsMap[index] = true;
      }
    });
    setErrorWordIndexes(errorsMap);
  }, [seedPhrase]);

  useEffect(() => {
    onError?.(error);
  }, [error, onError]);

  useEffect(() => {
    if (!externalSeedPhrase || externalSeedPhrase.trim() === '') {
      return;
    }

    handleSeedPhraseChange(externalSeedPhrase);

    onExternalSeedPhraseProcessed?.();
  }, [
    externalSeedPhrase,
    handleSeedPhraseChange,
    onExternalSeedPhraseProcessed,
  ]);

  const handlePaste = useCallback(async () => {
    const text = await Clipboard.getString();
    if (text.trim() !== '') {
      handleSeedPhraseChange(text);
    }
  }, [handleSeedPhraseChange]);

  const handleClear = useCallback(() => {
    onSeedPhraseChange(['']);
    setErrorWordIndexes({});
    setSeedPhraseInputFocusedIndex(null);
    setNextSeedPhraseInputFocusedIndex(null);
  }, [onSeedPhraseChange]);

  return (
    <View style={styles.seedPhraseRoot}>
      <View style={styles.seedPhraseContainer}>
        <View style={styles.seedPhraseInnerContainer}>
          <View style={styles.seedPhraseInputContainer}>
            {seedPhrase.map((item, index) => (
              <SrpInput
                key={`seed-phrase-item-${uniqueId}-${index}`}
                ref={(ref) => {
                  const inputRefs = getSeedPhraseInputRef();
                  if (ref) {
                    inputRefs.set(index, ref);
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
                onInputFocus={() => {
                  setNextSeedPhraseInputFocusedIndex(index);
                }}
                onChangeText={(text) => {
                  isFirstInput
                    ? handleSeedPhraseChange(text)
                    : handleSeedPhraseChangeAtIndex(text, index);
                }}
                onSubmitEditing={() => {
                  handleEnterKeyPress(index);
                }}
                placeholder={isFirstInput ? placeholderText : ''}
                placeholderTextColor={
                  isFirstInput ? colors.text.alternative : colors.text.muted
                }
                size={TextFieldSize.Md}
                style={
                  isFirstInput
                    ? styles.seedPhraseDefaultInput
                    : [
                        styles.input,
                        styles.seedPhraseInputItem,
                        (index + 1) % 3 === 0 && styles.seedPhraseInputItemLast,
                      ]
                }
                inputStyle={
                  (isFirstInput
                    ? styles.textAreaInput
                    : styles.inputItem) as never
                }
                submitBehavior="submit"
                autoComplete="off"
                textAlignVertical={isFirstInput ? 'top' : 'center'}
                showSoftInputOnFocus
                isError={errorWordIndexes[index]}
                autoCapitalize="none"
                numberOfLines={1}
                testID={
                  isFirstInput ? testIDPrefix : `${testIDPrefix}_${index}`
                }
                keyboardType="default"
                autoCorrect={false}
                textContentType="oneTimeCode"
                spellCheck={false}
                autoFocus={
                  autoFocus &&
                  (isFirstInput || index === nextSeedPhraseInputFocusedIndex)
                }
                multiline={isFirstInput}
                onKeyPress={(e) => handleKeyPress(e, index)}
                isDisabled={disabled}
              />
            ))}
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
      {Boolean(error) && (
        <Text variant={TextVariant.BodySMMedium} color={TextColor.Error}>
          {error}
        </Text>
      )}
    </View>
  );
};

export default SrpInputGrid;
