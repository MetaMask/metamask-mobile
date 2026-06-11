import React from 'react';
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

interface ActionButtonConfig {
  onPress: () => void;
  disabled?: boolean;
}

interface MoneyActionButtonRowProps {
  add: ActionButtonConfig;
  transfer: ActionButtonConfig;
  card: ActionButtonConfig;
}

const ActionButton = ({
  iconName,
  label,
  onPress,
  testID,
  disabled,
}: {
  iconName: IconName;
  label: string;
  onPress: () => void;
  testID: string;
  disabled?: boolean;
}) => (
  <ButtonBase
    twClassName="flex-1 self-stretch h-full min-h-12 rounded-xl bg-muted px-1 py-3"
    onPress={onPress}
    testID={testID}
    isDisabled={disabled}
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
  add,
  transfer,
  card,
}: MoneyActionButtonRowProps) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Stretch}
    twClassName="px-4 pt-6 pb-2 gap-2"
    testID={MoneyActionButtonRowTestIds.CONTAINER}
  >
    <ActionButton
      iconName={IconName.Add}
      label={strings('money.action.add')}
      onPress={add.onPress}
      disabled={add.disabled}
      testID={MoneyActionButtonRowTestIds.ADD_BUTTON}
    />
    <ActionButton
      iconName={IconName.Arrow2UpRight}
      label={strings('money.action.transfer')}
      onPress={transfer.onPress}
      disabled={transfer.disabled}
      testID={MoneyActionButtonRowTestIds.TRANSFER_BUTTON}
    />
    <ActionButton
      iconName={IconName.Card}
      label={strings('money.action.card')}
      onPress={card.onPress}
      disabled={card.disabled}
      testID={MoneyActionButtonRowTestIds.CARD_BUTTON}
    />
  </Box>
);

export default MoneyActionButtonRow;
