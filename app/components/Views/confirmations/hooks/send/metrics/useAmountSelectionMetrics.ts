import { useCallback } from 'react';

import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import {
  AmountInputMethod,
  AmountInputType,
  useSendMetricsContext,
} from '../../../context/send-context/send-metrics-context';

export const useAmountSelectionMetrics = () => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const {
    accountType,
    chainId,
    chainIdCaip,
    amountInputMethod,
    amountInputType,
    setAmountInputMethod,
    setAmountInputType,
  } = useSendMetricsContext();

  const setAmountInputMethodManual = useCallback(() => {
    setAmountInputMethod(AmountInputMethod.Manual);
  }, [setAmountInputMethod]);

  const setAmountInputMethodPressedMax = useCallback(() => {
    setAmountInputMethod(AmountInputMethod.PressedMax);
  }, [setAmountInputMethod]);

  const setAmountInputTypeFiat = useCallback(() => {
    setAmountInputType(AmountInputType.Fiat);
  }, [setAmountInputType]);

  const setAmountInputTypeToken = useCallback(() => {
    setAmountInputType(AmountInputType.Token);
  }, [setAmountInputType]);

  const captureAmountSelected = useCallback(async () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.SEND_AMOUNT_SELECTED)
        .addProperties({
          account_type: accountType,
          input_method: amountInputMethod,
          input_type: amountInputType,
          chain_id: chainId,
          chain_id_caip: chainIdCaip,
        })
        .build(),
    );
  }, [
    accountType,
    chainId,
    chainIdCaip,
    amountInputMethod,
    amountInputType,
    createEventBuilder,
    trackEvent,
  ]);

  return {
    captureAmountSelected,
    setAmountInputMethodManual,
    setAmountInputMethodPressedMax,
    setAmountInputTypeFiat,
    setAmountInputTypeToken,
  };
};
