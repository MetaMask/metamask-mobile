import React, { useState } from 'react';
import { Pressable } from 'react-native';
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
  Tag,
  TagSeverity,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import HandCoinsIcon from '../../../../../images/rewards/hand-coins.svg';
import UsersThreeIcon from '../../../../../images/rewards/users-three.svg';
import HistoryOnHoldSheet from './HistoryOnHoldSheet';
import { KOL_DASHBOARD_SELECTORS } from './KolDashboard.testIds';
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
  isPaused?: boolean;
}> = ({ item, isPaused = false }) => {
  const [isOnHoldSheetVisible, setIsOnHoldSheetVisible] = useState(false);
  const showPausedTag = isPaused && item.kind === 'commission';

  const row = (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="gap-3"
    >
      <HistoryKindAvatar kind={item.kind} />
      <Box twClassName="flex-1">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-2"
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            twClassName="shrink"
          >
            {strings(`rewards.kol.history_${item.kind}`)}
          </Text>
          {showPausedTag ? (
            <Tag
              severity={TagSeverity.Neutral}
              testID={KOL_DASHBOARD_SELECTORS.HISTORY_PAUSED_TAG}
            >
              <Text
                variant={TextVariant.BodyXs}
                color={TextColor.TextAlternative}
              >
                {strings('rewards.kol.claims_paused_action')}
              </Text>
            </Tag>
          ) : null}
          <Text
            variant={TextVariant.BodyMd}
            color={
              showPausedTag || item.amount < 0
                ? TextColor.TextAlternative
                : TextColor.SuccessDefault
            }
            twClassName="ml-auto"
          >
            {formatSignedUsd(item.amount)}
          </Text>
        </Box>
        <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
          {item.relativeTime}
        </Text>
      </Box>
    </Box>
  );

  if (!showPausedTag) {
    return row;
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={() => setIsOnHoldSheetVisible(true)}
        testID={KOL_DASHBOARD_SELECTORS.HISTORY_PAUSED_ROW}
      >
        {row}
      </Pressable>
      <HistoryOnHoldSheet
        isVisible={isOnHoldSheetVisible}
        onClose={() => setIsOnHoldSheetVisible(false)}
      />
    </>
  );
};
