import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
} from 'react';
import { Keyboard } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { v4 as uuidv4 } from 'uuid';
import {
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  Box,
  BoxBackgroundColor,
  Button,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import SrpInput from '../../Views/SrpInput';
import { useAppTheme } from '../../../util/theme';
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
import { useTailwind } from '@metamask/design-system-twrnc-preset';

export interface SrpInputGridRef {
  handleSeedPhraseChange: (seedPhraseText: string) => void;
  handleSuggestionSelect: (word: string) => void;
}

const dismissKeyboard = () => Keyboard.dismiss();

const validateWords = (words: string[]) => {
  const errorsMap: Record<number, boolean> = {};
  words.forEach((word, index) => {
    const trimmedWord = word.trim();
    if (trimmedWord && !checkValidSeedWord(trimmedWord)) {
      errorsMap[index] = true;
    }
  });
  return errorsMap;
};

const SHARED_INPUT_PROPS = {
  submitBehavior: 'submit' as const,
  autoComplete: 'off' as const,
  keyboardType: 'visible-password' as const,
  returnKeyType: 'done' as const,
  enablesReturnKeyAutomatically: false,
  autoCorrect: false,
  textContentType: 'none' as const,
  spellCheck: false,
  importantForAutofill: 'no' as const,
  showSoftInputOnFocus: true,
  autoCapitalize: 'none' as const,
};

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
    const tw = useTailwind();
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

    const handleSeedPhraseChange = useCallback(
      (seedPhraseText: string) => {
        const text = formatSeedPhraseToSingleLine(seedPhraseText);
        const trimmedText = text.trim();
        const updatedTrimmedText = trimmedText
          .split(SPACE_CHAR)
          .filter((word) => word !== '');

        if (SRP_LENGTHS.includes(updatedTrimmedText.length)) {
          onSeedPhraseChange(updatedTrimmedText);
          setErrorWordIndexes(validateWords(updatedTrimmedText));
          setNextSeedPhraseInputFocusedIndex(null);
          seedPhraseInputRefs.current?.get(0)?.blur();
          Keyboard.dismiss();
        } else {
          handleSeedPhraseChangeAtIndexRef.current?.(text, 0);
        }
      },
      [onSeedPhraseChange],
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

    const hiddenStyle = useMemo(
      () => tw.style('opacity-0 h-0 absolute top-0 left-0'),
      [tw],
    );
    const gridItemStyle = useMemo(
      () =>
        tw.style(
          'w-[31.33%] mr-[3%] mb-2 min-w-0 rounded-lg bg-background-default flex-row items-center justify-start h-10 overflow-hidden py-1 pl-2',
          { flex: 0 },
        ),
      [tw],
    );
    const gridItemLastStyle = useMemo(
      () =>
        tw.style(
          'w-[31.33%] mb-2 min-w-0 rounded-lg bg-background-default flex-row items-center justify-start h-10 overflow-hidden py-1 pl-2 mr-0',
          { flex: 0 },
        ),
      [tw],
    );
    const textareaInputStyle = useMemo(
      () => ({
        ...tw.style(
          'h-[66px] bg-transparent text-text-alternative text-base my-4',
        ),
        lineHeight: 20,
      }),
      [tw],
    );
    const gridInputItemStyle = useMemo(
      () => tw.style('flex-1 min-w-0 max-w-full pr-2'),
      [tw],
    );
    const textareaVisibleStyle = useMemo(
      () => tw.style('border-0 px-0 py-0 flex-1 bg-transparent'),
      [tw],
    );

    const getGridItemStyle = useCallback(
      (index: number) => {
        if (isFirstInput) return hiddenStyle;
        return (index + 1) % 3 === 0 ? gridItemLastStyle : gridItemStyle;
      },
      [isFirstInput, hiddenStyle, gridItemLastStyle, gridItemStyle],
    );

    const handlePasteOrClear = useCallback(() => {
      if (trimmedSeedPhraseLength >= 1) {
        handleClear();
      } else {
        handlePaste();
      }
    }, [trimmedSeedPhraseLength, handleClear, handlePaste]);

    return (
      <Box twClassName="flex-col gap-1 mt-2 mb-6">
        <Box
          backgroundColor={BoxBackgroundColor.BackgroundSection}
          twClassName={`rounded-[10px] min-h-[210px] flex-row flex-wrap w-full px-4 ${!isFirstInput ? 'pt-4 pb-2' : ''}`}
        >
          {seedPhrase.map((item, index) => (
            <SrpInput
              key={`seed-phrase-item-${uniqueId}-${index}`}
              {...SHARED_INPUT_PROPS}
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
                    variant={TextVariant.BodyMd}
                    fontWeight={FontWeight.Bold}
                    color={TextColor.TextAlternative}
                    twClassName="-mr-1"
                  >
                    {index + 1}.
                  </Text>
                )
              }
              value={getInputValue(isFirstInput, index, item, seedPhrase)}
              onFocus={() => handleOnFocus(index)}
              onBlur={() => handleOnBlur(index)}
              onChangeText={(text) => {
                isFirstInput
                  ? handleSeedPhraseChange(text)
                  : handleSeedPhraseChangeAtIndex(text, index);
              }}
              onSubmitEditing={dismissKeyboard}
              placeholder=""
              placeholderTextColor={colors.text.muted}
              style={getGridItemStyle(index)}
              inputStyle={
                isFirstInput ? textareaInputStyle : gridInputItemStyle
              }
              textAlignVertical={isFirstInput ? 'top' : 'center'}
              isError={errorWordIndexes[index]}
              testID={`${testIdPrefix}_${index}`}
              autoFocus={
                index === nextSeedPhraseInputFocusedIndex &&
                (autoFocusProp || index > 0)
              }
              onKeyPress={(e) => handleKeyPress(e, index)}
              isDisabled={disabled}
            />
          ))}

          <SrpInput
            key={`seed-phrase-item-${uniqueId}`}
            {...SHARED_INPUT_PROPS}
            value={seedPhrase[0]}
            onFocus={() => handleOnFocus(0)}
            onBlur={() => handleOnBlur(0)}
            onChangeText={handleSeedPhraseChange}
            onSubmitEditing={dismissKeyboard}
            placeholder={placeholderText}
            placeholderTextColor={colors.text.alternative}
            style={isFirstInput ? textareaVisibleStyle : hiddenStyle}
            inputStyle={textareaInputStyle}
            textAlignVertical="top"
            testID={testIdPrefix}
            autoFocus={autoFocusProp && isFirstInput}
            multiline
            onKeyPress={(e) => handleKeyPress(e, 0)}
            isDisabled={disabled}
          />
        </Box>

        <Box twClassName="flex-row justify-end items-end pt-1 pb-[1px]">
          <Button variant={ButtonVariant.Tertiary} onPress={handlePasteOrClear}>
            {trimmedSeedPhraseLength >= 1
              ? strings('import_from_seed.clear_all')
              : strings('import_from_seed.paste')}
          </Button>
        </Box>

        {Boolean(externalError || error) && (
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.ErrorDefault}
          >
            {externalError || error}
          </Text>
        )}
      </Box>
    );
  },
);

export default SrpInputGrid;
