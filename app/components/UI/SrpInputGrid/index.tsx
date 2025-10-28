import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';
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
  isFirstInput as SRPUtils_isFirstInput,
  handleSeedPhraseChangeAtIndex as SRPUtils_handleSeedPhraseChangeAtIndex,
  handleSeedPhraseChange as SRPUtils_handleSeedPhraseChange,
  handleOnFocus as SRPUtils_handleOnFocus,
  handleKeyPress as SRPUtils_handleKeyPress,
  handleEnterKeyPress as SRPUtils_handleEnterKeyPress,
  getSeedPhraseInputRef,
  getInputValue,
} from '../../../util/srp/srpInputUtils';

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
  seedPhraseInputFocusedIndex,
  nextSeedPhraseInputFocusedIndex,
  errorWordIndexes,
  error,
  onSeedPhraseChange,
  onFocusChange,
  onNextFocusChange,
  onPaste,
  onClear,
  seedPhraseInputRefs,
  testIDPrefix,
  placeholderText,
  uniqueId = uuidv4(),
  disabled = false,
  autoFocus = true,
}) => {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  // Calculate trimmed seed phrase length
  const trimmedSeedPhraseLength = useMemo(
    () => getTrimmedSeedPhraseLength(seedPhrase),
    [seedPhrase],
  );

  // Determine if we're in single input (textarea) mode
  const isFirstInput = useMemo(
    () => SRPUtils_isFirstInput(seedPhrase),
    [seedPhrase],
  );

  // Wrapper callbacks to integrate with parent state
  const handleSeedPhraseChangeAtIndex = useCallback(
    (seedPhraseText: string, index: number) => {
      SRPUtils_handleSeedPhraseChangeAtIndex(
        seedPhraseText,
        index,
        seedPhrase,
        {
          setSeedPhrase: onSeedPhraseChange,
          setSeedPhraseInputFocusedIndex: onFocusChange,
          setNextSeedPhraseInputFocusedIndex: onNextFocusChange,
        },
      );
    },
    [seedPhrase, onSeedPhraseChange, onFocusChange, onNextFocusChange],
  );

  const handleSeedPhraseChange = useCallback(
    (seedPhraseText: string) => {
      SRPUtils_handleSeedPhraseChange(seedPhraseText, seedPhrase, {
        setSeedPhrase: onSeedPhraseChange,
        setSeedPhraseInputFocusedIndex: onFocusChange,
        setNextSeedPhraseInputFocusedIndex: onNextFocusChange,
        handleSeedPhraseChangeAtIndex,
        seedPhraseInputRefs: seedPhraseInputRefs.current,
      });
    },
    [
      seedPhrase,
      onSeedPhraseChange,
      onFocusChange,
      onNextFocusChange,
      handleSeedPhraseChangeAtIndex,
      seedPhraseInputRefs,
    ],
  );

  // Error handling done in parent - empty function is intentional
  // eslint-disable-next-line @typescript-eslint/no-empty-function, no-empty-function
  const emptyErrorHandler = useCallback(() => {
    // Intentionally empty - error handling is managed by parent component
  }, []);

  const handleOnFocus = useCallback(
    (index: number) => {
      SRPUtils_handleOnFocus(index, seedPhraseInputFocusedIndex, seedPhrase, {
        setSeedPhraseInputFocusedIndex: onFocusChange,
        setNextSeedPhraseInputFocusedIndex: onNextFocusChange,
        setErrorWordIndexes: emptyErrorHandler,
      });
    },
    [
      seedPhraseInputFocusedIndex,
      seedPhrase,
      onFocusChange,
      onNextFocusChange,
      emptyErrorHandler,
    ],
  );

  const handleKeyPress = useCallback(
    (e: { nativeEvent: { key: string } }, index: number) => {
      SRPUtils_handleKeyPress(e, index, seedPhrase, {
        setSeedPhrase: onSeedPhraseChange,
        setNextSeedPhraseInputFocusedIndex: onNextFocusChange,
      });
    },
    [seedPhrase, onSeedPhraseChange, onNextFocusChange],
  );

  const handleEnterKeyPress = useCallback(
    (index: number) => {
      SRPUtils_handleEnterKeyPress(
        index,
        seedPhrase,
        handleSeedPhraseChangeAtIndex,
      );
    },
    [seedPhrase, handleSeedPhraseChangeAtIndex],
  );

  return (
    <View style={styles.seedPhraseRoot}>
      <View style={styles.seedPhraseContainer}>
        <View style={styles.seedPhraseInnerContainer}>
          <View style={styles.seedPhraseInputContainer}>
            {seedPhrase.map((item, index) => (
              <SrpInput
                key={`seed-phrase-item-${uniqueId}-${index}`}
                ref={(ref) => {
                  const inputRefs = getSeedPhraseInputRef(
                    seedPhraseInputRefs.current,
                  );
                  if (!seedPhraseInputRefs.current) {
                    seedPhraseInputRefs.current = inputRefs;
                  }
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
                  onNextFocusChange(index);
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
            onClear();
          } else {
            onPaste();
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
