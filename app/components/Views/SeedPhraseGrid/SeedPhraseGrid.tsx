import React, { useCallback, useEffect, useRef, useState } from 'react';
import createStyles from './SeedPhraseGrid.style';
import { useTheme } from '../../../util/theme';
import { FlatList, View } from 'react-native';
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
import { wordlist } from '@metamask/scure-bip39/dist/wordlists/english';

interface SeedPhraseGridProps {
  seedPhrase: string[];
  setSeedPhrase: (seedPhrase: string[]) => void;
  isEditable: boolean;
  canShowSeedPhraseWord: (index: number) => boolean;
  hideSeedPhraseInput: boolean;
  showAllSeedPhrase: boolean;
}

const checkValidSeedWord = (text: string) => wordlist.includes(text);

export const SeedPhraseGrid = ({
  seedPhrase,
  setSeedPhrase,
  isEditable,
  canShowSeedPhraseWord,
  hideSeedPhraseInput,
  showAllSeedPhrase,
}: SeedPhraseGridProps) => {
  const seedPhraseInputRefs = useRef([]);
  const { colors, themeAppearance } = useTheme();
  const styles = createStyles(colors);
  const [showPasswordIndex, setShowPasswordIndex] = useState([0, 1]);
  const [containerWidth, setContainerWidth] = useState(0);
  const [seedPhraseInputFocusedIndex, setSeedPhraseInputFocusedIndex] =
    useState(0);
  const [nextSeedPhraseInputFocusedIndex, setNextSeedPhraseInputFocusedIndex] =
    useState(0);
  const [errorWordIndexes, setErrorWordIndexes] = useState({});

  const handleLayout = (event: {
    nativeEvent: { layout: { width: React.SetStateAction<number> } };
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
    },
    [setSeedPhraseInputFocusedIndex, seedPhrase, seedPhraseInputFocusedIndex],
  );

  const handleSeedPhraseChange = useCallback(
    (text: string, index: number) => {
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
        }, []);

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

  useEffect(() => {
    seedPhraseInputRefs.current[nextSeedPhraseInputFocusedIndex]?.focus();
  }, [nextSeedPhraseInputFocusedIndex]);

  const handleKeyPress = (
    e: { nativeEvent: { key: string } },
    index: number,
    enterPressed = false,
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
              isReadonly={!isEditable}
              value={item}
              secureTextEntry={!canShowSeedPhraseWord(index)}
              onFocus={(e) => {
                if (e?.target && e?.currentTarget?.setNativeProps) {
                  e?.currentTarget?.setNativeProps({
                    selection: {
                      start: e?.target?.value?.length ?? 0,
                      end: e?.target?.value?.length ?? 0,
                    },
                  });
                }
                handleOnFocus(index);
              }}
              onChangeText={(text) => handleSeedPhraseChange(text, index)}
              placeholderTextColor={colors.text.muted}
              onSubmitEditing={(e) => {
                handleKeyPress(e, index, true);
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
              testID={`${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}_${index}`}
            />
          </View>
        )}
      />
    </View>
  );
};
