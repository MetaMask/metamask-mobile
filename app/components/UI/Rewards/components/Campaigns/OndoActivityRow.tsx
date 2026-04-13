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
import { formatRewardsDate, getChainHex } from '../../utils/formatUtils';
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

const formatUsdAmount = (raw: string | null): string => {
  if (raw === null) return '—';
  const num = parseFloat(raw);
  if (Number.isNaN(num)) return raw;
  const sign = num > 0 ? '+' : num < 0 ? '-' : '';
  return `${sign}$${Math.abs(num).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const tokenLabel = (token: ActivityTokenDto): string =>
  token.tokenSymbol || token.tokenName;

interface OndoActivityRowProps {
  entry: OndoGmActivityEntryDto;
  testID?: string;
}

const OndoActivityRow: React.FC<OndoActivityRowProps> = ({ entry, testID }) => {
  const entryType = entry.type as ActivityEntryType;
  const iconName = ICON_MAP[entryType] ?? IconName.Info;
  const labelKey = LABEL_KEY_MAP[entryType];
  const label = labelKey ? strings(labelKey) : entry.type;

  const detail = entry.destToken
    ? `${tokenLabel(entry.srcToken)} → ${tokenLabel(entry.destToken)}`
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
            twClassName="text-icon-alternative"
          />
        </Box>
      </BadgeWrapper>

      <Box twClassName="flex-1" justifyContent={BoxJustifyContent.Start}>
        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
        >
          <Text variant={TextVariant.BodyMd}>{label}</Text>
          <Text variant={TextVariant.BodyMd}>
            {formatUsdAmount(entry.usdAmount)}
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
            {formatRewardsDate(new Date(entry.timestamp))}
          </Text>
        </Box>
      </Box>
    </Box>
  );
};

export default OndoActivityRow;
