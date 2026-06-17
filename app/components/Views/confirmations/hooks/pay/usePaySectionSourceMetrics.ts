import { useRef } from 'react';
import { useSelector } from 'react-redux';
import { TransactionType } from '@metamask/transaction-controller';
import { PaymentOverride } from '@metamask/transaction-pay-controller';
import { RootState } from '../../../../../reducers';
import { selectPaymentOverrideByTransactionId } from '../../../../../selectors/transactionPayController';
import { useIsPerpsBalanceSelected } from '../../../../UI/Perps/hooks/useIsPerpsBalanceSelected';
import { selectPredictSelectedPaymentToken } from '../../../../UI/Predict/selectors/predictController';
import { useIsMoneyAccountFlagDefault } from './useIsMoneyAccountFlagDefault';
import { useTransactionPayFiatPayment } from './useTransactionPayData';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { hasTransactionType } from '../../utils/transaction';
import { PayWithSectionId } from '../../components/modals/pay-with-bottom-sheet/pay-with-bottom-sheet.types';

export interface PaySectionSourceMetrics {
  presented: PayWithSectionId | null;
  selected: PayWithSectionId;
  switchCount: number;
}

export function usePaySectionSourceMetrics(
  hasPayToken: boolean,
): PaySectionSourceMetrics {
  const transactionMeta = useTransactionMetadataRequest();
  const transactionId = transactionMeta?.id ?? '';

  const paymentOverride = useSelector((state: RootState) =>
    selectPaymentOverrideByTransactionId(state, transactionId),
  );
  const isPerpsBalanceSelected = useIsPerpsBalanceSelected();
  const predictSelectedPaymentToken = useSelector(
    selectPredictSelectedPaymentToken,
  );
  const isPredictBalanceSelected = predictSelectedPaymentToken === null;
  const fiatPayment = useTransactionPayFiatPayment();
  const hasFiatPaymentSelected = Boolean(fiatPayment?.selectedPaymentMethodId);
  const isDefaultMoneyAccount = useIsMoneyAccountFlagDefault();

  const isPerpsDepositAndOrder = hasTransactionType(transactionMeta, [
    TransactionType.perpsDepositAndOrder,
  ]);
  const isPredictDepositAndOrder = hasTransactionType(transactionMeta, [
    TransactionType.predictDepositAndOrder,
  ]);

  // Track whether any payment override has been applied
  const overrideAppliedRef = useRef(false);
  if (paymentOverride !== undefined) {
    overrideAppliedRef.current = true;
  }

  const isMoneyAccountActive =
    paymentOverride === PaymentOverride.MoneyAccount ||
    (isDefaultMoneyAccount && !overrideAppliedRef.current);

  const selected = getActiveSectionId({
    isMoneyAccountActive,
    isPerpsBalanceSelected: isPerpsDepositAndOrder && isPerpsBalanceSelected,
    isPredictBalanceSelected:
      isPredictDepositAndOrder && isPredictBalanceSelected,
    hasFiatPaymentSelected,
  });

  const presentedRef = useRef<PayWithSectionId | undefined>(undefined);
  if (!presentedRef.current && hasPayToken) {
    presentedRef.current = selected;
  }

  const previousRef = useRef<PayWithSectionId | undefined>(undefined);
  const switchCountRef = useRef(0);

  if (hasPayToken) {
    if (previousRef.current === undefined) {
      previousRef.current = selected;
    } else if (previousRef.current !== selected) {
      switchCountRef.current += 1;
      previousRef.current = selected;
    }
  }

  return {
    presented: presentedRef.current ?? null,
    selected,
    switchCount: switchCountRef.current,
  };
}

function getActiveSectionId({
  isMoneyAccountActive,
  isPerpsBalanceSelected,
  isPredictBalanceSelected,
  hasFiatPaymentSelected,
}: {
  isMoneyAccountActive: boolean;
  isPerpsBalanceSelected: boolean;
  isPredictBalanceSelected: boolean;
  hasFiatPaymentSelected: boolean;
}): PayWithSectionId {
  if (isMoneyAccountActive) return 'money-account';
  if (isPerpsBalanceSelected) return 'perps';
  if (isPredictBalanceSelected) return 'predict';
  if (hasFiatPaymentSelected) return 'bank-card';
  return 'crypto';
}
