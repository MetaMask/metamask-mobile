import { useCallback, useMemo } from 'react';
import { useRoute } from '@react-navigation/native';

import Routes from '../../../../../../constants/navigation/Routes';
import { MetaMetricsEvents, useMetrics } from '../../../../../hooks/useMetrics';
import { useSendMetricsContext } from '../../../context/send-context/send-metrics-context';
import { useAmountValidation } from '../useAmountValidation';
import { useToAddressValidation } from '../useToAddressValidation';

export const useSendExitMetrics = () => {
  const route = useRoute();
  const { accountType, chainId, chainIdCaip } = useSendMetricsContext();
  const { trackEvent, createEventBuilder } = useMetrics();
  const { amountError } = useAmountValidation();
  const { toAddressError } = useToAddressValidation();

  const alertDisplayed = useMemo(() => {
    if (route.name === Routes.SEND.AMOUNT) {
      return amountError;
    }
    if (route.name === Routes.SEND.RECIPIENT) {
      return toAddressError;
    }
    return '';
  }, [amountError, route.name, toAddressError]);

  const captureSendExit = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.SEND_EXIT)
        .addProperties({
          account_type: accountType,
          alert_displayed: alertDisplayed,
          location: `${route.name.toLowerCase()}_selection`,
          chain_id: chainId,
          chain_id_caip: chainIdCaip,
        })
        .build(),
    );
  }, [
    accountType,
    alertDisplayed,
    chainId,
    chainIdCaip,
    createEventBuilder,
    route.name,
    trackEvent,
  ]);

  return { captureSendExit };
};
