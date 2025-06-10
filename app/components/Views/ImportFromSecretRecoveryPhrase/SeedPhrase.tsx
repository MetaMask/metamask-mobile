import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useContext,
} from 'react';
import {
  View,
  TextInput,
  FlatList,
  LayoutChangeEvent,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useTheme } from '../../../util/theme';
import { strings } from '../../../../locales/i18n';
import { isValidMnemonic } from '../../../util/validators';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import {
  IconName,
  IconColor,
} from '../../../component-library/components/Icons/Icon';
import { ToastContext } from '../../../component-library/components/Toast/Toast.context';
import { ToastVariants } from '../../../component-library/components/Toast/Toast.types';
import TextField from '../../../component-library/components/Form/TextField/TextField';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import { TextFieldSize } from '../../../component-library/components/Form/TextField';
import { wordlist } from '@metamask/scure-bip39/dist/wordlists/english';
import { ImportFromSeedSelectorsIDs } from '../../../../e2e/selectors/Onboarding/ImportFromSeed.selectors';
import { SRP_LENGTHS, NUM_COLUMNS, SPACE_CHAR } from './constant';
import createStyles from './styles';

interface ValidationState {
  isValid: boolean;
  error: string;
  seedPhraseLength: number;
}

interface SeedPhraseProps {
  /**
   * Callback function called when seed phrase changes
   */
  onSeedPhraseChange?: (seedPhrase: string[]) => void;
  /**
   * Callback function called when validation state changes
   */
  onValidationChange?: (validationState: ValidationState) => void;
  /**
   * QR scan seed array to be processed
   */
  qrScanSeed?: string[];
  /**
   * Callback function called when QR scan seed is processed
   */
  onQrScanProcessed?: () => void;
  /**
   * Test ID for the component
   */
  testID?: string;
}

const checkValidSeedWord = (text: string): boolean => wordlist.includes(text);

const SeedPhrase: React.FC<SeedPhraseProps> = ({
  onSeedPhraseChange,
  onValidationChange,
  qrScanSeed,
  onQrScanProcessed,
  testID,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { toastRef } = useContext(ToastContext);

  const seedPhraseInputRefs = useRef<(TextInput | null)[]>([]);

  const [seedPhrase, setSeedPhrase] = useState<string[]>([]);
  const [seedPhraseInputFocusedIndex, setSeedPhraseInputFocusedIndex] =
    useState<number>(0);
  const [nextSeedPhraseInputFocusedIndex, setNextSeedPhraseInputFocusedIndex] =
    useState<number>(0);
  const [showAllSeedPhrase, setShowAllSeedPhrase] = useState<boolean>(false);
  const [errorWordIndexes, setErrorWordIndexes] = useState<
    Record<number, boolean>
  >({});
  const [error, setError] = useState<string>('');
  const [containerWidth, setContainerWidth] = useState<number>(0);

  const seedPhraseLength = seedPhrase.filter((item) => item !== '').length;

  const handleLayout = (event: LayoutChangeEvent): void => {
    setContainerWidth(event.nativeEvent.layout.width);
  };

  const handleClear = useCallback((): void => {
    setSeedPhrase([]);
    setErrorWordIndexes({});
    setShowAllSeedPhrase(false);
    setError('');
  }, []);

  const handleSeedPhraseChange = useCallback(
    (text: string, index: number): void => {
      if (text.includes(SPACE_CHAR)) {
        const isEndWithSpace = text.at(-1) === SPACE_CHAR;
        // handle use pasting multiple words / whole seed phrase separated by spaces
        const splitArray = text.trim().split(' ');

        const currentErrorWordIndexes = { ...errorWordIndexes };
        splitArray.reduce((acc, x, currentIndex) => {
          if (checkValidSeedWord(x)) {
            currentErrorWordIndexes[index + currentIndex] = false;
          } else {
            currentErrorWordIndexes[index + currentIndex] = true;
          }
          return acc;
        }, [] as string[]);

        setSeedPhrase((prev) => {
          const endSlices = prev.slice(index + 1);
          if (endSlices.length === 0 && isEndWithSpace) {
            endSlices.push('');
          } else if (isEndWithSpace) {
            endSlices.unshift('');
          }

          return [...prev.slice(0, index), ...splitArray, ...endSlices];
          // input the array into the correct index
        });

        setErrorWordIndexes(currentErrorWordIndexes);
        setNextSeedPhraseInputFocusedIndex(index + splitArray.length);
      } else {
        setSeedPhrase((prev) => {
          // update the word at the correct index
          const newSeedPhrase = [...prev];
          newSeedPhrase[index] = text.trim();
          return newSeedPhrase;
        });
      }
    },
    [
      setSeedPhrase,
      setNextSeedPhraseInputFocusedIndex,
      setErrorWordIndexes,
      errorWordIndexes,
    ],
  );

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number,
    _enterPressed: boolean = false,
  ): void => {
    const { key } = e.nativeEvent;
    if (key === 'Backspace') {
      if (seedPhrase[index] === '') {
        if (index > 0) {
          setNextSeedPhraseInputFocusedIndex(index - 1);
        }
        const newData = seedPhrase.filter((_, idx) => idx !== index);
        setSeedPhrase(newData);
      }
    }
  };

  const handlePaste = useCallback(
    async (focusedIndex: number): Promise<void> => {
      const text = await Clipboard.getString(); // Get copied text
      if (text.trim() !== '') {
        handleSeedPhraseChange(text, focusedIndex);
      }
    },
    [handleSeedPhraseChange],
  );

  const toggleShowAllSeedPhrase = (): void => {
    setShowAllSeedPhrase((prev) => !prev);
  };

  const validateSeedPhrase = useCallback((): boolean => {
    const phrase = seedPhrase.filter((item) => item !== '').join(' ');
    const seedPhraseLength = seedPhrase.length;
    if (!SRP_LENGTHS.includes(seedPhraseLength)) {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          { label: strings('import_from_seed.seed_phrase_length_error') },
        ],
        hasNoTimeout: false,
        iconName: IconName.Error,
        iconColor: IconColor.Error,
      });
      return false;
    }

    if (!isValidMnemonic(phrase)) {
      setError(strings('import_from_seed.invalid_seed_phrase'));
      return false;
    }
    return true;
  }, [seedPhrase, toastRef]);

  const canShowSeedPhraseWord = useCallback(
    (index: number): boolean =>
      showAllSeedPhrase ||
      errorWordIndexes[index] ||
      index === seedPhraseInputFocusedIndex,
    [showAllSeedPhrase, errorWordIndexes, seedPhraseInputFocusedIndex],
  );

  const handleOnFocus = useCallback(
    (index: number): void => {
      if (!checkValidSeedWord(seedPhrase[seedPhraseInputFocusedIndex])) {
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
      setSeedPhraseInputFocusedIndex(index);
    },
    [setSeedPhraseInputFocusedIndex, seedPhrase, seedPhraseInputFocusedIndex],
  );

  // Effect to notify parent component of seed phrase changes
  useEffect(() => {
    if (onSeedPhraseChange) {
      onSeedPhraseChange(seedPhrase);
    }
  }, [seedPhrase, onSeedPhraseChange]);

  // Effect to notify parent component of validation changes
  useEffect(() => {
    const isValid = validateSeedPhrase();
    const hasError =
      Object.values(errorWordIndexes).some((value) => value) || Boolean(error);
    if (onValidationChange) {
      onValidationChange({
        isValid: isValid && !hasError,
        error,
        seedPhraseLength,
      });
    }
  }, [
    seedPhrase,
    errorWordIndexes,
    error,
    seedPhraseLength,
    onValidationChange,
    validateSeedPhrase,
  ]);

  useEffect(() => {
    if (Object.values(errorWordIndexes).some((value) => value)) {
      setError(strings('import_from_seed.spellcheck_error'));
    } else {
      setError('');
    }
  }, [errorWordIndexes]);

  useEffect(() => {
    seedPhraseInputRefs.current[nextSeedPhraseInputFocusedIndex]?.focus();
  }, [nextSeedPhraseInputFocusedIndex]);

  // Effect to handle QR scan seed
  useEffect(() => {
    if (qrScanSeed && qrScanSeed.length > 0) {
      handleClear();
      setSeedPhrase(qrScanSeed);
      if (onQrScanProcessed) {
        onQrScanProcessed();
      }
    }
  }, [qrScanSeed, onQrScanProcessed, handleClear]);

  return (
    <View style={styles.seedPhraseRoot}>
      <View style={styles.seedPhraseContainer}>
        <View style={styles.seedPhraseInnerContainer}>
          {seedPhrase.length <= 1 ? (
            <TextInput
              ref={(ref) => {
                seedPhraseInputRefs.current[0] = ref;
              }}
              textAlignVertical="top"
              placeholder={strings('import_from_seed.srp_placeholder')}
              value={seedPhrase?.[0] || ''}
              onChangeText={(text) => handleSeedPhraseChange(text, 0)}
              style={styles.seedPhraseDefaultInput}
              placeholderTextColor={colors.text.alternative}
              multiline
              autoFocus
              onKeyPress={(e) => handleKeyPress(e, 0)}
              autoComplete="off"
              blurOnSubmit={false}
              autoCapitalize="none"
              testID={testID || ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}
            />
          ) : (
            <View
              style={[styles.seedPhraseInputContainer]}
              onLayout={handleLayout}
            >
              <FlatList
                data={seedPhrase}
                numColumns={NUM_COLUMNS}
                keyExtractor={(_, index) => index.toString()}
                renderItem={({ item, index }) => (
                  <View
                    style={[
                      {
                        width: containerWidth / NUM_COLUMNS,
                      },
                      styles.inputPadding,
                    ]}
                  >
                    <TextField
                      ref={(ref) => {
                        seedPhraseInputRefs.current[index] = ref;
                      }}
                      startAccessory={
                        <Text
                          variant={TextVariant.BodyMD}
                          color={TextColor.Alternative}
                          style={styles.inputIndex}
                        >
                          {index + 1}.
                        </Text>
                      }
                      value={item}
                      secureTextEntry={!canShowSeedPhraseWord(index)}
                      onFocus={(e) => {
                        if (e?.target && e?.currentTarget?.setNativeProps) {
                          const target = e.target as any;
                          e?.currentTarget?.setNativeProps({
                            selection: {
                              start: target?.value?.length ?? 0,
                              end: target?.value?.length ?? 0,
                            },
                          });
                        }
                        handleOnFocus(index);
                      }}
                      onChangeText={(text) =>
                        handleSeedPhraseChange(text, index)
                      }
                      placeholderTextColor={colors.text.muted}
                      onSubmitEditing={(e) => {
                        // Create a synthetic key press event for consistency
                        const syntheticEvent = {
                          nativeEvent: { key: 'Enter' },
                        } as NativeSyntheticEvent<TextInputKeyPressEventData>;
                        handleKeyPress(syntheticEvent, index, true);
                      }}
                      onKeyPress={(e) => handleKeyPress(e, index)}
                      size={TextFieldSize.Md}
                      style={[styles.input]}
                      autoComplete="off"
                      textAlignVertical="center"
                      showSoftInputOnFocus
                      isError={errorWordIndexes[index]}
                      autoCapitalize="none"
                      numberOfLines={1}
                      autoFocus={index === seedPhrase.length - 1}
                      testID={`${
                        testID ||
                        ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID
                      }_${index}`}
                    />
                  </View>
                )}
              />
            </View>
          )}
        </View>
        <View style={styles.seedPhraseContainerCta}>
          <Button
            variant={ButtonVariants.Link}
            style={styles.pasteButton}
            onPress={toggleShowAllSeedPhrase}
            label={
              showAllSeedPhrase
                ? strings('import_from_seed.hide_all')
                : strings('import_from_seed.show_all')
            }
            width={ButtonWidthTypes.Full}
          />
          <Button
            label={
              seedPhrase.length > 1
                ? strings('import_from_seed.clear_all')
                : strings('import_from_seed.paste')
            }
            variant={ButtonVariants.Link}
            style={styles.pasteButton}
            onPress={() => {
              if (seedPhrase.length > 1) {
                handleClear();
              } else {
                handlePaste(seedPhraseInputFocusedIndex);
              }
            }}
            width={ButtonWidthTypes.Full}
          />
        </View>
      </View>
      {error !== '' && (
        <Text variant={TextVariant.BodySMMedium} color={TextColor.Error}>
          {error}
        </Text>
      )}
    </View>
  );
};

export default SeedPhrase;
