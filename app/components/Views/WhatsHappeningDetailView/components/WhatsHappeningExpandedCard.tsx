import React from 'react';
import { ScrollView } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { WhatsHappeningItem } from '../../Homepage/Sections/WhatsHappening/types';
import TokenRow from './TokenRow';

interface WhatsHappeningExpandedCardProps {
  item: WhatsHappeningItem;
  cardWidth: number;
}

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
  cardWidth,
}) => {
  const tw = useTailwind();
  const impactLabel = getImpactLabel(item.impact);
  const impactStyles = getImpactStyles(item.impact);

  return (
    <Box style={{ width: cardWidth }} twClassName="flex-1">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw.style('pb-4 flex-grow')}
      >
        <Box
          twClassName="rounded-2xl bg-background-muted overflow-hidden flex-1"
          gap={4}
          padding={5}
        >
          {/* Impact badge */}
          <Box twClassName={impactStyles.containerClass}>
            <Text variant={TextVariant.BodySm} color={impactStyles.textColor}>
              {impactLabel}
            </Text>
          </Box>

          {/* Title */}
          <Text
            variant={TextVariant.HeadingLg}
            fontWeight={FontWeight.Bold}
            color={TextColor.TextDefault}
          >
            {item.title}
          </Text>

          {/* Tokens section */}
          {item.relatedAssets.length > 0 && (
            <Box gap={1}>
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
              >
                Tokens
              </Text>

              {item.relatedAssets.map((asset) => (
                <TokenRow key={asset.sourceAssetId} asset={asset} />
              ))}
            </Box>
          )}
        </Box>
      </ScrollView>
    </Box>
  );
};

export default WhatsHappeningExpandedCard;
