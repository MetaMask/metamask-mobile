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
import { CaipAssetType, parseCaipAssetType } from '@metamask/utils';
import { PointsEventDto } from '../../../../../../core/Engine/controllers/rewards-controller/types';
import { getEventDetails, formatRewardsDate } from '../../../utils/formatUtils';
import { getNetworkImageSource } from '../../../../../../util/networks';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../../../component-library/components/Badges/Badge';
import { AvatarSize } from '../../../../../../component-library/components/Avatars/Avatar';

export const ActivityEventRow: React.FC<{
  event: PointsEventDto;
  accountName: string | undefined;
}> = ({ event, accountName }) => {
  const eventDetails = React.useMemo(
    () => (event ? getEventDetails(event, accountName) : undefined),
    [event, accountName],
  );

  // Extract network icon from event asset
  const networkImageSource = React.useMemo(() => {
    if (!event?.payload) return;

    try {
      let assetType: CaipAssetType | undefined;
      if (event.type === 'SWAP' && event.payload.srcAsset?.type) {
        assetType = event.payload.srcAsset.type as CaipAssetType;
      } else if (event.type === 'PERPS' && event.payload.asset?.type) {
        assetType = event.payload.asset.type as CaipAssetType;
      } else {
        return;
      }

      const { chainId } = parseCaipAssetType(assetType);

      return getNetworkImageSource({ chainId });
    } catch (error) {
      return;
    }
  }, [event]);

  if (!event || !eventDetails) return <></>;

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="w-full"
      gap={3}
    >
      <BadgeWrapper
        badgePosition={BadgePosition.BottomRight}
        badgeElement={
          networkImageSource ? (
            <Badge
              variant={BadgeVariant.Network}
              imageSource={networkImageSource}
              size={AvatarSize.Sm}
            />
          ) : null
        }
      >
        <Box
          twClassName="bg-muted rounded-full items-center justify-center size-12"
          flexDirection={BoxFlexDirection.Column}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
        >
          <Icon
            name={eventDetails.icon}
            size={IconSize.Lg}
            twClassName="text-icon-alternative"
          />
        </Box>
      </BadgeWrapper>
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
          <Text
            variant={TextVariant.BodySm}
            twClassName="text-alternative max-w-[60%]"
          >
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
