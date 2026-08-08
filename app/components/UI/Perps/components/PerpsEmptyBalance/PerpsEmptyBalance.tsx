import React from 'react';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { PerpsMarketBalanceActionsSelectorsIDs } from '../../Perps.testIds';

export interface PerpsEmptyBalanceProps {
  onAddFunds: () => void;
}

const PerpsEmptyBalance: React.FC<PerpsEmptyBalanceProps> = ({
  onAddFunds,
}) => (
  <Box twClassName="px-4 pt-2 pb-4">
    <Text
      variant={TextVariant.DisplayLg}
      color={TextColor.TextDefault}
      testID={PerpsMarketBalanceActionsSelectorsIDs.BALANCE_VALUE}
    >
      $0.00
    </Text>
    <Button
      variant={ButtonVariant.Primary}
      size={ButtonSize.Lg}
      onPress={onAddFunds}
      isFullWidth
      twClassName="mt-4"
      testID={PerpsMarketBalanceActionsSelectorsIDs.ADD_FUNDS_BUTTON}
    >
      {strings('perps.add_funds')}
    </Button>
  </Box>
);

export default PerpsEmptyBalance;
