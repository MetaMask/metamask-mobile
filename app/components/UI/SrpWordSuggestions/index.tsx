import React, { useMemo } from 'react';
import { View, FlatList, Pressable } from 'react-native';
import { useAppTheme } from '../../../util/theme';
import { wordlist } from '@metamask/scure-bip39/dist/wordlists/english';
import { createStyles } from './SrpWordSuggestions.styles';
import { SrpWordSuggestionsProps } from './SrpWordSuggestions.types';
import {
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';

/**
 * SrpWordSuggestions Component
 *
 * Displays BIP39 word suggestions based on the current input word.
 * Used in conjunction with SrpInputGrid for Secret Recovery Phrase input.
 */
const SrpWordSuggestions: React.FC<SrpWordSuggestionsProps> = ({
  currentInputWord,
  onSuggestionSelect,
  onPressIn,
}) => {
  const { colors, themeAppearance } = useAppTheme();
  const styles = createStyles(colors, themeAppearance);

  // Filter BIP39 wordlist based on current input
  const suggestions = useMemo(() => {
    const trimmedWord = currentInputWord.trim().toLowerCase();

    if (!trimmedWord) {
      return [];
    }

    return wordlist.filter((word) => word.startsWith(trimmedWord)).slice(0, 5);
  }, [currentInputWord]);

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <View
      style={styles.suggestionContainer}
      onTouchStart={onPressIn}
      testID="srp-word-suggestions"
    >
      <FlatList
        horizontal
        data={suggestions}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [
              styles.suggestionButton,
              pressed && styles.suggestionPressed,
            ]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPressIn={onPressIn}
            onPress={() => onSuggestionSelect(item)}
          >
            <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
              {item}
            </Text>
          </Pressable>
        )}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.suggestionListContent}
        keyboardShouldPersistTaps="always"
      />
    </View>
  );
};

export default SrpWordSuggestions;
