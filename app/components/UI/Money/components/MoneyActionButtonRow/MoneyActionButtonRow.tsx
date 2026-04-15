import React, { useCallback } from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonBase,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { MoneyActionButtonRowTestIds } from './MoneyActionButtonRow.testIds';

interface MoneyActionButtonRowProps {
  onAddPress: () => void;
  onTransferPress: () => void;
  onCardPress: () => void;
}

const ActionButton = ({
  iconName,
  label,
  onPress,
  testID,
}: {
  iconName: IconName;
  label: string;
  onPress: () => void;
  testID: string;
}) => (
  <ButtonBase
    twClassName="flex-1 self-stretch h-full min-h-12 rounded-xl bg-muted px-1 py-3"
    onPress={onPress}
    testID={testID}
  >
    <Box
      flexDirection={BoxFlexDirection.Column}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      twClassName="w-full flex-1"
    >
      <Icon
        name={iconName}
        size={IconSize.Lg}
        color={IconColor.IconAlternative}
      />
      <Text
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextDefault}
        numberOfLines={1}
        ellipsizeMode="tail"
        twClassName="mt-0.5 w-full shrink-0 min-w-0 text-center"
      >
        {label}
      </Text>
    </Box>
  </ButtonBase>
);

const MoneyActionButtonRow = ({
  onAddPress,
  onTransferPress,
  onCardPress,
}: MoneyActionButtonRowProps) => {
  const handleAddPress = useCallback(() => onAddPress(), [onAddPress]);
  const handleTransferPress = useCallback(
    () => onTransferPress(),
    [onTransferPress],
  );
  const handleCardPress = useCallback(() => onCardPress(), [onCardPress]);

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Stretch}
      twClassName="px-4 pt-6 gap-2"
      testID={MoneyActionButtonRowTestIds.CONTAINER}
    >
      <ActionButton
        iconName={IconName.Add}
        label={strings('money.action.add')}
        onPress={handleAddPress}
        testID={MoneyActionButtonRowTestIds.ADD_BUTTON}
      />
      <ActionButton
        iconName={IconName.SwapHorizontal}
        label={strings('money.action.transfer')}
        onPress={handleTransferPress}
        testID={MoneyActionButtonRowTestIds.TRANSFER_BUTTON}
      />
      <ActionButton
        iconName={IconName.Card}
        label={strings('money.action.card')}
        onPress={handleCardPress}
        testID={MoneyActionButtonRowTestIds.CARD_BUTTON}
      />
    </Box>
  );
};

export default MoneyActionButtonRow;
