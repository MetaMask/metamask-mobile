import React, { useCallback, useEffect, useRef, useState } from 'react';
import createStyles from './SeedPhraseGrid.style';
import { useTheme } from '../../../util/theme';
import { FlatList, View, TextInput } from 'react-native';
import {
  NUM_COLUMNS,
  SPACE_CHAR,
} from '../ImportFromSecretRecoveryPhrase/constant';
import TextField, {
  TextFieldSize,
} from '../../../component-library/components/Form/TextField';
import { ImportFromSeedSelectorsIDs } from '../../../../e2e/selectors/Onboarding/ImportFromSeed.selectors';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import {
  checkValidSeedWord,
  SeedPhraseErrorIndexes,
} from '../../../util/mnemonic';

interface SeedPhraseGridProps {
  seedPhrase: string[];
  setSeedPhrase: (seedPhrase: string[]) => void;
  isEditable: boolean;
  canShowSeedPhraseWord: (index: number) => boolean;
  onErrorChange?: (
    hasErrors: boolean,
    errorIndexes: SeedPhraseErrorIndexes,
  ) => void;
  onFocusChange?: (focusedIndex: number) => void;
}

export const SeedPhraseGrid = ({
  seedPhrase,
  setSeedPhrase,
  isEditable,
  canShowSeedPhraseWord,
  onErrorChange,
  onFocusChange,
}: SeedPhraseGridProps) => {
  const seedPhraseInputRefs = useRef<React.RefObject<TextInput>[]>(
    Array(seedPhrase.length)
      .fill(null)
      .map(() => React.createRef<TextInput>()),
  );
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [seedPhraseInputFocusedIndex, setSeedPhraseInputFocusedIndex] =
    useState<number>(0);
  const [nextSeedPhraseInputFocusedIndex, setNextSeedPhraseInputFocusedIndex] =
    useState<number>(0);
  const [errorWordIndexes, setErrorWordIndexes] =
    useState<SeedPhraseErrorIndexes>({});

  const handleLayout = (event: {
    nativeEvent: { layout: { width: number } };
  }) => {
    setContainerWidth(event.nativeEvent.layout.width);
  };

  const handleOnFocus = useCallback(
    (index: number) => {
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
      if (onFocusChange) {
        onFocusChange(index);
      }
    },
    [seedPhrase, seedPhraseInputFocusedIndex, onFocusChange],
  );

  const handleSeedPhraseChange = useCallback(
    (text: string, index: number) => {
      if (text.includes(SPACE_CHAR)) {
        const isEndWithSpace = text.at(-1) === SPACE_CHAR;
        const splitArray = text.trim().split(' ');
        const currentErrorWordIndexes: SeedPhraseErrorIndexes = {
          ...errorWordIndexes,
        };
        splitArray.forEach((x, currentIndex) => {
          currentErrorWordIndexes[index + currentIndex] =
            !checkValidSeedWord(x);
        });
        const prev = seedPhrase;
        const endSlices = prev.slice(index + 1);
        if (endSlices.length === 0 && isEndWithSpace) {
          endSlices.push('');
        } else if (isEndWithSpace) {
          endSlices.unshift('');
        }
        setSeedPhrase([...prev.slice(0, index), ...splitArray, ...endSlices]);
        setErrorWordIndexes(currentErrorWordIndexes);
        setNextSeedPhraseInputFocusedIndex(index + splitArray.length);
      } else {
        const prev = seedPhrase;
        const newSeedPhrase = [...prev];
        newSeedPhrase[index] = text.trim();
        setSeedPhrase(newSeedPhrase);
      }
    },
    [
      setSeedPhrase,
      setNextSeedPhraseInputFocusedIndex,
      setErrorWordIndexes,
      errorWordIndexes,
      seedPhrase,
    ],
  );

  useEffect(() => {
    seedPhraseInputRefs.current[
      nextSeedPhraseInputFocusedIndex
    ]?.current?.focus();
  }, [nextSeedPhraseInputFocusedIndex]);

  useEffect(() => {
    if (onErrorChange) {
      const hasErrors = Object.values(errorWordIndexes).some((value) => value);
      onErrorChange(hasErrors, errorWordIndexes);
    }
  }, [errorWordIndexes, onErrorChange]);

  const handleKeyPress = (
    e: { nativeEvent: { key: string } },
    index: number,
  ) => {
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

  return (
    <View style={[styles.seedPhraseInputContainer]} onLayout={handleLayout}>
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
              ref={seedPhraseInputRefs.current[index]}
              startAccessory={
                <Text
                  variant={TextVariant.BodyMD}
                  color={TextColor.Alternative}
                  style={styles.inputIndex}
                >
                  {index + 1}.
                </Text>
              }
              isReadonly={!isEditable}
              value={item}
              secureTextEntry={!canShowSeedPhraseWord(index)}
              onFocus={() => handleOnFocus(index)}
              onChangeText={(text: string) =>
                handleSeedPhraseChange(text, index)
              }
              placeholderTextColor={colors.text.muted}
              onKeyPress={(e) => handleKeyPress(e, index)}
              size={TextFieldSize.Md}
              style={[styles.input]}
              autoComplete="off"
              textAlignVertical="center"
              showSoftInputOnFocus
              isError={!!errorWordIndexes[index]}
              autoCapitalize="none"
              numberOfLines={1}
              autoFocus={index === seedPhrase.length - 1}
              testID={`${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}_${index}`}
            />
          </View>
        )}
      />
    </View>
  );
};
