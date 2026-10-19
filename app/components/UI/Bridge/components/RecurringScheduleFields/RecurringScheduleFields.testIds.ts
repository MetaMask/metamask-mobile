export const RecurringScheduleFieldsSelectorsIDs = {
  CONTAINER: 'recurring-schedule-fields',
  EVERY_CARD: 'recurring-every-card',
  EVERY_INPUT: 'recurring-every-input',
  EVERY_UNIT_BUTTON: 'recurring-every-unit-button',
  REPEAT_CARD: 'recurring-repeat-card',
  REPEAT_INPUT: 'recurring-repeat-input',
  REPEAT_TIMES_LABEL: 'recurring-repeat-times',
  REPEAT_INFO_BUTTON: 'recurring-repeat-info-button',
  EVERY_ERROR: 'recurring-every-error',
  REPEAT_ERROR: 'recurring-repeat-error',
} as const;

export type RecurringScheduleFieldsSelectorsIDsType =
  typeof RecurringScheduleFieldsSelectorsIDs;
