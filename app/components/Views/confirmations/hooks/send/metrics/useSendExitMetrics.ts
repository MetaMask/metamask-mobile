import { useCallback, useMemo } from 'react';
import { useRoute } from '@react-navigation/native';

import Routes from '../../../../../../constants/navigation/Routes';
import { MetaMetricsEvents, useMetrics } from '../../../../../hooks/useMetrics';
import { useSendContext } from '../../../context/send-context';
import { useSendMetricsContext } from '../../../context/send-context/send-metrics-context';
import { useAmountValidation } from '../useAmountValidation';
import { useSendType } from '../useSendType';
import { useToAddressValidation } from '../useToAddressValidation';

export const useSendExitMetrics = () => {
  const route = useRoute();
  const { chainId, to } = useSendContext();
  const { accountType } = useSendMetricsContext();
  const { isEvmSendType } = useSendType();
  const { trackEvent, createEventBuilder } = useMetrics();
  const { amountError } = useAmountValidation();
  const { toAddressError } = useToAddressValidation(to as string);

  const alertDisplayed = useMemo(() => {
    if (route.name === Routes.SEND.AMOUNT) {
      return amountError;
    }
    if (route.name === Routes.SEND.RECIPIENT) {
      return toAddressError;
    }
    return '';
  }, [amountError, route.name, toAddressError]);

  const captureSendExit = useCallback(
    () =>
      trackEvent(
        createEventBuilder(MetaMetricsEvents.SEND_EXIT)
          .addProperties({
            account_type: accountType,
            alert_displayed: alertDisplayed,
            location: `${route.name.toLowerCase()}_selection`,
            chain_id: isEvmSendType ? chainId : undefined,
            chain_id_caip: isEvmSendType ? undefined : chainId,
          })
          .build(),
      ),
    [
      accountType,
      alertDisplayed,
      chainId,
      createEventBuilder,
      isEvmSendType,
      route.name,
      trackEvent,
    ],
  );

  return { captureSendExit };
};
