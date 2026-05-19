import React from 'react';
import {
  Box,
  BoxFlexDirection,
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
    <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-3 mt-4">
      <Box twClassName="flex-1">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          onPress={onAddFunds}
          isFullWidth
          testID={PerpsMarketBalanceActionsSelectorsIDs.ADD_FUNDS_BUTTON}
        >
          {strings('perps.add_funds')}
        </Button>
      </Box>
    </Box>
  </Box>
);

export default PerpsEmptyBalance;
