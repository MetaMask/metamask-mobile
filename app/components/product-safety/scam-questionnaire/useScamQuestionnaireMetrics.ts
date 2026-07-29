import { useMemo } from 'react';

import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { PRODUCT_SAFETY_EVENTS } from '../../../core/Analytics/events/product-safety';
import { IMetaMetricsEvent } from '../../../core/Analytics/MetaMetrics.types';
import {
  Answers,
  QuestionId,
  getRedFlagCount,
  getRedFlagQuestions,
} from './scam-questionnaire.constants';

export function useScamQuestionnaireMetrics() {
  const { createEventBuilder, trackEvent } = useAnalytics();

  return useMemo(() => {
    const fire = (
      event: IMetaMetricsEvent,
      properties: Record<string, unknown> = {},
    ) => {
      trackEvent(createEventBuilder(event).addProperties(properties).build());
    };

    return {
      trackStarted: () => fire(PRODUCT_SAFETY_EVENTS.SECURITY_CHECK_STARTED),

      trackQuestionAnswered: (
        question: QuestionId,
        answerKey: string,
        isRedFlag: boolean,
      ) =>
        fire(PRODUCT_SAFETY_EVENTS.SECURITY_CHECK_QUESTION_ANSWERED, {
          question,
          answer_key: answerKey,
          is_red_flag: isRedFlag,
        }),

      trackCompletedClean: () =>
        fire(PRODUCT_SAFETY_EVENTS.SECURITY_CHECK_COMPLETED_CLEAN, {
          red_flag_count: 0,
        }),

      trackDismissed: (lastStep: number, answers: Answers) =>
        fire(PRODUCT_SAFETY_EVENTS.SECURITY_CHECK_DISMISSED, {
          last_step: lastStep,
          red_flag_count_so_far: getRedFlagCount(answers),
        }),

      trackWarningShown: (answers: Answers) =>
        fire(PRODUCT_SAFETY_EVENTS.SCAM_WARNING_SHOWN, {
          red_flag_count: getRedFlagCount(answers),
          red_flag_questions: getRedFlagQuestions(answers),
        }),

      trackWarningStopped: (answers: Answers) =>
        fire(PRODUCT_SAFETY_EVENTS.SCAM_WARNING_STOPPED, {
          red_flag_count: getRedFlagCount(answers),
        }),

      trackWarningContactSupport: (answers: Answers) =>
        fire(PRODUCT_SAFETY_EVENTS.SCAM_WARNING_CONTACT_SUPPORT, {
          red_flag_count: getRedFlagCount(answers),
        }),

      trackWarningProceeded: (answers: Answers) =>
        fire(PRODUCT_SAFETY_EVENTS.SCAM_WARNING_PROCEEDED, {
          red_flag_count: getRedFlagCount(answers),
          red_flag_questions: getRedFlagQuestions(answers),
        }),
    };
  }, [createEventBuilder, trackEvent]);
}
