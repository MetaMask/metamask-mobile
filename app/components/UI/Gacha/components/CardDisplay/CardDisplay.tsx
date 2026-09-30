import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxFlexWrap,
  BoxJustifyContent,
  Card,
  KeyValueRow,
  Tag,
  TagSeverity,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { GachaCardDisplayTestIds } from '../../Gacha.testIds';
import type { CollectorCryptCard } from '../../providers/collector-crypt/types';
import { formatUsd } from '../../providers/collector-crypt/utils/format';
import CardImage from '../CardImage';
import {
  RARITY_TAG_SEVERITY,
  getGradeLabel,
  getRarityLabel,
} from './cardLabels';

export interface CardDisplayProps {
  card: CollectorCryptCard;
}

/** Large card presentation: image, name, grade and rarity tags, value. */
const CardDisplay = ({ card }: CardDisplayProps) => {
  const gradeLabel = getGradeLabel(card);

  return (
    <Box
      alignItems={BoxAlignItems.Center}
      gap={4}
      twClassName="w-full"
      testID={GachaCardDisplayTestIds.CONTAINER}
    >
      <Box twClassName="w-3/4 max-w-64">
        <CardImage
          uri={card.image}
          roundedClassName="rounded-2xl"
          accessibilityLabel={card.name}
        />
      </Box>
      <Box alignItems={BoxAlignItems.Center} gap={2} twClassName="w-full">
        <Text
          variant={TextVariant.HeadingMd}
          twClassName="text-center"
          testID={GachaCardDisplayTestIds.NAME}
        >
          {card.name}
        </Text>
        {(gradeLabel || card.rarity) && (
          <Box
            flexDirection={BoxFlexDirection.Row}
            flexWrap={BoxFlexWrap.Wrap}
            justifyContent={BoxJustifyContent.Center}
            gap={2}
          >
            {gradeLabel && (
              <Tag
                severity={TagSeverity.Neutral}
                testID={GachaCardDisplayTestIds.GRADE}
              >
                {gradeLabel}
              </Tag>
            )}
            {card.rarity && (
              <Tag
                severity={RARITY_TAG_SEVERITY[card.rarity]}
                testID={GachaCardDisplayTestIds.RARITY}
              >
                {getRarityLabel(card.rarity)}
              </Tag>
            )}
          </Box>
        )}
      </Box>
      {card.insuredValue !== undefined && (
        <Card twClassName="w-full">
          <KeyValueRow
            keyLabel={strings('gacha.reveal.value')}
            value={
              <Text
                variant={TextVariant.HeadingMd}
                testID={GachaCardDisplayTestIds.VALUE}
              >
                {formatUsd(card.insuredValue)}
              </Text>
            }
          />
        </Card>
      )}
    </Box>
  );
};

export default CardDisplay;
