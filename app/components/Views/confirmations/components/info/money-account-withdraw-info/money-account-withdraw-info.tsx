import React from 'react';
import { strings } from '../../../../../../../locales/i18n';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { Box } from '../../../../../UI/Box/Box';
import { AlignItems } from '../../../../../UI/Box/box.types';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { useTransactionPayWithdraw } from '../../../hooks/pay/useTransactionPayWithdraw';
import useNavbar from '../../../hooks/ui/useNavbar';
import { MUSD_TOKEN_ADDRESS } from '../../../../../UI/Earn/constants/musd';
import { CustomAmountInfo } from '../custom-amount-info';
import useMoneyAccountBalance from '../../../../../UI/Money/hooks/useMoneyAccountBalance';

export const MONEY_ACCOUNT_CURRENCY = 'usd';

export function MoneyAccountWithdrawInfo() {
  useNavbar(strings('confirm.title.money_account_withdraw'));

  const { canSelectWithdrawToken } = useTransactionPayWithdraw();

  return (
    <CustomAmountInfo
      currency={MONEY_ACCOUNT_CURRENCY}
      disablePay={!canSelectWithdrawToken}
      preferredToken={{
        address: MUSD_TOKEN_ADDRESS,
        chainId: CHAIN_IDS.MAINNET,
      }}
    >
      <MoneyAccountWithdrawBalance />
    </CustomAmountInfo>
  );
}

function MoneyAccountWithdrawBalance() {
  const { totalFiatFormatted } = useMoneyAccountBalance();

  return (
    <Box alignItems={AlignItems.center} testID="money-account-withdraw-balance">
      <Text
        variant={TextVariant.BodyMDMedium}
        color={TextColor.Alternative}
      >{`${strings('confirm.available_balance')}${totalFiatFormatted ?? ''}`}</Text>
    </Box>
  );
}
