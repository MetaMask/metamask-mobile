import React from 'react';
import { Image } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
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

export const ActivityEventRow: React.FC<{
  event: PointsEventDto;
}> = ({ event }) => {
  const tw = useTailwind();
  const eventDetails = React.useMemo(
    () => (event ? getEventDetails(event) : undefined),
    [event],
  );

  if (!event || !eventDetails) return <></>;

  const isSVG = eventDetails?.badgeImageUri?.includes('.svg');

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="w-full"
      gap={3}
    >
      <Box
        twClassName="bg-muted rounded-full items-center justify-center size-12 relative"
        flexDirection={BoxFlexDirection.Column}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
      >
        <Icon name={eventDetails.icon} size={IconSize.Lg} />
        {eventDetails.badgeImageUri && (
          <Box twClassName="absolute -bottom-1 -right-1 bg-muted items-center justify-center size-5 z-10">
            {isSVG ? (
              <SvgUri
                uri={eventDetails.badgeImageUri}
                width="100%"
                height="100%"
                style={tw.style('size-4')}
              />
            ) : (
              <Image
                source={{ uri: eventDetails.badgeImageUri }}
                style={tw.style('size-4')}
                resizeMode="contain"
              />
            )}
          </Box>
        )}
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
            <Text>{`${event.value > 0 ? '+' : ''}${event.value}`}</Text>
            {event.bonus?.bips && (
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
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
          <Text variant={TextVariant.BodySm} twClassName="text-alternative">
            {eventDetails.details}
          </Text>
          <Text variant={TextVariant.BodySm} twClassName="text-alternative">
            {formatRewardsDate(new Date(event.timestamp).getTime())}
          </Text>
        </Box>
      </Box>
    </Box>
  );
};
