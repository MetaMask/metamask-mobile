import React from 'react';
import { Pressable } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../locales/i18n';
import type { DeckCardType } from '../types';
import { CARD_ACCENTS } from '../constants';
import AnimatedGradientBorder from './AnimatedGradientBorder';

/** Pill hues follow each type's border accent (see CARD_ACCENTS). */
const TYPE_PILL_STYLES: Record<
  DeckCardType,
  { container: string; text: TextColor }
> = {
  crypto: { container: 'bg-info-muted', text: TextColor.InfoDefault },
  perp: { container: 'bg-warning-muted', text: TextColor.WarningDefault },
  prediction: {
    container: 'bg-error-muted',
    text: TextColor.ErrorDefault,
  },
  news: { container: 'bg-muted', text: TextColor.TextAlternative },
  trader: {
    container: 'bg-success-muted',
    text: TextColor.SuccessDefault,
  },
};

export interface CardFrameProps {
  type: DeckCardType;
  /** 1-based position of the card in the deck ("#3"). */
  rank: number;
  /** Tapping anywhere on the body opens the full detail view. */
  onBodyPress: () => void;
  /** Bottom-anchored CTA zone — the easiest thumb target on the card. */
  cta: React.ReactNode;
  children: React.ReactNode;
  testID?: string;
}

/**
 * Shared chrome for every deck card: content-type pill + deck rank on top,
 * tappable body slot in the middle, CTA slot pinned to the bottom.
 */
const CardFrame: React.FC<CardFrameProps> = ({
  type,
  rank,
  onBodyPress,
  cta,
  children,
  testID,
}) => {
  const tw = useTailwind();
  const pill = TYPE_PILL_STYLES[type];

  return (
    <AnimatedGradientBorder colors={CARD_ACCENTS[type]} testID={testID}>
      <Box twClassName="flex-1 p-5">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="mb-3"
        >
          <Box twClassName={`rounded-full px-3 py-1 ${pill.container}`}>
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              color={pill.text}
            >
              {strings(`explore_cards.type_${type}`)}
            </Text>
          </Box>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {`#${rank}`}
          </Text>
        </Box>
        <Pressable
          onPress={onBodyPress}
          style={({ pressed }) => tw.style('flex-1', pressed && 'opacity-70')}
          testID={testID ? `${testID}-body` : undefined}
        >
          {children}
        </Pressable>
        <Box twClassName="mt-4">{cta}</Box>
      </Box>
    </AnimatedGradientBorder>
  );
};

export default CardFrame;
