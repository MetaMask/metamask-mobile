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
  disabled?: boolean;
  iconName: IconName;
  label: string;
  onPress: () => void;
  testID: string;
}

const PortfolioAction = ({
  disabled = false,
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

interface PortfolioActionsProps {
  onPositionsPress: () => void;
  onAddFundsPress: () => void;
  onWithdrawPress: () => void;
}

export const PortfolioActions = ({
  onPositionsPress,
  onAddFundsPress,
  onWithdrawPress,
}: PortfolioActionsProps) => (
  <Box twClassName="flex-row gap-3" testID={PredictHomeTestIds.ACTIONS}>
    <PortfolioAction
      iconName={IconName.Book}
      label={strings('predict_next.portfolio.positions')}
      onPress={onPositionsPress}
      testID={PredictHomeTestIds.POSITIONS}
    />
    <PortfolioAction
      disabled
      iconName={IconName.Add}
      label={strings('predict_next.portfolio.add_funds')}
      onPress={onAddFundsPress}
      testID={PredictHomeTestIds.ADD_FUNDS}
    />
    <PortfolioAction
      disabled
      iconName={IconName.Arrow2Down}
      label={strings('predict_next.portfolio.withdraw')}
      onPress={onWithdrawPress}
      testID={PredictHomeTestIds.WITHDRAW}
    />
  </Box>
);
