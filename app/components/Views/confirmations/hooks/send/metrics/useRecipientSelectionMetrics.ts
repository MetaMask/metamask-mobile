import { useCallback } from 'react';

import { MetaMetricsEvents, useMetrics } from '../../../../../hooks/useMetrics';
import { useSendMetricsContext } from '../../../context/send-context/send-metrics-context';

export const useRecipientSelectionMetrics = () => {
  const { trackEvent, createEventBuilder } = useMetrics();
  const { accountType, chainId, chainIdCaip } = useSendMetricsContext();

  const captureRecipientSelected = useCallback(
    async (inputMethod: string) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.SEND_RECIPIENT_SELECTED)
          .addProperties({
            account_type: accountType,
            input_method: inputMethod,
            chain_id: chainId,
            chain_id_caip: chainIdCaip,
          })
          .build(),
      );
    },
    [accountType, chainId, chainIdCaip, createEventBuilder, trackEvent],
  );

  return {
    captureRecipientSelected,
  };
};
