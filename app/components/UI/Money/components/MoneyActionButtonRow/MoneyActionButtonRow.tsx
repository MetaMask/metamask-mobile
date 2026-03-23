import React, { useCallback } from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonBase,
  FontWeight,
  Icon,
  IconName,
  IconSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { MoneyActionButtonRowTestIds } from './MoneyActionButtonRow.testIds';

interface MoneyActionButtonRowProps {
  onAddPress?: () => void;
  onTransferPress?: () => void;
  onCardPress?: () => void;
}

// TODO: See if we have an existing Pill component that already looks like this.
const ActionPill = ({
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
    twClassName="flex-1 rounded-xl bg-muted px-4 py-3"
    onPress={onPress}
    testID={testID}
  >
    <Box
      flexDirection={BoxFlexDirection.Column}
      alignItems={BoxAlignItems.Center}
      twClassName="gap-0.5"
    >
      <Icon name={iconName} size={IconSize.Md} />
      <Text variant={TextVariant.BodySm} fontWeight={FontWeight.Medium}>
        {label}
      </Text>
    </Box>
  </ButtonBase>
);

const MoneyActionButtonRow = ({
  onAddPress = () => undefined,
  onTransferPress = () => undefined,
  onCardPress = () => undefined,
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
      alignItems={BoxAlignItems.Center}
      twClassName="px-4 pt-4 pb-3 gap-2"
      testID={MoneyActionButtonRowTestIds.CONTAINER}
    >
      <ActionPill
        iconName={IconName.Add}
        label={strings('money.action.add')}
        onPress={handleAddPress}
        testID={MoneyActionButtonRowTestIds.ADD_BUTTON}
      />
      <ActionPill
        iconName={IconName.SwapHorizontal}
        label={strings('money.action.transfer')}
        onPress={handleTransferPress}
        testID={MoneyActionButtonRowTestIds.TRANSFER_BUTTON}
      />
      <ActionPill
        iconName={IconName.Card}
        label={strings('money.action.card')}
        onPress={handleCardPress}
        testID={MoneyActionButtonRowTestIds.CARD_BUTTON}
      />
    </Box>
  );
};

export default MoneyActionButtonRow;
