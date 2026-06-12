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
import { useIsMoneyAccountFlagDefault } from './useIsMoneyAccountFlagDefault';
import { isTransactionPayWithdraw } from '../../utils/transaction';

export function useDefaultPaySelectedSection() {
  const { payWithOption } = useParams<ConfirmationParams>({});
  const transactionMeta = useTransactionMetadataRequest();
  const moneyAccount = useSelector(selectPrimaryMoneyAccount);
  const isDefaultMoneyAccount = useIsMoneyAccountFlagDefault();
  const isWithdraw = isTransactionPayWithdraw(transactionMeta);
  const appliedRef = useRef<string | undefined>(undefined);

  const isMoneyAccount =
    payWithOption === PayWithOption.MoneyAccount || isDefaultMoneyAccount;
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
        if (moneyAccount?.address && !isWithdraw) {
          config.refundTo = moneyAccount.address as Hex;
        }
      },
    );
  }, [isMoneyAccount, isWithdraw, transactionId, moneyAccount?.address]);
}
