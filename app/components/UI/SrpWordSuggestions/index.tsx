import React, { useMemo } from 'react';
import { ScrollView } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { wordlist } from '@metamask/scure-bip39/dist/wordlists/english';
import ButtonGlass from '../../../component-library/components-temp/ButtonGlass';
import BoxGlass from '../../../component-library/components-temp/BoxGlass';
import { getHardwareTier } from '../../../util/deviceCapability';
import { useNetworkTier } from '../../../hooks/useNetworkTier';
import { useTheme } from '../../../util/theme';
import { SrpWordSuggestionsProps } from './SrpWordSuggestions.types';

/**
 * BIP39 word suggestions shown above the keyboard while a Secret Recovery
 * Phrase is being entered. The glass hides when nothing matches.
 */
const SrpWordSuggestions: React.FC<SrpWordSuggestionsProps> = ({
  currentInputWord,
  onSuggestionSelect,
  onPressIn,
}) => {
  const tw = useTailwind();
  const { shadows } = useTheme();
  const hardware = getHardwareTier();
  const network = useNetworkTier();
  const isLowHardware = hardware === 'LOW' && network !== null;
  const isGlass = network !== 'NONE' && !isLowHardware;

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
    <Box twClassName="mx-2 pb-2">
      <BoxGlass
        radiusClassName="rounded-full"
        isGlass={isGlass}
        isInteractive
        testID="srp-word-suggestions"
        containerStyle={[tw.style('w-full'), shadows.size.md]}
        style={tw.style('h-12 w-full justify-center')}
      >
        <ScrollView
          horizontal
          keyboardShouldPersistTaps="always"
          showsHorizontalScrollIndicator={false}
          style={tw.style('h-full w-full')}
          contentContainerStyle={tw.style('h-full items-center gap-2 px-1')}
        >
          {suggestions.map((word) => (
            <ButtonGlass
              key={word}
              isGlass={isGlass}
              variant={ButtonVariant.Tertiary}
              size={ButtonSize.Md}
              twClassName="self-center"
              onPressIn={onPressIn}
              onPress={() => onSuggestionSelect(word)}
            >
              {word}
            </ButtonGlass>
          ))}
        </ScrollView>
      </BoxGlass>
    </Box>
  );
};

export default SrpWordSuggestions;
