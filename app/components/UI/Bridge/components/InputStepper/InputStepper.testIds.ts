export const InputStepperTestIds = {
  MINUS_BUTTON: 'input-stepper-minus-button',
  PLUS_BUTTON: 'input-stepper-plus-button',
  INPUT: 'input-stepper-input',
  POST_VALUE: 'input-stepper-post-value',
  DESCRIPTION_ROW: 'input-stepper-description-row',
  DESCRIPTION_ICON: 'input-stepper-description-icon',
  DESCRIPTION_MESSAGE: 'input-text-description-message',
} as const;

export type InputStepperTestIdsType = typeof InputStepperTestIds;
