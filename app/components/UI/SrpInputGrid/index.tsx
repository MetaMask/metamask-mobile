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
  Button,
  ButtonVariant,
  HelpText,
  HelpTextSeverity,
  TextArea,
} from '@metamask/design-system-react-native';
import SrpInput from '../../Views/SrpInput';
import { SrpInputGridProps } from './SrpInputGrid.types';
import { applySeedPhraseChangeAtIndex } from './srpInputGridLogic';
import { strings } from '../../../../locales/i18n';
import {
  capSrpWordCount,
  getTrimmedSeedPhraseLength,
  isFirstInput as isFirstInputUtil,
  getInputValue,
  MAX_SRP_LENGTH,
  SRP_LENGTHS,
  SPACE_CHAR,
  checkValidSeedWord,
} from '../../../util/srp/srpInputUtils';
import { formatSeedPhraseToSingleLine } from '../../../util/string';

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
      includeTopMargin = true,
    },
    ref,
  ) => {
    // Internal state
    const [
      nextSeedPhraseInputFocusedIndex,
      setNextSeedPhraseInputFocusedIndex,
    ] = useState<number | null>(null);
    const [errorWordIndexes, setErrorWordIndexes] = useState<
      Record<number, boolean>
    >({});

    const [preferGridMode, setPreferGridMode] = useState(
      () => seedPhrase.length > 1,
    );

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

    useEffect(() => {
      if (seedPhrase.length > 1) {
        setPreferGridMode(true);
        return;
      }
      if (trimmedSeedPhraseLength === 0) {
        setPreferGridMode(false);
      }
    }, [seedPhrase.length, trimmedSeedPhraseLength]);

    // Determine if we're in single input (textarea) mode
    const isFirstInput = useMemo(
      () => !preferGridMode && isFirstInputUtil(seedPhrase),
      [preferGridMode, seedPhrase],
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
        applySeedPhraseChangeAtIndex({
          seedPhrase,
          seedPhraseText,
          index,
          onSeedPhraseChange,
          onCurrentWordChange,
          setErrorWordIndexes,
          setNextSeedPhraseInputFocusedIndex,
        });
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
        const updatedTrimmedText = capSrpWordCount(
          trimmedText.split(SPACE_CHAR).filter((word) => word !== ''),
        );
        const endsWithSpace =
          text.length > 0 &&
          text.at(-1) === SPACE_CHAR &&
          updatedTrimmedText.length < MAX_SRP_LENGTH;

        if (SRP_LENGTHS.includes(updatedTrimmedText.length) && !endsWithSpace) {
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
        if (e.nativeEvent.key !== 'Backspace') {
          return;
        }

        if (seedPhrase[index] !== '') {
          return;
        }

        if (seedPhrase.length <= 1) {
          return;
        }

        const newData = seedPhrase.filter((_, idx) => idx !== index);

        if (index > 0) {
          const prevInputRef = seedPhraseInputRefs.current?.get(index - 1);
          if (prevInputRef) {
            prevInputRef.focus();
          }
          setNextSeedPhraseInputFocusedIndex(index - 1);
        }

        onSeedPhraseChange([...newData]);
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
      setPreferGridMode(false);
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
        const isLastWordOfMaxSrp = currentWordPosition >= MAX_SRP_LENGTH;

        const updatedText = isLastWordOfMaxSrp ? word : `${word}${SPACE_CHAR}`;

        handleSeedPhraseChangeAtIndexRef.current(updatedText, targetIndex);
        onCurrentWordChange?.('');

        if (isLastWordOfMaxSrp) {
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

    const getGridItemClassName = useCallback(
      (index: number) =>
        (index + 1) % 3 === 0 ? 'w-[31.33%] mb-2' : 'w-[31.33%] mr-[3%] mb-2',
      [],
    );

    const handlePasteOrClear = useCallback(() => {
      if (trimmedSeedPhraseLength >= 1) {
        handleClear();
      } else {
        handlePaste();
      }
    }, [trimmedSeedPhraseLength, handleClear, handlePaste]);

    return (
      <Box
        twClassName={
          includeTopMargin ? 'flex-col gap-1 mt-2 mb-6' : 'flex-col gap-1 mb-6'
        }
      >
        {isFirstInput ? (
          <TextArea
            key={`seed-phrase-item-${uniqueId}`}
            {...SHARED_INPUT_PROPS}
            ref={(itemRef) => {
              const inputRefs = getSeedPhraseInputRef();
              if (itemRef) {
                inputRefs.set(0, itemRef);
              } else {
                inputRefs.delete(0);
              }
            }}
            value={seedPhrase[0] ?? ''}
            onFocus={() => handleOnFocus(0)}
            onBlur={() => handleOnBlur(0)}
            onChangeText={handleSeedPhraseChange}
            onSubmitEditing={dismissKeyboard}
            placeholder={placeholderText}
            isError={Boolean(errorWordIndexes[0])}
            twClassName="min-h-[210px]"
            testID={testIdPrefix}
            autoFocus={autoFocusProp}
            onKeyPress={(e) => handleKeyPress(e, 0)}
            isDisabled={disabled}
          />
        ) : (
          <Box twClassName="flex-row flex-wrap w-full">
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
                  <Text
                    variant={TextVariant.BodyMd}
                    fontWeight={FontWeight.Bold}
                    color={TextColor.TextAlternative}
                  >
                    {index + 1}.
                  </Text>
                }
                value={getInputValue(false, index, item, seedPhrase)}
                onFocus={() => handleOnFocus(index)}
                onBlur={() => handleOnBlur(index)}
                onChangeText={(text) =>
                  handleSeedPhraseChangeAtIndex(text, index)
                }
                isError={errorWordIndexes[index]}
                autoFocus={
                  index === nextSeedPhraseInputFocusedIndex &&
                  (autoFocusProp || index > 0)
                }
                isDisabled={disabled}
                twClassName={getGridItemClassName(index)}
                inputProps={{
                  ...SHARED_INPUT_PROPS,
                  testID: `${testIdPrefix}_${index}`,
                  onSubmitEditing: dismissKeyboard,
                  onKeyPress: (e) => handleKeyPress(e, index),
                }}
              />
            ))}
          </Box>
        )}

        <Box twClassName="flex-row justify-end items-end pt-1 pb-[1px]">
          <Button variant={ButtonVariant.Tertiary} onPress={handlePasteOrClear}>
            {trimmedSeedPhraseLength >= 1
              ? strings('import_from_seed.clear_all')
              : strings('import_from_seed.paste')}
          </Button>
        </Box>

        {Boolean(externalError || error) && (
          <HelpText severity={HelpTextSeverity.Danger}>
            {externalError || error}
          </HelpText>
        )}
      </Box>
    );
  },
);

export default SrpInputGrid;
