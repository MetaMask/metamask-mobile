import React from 'react';
import { Pressable } from 'react-native';
import {
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
import { strings } from '../../../../../../../locales/i18n';
import { PredictHomeTestIds } from '../PredictHome.testIds';

interface PortfolioActionProps {
  iconName: IconName;
  label: string;
  onPress: () => void;
  testID: string;
}

const PortfolioAction = ({
  iconName,
  label,
  onPress,
  testID,
}: PortfolioActionProps) => {
  const tw = useTailwind();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) =>
        tw.style(
          'flex-1 min-h-[74px] rounded-lg bg-muted items-center justify-center p-3',
          pressed && 'opacity-80',
        )
      }
      testID={testID}
    >
      <Box twClassName="items-center gap-[2px]">
        <ButtonIcon
          accessible={false}
          iconName={iconName}
          iconProps={{
            color: IconColor.IconAlternative,
            size: IconSize.Md,
          }}
          importantForAccessibility="no"
          pointerEvents="none"
          size={ButtonIconSize.Md}
        />
        <Text
          fontWeight={FontWeight.Medium}
          twClassName="text-default"
          variant={TextVariant.BodySm}
        >
          {label}
        </Text>
      </Box>
    </Pressable>
  );
};

interface PortfolioActionsProps {
  onPositionsPress: () => void;
}

/**
 * Home's portfolio entry points. Only working actions appear: funding is
 * added when it has a real implementation and the Venue supports it.
 */
export const PortfolioActions = ({
  onPositionsPress,
}: PortfolioActionsProps) => (
  <Box twClassName="flex-row gap-3" testID={PredictHomeTestIds.ACTIONS}>
    <PortfolioAction
      iconName={IconName.Book}
      label={strings('predict_next.portfolio.positions')}
      onPress={onPositionsPress}
      testID={PredictHomeTestIds.POSITIONS}
    />
  </Box>
);
