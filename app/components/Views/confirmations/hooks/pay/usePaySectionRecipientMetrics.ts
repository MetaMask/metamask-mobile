import { useRef } from 'react';
import { TransactionType } from '@metamask/transaction-controller';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import {
  hasTransactionType,
  isTransactionPayWithdraw,
} from '../../utils/transaction';
import { PayWithSectionId } from '../../components/modals/pay-with-bottom-sheet/pay-with-bottom-sheet.types';

export interface PaySectionRecipientMetrics {
  presented: PayWithSectionId | null;
  selected: PayWithSectionId;
  switchCount: number;
}

export function usePaySectionRecipientMetrics(
  sourceSection: PayWithSectionId,
  hasPayToken: boolean,
): PaySectionRecipientMetrics {
  const transactionMeta = useTransactionMetadataRequest();

  const selected = getRecipientSectionId(transactionMeta, sourceSection);

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

function getRecipientSectionId(
  transactionMeta: Parameters<typeof isTransactionPayWithdraw>[0],
  payWithSection: PayWithSectionId,
): PayWithSectionId {
  if (isTransactionPayWithdraw(transactionMeta)) {
    return payWithSection;
  }

  if (
    hasTransactionType(transactionMeta, [
      TransactionType.perpsDeposit,
      TransactionType.perpsDepositAndOrder,
    ])
  ) {
    return 'perps';
  }

  if (
    hasTransactionType(transactionMeta, [
      TransactionType.predictDeposit,
      TransactionType.predictDepositAndOrder,
    ])
  ) {
    return 'predict';
  }

  if (
    hasTransactionType(transactionMeta, [TransactionType.moneyAccountDeposit])
  ) {
    return 'money-account';
  }

  return payWithSection;
}
