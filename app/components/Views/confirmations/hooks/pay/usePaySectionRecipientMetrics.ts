import { TransactionType } from '@metamask/transaction-controller';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import {
  hasTransactionType,
  isTransactionPayWithdraw,
} from '../../utils/transaction';
import { PayWithSectionId } from '../../components/modals/pay-with-bottom-sheet/pay-with-bottom-sheet.types';
import { useSectionTracking } from './useSectionTracking';

export type { SectionTrackingResult as PaySectionRecipientMetrics } from './useSectionTracking';

export function usePaySectionRecipientMetrics(
  sourceSection: PayWithSectionId,
  hasPayToken: boolean,
) {
  const transactionMeta = useTransactionMetadataRequest();
  const currentSection = getRecipientSectionId(transactionMeta, sourceSection);

  return useSectionTracking(currentSection, hasPayToken);
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
