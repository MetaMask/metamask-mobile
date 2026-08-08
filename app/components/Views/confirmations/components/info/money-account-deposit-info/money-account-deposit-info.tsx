import React from 'react';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { CustomAmountInfo } from '../custom-amount-info';
import { strings } from '../../../../../../../locales/i18n';
import useNavbar from '../../../hooks/ui/useNavbar';
import { useParams } from '../../../../../../util/navigation/navUtils';
import { ConfirmationParams } from '../../confirm/confirm-component';
import { MUSD_TOKEN_ASSET_ID_BY_CHAIN } from '../../../../../UI/Earn/constants/musd';
import { useEnsureCompatibleProvider } from '../../../../../UI/Ramp/hooks/useEnsureCompatibleProvider';

export const MONEY_ACCOUNT_CURRENCY = 'usd';

export function MoneyAccountDepositInfo() {
  useNavbar(strings('confirm.title.money_account_add_money'), true);
  useEnsureCompatibleProvider(MUSD_TOKEN_ASSET_ID_BY_CHAIN[CHAIN_IDS.MONAD]);
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
