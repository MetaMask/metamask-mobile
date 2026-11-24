import {
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import { PayWithSectionId } from '../../components/modals/pay-with-bottom-sheet/pay-with-bottom-sheet.types';
import { isTransactionPayWithdraw } from '../../utils/transaction';
import { useTransactionAccountOverride } from '../transactions/useTransactionAccountOverride';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useSectionTracking } from './useSectionTracking';

export type { SectionTrackingResult as PaySectionRecipientMetrics } from './useSectionTracking';

export function usePaySectionRecipientMetrics(
  sourceSection: PayWithSectionId,
  hasPayToken: boolean,
) {
  const transactionMeta = useTransactionMetadataRequest();
  const accountOverride = useTransactionAccountOverride();
  const isMoneyAccountWithdraw = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountWithdraw,
  ]);
  const isRecipientAccountReady =
    !isMoneyAccountWithdraw || Boolean(accountOverride);
  const currentSection = getRecipientSectionId(transactionMeta, sourceSection);
  const switchKey =
    isMoneyAccountWithdraw && accountOverride
      ? `${currentSection}:${accountOverride.toLowerCase()}`
      : currentSection;

  return useSectionTracking(
    currentSection,
    hasPayToken && isRecipientAccountReady,
    switchKey,
  );
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
