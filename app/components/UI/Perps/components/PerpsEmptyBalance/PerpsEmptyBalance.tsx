import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import { strings } from '../../../../../../locales/i18n';
import { PerpsMarketBalanceActionsSelectorsIDs } from '../../Perps.testIds';
import styleSheet from './PerpsEmptyBalance.styles';

export interface PerpsEmptyBalanceProps {
  onAddFunds: () => void;
}

const PerpsEmptyBalance: React.FC<PerpsEmptyBalanceProps> = ({
  onAddFunds,
}) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <Box twClassName="px-4 py-4">
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="gap-3"
      >
        <Text
          variant={TextVariant.DisplayLG}
          color={TextColor.Default}
          style={styles.balanceText}
          testID={PerpsMarketBalanceActionsSelectorsIDs.BALANCE_VALUE}
        >
          $0.00
        </Text>
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          onPress={onAddFunds}
          testID={PerpsMarketBalanceActionsSelectorsIDs.ADD_FUNDS_BUTTON}
        >
          {strings('perps.add_funds')}
        </Button>
      </Box>
    </Box>
  );
};

export default PerpsEmptyBalance;
