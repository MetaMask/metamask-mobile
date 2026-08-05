import {
  generateOpt,
  EVENT_NAME as METRICS_EVENT_NAME,
} from '../../MetaMetrics.events';

enum EVENT_NAME {
  SCAM_QUESTIONNAIRE_VIEWED = 'Scam Questionnaire Viewed',
  SCAM_QUESTIONNAIRE_COMPLETED = 'Scam Questionnaire Completed',
  SCAM_QUESTIONNAIRE_CONTACT_SUPPORT = 'Scam Questionnaire Contact Support',
}

// This function helps prevent repeat of type conversions
const createEvent = (name: EVENT_NAME) =>
  generateOpt(name as unknown as METRICS_EVENT_NAME);

export const PRODUCT_SAFETY_EVENTS = {
  SCAM_QUESTIONNAIRE_VIEWED: createEvent(EVENT_NAME.SCAM_QUESTIONNAIRE_VIEWED),
  SCAM_QUESTIONNAIRE_COMPLETED: createEvent(
    EVENT_NAME.SCAM_QUESTIONNAIRE_COMPLETED,
  ),
  SCAM_QUESTIONNAIRE_CONTACT_SUPPORT: createEvent(
    EVENT_NAME.SCAM_QUESTIONNAIRE_CONTACT_SUPPORT,
  ),
};
