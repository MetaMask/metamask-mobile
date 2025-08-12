import { useCallback } from 'react';

import { MetaMetricsEvents, useMetrics } from '../../../../../hooks/useMetrics';
import {
  AmountInputMethod,
  AmountInputType,
  useSendMetricsContext,
} from '../../../context/send-context/send-metrics-context';
import { useSendContext } from '../../../context/send-context';
import { useSendType } from '../useSendType';

export const useAmountSelectionMetrics = () => {
  const { trackEvent, createEventBuilder } = useMetrics();
  const { chainId } = useSendContext();
  const { isEvmSendType } = useSendType();
  const {
    amountInputMethod,
    amountInputType,
    setAmountInputMethod,
    setAmountInputType,
  } = useSendMetricsContext();

  const setAmountInputMethodPasted = useCallback(() => {
    setAmountInputMethod(AmountInputMethod.Pasted);
  }, [setAmountInputMethod]);

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

  const captureAmountSelected = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.SEND_AMOUNT_SELECTED)
        .addProperties({
          input_method: amountInputMethod,
          input_type: amountInputType,
          chain_id: isEvmSendType ? chainId : undefined,
          chain_id_caip: isEvmSendType ? undefined : chainId,
        })
        .build(),
    );
  }, [
    amountInputMethod,
    amountInputType,
    chainId,
    createEventBuilder,
    isEvmSendType,
    trackEvent,
  ]);

  return {
    captureAmountSelected,
    setAmountInputMethodManual,
    setAmountInputMethodPasted,
    setAmountInputMethodPressedMax,
    setAmountInputTypeFiat,
    setAmountInputTypeToken,
  };
};
