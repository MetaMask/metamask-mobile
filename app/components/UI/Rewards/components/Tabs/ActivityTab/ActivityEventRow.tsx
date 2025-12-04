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
import { useNavigation } from '@react-navigation/native';
import { CaipAssetType, parseCaipAssetType } from '@metamask/utils';
import {
  CardEventPayload,
  PerpsEventPayload,
  PointsEventDto,
  SwapEventPayload,
} from '../../../../../../core/Engine/controllers/rewards-controller/types';
import { formatRewardsDate, formatNumber } from '../../../utils/formatUtils';
import { getEventDetails } from '../../../utils/eventDetailsUtils';
import { getNetworkImageSource } from '../../../../../../util/networks';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../../../component-library/components/Badges/Badge';
import { AvatarSize } from '../../../../../../component-library/components/Avatars/Avatar';
import Logger from '../../../../../../util/Logger';
import { openActivityDetailsSheet } from './EventDetails/ActivityDetailsSheet';
import { TouchableOpacity } from 'react-native';
import { useActivityDetailsConfirmAction } from '../../../hooks/useActivityDetailsConfirmAction';
import { REWARDS_VIEW_SELECTORS } from '../../../Views/RewardsView.constants';
import { useSelector } from 'react-redux';
import { selectSeasonActivityTypes } from '../../../../../../reducers/rewards/selectors';

export const ActivityEventRow: React.FC<{
  event: PointsEventDto;
  accountName: string | undefined;
  testID?: string;
}> = ({ event, accountName, testID }) => {
  const navigation = useNavigation();
  const activityTypes = useSelector(selectSeasonActivityTypes);

  const eventDetails = React.useMemo(
    () =>
      event ? getEventDetails(event, activityTypes, accountName) : undefined,
    [event, accountName, activityTypes],
  );

  const confirmAction = useActivityDetailsConfirmAction(event);

  // Extract network icon from event asset
  const networkImageSource = React.useMemo(() => {
    if (!event?.payload) return;

    try {
      let assetType: CaipAssetType | undefined;
      let chainId: string | undefined;

      if (
        event.type === 'SWAP' &&
        (event.payload as SwapEventPayload).srcAsset?.type
      ) {
        assetType = (event.payload as SwapEventPayload).srcAsset
          .type as CaipAssetType;
        chainId = parseCaipAssetType(assetType).chainId;
      } else if (
        event.type === 'PERPS' &&
        (event.payload as PerpsEventPayload).asset?.type
      ) {
        assetType = (event.payload as PerpsEventPayload).asset
          .type as CaipAssetType;
        chainId = parseCaipAssetType(assetType).chainId;
      } else if (
        event.type === 'CARD' &&
        (event.payload as CardEventPayload).asset?.type
      ) {
        assetType = (event.payload as CardEventPayload).asset
          .type as CaipAssetType;
        chainId = parseCaipAssetType(assetType).chainId;
      } else {
        return;
      }

      if (!chainId) return;

      return getNetworkImageSource({ chainId });
    } catch (error) {
      Logger.error(
        error as Error,
        'ActivityEventRow: Failed to derive network image source from event payload',
      );
      return;
    }
  }, [event]);

  if (!event || !eventDetails) return <></>;

  const handlePress = () => {
    openActivityDetailsSheet(navigation, {
      event,
      accountName,
      activityTypes,
      confirmAction,
    });
  };

  return (
    <TouchableOpacity activeOpacity={0.5} onPress={handlePress}>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="w-full py-3"
        gap={3}
        testID={testID}
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
              <Text
                testID={`${REWARDS_VIEW_SELECTORS.ACTIVITY_EVENT_ROW_TITLE}-${testID}`}
              >
                {eventDetails.title}
              </Text>
            </Box>

            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.End}
            >
              <Text
                testID={`${REWARDS_VIEW_SELECTORS.ACTIVITY_EVENT_ROW_VALUE}-${testID}`}
              >{`${event.value > 0 ? '+' : ''}${formatNumber(
                event.value,
              )}`}</Text>
              {event.bonus?.bips && (
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                  twClassName="ml-1"
                  testID={`${REWARDS_VIEW_SELECTORS.ACTIVITY_EVENT_ROW_BONUS}-${testID}`}
                >
                  +{event.bonus.bips / 100}%
                </Text>
              )}
            </Box>
          </Box>

          <Box flexDirection={BoxFlexDirection.Row}>
            <Text
              variant={TextVariant.BodySm}
              twClassName="text-alternative flex-1 max-w-[60%]"
              testID={`${REWARDS_VIEW_SELECTORS.ACTIVITY_EVENT_ROW_DETAILS}-${testID}`}
            >
              {eventDetails.details}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              twClassName="text-alternative flex-1 text-right"
              testID={`${REWARDS_VIEW_SELECTORS.ACTIVITY_EVENT_ROW_DATE}-${testID}`}
            >
              {formatRewardsDate(new Date(event.timestamp))}
            </Text>
          </Box>
        </Box>
      </Box>
    </TouchableOpacity>
  );
};
