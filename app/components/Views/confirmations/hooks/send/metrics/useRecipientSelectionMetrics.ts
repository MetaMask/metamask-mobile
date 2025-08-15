import Clipboard from '@react-native-clipboard/clipboard';
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
  const { chainId, to } = useSendContext();
  const { isEvmSendType } = useSendType();
  const { accountType, recipientInputMethod, setRecipientInputMethod } =
    useSendMetricsContext();

  const captureRecipientSelected = useCallback(async () => {
    let inputMethod = recipientInputMethod;
    const clipboardText = await Clipboard.getString();
    if (clipboardText === to) {
      inputMethod = RecipientInputMethod.Pasted;
    }
    trackEvent(
      createEventBuilder(MetaMetricsEvents.SEND_RECIPIENT_SELECTED)
        .addProperties({
          account_type: accountType,
          input_method: inputMethod,
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
    to,
    trackEvent,
  ]);

  return {
    captureRecipientSelected,
    setRecipientInputMethod,
  };
};
