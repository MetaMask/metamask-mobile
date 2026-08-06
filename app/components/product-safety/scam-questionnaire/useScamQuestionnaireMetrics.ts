import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { PRODUCT_SAFETY_EVENTS } from '../../../core/Analytics/events/product-safety';
import { IMetaMetricsEvent } from '../../../core/Analytics/MetaMetrics.types';
import { selectConfirmationMetricsById } from '../../../core/redux/slices/confirmationMetrics';
import { useTransactionMetadataRequest } from '../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import type { RootState } from '../../../reducers';
import {
  Answers,
  QUESTIONNAIRE_VERSION,
  type Step,
  getAnswerRecord,
  getRedFlagCount,
  stepLabelFromIndex,
} from './scam-questionnaire.constants';

export type CompletionStatus = 'clean' | 'payment_stopped' | 'proceeded';

// Reads the value that useSimulationMetrics has already computed and stored
// in the confirmationMetrics slice — no need to re-run useBalanceChanges here.
// We omit the property when the value is 0, matching extension behavior
// (plain-number falsy check), since $0 at risk is equivalent to no data.
function useValueAtRisk(): number | undefined {
  const transactionMeta = useTransactionMetadataRequest();
  const confirmationMetrics = useSelector((state: RootState) =>
    selectConfirmationMetricsById(state, transactionMeta?.id ?? ''),
  );
  const value =
    confirmationMetrics?.properties?.simulation_sending_assets_total_value;
  return typeof value === 'number' && value !== 0 ? value : undefined;
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
