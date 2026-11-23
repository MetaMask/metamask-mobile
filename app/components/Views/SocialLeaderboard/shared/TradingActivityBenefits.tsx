import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import { strings } from '../../../../../locales/i18n';

export const TRADING_ACTIVITY_BENEFITS = [
  { id: 'positions', sharesTradingActivity: true },
  { id: 'performance', sharesTradingActivity: true },
  { id: 'fees', sharesTradingActivity: true },
  { id: 'private', sharesTradingActivity: false },
  { id: 'follow', sharesTradingActivity: false },
] as const;

export type TradingActivityBenefitId =
  (typeof TRADING_ACTIVITY_BENEFITS)[number]['id'];

/** Icon test ID suffixes, so tests can tell a shown row from a hidden one. */
export const TRADING_ACTIVITY_BENEFIT_ICON_STATE = {
  shown: 'shown',
  hidden: 'hidden',
} as const;

interface TradingActivityBenefitsProps {
  /** Whether "Show trading activity" is on. */
  isTradingActivityShown: boolean;
  testID: string;
}

/**
 * What a profile shares. Rows that depend on trading activity switch from a
 * check to a muted eye-slash when it is off; the rest always apply.
 */
const TradingActivityBenefits: React.FC<TradingActivityBenefitsProps> = ({
  isTradingActivityShown,
  testID,
}) => (
  <Box gap={3} testID={testID}>
    {TRADING_ACTIVITY_BENEFITS.map(({ id, sharesTradingActivity }) => {
      const isShown = isTradingActivityShown || !sharesTradingActivity;
      const iconState = isShown
        ? TRADING_ACTIVITY_BENEFIT_ICON_STATE.shown
        : TRADING_ACTIVITY_BENEFIT_ICON_STATE.hidden;
      return (
        <Box
          key={id}
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Start}
          gap={3}
          testID={`${testID}-${id}`}
        >
          <Icon
            name={isShown ? IconName.Check : IconName.EyeSlash}
            size={IconSize.Md}
            color={
              isShown ? IconColor.SuccessDefault : IconColor.IconAlternative
            }
            testID={`${testID}-${id}-${iconState}`}
          />
          <Text
            variant={TextVariant.BodyMd}
            color={isShown ? TextColor.TextDefault : TextColor.TextAlternative}
            twClassName="flex-1"
          >
            {strings(`social_leaderboard.trading_activity_benefits.${id}`)}
          </Text>
        </Box>
      );
    })}
  </Box>
);

export default TradingActivityBenefits;
