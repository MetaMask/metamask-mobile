import { useCallback } from 'react';

import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { useSendMetricsContext } from '../../../context/send-context/send-metrics-context';

export const useRecipientSelectionMetrics = () => {
  const { trackEvent, createEventBuilder } = useAnalytics();
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
