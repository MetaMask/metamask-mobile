import { useCallback } from 'react';
import { useRoute } from '@react-navigation/native';

import { MetaMetricsEvents, useMetrics } from '../../../../../hooks/useMetrics';
import { useSendContext } from '../../../context/send-context';
import { useSendType } from '../useSendType';

export const useSendExitMetrics = () => {
  const route = useRoute();
  const { chainId } = useSendContext();
  const { isEvmSendType } = useSendType();
  const { trackEvent, createEventBuilder } = useMetrics();

  const captureSendExit = useCallback(
    () =>
      trackEvent(
        createEventBuilder(MetaMetricsEvents.SEND_ASSET_SELECTED)
          .addProperties({
            location: `${route.name.toLowerCase()}_selection`,
            chain_id: isEvmSendType ? chainId : undefined,
            chain_id_caip: isEvmSendType ? undefined : chainId,
          })
          .build(),
      ),
    [chainId, createEventBuilder, isEvmSendType, route.name, trackEvent],
  );

  return { captureSendExit };
};
