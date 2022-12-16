/* eslint-disable import/prefer-default-export */

// Internal dependencies.
import { ModalConfirmationVariants } from './ModalConfirmation.types';

export const MODAL_CONFIRMATION_NORMAL_BUTTON_ID =
  'modal-confirmation-normal-button';

export const MODAL_CONFIRMATION_DANGER_BUTTON_ID =
  'modal-confirmation-danger-button';

export const BUTTON_TEST_ID_BY_VARIANT = {
  [ModalConfirmationVariants.Normal]: MODAL_CONFIRMATION_NORMAL_BUTTON_ID,
  [ModalConfirmationVariants.Danger]: MODAL_CONFIRMATION_DANGER_BUTTON_ID,
};
