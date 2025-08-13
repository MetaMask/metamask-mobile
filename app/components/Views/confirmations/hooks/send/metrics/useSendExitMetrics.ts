import { useCallback, useMemo } from 'react';
import { useRoute } from '@react-navigation/native';

import Routes from '../../../../../../constants/navigation/Routes';
import { MetaMetricsEvents, useMetrics } from '../../../../../hooks/useMetrics';
import { useSendContext } from '../../../context/send-context';
import { useAmountValidation } from '../useAmountValidation';
import { useSendType } from '../useSendType';
import { useToAddressValidation } from '../useToAddressValidation';
import { useSendMetricsContext } from '../../../context/send-context/send-metrics-context';

export const useSendExitMetrics = () => {
  const route = useRoute();
  const { chainId } = useSendContext();
  const { accountType } = useSendMetricsContext();
  const { isEvmSendType } = useSendType();
  const { trackEvent, createEventBuilder } = useMetrics();
  const { invalidAmount, insufficientBalance } = useAmountValidation();
  const { toAddressError } = useToAddressValidation();

  const alertDisplayed = useMemo(() => {
    if (route.name === Routes.SEND.AMOUNT) {
      if (insufficientBalance) return 'insufficient_funds';
      if (invalidAmount) return 'invalid_amount_value';
    }
    if (route.name === Routes.SEND.RECIPIENT) {
      return toAddressError;
    }
    return '';
  }, [invalidAmount, insufficientBalance, route.name, toAddressError]);

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
