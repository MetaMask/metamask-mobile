import React from 'react';
import {
  AvatarIcon,
  AvatarIconSeverity,
  AvatarIconSize,
  AvatarToken,
  AvatarTokenSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  IconColor,
  IconName,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  formatSignedUsd,
  type KolPerformanceCommission,
  type KolPerformanceRebate,
} from './rewardsUiFixtures';

export const REBATE_ICONS: Record<KolPerformanceRebate['iconName'], IconName> =
  {
    Candlestick: IconName.Candlestick,
    SwapVertical: IconName.SwapVertical,
    Predictions: IconName.Predictions,
    SwapHorizontal: IconName.SwapHorizontal,
  };

export const PerformanceCommissionRow: React.FC<{
  item: KolPerformanceCommission;
}> = ({ item }) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    twClassName="gap-3"
  >
    <AvatarToken
      name={item.symbol}
      size={AvatarTokenSize.Md}
      testID={`performance-commission-avatar-${item.id}`}
    />
    <Box twClassName="flex-1">
      <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
        {item.label ?? item.symbol}
      </Text>
      <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
        {item.relativeTime}
      </Text>
    </Box>
    <Box alignItems={BoxAlignItems.End}>
      <Text variant={TextVariant.BodyMd} color={TextColor.SuccessDefault}>
        {formatSignedUsd(item.amount)}
      </Text>
      <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
        {item.copiedTimes === 1
          ? strings('rewards.kol.copied_once')
          : strings('rewards.kol.copied_times', {
              count: item.copiedTimes,
            })}
      </Text>
    </Box>
  </Box>
);

export const PerformanceRebateRow: React.FC<{ item: KolPerformanceRebate }> = ({
  item,
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    twClassName="gap-3"
  >
    <AvatarIcon
      iconName={REBATE_ICONS[item.iconName]}
      size={AvatarIconSize.Md}
      severity={AvatarIconSeverity.Neutral}
      iconProps={{ color: IconColor.IconDefault }}
    />
    <Box twClassName="flex-1">
      <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
        {strings(`rewards.kol.${item.titleKey}`)}
      </Text>
      <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
        {item.relativeTime}
      </Text>
    </Box>
    <Text variant={TextVariant.BodyMd} color={TextColor.SuccessDefault}>
      {formatSignedUsd(item.amount)}
    </Text>
  </Box>
);
