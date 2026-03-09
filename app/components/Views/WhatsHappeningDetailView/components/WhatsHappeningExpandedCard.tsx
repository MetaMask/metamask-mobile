import React, { useMemo } from 'react';
import { Dimensions, ScrollView } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  BoxFlexDirection,
  BoxFlexWrap,
} from '@metamask/design-system-react-native';
import type { WhatsHappeningItem } from '../../Homepage/Sections/WhatsHappening/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Leave some peek space so the user can see the next card's edge
const HORIZONTAL_PADDING = 16;
export const CARD_WIDTH = SCREEN_WIDTH - HORIZONTAL_PADDING * 2;

interface WhatsHappeningExpandedCardProps {
  item: WhatsHappeningItem;
}

const formatDate = (dateString: string): string | null => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return null;
  }
};

const getImpactLabel = (impact: WhatsHappeningItem['impact']): string => {
  switch (impact) {
    case 'positive':
      return 'Bullish';
    case 'negative':
      return 'Bearish';
    default:
      return 'Neutral';
  }
};

const getImpactStyles = (
  impact: WhatsHappeningItem['impact'],
): { containerClass: string; textColor: TextColor } => {
  switch (impact) {
    case 'positive':
      return {
        containerClass: 'bg-success-muted rounded px-2 py-1 self-start',
        textColor: TextColor.SuccessDefault,
      };
    case 'negative':
      return {
        containerClass: 'bg-error-muted rounded px-2 py-1 self-start',
        textColor: TextColor.ErrorDefault,
      };
    default:
      return {
        containerClass: 'bg-muted rounded px-2 py-1 self-start',
        textColor: TextColor.TextAlternative,
      };
  }
};

const WhatsHappeningExpandedCard: React.FC<WhatsHappeningExpandedCardProps> = ({
  item,
}) => {
  const tw = useTailwind();
  const formattedDate = useMemo(() => formatDate(item.date), [item.date]);
  const impactLabel = getImpactLabel(item.impact);
  const impactStyles = getImpactStyles(item.impact);

  return (
    <Box style={{ width: SCREEN_WIDTH }} twClassName="px-4">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw.style('pb-4')}
      >
        <Box
          twClassName="rounded-2xl bg-background-muted overflow-hidden"
          padding={5}
          gap={4}
        >
          {/* Impact badge */}
          <Box twClassName={impactStyles.containerClass}>
            <Text variant={TextVariant.BodySm} color={impactStyles.textColor}>
              {impactLabel}
            </Text>
          </Box>

          {/* Title */}
          <Text
            variant={TextVariant.HeadingMd}
            fontWeight={FontWeight.Bold}
            color={TextColor.TextDefault}
          >
            {item.title}
          </Text>

          {/* Description */}
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {item.description}
          </Text>

          {/* Related Assets */}
          {item.relatedAssets.length > 0 && (
            <Box gap={2}>
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                Related assets
              </Text>
              <Box
                flexDirection={BoxFlexDirection.Row}
                flexWrap={BoxFlexWrap.Wrap}
                gap={2}
              >
                {item.relatedAssets.map((asset) => (
                  <Box
                    key={asset}
                    twClassName="bg-muted rounded-full px-3 py-1"
                  >
                    <Text
                      variant={TextVariant.BodySm}
                      color={TextColor.TextDefault}
                    >
                      {asset}
                    </Text>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* Date */}
          {formattedDate && (
            <Box twClassName="border-t border-muted pt-4">
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {formattedDate}
              </Text>
            </Box>
          )}
        </Box>
      </ScrollView>
    </Box>
  );
};

export default WhatsHappeningExpandedCard;
