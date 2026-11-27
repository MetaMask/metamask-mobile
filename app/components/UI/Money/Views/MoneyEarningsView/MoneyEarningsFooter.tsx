import React, { useCallback } from 'react';
import {
  Box,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useMoneyDepositNavigation } from '../../hooks/useMoneyDepositNavigation';
import { MoneyEarningsViewTestIds } from './MoneyEarningsView.testIds';
import Logger from '../../../../../util/Logger';

const MoneyEarningsFooter = (): React.ReactElement => {
  const { navigateToMoneyDeposit } = useMoneyDepositNavigation();

  const handleAdd = useCallback(() => {
    navigateToMoneyDeposit().catch((error: unknown) => {
      Logger.error(
        error as Error,
        '[MoneyEarningsFooter] Failed to navigate to deposit',
      );
    });
  }, [navigateToMoneyDeposit]);

  return (
    <Box twClassName="px-4">
      <Box flexDirection={BoxFlexDirection.Row}>
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleAdd}
          testID={MoneyEarningsViewTestIds.ADD_BUTTON}
        >
          {strings('money.earnings.add_funds')}
        </Button>
      </Box>
    </Box>
  );
};

export default MoneyEarningsFooter;
