import React from 'react';
import {
  Box,
  Text,
  TextVariant,
  BoxFlexDirection,
  TextColor,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../../locales/i18n';
import { formatNumber, formatRewardsDate } from '../../../../utils/formatUtils';
import { useSelector } from 'react-redux';
import { selectAvatarAccountType } from '../../../../../../../selectors/settings';
import {
  AvatarAccountType,
  AvatarSize,
} from '../../../../../../../component-library/components/Avatars/Avatar';
import AvatarAccount from '../../../../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import MetamaskRewardsPointsImage from '../../../../../../../images/rewards/metamask-rewards-points.svg';
import { PointsEventDto } from '../../../../../../../core/Engine/controllers/rewards-controller/types';

export const DetailsRow: React.FC<
  React.PropsWithChildren<{ label: string }>
> = ({ label, children }) => (
  <Box flexDirection={BoxFlexDirection.Row}>
    <Text
      variant={TextVariant.BodySm}
      color={TextColor.TextAlternative}
      twClassName="flex-1"
    >
      {label}
    </Text>
    {children}
  </Box>
);

export const GenericEventDetails: React.FC<{
  event: PointsEventDto;
  accountName?: string;
  extraDetails?: React.ReactNode;
}> = ({ event, accountName, extraDetails }) => {
  const avatarAccountType: AvatarAccountType = useSelector(
    selectAvatarAccountType,
  );

  return (
    <Box twClassName="w-full">
      <Box twClassName="gap-6">
        {/* Details section */}
        <Box twClassName="gap-2">
          {/* Title */}
          <Text variant={TextVariant.HeadingSm}>
            {strings('rewards.events.details')}
          </Text>

          {/* Date */}
          <DetailsRow label={strings('rewards.events.date')}>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {formatRewardsDate(new Date(event.timestamp))}
            </Text>
          </DetailsRow>

          {/* Account */}
          {event.accountAddress && avatarAccountType && (
            <DetailsRow label={strings('rewards.events.account')}>
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                twClassName="gap-1.5"
              >
                <AvatarAccount
                  accountAddress={event.accountAddress}
                  type={avatarAccountType}
                  size={AvatarSize.Sm}
                />
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.InfoDefault}
                >
                  {accountName}
                </Text>
              </Box>
            </DetailsRow>
          )}
          {extraDetails}
        </Box>

        {/* Points section */}
        <Box twClassName="gap-2">
          <Text variant={TextVariant.HeadingSm}>
            {strings('rewards.events.points')}
          </Text>
          {/* Base points */}
          <DetailsRow label={strings('rewards.events.points_base')}>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {formatNumber(event.value - (event.bonus?.bonusPoints ?? 0))}
            </Text>
          </DetailsRow>

          {/* Boost */}
          {event.bonus?.bonusPoints && (
            <DetailsRow label={strings('rewards.events.points_boost')}>
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {formatNumber(event.bonus.bonusPoints)}
              </Text>
            </DetailsRow>
          )}

          {/* Total points */}
          <Box flexDirection={BoxFlexDirection.Row}>
            <Text variant={TextVariant.BodySm} twClassName="flex-1">
              {strings('rewards.events.points_total')}
            </Text>
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="gap-1"
            >
              <MetamaskRewardsPointsImage
                width={16}
                height={16}
                name="MetamaskRewardsPoints"
              />
              <Text variant={TextVariant.BodySm}>
                {formatNumber(event.value)}
              </Text>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
