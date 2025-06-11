import React, { forwardRef } from 'react';
import {
  View,
  FlatList,
  LayoutChangeEvent,
  TextInput,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from 'react-native';
import { useTheme } from '../../../../util/theme';
import SeedPhraseGridItem from './SeedPhraseGridItem';
import { NUM_COLUMNS } from '../constant';
import createStyles from '../styles';

interface SeedPhraseGridProps {
  seedPhrase: string[];
  containerWidth: number;
  errorWordIndexes: Record<number, boolean>;
  canShowSeedPhraseWord: (index: number) => boolean;
  onLayout: (event: LayoutChangeEvent) => void;
  onFocus: (index: number) => void;
  onChangeText: (text: string, index: number) => void;
  onKeyPress: (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number,
  ) => void;
  seedPhraseInputRefs: React.MutableRefObject<(TextInput | null)[]>;
  testID?: string;
}

const SeedPhraseGrid: React.FC<SeedPhraseGridProps> = ({
  seedPhrase,
  containerWidth,
  errorWordIndexes,
  canShowSeedPhraseWord,
  onLayout,
  onFocus,
  onChangeText,
  onKeyPress,
  seedPhraseInputRefs,
  testID,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={[styles.seedPhraseInputContainer]} onLayout={onLayout}>
      <FlatList
        data={seedPhrase}
        numColumns={NUM_COLUMNS}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item, index }) => (
          <SeedPhraseGridItem
            ref={(ref) => {
              seedPhraseInputRefs.current[index] = ref;
            }}
            index={index}
            value={item}
            width={containerWidth / NUM_COLUMNS}
            isSecure={!canShowSeedPhraseWord(index)}
            isError={errorWordIndexes[index]}
            isAutoFocus={index === seedPhrase.length - 1}
            onFocus={onFocus}
            onChangeText={onChangeText}
            onKeyPress={onKeyPress}
            testID={testID}
          />
        )}
      />
    </View>
  );
};

export default SeedPhraseGrid;
