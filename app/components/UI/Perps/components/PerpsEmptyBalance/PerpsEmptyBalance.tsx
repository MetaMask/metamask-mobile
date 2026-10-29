import React from 'react';
import {
  Box,
  ButtonSize,
  ButtonVariant,
  FontFamily,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import ButtonGlass from '../../../../../component-library/components-temp/ButtonGlass';
import { PerpsMarketBalanceActionsSelectorsIDs } from '../../Perps.testIds';

export interface PerpsEmptyBalanceProps {
  onAddFunds: () => void;
  isGlass?: boolean;
}

const PerpsEmptyBalance: React.FC<PerpsEmptyBalanceProps> = ({
  onAddFunds,
  isGlass = false,
}) => {
  const tw = useTailwind();

  return (
    <Box twClassName="px-4 pt-2 pb-4">
      <Text
        variant={TextVariant.AmountDisplayLg}
        fontFamily={FontFamily.Hero}
        color={TextColor.TextDefault}
        testID={PerpsMarketBalanceActionsSelectorsIDs.BALANCE_VALUE}
      >
        $0.00
      </Text>
      <ButtonGlass
        isGlass={isGlass}
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        onPress={onAddFunds}
        isFullWidth
        containerStyle={tw.style('mt-4')}
        testID={PerpsMarketBalanceActionsSelectorsIDs.ADD_FUNDS_BUTTON}
      >
        {strings('perps.add_funds')}
      </ButtonGlass>
    </Box>
  );
};

export default PerpsEmptyBalance;
