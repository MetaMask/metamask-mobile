import React, { useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Box,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useMoneyAccountWithdrawal } from '../../hooks/useMoneyAccount';
import { useMoneyDepositNavigation } from '../../hooks/useMoneyDepositNavigation';
import { MoneyEarningsViewTestIds } from './MoneyEarningsView.testIds';

const MoneyEarningsFooter = (): React.ReactElement => {
  const insets = useSafeAreaInsets();
  const { initiateWithdrawal } = useMoneyAccountWithdrawal();
  const { navigateToMoneyDeposit } = useMoneyDepositNavigation();

  const handleWithdraw = useCallback((): void => {
    initiateWithdrawal();
  }, [initiateWithdrawal]);

  const handleAdd = useCallback((): void => {
    navigateToMoneyDeposit();
  }, [navigateToMoneyDeposit]);

  return (
    <Box
      twClassName="gap-3 px-4 pt-3"
      style={{ paddingBottom: insets.bottom + 12 }}
    >
      <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-3">
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          twClassName="flex-1"
          onPress={handleWithdraw}
          testID={MoneyEarningsViewTestIds.WITHDRAW_BUTTON}
        >
          {strings('money.earnings.withdraw')}
        </Button>
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          twClassName="flex-1"
          onPress={handleAdd}
          testID={MoneyEarningsViewTestIds.ADD_BUTTON}
        >
          {strings('money.earnings.add')}
        </Button>
      </Box>
    </Box>
  );
};

export default MoneyEarningsFooter;
