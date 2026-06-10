import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { PaymentOverride } from '@metamask/transaction-pay-controller';
import type { Hex } from '@metamask/utils';
import Engine from '../../../../../core/Engine';
import { selectPrimaryMoneyAccount } from '../../../../../selectors/moneyAccountController';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useParams } from '../../../../../util/navigation/navUtils';
import {
  ConfirmationParams,
  PayWithOption,
} from '../../components/confirm/confirm-component';

export function useMoneyAccountPaymentOverride() {
  const { payWithOption } = useParams<ConfirmationParams>({});
  const transactionMeta = useTransactionMetadataRequest();
  const moneyAccount = useSelector(selectPrimaryMoneyAccount);
  const appliedRef = useRef<string | undefined>(undefined);

  const isMoneyAccount = payWithOption === PayWithOption.MoneyAccount;
  const transactionId = transactionMeta?.id;

  useEffect(() => {
    if (
      !isMoneyAccount ||
      !transactionId ||
      appliedRef.current === transactionId
    ) {
      return;
    }

    appliedRef.current = transactionId;

    Engine.context.TransactionPayController.setTransactionConfig(
      transactionId,
      (config) => {
        (config as Record<string, unknown>).paymentOverride =
          PaymentOverride.MoneyAccount;
        if (moneyAccount?.address) {
          config.refundTo = moneyAccount.address as Hex;
        }
      },
    );
  }, [isMoneyAccount, transactionId, moneyAccount?.address]);
}
