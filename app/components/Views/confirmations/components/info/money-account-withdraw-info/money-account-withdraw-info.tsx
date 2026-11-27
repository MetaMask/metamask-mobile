import React from 'react';
import { strings } from '../../../../../../../locales/i18n';
import { Box } from '../../../../../UI/Box/Box';
import { AlignItems } from '../../../../../UI/Box/box.types';
import { useTransactionPayWithdraw } from '../../../hooks/pay/useTransactionPayWithdraw';
import useNavbar from '../../../hooks/ui/useNavbar';
import { CustomAmountInfo } from '../custom-amount-info';
import useMoneyAccountBalance from '../../../../../UI/Money/hooks/useMoneyAccountBalance';
import {
  Text,
  TextVariant,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';

export const MONEY_ACCOUNT_CURRENCY = 'usd';

export function MoneyAccountWithdrawInfo() {
  useNavbar(strings('confirm.title.money_account_move'));

  const { canSelectWithdrawToken } = useTransactionPayWithdraw();

  return (
    <CustomAmountInfo
      currency={MONEY_ACCOUNT_CURRENCY}
      disablePay={!canSelectWithdrawToken}
      hasMax
      supportAccountSelection
    >
      <MoneyAccountWithdrawBalance />
    </CustomAmountInfo>
  );
}

function MoneyAccountWithdrawBalance() {
  const { withdrawableFiatFormatted } = useMoneyAccountBalance();

  return (
    <Box alignItems={AlignItems.center} testID="money-account-withdraw-balance">
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextAlternative}
      >{`${strings('confirm.available_balance')}${withdrawableFiatFormatted ?? ''}`}</Text>
    </Box>
  );
}
