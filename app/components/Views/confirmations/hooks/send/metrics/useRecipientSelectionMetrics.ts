import { useCallback } from 'react';

import { MetaMetricsEvents, useMetrics } from '../../../../../hooks/useMetrics';
import {
  RecipientInputMethod,
  useSendMetricsContext,
} from '../../../context/send-context/send-metrics-context';
import { useSendContext } from '../../../context/send-context';
import { useSendType } from '../useSendType';

export const useRecipientSelectionMetrics = () => {
  const { trackEvent, createEventBuilder } = useMetrics();
  const { chainId } = useSendContext();
  const { isEvmSendType } = useSendType();
  const { accountType, recipientInputMethod, setRecipientInputMethod } =
    useSendMetricsContext();

  const setRecipientInputMethodManual = useCallback(() => {
    setRecipientInputMethod(RecipientInputMethod.Manual);
  }, [setRecipientInputMethod]);

  const setRecipientInputMethodPasted = useCallback(() => {
    setRecipientInputMethod(RecipientInputMethod.Pasted);
  }, [setRecipientInputMethod]);

  const setRecipientInputMethodSelectAccount = useCallback(() => {
    setRecipientInputMethod(RecipientInputMethod.SelectAccount);
  }, [setRecipientInputMethod]);

  const setRecipientInputMethodSelectContact = useCallback(() => {
    setRecipientInputMethod(RecipientInputMethod.SelectContact);
  }, [setRecipientInputMethod]);

  const captureRecipientSelected = useCallback(async () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.SEND_RECIPIENT_SELECTED)
        .addProperties({
          account_type: accountType,
          input_method: recipientInputMethod,
          chain_id: isEvmSendType ? chainId : undefined,
          chain_id_caip: isEvmSendType ? undefined : chainId,
        })
        .build(),
    );
  }, [
    accountType,
    chainId,
    createEventBuilder,
    isEvmSendType,
    recipientInputMethod,
    trackEvent,
  ]);

  return {
    captureRecipientSelected,
    setRecipientInputMethodManual,
    setRecipientInputMethodPasted,
    setRecipientInputMethodSelectAccount,
    setRecipientInputMethodSelectContact,
  };
};
