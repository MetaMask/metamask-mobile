import React from 'react';
import {
  AvatarBase,
  AvatarBaseShape,
  AvatarBaseSize,
  AvatarIcon,
  AvatarIconSeverity,
  AvatarIconSize,
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
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import HandCoinsIcon from '../../../../../images/rewards/hand-coins.svg';
import UsersThreeIcon from '../../../../../images/rewards/users-three.svg';
import {
  formatSignedUsd,
  KOL_EARNINGS_FIXTURE,
  type KolEarningsHistoryKind,
} from './rewardsUiFixtures';

/** Phosphor SVGs have no design-system `IconName`, so they render as components. */
type SvgIconComponent = typeof HandCoinsIcon;

const HISTORY_ICON: Record<
  KolEarningsHistoryKind,
  IconName | SvgIconComponent
> = {
  claimed: IconName.Arrow2UpRight,
  commission: IconName.Copy,
  promo: IconName.Star,
  rebate: HandCoinsIcon,
  referrals: UsersThreeIcon,
};

export const HistoryKindAvatar: React.FC<{ kind: KolEarningsHistoryKind }> = ({
  kind,
}) => {
  const tw = useTailwind();
  const icon = HISTORY_ICON[kind];

  if (typeof icon === 'string') {
    return (
      <AvatarIcon
        iconName={icon}
        size={AvatarIconSize.Md}
        severity={AvatarIconSeverity.Neutral}
        iconProps={{ color: IconColor.IconDefault }}
      />
    );
  }

  const PhosphorIcon = icon;

  return (
    <AvatarBase
      size={AvatarBaseSize.Md}
      shape={AvatarBaseShape.Circle}
      accessibilityRole="image"
      twClassName="bg-muted"
    >
      <PhosphorIcon
        name={kind}
        fill="currentColor"
        style={tw.style(IconColor.IconDefault, 'w-5 h-5')}
      />
    </AvatarBase>
  );
};

export const EarningsHistoryRow: React.FC<{
  item: (typeof KOL_EARNINGS_FIXTURE.history)[number];
}> = ({ item }) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    twClassName="gap-3"
  >
    <HistoryKindAvatar kind={item.kind} />
    <Box twClassName="flex-1">
      <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
        {strings(`rewards.kol.history_${item.kind}`)}
      </Text>
      <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
        {item.relativeTime}
      </Text>
    </Box>
    <Text
      variant={TextVariant.BodyMd}
      color={
        item.amount < 0 ? TextColor.TextAlternative : TextColor.SuccessDefault
      }
    >
      {formatSignedUsd(item.amount)}
    </Text>
  </Box>
);
