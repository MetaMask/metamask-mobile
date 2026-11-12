import React from 'react';
import {
  Box,
  FontWeight,
  Tag,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { RARITY_COLORS } from './RarityTag.constants';

/** Rarity is a collectibles attribute, not a success/error status. */
const RarityTag = ({
  rarity,
  testID,
}: {
  rarity: keyof typeof RARITY_COLORS;
  testID?: string;
}) => {
  const color = RARITY_COLORS[rarity];
  return (
    <Tag
      twClassName="rounded-full border border-muted bg-transparent px-1.5 py-0"
      testID={testID}
    >
      <Box twClassName="flex-row items-center gap-1">
        <Box
          twClassName="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        <Text variant={TextVariant.BodyXs} fontWeight={FontWeight.Medium}>
          {strings(`collectibles.rarity.${rarity}`)}
        </Text>
      </Box>
    </Tag>
  );
};

export default RarityTag;
