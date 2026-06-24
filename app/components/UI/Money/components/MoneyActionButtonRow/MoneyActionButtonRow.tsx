import React from 'react';
import { StyleSheet } from 'react-native';
import {
  Box,
  BoxFlexDirection,
  IconName,
  MainActionButton,
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

const styles = StyleSheet.create({
  buttonContainer: {
    flex: 1,
    overflow: 'hidden',
  },
});

const MoneyActionButtonRow = ({
  add,
  transfer,
  card,
}: MoneyActionButtonRowProps) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    twClassName="px-4 pt-4 pb-2 gap-2"
    testID={MoneyActionButtonRowTestIds.CONTAINER}
  >
    <MainActionButton
      iconName={IconName.Add}
      label={strings('money.action.add')}
      onPress={add.onPress}
      isDisabled={add.disabled}
      testID={MoneyActionButtonRowTestIds.ADD_BUTTON}
      twClassName="py-3"
      style={styles.buttonContainer}
    />
    <MainActionButton
      iconName={IconName.Arrow2UpRight}
      label={strings('money.action.transfer')}
      onPress={transfer.onPress}
      isDisabled={transfer.disabled}
      testID={MoneyActionButtonRowTestIds.TRANSFER_BUTTON}
      twClassName="py-3"
      style={styles.buttonContainer}
    />
    <MainActionButton
      iconName={IconName.Card}
      label={strings('money.action.card')}
      onPress={card.onPress}
      isDisabled={card.disabled}
      testID={MoneyActionButtonRowTestIds.CARD_BUTTON}
      twClassName="py-3"
      style={styles.buttonContainer}
    />
  </Box>
);

export default MoneyActionButtonRow;
