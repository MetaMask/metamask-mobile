import React, { memo } from 'react';
import { ActivityIndicator } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxBackgroundColor,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Icon,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTheme } from '../../../../../util/theme';
import {
  HardwareWalletsSwapsStep,
  HardwareWalletsSwapsStepStatus,
} from './HardwareWalletsSwaps.state';
import { HardwareWalletsSwapsSelectorsIDs } from './HardwareWalletsSwaps.testIds';
import { getStepIcon, getStepTitle, getStepDescription } from './step-helpers';

interface StepRowProps {
  step: HardwareWalletsSwapsStep;
  index: number;
}

export const StepRow = memo(({ step, index }: StepRowProps) => {
  const icon = getStepIcon(step, index);
  const titleColor =
    step.status === HardwareWalletsSwapsStepStatus.Rejected
      ? TextColor.ErrorDefault
      : TextColor.TextDefault;
  const { colors } = useTheme();

  return (
    <Box
      testID={`${HardwareWalletsSwapsSelectorsIDs.STEP_ROW}-${index}`}
      flexDirection={BoxFlexDirection.Row}
      gap={3}
      alignItems={BoxAlignItems.Start}
      twClassName="w-full"
    >
      <Box
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        backgroundColor={BoxBackgroundColor.BackgroundMuted}
        twClassName="h-8 w-8 rounded-full"
      >
        {icon.isSigning ? (
          <ActivityIndicator size="small" color={colors.primary.default} />
        ) : icon.name ? (
          <Icon name={icon.name} color={icon.color} size={IconSize.Md} />
        ) : (
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {icon.label}
          </Text>
        )}
      </Box>
      <Box twClassName="flex-1">
        <Text
          variant={TextVariant.BodyMd}
          color={titleColor}
          fontWeight={FontWeight.Medium}
        >
          {getStepTitle(step)}
        </Text>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {getStepDescription(step)}
        </Text>
      </Box>
    </Box>
  );
});
