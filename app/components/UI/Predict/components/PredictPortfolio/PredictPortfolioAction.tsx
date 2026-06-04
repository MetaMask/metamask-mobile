import React from 'react';
import { Pressable } from 'react-native';
import {
  BadgeCount,
  BadgeCountSize,
  Box,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { PREDICT_PORTFOLIO_TEST_IDS } from './PredictPortfolio.testIds';

export interface PredictPortfolioActionProps {
  accessibilityLabel?: string;
  badgeCount?: number;
  disabled?: boolean;
  iconName: IconName;
  label: string;
  onPress: () => void;
  testID?: string;
}

const PredictPortfolioAction: React.FC<PredictPortfolioActionProps> = ({
  accessibilityLabel,
  badgeCount = 0,
  disabled = false,
  iconName,
  label,
  onPress,
  testID,
}) => {
  const tw = useTailwind();
  const showBadge = badgeCount > 0;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) =>
        tw.style(
          'flex-1 min-h-[74px] rounded-lg bg-muted items-center justify-center p-3',
          pressed && 'opacity-80',
          disabled && 'opacity-50',
        )
      }
      testID={testID}
    >
      <Box twClassName="items-center gap-[2px]">
        <Box twClassName="relative h-6 w-6 items-center justify-center">
          <ButtonIcon
            accessible={false}
            iconName={iconName}
            iconProps={{
              color: disabled ? IconColor.IconMuted : IconColor.IconAlternative,
              size: IconSize.Md,
            }}
            importantForAccessibility="no"
            pointerEvents="none"
            size={ButtonIconSize.Md}
          />
          {showBadge && (
            <BadgeCount
              count={badgeCount}
              max={99}
              size={BadgeCountSize.Md}
              style={tw.style('absolute -right-2.5 -top-1.5')}
              testID={PREDICT_PORTFOLIO_TEST_IDS.ACTION_BADGE}
            />
          )}
        </Box>
        <Text
          fontWeight={FontWeight.Medium}
          twClassName={disabled ? 'text-muted' : 'text-default'}
          variant={TextVariant.BodySm}
        >
          {label}
        </Text>
      </Box>
    </Pressable>
  );
};

export default PredictPortfolioAction;
