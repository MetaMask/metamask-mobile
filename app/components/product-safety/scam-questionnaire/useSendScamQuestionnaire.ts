import { useCallback, useState } from 'react';
import { providerErrors } from '@metamask/rpc-errors';
import { TransactionType } from '@metamask/transaction-controller';

import { AlertKeys } from '../../Views/confirmations/constants/alerts';
import { ResultType } from '../../Views/confirmations/constants/signatures';
import {
  MMM_ORIGIN,
  TRANSFER_TRANSACTION_TYPES,
} from '../../Views/confirmations/constants/confirmations';
import { useAlerts } from '../../Views/confirmations/context/alert-system-context';
import { useSecurityAlertResponse } from '../../Views/confirmations/hooks/alerts/useSecurityAlertResponse';
import { useTransactionMetadataRequest } from '../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import { ScamQuestionnaireProps } from './scam-questionnaire';

interface UseSendScamQuestionnaireOptions {
  /**
   * Rejects the underlying confirmation. Mirrors `useConfirmActions`' `onReject`
   * so the questionnaire can reject to wallet home on "Stop this payment".
   */
  onReject: (
    error?: Error,
    skipNavigation?: boolean,
    navigateToHome?: boolean,
  ) => Promise<void>;
}

interface UseSendScamQuestionnaireResult {
  /** True when a confirm tap should open the questionnaire instead of confirming. */
  isScamQuestionnaireRequired: boolean;
  /** True once the questionnaire has been passed/bypassed (also gates the danger-alert modal). */
  isScamQuestionnaireCompleted: boolean;
  /** Whether the questionnaire modal is currently shown. */
  isScamQuestionnaireVisible: boolean;
  /** Opens the questionnaire modal. */
  showScamQuestionnaire: () => void;
  /** Props to spread onto `<ScamQuestionnaire />`. */
  scamQuestionnaireProps: ScamQuestionnaireProps;
}

/**
 * Encapsulates the send-flow scam questionnaire: eligibility, visibility state,
 * the completion ref, and the callbacks that translate questionnaire outcomes
 * into confirmation actions. Keeps the footer's coupling to a single gate plus
 * a render.
 */
export function useSendScamQuestionnaire({
  onReject,
}: UseSendScamQuestionnaireOptions): UseSendScamQuestionnaireResult {
  const { setAlertConfirmed } = useAlerts();
  const { securityAlertResponse } = useSecurityAlertResponse();
  const transactionMetadata = useTransactionMetadataRequest();

  const [isScamQuestionnaireVisible, setScamQuestionnaireVisible] =
    useState(false);
  // Once the questionnaire is completed (clean pass or bypass), later Confirm
  // taps skip both it and the danger-alert checkbox modal.
  const [isScamQuestionnaireCompleted, setScamQuestionnaireCompleted] =
    useState(false);

  const transactionType = transactionMetadata?.type as TransactionType;
  const isMMSendReq =
    TRANSFER_TRANSACTION_TYPES.includes(transactionType) &&
    transactionMetadata?.origin === MMM_ORIGIN;

  const isScamQuestionnaireRequired =
    !isScamQuestionnaireCompleted &&
    isMMSendReq &&
    securityAlertResponse?.result_type === ResultType.Malicious;

  const showScamQuestionnaire = useCallback(() => {
    setScamQuestionnaireVisible(true);
  }, []);

  const hideScamQuestionnaire = useCallback(() => {
    setScamQuestionnaireVisible(false);
  }, []);

  // Clean pass or bypass: acknowledging the blockaid alert flips the button
  // label to "Confirm" and skips the checkbox modal on the next tap.
  const onScamComplete = useCallback(() => {
    setScamQuestionnaireCompleted(true);
    setAlertConfirmed(AlertKeys.Blockaid, true);
    setScamQuestionnaireVisible(false);
  }, [setAlertConfirmed]);

  // "Stop this payment" on the scam warning rejects the tx and returns the user
  // to the wallet home rather than dropping them back on the confirm screen.
  const onScamReject = useCallback(async () => {
    hideScamQuestionnaire();
    await onReject(providerErrors.userRejectedRequest(), false, true);
  }, [hideScamQuestionnaire, onReject]);

  return {
    isScamQuestionnaireRequired,
    isScamQuestionnaireCompleted,
    isScamQuestionnaireVisible,
    showScamQuestionnaire,
    scamQuestionnaireProps: {
      onCleanPass: onScamComplete,
      onBypass: onScamComplete,
      onReject: onScamReject,
      onDismiss: hideScamQuestionnaire,
    },
  };
}
