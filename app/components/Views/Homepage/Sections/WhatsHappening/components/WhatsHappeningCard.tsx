import React, { useMemo } from 'react';
import { TouchableOpacity, Image } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';
import type { WhatsHappeningItem } from '../types';

interface WhatsHappeningCardProps {
  item: WhatsHappeningItem;
  onPress?: (item: WhatsHappeningItem) => void;
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

const WhatsHappeningCard: React.FC<WhatsHappeningCardProps> = ({
  item,
  onPress,
}) => {
  const tw = useTailwind();

  const formattedDate = useMemo(() => formatDate(item.date), [item.date]);

  const handlePress = () => onPress?.(item);

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <Box
        twClassName="w-[280px] rounded-2xl bg-background-muted overflow-hidden"
        gap={3}
      >
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={tw.style('w-full h-[120px]')}
            resizeMode="cover"
          />
        ) : (
          <Box twClassName="w-full h-[120px] bg-background-alternative" />
        )}

        <Box padding={4} paddingTop={0} gap={1}>
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
            numberOfLines={2}
          >
            {item.title}
          </Text>

          {formattedDate && (
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {formattedDate}
            </Text>
          )}

          {item.relatedAssets.length > 0 && (
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {item.relatedAssets.join(', ')}
            </Text>
          )}
        </Box>
      </Box>
    </TouchableOpacity>
  );
};

export default WhatsHappeningCard;
