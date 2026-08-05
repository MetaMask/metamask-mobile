import React from 'react';
import { CustomAmountInfo } from '../custom-amount-info';
import { strings } from '../../../../../../../locales/i18n';
import useNavbar from '../../../hooks/ui/useNavbar';
import { useParams } from '../../../../../../util/navigation/navUtils';
import { ConfirmationParams } from '../../confirm/confirm-component';

export const MONEY_ACCOUNT_CURRENCY = 'usd';

export function MoneyAccountDepositInfo() {
  useNavbar(strings('confirm.title.money_account_add_money'), true);
  const { preferredPaymentToken } = useParams<ConfirmationParams>({});

  const params = useParams<ConfirmationParams>();
  const autoFiat = params?.autoSelectFiatPayment;

  return (
    <CustomAmountInfo
      autoSelectFiatPayment={autoFiat}
      currency={MONEY_ACCOUNT_CURRENCY}
      hideAccountSelector={autoFiat}
      supportAccountSelection
      preferredToken={preferredPaymentToken}
      hasMax
    />
  );
}
