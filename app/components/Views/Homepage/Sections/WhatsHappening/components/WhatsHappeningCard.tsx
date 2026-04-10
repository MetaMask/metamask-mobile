import React, { useMemo } from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  BoxJustifyContent,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  BoxFlexDirection,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import type { WhatsHappeningItem } from '../types';
import { formatShortDate } from '../util/formatDate';

interface WhatsHappeningCardProps {
  item: WhatsHappeningItem;
  onPress?: (item: WhatsHappeningItem) => void;
}

const WhatsHappeningCard: React.FC<WhatsHappeningCardProps> = ({
  item,
  onPress,
}) => {
  const formattedDate = useMemo(() => formatShortDate(item.date), [item.date]);

  const handlePress = () => onPress?.(item);

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <Box
        twClassName="w-[280px] h-[248px] rounded-2xl bg-background-muted overflow-hidden"
        padding={4}
        justifyContent={BoxJustifyContent.Between}
        gap={3}
      >
        <Box gap={3}>
          {/* Category badge */}
          {item.category && (
            <Box twClassName="self-start rounded-full bg-background-default px-2 py-0.5">
              <Text
                variant={TextVariant.BodyXs}
                color={TextColor.TextAlternative}
                fontWeight={FontWeight.Medium}
              >
                {strings(
                  `homepage.sections.whats_happening_categories.${item.category}`,
                )}
              </Text>
            </Box>
          )}

          {/* Title */}
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
            numberOfLines={3}
          >
            {item.title}
          </Text>

          {/* Description */}
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            numberOfLines={3}
          >
            {item.description}
          </Text>
        </Box>

        {/* Footer: asset pills + date */}
        <Box gap={2}>
          {item.relatedAssets.length > 0 && (
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="flex-wrap gap-1"
            >
              {item.relatedAssets.map((asset) => (
                <Box
                  key={asset.sourceAssetId}
                  twClassName="rounded-full bg-background-default px-2 py-0.5"
                >
                  <Text
                    variant={TextVariant.BodyXs}
                    color={TextColor.TextDefault}
                    fontWeight={FontWeight.Medium}
                  >
                    {asset.symbol}
                  </Text>
                </Box>
              ))}
            </Box>
          )}

          {formattedDate && (
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextAlternative}
            >
              {formattedDate}
            </Text>
          )}
        </Box>
      </Box>
    </TouchableOpacity>
  );
};

export default WhatsHappeningCard;
