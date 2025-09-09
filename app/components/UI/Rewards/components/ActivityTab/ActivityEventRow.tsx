import React from 'react';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  Text,
  TextVariant,
  Icon,
  IconSize,
  BoxJustifyContent,
  TextColor,
} from '@metamask/design-system-react-native';
import { PointsEventDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import { getEventDetails, formatRewardsDate } from '../../utils/formatUtils';

export const ActivityEventRow: React.FC<{ event: PointsEventDto }> = ({
  event,
}) => {
  const eventDetails = getEventDetails(event);

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="w-full"
      gap={3}
    >
      <Box
        twClassName="bg-muted rounded-full items-center justify-center size-12"
        flexDirection={BoxFlexDirection.Column}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
      >
        <Icon name={eventDetails.icon} size={IconSize.Lg} />
      </Box>
      <Box twClassName="flex-1" justifyContent={BoxJustifyContent.Start}>
        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.End}
            gap={1}
          >
            <Text>{eventDetails.title}</Text>
          </Box>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.End}
          >
            <Text>{`+${event.value}`}</Text>
            {event.bonus?.bips && (
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextMuted}
                twClassName="ml-1"
              >
                +{event.bonus?.bips / 100}%
              </Text>
            )}
          </Box>
        </Box>
        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
        >
          <Text variant={TextVariant.BodySm} twClassName="text-muted">
            {eventDetails.details}
          </Text>
          <Text variant={TextVariant.BodySm} twClassName="text-muted">
            {formatRewardsDate(event.timestamp.getTime())}
          </Text>
        </Box>
      </Box>
    </Box>
  );
};
