import { useMemo } from 'react';

import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { PRODUCT_SAFETY_EVENTS } from '../../../core/Analytics/events/product-safety';
import { IMetaMetricsEvent } from '../../../core/Analytics/MetaMetrics.types';
import useBalanceChanges from '../../UI/SimulationDetails/useBalanceChanges';
import { calculateTotalFiat } from '../../UI/SimulationDetails/FiatDisplay/FiatDisplay';
import { FIAT_UNAVAILABLE } from '../../UI/SimulationDetails/types';
import { useTransactionMetadataRequest } from '../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import {
  Answers,
  QUESTIONNAIRE_VERSION,
  type Step,
  getAnswerRecord,
  getRedFlagCount,
  stepLabelFromIndex,
} from './scam-questionnaire.constants';

export type CompletionStatus = 'clean' | 'payment_stopped' | 'proceeded';

// Mirrors the arithmetic behind `simulation_sending_assets_total_value` on
// transaction events so the two stay comparable. `undefined` rather than `0`
// when rates are unavailable, so the property is omitted instead of reporting
// the send as free.
function useValueAtRisk(): number | undefined {
  const transactionMeta = useTransactionMetadataRequest();
  const { value: balanceChanges } = useBalanceChanges({
    chainId: transactionMeta?.chainId ?? '0x1',
    simulationData: transactionMeta?.simulationData,
    networkClientId: transactionMeta?.networkClientId ?? '',
  });

  return useMemo(() => {
    const sendingAssets = balanceChanges.filter((c) => c.amount.isNegative());
    const usdAmounts = sendingAssets.map((c) => c.usdAmount);
    const hasRates = usdAmounts.some((a) => a !== FIAT_UNAVAILABLE);
    if (!hasRates) return undefined;
    const total = calculateTotalFiat(usdAmounts);
    return Math.abs(total.toNumber());
  }, [balanceChanges]);
}

export function useScamQuestionnaireMetrics() {
  const { createEventBuilder, trackEvent } = useAnalytics();
  const valueAtRisk = useValueAtRisk();

  return useMemo(() => {
    const fire = (
      event: IMetaMetricsEvent,
      properties: Record<string, unknown> = {},
    ) => {
      trackEvent(
        createEventBuilder(event)
          .addProperties({
            ...properties,
            questionnaire_version: QUESTIONNAIRE_VERSION,
          })
          .build(),
      );
    };

    return {
      trackViewed: (step: Step) =>
        fire(PRODUCT_SAFETY_EVENTS.SCAM_QUESTIONNAIRE_VIEWED, {
          step: stepLabelFromIndex(step),
        }),

      trackContactSupport: (answers: Answers) =>
        fire(PRODUCT_SAFETY_EVENTS.SCAM_QUESTIONNAIRE_CONTACT_SUPPORT, {
          ...getAnswerRecord(answers),
          red_flag_count: getRedFlagCount(answers),
          simulation_sending_assets_total_value: valueAtRisk,
        }),

      trackCompleted: ({
        status,
        answers,
      }: {
        status: CompletionStatus;
        answers: Answers;
      }) =>
        fire(PRODUCT_SAFETY_EVENTS.SCAM_QUESTIONNAIRE_COMPLETED, {
          status,
          ...getAnswerRecord(answers),
          red_flag_count: getRedFlagCount(answers),
          simulation_sending_assets_total_value: valueAtRisk,
        }),
    };
  }, [createEventBuilder, trackEvent, valueAtRisk]);
}
