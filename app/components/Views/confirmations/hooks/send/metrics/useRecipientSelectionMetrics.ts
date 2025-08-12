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
  const { recipientInputMethod, setRecipientInputMethod } =
    useSendMetricsContext();

  const setRecipientInputMethodManual = useCallback(() => {
    setRecipientInputMethod(RecipientInputMethod.Manual);
  }, [setRecipientInputMethod]);

  const setRecipientInputMethodPasted = useCallback(() => {
    setRecipientInputMethod(RecipientInputMethod.Pasted);
  }, [setRecipientInputMethod]);

  const captureRecipientSelected = useCallback(
    () =>
      trackEvent(
        createEventBuilder(MetaMetricsEvents.SEND_RECIPIENT_SELECTED)
          .addProperties({
            input_method: recipientInputMethod,
            chain_id: isEvmSendType ? chainId : undefined,
            chain_id_caip: isEvmSendType ? undefined : chainId,
          })
          .build(),
      ),
    [
      chainId,
      createEventBuilder,
      isEvmSendType,
      recipientInputMethod,
      trackEvent,
    ],
  );

  return {
    captureRecipientSelected,
    setRecipientInputMethodManual,
    setRecipientInputMethodPasted,
  };
};
