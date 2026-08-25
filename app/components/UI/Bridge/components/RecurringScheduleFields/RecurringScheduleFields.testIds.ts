export const RecurringScheduleFieldsSelectorsIDs = {
  CONTAINER: 'recurring-schedule-fields',
  EVERY_CARD: 'recurring-every-card',
  EVERY_INPUT: 'recurring-every-input',
  EVERY_UNIT_BUTTON: 'recurring-every-unit-button',
  REPEAT_CARD: 'recurring-repeat-card',
  REPEAT_INPUT: 'recurring-repeat-input',
  REPEAT_TIMES_LABEL: 'recurring-repeat-times',
} as const;

export type RecurringScheduleFieldsSelectorsIDsType =
  typeof RecurringScheduleFieldsSelectorsIDs;
