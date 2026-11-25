import {
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import { PayWithSectionId } from '../../components/modals/pay-with-bottom-sheet/pay-with-bottom-sheet.types';
import { MONEY_ACCOUNT_DEPOSIT_TYPES } from '../../constants/confirmations';
import { isTransactionPayWithdraw } from '../../utils/transaction';
import { useTransactionAccountOverride } from '../transactions/useTransactionAccountOverride';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useSectionTracking } from './useSectionTracking';

export type { SectionTrackingResult as PaySectionRecipientMetrics } from './useSectionTracking';

const RECIPIENT_SUB_ACCOUNT_TYPES = [
  TransactionType.perpsDeposit,
  TransactionType.perpsLighterDeposit,
  TransactionType.predictDeposit,
] as const;

export function usePaySectionRecipientMetrics(
  sourceSection: PayWithSectionId,
  hasPayToken: boolean,
) {
  const transactionMeta = useTransactionMetadataRequest();
  const accountOverride = useTransactionAccountOverride();
  const isMoneyAccountWithdraw = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountWithdraw,
  ]);
  const isRecipientSubAccountFlow = hasTransactionType(transactionMeta, [
    ...RECIPIENT_SUB_ACCOUNT_TYPES,
  ]);
  const isRecipientAccountReady =
    !isMoneyAccountWithdraw || Boolean(accountOverride);
  const currentSection = getRecipientSectionId(transactionMeta, sourceSection);
  const recipientAccount = getRecipientAccountAddress({
    isMoneyAccountWithdraw,
    isRecipientSubAccountFlow,
    accountOverride,
    transactionFrom: transactionMeta?.txParams?.from,
  });
  const switchKey = recipientAccount
    ? `${currentSection}:${recipientAccount.toLowerCase()}`
    : currentSection;

  return useSectionTracking(
    currentSection,
    hasPayToken && isRecipientAccountReady,
    switchKey,
  );
}

function getRecipientAccountAddress({
  isMoneyAccountWithdraw,
  isRecipientSubAccountFlow,
  accountOverride,
  transactionFrom,
}: {
  isMoneyAccountWithdraw: boolean;
  isRecipientSubAccountFlow: boolean;
  accountOverride: string | undefined;
  transactionFrom: string | undefined;
}): string | undefined {
  if (isMoneyAccountWithdraw) {
    return accountOverride;
  }

  if (isRecipientSubAccountFlow) {
    return transactionFrom;
  }

  return undefined;
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
      TransactionType.perpsLighterDeposit,
      TransactionType.perpsDepositAndOrder,
      TransactionType.perpsLighterDepositAndOrder,
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

  if (hasTransactionType(transactionMeta, MONEY_ACCOUNT_DEPOSIT_TYPES)) {
    return 'money-account';
  }

  return payWithSection;
}
