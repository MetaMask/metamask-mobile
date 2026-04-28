import React, { useMemo } from 'react';
import {
  BadgeWrapper,
  BadgeWrapperPosition,
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  Text,
  TextVariant,
  TextColor,
  Icon,
  IconName,
  IconSize,
  FontWeight,
} from '@metamask/design-system-react-native';
import { Hex } from '@metamask/utils';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import { NetworkBadgeSource } from '../../../AssetOverview/Balance/Balance';
import type {
  OndoGmActivityEntryDto,
  ActivityEntryType,
  ActivityTokenDto,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import {
  formatRewardsDate,
  formatRewardsTimeOnly,
  formatSignedUsd,
  getChainHex,
  shortenAddress,
} from '../../utils/formatUtils';
import { strings } from '../../../../../../locales/i18n';

const ICON_MAP: Record<ActivityEntryType, IconName> = {
  DEPOSIT: IconName.Received,
  WITHDRAW: IconName.Arrow2UpRight,
  REBALANCE: IconName.SwapHorizontal,
  EXTERNAL_OUTFLOW: IconName.Send,
};

const LABEL_KEY_MAP: Record<ActivityEntryType, string> = {
  DEPOSIT: 'rewards.ondo_campaign_activity.type_deposit',
  WITHDRAW: 'rewards.ondo_campaign_activity.type_withdraw',
  REBALANCE: 'rewards.ondo_campaign_activity.type_rebalance',
  EXTERNAL_OUTFLOW: 'rewards.ondo_campaign_activity.type_external_outflow',
};

const tokenLabel = (token: ActivityTokenDto): string =>
  token.tokenSymbol || token.tokenName;

interface OndoActivityRowProps {
  entry: OndoGmActivityEntryDto;
  timeOnly?: boolean;
  testID?: string;
}

const OndoActivityRow: React.FC<OndoActivityRowProps> = ({
  entry,
  timeOnly,
  testID,
}) => {
  const entryType = entry.type as ActivityEntryType;
  const iconName = ICON_MAP[entryType] ?? IconName.Info;
  const labelKey = LABEL_KEY_MAP[entryType];
  const label = labelKey ? strings(labelKey) : entry.type;

  const detail = entry.destToken
    ? `${tokenLabel(entry.srcToken)} → ${tokenLabel(entry.destToken)}`
    : entry.destAddress
      ? `${tokenLabel(entry.srcToken)} → ${shortenAddress(entry.destAddress)}`
      : tokenLabel(entry.srcToken);

  const chainHex = useMemo(
    () => getChainHex(entry.srcToken.tokenAsset),
    [entry.srcToken.tokenAsset],
  );

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="w-full py-3"
      gap={3}
      testID={testID}
    >
      <BadgeWrapper
        position={BadgeWrapperPosition.BottomRight}
        badge={
          chainHex ? (
            <Badge
              variant={BadgeVariant.Network}
              size={AvatarSize.Xs}
              isScaled={false}
              imageSource={NetworkBadgeSource(chainHex as Hex)}
            />
          ) : null
        }
      >
        <Box
          twClassName="bg-muted rounded-full items-center justify-center size-10"
          flexDirection={BoxFlexDirection.Column}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
        >
          <Icon
            name={iconName}
            size={IconSize.Lg}
            twClassName="text-icon-default"
          />
        </Box>
      </BadgeWrapper>

      <Box twClassName="flex-1" justifyContent={BoxJustifyContent.Start}>
        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
        >
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {label}
          </Text>
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {formatSignedUsd(entry.usdAmount)}
          </Text>
        </Box>

        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
        >
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            twClassName="max-w-[60%]"
            numberOfLines={1}
          >
            {detail}
          </Text>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {timeOnly
              ? formatRewardsTimeOnly(new Date(entry.timestamp))
              : formatRewardsDate(new Date(entry.timestamp))}
          </Text>
        </Box>
      </Box>
    </Box>
  );
};

export default OndoActivityRow;
