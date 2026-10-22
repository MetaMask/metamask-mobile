import React from 'react';
import { StyleSheet } from 'react-native';
import {
  Box,
  BoxFlexDirection,
  IconName,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import MainActionButtonGlass from '../../../../../component-library/components-temp/MainActionButtonGlass';
import { MoneyActionButtonRowTestIds } from './MoneyActionButtonRow.testIds';

interface ActionButtonConfig {
  onPress: () => void;
  disabled?: boolean;
}

interface MoneyActionButtonRowProps {
  add: ActionButtonConfig;
  transfer: ActionButtonConfig;
  card: ActionButtonConfig;
  /** Virtual bank account details. Omitted when there is no account to show. */
  details?: ActionButtonConfig;
  /** Brand refresh Liquid Glass tiles; resolved by the screen. */
  isGlass?: boolean;
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
  details,
  isGlass = false,
}: MoneyActionButtonRowProps) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    twClassName="px-4 pt-8 pb-2 gap-2"
    testID={MoneyActionButtonRowTestIds.CONTAINER}
  >
    <MainActionButtonGlass
      iconName={IconName.Add}
      label={strings('money.action.add')}
      onPress={add.onPress}
      isDisabled={add.disabled}
      testID={MoneyActionButtonRowTestIds.ADD_BUTTON}
      twClassName="py-3"
      containerStyle={styles.buttonContainer}
      isGlass={isGlass}
    />
    <MainActionButtonGlass
      iconName={IconName.Arrow2UpRight}
      label={strings('money.action.transfer')}
      onPress={transfer.onPress}
      isDisabled={transfer.disabled}
      testID={MoneyActionButtonRowTestIds.TRANSFER_BUTTON}
      twClassName="py-3"
      containerStyle={styles.buttonContainer}
      isGlass={isGlass}
    />
    <MainActionButtonGlass
      iconName={IconName.Card}
      label={strings('money.action.card')}
      onPress={card.onPress}
      isDisabled={card.disabled}
      testID={MoneyActionButtonRowTestIds.CARD_BUTTON}
      twClassName="py-3"
      containerStyle={styles.buttonContainer}
      isGlass={isGlass}
    />
    {details ? (
      <MainActionButtonGlass
        iconName={IconName.Bank}
        label={strings('money.action.details')}
        onPress={details.onPress}
        isDisabled={details.disabled}
        testID={MoneyActionButtonRowTestIds.DETAILS_BUTTON}
        twClassName="py-3"
        containerStyle={styles.buttonContainer}
        isGlass={isGlass}
      />
    ) : null}
  </Box>
);

export default MoneyActionButtonRow;
